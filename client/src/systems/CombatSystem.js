// Combat System Orchestrator
(function(root) {
    class CombatSystem {
        /**
         * Perform normal attack for active player
         */
        static performNormalAttack(game, isRemote = false) {
            if (game.isGameOver) return;
            if (game.isOnline && !isRemote && game.activePlayer.id !== game.localPlayerId) {
                if (game.log) game.log(`【提示】当前是对手的回合，请等待！`);
                return;
            }

            const player = game.activePlayer;
            const target = game.inactivePlayer;

            if (player.hasNormalAttacked) {
                if (game.log) game.log(`【提示】本回合已经进行过普通攻击！`);
                return;
            }
            if (!player.canNormalAttackThisTurn) {
                if (game.log) game.log(`【提示】当前无法进行普通攻击！`);
                return;
            }

            if (game.isOnline && !isRemote && game.onNetworkAction) {
                game.onNetworkAction({ type: 'NORMAL_ATTACK' });
            }

            player.hasNormalAttacked = true;

            const baseDmg = player.hero.normalAttack;
            if (game.log) {
                game.log(`${player.name} 对 ${target.name} 发动「普通攻击」！`);
            }

            // Execute attack via DamageCalculator
            if (root.DamageCalculator) {
                root.DamageCalculator.execute(player, target, baseDmg, {
                    source: '普通攻击',
                    isNormalAttack: true
                }, game);
            } else {
                game.dealDamage(player, target, baseDmg, { source: '普通攻击', isNormalAttack: true });
            }

            if (game.onStateChange) game.onStateChange();
        }

        /**
         * Perform hero active skill
         */
        static performHeroSkill(game, isRemote = false) {
            if (game.isGameOver) return;
            if (game.isOnline && !isRemote && game.activePlayer.id !== game.localPlayerId) {
                if (game.log) game.log(`【提示】当前是对手的回合，请等待！`);
                return;
            }

            const player = game.activePlayer;
            const target = game.inactivePlayer;
            const skill = player.hero.skill;

            if (game.isOnline && !isRemote && game.onNetworkAction) {
                game.onNetworkAction({ type: 'HERO_SKILL' });
            }

            if (root.SkillSystem) {
                root.SkillSystem.cast(player, target, skill, game);
            }

            if (game.onStateChange) game.onStateChange();
        }

        /**
         * Play card from hand
         */
        static playCard(game, cardIndex, isRemote = false) {
            if (game.isGameOver) return;
            if (game.isOnline && !isRemote && game.activePlayer.id !== game.localPlayerId) {
                if (game.log) game.log(`【提示】当前是对手的回合，请等待！`);
                return;
            }

            const player = game.activePlayer;
            const target = game.inactivePlayer;

            if (game.isOnline && !isRemote && game.onNetworkAction) {
                game.onNetworkAction({ type: 'PLAY_CARD', cardIndex: cardIndex });
            }

            if (root.CardSystem) {
                root.CardSystem.play(player, target, cardIndex, game);
            }

            if (game.onStateChange) game.onStateChange();
        }

        /**
         * End turn
         */
        static endTurn(game, isRemote = false) {
            if (game.isGameOver) return;
            if (game.isOnline && !isRemote && game.activePlayer.id !== game.localPlayerId) {
                if (game.log) game.log(`【提示】当前是对手的回合，请等待！`);
                return;
            }

            if (game.isOnline && !isRemote && game.onNetworkAction) {
                game.onNetworkAction({ type: 'END_TURN' });
            }

            if (root.TurnSystem) {
                root.TurnSystem.endTurn(game.activePlayer, game);
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CombatSystem;
    }
    root.CombatSystem = CombatSystem;
})(typeof window !== 'undefined' ? window : global);
