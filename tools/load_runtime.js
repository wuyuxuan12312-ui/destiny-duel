// Shared headless loader: evaluates the browser runtime modules in the exact global-script
// order index.html uses, so anything run under Node sees the same wiring as the browser.
// The project ships no bundler and no module system — load order is load-bearing.
const fs = require('fs');
const path = require('path');

// client/ is the single source of truth for code; root keeps data/ (generator output) and
// assets/ (what the static server actually serves).
const CLIENT_DIR = path.join(__dirname, '..', 'client');

const MODULES = [
    'data/game_config.js',
    'src/core/EventBus.js',
    'src/core/Registry.js',
    'src/core/GameState.js',
    'src/core/PlayerCardInstance.js',
    'src/core/MathUtil.js',
    'src/systems/StatusSystem.js',
    'src/systems/DamageCalculator.js',
    'src/systems/CardEffectEngine.js',
    'src/systems/EffectResolver.js',
    'src/systems/HeroManager.js',
    'src/systems/CardSystem.js',
    'src/systems/TurnSystem.js',
    'src/systems/CombatSystem.js',
    'src/systems/SkillSystem.js',
    'src/systems/PveSystem.js',
    'js/hero.js',
    'js/card.js',
    'js/ai.js',
    'js/gacha.js',
    // deck_builder 是个纯逻辑模块（DOM 访问都有 null 守卫），index.html 里也加载它。
    // 之前漏在这里，导致卡组规则在 headless 测试里根本够不着。
    'js/deck_builder.js',
    'js/game.js',
];

function stubAudio() {
    const noop = () => {};
    return new Proxy({ init: noop, unlock: noop }, { get: (t, k) => (k in t ? t[k] : noop) });
}

/**
 * @param {Object} options.silent suppress the per-module log
 * @returns {string[]} the module paths that were evaluated
 */
function loadGameRuntime(options = {}) {
    if (options.stubGlobals !== false) {
        global.window = global;
        global.root = global;
        if (!global.soundManager) global.soundManager = stubAudio();
        if (!global.document) global.document = { addEventListener: () => {}, getElementById: () => null, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {} }) };
        if (!global.localStorage) {
            const store = new Map();
            global.localStorage = {
                getItem: k => (store.has(k) ? store.get(k) : null),
                setItem: (k, v) => store.set(k, String(v)),
                removeItem: k => store.delete(k)
            };
        }
        if (!global.location) global.location = { href: 'http://localhost/', origin: 'http://localhost' };
        if (!global.fetch) global.fetch = () => Promise.reject(new Error('fetch disabled in headless mode'));
    }

    const loaded = [];
    for (const rel of MODULES) {
        const file = path.join(CLIENT_DIR, rel);
        if (!fs.existsSync(file)) {
            if (rel === 'src/systems/PveSystem.js') continue;  // optional until the PVE port lands
            throw new Error('Runtime module missing: ' + rel);
        }
        const code = fs.readFileSync(file, 'utf8');
        try {
            eval(code);
        } catch (err) {
            throw new Error(`Failed to evaluate ${rel}: ${err.message}`);
        }
        loaded.push(rel);
        if (!options.silent) console.log('  loaded ' + rel);
    }
    return loaded;
}

module.exports = { loadGameRuntime, MODULES, CLIENT_DIR };
