// Data-Driven Skill System
(function(root) {
    class SkillSystem {
        /**
         * Cast an active hero skill using declarative effects
         */
        static cast(player, target, skill, game) {
            if (!skill || !player || !target) return false;

            // Check conditions
            if (player.hasUsedSkill) {
                if (game && game.log) game.log(`【提示】本回合已经使用过角色技能！`);
                return false;
            }
            if (player.skillCooldown > 0) {
                if (game && game.log) game.log(`【提示】技能尚在冷却中 (剩余 ${player.skillCooldown} 回合)！`);
                return false;
            }
            if (player.energy < skill.cost) {
                if (game && game.log) game.log(`【提示】能量不足！需要 ${skill.cost} 点能量 (当前: ${player.energy})！`);
                return false;
            }

            // Deduct cost and set cooldown
            player.energy -= skill.cost;
            player.skillCooldown = skill.cooldown;
            player.hasUsedSkill = true;

            if (game && game.log) {
                game.log(`${player.name} 消耗 ${skill.cost} 能量施放技能「${skill.name}」！`);
            }

            // Trigger onSkillCast event
            if (game && game.eventBus) {
                game.eventBus.emit('onSkillCast', {
                    player,
                    target,
                    skill
                });
            }

            // Determine effects array
            const effects = SkillSystem.getEffects(skill);

            // Execute effects via EffectResolver
            if (root.EffectResolver) {
                root.EffectResolver.resolve(effects, {
                    user: player,
                    target: target,
                    game: game,
                    sourceName: skill.name,
                    sourceItem: skill
                });
            }

            return true;
        }

        /**
         * Get or generate standard declarative effects for a skill
         */
        static getEffects(skill) {
            if (skill.effects && Array.isArray(skill.effects) && skill.effects.length > 0) {
                return skill.effects;
            }

            // Auto-convert legacy skill configurations into declarative effects
            const sid = skill.id || skill.skillId;
            const dmg = Number(skill.damage) || 0;
            const heal = Number(skill.heal) || 0;
            const shield = Number(skill.shield) || 0;

            if (sid === 'fire_warrior_skill' || sid === 'flame_swordsman_skill') {
                return [
                    { type: 'damage', value: dmg || 18 },
                    { type: 'apply_status', status: 'burn', stacks: skill.statusStacks || 2, duration: skill.duration || 2 }
                ];
            } else if (sid === 'iron_guardian_skill' || sid === 'iron_guard_skill') {
                return [
                    { type: 'shield', value: shield || 25 },
                    { type: 'modify_damage', subType: 'flat_reduction', value: skill.effectVal2 || 3 }
                ];
            } else if (sid === 'forest_mage_skill' || sid === 'forest_warlock_skill') {
                return [
                    { type: 'heal', value: heal || 20 }
                ];
            } else if (sid === 'lightning_assassin_skill') {
                return [
                    { type: 'damage', value: dmg || 15, isElectric: true },
                    {
                        type: 'conditional',
                        condition: 'chance',
                        chance: skill.procChance || skill.chance || 0.4,
                        logOnThen: `⚡【连击追击】触发雷电连击，追加 ${skill.secondaryDamage || skill.effectVal2 || 10} 点闪电伤害！`,
                        thenEffects: [{ type: 'damage', value: skill.secondaryDamage || skill.effectVal2 || 10, isElectric: true }]
                    }
                ];
            } else if (sid === 'ice_mage_skill') {
                // Test hero skill
                return [
                    { type: 'damage', value: dmg || 14 },
                    { type: 'apply_status', status: 'freeze', stacks: 1, duration: 1 }
                ];
            }

            // Fallback generic effect synthesis
            const fallback = [];
            if (dmg > 0) fallback.push({ type: 'damage', value: dmg });
            if (shield > 0) fallback.push({ type: 'shield', value: shield });
            if (heal > 0) fallback.push({ type: 'heal', value: heal });
            if (skill.effectId) fallback.push({ type: 'apply_status', status: skill.effectId, stacks: 1 });
            return fallback;
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SkillSystem;
    }
    root.SkillSystem = SkillSystem;
})(typeof window !== 'undefined' ? window : global);
