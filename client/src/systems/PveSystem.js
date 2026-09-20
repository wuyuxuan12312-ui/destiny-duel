// PVE chapter progression ported from Unity's PVEStageDatabase + BattleSessionContext.
//
// Structural differences from the original that are deliberate:
//   * Stage data is data-driven (GAME_CONFIG.pveStages, generated from the workbook) instead of
//     hard-coded in InitializeDefaultStages(), so adding chapter 2 is an Excel edit.
//   * Boss decks are expanded into real 15-card decks that obey the deck rules Unity's own stage
//     data broke (it dealt 5 copies of one card and put a PVP-pool card into a PVE fight).
//   * The enemy is registered as a temporary hero definition so the existing hero/passive/skill
//     plumbing drives it, rather than forking a second combatant type.
(function(root) {
    const PROGRESS_KEY = 'destiny_duel_pve_progress';
    const ACCOUNT_KEY = 'destiny_duel_account_id';

    class PveSystem {
        static getStages() {
            const stages = (root.GAME_CONFIG && root.GAME_CONFIG.pveStages) || [];
            return stages.slice().sort((a, b) => a.stageId - b.stageId);
        }

        static getStage(stageId) {
            return PveSystem.getStages().find(s => s.stageId === Number(stageId)) || null;
        }

        static maxStageId() {
            const stages = PveSystem.getStages();
            return stages.length ? stages[stages.length - 1].stageId : 0;
        }

        static getUserId() {
            if (!root.localStorage) return 'player_local';
            let id = root.localStorage.getItem(ACCOUNT_KEY);
            if (!id) {
                id = 'u_' + Math.random().toString(36).slice(2, 10);
                root.localStorage.setItem(ACCOUNT_KEY, id);
            }
            return id;
        }

        /**
         * Progress record. `cleared` holds the highest stage beaten, `rewards` records which
         * first-clear payouts have already been collected so a replay cannot re-collect them.
         */
        static loadProgress() {
            const empty = { cleared: 0, highest: 1, wins: {}, collectedRewards: [], updatedAt: 0 };
            if (!root.localStorage) return empty;
            try {
                const raw = root.localStorage.getItem(PROGRESS_KEY);
                if (!raw) return empty;
                return Object.assign(empty, JSON.parse(raw));
            } catch (err) {
                console.warn('[PveSystem] 进度存档损坏，已重置', err);
                return empty;
            }
        }

        static saveProgress(progress) {
            if (!root.localStorage) return progress;
            progress.updatedAt = Date.now();
            root.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
            return progress;
        }

        static applyServerProgress(payload) {
            if (!payload) return PveSystem.loadProgress();
            const local = PveSystem.loadProgress();
            const merged = {
                cleared: Math.max(local.cleared, Number(payload.clearedStage || 0)),
                highest: Math.max(local.highest, Number(payload.highestStage || 1)),
                wins: Object.assign({}, local.wins, payload.wins || {}),
                collectedRewards: Array.from(new Set((local.collectedRewards || [])
                    .concat(payload.collectedRewards || []))),
                updatedAt: Number(payload.updatedAt) || local.updatedAt
            };
            return PveSystem.saveProgress(merged);
        }

        /** Unity's rule: stage 1 is always open, later stages need progress >= stageId. */
        static isUnlocked(stageId, progress) {
            const id = Number(stageId);
            const record = progress || PveSystem.loadProgress();
            return id <= 1 || record.highest >= id;
        }

        static isCleared(stageId, progress) {
            const record = progress || PveSystem.loadProgress();
            return record.cleared >= Number(stageId);
        }

        static starsFor(stage, progress) {
            const record = progress || PveSystem.loadProgress();
            const id = Number(stage.stageId);
            if (record.cleared < id) return 0;
            const wins = Number((record.wins || {})[id] || 0);
            return wins >= 3 ? 3 : (wins >= 1 ? 2 : 1);
        }

        /**
         * Register the stage boss as a hero definition so HeroManager can drive it.
         * Recommended power and the display name stay cosmetic; maxHp is the real lever.
         */
        static ensureEnemyDefined(stage) {
            if (!root.GAME_CONFIG) return null;
            const enemyId = PveSystem.enemyId(stage);
            root.GAME_CONFIG.characters = root.GAME_CONFIG.characters || {};
            const hp = Number(stage.enemyMaxHp) || 80;
            // Bosses scale their free attack with the stage so later fights pressure the
            // player even when their deck is defensively stacked.
            const attack = 3 + Math.min(4, Math.max(0, Number(stage.stageId) - 1));
            const existing = root.GAME_CONFIG.characters[enemyId];
            if (existing) {
                // The workbook is the source of truth: an editor changing a stage's HP must take
                // effect without a page reload, so re-sync rather than keeping the cached entry.
                existing.maxHp = hp;
                existing.baseAttack = attack;
                existing.characterName = stage.enemyName || existing.characterName;
                return enemyId;
            }
            root.GAME_CONFIG.characters[enemyId] = {
                characterId: enemyId,
                characterName: stage.enemyName || `关卡 ${stage.stageCode}`,
                role: 'PVE 首领',
                maxHp: hp,
                baseAttack: attack,
                startingEnergy: 4,
                maxEnergy: 10,
                passiveId: 'pve_boss_no_passive',
                skillId: 'pve_boss_no_skill',
                damageBonus: 0,
                healBonus: 0,
                shieldBonus: 0,
                modifiers: { damageBonus: 0, healBonus: 0, shieldBonus: 0 },
                description: stage.description || '',
                enabled: false
            };
            root.GAME_CONFIG.skills = root.GAME_CONFIG.skills || {};
            root.GAME_CONFIG.skills['pve_boss_no_skill'] = {
                skillId: 'pve_boss_no_skill',
                characterId: enemyId,
                skillName: '首领威压',
                skillType: 'none',
                cost: 99,
                cooldown: 0,
                damage: 0, heal: 0, shield: 0, duration: 0,
                effects: [],
                description: '首领不使用英雄技能。'
            };
            if (root.refreshHeroDatabase) root.refreshHeroDatabase();
            if (root.Registries && root.Registries.loadFromConfig) {
                root.Registries.loadFromConfig(root.GAME_CONFIG);
            }
            return enemyId;
        }

        static enemyId(stage) {
            return `pve_boss_${stage.stageId}`;
        }

        /** Expand `base_strike*2` style entries into a flat 15-card id list. */
        static enemyDeckCardIds(stage) {
            const ids = [];
            (stage.enemyDeck || []).forEach(entry => {
                const id = typeof entry === 'string' ? entry : entry.cardId;
                const count = typeof entry === 'string' ? 1 : Number(entry.count || 1);
                for (let i = 0; i < count; i++) ids.push(id);
            });
            return ids;
        }

        /**
         * Sanity report used by the boot check and the admin panel: the deck must be 15 cards,
         * no more than 2 copies, and free of PVP-only cards inside a PVE battle.
         */
        static validateStage(stage) {
            const problems = [];
            const ids = PveSystem.enemyDeckCardIds(stage);
            if (ids.length !== 15) problems.push(`首领卡组 ${ids.length} 张（应为 15）`);
            const counts = {};
            ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
            Object.keys(counts).forEach(id => {
                if (counts[id] > 2) problems.push(`${id} 出现 ${counts[id]} 份（上限 2）`);
            });
            const byId = root.CARD_BY_ID || {};
            ids.forEach(id => {
                const card = byId[id];
                if (!card) problems.push(`引用了不存在的卡牌 ${id}`);
                else if (card.pool_type === 'PVP') problems.push(`PVE 战使用了 PVP 池卡牌 ${id}`);
            });
            if (stage.firstClearRewardCardId && !byId[stage.firstClearRewardCardId]) {
                problems.push(`首通奖励卡 ${stage.firstClearRewardCardId} 不存在`);
            }
            return problems;
        }

        /**
         * Kick off a PVE battle: returns a configured CardGame plus the stage for the UI.
         */
        static startBattle(game, playerHeroId, stage, seed, playerDeckCardIds) {
            const enemyId = PveSystem.ensureEnemyDefined(stage);
            const deck = PveSystem.enemyDeckCardIds(stage);
            if (typeof game.initPveMatch !== 'function') {
                throw new Error('[PveSystem] CardGame.initPveMatch 不可用，无法开始章节讨伐');
            }
            game.initPveMatch(playerHeroId, enemyId, deck, seed, playerDeckCardIds);
            return game;
        }

        /**
         * Settle rewards, mirroring PVEStageDatabase.CompleteStage: first clear pays gold + gems +
         * a card and advances the unlock cursor; replays pay repeat gold only.
         */
        static settleVictory(stage, options) {
            const opts = options || {};
            const progress = PveSystem.loadProgress();
            const id = Number(stage.stageId);
            const alreadyCollected = (progress.collectedRewards || []).indexOf(id) !== -1;
            const isFirstClear = !alreadyCollected && progress.cleared < id;

            const gold = isFirstClear ? Number(stage.firstClearRewardGold) || 0
                : Number(stage.repeatRewardGold) || 0;
            const gems = isFirstClear ? Number(stage.firstClearRewardGems) || 0 : 0;
            const rewardCardId = isFirstClear ? (stage.firstClearRewardCardId || '') : '';

            if (isFirstClear) {
                progress.collectedRewards = (progress.collectedRewards || []).concat([id]);
                progress.cleared = Math.max(progress.cleared, id);
                progress.highest = Math.max(progress.highest, id + 1);
            }
            progress.wins = progress.wins || {};
            progress.wins[id] = Number(progress.wins[id] || 0) + 1;
            PveSystem.saveProgress(progress);

            if (typeof opts.onCurrency === 'function') {
                opts.onCurrency({ gold, gems, unlockedCardId: rewardCardId });
            }
            return {
                stageId: id,
                isFirstClear,
                gold,
                gems,
                unlockedCardId: rewardCardId,
                nextStageId: id + 1,
                hasNextStage: PveSystem.maxStageId() > id,
                progress
            };
        }

        /**
         * Push progress to the REST backend when it is reachable. Local state stays authoritative
         * so the game keeps working offline and the file:// path is unaffected.
         */
        static syncToServer() {
            if (typeof root.fetch !== 'function') return Promise.resolve(null);
            const progress = PveSystem.loadProgress();
            return root.fetch(`/api/pve/progress?userId=${encodeURIComponent(PveSystem.getUserId())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(progress)
            }).then(r => r.ok ? r.json() : null).catch(() => null);
        }

        static loadFromServer() {
            if (typeof root.fetch !== 'function') return Promise.resolve(null);
            return root.fetch(`/api/pve/progress?userId=${encodeURIComponent(PveSystem.getUserId())}`)
                .then(r => (r.ok ? r.json() : null))
                .then(payload => (payload ? PveSystem.applyServerProgress(payload) : PveSystem.loadProgress()))
                .catch(() => PveSystem.loadProgress());
        }
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = PveSystem;
    root.PveSystem = PveSystem;
})(typeof window !== 'undefined' ? window : global);
