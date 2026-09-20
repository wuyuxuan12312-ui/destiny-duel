// Destiny Duel - AI decision engine for single-player and PVE battles.
//
// The planner is pure and synchronous so it can be unit-tested and reused headlessly; only
// runAITurn() adds the pacing that makes an opponent feel like it is thinking. Damage estimates
// go through DamageCalculator.preview(), which mirrors the real pipeline — Unity's shipped greedy
// AI instead scored with its own rough number (BaseValue, ignoring hitCount and statuses), so it
// routinely mis-judged lethal. Keeping one source of truth is the point.
(function(root) {
    const MAX_ACTIONS_PER_TURN = 8;

    function isBlockedByFreeze(actor, card) {
        const StatusSystem = root.StatusSystem;
        if (!StatusSystem || !StatusSystem.has(actor, 'freeze')) return false;
        const cfg = StatusSystem.getConfig('freeze') || {};
        if (cfg.blocksAttackAndSkill === false) return false;
        return card.type === 'attack' || card.type === 'skill' || card.type === 'special';
    }

    class CardGameAI {
        constructor(game, ui) {
            this.game = game;
            this.ui = ui;
            this.isRunning = false;
            this.thinkMs = 700;
            this.actMs = 620;
        }

        /**
         * Read the AI pacing preference from the settings modal. The select carries a delay in
         * milliseconds (400 / 800 / 1500), and nothing consumed it before, so the labelled
         * "AI 速度" option in the settings panel had no effect at all.
         */
        applySpeedSetting() {
            const select = root.document && root.document.getElementById
                ? root.document.getElementById('setting-ai-speed') : null;
            if (!select) return;
            const base = Number(select.value);
            if (!Number.isFinite(base) || base <= 0) return;
            this.thinkMs = Math.round(base * 0.85);
            this.actMs = Math.round(base * 0.75);
        }

        /**
         * Score one card for `actor` against `foe`. Higher is better; null means unplayable.
         */
        scoreCard(actor, foe, card, energyAfter) {
            if (card.cost > actor.energy) return null;
            if (isBlockedByFreeze(actor, card)) return null;

            const DamageCalculator = root.DamageCalculator;
            const hpRatio = actor.hp / (actor.maxHp || 1);
            const missingHp = (actor.maxHp || 1) - actor.hp;

            let value = 0;

            // Damage the engine will actually put on the stack this play.
            let dealt = 0;
            const hits = Math.max(1, Number(card.hit_count || 1));
            if (Number(card.damage || 0) > 0 && DamageCalculator) {
                for (let i = 0; i < hits; i++) {
                    const preview = DamageCalculator.preview(actor, foe, card, i, this.game);
                    dealt += preview.hpDmg + preview.shieldDmg;
                    if (preview.wouldKill) break;
                }
            }
            value += dealt;

            // Branch outcomes the AI can see coming from public information.
            if (Array.isArray(card.then_effects) && card.then_effects.length && root.CardEffectEngine) {
                const matched = root.CardEffectEngine.checkCondition(card.condition, card.condition_param, {
                    user: actor, target: foe, game: this.game
                });
                const specs = matched ? card.then_effects : (card.else_effects || []);
                for (const spec of specs) {
                    const type = spec.type;
                    if (type === 'damage') value += matched ? Number(spec.value) || 0 : 0;
                    else if (type === 'shield') value += (Number(spec.value) || 0) * 0.8;
                    else if (type === 'heal') value += Math.min(Number(spec.value) || 0, missingHp) * 0.8;
                    else if (type === 'draw' || type === 'draw_card') value += (Number(spec.count || spec.value) || 0) * 2;
                    else if (type === 'energy' || type === 'gain_energy') value += (Number(spec.value) || 0) * 2;
                    else if (type === 'apply_status') value += matched ? 5 : 2;
                }
            }

            // Defense is worth its face value only while it can still absorb a real hit.
            const shieldValue = Math.min(Number(card.shield || 0), this.estimateIncoming(foe));
            value += shieldValue * (hpRatio < 0.45 ? 1.35 : 0.9);
            value += Math.min(Number(card.heal || 0), missingHp) * (hpRatio < 0.5 ? 1.5 : 0.85);
            value += (Number(card.draw || 0)) * 2.5;
            value += (Number(card.energy || 0)) * 2.0;

            // Statuses: Unity's Novice scorer gave pure buff/debuff cards a 0 and never played
            // them. Every applied status gets real weight, worse when it lands on the foe.
            if (card.status) {
                String(card.status).split(',').forEach(token => {
                    const [id, rawStacks] = token.trim().split(':');
                    const stacks = Number(rawStacks) || 1;
                    const cfg = root.StatusSystem ? (root.StatusSystem.getConfig(id) || {}) : {};
                    const potency = (Number(cfg.damagePerTurn) || 0) * 2
                        + Math.abs(Number(cfg.damageTakenMultiplier) || 0) * 8
                        + Math.abs(Number(cfg.damageDealtMultiplier) || 0) * 8
                        + (Number(cfg.thorns) || 0) * 1.5
                        + (cfg.blocksAttackAndSkill ? 6 : 0);
                    const onFoe = card.target !== 'self';
                    value += (potency || 4) * stacks * (onFoe ? 1.1 : 0.9);
                });
            }
            if (card.buff) {
                value += 4 * String(card.buff).split(',').filter(Boolean).length;
            }

            // Recoil that would kill the actor is never worth it unless the play wins right now.
            if (Number(card.self_damage || 0) >= actor.hp && !this.wouldLethal(dealt, foe)) {
                value -= 200;
            }

            // Leftover energy is destroyed by the turn-start overwrite, so spending down matters.
            if (energyAfter !== undefined && energyAfter > 0) {
                value -= energyAfter * 0.6;
            }

            const efficiency = card.cost > 0 ? value / card.cost : value * 1.2;
            return { value, efficiency, dealt };
        }

        estimateIncoming(foe) {
            // A rough read of how much damage the opponent can still put out this turn; shield
            // beyond that is dead weight because it halves at end of turn anyway.
            const hand = Array.isArray(foe.hand) ? foe.hand : [];
            let threat = Number(foe.energy || 0) * 4;
            for (const card of hand) {
                if (card && card.type === 'attack') threat += Number(card.damage || 0) * Math.max(1, Number(card.hit_count || 1));
            }
            return Math.max(6, Math.round(threat / 3));
        }

        wouldLethal(dealt, foe) {
            return dealt >= (foe.hp + foe.shield);
        }

        /**
         * Choose the single best play available right now.
         */
        pickBestPlay(actor, foe) {
            const hand = Array.isArray(actor.hand) ? actor.hand : [];
            let best = null;
            for (let i = 0; i < hand.length; i++) {
                const scored = this.scoreCard(actor, foe, hand[i], actor.energy - hand[i].cost);
                if (!scored) continue;
                if (this.wouldLethal(scored.dealt, foe)) scored.efficiency += 1000;
                if (!best || scored.efficiency > best.efficiency) {
                    best = Object.assign({ index: i, card: hand[i] }, scored);
                }
            }
            return best;
        }

        /**
         * Full turn plan. Mutates nothing but the game through the public action APIs, and
         * returns how many actions were taken so callers can assert on it.
         */
        takeTurn(actorId) {
            const game = this.game;
            const actor = actorId === 'p1' ? game.p1 : game.p2;
            const foe = actor === game.p1 ? game.p2 : game.p1;
            if (!actor || game.isGameOver || game.activePlayer !== actor) return 0;

            let actions = 0;

            // 1. Hero skill: a big chunk of the turn's damage or defence, so take it early,
            //    but do not burn a heal at full health.
            const skill = actor.hero && actor.hero.skill;
            if (skill && !actor.hasUsedSkill && (actor.skillCooldown || 0) <= 0 && actor.energy >= skill.cost) {
                const wantsHeal = Number(skill.heal || 0) > 0;
                const healthy = actor.hp >= (actor.maxHp || 1) * 0.85;
                if (!(wantsHeal && healthy)) {
                    game.performHeroSkill();
                    actions++;
                }
            }

            // 2. Spend down. The turn-start refill is an overwrite, so banking energy is waste.
            while (!game.isGameOver && actions < MAX_ACTIONS_PER_TURN) {
                const best = this.pickBestPlay(actor, foe);
                if (!best) break;
                const before = actor.energy;
                if (!root.CardSystem.play(actor, foe, best.index, game)) break;
                actions++;
                if (actor.energy >= before) break;   // no progress: stop rather than spin
            }

            // 3. The free normal attack is always worth taking last.
            if (!game.isGameOver && !actor.hasNormalAttacked && actor.canNormalAttackThisTurn) {
                game.performNormalAttack();
                actions++;
            }

            return actions;
        }

        /**
         * Paced turn for the browser. `headless` skips all timing so tests stay fast.
         *
         * isRunning is cleared *before* endTurn() and the ownership of the turn is re-checked
         * after every await: endTurn synchronously renders, and a render that sees a still-busy
         * AI used to skip scheduling the next one, which stranded the match on the AI's turn
         * forever whenever the player ended their turn inside that window.
         */
        async runAITurn() {
            if (this.isRunning) return;
            this.isRunning = true;
            const game = this.game;
            const actor = game.p2;

            const finishTurn = () => {
                if (game.isGameOver || game.activePlayer !== actor) return;
                this.isRunning = false;
                game.endTurn();
            };

            try {
                if (!actor || game.isGameOver || game.activePlayer !== actor) return;
                this.applySpeedSetting();
                if (!this.headless) await this.sleep(this.thinkMs);
                this.takeTurn('p2');
                if (!game.isGameOver && game.activePlayer === actor) {
                    if (!this.headless) await this.sleep(this.actMs);
                    finishTurn();
                }
            } catch (err) {
                console.error('[AI Turn Error]', err);
                finishTurn();
            } finally {
                this.isRunning = false;
            }
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    CardGameAI.isBlockedByFreeze = isBlockedByFreeze;
    root.CardGameAI = CardGameAI;
})(typeof window !== 'undefined' ? window : global);
