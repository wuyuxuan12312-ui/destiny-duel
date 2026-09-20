// Turn lifecycle, energy ladder and end-of-turn decay — aligned with the ported Unity rules.
(function(root) {
    // Unity's BattleController.GetEnergyForRound: rounds 1-3 refill to 3, 4-7 to 4, 8+ to 5.
    // Round 1 is special-cased to the hero's startingEnergy and draws nothing (the opening
    // hands were already dealt), and the refill is a hard overwrite — unspent energy is lost.
    class TurnSystem {
        static energyForRound(game, round) {
            if (round <= 3) return game.getRule('energy_per_turn', 3);
            if (round <= 7) return game.getRule('energy_ladder_round_4', 4);
            return game.getRule('energy_ladder_round_8', 5);
        }

        /**
         * Initialize turn lifecycle for the active player
         */
        static startTurn(player, game) {
            if (!player || !game || game.isGameOver) return;

            player.stats.turnsTaken++;

            // Reset turn-specific states
            player.hasNormalAttacked = false;
            player.hasUsedSkill = false;
            player.canNormalAttackThisTurn = true;
            player.turnHealedAmount = 0;
            player.consecutiveHeals = 0;
            player.tookDamageThisTurn = false;
            player.shieldGainedThisTurn = false;
            player.healedThisTurn = false;
            player.cardsPlayedThisTurn = 0;

            // Reset per-turn buffs
            player.buffs.damageReduction = 0;
            player.buffs.flatDamageReduction = 0;

            // Skill cooldown decrement
            if (player.skillCooldown > 0) {
                player.skillCooldown--;
            }

            const currentRound = Math.ceil(game.turnCount / 2);
            game.currentRound = currentRound;

            // Tick turn_start statuses (freeze blocks this turn's attacks and skills)
            if (root.StatusSystem) {
                root.StatusSystem.tick(player, 'turn_start', game);
            }

            const maxEnergy = game.getRule ? game.getRule('max_energy', 10) : 10;
            const refillIsOverwrite = (game.getRule ? game.getRule('energy_refill_mode', 1) : 1) === 1;

            if (player.stats.turnsTaken > 1) {
                const drawCount = game.getRule ? game.getRule('turn_draw_count', 2) : 2;
                const refill = TurnSystem.energyForRound(game, currentRound);
                if (refillIsOverwrite) {
                    player.energy = Math.max(0, Math.min(maxEnergy, refill));
                } else {
                    player.energy = Math.min(maxEnergy, player.energy + refill);
                }
                for (let i = 0; i < drawCount; i++) {
                    game.drawCard(player);
                }
                if (player.buffs.nextTurnEnergy) {
                    player.energy = Math.max(0, Math.min(maxEnergy, player.energy + player.buffs.nextTurnEnergy));
                    player.buffs.nextTurnEnergy = 0;
                }
            }

            game.log(`--- 第 ${currentRound} 轮: ${player.name}【${player.hero.name}】的回合 ---`);

            // Emit onTurnStart event
            if (game.eventBus) {
                game.eventBus.emit('onTurnStart', {
                    player,
                    turn: game.turnCount,
                    round: currentRound
                });
            }

            if (root.soundManager) root.soundManager.playTurnStart();
            if (game.onStateChange) game.onStateChange();
        }

        /**
         * End the active player's turn and transfer to opponent.
         * Order mirrors Unity's EndCurrentTurn: DoT ticks, then shield decay, then the
         * win/loss check, then public-information bookkeeping for the next side.
         */
        static endTurn(player, game) {
            if (!player || !game || game.isGameOver) return;

            const currentRound = Math.ceil(game.turnCount / 2);
            game.currentRound = currentRound;

            // 1. Process turn_end statuses (burn, poison) and age every status out
            if (root.StatusSystem) {
                root.StatusSystem.tick(player, 'turn_end', game);
            }

            if (game.isGameOver) return;

            // 2. Unbroken shield halves (floor) at the end of its owner's turn. Unity does integer
            // division here, so 1 -> 0, 5 -> 2, 9 -> 4. This is what stops shield stacking from
            // turning every match into a stalemate.
            const decayRatio = game.getRule ? game.getRule('shield_decay_ratio', 0.5) : 0.5;
            if (player.shield > 0 && decayRatio > 0) {
                const before = player.shield;
                player.shield = Math.floor(player.shield * decayRatio);
                const lost = before - player.shield;
                if (lost > 0) {
                    game.log(`🌗 回合结束：${player.name} 未被打破的 ${before} 点护盾衰减了 ${lost} 点（剩余 ${player.shield}）。`);
                    if (game.onStateChange) game.onStateChange();
                }
            }

            if (game.isGameOver) return;

            // 3. Reaction walls stay live through exactly one opposing turn: armed on turn T they
            // may trigger during the opponent's turn T+1, then lapse.
            [game.p1, game.p2].forEach(side => {
                if (!Array.isArray(side.pendingReactions) || side.pendingReactions.length === 0) return;
                const stillLive = [];
                for (const reaction of side.pendingReactions) {
                    if (game.turnCount < reaction.armedOnTurn + 2) stillLive.push(reaction);
                    else if (game.log) game.log(`💨 「${reaction.cardName}」的战术预置未能触发，随时间消散了。`);
                }
                side.pendingReactions = stillLive;
            });

            // 4. Emit onTurnEnd event (passives like Forest Mage trigger here, after status damage)
            if (game.eventBus) {
                game.eventBus.emit('onTurnEnd', {
                    player,
                    turn: game.turnCount,
                    round: currentRound
                });
            }

            if (game.isGameOver) return;

            // 5. Public information for the opponent's mind-game conditions
            player.passedLastTurn = (player.cardsPlayedThisTurn || 0) === 0;
            player.tookDamageSinceLastTurn = false;
            player.cardsPlayedThisTurn = 0;
            player.playedCardsThisTurn = 0;

            // 6. Switch active player
            game.turnCount++;
            const nextPlayer = game.activePlayer === game.p1 ? game.p2 : game.p1;
            game.inactivePlayer = game.activePlayer;
            game.activePlayer = nextPlayer;

            TurnSystem.startTurn(game.activePlayer, game);
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TurnSystem;
    }
    root.TurnSystem = TurnSystem;
})(typeof window !== 'undefined' ? window : global);
