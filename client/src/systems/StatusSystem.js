// Dynamic Status Effects Manager & Lifecycle System
(function(root) {
    class StatusSystem {
        /**
         * Get status definition from StatusRegistry or GAME_CONFIG
         */
        static getConfig(statusId) {
            if (root.StatusRegistry && root.StatusRegistry.has(statusId)) {
                return root.StatusRegistry.get(statusId);
            }
            if (root.GAME_CONFIG && root.GAME_CONFIG.statuses && root.GAME_CONFIG.statuses[statusId]) {
                return root.GAME_CONFIG.statuses[statusId];
            }
            return null;
        }

        /**
         * Apply or stack a status effect onto target player
         */
        static apply(target, statusId, stacks = 1, customDuration = null, game = null) {
            if (!target) return null;
            if (!target.statuses) target.statuses = [];

            const cfg = StatusSystem.getConfig(statusId) || {
                statusId: statusId,
                statusName: statusId,
                category: 'debuff',
                triggerTiming: 'turn_end',
                duration: 2,
                maxStacks: 99,
                stackRule: 'stack_duration_refresh'
            };

            const maxStacks = cfg.maxStacks !== undefined ? cfg.maxStacks : 99;
            const duration = customDuration !== null ? customDuration : (cfg.duration || 2);
            const stackRule = cfg.stackRule || 'stack_duration_refresh';

            let existing = target.statuses.find(s => s.statusId === statusId);

            if (existing) {
                if (stackRule === 'refresh_only') {
                    existing.duration = Math.max(existing.duration, duration);
                } else if (stackRule === 'consume_on_hit') {
                    existing.stacks = Math.min(maxStacks, existing.stacks + stacks);
                    existing.duration = duration;
                } else {
                    // stack_duration_refresh or stack_infinite
                    existing.stacks = Math.min(maxStacks, existing.stacks + stacks);
                    existing.duration = duration;
                }
            } else {
                existing = {
                    id: `${statusId}_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                    statusId: statusId,
                    name: cfg.statusName || statusId,
                    category: cfg.category || 'debuff',
                    stacks: Math.min(maxStacks, stacks),
                    duration: duration,
                    triggerTiming: cfg.triggerTiming || 'turn_end',
                    config: cfg
                };
                target.statuses.push(existing);
            }

            // Sync to legacy debuff fields for UI compatibility
            StatusSystem.syncToLegacyState(target);

            // Audio & Log feedback
            const statusName = cfg.statusName || statusId;
            let icon = '✨';
            if (statusId === 'burn') icon = '🔥';
            else if (statusId === 'poison') icon = '🐍';
            else if (statusId === 'weakness') icon = '🌀';
            else if (statusId === 'freeze') icon = '❄️';
            else if (statusId === 'attack_buff') icon = '🎯';

            if (game && game.log) {
                game.log(`${icon} ${target.name} 获得「${statusName}」状态！当前 ${existing.stacks} 层 (持续 ${existing.duration} 回合)！`);
            }

            if (root.soundManager) {
                if (statusId === 'burn') root.soundManager.playBurn();
                else if (statusId === 'poison' || statusId === 'weakness') root.soundManager.playPoison();
            }

            return existing;
        }

        /**
         * Check if player currently has a status
         */
        static has(player, statusId) {
            if (!player || !player.statuses) return false;
            return player.statuses.some(s => s.statusId === statusId && s.duration > 0 && s.stacks > 0);
        }

        /**
         * Get player's active status instance
         */
        static get(player, statusId) {
            if (!player || !player.statuses) return null;
            return player.statuses.find(s => s.statusId === statusId) || null;
        }

        /**
         * Remove a status entirely
         */
        static remove(player, statusId, game = null) {
            if (!player || !player.statuses) return;
            const idx = player.statuses.findIndex(s => s.statusId === statusId);
            if (idx !== -1) {
                const removed = player.statuses.splice(idx, 1)[0];
                StatusSystem.syncToLegacyState(player);
                if (game && game.log) {
                    game.log(`✨ ${player.name} 的「${removed.name}」状态消退了。`);
                }
            }
        }

        /**
         * Aggregate the numeric contribution of every active status into the values the damage
         * pipeline consumes. Until now statuses carried damageModifier / damageTakenModifier in
         * the config that nothing ever read, so effects like 坚守 (damage_reduction) were pure
         * tooltips. Multipliers compound, flats sum, thorns takes the strongest instance.
         */
        static aggregate(player) {
            const acc = {
                damageDealtMultiplier: 1,
                damageTakenMultiplier: 1,
                damageDealtFlat: 0,
                damageTakenFlat: 0,
                thorns: 0,
                blocked: false
            };
            if (!player || !Array.isArray(player.statuses)) return acc;
            for (const st of player.statuses) {
                if (st.duration <= 0 || st.stacks <= 0) continue;
                const cfg = st.config || StatusSystem.getConfig(st.statusId) || {};
                if (cfg.damageDealtMultiplier) acc.damageDealtMultiplier *= Number(cfg.damageDealtMultiplier);
                if (cfg.damageTakenMultiplier) acc.damageTakenMultiplier *= Number(cfg.damageTakenMultiplier);
                if (cfg.damageDealtFlat) acc.damageDealtFlat += Number(cfg.damageDealtFlat);
                if (cfg.damageTakenFlat) acc.damageTakenFlat += Number(cfg.damageTakenFlat);
                if (cfg.thorns) acc.thorns = Math.max(acc.thorns, Number(cfg.thorns));
                if (cfg.blocksAttackAndSkill) acc.blocked = true;
            }
            return acc;
        }

        /**
         * Process the status lifecycle for one phase.
         *
         * Effects fire on their own triggerTiming (灼烧/中毒 on turn_end, 冰冻 on turn_start),
         * but *every* status ages exactly once per owner turn, at turn_end. Statuses whose timing
         * is a combat hook (on_hit / on_attack / next_hit) therefore still expire instead of
         * lasting forever now that the damage pipeline actually consults them.
         */
        static tick(player, timing, game) {
            if (!player || !Array.isArray(player.statuses) || player.statuses.length === 0) return;

            const remaining = [];
            for (const st of player.statuses) {
                const cfg = st.config || StatusSystem.getConfig(st.statusId) || {};
                const triggerTiming = cfg.triggerTiming || st.triggerTiming;

                if (triggerTiming === timing) {
                    if (st.statusId === 'burn' || st.statusId === 'poison') {
                        const isBurn = st.statusId === 'burn';
                        const dmg = st.stacks * (cfg.damagePerTurn || 1);
                        const kind = isBurn ? (cfg.damageKind || 'physical') : 'true';
                        const label = isBurn ? '灼烧' : '中毒';
                        if (game && dmg > 0) {
                            game.log(`${isBurn ? '🔥' : '🐍'} 回合结束：${label}对 ${player.name} 造成了 ${dmg} 点${kind === 'true' ? '真实' : '物理'}伤害！`);
                            if (root.DamageCalculator) {
                                root.DamageCalculator.executeStatusDamage(player, dmg, { kind, sourceName: label }, game);
                            }
                        }
                    } else if (st.statusId === 'freeze' && timing === 'turn_start' && game) {
                        game.log(`❄️【冰冻判定】${player.name} 处于深度冰冻状态！无法行动！`);
                        player.canNormalAttackThisTurn = false;
                        player.hasUsedSkill = true;
                    }
                }

                if (game && game.isGameOver) {
                    remaining.push(st);
                    continue;
                }

                if (timing === 'turn_end') {
                    st.duration--;
                }
                if (st.duration > 0) {
                    remaining.push(st);
                } else if (game && game.log && timing === 'turn_end') {
                    game.log(`✨ ${player.name} 的「${st.name}」状态自然消退了。`);
                }
            }

            player.statuses = remaining;
            StatusSystem.syncToLegacyState(player);
        }

        /**
         * Keep legacy debuffs / buffs dictionary in sync for UI backward compatibility
         */
        static syncToLegacyState(player) {
            if (!player) return;
            if (!player.debuffs) player.debuffs = {};
            if (!player.buffs) player.buffs = {};

            const burn = StatusSystem.get(player, 'burn');
            player.debuffs.burnStacks = burn ? burn.stacks : 0;
            player.debuffs.burnDuration = burn ? burn.duration : 0;

            const poison = StatusSystem.get(player, 'poison');
            player.debuffs.poisonStacks = poison ? poison.stacks : 0;
            player.debuffs.poisonDuration = poison ? poison.duration : 0;

            // 虚弱 is now applied multiplicatively by DamageCalculator via the status config
            // (x0.75, matching Unity's Weak). Mirroring it into the legacy flat -2 debuff as well
            // would stack the two penalties onto the same hit.
            const freeze = StatusSystem.get(player, 'freeze');
            player.debuffs.freeze = freeze ? freeze.duration : 0;
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StatusSystem;
    }
    root.StatusSystem = StatusSystem;
    root.StatusManager = StatusSystem;
})(typeof window !== 'undefined' ? window : global);
