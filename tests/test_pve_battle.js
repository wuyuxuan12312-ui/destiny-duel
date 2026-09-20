// End-to-end PVE validation: every stage must build a legal battle, the reward loop must pay
// exactly once per first clear, and — the part a unit test cannot tell you — the stages must
// actually be beatable and get harder.
const path = require('path');
const assert = require('assert');
const { loadGameRuntime } = require(path.join(__dirname, '..', 'tools', 'load_runtime.js'));

loadGameRuntime({ silent: true });

let passed = 0;
const failures = [];
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (err) { failures.push({ name, err }); console.log('  ✗ ' + name + '\n      ' + String(err.message).split('\n').join('\n      ')); }
}

const stages = global.PveSystem.getStages();

/** Play one full battle with the AI driving both sides. */
function runBattle(seed, stage, heroId, gearedDeck) {
    const game = new global.CardGame();
    global.PveSystem.startBattle(game, heroId, stage, seed);
    if (gearedDeck) {
        game.p1.deck = global.createShuffledDeck(null, gearedDeck, () => game.random())
            .map(c => (c.upgradeable ? global.getCardScaledStats(global.CARD_BY_ID[c.id], 3) : c));
        game.p1.hand = [];
        for (let i = 0; i < 4; i++) game.drawCard(game.p1, false);
    }
    const ai = new global.CardGameAI(game, null);
    let guard = 0;
    while (!game.isGameOver && guard++ < 800) {
        const actor = game.activePlayer;
        ai.takeTurn(actor === game.p1 ? 'p1' : 'p2');
        if (game.isGameOver) break;
        if (game.activePlayer === actor) game.endTurn(true);
    }
    return {
        game,
        steps: guard,
        rounds: Math.ceil(game.turnCount / 2),
        playerWon: game.p1.hp > 0 && game.p2.hp <= 0
    };
}

/** Win rate of a fixed policy over N seeds, so difficulty is measured rather than eyeballed. */
function winRate(stage, heroId, seeds, gearedDeck) {
    let wins = 0;
    for (const seed of seeds) {
        try { if (runBattle(seed, stage, heroId, gearedDeck).playerWon) wins++; }
        catch (err) { throw new Error(`关卡 ${stage.stageCode} 在 seed ${seed} 崩溃：${err.message}`); }
    }
    return wins / seeds.length;
}

const SEEDS = [11, 27, 53, 88, 101, 234, 512, 777, 991, 1337, 2048, 4242];
const HERO_IDS = Object.keys(global.GAME_CONFIG.characters)
    .filter(id => global.GAME_CONFIG.characters[id].enabled !== false);
// A chapter-reward shaped deck: PVE-pool cards pulled from gacha, all pushed to Lv.3.
const GEARED = ['pve_immortal_loop', 'pve_immortal_loop', 'pve_bludgeon', 'pve_bludgeon',
    'pve_spark_sigil', 'pve_spark_sigil', 'base_fireball', 'base_fireball', 'base_heavy_strike',
    'base_heavy_strike', 'pve_apotheosis', 'pve_apotheosis', 'pve_iron_bark', 'pve_iron_bark',
    'pve_reaper'];

console.log('\n== 1. 关卡数据合法性 ==');
test('章节共 4 关，首领生命符合标定曲线', () => {
    assert.strictEqual(stages.length, 4, `关卡数应为 4，实际 ${stages.length}`);
    assert.deepStrictEqual(stages.map(s => s.enemyMaxHp), [120, 150, 208, 198]);
});
test('每关首领卡组通过全部构筑规则校验', () => {
    for (const stage of stages) {
        const problems = global.PveSystem.validateStage(stage);
        assert.deepStrictEqual(problems, [], `${stage.stageCode} 不合法：${problems.join('; ')}`);
    }
});
test('首领卡组不含荆棘与斩杀类卡（它们会让个别英雄变成必败）', () => {
    const banned = ['base_iron_bastion', 'pve_juggernaut', 'pve_thorn_mail', 'base_execute_judgment'];
    for (const stage of stages) {
        const ids = global.PveSystem.enemyDeckCardIds(stage);
        const hits = ids.filter(id => banned.includes(id));
        assert.deepStrictEqual(hits, [], `${stage.stageCode} 使用了 ${hits.join(',')}`);
    }
});
test('每关都能注册首领英雄，改血量后无需重载即生效', () => {
    const stage = global.PveSystem.getStage(2);
    global.PveSystem.ensureEnemyDefined(stage);
    assert.strictEqual(global.HeroManager.createHeroInstance('pve_boss_2').hp, 150);
    stage.enemyMaxHp = 171;
    global.PveSystem.ensureEnemyDefined(stage);
    assert.strictEqual(global.HeroManager.createHeroInstance('pve_boss_2').hp, 171,
        '首领定义被缓存后血量必须跟着数值表更新');
    stage.enemyMaxHp = 150;
    global.PveSystem.ensureEnemyDefined(stage);
});

console.log('\n== 2. 解锁推进 ==');
test('只有第 1 关默认开放', () => {
    global.PveSystem.saveProgress({ cleared: 0, highest: 1, wins: {}, collectedRewards: [] });
    assert.strictEqual(global.PveSystem.isUnlocked(1), true);
    assert.strictEqual(global.PveSystem.isUnlocked(2), false);
    assert.strictEqual(global.PveSystem.isUnlocked(4), false);
});
test('通关后解锁下一关，且不可跳关', () => {
    global.PveSystem.settleVictory(global.PveSystem.getStage(1), {});
    assert.strictEqual(global.PveSystem.isUnlocked(2), true);
    assert.strictEqual(global.PveSystem.isUnlocked(3), false, '通关第 1 关不该开放第 3 关');
});

console.log('\n== 3. 奖励只能领一次 ==');
test('首通给 200 金 + 20 宝石 + 奖励卡，重复通关只给 50 金', () => {
    global.PveSystem.saveProgress({ cleared: 0, highest: 1, wins: {}, collectedRewards: [] });
    const stage1 = global.PveSystem.getStage(1);
    const wallet = { gold: 0, gems: 0, unlocked: [] };
    const onCurrency = c => { wallet.gold += c.gold; wallet.gems += c.gems; if (c.unlockedCardId) wallet.unlocked.push(c.unlockedCardId); };

    const first = global.PveSystem.settleVictory(stage1, { onCurrency });
    assert.strictEqual(first.isFirstClear, true);
    assert.strictEqual(first.gold, 200);
    assert.strictEqual(first.gems, 20);
    assert.strictEqual(first.unlockedCardId, 'base_strike');

    const replay = global.PveSystem.settleVictory(stage1, { onCurrency });
    assert.strictEqual(replay.isFirstClear, false, '第二次通关不能再算首通');
    assert.strictEqual(replay.gold, 50);
    assert.strictEqual(replay.gems, 0);
    assert.strictEqual(replay.unlockedCardId, '');
    assert.strictEqual(wallet.gold, 250);
    assert.strictEqual(wallet.gems, 20);
});
test('全章首通合计产出 2000 金 + 200 宝石，正好 20 次单抽', () => {
    global.PveSystem.saveProgress({ cleared: 0, highest: 1, wins: {}, collectedRewards: [] });
    let gold = 0, gems = 0;
    stages.forEach(s => {
        const r = global.PveSystem.settleVictory(s, { onCurrency: c => { gold += c.gold; gems += c.gems; } });
        assert.ok(r.isFirstClear, `${s.stageCode} 应当算首通`);
    });
    assert.strictEqual(gold, 2000);
    assert.strictEqual(gems, 200);
    assert.strictEqual(Math.floor(gold / global.GAME_CONFIG.gachaPity.singleCostGold), 20,
        '章节首通总金币应恰好支撑 20 次单抽');
});
test('通关进度单调不回退', () => {
    stages.forEach(s => global.PveSystem.settleVictory(s, {}));
    assert.strictEqual(global.PveSystem.loadProgress().cleared, 4);
    global.PveSystem.settleVictory(global.PveSystem.getStage(1), {});
    assert.strictEqual(global.PveSystem.loadProgress().highest, 5);
});

console.log('\n== 4. 实战难度曲线（12 个种子，初始卡组）==');
const rates = {};
const avgRates = {};
const worstByStage = {};
const SEED_SUBSET = SEEDS.slice(0, 6);
stages.forEach(stage => {
    rates[stage.stageCode] = winRate(stage, 'fire_warrior', SEEDS);
    const perHero = HERO_IDS.map(hero => winRate(stage, hero, SEED_SUBSET));
    avgRates[stage.stageCode] = perHero.reduce((a, b) => a + b, 0) / perHero.length;
    worstByStage[stage.stageCode] = Math.min.apply(null, perHero);
    console.log(`  · ${stage.stageCode} ${stage.stageName}（${stage.enemyName} HP${stage.enemyMaxHp}）`
        + ` 五英雄均值 ${(avgRates[stage.stageCode] * 100).toFixed(0)}%  最差 ${(worstByStage[stage.stageCode] * 100).toFixed(0)}%`);
});
test('难度单调递增（按五英雄平均胜率衡量）', () => {
    assert.ok(avgRates['1-2'] < avgRates['1-1'], '1-2 应比 1-1 难');
    assert.ok(avgRates['1-3'] < avgRates['1-2'], '1-3 应比 1-2 难');
    assert.ok(avgRates['1-4'] < avgRates['1-3'], '1-4 应比 1-3 难');
});
test('前三关对任何英雄都不是必败之局', () => {
    for (const code of ['1-1', '1-2', '1-3']) {
        assert.ok(worstByStage[code] > 0, `${code} 有英雄完全无法通关`);
    }
});
test('首关对新手友好（不低于 60% 胜率）', () => {
    assert.ok(rates['1-1'] >= 0.6, `1-1 胜率仅 ${(rates['1-1'] * 100).toFixed(0)}%`);
});
test('末关是刻意门槛，但章节奖励的养成收益能兑现', () => {
    const stage4 = global.PveSystem.getStage(4);
    assert.ok(rates['1-4'] < 0.35, `初始卡组打 1-4 有 ${(rates['1-4'] * 100).toFixed(0)}%，门槛形同虚设`);
    const geared = winRate(stage4, 'fire_warrior', SEEDS, GEARED);
    console.log(`      强化卡组（全 Lv.3 PVE 池）对 1-4 胜率 ${(geared * 100).toFixed(0)}%`);
    assert.ok(geared >= 0.6, `强化卡组胜率仅 ${(geared * 100).toFixed(0)}%，养成没有回报`);
});
test('五名英雄都能打通第 1 关（没有废英雄）', () => {
    const stage1 = global.PveSystem.getStage(1);
    const hopeless = HERO_IDS.filter(hero => winRate(stage1, hero, SEEDS.slice(0, 6)) === 0);
    assert.deepStrictEqual(hopeless, [], '这些英雄在首关毫无胜算');
});

console.log('\n== 5. 战斗内部一致性 ==');
test('首领使用自己的卡组与生命，不吃玩家卡组', () => {
    global.PveSystem.saveProgress({ cleared: 0, highest: 1, wins: {}, collectedRewards: [] });
    const stage = global.PveSystem.getStage(3);
    const { game } = runBattle(4242, stage, 'iron_guardian');
    assert.strictEqual(game.p2.maxHp, 208);
    assert.strictEqual(game.p2.hero.name, '古代魔像');
    // 三区都查：抽牌堆 + 手牌 + 弃牌堆。
    // 只查 game.p2.deck（抽牌堆）不稳 —— 战斗打完时目标牌可能已被抽到手上或打出去进了弃牌堆，
    // 断言会随战斗长度变化随机翻红。本意是"首领用自己的卡组"，三区合起来看才准确。
    const zones = [game.p2.deck, game.p2.hand, game.p2.discardPile].filter(Array.isArray);
    const bossIds = Array.from(new Set(zones.reduce((acc, z) => acc.concat(z.map(c => c.id)), [])));
    assert.ok(bossIds.includes('pve_iron_bark'), '第 3 关首领应带铁树皮');
    assert.ok(!bossIds.includes('base_twin_strike'), '不该出现第 1 关专属卡');
});
test('PVE 战斗不会拖成膀胱局（护盾衰减生效）', () => {
    global.PveSystem.saveProgress({ cleared: 4, highest: 5, wins: {}, collectedRewards: [1, 2, 3, 4] });
    const stage = global.PveSystem.getStage(2);
    const long = [];
    for (const seed of SEEDS) {
        const { rounds } = runBattle(seed, stage, 'forest_mage');
        if (rounds > 30) long.push(`${seed}:${rounds}轮`);
    }
    assert.deepStrictEqual(long, [], `这些种子拖到 30 轮以上：${long.join(', ')}`);
});
test('绕过 startBattle 直接用未注册首领开战必须报错（曾经是静默 30 血假首领）', () => {
    const game = new global.CardGame();
    assert.throws(() => game.initPveMatch('fire_warrior', 'pve_boss_99', [], 1),
        /首领定义缺失/, '未知首领必须当场失败，不能退回 30 血默认值');
    assert.throws(() => game.initPveMatch('nope_hero', 'pve_boss_1', [], 1),
        /出战英雄不存在/);
});
test('首领必须是注册过的真实血量，不是 30 点兜底值', () => {
    for (const stage of stages) {
        const game = new global.CardGame();
        global.PveSystem.startBattle(game, 'fire_warrior', stage, 1234);
        assert.strictEqual(game.p2.maxHp, stage.enemyMaxHp,
            `${stage.stageCode} 首领实际 ${game.p2.maxHp}，应为 ${stage.enemyMaxHp}`);
        assert.notStrictEqual(game.p2.maxHp, 30, `${stage.stageCode} 拿到了 HeroManager 的兜底血量`);
        assert.strictEqual(game.p2.hero.name, stage.enemyName);
        assert.strictEqual(game.p2.hero.skill.cost, 99, '首领不应带一个 2 费的空技能');
    }
});
test('战斗结束条件唯一：一方生命归零', () => {
    for (const seed of SEEDS.slice(0, 5)) {
        const { game } = runBattle(seed, global.PveSystem.getStage(1), 'fire_warrior');
        assert.ok(game.p1.hp <= 0 || game.p2.hp <= 0, `seed ${seed} 结束时双方都活着`);
    }
});

console.log('\n' + '='.repeat(64));
console.log(`PVE 测试：通过 ${passed}，失败 ${failures.length}`);
if (failures.length) {
    console.log('\n失败明细：');
    failures.forEach(f => console.log('  - ' + f.name + ': ' + f.err.message.split('\n')[0]));
    process.exit(1);
}
