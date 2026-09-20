// Pure Damage Pipeline Calculator
(function(root) {
    class DamageCalculator {
        /**
         * Calculate and apply damage through the standardized combat pipeline
         * 
         * Sequence:
         * 1. Base Raw Damage
         * 2. EventBus pre-calculation hooks (e.g. crit, damage multipliers)
         * 3. Attacker Buffs (nextDamageBonus from Focus, Rising Fury)
         * 4. Attacker Debuffs (weaken, etc.)
         * 5. Defender Damage Reductions (flat reduction, percentage reduction)
         * 6. Burst Damage Cap (GameRules safety limit)
         * 7. Shield Absorption & Piercing
         * 8. Final HP deduction
         * 9. Post-damage events & triggers (onDamage, onDeath)
         */
        static execute(attacker, defender, rawDamage, options = {}, game = null) {
            if (game && game.isGameOver) return { totalDamage: 0, hpDmg: 0, shieldDmg: 0 };

            const eventBus = game ? game.eventBus : null;

            // Steps 1-6 live in computeDamage so preview() cannot drift from the real pipeline.
            const computed = DamageCalculator.computeDamage(attacker, defender, rawDamage, options, game, false);
            if (computed.cancel) return { totalDamage: 0, hpDmg: 0, shieldDmg: 0 };
            const dmg = computed.dmg;
            const isCrit = computed.isCrit;
            const defenderAgg = computed.defenderAgg;

            if (game && game.isGameOver) return { totalDamage: 0, hpDmg: 0, shieldDmg: 0 };

            // Step 7: Shield Absorption & Piercing
            const pierceRatio = Number(options.pierceRatio) || DamageCalculator.pierceRatioOf(options.sourceItem);
            let hpDmg = 0;
            let shieldDmg = 0;
            const hadShield = defender.shield > 0;
            const absorbed = DamageCalculator.splitAgainstShield(defender, dmg, pierceRatio);
            hpDmg = absorbed.hpDmg;
            shieldDmg = absorbed.shieldDmg;
            if (dmg > 0) {
                defender.shield = Math.max(0, Number(defender.shield || 0) - shieldDmg);
            }

            // Shield Break event
            if (hadShield && defender.shield === 0 && eventBus) {
                eventBus.emit('onShieldBreak', { player: defender });
            }

            // Step 8: HP Deduction
            defender.hp = Math.max(0, defender.hp - hpDmg);
            if (hpDmg > 0) {
                defender.tookDamageThisTurn = true;
                defender.tookDamageSinceLastTurn = true;
            }
            if (attacker && attacker.stats) {
                attacker.stats.totalDamageDealt += (hpDmg + shieldDmg);
            }

            // Audio feedback
            if (root.soundManager) {
                if (options.isElectric) {
                    root.soundManager.playThunder();
                } else if (shieldDmg > 0 && hpDmg === 0) {
                    root.soundManager.playShield();
                } else if (isCrit) {
                    root.soundManager.playThunder();
                    root.soundManager.playHit();
                } else {
                    root.soundManager.playSlash();
                }
            }

            // Log message
            if (game && game.log) {
                let msg = `${defender.name} 受到 ${hpDmg + shieldDmg} 点伤害`;
                if (shieldDmg > 0) msg += ` (护盾吸收 ${shieldDmg})`;
                if (hpDmg > 0) msg += ` (生命扣减 ${hpDmg})`;
                game.log(msg + `！`);
            }

            // Step 8b: Retaliation and one-shot status consumption.
            // Thorns hits back for true damage once per hit (Unity pays it inside the hitCount
            // loop), consume_on_hit statuses expire the moment they modified a hit, and armed
            // reaction cards check their threshold against the raw damage of this single hit.
            if (dmg > 0 && !options.isStatusDamage) {
                if (defenderAgg && defenderAgg.thorns > 0 && attacker && attacker.hp > 0) {
                    DamageCalculator.executeDirect(attacker, defenderAgg.thorns, '荆棘反伤', game, { silent: true });
                    if (game && game.log) {
                        game.log(`🌵 ${defender.name} 的荆棘反伤刺入 ${attacker.name}，造成 ${defenderAgg.thorns} 点真实伤害！`);
                    }
                }
                DamageCalculator.consumeOnHitStatuses(attacker, true, game);
                DamageCalculator.consumeOnHitStatuses(defender, false, game);
                if (root.CardEffectEngine && root.CardEffectEngine.triggerReactions) {
                    root.CardEffectEngine.triggerReactions(defender, dmg, game, attacker);
                }
            }

            // Step 9: Post-Damage Hooks via EventBus & Game
            const damageEventData = {
                attacker,
                defender,
                totalDamage: hpDmg + shieldDmg,
                hpDmg,
                shieldDmg,
                isCrit,
                source: options.source || '未知',
                isNormalAttack: Boolean(options.isNormalAttack),
                isSkill: Boolean(options.isSkill)
            };

            if (eventBus) {
                eventBus.emit('onDamage', damageEventData);
            }

            if (game && game.onDamageDealt) {
                game.onDamageDealt(defender, hpDmg, shieldDmg, isCrit);
            }

            // Check Death / Victory
            if (defender.hp <= 0 && game) {
                if (eventBus) {
                    eventBus.emit('onDeath', { victim: defender, killer: attacker });
                }
                game.endMatch(attacker, defender);
            }

            return {
                totalDamage: hpDmg + shieldDmg,
                hpDmg,
                shieldDmg,
                isCrit
            };
        }

        /**
         * Steps 1-6: everything that shapes the raw number before shield absorption.
         * Shared by execute() and preview() so the AI can never score against a different
         * formula than the one that will actually resolve the hit.
         * @param {boolean} readOnly true for previews: no events, no consumption of one-shot buffs.
         */
        static computeDamage(attacker, defender, rawDamage, options, game, readOnly) {
            let dmg = Number(rawDamage) || 0;
            let isCrit = Boolean(options.isCrit);

            if (!readOnly && game && game.eventBus) {
                const preHookData = { attacker, defender, rawDamage: dmg, isCrit, options, cancel: false };
                game.eventBus.emit('beforeDamage', preHookData);
                if (preHookData.cancel) return { cancel: true };
                dmg = preHookData.rawDamage;
                isCrit = preHookData.isCrit;
            }

            // Step 2: Attacker Buffs (Next damage bonus from Focus card)
            if (attacker && attacker.buffs && attacker.buffs.nextDamageBonus > 0) {
                dmg += attacker.buffs.nextDamageBonus;
                if (!readOnly) attacker.buffs.nextDamageBonus = 0;
            }

            // Attacker Passive / Blessing Modifiers & Tag-specific Bonuses
            if (attacker && attacker.modifiers) {
                if (attacker.modifiers.damageBonus > 0) {
                    dmg += attacker.modifiers.damageBonus;
                }
                const sourceTags = (options && options.sourceItem && options.sourceItem.tags) ? options.sourceItem.tags : [];
                if (Array.isArray(sourceTags)) {
                    if (sourceTags.includes('fire') && attacker.modifiers.fireDamageBonus > 0) {
                        dmg += attacker.modifiers.fireDamageBonus;
                    }
                    if (sourceTags.includes('ice') && attacker.modifiers.iceDamageBonus > 0) {
                        dmg += attacker.modifiers.iceDamageBonus;
                    }
                    if (sourceTags.includes('poison') && attacker.modifiers.poisonDamageBonus > 0) {
                        dmg += attacker.modifiers.poisonDamageBonus;
                    }
                }
            }

            // Step 3: Attacker statuses and legacy debuffs.
            // Unity applies Weak first (max(1, round(D * 0.75))) and then Strength's flat +3,
            // which is paid once per hit — a 2-hit card under Strength deals +6 total.
            const agg = root.StatusSystem ? root.StatusSystem.aggregate(attacker) : null;
            if (agg) {
                if (agg.damageDealtMultiplier !== 1) {
                    dmg = Math.max(1, DamageCalculator.roundHalfToEven(dmg * agg.damageDealtMultiplier));
                }
                if (agg.damageDealtFlat) dmg += agg.damageDealtFlat;
            }
            if (attacker && attacker.debuffs && attacker.debuffs.weaken > 0) {
                dmg = Math.max(1, dmg - attacker.debuffs.weaken);
            }

            // Step 4: Rising Fury late-game escalation
            if (game && game.getRule) {
                const furyStart = game.getRule('rising_fury_start_round', 9);
                const furyStep = game.getRule('rising_fury_damage_step', 1);
                const currentRound = Math.ceil((game.turnCount || 1) / 2);
                if (currentRound >= furyStart) {
                    dmg += (currentRound - (furyStart - 1)) * furyStep;
                }
            }

            // Step 5: Defender Reductions (statuses first, then per-turn buff modifiers)
            const defenderAgg = root.StatusSystem ? root.StatusSystem.aggregate(defender) : null;
            if (defenderAgg) {
                if (defenderAgg.damageTakenMultiplier !== 1) {
                    dmg = Math.max(0, DamageCalculator.roundHalfToEven(dmg * defenderAgg.damageTakenMultiplier));
                }
                if (defenderAgg.damageTakenFlat) {
                    dmg = Math.max(0, dmg + defenderAgg.damageTakenFlat);
                }
            }
            if (defender && defender.buffs) {
                if (defender.buffs.flatDamageReduction > 0) {
                    dmg = Math.max(1, dmg - defender.buffs.flatDamageReduction);
                    if (!readOnly) defender.buffs.flatDamageReduction = 0;
                }
                if (defender.buffs.damageReduction > 0) {
                    dmg = Math.max(1, DamageCalculator.roundHalfToEven(dmg * (1 - defender.buffs.damageReduction)));
                }
            }

            // Step 6: Burst Cap Safety Limit
            if (game && game.getRule) {
                dmg = Math.min(game.getRule('max_burst_damage_limit', 50), dmg);
            }

            return { cancel: false, dmg, defenderAgg, isCrit };
        }

        /**
         * C# Math.Round uses banker's rounding; the ported card values were tuned against it.
         */
        static roundHalfToEven(value) {
            if (root.MathUtil) return root.MathUtil.roundHalfToEven(value);
            return Math.round(value);
        }

        /**
         * A read-only run of the pipeline: what would this hit actually cost, given shields and
         * statuses. Used by the AI and by the PVE stage-recommendation hint.
         */
        static preview(attacker, defender, card, hitIndex, game) {
            const rawDamage = Number(card.damage || 0);
            const computed = DamageCalculator.computeDamage(attacker, defender, rawDamage, {
                sourceItem: card, source: card.name, isPreview: true
            }, game, true);
            if (computed.cancel) return { hpDmg: 0, shieldDmg: 0, wouldKill: false };

            const pierceRatio = DamageCalculator.pierceRatioOf(card);
            const absorbed = DamageCalculator.splitAgainstShield(defender, computed.dmg, pierceRatio);
            return {
                hpDmg: absorbed.hpDmg,
                shieldDmg: absorbed.shieldDmg,
                wouldKill: absorbed.hpDmg >= defender.hp,
                hitIndex: hitIndex || 0
            };
        }

        static pierceRatioOf(card) {
            if (card && card.buff) {
                const m = /shield_penetration:([\d.]+)/.exec(String(card.buff));
                if (m) return parseFloat(m[1]);
            }
            return 0;
        }

        /**
         * Step 7 arithmetic, factored out so preview() can reuse it without mutating anything.
         */
        static splitAgainstShield(defender, dmg, pierceRatio) {
            let hpDmg = 0;
            let shieldDmg = 0;
            const shield = Number(defender.shield || 0);
            if (pierceRatio > 0 && shield > 0) {
                const unmitigatedHpDmg = Math.floor(dmg * pierceRatio);
                const remainingToShield = dmg - unmitigatedHpDmg;
                hpDmg += unmitigatedHpDmg;
                if (shield >= remainingToShield) {
                    shieldDmg = remainingToShield;
                } else {
                    shieldDmg = shield;
                    hpDmg += remainingToShield - shield;
                }
            } else if (shield > 0) {
                if (shield >= dmg) {
                    shieldDmg = dmg;
                } else {
                    shieldDmg = shield;
                    hpDmg = dmg - shield;
                }
            } else {
                hpDmg = dmg;
            }
            return { hpDmg, shieldDmg };
        }

        /**
         * Expire statuses that were designed to modify exactly one hit.
         * @param {boolean} dealtSide true for the attacker's outgoing modifiers (蓄力), false for
         *                            the defender's incoming ones (钢壁).
         */
        static consumeOnHitStatuses(player, dealtSide, game) {
            if (!player || !Array.isArray(player.statuses)) return;
            const doomed = player.statuses.filter(st => {
                const cfg = st.config || (root.StatusSystem && root.StatusSystem.getConfig(st.statusId)) || {};
                if (cfg.stackRule !== 'consume_on_hit') return false;
                if (dealtSide) return Boolean(cfg.damageDealtFlat || cfg.damageDealtMultiplier);
                return Boolean(cfg.damageTakenFlat || cfg.damageTakenMultiplier);
            });
            if (doomed.length === 0) return;
            doomed.forEach(st => {
                if (root.StatusSystem) root.StatusSystem.remove(player, st.statusId, null);
            });
        }

        /**
         * Apply end-of-turn damage over time. Unity distinguishes 灼烧 (physical: absorbed by
         * shield and amplified by 易伤) from 中毒 (true: bypasses both), and this pipeline had
         * been routing every DoT straight into HP.
         */
        static executeStatusDamage(target, amount, options, game) {
            const kind = (options && options.kind) || 'physical';
            const sourceName = (options && options.sourceName) || '持续伤害';
            if (kind === 'true' || !target) {
                return DamageCalculator.executeDirect(target, amount, sourceName, game, { silent: true });
            }
            let dmg = Number(amount) || 0;
            const agg = root.StatusSystem ? root.StatusSystem.aggregate(target) : null;
            if (agg && agg.damageTakenMultiplier !== 1) {
                dmg = Math.max(0, DamageCalculator.roundHalfToEven(dmg * agg.damageTakenMultiplier));
            }
            let hpDmg = 0;
            let shieldDmg = 0;
            if (target.shield > 0) {
                if (target.shield >= dmg) {
                    target.shield -= dmg;
                    shieldDmg = dmg;
                } else {
                    shieldDmg = target.shield;
                    hpDmg = dmg - target.shield;
                    target.shield = 0;
                }
            } else {
                hpDmg = dmg;
            }
            target.hp = Math.max(0, target.hp - hpDmg);
            if (dmg > 0) {
                target.tookDamageThisTurn = true;
                target.tookDamageSinceLastTurn = true;
            }
            if (game && game.log) {
                game.log(`${target.name} 受到 ${sourceName} 造成的 ${dmg} 点伤害`
                    + (shieldDmg > 0 ? ` (护盾吸收 ${shieldDmg})` : '') + '！');
            }
            if (root.soundManager) root.soundManager.playHit();
            if (game && game.onDamageDealt) game.onDamageDealt(target, hpDmg, shieldDmg, false);
            if (target.hp <= 0 && game) {
                const winner = target === game.p1 ? game.p2 : game.p1;
                if (game.eventBus) game.eventBus.emit('onDeath', { victim: target, killer: winner });
                game.endMatch(winner, target);
            }
            return hpDmg + shieldDmg;
        }

        /**
         * Deal direct unmitigated damage (e.g. status ticks, recoil)
         */
        static executeDirect(target, amount, sourceName, game = null, options = {}) {
            if (game && game.isGameOver) return 0;
            const dmg = Number(amount) || 0;
            target.hp = Math.max(0, target.hp - dmg);
            if (dmg > 0) {
                target.tookDamageThisTurn = true;
                target.tookDamageSinceLastTurn = true;
            }

            if (!options.silent && game && game.log) {
                game.log(`${target.name} 受到 ${sourceName} 造成的 ${dmg} 点伤害！`);
            }

            if (root.soundManager) {
                if (sourceName === '灼烧') root.soundManager.playBurn();
                else if (sourceName === '中毒') root.soundManager.playPoison();
                else root.soundManager.playHit();
            }

            if (game && game.onDamageDealt) {
                game.onDamageDealt(target, dmg, 0, false);
            }

            if (target.hp <= 0 && game) {
                const winner = target === game.p1 ? game.p2 : game.p1;
                if (game.eventBus) {
                    game.eventBus.emit('onDeath', { victim: target, killer: winner });
                }
                game.endMatch(winner, target);
            }

            return dmg;
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DamageCalculator;
    }
    root.DamageCalculator = DamageCalculator;
})(typeof window !== 'undefined' ? window : global);
