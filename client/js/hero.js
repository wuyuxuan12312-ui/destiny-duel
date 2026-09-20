// Hero roster assembly. Visual + passive metadata lives in HeroManager (the only table the runtime
// reads); this file just enumerates the playable heroes from config/registry into HERO_DATABASE.
(function(root) {
    function buildHeroDatabase() {
        const db = {};

        // Discover all hero IDs dynamically from config and registries
        const discoveredKeys = new Set(['fire_warrior', 'iron_guardian', 'forest_mage', 'lightning_assassin']);
        for (const k of Object.keys((root.GAME_CONFIG && root.GAME_CONFIG.characters) ? root.GAME_CONFIG.characters : {})) {
            discoveredKeys.add(k);
        }
        if (root.HeroRegistry) {
            for (const item of root.HeroRegistry.list()) {
                if (item.characterId) discoveredKeys.add(item.characterId);
                if (item.id) discoveredKeys.add(item.id);
            }
        }

        discoveredKeys.forEach(cid => {
            // PVE bosses are registered as characters (enabled: false) so the battle engine can
            // read them, but they are not playable: without this gate every boss entered after a
            // fight showed up in the codex, in the hero picker, and as a random sparring rival.
            const def = ((root.GAME_CONFIG && root.GAME_CONFIG.characters) || {})[cid];
            if (def && def.enabled === false) return;
            db[cid] = root.HeroManager.createHeroInstance(cid);
        });

        // Legacy IDs are resolved by HeroManager.createHeroInstance, so they are deliberately not
        // published as extra roster entries: consumers enumerate Object.keys(HERO_DATABASE), and
        // three aliases meant a 3-in-8 chance of a mirror match and a codex of duplicate heroes.
        return db;
    }

    root.HERO_DATABASE = buildHeroDatabase();
    root.refreshHeroDatabase = function() {
        root.HERO_DATABASE = buildHeroDatabase();
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.HERO_DATABASE;
    }
})(typeof window !== 'undefined' ? window : global);
