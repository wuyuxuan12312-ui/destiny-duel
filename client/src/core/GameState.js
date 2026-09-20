// Pure Data GameState Serialization Model
(function(root) {
    class GameState {
        /**
         * Serialize a player to a pure data object (no functions, no circular refs)
         */
        static serializePlayer(player) {
            if (!player) return null;

            // Serialize active statuses
            const statuses = (player.statuses || []).map(st => ({
                id: st.id || st.statusId,
                statusId: st.statusId,
                stacks: st.stacks || 1,
                duration: st.duration || 1
            }));

            return {
                id: player.id,
                name: player.name,
                heroId: player.hero ? player.hero.id : null,
                hp: player.hp,
                maxHp: player.maxHp,
                shield: player.shield,
                energy: player.energy,
                skillCooldown: player.skillCooldown,
                hasNormalAttacked: player.hasNormalAttacked,
                hasUsedSkill: player.hasUsedSkill,
                canNormalAttackThisTurn: player.canNormalAttackThisTurn,
                tookDamageThisTurn: player.tookDamageThisTurn,
                turnHealedAmount: player.turnHealedAmount || 0,
                consecutiveHeals: player.consecutiveHeals || 0,

                // Hands and Decks (pure IDs or light objects)
                hand: (player.hand || []).map(c => ({
                    id: c.id,
                    name: c.name,
                    cost: c.cost,
                    type: c.type || c.cardType,
                    rarity: c.rarity
                })),
                deckCount: player.deck ? player.deck.length : 0,
                discardPile: (player.discardPile || []).map(c => c.id),

                // Pure statuses list
                statuses: statuses,

                // Legacy Buff/Debuff dicts for backwards compatibility
                buffs: { ...player.buffs },
                debuffs: { ...player.debuffs },

                stats: { ...player.stats }
            };
        }

        /**
         * Serialize entire game match to a pure data snapshot
         */
        static serialize(game) {
            if (!game) return null;

            return {
                turnCount: game.turnCount,
                round: Math.ceil(game.turnCount / 2),
                activePlayerId: game.activePlayer ? game.activePlayer.id : null,
                inactivePlayerId: game.inactivePlayer ? game.inactivePlayer.id : null,
                isGameOver: game.isGameOver,
                seed: game.seed,
                players: {
                    p1: GameState.serializePlayer(game.p1),
                    p2: GameState.serializePlayer(game.p2)
                }
            };
        }

        /**
         * Apply a pure data snapshot to restore/sync game state
         */
        static applySnapshot(game, snapshot) {
            if (!game || !snapshot) return;

            game.turnCount = snapshot.turnCount;
            game.isGameOver = snapshot.isGameOver;

            if (snapshot.players) {
                if (snapshot.players.p1 && game.p1) {
                    GameState.restorePlayer(game.p1, snapshot.players.p1);
                }
                if (snapshot.players.p2 && game.p2) {
                    GameState.restorePlayer(game.p2, snapshot.players.p2);
                }
            }

            if (snapshot.activePlayerId === 'p1') {
                game.activePlayer = game.p1;
                game.inactivePlayer = game.p2;
            } else if (snapshot.activePlayerId === 'p2') {
                game.activePlayer = game.p2;
                game.inactivePlayer = game.p1;
            }
        }

        static restorePlayer(player, data) {
            if (!player || !data) return;
            player.hp = data.hp;
            player.maxHp = data.maxHp;
            player.shield = data.shield;
            player.energy = data.energy;
            player.skillCooldown = data.skillCooldown;
            player.hasNormalAttacked = data.hasNormalAttacked;
            player.hasUsedSkill = data.hasUsedSkill;
            player.canNormalAttackThisTurn = data.canNormalAttackThisTurn;
            player.tookDamageThisTurn = data.tookDamageThisTurn;

            if (data.buffs) player.buffs = { ...data.buffs };
            if (data.debuffs) player.debuffs = { ...data.debuffs };
            if (data.stats) player.stats = { ...data.stats };

            // Restore statuses if status manager exists
            if (Array.isArray(data.statuses)) {
                player.statuses = data.statuses.map(s => ({ ...s }));
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GameState;
    }
    root.GameState = GameState;
})(typeof window !== 'undefined' ? window : global);
