// Modular Hero Manager & Event-Driven Passive System
(function(root) {
    const HERO_VISUAL_DEFAULTS = {
        fire_warrior: { icon: '🔥', image: 'assets/characters/fire_warrior.png', avatarBg: 'linear-gradient(135deg, #ff4411, #aa1100)', themeColor: '#ff4422' },
        iron_guardian: { icon: '🛡️', image: 'assets/characters/iron_guardian.png', avatarBg: 'linear-gradient(135deg, #4488bb, #1a3355)', themeColor: '#00d4ff' },
        forest_mage: { icon: '🌿', image: 'assets/characters/forest_mage.png', avatarBg: 'linear-gradient(135deg, #22aa44, #0d5522)', themeColor: '#00ff88' },
        lightning_assassin: { icon: '⚡', image: 'assets/characters/lightning_assassin.png', avatarBg: 'linear-gradient(135deg, #eebb00, #775500)', themeColor: '#ffcc00' },
        ice_mage: { icon: '❄️', image: 'assets/characters/ice_mage.png', avatarBg: 'linear-gradient(135deg, #00b4db, #0083b0)', themeColor: '#00e5ff' }
    };

    /**
     * One source of truth for what each passive does, and it is written against the numbers the
     * engine actually reads (bindDefaultPassive below + the balance rules). The client used to keep
     * a second, hand-typed copy in js/hero.js that nothing loaded, so the panels showed a bare
     * "专属被动" with no description while the real values drifted underneath it.
     */
    const HERO_PASSIVES = {
        fire_warrior: {
            name: '灼热',
            desc: (rule, status) => `造成伤害时，有 20% 概率给对手施加 1 层「${status('burn', 'statusName', '灼烧')}」（每层回合末 ${status('burn', 'damagePerTurn', 2)} 点伤害，持续 ${status('burn', 'duration', 2)} 回合，上限 ${status('burn', 'maxStacks', 3)} 层）。`
        },
        iron_guardian: {
            name: '坚甲',
            desc: (rule) => `每回合第一次受到的伤害固定减免 ${rule('tank_damage_reduction', 3)} 点。`
        },
        forest_mage: {
            name: '自然恢复',
            desc: (rule) => `回合结束时，若本回合没有受到伤害，自身恢复 ${rule('nature_heal_amount', 5)} 点生命。`
        },
        lightning_assassin: {
            name: '致命一击',
            desc: (rule) => `普通攻击有 ${Math.round(rule('crit_chance', 0.2) * 100)}% 概率触发暴击，造成 2 倍伤害；技能与卡牌伤害不触发。`
        },
        ice_mage: {
            name: '极寒亲和',
            desc: () => '承受来自灼烧/烈焰来源的伤害时，减少 1 点。'
        }
    };

    class HeroManager {
        static passiveName(heroId) {
            return (HERO_PASSIVES[heroId] && HERO_PASSIVES[heroId].name) || '专属被动';
        }

        static passiveDesc(heroId) {
            const entry = HERO_PASSIVES[heroId];
            if (!entry) return '';
            const rules = (root.GAME_CONFIG && root.GAME_CONFIG.gameRules) || {};
            const rule = (key, fallback) => {
                const r = rules[key];
                const v = r && r.value !== undefined ? r.value : r;
                return Number.isFinite(Number(v)) ? Number(v) : fallback;
            };
            const status = (key, field, fallback) => {
                const s = (root.StatusSystem && root.StatusSystem.getConfig(key)) || {};
                const v = s[field];
                return v === undefined || v === null ? fallback : v;
            };
            try {
                return entry.desc(rule, status);
            } catch (err) {
                return '';
            }
        }

        /**
         * Get hero definition from Registry or Config
         */
        static getDefinition(heroId) {
            if (root.HeroRegistry && root.HeroRegistry.has(heroId)) {
                return root.HeroRegistry.get(heroId);
            }
            if (root.GAME_CONFIG && root.GAME_CONFIG.characters && root.GAME_CONFIG.characters[heroId]) {
                return root.GAME_CONFIG.characters[heroId];
            }
            return null;
        }

        /**
         * Create a standardized hero data instance
         */
        static createHeroInstance(heroId) {
            // Check legacy alias mappings
            let canonicalId = heroId;
            if (heroId === 'flame_swordsman') canonicalId = 'fire_warrior';
            else if (heroId === 'iron_guard') canonicalId = 'iron_guardian';
            else if (heroId === 'forest_warlock') canonicalId = 'forest_mage';

            const def = HeroManager.getDefinition(canonicalId) || {};
            const visual = HERO_VISUAL_DEFAULTS[canonicalId] || { icon: '⚔️', image: '', avatarBg: '#333', themeColor: '#fff' };

            // Find skill configuration
            const skillId = def.skillId || `${canonicalId}_skill`;
            let skillDef = null;
            if (root.SkillRegistry && root.SkillRegistry.has(skillId)) {
                skillDef = root.SkillRegistry.get(skillId);
            } else if (root.GAME_CONFIG && root.GAME_CONFIG.skills && root.GAME_CONFIG.skills[skillId]) {
                skillDef = root.GAME_CONFIG.skills[skillId];
            }

            const skillObj = {
                id: skillId,
                skillType: skillDef ? (skillDef.skillType || 'active') : 'active',
                name: skillDef ? (skillDef.skillName || skillDef.name) : '专属技能',
                cost: Number(skillDef && skillDef.cost !== undefined ? skillDef.cost : 2),
                cooldown: Number(skillDef && skillDef.cooldown !== undefined ? skillDef.cooldown : 2),
                damage: Number(skillDef && skillDef.damage || 0),
                heal: Number(skillDef && skillDef.heal || 0),
                shield: Number(skillDef && skillDef.shield || 0),
                duration: Number(skillDef && skillDef.duration || 0),
                procChance: Number(skillDef && skillDef.procChance || 0),
                secondaryDamage: Number(skillDef && skillDef.secondaryDamage || 0),
                effects: skillDef && skillDef.effects ? skillDef.effects : null,
                desc: skillDef ? (skillDef.description || '') : ''
            };

            const passiveId = def.passiveId || `${canonicalId}_passive`;

            return {
                id: canonicalId,
                name: def.characterName || def.name || canonicalId,
                title: def.role || '',
                icon: visual.icon,
                image: visual.image,
                avatarBg: visual.avatarBg,
                themeColor: visual.themeColor,
                hp: Number(def.maxHp || 30),
                normalAttack: Number(def.baseAttack || 4),
                startingEnergy: Number(def.startingEnergy || 3),
                maxEnergy: Number(def.maxEnergy || 6),
                damageBonus: Number(def.damageBonus || 0),
                healBonus: Number(def.healBonus || 0),
                shieldBonus: Number(def.shieldBonus || 0),
                modifiers: def.modifiers ? { ...def.modifiers } : {
                    damageBonus: Number(def.damageBonus || 0),
                    healBonus: Number(def.healBonus || 0),
                    shieldBonus: Number(def.shieldBonus || 0),
                    fireDamageBonus: Number(def.fireDamageBonus || 0),
                    iceDamageBonus: Number(def.iceDamageBonus || 0),
                    poisonDamageBonus: Number(def.poisonDamageBonus || 0)
                },
                description: def.description || '',
                passive: {
                    id: passiveId,
                    name: HeroManager.passiveName(canonicalId),
                    desc: HeroManager.passiveDesc(canonicalId)
                },
                skill: skillObj
            };
        }

        /**
         * Bind hero passives to EventBus for a player instance
         */
        static bindPassives(player, eventBus, game) {
            if (!player || !player.hero || !eventBus) return;

            const passiveId = player.hero.passive.id;
            const passiveHandler = HeroManager.getPassiveHandler(passiveId);

            if (passiveHandler) {
                passiveHandler(player, eventBus, game);
            } else {
                // Fallback to canonical passive match if not registered
                HeroManager.bindDefaultPassive(passiveId, player, eventBus, game);
            }
        }

        static registerPassive(passiveId, handler) {
            if (root.PassiveRegistry) {
                root.PassiveRegistry.register(passiveId, handler);
            }
            HeroManager.customPassives.set(passiveId, handler);
        }

        static getPassiveHandler(passiveId) {
            if (HeroManager.customPassives.has(passiveId)) {
                return HeroManager.customPassives.get(passiveId);
            }
            if (root.PassiveRegistry && root.PassiveRegistry.has(passiveId)) {
                return root.PassiveRegistry.get(passiveId);
            }
            return null;
        }

        static bindDefaultPassive(passiveId, player, eventBus, game) {
            // 1. Fire Warrior: 灼热 (20% burn on damage dealt)
            if (passiveId.includes('fire_warrior') || passiveId === 'burn_on_damage') {
                eventBus.on('onDamage', (evt) => {
                    if (evt.attacker === player && evt.totalDamage > 0) {
                        const roll = game && game.random ? game.random() : Math.random();
                        if (roll < 0.20) {
                            if (game && game.log) {
                                game.log(`🔥【灼热】${player.name} 伤害附带烈焰，施加 1 层灼烧！`);
                            }
                            if (root.StatusSystem) {
                                root.StatusSystem.apply(evt.defender, 'burn', 1, 2, game);
                            }
                        }
                    }
                });
            }

            // 2. Iron Guardian: 坚甲 (First hit taken per turn -3 damage)
            else if (passiveId.includes('iron_guardian') || passiveId === 'damage_reduction_first_hit') {
                player.ironGuardPassiveUsedThisTurn = false;
                eventBus.on('onTurnStart', () => {
                    player.ironGuardPassiveUsedThisTurn = false;
                });

                eventBus.on('beforeDamage', (evt) => {
                    if (evt.defender === player && !player.ironGuardPassiveUsedThisTurn && evt.rawDamage > 0) {
                        player.ironGuardPassiveUsedThisTurn = true;
                        const reduction = (game && game.getRule) ? game.getRule('tank_damage_reduction', 3) : 3;
                        evt.rawDamage = Math.max(0, evt.rawDamage - reduction);
                        if (game && game.log) {
                            game.log(`🛡️【坚甲】${player.name} 触发钢铁坚甲，受击伤害 -${reduction}！`);
                        }
                    }
                });
            }

            // 3. Forest Mage: 自然恢复 (Heal 5 HP on turn end if unharmed)
            else if (passiveId.includes('forest_mage') || passiveId === 'heal_if_untouched') {
                player.tookDamageSinceLastTurn = false;
                eventBus.on('onTurnEnd', (evt) => {
                    if (evt.player === player && !player.tookDamageSinceLastTurn && !player.tookDamageThisTurn) {
                        const healAmount = (game && game.getRule) ? game.getRule('nature_heal_amount', 5) : 5;
                        if (game && game.log) {
                            game.log(`🌿【自然恢复】${player.name} 本轮未受伤害，触发被动恢复 ${healAmount} HP！`);
                        }
                        if (game && game.healPlayer) {
                            game.healPlayer(player, healAmount, '自然恢复');
                        }
                    }
                });
            }

            // 4. Lightning Assassin: 致命一击 (20% critical hit on normal attack)
            else if (passiveId.includes('lightning_assassin') || passiveId === 'crit_on_normal_attack') {
                eventBus.on('beforeDamage', (evt) => {
                    if (evt.attacker === player && evt.options && evt.options.isNormalAttack) {
                        const roll = game && game.random ? game.random() : Math.random();
                        if (roll < 0.20) {
                            evt.isCrit = true;
                            evt.rawDamage = evt.rawDamage * 2;
                            if (game && game.log) {
                                game.log(`⚡【致命一击】${player.name} 触发雷电暴击！造成 2 倍巨额伤害！`);
                            }
                        }
                    }
                });
            }

            // 5. Ice Mage: 极寒亲和 / 极寒护体
            else if (passiveId.includes('ice_mage') || passiveId === 'ice_affinity' || passiveId === 'ice_mage_passive') {
                eventBus.on('beforeDamage', (evt) => {
                    if (evt.defender === player && evt.options && evt.options.source && (evt.options.source.includes('灼') || evt.options.source.includes('烈焰'))) {
                        evt.rawDamage = Math.max(0, evt.rawDamage - 1);
                        if (game && game.log) {
                            game.log(`❄️【极寒亲和】${player.name} 抵御了烈焰热浪，受击伤害 -1！`);
                        }
                    }
                });
            }
        }
    }

    HeroManager.customPassives = new Map();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = HeroManager;
    }
    root.HeroManager = HeroManager;
})(typeof window !== 'undefined' ? window : global);
