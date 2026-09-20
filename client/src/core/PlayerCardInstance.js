// PlayerCardInstance - Data-Driven Card Instance with Level Multipliers
(function(root) {
    class PlayerCardInstance {
        /**
         * @param {Object} baseCard - Static card template (immutable)
         * @param {number} level - Instance level (1-3 for PVE, fixed 1 for PVP)
         */
        constructor(baseCard, level = 1) {
            if (!baseCard || typeof baseCard !== 'object') {
                throw new Error('[PlayerCardInstance] Invalid baseCard template provided');
            }

            // Reference base card template (DO NOT MUTATE baseCard)
            this.baseCard = baseCard;

            this.id = baseCard.id || baseCard.cardId;
            this.cardId = baseCard.cardId || baseCard.id;
            this.name = baseCard.name || baseCard.cardName || this.id;
            this.description = baseCard.description || baseCard.desc || '';
            this.desc = this.description;
            this.icon = baseCard.icon || '🃏';
            this.iconName = baseCard.iconName || 'attack-sword.svg';
            this.artTheme = baseCard.artTheme || 'theme-attack';
            this.tier = baseCard.tier || baseCard.rarity || 'common';
            this.cost = Number(baseCard.cost !== undefined ? baseCard.cost : 1);
            this.rarity = (baseCard.rarity || 'common').toLowerCase();
            this.type = (baseCard.type || baseCard.card_type || 'attack').toLowerCase();
            this.pool_type = baseCard.pool_type || 'Base';
            this.upgradeable = Boolean(baseCard.upgradeable);

            // Level bounds: 1 to 3 for upgradeable cards; non-upgradeable (PVP/Base) locked to 1
            this.level = this.upgradeable ? Math.max(1, Math.min(3, Number(level) || 1)) : 1;

            this.effect_type = baseCard.effect_type || 'damage';
            this.target = baseCard.target || 'enemy';
            this.tags = Array.isArray(baseCard.tags) ? [...baseCard.tags] : (baseCard.tags ? String(baseCard.tags).split(',') : []);

            // Visual identity must survive instantiation or the card loses its art theme
            this.element = baseCard.element || '';
            this.accentColor = baseCard.accentColor || '';

            // Structural parameters
            this.hit_count = Number(baseCard.hit_count || 1);
            this.self_damage = Number(baseCard.self_damage || 0);
            this.selfDamage = this.self_damage;
            this.proc_chance = Number(baseCard.proc_chance || 0);
            this.duration = Number(baseCard.duration || 0);
            this.condition = baseCard.condition || '';
            this.condition_param = Number(baseCard.condition_param || 0);
            this.condition_bonus = Number(baseCard.condition_bonus || 0);
            this.status = baseCard.status || '';
            this.buff = baseCard.buff || '';

            // Branch / reaction payloads are copied by reference here and scaled in
            // recomputeStats() so a levelled PVE card grows its follow-up effects too.
            this.then_effects = Array.isArray(baseCard.then_effects) ? baseCard.then_effects : [];
            this.else_effects = Array.isArray(baseCard.else_effects) ? baseCard.else_effects : [];
            this.reaction = baseCard.reaction || null;
            this.effects = Array.isArray(baseCard.effects) ? baseCard.effects : [];

            // Effect callback shared with CARD_DATABASE templates
            this.effect = typeof baseCard.effect === 'function'
                ? baseCard.effect
                : function (user, target, game) {
                    if (root.CardEffectEngine) {
                        root.CardEffectEngine.execute(this, { user, target, game, sourceName: this.name, sourceItem: this });
                    }
                };

            // Level bounds: 1 to 3 for upgradeable cards; non-upgradeable (PVP/Base) locked to 1
            this.level = this.upgradeable ? Math.max(1, Math.min(3, Number(level) || 1)) : 1;

            // Calculate scaled attributes based on level multipliers
            this.recomputeStats();
        }

        /**
         * Recompute dynamic combat stats based on level multipliers.
         * Damage: Lv1 100% / Lv2 120% / Lv3 140%; Heal: 100/120/135; Shield: 100/125/150.
         * Branch and reaction outcomes use the shield ladder (Unity's EffectSpec.ValueAtLevel).
         */
        recomputeStats() {
            const lvl = this.level;
            const scale = root.MathUtil
                ? root.MathUtil.scaleByLevel
                : (v, m) => Math.round(v * m);
            const dmgMult = lvl === 1 ? 1.0 : (lvl === 2 ? 1.20 : 1.40);
            const healMult = lvl === 1 ? 1.0 : (lvl === 2 ? 1.20 : 1.35);
            const shieldMult = lvl === 1 ? 1.0 : (lvl === 2 ? 1.25 : 1.50);

            this.damage = this.baseCard.damage ? scale(Number(this.baseCard.damage), dmgMult) : 0;
            this.heal = this.baseCard.heal ? scale(Number(this.baseCard.heal), healMult) : 0;
            this.shield = this.baseCard.shield ? scale(Number(this.baseCard.shield), shieldMult) : 0;
            this.draw = Number(this.baseCard.draw || 0);
            this.drawCount = this.draw;
            this.energy = Number(this.baseCard.energy || 0);

            if (this.baseCard.condition_bonus) {
                this.condition_bonus = scale(Number(this.baseCard.condition_bonus), dmgMult);
            }
            this.then_effects = PlayerCardInstance.scaleSpecs(this.baseCard.then_effects, dmgMult, shieldMult, healMult);
            this.else_effects = PlayerCardInstance.scaleSpecs(this.baseCard.else_effects, dmgMult, shieldMult, healMult);
            if (this.baseCard.reaction && Array.isArray(this.baseCard.reaction.effects)) {
                this.reaction = {
                    condition: this.baseCard.reaction.condition,
                    effects: PlayerCardInstance.scaleSpecs(this.baseCard.reaction.effects, dmgMult, shieldMult, healMult)
                };
            }
        }

        /**
         * Scale a compact effect-spec list. Status stacks never grow with level, matching Unity.
         */
        static scaleSpecs(specs, dmgMult, shieldMult, healMult) {
            if (!Array.isArray(specs)) return [];
            const scale = root.MathUtil ? root.MathUtil.scaleByLevel : (v, m) => Math.round(v * m);
            return specs.map(spec => {
                const copy = Object.assign({}, spec);
                if (spec.type === 'apply_status') return copy;
                if (typeof spec.value === 'number') {
                    const mult = spec.type === 'shield' ? shieldMult : (spec.type === 'heal' ? healMult : shieldMult);
                    copy.value = scale(spec.value, mult);
                }
                return copy;
            });
        }

        /**
         * Upgrade this card instance
         * @returns {Object} { success: boolean, message?: string, newLevel?: number }
         */
        upgrade() {
            if (!this.upgradeable) {
                return { success: false, message: `卡牌「${this.name}」为竞技卡牌，不可升级！` };
            }
            if (this.level >= 3) {
                return { success: false, message: `卡牌「${this.name}」已达到最高等级 (Lv.3)！` };
            }

            this.level++;
            this.recomputeStats();
            return {
                success: true,
                newLevel: this.level,
                message: `卡牌「${this.name}」成功升级至 Lv.${this.level}！`
            };
        }

        /**
         * Create an in-match clone of this card
         */
        clone() {
            const copy = new PlayerCardInstance(this.baseCard, this.level);
            return copy;
        }

        /**
         * Factory method to create an instance from card ID or template
         */
        static create(cardOrId, level = 1) {
            let template = null;
            if (typeof cardOrId === 'string') {
                const configCards = (root.GAME_CONFIG && root.GAME_CONFIG.cards) ? root.GAME_CONFIG.cards : {};
                template = configCards[cardOrId];
                if (!template && root.CARD_DATABASE) {
                    template = root.CARD_DATABASE.find(c => c.id === cardOrId);
                }
            } else if (cardOrId && typeof cardOrId === 'object') {
                template = cardOrId;
            }

            if (!template) {
                template = {
                    id: String(cardOrId || 'unknown'),
                    name: '未知卡牌',
                    cost: 1,
                    damage: 5,
                    effect_type: 'damage'
                };
            }

            return new PlayerCardInstance(template, level);
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PlayerCardInstance;
    }
    root.PlayerCardInstance = PlayerCardInstance;
})(typeof window !== 'undefined' ? window : global);
