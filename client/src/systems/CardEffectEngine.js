// CardEffectEngine - Unified 100% Data-Driven Effect Execution Engine
(function(root) {
    class CardEffectEngine {
        /**
         * Main execution entry point for card effects
         * @param {Object} card - Card data object or PlayerCardInstance
         * @param {Object} context - { user, target, game, sourceName, sourceItem }
         * @returns {Object} Execution summary report
         */
        static execute(card, context) {
            if (!card || !context || !context.user || !context.target) {
                return { success: false, reason: 'invalid_context' };
            }

            const { user, target, game } = context;
            const report = {
                cardId: card.id,
                cardName: card.name,
                effectsExecuted: []
            };

            // Evaluate condition match
            const conditionMet = CardEffectEngine.checkCondition(card.condition, card.condition_param, context);

            // 1. Damage Execution
            if (card.effect_type === 'damage' || Number(card.damage) > 0) {
                const res = CardEffectEngine.executeDamage(card, context, conditionMet);
                report.effectsExecuted.push({ type: 'damage', result: res });
            }

            // 2. Heal Execution
            if (card.effect_type === 'heal' || Number(card.heal) > 0) {
                const res = CardEffectEngine.executeHeal(card, context, conditionMet);
                report.effectsExecuted.push({ type: 'heal', result: res });
            }

            // 3. Shield Execution
            if (card.effect_type === 'shield' || Number(card.shield) !== 0) {
                const res = CardEffectEngine.executeShield(card, context, conditionMet);
                report.effectsExecuted.push({ type: 'shield', result: res });
            }

            // 4. Draw Execution
            if (card.effect_type === 'draw' || Number(card.draw) > 0) {
                const res = CardEffectEngine.executeDraw(card, context, conditionMet);
                report.effectsExecuted.push({ type: 'draw', result: res });
            }

            // 5. Energy Execution
            if (card.effect_type === 'energy' || Number(card.energy) !== 0) {
                const res = CardEffectEngine.executeEnergy(card, context, conditionMet);
                report.effectsExecuted.push({ type: 'energy', result: res });
            }

            // 6. Status Execution
            if (card.effect_type === 'status' || Boolean(card.status)) {
                const res = CardEffectEngine.executeStatus(card, context, conditionMet);
                report.effectsExecuted.push({ type: 'status', result: res });
            }

            // Self recoil is its own step: Unity applies data.selfDamage after the card's other
            // effects regardless of whether the card dealt damage, and it can kill the caster.
            if (Number(card.self_damage || 0) > 0) {
                const res = CardEffectEngine.executeSelfDamage(card, context);
                report.effectsExecuted.push({ type: 'self_damage', result: res });
            }

            // 7. Buff Execution
            if (card.effect_type === 'buff' || Boolean(card.buff)) {
                const res = CardEffectEngine.executeBuff(card, context, conditionMet);
                report.effectsExecuted.push({ type: 'buff', result: res });
            }

            // 8. Outcome branch — the ported 【博弈·分支】/【博弈·态势】 cards resolve a second,
            // mutually exclusive effect set from public information.
            if (Array.isArray(card.then_effects) && card.then_effects.length > 0) {
                const branch = CardEffectEngine.checkCondition(card.condition, card.condition_param, context);
                const specs = branch ? card.then_effects : (card.else_effects || []);
                const res = CardEffectEngine.executeSpecs(specs, context, branch ? '命中' : '落空');
                report.branch = { condition: card.condition, matched: branch, resolved: res };
                report.effectsExecuted.push({ type: 'outcome_branch', result: res });
            }

            // 9. Delayed reaction — arm the card in hand instead of resolving it now.
            if (card.reaction && card.reaction.condition) {
                const res = CardEffectEngine.armReaction(card, context);
                report.effectsExecuted.push({ type: 'delayed_reaction', result: res });
            }

            // 10. Declarative extra effects (e.g. steal_card)
            if (Array.isArray(card.effects) && card.effects.length > 0 && root.EffectResolver) {
                const specialEffects = card.effects.filter(e => e && e.type === 'steal_card');
                if (specialEffects.length > 0) {
                    const res = root.EffectResolver.resolve(specialEffects, context);
                    report.effectsExecuted.push({ type: 'special_effects', result: res });
                }
            }

            return report;
        }

        /**
         * Run a compact effect-spec list ({type,value,count,status,stacks}).
         * Accepts both the short names the branch notation produces (draw/energy) and the
         * EffectResolver spellings the pre-port dataset uses (draw_card/gain_energy).
         */
        static executeSpecs(specs, context, label) {
            const results = [];
            for (const spec of (specs || [])) {
                const kind = spec.type;
                if (kind === 'damage') {
                    results.push(root.DamageCalculator
                        ? root.DamageCalculator.execute(context.user, context.target, Number(spec.value) || 0, {
                            source: (context.sourceName || '卡牌') + (label ? '·' + label : ''),
                            sourceItem: context.sourceItem
                        }, context.game)
                        : null);
                } else if (kind === 'shield') {
                    results.push(CardEffectEngine.executeShield(
                        Object.assign({}, context.sourceItem, { shield: spec.value, target: 'self' }), context, true));
                } else if (kind === 'heal') {
                    results.push(CardEffectEngine.executeHeal(
                        Object.assign({}, context.sourceItem, { heal: spec.value, target: 'self' }), context, true));
                } else if (kind === 'draw' || kind === 'draw_card') {
                    const count = Number(spec.count || spec.value || 1);
                    for (let i = 0; i < count; i++) {
                        if (context.game && context.game.drawCard) context.game.drawCard(context.user);
                    }
                    results.push({ drawCount: count });
                } else if (kind === 'energy' || kind === 'gain_energy') {
                    results.push(CardEffectEngine.executeEnergy(
                        Object.assign({}, context.sourceItem, { energy: spec.value, target: 'self' }), context, true));
                } else if (kind === 'apply_status') {
                    results.push(CardEffectEngine.executeStatus(
                        Object.assign({}, context.sourceItem, {
                            status: `${spec.status}:${spec.stacks || 1}`
                        }), context, true));
                }
            }
            return results;
        }

        /**
         * Arm a delayed reaction card. Unity consumes the card from hand on trigger; the same
         * is done here so the reaction cannot fire twice.
         */
        static armReaction(card, context) {
            const { user, game } = context;
            if (!user.pendingReactions) user.pendingReactions = [];
            user.pendingReactions.push({
                cardId: card.id,
                cardName: card.name,
                condition: card.reaction.condition,
                effects: card.reaction.effects || [],
                armedOnTurn: game ? game.turnCount : 0
            });
            if (game && game.log) {
                game.log(`🔮 ${user.name} 埋下了战术壁障「${card.name}」，等待对手的动作来触发！`);
            }
            return { armed: card.id };
        }

        /**
         * Called by the damage pipeline after a hit lands. `incomingDamage` is the raw damage of
         * that single hit, which is what Unity's DamageTakenGreaterThan threshold compares against.
         */
        static triggerReactions(defender, incomingDamage, game, attacker) {
            if (!defender || !Array.isArray(defender.pendingReactions) || defender.pendingReactions.length === 0) return;
            const remaining = [];
            for (const reaction of defender.pendingReactions) {
                const thresholdMatch = /^damage_taken_gt:([\d.]+)$/.exec(reaction.condition);
                const fires = thresholdMatch
                    ? incomingDamage > parseFloat(thresholdMatch[1])
                    : reaction.condition === 'any_damage' && incomingDamage > 0;
                if (!fires) {
                    remaining.push(reaction);
                    continue;
                }
                if (game && game.log) {
                    game.log(`⚡ 反应触发！「${reaction.cardName}」被引爆！`);
                }
                CardEffectEngine.executeSpecs(reaction.effects, {
                    user: defender,
                    target: attacker || defender,
                    game,
                    sourceName: reaction.cardName,
                    sourceItem: (root.CARD_BY_ID || {})[reaction.cardId] || {}
                }, '反应');
                // The reaction leaves pendingReactions as soon as it fires, so it cannot resolve
                // twice; the card itself stays in the discard pile and cycles back normally, which
                // is what Unity does too (a re-drawn wall can be armed again).
            }
            defender.pendingReactions = remaining;
        }

        /**
         * Generic condition evaluator. Conditions arrive as `name` or `name:param`.
         */
        static checkCondition(condition, param, context) {
            if (!condition) return false;
            const { user, target, game } = context;
            const [name, inlineValue] = String(condition).split(':');
            const value = inlineValue !== undefined && inlineValue !== '' ? parseFloat(inlineValue) : Number(param || 0);
            const hpRatio = (p) => (p && p.maxHp) ? (p.hp / p.maxHp) * 100 : 100;
            const hasStatus = (p, id) => root.StatusSystem ? root.StatusSystem.has(p, id) : false;
            const lastType = (p) => (p && p.lastPlayedCardType) || '';

            switch (name) {
                case 'always':
                    return true;
                case 'target_shield_gained_this_turn':
                    return Boolean(target.shieldGainedThisTurn || (target.stats && target.stats.shieldGainedThisTurn));
                case 'target_healed_this_turn':
                    return Boolean(target.healedThisTurn || (target.stats && target.stats.healedThisTurn));
                case 'target_hp_below':
                    return hpRatio(target) < value;
                case 'target_hp_above':
                    return hpRatio(target) > value;
                case 'user_hp_below':
                    return hpRatio(user) < value;
                case 'user_hp_above':
                    return hpRatio(user) > value;
                case 'user_shield_at_least':
                    return Number(user.shield || 0) >= value;
                case 'target_shield_at_least':
                    return Number(target.shield || 0) >= value;
                case 'target_has_no_shield':
                    return Number(target.shield || 0) <= 0;
                case 'user_energy_at_least':
                    return Number(user.energy || 0) >= value;
                case 'target_hand_at_least':
                    return Array.isArray(target.hand) && target.hand.length >= value;
                case 'user_hand_at_least':
                    return Array.isArray(user.hand) && user.hand.length >= value;
                case 'target_last_was_attack':
                    return lastType(target) === 'attack';
                case 'target_last_was_defense':
                    return lastType(target) === 'defense' || lastType(target) === 'heal';
                case 'target_last_was_skill':
                    return lastType(target) === 'skill' || lastType(target) === 'special';
                case 'target_last_was_pass':
                    return Boolean(target && target.passedLastTurn);
                case 'user_has_shield':
                    return Number(user.shield || 0) > 0;
                case 'require_shield':
                    return Number(user.shield || 0) >= (value || 10);
                case 'enemy_hand_gt':
                    return Array.isArray(target.hand) && target.hand.length > value;
                case 'chance':
                    return (game && game.random ? game.random() : Math.random()) < (value || 0.5);
                default:
                    // Legacy fixed-string conditions from the pre-port dataset.
                    if (condition === 'require_shield:10') return Number(user.shield || 0) >= 10;
                    if (condition === 'target_hp_below_40') return hpRatio(target) <= 40;
                    if (condition === 'enemy_hand_gt_5') return Array.isArray(target.hand) && target.hand.length > 5;
                    if (condition === 'target_has_burn') return hasStatus(target, 'burn');
                    if (condition === 'target_has_poison') return hasStatus(target, 'poison');
                    if (condition === 'target_frozen') return hasStatus(target, 'freeze') || hasStatus(target, 'chill');
                    return false;
            }
        }

        /**
         * 1. Damage Handler
         */
        static executeDamage(card, context, conditionMet) {
            const { user, target, game, sourceName, sourceItem } = context;
            let dmg = Number(card.damage || 0);

            // Condition bonus
            if (conditionMet && card.condition_bonus) {
                dmg += Number(card.condition_bonus);
                if (game && game.log) {
                    game.log(`⚡【战术达成】「${card.name}」满足条件，追加 ${card.condition_bonus} 点额外伤害！`);
                }
            }

            // Probability proc bonus
            if (card.proc_chance > 0 && Math.random() < card.proc_chance) {
                if (card.condition_bonus && !conditionMet) {
                    dmg += Number(card.condition_bonus);
                }
            }

            // Pierce ratio from buff
            let pierceRatio = 0;
            if (card.buff && card.buff.includes('shield_penetration:')) {
                const m = card.buff.match(/shield_penetration:([\d.]+)/);
                if (m) pierceRatio = parseFloat(m[1]);
            }

            const hitCount = Math.max(1, Number(card.hit_count || 1));
            let totalDmgResult = null;

            for (let i = 0; i < hitCount; i++) {
                if (root.DamageCalculator) {
                    totalDmgResult = root.DamageCalculator.execute(user, target, dmg, {
                        source: sourceName || card.name,
                        sourceItem: sourceItem || card,
                        pierceRatio: pierceRatio,
                        hitIndex: i
                    }, game);
                } else if (game && game.dealDamage) {
                    totalDmgResult = game.dealDamage(user, target, dmg, {
                        source: sourceName || card.name,
                        sourceItem: sourceItem || card,
                        pierceRatio: pierceRatio
                    });
                }
            }

            return totalDmgResult;
        }

        /**
         * Recoil: 恶魔形态 / 背刺 / 双重打击 pay life to the caster as true damage.
         */
        static executeSelfDamage(card, context) {
            const { user, game } = context;
            const recoil = Number(card.self_damage || 0);
            if (recoil <= 0) return null;
            if (root.DamageCalculator) {
                root.DamageCalculator.executeDirect(user, recoil, `${card.name}反噬`, game);
            } else {
                user.hp = Math.max(0, user.hp - recoil);
            }
            return { selfDamage: recoil };
        }

        /**
         * 2. Heal Handler
         */
        static executeHeal(card, context, conditionMet) {
            const { user, game, sourceName } = context;
            // Unity's EffectEngine applies heal/shield/energy/draw to the caster unconditionally;
            // `target` only selects who a *status* lands on. pve_combust shields itself while
            // burning the foe, so routing these by `target` would hand the opponent free value.
            const recipient = user;
            let healAmount = Number(card.heal || 0);

            // Check anti-heal debuff
            if (root.StatusSystem && root.StatusSystem.has(recipient, 'anti_heal')) {
                healAmount = Math.floor(healAmount * 0.5);
                if (game && game.log) {
                    game.log(`🩸 ${recipient.name} 处于禁疗状态，治疗效果降低 50% (实际治疗: ${healAmount})！`);
                }
            }

            if (game && game.healPlayer) {
                game.healPlayer(recipient, healAmount, sourceName || card.name, { sourceItem: card });
            } else {
                recipient.hp = Math.min(recipient.maxHp || 100, (recipient.hp || 0) + healAmount);
            }

            // Record heal for current turn condition tracking
            recipient.healedThisTurn = true;
            if (recipient.stats) recipient.stats.healedThisTurn = true;

            return { healAmount };
        }

        /**
         * 3. Shield Handler
         */
        static executeShield(card, context, conditionMet) {
            const { user, game, sourceName } = context;
            const recipient = user;
            const shieldAmount = Number(card.shield || 0);

            // Check no-shield restriction
            if (root.StatusSystem && root.StatusSystem.has(recipient, 'no_shield') && shieldAmount > 0) {
                if (game && game.log) {
                    game.log(`🚫 禁魔领域生效！${recipient.name} 无法获得任何护盾！`);
                }
                return { shieldAmount: 0 };
            }

            if (shieldAmount < 0) {
                // Consume shield (e.g. Shield Charge)
                recipient.shield = Math.max(0, (recipient.shield || 0) + shieldAmount);
                if (game && game.log) {
                    game.log(`🛡️ ${recipient.name} 消耗了 ${Math.abs(shieldAmount)} 点护盾！`);
                }
            } else if (shieldAmount > 0) {
                if (game && game.addShield) {
                    game.addShield(recipient, shieldAmount, sourceName || card.name, { sourceItem: card });
                } else {
                    recipient.shield = (recipient.shield || 0) + shieldAmount;
                }
                // Record shield gained for condition tracking
                recipient.shieldGainedThisTurn = true;
                if (recipient.stats) recipient.stats.shieldGainedThisTurn = true;
            }

            return { shieldAmount };
        }

        /**
         * 4. Draw Handler
         */
        static executeDraw(card, context, conditionMet) {
            const { user, game } = context;
            const recipient = user;
            const count = Number(card.draw || 0);

            if (game && game.drawCard) {
                for (let i = 0; i < count; i++) {
                    game.drawCard(recipient);
                }
            }
            return { drawCount: count };
        }

        /**
         * 5. Energy Handler
         */
        static executeEnergy(card, context, conditionMet) {
            const { user, game } = context;
            const recipient = user;
            const energyDelta = Number(card.energy || 0);
            const maxEnergy = recipient.maxEnergy || (game && game.getRule ? game.getRule('max_energy', 10) : 10);
            const before = Number(recipient.energy || 0);
            // The turn-start refill is a hard overwrite (see TurnSystem), so energy generated
            // inside a turn is the only way to bank above the round's ladder — clamped here.
            recipient.energy = Math.max(0, Math.min(maxEnergy, before + energyDelta));

            if (game && game.log) {
                const sign = energyDelta >= 0 ? `+${energyDelta}` : `${energyDelta}`;
                game.log(`⚡ ${recipient.name} 能量变动 ${sign} 点 (当前: ${recipient.energy}/${maxEnergy})！`);
            }
            return { energyDelta };
        }

        /**
         * 6. Status Handler
         */
        static executeStatus(card, context, conditionMet) {
            const { user, target, game } = context;
            const recipient = card.target === 'self' ? user : target;
            const statusStr = card.status || '';
            if (!statusStr) return null;

            const tokens = statusStr.split(',');
            for (const token of tokens) {
                const [statusId, rawVal] = token.trim().split(':');
                const val = rawVal ? parseFloat(rawVal) : 1;

                if (statusId === 'remove_negative') {
                    if (root.StatusSystem) {
                        const debuffs = (recipient.statuses || []).filter(s => s.category === 'debuff');
                        debuffs.forEach(s => root.StatusSystem.remove(recipient, s.statusId, game));
                    }
                    if (game && game.log) game.log(`✨ ${recipient.name} 解除了所有负面状态！`);
                } else if (statusId === 'remove_positive') {
                    if (root.StatusSystem) {
                        const buffs = (recipient.statuses || []).filter(s => s.category === 'buff');
                        buffs.forEach(s => root.StatusSystem.remove(recipient, s.statusId, game));
                    }
                    if (recipient.buffs) {
                        recipient.buffs.nextDamageBonus = 0;
                        recipient.buffs.damageReduction = 0;
                        recipient.buffs.thorns = 0;
                    }
                    if (game && game.log) game.log(`🌀 驱散生效！清除了 ${recipient.name} 的全部增益效果！`);
                } else if (statusId === 'dispel_all_dots') {
                    const dotTypes = ['burn', 'poison', 'chill', 'bleed'];
                    [user, target].forEach(p => {
                        if (root.StatusSystem && p.statuses) {
                            p.statuses.filter(s => dotTypes.includes(s.statusId)).forEach(s => {
                                root.StatusSystem.remove(p, s.statusId, game);
                            });
                        }
                    });
                    if (game && game.log) game.log(`✨ 净化领域降临！清除了战场上双方全部持续伤害状态！`);
                } else if (root.StatusSystem) {
                    // Unity stores a status as a duration counter, so its statusDuration maps onto
                    // this engine's `stacks`; the turn count comes from the status definition.
                    root.StatusSystem.apply(recipient, statusId, val, null, game);
                }
            }
            return { status: statusStr };
        }

        /**
         * 7. Buff Handler
         */
        static executeBuff(card, context, conditionMet) {
            const { user, target, game } = context;
            const recipient = card.target === 'enemy' ? target : user;
            const buffStr = card.buff || '';
            if (!buffStr) return null;

            if (!recipient.buffs) recipient.buffs = {};

            const tokens = buffStr.split(',');
            for (const token of tokens) {
                const part = token.trim();

                if (part.startsWith('damage+')) {
                    const bonus = parseFloat(part.replace('damage+', '')) || 0;
                    recipient.buffs.nextDamageBonus = (recipient.buffs.nextDamageBonus || 0) + bonus;
                    if (game && game.log) game.log(`🎯 ${recipient.name} 获得专注！下一次攻击伤害 +${bonus} 点！`);
                } else if (part.startsWith('damage_reduce:')) {
                    const red = parseFloat(part.replace('damage_reduce:', '')) || 0.4;
                    recipient.buffs.damageReduction = Math.max(recipient.buffs.damageReduction || 0, red);
                    if (game && game.log) game.log(`🛡️ ${recipient.name} 获得坚守！本回合减伤 ${Math.round(red * 100)}%！`);
                } else if (part.startsWith('flat_reduction:')) {
                    const flat = parseFloat(part.replace('flat_reduction:', '')) || 1;
                    recipient.buffs.flatDamageReduction = (recipient.buffs.flatDamageReduction || 0) + flat;
                    if (game && game.log) game.log(`🏰 ${recipient.name} 获得光环庇护！受击伤害固定 -${flat} 点！`);
                } else if (part.startsWith('next_damage_reduce:')) {
                    const red = parseFloat(part.replace('next_damage_reduce:', '')) || 0.7;
                    recipient.buffs.nextDamageReduction = red;
                    if (game && game.log) game.log(`💨 ${recipient.name} 施展闪避！下一次受到伤害降低 ${Math.round(red * 100)}%！`);
                } else if (part.startsWith('thorns:')) {
                    const th = parseFloat(part.replace('thorns:', '')) || 15;
                    recipient.buffs.thorns = th;
                    if (game && game.log) game.log(`🌵 ${recipient.name} 架起反击刺盾！受到攻击时将反弹 ${th} 点伤害！`);
                } else if (part === 'unyielding:1') {
                    recipient.buffs.unyielding = true;
                    if (game && game.log) game.log(`⭐ ${recipient.name} 唤醒最后意志！致命伤时保留 1 点生命绝境不灭！`);
                } else if (part.startsWith('damage_to_heal:')) {
                    const ratio = parseFloat(part.replace('damage_to_heal:', '')) || 0.5;
                    recipient.buffs.damageToHeal = ratio;
                    if (game && game.log) game.log(`🔄 ${recipient.name} 激活伤害转移！受击 ${Math.round(ratio*100)}% 伤害将转为生命治疗！`);
                } else if (part.startsWith('next_turn_energy:')) {
                    const e = parseFloat(part.replace('next_turn_energy:', '')) || 0;
                    recipient.buffs.nextTurnEnergy = (recipient.buffs.nextTurnEnergy || 0) + e;
                    if (game && game.log) game.log(`⏳ ${recipient.name} 命运刻印：下回合能量变动 ${e >= 0 ? '+'+e : e} 点！`);
                } else if (part === 'max_energy+1') {
                    recipient.maxEnergy = (recipient.maxEnergy || 10) + 1;
                    if (game && game.log) game.log(`💎 ${recipient.name} 储能核心共鸣！最大能量上限永久提升为 ${recipient.maxEnergy} 点！`);
                } else if (part === 'forbid_attack') {
                    user.canNormalAttackThisTurn = false;
                } else if (part.startsWith('incoming_damage+')) {
                    const inc = parseFloat(part.replace('incoming_damage+', '')) || 5;
                    user.buffs.incomingDamageBonus = (user.buffs.incomingDamageBonus || 0) + inc;
                } else if (part.startsWith('reduce_target_shield:')) {
                    const ratio = parseFloat(part.replace('reduce_target_shield:', '')) || 0.5;
                    const destroyed = Math.floor((target.shield || 0) * ratio);
                    target.shield = Math.max(0, (target.shield || 0) - destroyed);
                    if (game && game.log) game.log(`💔 穿心箭破障！击碎并削减了 ${target.name} ${destroyed} 点护盾！`);
                } else if (part.startsWith('shield_to_damage:')) {
                    const targetShield = target.shield || 0;
                    target.shield = 0;
                    if (targetShield > 0) {
                        if (root.DamageCalculator) {
                            root.DamageCalculator.executeDirect(target, targetShield, '反转护盾伤害', game);
                        } else if (game && game.dealDirectDamage) {
                            game.dealDirectDamage(target, targetShield, '反转');
                        }
                        if (game && game.log) game.log(`⚡ 力场反转！将 ${target.name} 的 ${targetShield} 点护盾彻底化作狂暴真伤直接轰击！`);
                    }
                } else if (part.startsWith('discard_enemy_random:') || part.startsWith('discard_enemy:')) {
                    if (Array.isArray(target.hand) && target.hand.length > 0) {
                        const idx = Math.floor(Math.random() * target.hand.length);
                        const discarded = target.hand.splice(idx, 1)[0];
                        if (target.discardPile) target.discardPile.push(discarded);
                        if (game && game.log) game.log(`🖐️ 迫使 ${target.name} 丢弃了手牌「${discarded.name}」！`);
                    }
                } else if (part === 'gamble_energy_or_hp') {
                    if (Math.random() < 0.5) {
                        const maxE = user.maxEnergy || 10;
                        user.energy = Math.min(maxE, (user.energy || 0) + 5);
                        if (game && game.log) game.log(`🎰 命运金币正面朝上！${user.name} 豪赌获胜！瞬间获得 5 点能量！`);
                    } else {
                        if (root.DamageCalculator) {
                            root.DamageCalculator.executeDirect(user, 15, '命运赌博反噬', game);
                        }
                        if (game && game.log) game.log(`💀 命运金币反面！博弈失败！${user.name} 遭受 15 点生命扣除！`);
                    }
                } else if (part.startsWith('enemy_energy:')) {
                    const delta = parseFloat(part.replace('enemy_energy:', '')) || -2;
                    target.energy = Math.max(0, (target.energy || 0) + delta);
                    if (game && game.log) game.log(`⚡ 压制！${target.name} 损失了 ${Math.abs(delta)} 点能量！`);
                } else if (part.startsWith('enemy_next_turn_draw:')) {
                    const red = Math.abs(parseFloat(part.replace('enemy_next_turn_draw:', '')) || 2);
                    if (!target.buffs) target.buffs = {};
                    target.buffs.nextTurnDrawReduction = red;
                    if (game && game.log) game.log(`⏳ 迟滞诅咒生效！${target.name} 下回合抽牌将减少 ${red} 张！`);
                } else if (part === 'enemy_card_cost+2') {
                    if (Array.isArray(target.hand) && target.hand.length > 0) {
                        const rndC = target.hand[Math.floor(Math.random() * target.hand.length)];
                        rndC.cost = (rndC.cost || 0) + 2;
                        if (game && game.log) game.log(`🌀 混乱袭扰！${target.name} 手中的卡牌「${rndC.name}」费用被临时增加 +2 点！`);
                    }
                } else if (part === 'clone_hand_card:1') {
                    if (Array.isArray(user.hand) && user.hand.length > 0) {
                        const rndC = user.hand[Math.floor(Math.random() * user.hand.length)];
                        user.hand.push({ ...rndC });
                        if (game && game.log) game.log(`🪞 镜像解析！${user.name} 复制了手牌「${rndC.name}」！`);
                    }
                } else if (part === 'swap_random_card:1') {
                    if (Array.isArray(user.hand) && user.hand.length > 0 && Array.isArray(target.hand) && target.hand.length > 0) {
                        const uIdx = Math.floor(Math.random() * user.hand.length);
                        const tIdx = Math.floor(Math.random() * target.hand.length);
                        const uCard = user.hand.splice(uIdx, 1)[0];
                        const tCard = target.hand.splice(tIdx, 1)[0];
                        user.hand.push(tCard);
                        target.hand.push(uCard);
                        if (game && game.log) game.log(`🔀 因果交换！双方各交换了 1 张手牌（获得对方的「${tCard.name}」）！`);
                    }
                } else if (part.startsWith('fire_damage_bonus:')) {
                    const b = parseFloat(part.replace('fire_damage_bonus:', '')) || 6;
                    if (!user.modifiers) user.modifiers = {};
                    user.modifiers.fireDamageBonus = (user.modifiers.fireDamageBonus || 0) + b;
                } else if (part.startsWith('poison_bonus:')) {
                    const b = parseFloat(part.replace('poison_bonus:', '')) || 5;
                    if (!user.modifiers) user.modifiers = {};
                    user.modifiers.poisonDamageBonus = (user.modifiers.poisonDamageBonus || 0) + b;
                } else if (part.startsWith('shield_bonus:')) {
                    const b = parseFloat(part.replace('shield_bonus:', '')) || 8;
                    if (!user.modifiers) user.modifiers = {};
                    user.modifiers.shieldBonus = (user.modifiers.shieldBonus || 0) + b;
                } else if (part.startsWith('heal_bonus:')) {
                    const b = parseFloat(part.replace('heal_bonus:', '')) || 8;
                    if (!user.modifiers) user.modifiers = {};
                    user.modifiers.healBonus = (user.modifiers.healBonus || 0) + b;
                }
            }
            return { buff: buffStr };
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CardEffectEngine;
    }
    root.CardEffectEngine = CardEffectEngine;
})(typeof window !== 'undefined' ? window : global);
