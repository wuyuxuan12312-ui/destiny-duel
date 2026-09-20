// Gacha rules shared by the browser and the Node server.
//
// Having two implementations is what let them diverge: the server bucketed 稀有(rare) into the
// SR pool and 史诗(epic) into the SSR pool, and never read the 传说(legendary) rarity at all, so
// its "SSR" draws were actually epic cards. Both sides now call this file.
//
// Pity, ported and extended:
//   * Unity's real rule — the 10th card of a ten-pull is rolled on a boosted table if the first
//     nine produced nothing Rare-or-better. It guarantees R+, not SR as the design doc claimed.
//   * The new 80-pull hard pity and per-pull luck accumulation, which the doc described but the
//     Unity code never implemented.
(function(root) {
    const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
    const DISPLAY = { common: 'N', rare: 'R', epic: 'SR', legendary: 'SSR' };

    function config() {
        return (root.GAME_CONFIG && root.GAME_CONFIG.gachaPity) || {
            singleCostGold: 100,
            tenPullCostGold: 900,
            rates: { common: 0.70, rare: 0.22, epic: 0.06, legendary: 0.02 },
            tenPullGuaranteeRarity: 'rare',
            tenPullGuaranteeSlots: { rare: 0.70, epic: 0.23, legendary: 0.07 },
            hardPityCounter: 80,
            luckPerPull: 1,
            luckSoftPityStart: 60,
            luckSoftPityStep: 0.015,
            duplicateGoldPvp: 40,
            duplicateGoldMaxLevel: 60
        };
    }

    function freshPityState() {
        return { sinceSSR: 0, luck: 0, totalPulls: 0 };
    }

    function normalizeRarity(raw) {
        const value = String(raw || 'common').trim().toLowerCase();
        if (RARITY_ORDER.indexOf(value) !== -1) return value;
        const alias = { n: 'common', r: 'rare', sr: 'epic', ssr: 'legendary',
                        common: 'common', rare: 'rare', epic: 'epic', legendary: 'legendary' };
        return alias[value] || 'common';
    }

    /**
     * Roll one rarity. `pity` is mutated in place so a ten-pull carries its counter forward.
     * Soft pity raises the SSR chance from luckSoftPityStart onward; the hard counter forces it.
     */
    function rollRarity(pity, rng, cfg) {
        const conf = cfg || config();
        pity.sinceSSR = Number(pity.sinceSSR) || 0;
        pity.luck = Number(pity.luck) || 0;
        pity.totalPulls = (Number(pity.totalPulls) || 0) + 1;

        // The counter reads "pulls since the last SSR". Comparing against counter-1 makes the
        // hard pity land *on* pull #80 rather than #81, which is the advertised promise.
        if (pity.sinceSSR >= conf.hardPityCounter - 1) {
            pity.sinceSSR = 0;
            pity.luck = 0;
            return 'legendary';
        }

        const base = Object.assign({}, conf.rates);
        let ssrChance = base.legendary;
        if (pity.sinceSSR >= conf.luckSoftPityStart) {
            ssrChance += (pity.sinceSSR - conf.luckSoftPityStart + 1) * conf.luckSoftPityStep;
        }
        ssrChance += (pity.luck * (conf.luckPerPull || 0)) / 1000;
        ssrChance = Math.min(0.99, Math.max(0, ssrChance));

        const rest = 1 - ssrChance;
        const weightSum = base.common + base.rare + base.epic;
        const roll = rng();

        let rarity;
        if (roll < ssrChance) rarity = 'legendary';
        else {
            const scaled = (roll - ssrChance) / rest;
            if (scaled < base.epic / weightSum) rarity = 'epic';
            else if (scaled < (base.epic + base.rare) / weightSum) rarity = 'rare';
            else rarity = 'common';
        }

        if (rarity === 'legendary') {
            pity.sinceSSR = 0;
            pity.luck = 0;
        } else {
            pity.sinceSSR += 1;
            pity.luck = (pity.luck || 0) + (conf.luckPerPull || 0);
        }
        return rarity;
    }

    /**
     * Roll a whole batch. When `count` is a multiple of ten, each group of ten guarantees at
     * least one Rare-or-better on its last slot (rolled on the boosted tenPullGuaranteeSlots table).
     */
    function rollBatch(pity, count, rng, cfg) {
        const conf = cfg || config();
        const rarities = [];
        let sinceGroupStart = 0;
        let groupHitRare = false;
        const groupSize = 10;
        for (let i = 0; i < count; i++) {
            const isGroupLast = (sinceGroupStart + 1) === groupSize;
            let rarity;
            if (isGroupLast && !groupHitRare) {
                rarity = rollGuaranteed(rng, conf);
            } else {
                rarity = rollRarity(pity, rng, conf);
            }
            rarities.push(rarity);
            sinceGroupStart = isGroupLast ? 0 : sinceGroupStart + 1;
            groupHitRare = isGroupLast ? false : (groupHitRare || RARITY_ORDER.indexOf(rarity) >= 1);
        }
        return rarities;
    }

    function rollGuaranteed(rng, conf) {
        const table = conf.tenPullGuaranteeSlots || { rare: 0.70, epic: 0.23, legendary: 0.07 };
        const roll = rng();
        if (roll < table.legendary) return 'legendary';
        if (roll < table.legendary + table.epic) return 'epic';
        return 'rare';
    }

    /**
     * Bucket a card pool by rarity. Explicitly maps the internal rarity names so an epic card can
     * never be handed out as an SSR again.
     */
    function bucketByRarity(cards) {
        const buckets = { common: [], rare: [], epic: [], legendary: [] };
        for (const card of cards) {
            if (card.enabled === 0 || card.enabled === false) continue;
            buckets[normalizeRarity(card.rarity)].push(card);
        }
        return buckets;
    }

    /**
     * Pick a card of the rolled rarity. Empty buckets fall back to the nearest lower rarity
     * rather than to the whole pool, which is what let a Common be handed out for an SSR roll.
     */
    function pickCard(buckets, rarity, rng, poolFilter) {
        const order = RARITY_ORDER.slice(RARITY_ORDER.indexOf(rarity));
        const pools = [buckets[rarity]].concat(order.slice(1).map(r => buckets[r]));
        // Prefer the rolled rarity, then anything rarer, then anything at all.
        const candidates = [];
        for (const pool of pools) {
            if (pool && pool.length) { candidates.push(pool); break; }
        }
        if (!candidates.length) candidates.push(order.map(r => buckets[r]).find(p => p && p.length) || []);
        let list = candidates[0] || [];
        if (poolFilter) {
            const filtered = list.filter(poolFilter);
            if (filtered.length) list = filtered;
        }
        if (!list.length) return null;
        return list[Math.floor(rng() * list.length)];
    }

    /**
     * What a duplicate converts into. PVE-pool duplicates level the card up for free (that is the
     * upgrade route); PVP duplicates refund gold. A maxed PVE card falls back to a refund.
     */
    function duplicateOutcome(card, currentLevel, cfg) {
        const conf = cfg || config();
        const pool = String(card.pool_type || card.poolType || 'Base');
        const upgradeable = Boolean(card.upgradeable) && pool === 'PVE';
        const level = Number(currentLevel) || 1;
        if (upgradeable && level < 3) {
            return { type: 'level', newLevel: level + 1, gold: 0 };
        }
        return {
            type: 'gold',
            gold: upgradeable ? conf.duplicateGoldMaxLevel : conf.duplicateGoldPvp,
            newLevel: level
        };
    }

    const GachaSystem = {
        RARITY_ORDER, DISPLAY, config, freshPityState, normalizeRarity,
        rollRarity, rollBatch, rollGuaranteed, bucketByRarity, pickCard, duplicateOutcome
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = GachaSystem;
    root.GachaSystem = GachaSystem;
})(typeof window !== 'undefined' ? window : global);
