// Online lockstep contract: two peers must end up with byte-identical decks from nothing but a
// seed + a small spec. The pre-fix payload shipped hand-picked card fields, which silently deleted
// every mechanic the Unity port added (hit_count, status, branches, reactions, levels).
const path = require('path');
const assert = require('assert');
const { loadGameRuntime } = require(path.join(__dirname, '..', 'tools', 'load_runtime.js'));

loadGameRuntime({ silent: true });

let passed = 0;
const failures = [];
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (err) { failures.push(name); console.log('  ✗ ' + name + '\n      ' + String(err.message).split('\n').join('\n      ')); }
}

const SEED = 20260919;
const IDS = ['base_twin_strike', 'base_twin_strike', 'pve_wild_swing', 'pve_combust', 'base_iron_wave', 'pve_metallicize'];

// uid is a local instance id (Math.random) and actions travel as hand indices, so it is not part
// of the lockstep contract and stays out of the comparison.
const strip = (deck) => deck.map(c => [c.id, c.level, c.hit_count, c.status, c.effect_type, c.damage,
    JSON.stringify(c.then_effects || []), JSON.stringify(c.reaction || {})].join('|'));

console.log('\n================================================================');
console.log('联机锁步：卡组同步契约');
console.log('================================================================');

test('同一 seed + 同一 spec 在两台机器上重建出完全相同的卡组（含顺序）', () => {
    const spec = { heroId: 'forest_mage', cardIds: IDS, levels: {} };
    IDS.forEach(id => assert.ok(global.CARD_BY_ID[id], `测试用的卡 id 不存在：${id}`));
    const a = global.createShuffledDeck(spec.heroId, spec.cardIds, global.createMatchRng(SEED), spec.levels);
    const b = global.createShuffledDeck(spec.heroId, spec.cardIds, global.createMatchRng(SEED), spec.levels);
    assert.strictEqual(a.length, IDS.length, '有 id 没能解析成卡，卡组被静默缩短');
    assert.deepStrictEqual(strip(a), strip(b), '两个 peer 的发牌结果不一致');
});

test('换 seed 必须真的换顺序，否则 seed 同步是假的', () => {
    const many = Array.from({ length: 12 }, (_, i) => IDS[i % IDS.length]);
    const s1 = global.createShuffledDeck('forest_mage', many, global.createMatchRng(1), {})
        .map(c => c.id).join(',');
    const s2 = global.createShuffledDeck('forest_mage', many, global.createMatchRng(999), {})
        .map(c => c.id).join(',');
    assert.notStrictEqual(s1, s2);
});

test('spec 只带 id 与等级，重建后机制字段与 effect 回调都还在', () => {
    const wire = JSON.parse(JSON.stringify({ heroId: 'forest_mage', cardIds: IDS, levels: { pve_wild_swing: 3 } }));
    const deck = global.createShuffledDeck(wire.heroId, wire.cardIds, global.createMatchRng(SEED), wire.levels);
    const wild = deck.find(c => c.id === 'pve_wild_swing');
    assert.ok(wild, '重建卡组里找不到 pve_wild_swing');
    assert.ok(Number(wild.hit_count) > 1, `多段字段丢失：hit_count=${wild.hit_count}`);
    assert.strictEqual(wild.level, 3, `发送方的等级没有应用到对手卡组上：${wild.level}`);
    assert.strictEqual(typeof wild.effect, 'function', 'effect 回调没了，CardSystem 会跳过这张牌的效果');
    for (const card of deck) {
        for (const field of ['effect_type', 'target', 'status', 'then_effects', 'else_effects', 'reaction']) {
            assert.ok(field in card, `${card.id} 缺少 ${field}`);
        }
    }
});

test('levels 为空对象时按 1 级处理，不会偷用本机的强化等级', () => {
    const base = global.CARD_BY_ID['pve_combust'];
    // Pretend this machine has everything upgraded: the opponent's deck must ignore that.
    global.DeckBuilder = { getCardLevel: () => 3 };
    try {
        const local = global.createShuffledDeck('forest_mage', ['pve_combust'], global.createMatchRng(SEED), null);
        assert.strictEqual(local[0].level, 3, '单人路径仍应读取本机强化等级');
        const deck = global.createShuffledDeck('forest_mage', ['pve_combust'], global.createMatchRng(SEED), {});
        assert.strictEqual(deck[0].level, 1, '空 levels 应当落在 1 级，而不是本机等级');
        assert.strictEqual(deck[0].damage, base.damage, '1 级卡面数值被本机强化污染');
    } finally {
        delete global.DeckBuilder;
    }
});

test('没有 cardIds 时回落到该英雄的配置卡池，两边仍然一致', () => {
    const build = () => global.createShuffledDeck('ice_mage', null, global.createMatchRng(SEED), {});
    assert.deepStrictEqual(strip(build()), strip(build()));
    assert.ok(build().length > 0, '配置卡池为空，回落路径不可用');
});

console.log('\n' + '='.repeat(64));
console.log(`联机同步测试：通过 ${passed}，失败 ${failures.length}`);
if (failures.length) process.exitCode = 1;
