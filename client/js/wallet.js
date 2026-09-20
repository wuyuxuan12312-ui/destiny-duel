// Player wallet, owned-card collection and PVE card levels.
//
// Gold and the collection used to live in localStorage only, and every consumer read a different
// key, so a player's gold could disagree between the gacha screen and the deck builder. The server
// now owns the numbers (see /api/player/wallet) and this module keeps a local mirror so the UI
// still works offline and on file://.
(function(root) {
    const GOLD_KEY = 'destiny_duel_player_gold';
    const GEMS_KEY = 'destiny_duel_player_gems';
    const LEVELS_KEY = 'destiny_duel_card_levels';
    const COLLECTION_KEY = 'destiny_duel_user_collection';
    const PITY_KEY = 'destiny_duel_gacha_pity';
    const ACCOUNT_KEY = 'destiny_duel_account_id';

    function readJson(key, fallback) {
        if (!root.localStorage) return fallback;
        try {
            const raw = root.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (err) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        if (root.localStorage) root.localStorage.setItem(key, JSON.stringify(value));
    }

    class Wallet {
        static getUserId() {
            if (!root.localStorage) return 'player_local';
            let id = root.localStorage.getItem(ACCOUNT_KEY);
            if (!id) {
                id = 'u_' + Math.random().toString(36).slice(2, 10);
                root.localStorage.setItem(ACCOUNT_KEY, id);
            }
            return id;
        }

        static getGold() {
            const stored = root.localStorage ? root.localStorage.getItem(GOLD_KEY) : null;
            const value = Number(stored);
            return Number.isFinite(value) && stored !== null ? value : 2000;
        }

        static getGems() {
            const stored = root.localStorage ? root.localStorage.getItem(GEMS_KEY) : null;
            const value = Number(stored);
            return Number.isFinite(value) && stored !== null ? value : 100;
        }

        static setGold(gold) {
            if (root.localStorage) root.localStorage.setItem(GOLD_KEY, String(Math.max(0, Math.round(gold))));
            Wallet.refreshHud();
        }

        static setGems(gems) {
            if (root.localStorage) root.localStorage.setItem(GEMS_KEY, String(Math.max(0, Math.round(gems))));
        }

        /** Apply a delta locally and push it to the server, which stays the authority. */
        static credit(deltaGold, deltaGems) {
            if (deltaGold) Wallet.setGold(Wallet.getGold() + deltaGold);
            if (deltaGems) Wallet.setGems(Wallet.getGems() + deltaGems);
            return Wallet.pushDelta(deltaGold || 0, deltaGems || 0);
        }

        static pushDelta(deltaGold, deltaGems) {
            if (typeof root.fetch !== 'function') return Promise.resolve(null);
            return root.fetch('/api/player/wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: Wallet.getUserId(), deltaGold, deltaGems })
            }).then(r => (r.ok ? r.json() : null)).then(Wallet.applyServer).catch(() => null);
        }

        /**
         * Server values win whenever the server answered; the local mirror is only a cache. The
         * local copy seeded the whole economy before, which is why gold never survived a reload.
         */
        static applyServer(payload) {
            if (!payload || typeof payload.gold !== 'number') return payload;
            Wallet.setGold(payload.gold);
            Wallet.setGems(payload.gems);
            writeJson(PITY_KEY, {
                sinceSSR: payload.pity_since_ssr,
                luck: payload.pity_luck,
                totalPulls: payload.total_pulls
            });
            return payload;
        }

        static getPity() {
            const state = readJson(PITY_KEY, null);
            return state || { sinceSSR: 0, luck: 0, totalPulls: 0 };
        }

        static setPity(pity) {
            writeJson(PITY_KEY, pity || { sinceSSR: 0, luck: 0, totalPulls: 0 });
        }

        /** Pull the authoritative wallet (and therefore the pity counters) from the backend. */
        static syncFromServer() {
            if (typeof root.fetch !== 'function') return Promise.resolve(null);
            return root.fetch(`/api/player/wallet?userId=${encodeURIComponent(Wallet.getUserId())}`)
                .then(r => (r.ok ? r.json() : null))
                .then(payload => {
                    if (payload) Wallet.applyServer(payload);
                    return payload;
                })
                .catch(() => null);
        }

        static getCollection() {
            return readJson(COLLECTION_KEY, {});
        }

        static countOf(cardId) {
            return Number(Wallet.getCollection()[cardId] || 0);
        }

        static owns(cardId) {
            return Wallet.countOf(cardId) > 0;
        }

        static grant(cardId, count) {
            if (!cardId) return;
            const collection = Wallet.getCollection();
            collection[cardId] = Number(collection[cardId] || 0) + (count || 1);
            writeJson(COLLECTION_KEY, collection);
        }

        static grantMany(entries) {
            (entries || []).forEach(entry => Wallet.grant(entry.cardId || entry.card?.id, entry.count || 1));
        }

        static getLevels() {
            return readJson(LEVELS_KEY, {});
        }

        static getCardLevel(cardId) {
            return Math.max(1, Math.min(3, Number(Wallet.getLevels()[cardId]) || 1));
        }

        static setCardLevel(cardId, level) {
            const levels = Wallet.getLevels();
            levels[cardId] = Math.max(1, Math.min(3, Number(level) || 1));
            writeJson(LEVELS_KEY, levels);
        }

        /** Seed a brand-new player with their heroes' opening decks so the codex is not empty. */
        static seedStarterCollection() {
            const collection = Wallet.getCollection();
            if (Object.keys(collection).length > 0) return;
            const pools = (root.GAME_CONFIG && root.GAME_CONFIG.cardPools) || [];
            pools.forEach(entry => Wallet.grant(entry.cardId, entry.count || 1));
        }

        static refreshHud() {
            const gold = Wallet.getGold();
            const gems = Wallet.getGems();
            const goldNodes = root.document && root.document.querySelectorAll
                ? root.document.querySelectorAll('[data-wallet-gold]') : [];
            goldNodes.forEach(node => { node.textContent = gold.toLocaleString(); });
            const gemNodes = root.document && root.document.querySelectorAll
                ? root.document.querySelectorAll('[data-wallet-gems]') : [];
            gemNodes.forEach(node => { node.textContent = gems.toLocaleString(); });
        }
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = Wallet;
    root.Wallet = Wallet;
})(typeof window !== 'undefined' ? window : global);
