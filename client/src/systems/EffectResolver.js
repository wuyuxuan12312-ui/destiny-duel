// Unified Effect Resolver for Cards, Skills, and Passives
(function(root) {
    class EffectResolver {
        /**
         * Execute a list of declarative effects in sequence
         * @param {Array<Object>|Object} effects - Declarative effect or effect array
         * @param {Object} context - Execution context: { user, target, game, sourceName, sourceItem }
         */
        static resolve(effects, context) {
            if (!effects) return [];
            const effectList = Array.isArray(effects) ? effects : [effects];
            const results = [];

            for (const effect of effectList) {
                if (!effect || !effect.type) continue;
                if (context.game && context.game.isGameOver) break;

                const handler = EffectResolver.getHandler(effect.type);
                if (handler) {
                    try {
                        const res = handler(effect, context, EffectResolver);
                        results.push({ type: effect.type, result: res, success: true });
                    } catch (err) {
                        console.error(`[EffectResolver] Error executing effect "${effect.type}":`, err);
                        results.push({ type: effect.type, error: err, success: false });
                    }
                } else {
                    console.warn(`[EffectResolver] Unknown effect type: "${effect.type}"`, effect);
                }
            }

            return results;
        }

        /**
         * Register a custom effect handler
         * @param {string} type - Effect type name
         * @param {Function} handler - (effect, context, resolver) => any
         */
        static register(type, handler) {
            if (root.EffectRegistry) {
                root.EffectRegistry.register(type, handler);
            }
            EffectResolver.handlers.set(type, handler);
        }

        static getHandler(type) {
            if (EffectResolver.handlers.has(type)) {
                return EffectResolver.handlers.get(type);
            }
            if (root.EffectRegistry && root.EffectRegistry.has(type)) {
                return root.EffectRegistry.get(type);
            }
            return null;
        }
    }

    EffectResolver.handlers = new Map();

    // ==========================================
    // Standard Built-in Effect Handlers
    // ==========================================

    // 1. Damage Effect
    EffectResolver.register('damage', (effect, context) => {
        const { user, target, game, sourceName, sourceItem } = context;
        const rawDmg = Number(effect.value || effect.amount || 0);
        const pierceRatio = Number(effect.pierceRatio || 0);
        const isElectric = Boolean(effect.isElectric);

        if (root.DamageCalculator) {
            return root.DamageCalculator.execute(user, target, rawDmg, {
                source: sourceName || '效果伤害',
                sourceItem: sourceItem || effect.sourceItem || null,
                pierceRatio: pierceRatio,
                isElectric: isElectric
            }, game);
        } else if (game && game.dealDamage) {
            return game.dealDamage(user, target, rawDmg, {
                source: sourceName,
                sourceItem: sourceItem || effect.sourceItem || null,
                pierceRatio: pierceRatio
            });
        }
    });

    // 2. Direct Self-Damage (Recoil)
    EffectResolver.register('self_damage', (effect, context) => {
        const { user, game, sourceName } = context;
        const dmg = Number(effect.value || 0);
        if (root.DamageCalculator) {
            return root.DamageCalculator.executeDirect(user, dmg, `${sourceName || ''}反噬`, game);
        } else if (game && game.dealDirectDamage) {
            return game.dealDirectDamage(user, dmg, '反冲');
        }
    });

    // 3. Shield Effect
    EffectResolver.register('shield', (effect, context) => {
        const { user, target, game, sourceName, sourceItem } = context;
        const recipient = effect.target === 'target' ? target : user;
        const amount = Number(effect.value || effect.shield || 0);

        if (game && game.addShield) {
            game.addShield(recipient, amount, sourceName || '护盾', { sourceItem });
        } else {
            recipient.shield = Math.min(10, (recipient.shield || 0) + amount);
        }
    });

    // 4. Heal Effect
    EffectResolver.register('heal', (effect, context) => {
        const { user, target, game, sourceName, sourceItem } = context;
        const recipient = effect.target === 'target' ? target : user;
        const amount = Number(effect.value || effect.heal || 0);

        if (game && game.healPlayer) {
            game.healPlayer(recipient, amount, sourceName || '治疗', { sourceItem });
        } else {
            recipient.hp = Math.min(recipient.maxHp, (recipient.hp || 0) + amount);
        }
    });

    // 5. Draw Card Effect
    EffectResolver.register('draw_card', (effect, context) => {
        const { user, game } = context;
        const count = Number(effect.value || effect.count || 1);
        if (game && game.drawCard) {
            for (let i = 0; i < count; i++) {
                game.drawCard(user);
            }
        }
    });

    // 6. Gain Energy Effect
    EffectResolver.register('gain_energy', (effect, context) => {
        const { user, game, sourceName } = context;
        const amount = Number(effect.value || 0);
        const maxEnergy = game && game.getRule ? game.getRule('max_energy', 6) : 6;
        user.energy = Math.min(maxEnergy, (user.energy || 0) + amount);
        if (game && game.log) {
            game.log(`${user.name} 获得 ${amount} 点能量 (当前: ${user.energy}/${maxEnergy})！`);
        }
        if (root.soundManager) root.soundManager.playCardPlay();
    });

    // 7. Apply Status Effect
    EffectResolver.register('apply_status', (effect, context) => {
        const { user, target, game } = context;
        const recipient = effect.target === 'self' ? user : target;
        const statusId = effect.status || effect.statusId;
        const stacks = Number(effect.stacks || effect.value || 1);
        const duration = effect.duration !== undefined ? effect.duration : null;

        if (root.StatusSystem) {
            root.StatusSystem.apply(recipient, statusId, stacks, duration, game);
        } else if (statusId === 'burn' && game && game.applyBurn) {
            game.applyBurn(recipient, stacks);
        } else if (statusId === 'poison' && game && game.applyPoison) {
            game.applyPoison(recipient, stacks);
        }
    });

    // 8. Remove Status Effect
    EffectResolver.register('remove_status', (effect, context) => {
        const { user, target, game } = context;
        const recipient = effect.target === 'self' ? user : target;
        const statusId = effect.status || effect.statusId;

        if (root.StatusSystem) {
            root.StatusSystem.remove(recipient, statusId, game);
        }
    });

    // 9. Modify Damage Buff Effect (Next Hit Bonus or Percentage Reduction)
    EffectResolver.register('modify_damage', (effect, context) => {
        const { user, target, game } = context;
        const recipient = effect.target === 'target' ? target : user;

        if (effect.subType === 'next_damage_bonus') {
            const bonus = Number(effect.value || 0);
            recipient.buffs.nextDamageBonus = (recipient.buffs.nextDamageBonus || 0) + bonus;
            if (game && game.log) {
                game.log(`${recipient.name} 获得专注！下一次造成的伤害 +${bonus} 点！`);
            }
            if (root.soundManager) root.soundManager.playCardPlay();
        } else if (effect.subType === 'percentage_reduction') {
            const reduction = Number(effect.value || 0.4);
            recipient.buffs.damageReduction = Math.max(recipient.buffs.damageReduction || 0, reduction);
            if (game && game.log) {
                game.log(`${recipient.name} 防守减伤生效，本回合受到的伤害降低 ${Math.round(reduction * 100)}%！`);
            }
            if (root.soundManager) root.soundManager.playShield();
        } else if (effect.subType === 'flat_reduction') {
            const flat = Number(effect.value || 1);
            recipient.buffs.flatDamageReduction = (recipient.buffs.flatDamageReduction || 0) + flat;
            if (game && game.log) {
                game.log(`${recipient.name} 坚壁生效，本回合受击伤害额外 -${flat} 点！`);
            }
            if (root.soundManager) root.soundManager.playShield();
        }
    });

    // 10. Forbid Normal Attack (Energy Surge drawback)
    EffectResolver.register('forbid_normal_attack', (effect, context) => {
        const { user, game } = context;
        user.canNormalAttackThisTurn = false;
        if (game && game.log) {
            game.log(`${user.name} 本回合无法发动普通攻击！`);
        }
    });

    // 11. Steal Card Effect
    EffectResolver.register('steal_card', (effect, context) => {
        const { user, target, game } = context;
        const maxHand = game && game.getRule ? game.getRule('max_hand_size', 8) : 8;
        if (target.hand && target.hand.length > 0 && user.hand.length < maxHand) {
            const rndIndex = Math.floor((game.random ? game.random() : Math.random()) * target.hand.length);
            const stolen = target.hand[rndIndex];
            user.hand.push({ ...stolen });
            if (game && game.log) {
                game.log(`🖐️ ${user.name} 灵巧探取，从对手手牌中复制了一张「${stolen.name}」！`);
            }
            if (root.soundManager) root.soundManager.playCardPlay();
        } else {
            if (game && game.log) {
                game.log(`🖐️ ${user.name} 发动夺取，但未能成功获取手牌。`);
            }
        }
    });

    // 12. Conditional Branching Effect
    EffectResolver.register('conditional', (effect, context, resolver) => {
        const { user, target, game } = context;
        let conditionMet = false;

        if (effect.condition === 'user_has_shield') {
            conditionMet = (user.shield || 0) > 0;
        } else if (effect.condition === 'target_hp_ratio_above') {
            const ratio = (user.hp || 0) / (user.maxHp || 1);
            conditionMet = ratio > (effect.threshold || 0.8);
        } else if (effect.condition === 'chance') {
            const roll = game && game.random ? game.random() : Math.random();
            conditionMet = roll < (effect.chance || 0.5);
        }

        if (conditionMet && effect.thenEffects) {
            if (effect.logOnThen && game && game.log) game.log(effect.logOnThen);
            return resolver.resolve(effect.thenEffects, context);
        } else if (!conditionMet && effect.elseEffects) {
            if (effect.logOnElse && game && game.log) game.log(effect.logOnElse);
            return resolver.resolve(effect.elseEffects, context);
        }
    });

    // 13. Summon Effect (Placeholder for future pets/totems)
    EffectResolver.register('summon', (effect, context) => {
        const { user, game } = context;
        if (game && game.log) {
            game.log(`召唤物「${effect.summonId || '幻影'}」降临战场！`);
        }
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EffectResolver;
    }
    root.EffectResolver = EffectResolver;
})(typeof window !== 'undefined' ? window : global);
