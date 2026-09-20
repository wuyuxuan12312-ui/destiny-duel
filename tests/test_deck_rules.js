/**
 * 组卡规则回归测试
 *
 * 覆盖 DeckBuilder 的卡组合规判定：
 *   张数=15 · 单卡同名<=2 · 传说<=2 · 史诗<=3
 *
 * 这几条以前只活在配卡界面的按钮里（saveDeck 只判张数），
 * 所以任何绕过 UI 的调用方都能把违规卡组写进存档。
 */
const path = require('path');
const assert = require('assert');

const projectRoot = path.resolve(__dirname, '..');
const { loadGameRuntime } = require(path.join(projectRoot, 'tools', 'load_runtime.js'));
loadGameRuntime({ silent: true });

console.log('===============================================================');
console.log('        组卡规则（传说<=2 / 史诗<=3 / 单卡<=2 / 严格15张）');
console.log('===============================================================\n');

let passed = 0;
let total = 0;
function check(name, fn) {
    total++;
    try {
        fn();
        passed++;
        console.log(`  ✅ ${name}`);
    } catch (err) {
        console.log(`  ❌ ${name}\n       ${err.message}`);
    }
}

const DB = global.CARD_DATABASE;
const DeckBuilder = global.DeckBuilder;

assert(DB && DB.length > 0, 'CARD_DATABASE 必须已加载');
assert(DeckBuilder, 'DeckBuilder 必须已加载（检查 tools/load_runtime.js 的 MODULES）');

// 按稀有度挑一批真实卡牌 id，避免依赖硬编码的具体卡
const byRarity = (r) => DB.filter(c => String(c.tier || c.rarity).toLowerCase() === r);
const legendaries = byRarity('legendary');
const epics = byRarity('epic');
const commons = byRarity('common');

console.log(`  卡库: 共 ${DB.length} 张 | 传说 ${legendaries.length} 史诗 ${epics.length} 普通 ${commons.length}\n`);

/** 用「每张卡最多一次」拼一个 15 张的合法底卡组 */
function legalBase() {
    const pool = commons.concat(byRarity('rare'));
    const out = [];
    for (const c of pool) {
        if (out.length >= 15) break;
        out.push(c.id);
    }
    return out;
}

// ---------------------------------------------------------------- 1
check('恰好 15 张的合规卡组通过', () => {
    const deck = legalBase();
    assert.strictEqual(deck.length, 15, '底卡组应能凑满 15 张');
    const v = DeckBuilder.validateDeckDetailed(deck);
    assert.strictEqual(v.valid, true, '应判定为合规，实际: ' + v.message);
    assert.strictEqual(DeckBuilder.validateDeck(deck), true, 'validateDeck 应返回 boolean true');
});

// ---------------------------------------------------------------- 2
check('张数不是 15 一律拒绝（14 张 / 16 张 / 非数组）', () => {
    const deck = legalBase();
    assert.strictEqual(DeckBuilder.validateDeck(deck.slice(0, 14)), false);
    assert.strictEqual(DeckBuilder.validateDeck(deck.concat([commons[0].id])), false);
    assert.strictEqual(DeckBuilder.validateDeck(null), false);
    assert.strictEqual(DeckBuilder.validateDeck('not-an-array'), false);
});

// ---------------------------------------------------------------- 3
check('单卡同名超过 2 张被拒绝', () => {
    const deck = legalBase();
    deck[1] = deck[0];
    deck[2] = deck[0];   // 同一张卡 ×3
    const v = DeckBuilder.validateDeckDetailed(deck);
    assert.strictEqual(v.valid, false, '3 张同卡应被拒绝');
    assert.ok(/上限为 2 张/.test(v.message), '错误信息应点名单卡上限，实际: ' + v.message);
});

// ---------------------------------------------------------------- 4
check('传说超过 2 张被拒绝，恰好 2 张通过', () => {
    assert.ok(legendaries.length >= 3, '卡库至少要有 3 张传说才能测出上限');

    const ok = legalBase();
    ok[0] = legendaries[0].id;
    ok[1] = legendaries[1].id;
    const vOk = DeckBuilder.validateDeckDetailed(ok);
    assert.strictEqual(vOk.valid, true, '2 张传说应通过，实际: ' + vOk.message);
    assert.strictEqual(vOk.legendary, 2, '传说计数应为 2');

    const bad = legalBase();
    bad[0] = legendaries[0].id;
    bad[1] = legendaries[1].id;
    bad[2] = legendaries[2].id;
    const vBad = DeckBuilder.validateDeckDetailed(bad);
    assert.strictEqual(vBad.valid, false, '3 张传说应被拒绝');
    assert.ok(/传说卡 3 张/.test(vBad.message), '错误信息应点名传说超额，实际: ' + vBad.message);
});

// ---------------------------------------------------------------- 5
check('史诗超过 3 张被拒绝，恰好 3 张通过', () => {
    assert.ok(epics.length >= 4, '卡库至少要有 4 张史诗才能测出上限');

    const ok = legalBase();
    ok[0] = epics[0].id; ok[1] = epics[1].id; ok[2] = epics[2].id;
    const vOk = DeckBuilder.validateDeckDetailed(ok);
    assert.strictEqual(vOk.valid, true, '3 张史诗应通过，实际: ' + vOk.message);
    assert.strictEqual(vOk.epic, 3, '史诗计数应为 3');

    const bad = legalBase();
    bad[0] = epics[0].id; bad[1] = epics[1].id; bad[2] = epics[2].id; bad[3] = epics[3].id;
    const vBad = DeckBuilder.validateDeckDetailed(bad);
    assert.strictEqual(vBad.valid, false, '4 张史诗应被拒绝');
    assert.ok(/史诗卡 4 张/.test(vBad.message), '错误信息应点名史诗超额，实际: ' + vBad.message);
});

// ---------------------------------------------------------------- 6
check('传说 + 史诗同时超额时先报传说', () => {
    const deck = legalBase();
    deck[0] = legendaries[0].id;
    deck[1] = legendaries[1].id;
    deck[2] = legendaries[2].id;
    deck[3] = epics[0].id; deck[4] = epics[1].id; deck[5] = epics[2].id; deck[6] = epics[3].id;
    const v = DeckBuilder.validateDeckDetailed(deck);
    assert.strictEqual(v.valid, false);
    assert.ok(/传说/.test(v.message), '应先报传说超额，实际: ' + v.message);
});

// ---------------------------------------------------------------- 7
check('传入卡牌对象而不是 id 也判定正确（防止 c.tier 静默取到 undefined）', () => {
    const deck = legalBase();
    deck[0] = legendaries[0].id;
    deck[1] = legendaries[1].id;
    deck[2] = legendaries[2].id;

    const asObjects = deck.map(id => DB.find(c => c.id === id));
    const v = DeckBuilder.validateDeckDetailed(asObjects);
    assert.strictEqual(v.valid, false, '对象形式同样应判定为传说超额');
    assert.strictEqual(v.legendary, 3, '对象形式下传说计数必须为 3（不能因取不到 tier 而算成 0）');
});

// ---------------------------------------------------------------- 8
check('无法识别的卡牌 id 被拒绝', () => {
    const deck = legalBase();
    deck[0] = 'definitely_not_a_real_card_id';
    const v = DeckBuilder.validateDeckDetailed(deck);
    assert.strictEqual(v.valid, false);
    assert.ok(/无法识别/.test(v.message), '应提示卡牌无法识别，实际: ' + v.message);
});

// ---------------------------------------------------------------- 9
check('canAddCard 能实时拦住超额的传说/史诗', () => {
    // 注意：canAddCard 的判定顺序是「卡组已满 -> 单卡上限 -> 稀有度配额」。
    // 卡组满员时会先报"卡组已满"，所以这里必须用一个**没满**的卡组来单独验证配额那一层。
    const partial = legalBase().slice(0, 13);
    partial[0] = legendaries[0].id;
    partial[1] = legendaries[1].id;

    const r = DeckBuilder.canAddCard(partial, legendaries[2]);
    assert.strictEqual(r.ok, false, '传说名额已满时应拒绝');
    assert.ok(/传说名额已满/.test(r.reason), '原因应说明传说名额，实际: ' + r.reason);

    assert.strictEqual(DeckBuilder.canAddCard(partial, commons[5]).ok, true, '普通卡不应被拦');

    // 满员时优先级更高的是"卡组已满"
    const full = legalBase();
    full[0] = legendaries[0].id;
    full[1] = legendaries[1].id;
    assert.strictEqual(DeckBuilder.canAddCard(full, commons[5]).ok, false, '满员应拒绝');
    assert.ok(/卡组已满/.test(DeckBuilder.canAddCard(full, commons[5]).reason), '满员应报卡组已满');
});

// ---------------------------------------------------------------- 10
check('saveDeck 拒绝违规卡组且不写存档', () => {
    const before = global.localStorage.getItem('destiny_duel_custom_deck_fire_warrior');
    const bad = legalBase();
    bad[0] = legendaries[0].id;
    bad[1] = legendaries[1].id;
    bad[2] = legendaries[2].id;

    const res = DeckBuilder.saveDeck('fire_warrior', bad);
    assert.strictEqual(res.success, false, '违规卡组不得保存成功');
    assert.ok(/传说/.test(res.message), '应返回传说超额原因，实际: ' + res.message);

    const after = global.localStorage.getItem('destiny_duel_custom_deck_fire_warrior');
    assert.strictEqual(after, before, 'saveDeck 失败时绝不能写 localStorage');
});

// ---------------------------------------------------------------- 11
check('saveDeck 接受合规卡组并持久化', () => {
    const good = legalBase();
    const res = DeckBuilder.saveDeck('iron_guardian', good);
    assert.strictEqual(res.success, true, '合规卡组应保存成功: ' + res.message);
    const raw = global.localStorage.getItem('destiny_duel_custom_deck_iron_guardian');
    assert.ok(raw, '应写入 localStorage');
    assert.deepStrictEqual(JSON.parse(raw), good);
});

// ---------------------------------------------------------------- 12
check('全部 5 套开局卡组都满足新规则', () => {
    const heroes = ['fire_warrior', 'iron_guardian', 'forest_mage', 'lightning_assassin', 'ice_mage'];
    heroes.forEach(hero => {
        const deck = DeckBuilder.getOpeningDeck(hero);
        assert.strictEqual(deck.length, 15, `${hero} 开局卡组应为 15 张，实际 ${deck.length}`);
        const v = DeckBuilder.validateDeckDetailed(deck);
        assert.strictEqual(v.valid, true, `${hero} 开局卡组不合规: ${v.message}`);
    });
});

// ---------------------------------------------------------------- 13
check('getDeck 遇到存量违规存档时回退到默认卡组', () => {
    const bad = legalBase();
    bad[0] = legendaries[0].id;
    bad[1] = legendaries[1].id;
    bad[2] = legendaries[2].id;
    global.localStorage.setItem('destiny_duel_custom_deck_ice_mage', JSON.stringify(bad));

    const loaded = DeckBuilder.getDeck('ice_mage');
    const v = DeckBuilder.validateDeckDetailed(loaded);
    assert.strictEqual(v.valid, true, '读出来的卡组必须合规（应回退到默认卡组）');
    assert.notDeepStrictEqual(loaded, bad, '不应把违规存档原样返回');
});

// ---------------------------------------------------------------- 14
check('每套默认卡组都有实际输出（不能全是防御/治疗）', () => {
    // 背景：iron_guardian 的默认卡组曾经是 15 张纯防御/治疗、伤害 0，
    // 打任何 Boss 都杀不死，只能靠"Boss 自己打死自己"偶然赢。
    // 这条断言就是防它再出现：默认卡组必须至少有一个能造成伤害的来源。
    const heroes = ['fire_warrior', 'iron_guardian', 'forest_mage', 'lightning_assassin', 'ice_mage'];
    const report = [];

    heroes.forEach(hero => {
        const deck = DeckBuilder.getOpeningDeck(hero);
        let direct = 0, dot = 0, reflect = 0;

        deck.forEach(id => {
            const c = DB.find(x => x.id === id);
            if (!c) return;
            const hits = Math.max(1, Number(c.hit_count) || 1);
            direct += (Number(c.damage) || 0) * hits;
            const st = String(c.status || '');
            if (/poison|burn/.test(st)) dot += 1;
            if (/thorns/.test(st)) reflect += 1;
        });

        report.push(`${hero}(直伤${direct}/持续${dot}/反弹${reflect})`);
        const hasOutput = direct > 0 || dot > 0 || reflect > 0;
        assert.ok(hasOutput, `${hero} 的默认卡组没有任何伤害来源（直伤${direct} 持续${dot} 反弹${reflect}），打不死任何 Boss`);
    });

    console.log('         ' + report.join('  '));
});

// ---------------------------------------------------------------- 15
// 说明：这里不写"直伤 >= 某个阈值"之类的启发式断言。
// 曾试着加过「直伤×2 >= 首关血量」，结果 iron_guardian（直伤 10 + 荆棘反弹）
// 实测 1-1 胜率 100%、1-3 50%，断言与实测直接矛盾 —— 拍脑袋阈值不如实测可靠。
// "英雄能不能打通关卡"由 test_pve_battle 的真实对局模拟负责，那才是权威。
// 本文件只守住结构性底线：卡组必须有伤害来源（见上一条）。

console.log(`\n===============================================================`);
if (passed === total) {
    console.log(`🎉 [PASS] 组卡规则测试全部 ${total} 项通过`);
    process.exit(0);
} else {
    console.log(`💥 [FAIL] ${passed}/${total} 通过，${total - passed} 项失败`);
    process.exit(1);
}
