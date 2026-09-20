// Declarative Card Execution & Resolution System (CardManager & CardResolver)
(function(root) {
    class CardSystem {
        /**
         * Play a card from hand using declarative data-driven effect engine
         * @param {Object} player - Player playing the card
         * @param {Object} target - Target player
         * @param {number} cardIndex - Hand index
         * @param {Object} game - CardGame instance
         * @returns {boolean} Success
         */
        static play(player, target, cardIndex, game) {
            if (!player || !target || !game) return false;
            if (cardIndex < 0 || cardIndex >= player.hand.length) return false;

            const card = player.hand[cardIndex];

            // 1. Cost Verification
            if (player.energy < card.cost) {
                if (game.log) game.log(`【提示】能量不足！「${card.name}」需要 ${card.cost} 能量 (当前: ${player.energy})！`);
                return false;
            }

            // 2. Freeze gates attack and skill cards exactly like Unity's PlayCardResult.Frozen.
            // Defense / Heal cards still go through, as do draws and the energy refill.
            if (root.StatusSystem && root.StatusSystem.has(player, 'freeze')) {
                const cfg = root.StatusSystem.getConfig('freeze') || {};
                const blocked = ['attack', 'skill', 'special'];
                if (cfg.blocksAttackAndSkill !== false && blocked.includes(card.type)) {
                    if (game.log) game.log(`❄️【冰封封锁】${card.name} 属于${card.type === 'attack' ? '攻击' : '技能'}牌，冰冻状态下无法打出！`);
                    return false;
                }
            }

            // 3. Declarative play-time prerequisites (e.g. 蓄能冲击 needs 10 shield)
            if (card.condition && card.condition.indexOf('require_shield') === 0) {
                if (!root.CardEffectEngine || !root.CardEffectEngine.checkCondition(card.condition, card.condition_param, {
                    user: player, target, game
                })) {
                    const need = parseFloat(String(card.condition).split(':')[1] || 10);
                    if (game.log) game.log(`【提示】护盾不足！「${card.name}」需要至少 ${need} 点护盾！`);
                    return false;
                }
            }

            // 4. Deduct cost and move card to discard pile
            player.energy -= card.cost;
            player.hand.splice(cardIndex, 1);
            player.discardPile.push(card);
            if (player.stats) player.stats.cardsPlayed++;
            player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn || 0) + 1;
            player.lastPlayedCardType = card.type;

            if (game.log) {
                game.log(`${player.name} 消耗 ${card.cost} 能量使用了卡牌「${card.name}」！`);
            }

            if (root.soundManager) root.soundManager.playCardPlay();

            // 5. Send to CardEffectEngine
            if (root.CardEffectEngine) {
                root.CardEffectEngine.execute(card, {
                    user: player,
                    target: target,
                    game: game,
                    sourceName: card.name,
                    sourceItem: card
                });
            } else if (root.EffectResolver) {
                const effects = CardSystem.getEffects(card);
                root.EffectResolver.resolve(effects, {
                    user: player,
                    target: target,
                    game: game,
                    sourceName: card.name,
                    sourceItem: card
                });
            } else if (typeof card.effect === 'function') {
                card.effect(player, target, game);
            }

            // 5. Emit onCardPlay event & sync
            if (game.eventBus) {
                game.eventBus.emit('onCardPlay', {
                    player,
                    target,
                    card,
                    cardIndex
                });
            }

            return true;
        }

        /**
         * Get declarative effects for a card (Data-driven, no card ID hardcoding)
         */
        static getEffects(card) {
            if (card.effects && Array.isArray(card.effects) && card.effects.length > 0) {
                return card.effects;
            }

            const effects = [];
            const dmg = Number(card.damage || 0);
            const heal = Number(card.heal || 0);
            const shield = Number(card.shield || 0);
            const draw = Number(card.draw || card.draw_count || 0);
            const energy = Number(card.energy || 0);

            if (dmg > 0) {
                effects.push({
                    type: 'damage',
                    value: dmg,
                    hit_count: Number(card.hit_count || 1),
                    self_damage: Number(card.self_damage || 0)
                });
            }
            if (shield !== 0) {
                effects.push({ type: 'shield', value: shield });
            }
            if (heal > 0) {
                effects.push({ type: 'heal', value: heal });
            }
            if (draw > 0) {
                effects.push({ type: 'draw_card', value: draw });
            }
            if (energy !== 0) {
                effects.push({ type: 'gain_energy', value: energy });
            }
            if (card.status) {
                effects.push({ type: 'apply_status', status: card.status });
            }
            if (card.buff) {
                effects.push({ type: 'modify_damage', buff: card.buff });
            }

            return effects;
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CardSystem;
    }
    root.CardSystem = CardSystem;
    root.CardResolver = CardSystem;
    root.CardManager = CardSystem;
})(typeof window !== 'undefined' ? window : global);
