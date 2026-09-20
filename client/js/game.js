// Core Card Game Engine - Fully Refactored with Modular Architecture
(function(root) {
    function createMulberry32(seed) {
        return function() {
            var t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    class CardGame {
        constructor() {
            this.p1 = null;
            this.p2 = null;
            this.activePlayer = null;
            this.inactivePlayer = null;
            this.turnCount = 1;
            this.isGameOver = false;
            this.logs = [];

            this.isOnline = false;
            this.localPlayerId = 'p1';
            this.onNetworkAction = null;
            this.seed = 12345678;
            this.rng = createMulberry32(this.seed);
            this.random = () => this.rng();

            // Core EventBus instance
            const EventBusClass = root.EventBus || class {
                constructor() { this.m = new Map(); }
                on(e, cb) { if (!this.m.has(e)) this.m.set(e, []); this.m.get(e).push(cb); return () => this.off(e, cb); }
                off(e, cb) { if (!this.m.has(e)) return; const l = this.m.get(e); const i = l.indexOf(cb); if (i !== -1) l.splice(i, 1); }
                emit(e, d = {}) { if (!this.m.has(e)) return d; for (const cb of [...this.m.get(e)]) { cb(d); if (d.cancel) break; } return d; }
                clear() { this.m.clear(); }
            };
            this.eventBus = new EventBusClass();

            // Load registries from GAME_CONFIG
            if (root.Registries && root.GAME_CONFIG) {
                root.Registries.loadFromConfig(root.GAME_CONFIG);
            }

            // UI Callbacks
            this.onStateChange = null;
            this.onDamageDealt = null;
            this.onHeal = null;
            this.onShieldGain = null;
            this.onLogAdded = null;
            this.onGameOver = null;
        }

        // Helper to read game rules
        getRule(ruleId, defaultValue) {
            if (root.GAME_CONFIG && root.GAME_CONFIG.gameRules && root.GAME_CONFIG.gameRules[ruleId]) {
                const val = root.GAME_CONFIG.gameRules[ruleId].value;
                if (val !== undefined && val !== null) return Number(val);
            }
            return defaultValue;
        }

        getStatusConfig(statusId) {
            if (root.StatusSystem) {
                return root.StatusSystem.getConfig(statusId);
            }
            if (root.GAME_CONFIG && root.GAME_CONFIG.statuses && root.GAME_CONFIG.statuses[statusId]) {
                return root.GAME_CONFIG.statuses[statusId];
            }
            return null;
        }

        initMatch(p1HeroId, p2HeroId, customDecks = null, seed = null) {
            if (seed !== null && seed !== undefined) {
                this.seed = seed;
                this.rng = createMulberry32(seed);
            }

            // Reset EventBus
            this.eventBus.clear();

            this.p1 = this.createPlayerState('p1', '玩家 1', p1HeroId);
            this.p2 = this.createPlayerState('p2', '玩家 2', p2HeroId);

            // Bind Event-Driven Passives (Zero hardcoding in combat!)
            if (root.HeroManager) {
                root.HeroManager.bindPassives(this.p1, this.eventBus, this);
                root.HeroManager.bindPassives(this.p2, this.eventBus, this);
            }

            if (customDecks) {
                this.p1.deck = customDecks.p1Deck.map(c => ({
                    ...c,
                    effect: root.CARD_DATABASE.find(cd => cd.id === c.id)?.effect || c.effect
                }));
                this.p2.deck = customDecks.p2Deck.map(c => ({
                    ...c,
                    effect: root.CARD_DATABASE.find(cd => cd.id === c.id)?.effect || c.effect
                }));
            }

            this.turnCount = 1;
            this.currentRound = 1;
            this.isGameOver = false;
            this.isPveBattle = false;
            this.logs = [];

            // Draw opening hands
            const initHandSize = this.getRule('initial_hand_size', 4);
            for (let i = 0; i < initHandSize; i++) {
                this.drawCard(this.p1, false);
                this.drawCard(this.p2, false);
            }

            this.activePlayer = this.p1;
            this.inactivePlayer = this.p2;

            this.log(`战斗开始！${this.p1.name}【${this.p1.hero.name}】 VS ${this.p2.name}【${this.p2.hero.name}】！`);

            // Start first turn
            if (root.TurnSystem) {
                root.TurnSystem.startTurn(this.p1, this);
            } else {
                this.startTurn(this.p1);
            }
        }

        /**
         * PVE entry point: the opponent is a stage boss with a fixed deck rather than a
         * player-selected hero. Everything else is the same engine, so single-player PVE shares
         * every rule with online play instead of maintaining a second combat implementation.
         */
        initPveMatch(playerHeroId, enemyHeroId, enemyDeckCardIds, seed, playerDeckCardIds) {
            // Fail loudly: an unregistered enemy hero used to fall through to HeroManager's
            // `maxHp || 30` default and spawn a 30-HP boss that died in two turns.
            if (!enemyHeroId || !root.GAME_CONFIG.characters[enemyHeroId]) {
                throw new Error(`[PveMatch] 首领定义缺失：${enemyHeroId}。请通过 PveSystem.startBattle 开战。`);
            }
            if (!root.GAME_CONFIG.characters[playerHeroId]) {
                throw new Error(`[PveMatch] 出战英雄不存在：${playerHeroId}`);
            }
            if (seed !== null && seed !== undefined) {
                this.seed = seed;
                this.rng = createMulberry32(seed);
            } else {
                this.seed = Date.now() & 0x7fffffff;
                this.rng = createMulberry32(this.seed);
            }
            this.eventBus.clear();

            this.p1 = this.createPlayerState('p1', '玩家 1', playerHeroId);
            this.p2 = this.createPlayerState('p2', '关卡首领', enemyHeroId);

            if (Array.isArray(enemyDeckCardIds) && enemyDeckCardIds.length > 0) {
                this.p2.deck = root.createShuffledDeck(null, enemyDeckCardIds, () => this.random());
            }
            if (Array.isArray(playerDeckCardIds) && playerDeckCardIds.length > 0) {
                this.p1.deck = root.createShuffledDeck(playerHeroId, playerDeckCardIds, () => this.random());
            }

            this.isPveBattle = true;
            this.localPlayerId = 'p1';

            if (root.HeroManager) {
                root.HeroManager.bindPassives(this.p1, this.eventBus, this);
                root.HeroManager.bindPassives(this.p2, this.eventBus, this);
            }

            this.turnCount = 1;
            this.currentRound = 1;
            this.isGameOver = false;
            this.logs = [];

            const initHandSize = this.getRule('initial_hand_size', 4);
            for (let i = 0; i < initHandSize; i++) {
                this.drawCard(this.p1, false);
                this.drawCard(this.p2, false);
            }

            this.activePlayer = this.p1;
            this.inactivePlayer = this.p2;

            this.log(`讨伐开始！${this.p1.name}【${this.p1.hero.name}】 VS ${this.p2.hero.name}！`);

            if (root.TurnSystem) {
                root.TurnSystem.startTurn(this.p1, this);
            }
        }

        createPlayerState(id, name, heroId) {
            let heroDef;
            if (root.HeroManager) {
                heroDef = root.HeroManager.createHeroInstance(heroId);
            } else {
                heroDef = root.HERO_DATABASE ? (root.HERO_DATABASE[heroId] || Object.values(root.HERO_DATABASE)[0]) : { id: heroId, hp: 30, normalAttack: 4 };
            }

            const initialEnergy = this.getRule('initial_energy', 4);

            const heroMods = (heroDef && heroDef.modifiers) ? heroDef.modifiers : {
                damageBonus: Number(heroDef.damageBonus || 0),
                healBonus: Number(heroDef.healBonus || 0),
                shieldBonus: Number(heroDef.shieldBonus || 0),
                fireDamageBonus: Number(heroDef.fireDamageBonus || 0),
                iceDamageBonus: Number(heroDef.iceDamageBonus || 0),
                poisonDamageBonus: Number(heroDef.poisonDamageBonus || 0)
            };

            return {
                id: id,
                name: name,
                hero: { ...heroDef },
                hp: heroDef.hp,
                maxHp: heroDef.hp,
                shield: 0,
                // Round 1 runs on the hero's startingEnergy; the ladder only refills from round 2.
                energy: Math.max(0, Math.min(this.getRule('max_energy', 10), initialEnergy)),
                deck: root.createShuffledDeck ? root.createShuffledDeck(heroDef.id, null, () => this.random()) : [],
                hand: [],
                discardPile: [],
                statuses: [], // Dynamic status instances array
                pendingReactions: [], // Armed delayed-reaction cards
                lastPlayedCardType: '', // Public information for mind-game conditions
                cardsPlayedThisTurn: 0,
                passedLastTurn: false,
                blessing: null,
                modifiers: {
                    damageBonus: Number(heroMods.damageBonus || 0),
                    healBonus: Number(heroMods.healBonus || 0),
                    shieldBonus: Number(heroMods.shieldBonus || 0),
                    fireDamageBonus: Number(heroMods.fireDamageBonus || 0),
                    iceDamageBonus: Number(heroMods.iceDamageBonus || 0),
                    poisonDamageBonus: Number(heroMods.poisonDamageBonus || 0)
                },
                skillCooldown: 0,
                hasNormalAttacked: false,
                hasUsedSkill: false,
                canNormalAttackThisTurn: true,
                turnHealedAmount: 0,
                consecutiveHeals: 0,
                tookDamageThisTurn: false,
                tookDamageSinceLastTurn: false,
                ironGuardPassiveUsedThisTurn: false,
                buffs: {
                    damageReduction: 0,
                    flatDamageReduction: 0,
                    nextDamageBonus: 0
                },
                debuffs: {
                    burnStacks: 0,
                    burnDuration: 0,
                    poisonStacks: 0,
                    poisonDuration: 0,
                    weaken: 0,
                    freeze: 0
                },
                stats: {
                    totalDamageDealt: 0,
                    totalHealingDone: 0,
                    cardsPlayed: 0,
                    turnsTaken: 0
                }
            };
        }

        startTurn(player) {
            if (root.TurnSystem) {
                root.TurnSystem.startTurn(player, this);
            }
        }

        drawCard(player, announce = true) {
            const maxHand = this.getRule('max_hand_size', 10);

            if (player.deck.length === 0) {
                if (player.discardPile.length === 0) {
                    if (announce) this.log(`${player.name} 牌堆与弃牌堆皆已耗尽！`);
                    return;
                }
                player.deck = [...player.discardPile];
                player.discardPile = [];
                for (let i = player.deck.length - 1; i > 0; i--) {
                    const j = Math.floor(this.random() * (i + 1));
                    [player.deck[i], player.deck[j]] = [player.deck[j], player.deck[i]];
                }
                this.log(`${player.name} 弃牌堆已重洗回抽牌堆！`);
            }

            const drawn = player.deck.pop();

            // Unity burns the overflow instead of refusing the draw: the card is still consumed
            // from the cycling deck, so a flooded hand is a real cost.
            if (player.hand.length >= maxHand) {
                player.discardPile.push(drawn);
                if (announce) {
                    this.log(`🔥 ${player.name} 手牌已达上限 ${maxHand} 张，抽到的「${drawn ? drawn.name : '未知卡牌'}」直接被烧掉了！`);
                }
                return;
            }

            player.hand.push(drawn);

            if (announce && root.soundManager) {
                root.soundManager.playCardDraw();
            }
        }

        // --- Standard Action APIs (Forwarding to Modular Systems) ---
        performNormalAttack(isRemote = false) {
            if (root.CombatSystem) {
                root.CombatSystem.performNormalAttack(this, isRemote);
            }
        }

        performHeroSkill(isRemote = false) {
            if (root.CombatSystem) {
                root.CombatSystem.performHeroSkill(this, isRemote);
            }
        }

        playCard(cardIndex, isRemote = false) {
            if (root.CombatSystem) {
                root.CombatSystem.playCard(this, cardIndex, isRemote);
            }
        }

        endTurn(isRemote = false) {
            if (root.CombatSystem) {
                root.CombatSystem.endTurn(this, isRemote);
            }
        }

        // --- Damage Pipeline Integration ---
        dealDamage(attacker, defender, rawDmg, options = {}) {
            if (root.DamageCalculator) {
                const res = root.DamageCalculator.execute(attacker, defender, rawDmg, options, this);
                return res.totalDamage;
            }
            return 0;
        }

        dealDirectDamage(target, amount, sourceName) {
            if (root.DamageCalculator) {
                return root.DamageCalculator.executeDirect(target, amount, sourceName, this);
            }
            return 0;
        }

        // --- Shield System ---
        addShield(player, amount, sourceName, options = {}) {
            let finalAmount = Number(amount) || 0;
            if (player && player.modifiers && player.modifiers.shieldBonus > 0) {
                finalAmount += player.modifiers.shieldBonus;
            }
            const maxShield = this.getRule('max_shield', this.getRule('max_shield_cap', 50));
            const prevShield = player.shield;
            player.shield = Math.min(maxShield, player.shield + finalAmount);
            const gained = player.shield - prevShield;
            if (gained > 0) {
                player.shieldGainedThisTurn = true;
                if (player.stats) player.stats.shieldGainedThisTurn = true;
            }
            this.log(`${player.name} 通过「${sourceName}」获得了 ${gained} 点护盾 (当前: ${player.shield}/${maxShield})！`);

            if (this.eventBus) {
                this.eventBus.emit('onShieldGain', { player, amount: gained, source: sourceName, options });
            }

            if (root.soundManager) root.soundManager.playShield();
            if (this.onShieldGain) this.onShieldGain(player, gained);
        }

        // --- Healing System ---
        healPlayer(player, rawAmount, sourceName, options = {}) {
            let bonusAmount = Number(rawAmount) || 0;
            if (player && player.modifiers && player.modifiers.healBonus > 0) {
                bonusAmount += player.modifiers.healBonus;
            }
            const maxHealPerTurn = this.getRule('max_heal_per_turn', 30);
            const decayStep = this.getRule('consecutive_heal_decay', 1);

            const remainingCap = Math.max(0, maxHealPerTurn - player.turnHealedAmount);
            let allowedAmount = Math.min(bonusAmount, remainingCap);

            if (player.consecutiveHeals > 0) {
                allowedAmount = Math.max(1, allowedAmount - (player.consecutiveHeals * decayStep));
            }

            const actualHeal = Math.min(allowedAmount, player.maxHp - player.hp);
            player.hp += actualHeal;
            player.turnHealedAmount += actualHeal;
            player.consecutiveHeals++;
            player.stats.totalHealingDone += actualHeal;
            if (actualHeal > 0) {
                player.healedThisTurn = true;
                if (player.stats) player.stats.healedThisTurn = true;
            }

            this.log(`${player.name} 通过「${sourceName}」恢复了 ${actualHeal} 点生命 (当前: ${player.hp}/${player.maxHp})！`);

            if (this.eventBus) {
                this.eventBus.emit('onHeal', { player, amount: actualHeal, source: sourceName, options });
            }

            if (root.soundManager) root.soundManager.playHeal();
            if (this.onHeal) this.onHeal(player, actualHeal);
        }

        // --- Blessing System ---
        applyBlessing(player, blessingId) {
            if (!player || !blessingId) return;
            const blessings = (root.GAME_CONFIG && root.GAME_CONFIG.blessings) ? root.GAME_CONFIG.blessings : {};
            const blessing = blessings[blessingId];
            if (!blessing) return;

            player.blessing = blessing;
            if (!player.modifiers) {
                player.modifiers = { damageBonus: 0, healBonus: 0, shieldBonus: 0, fireDamageBonus: 0, iceDamageBonus: 0, poisonDamageBonus: 0 };
            }
            if (blessing.modifiers) {
                Object.keys(blessing.modifiers).forEach(k => {
                    player.modifiers[k] = (player.modifiers[k] || 0) + Number(blessing.modifiers[k] || 0);
                });
            }
            this.log(`✨ ${player.name} 获得了战斗祝福【${blessing.name}】：${blessing.description}`);
            if (this.eventBus) {
                this.eventBus.emit('onBlessingApplied', { player, blessing });
            }
        }

        // --- Status Operations ---
        applyBurn(target, stacks = 1) {
            if (root.StatusSystem) {
                root.StatusSystem.apply(target, 'burn', stacks, 2, this);
            }
        }

        applyPoison(target, stacks = 2) {
            if (root.StatusSystem) {
                root.StatusSystem.apply(target, 'poison', stacks, 2, this);
            }
        }

        // --- Pure Data GameState Synchronization ---
        getSnapshot() {
            if (root.GameState) {
                return root.GameState.serialize(this);
            }
            return null;
        }

        applySnapshot(snapshot) {
            if (root.GameState) {
                root.GameState.applySnapshot(this, snapshot);
                if (this.onStateChange) this.onStateChange();
            }
        }

        endMatch(winner, loser) {
            this.isGameOver = true;
            this.log(`🏆 战斗结束！【${winner.name}】(${winner.hero.name}) 获得了胜利！`);

            if (root.soundManager) root.soundManager.playVictory();
            if (this.onGameOver) {
                this.onGameOver({
                    winner: winner,
                    loser: loser,
                    rounds: Math.ceil(this.turnCount / 2),
                    p1Stats: this.p1.stats,
                    p2Stats: this.p2.stats
                });
            }
        }

        log(message) {
            const currentRound = this.currentRound || Math.max(1, Math.ceil((this.turnCount || 1) / 2));
            const activePlayerName = (this.activePlayer) ? this.activePlayer.name : '';
            const entry = {
                text: message,
                time: new Date().toLocaleTimeString(),
                round: currentRound,
                player: activePlayerName,
                timestamp: Date.now()
            };
            this.logs.unshift(entry);
            if (this.logs.length > 300) this.logs.pop();
            if (this.onLogAdded) this.onLogAdded(entry);
        }
    }

    root.CardGame = CardGame;
    // Peers must deal identical decks, so the deck shuffle needs the match seed's RNG too.
    root.createMatchRng = createMulberry32;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CardGame;
    }
})(typeof window !== 'undefined' ? window : global);
