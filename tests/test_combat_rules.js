// Combat-rule tests for the ported Unity mechanics. These drive the real engine (no mocks),
// because every one of these rules was either absent or differently implemented on the web side.
const path = require('path');
const assert = require('assert');
const { loadGameRuntime } = require(path.join(__dirname, '..', 'tools', 'load_runtime.js'));

loadGameRuntime({ silent: true });

let passed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ✓ ' + name);
    } catch (err) {
        failures.push({ name, err });
        console.log('  ✗ ' + name + '\n      ' + String(err.message).split('\n').join('\n      '));
    }
}

/**
 * Build a fresh match. With `isolate`, hero passives and the flat hero damageBonus are removed
 * so a failing assertion points at the mechanic under test rather than at 烈焰剑士's +1.
 */
function newGame(seed = 4242, isolate = false) {
    const game = new global.CardGame();
    game.initMatch('fire_warrior', 'iron_guardian', null, seed);
    game.log = () => {};
    if (isolate) {
        game.eventBus.clear();
        for (const side of [game.p1, game.p2]) {
            side.modifiers.damageBonus = 0;
            side.modifiers.fireDamageBonus = 0;
            side.modifiers.iceDamageBonus = 0;
            side.modifiers.poisonDamageBonus = 0;
            side.modifiers.healBonus = 0;
            side.modifiers.shieldBonus = 0;
        }
    }
    return game;
}

function card(id, level = 1) {
    const base = global.CARD_BY_ID[id];
    assert(base, 'card missing from dataset: ' + id);
    return global.getCardScaledStats(base, level);
}

/** Put a card into the actor's hand and play it against the other side. */
function playFrom(game, player, cardObj) {
    player.hand.push(cardObj);
    const index = player.hand.length - 1;
    const other = player === game.p1 ? game.p2 : game.p1;
    return global.CardSystem.play(player, other, index, game);
}

console.log('\n== 1. 护盾回合末向下取整衰减（Unity 是 /2 整除，不是 CeilToInt）==');
test('5 点护盾衰减为 2', () => {
    const g = newGame(4242, true);
    g.p1.shield = 5;
    global.TurnSystem.endTurn(g.p1, g);
    assert.strictEqual(g.p1.shield, 2);
});
test('1 点护盾归零、9→4、20→10', () => {
    for (const [before, after] of [[1, 0], [9, 4], [20, 10]]) {
        const g = newGame(4242, true);
        g.p1.shield = before;
        g.log = () => {};
        global.TurnSystem.endTurn(g.p1, g);
        assert.strictEqual(g.p1.shield, after, `${before} 应衰减为 ${after}`);
    }
});

console.log('\n== 2. 能量阶梯为硬覆盖，未花费不结转 ==');
test('起手 4 点，第 2~3 轮覆盖为 3，第 4 轮 4，第 8 轮 5', () => {
    const g = newGame(4242, true);
    assert.strictEqual(g.p1.energy, 4, '第 1 轮应等于 startingEnergy');
    g.p1.energy = 4;
    g.turnCount = 3;                       // round 2, p1's second turn
    g.p1.stats.turnsTaken = 1;
    global.TurnSystem.startTurn(g.p1, g);
    assert.strictEqual(g.p1.energy, 3, '第 2 轮应覆盖为 3，而不是在剩余额度上累加');
    g.turnCount = 7;                       // round 4
    global.TurnSystem.startTurn(g.p1, g);
    assert.strictEqual(g.p1.energy, 4);
    g.turnCount = 15;                      // round 8
    global.TurnSystem.startTurn(g.p1, g);
    assert.strictEqual(g.p1.energy, 5);
});
test('回合内能量卡可越过阶梯但受 maxEnergy 约束', () => {
    const g = newGame(4242, true);
    g.p2.energy = 5;
    g.p2.maxEnergy = 10;
    playFrom(g, g.p2, card('pvp_perfect_insight'));   // cost 2, +2 energy, draw 3
    assert.strictEqual(g.p2.energy, 5, '5 - 2 费 + 2 能量 = 5');
    g.p2.energy = 9;
    playFrom(g, g.p2, card('pvp_adrenaline'));        // cost 1, +2 energy, draw 1
    assert.strictEqual(g.p2.energy, 10, '必须夹在 maxEnergy=10');
});

console.log('\n== 3. 易伤 ×1.5 使用银行家舍入（JS 原生 Math.round 会算错）==');
test('5 点伤害在易伤下为 8（round(7.5)→8），3 点为 4（round(4.5)→4）', () => {
    const g = newGame(4242, true);
    global.StatusSystem.apply(g.p2, 'vulnerable', 1, 2, g);
    g.p2.shield = 0;
    const before = g.p2.hp;
    global.DamageCalculator.execute(g.p1, g.p2, 5, {}, g);
    assert.strictEqual(before - g.p2.hp, 8, 'roundHalfToEven(7.5) 必须是 8');
    g.p2.hp = before;
    global.DamageCalculator.execute(g.p1, g.p2, 3, {}, g);
    assert.strictEqual(before - g.p2.hp, 4, 'roundHalfToEven(4.5) 必须是 4，JS 的 Math.round 会给出 5');
});

console.log('\n== 4. 虚弱 ×0.75 且最少保留 1 点，力量 +3 按段结算 ==');
test('虚弱把 5 点降为 4，把 1 点保留为 1', () => {
    const g = newGame(4242, true);
    global.StatusSystem.apply(g.p1, 'weakness', 1, 2, g);
    g.p2.shield = 0;
    let before = g.p2.hp;
    global.DamageCalculator.execute(g.p1, g.p2, 5, {}, g);
    assert.strictEqual(before - g.p2.hp, 4, 'roundHalfToEven(3.75)=4');
    before = g.p2.hp;
    global.DamageCalculator.execute(g.p1, g.p2, 1, {}, g);
    assert.ok(before - g.p2.hp >= 1, '虚弱不能把伤害压成 0');
});
test('力量对多段卡每段都 +3（双重打击 2 段共 +6）', () => {
    const g = newGame(4242, true);
    global.StatusSystem.apply(g.p1, 'strength', 1, 2, g);
    g.p2.shield = 0;
    const before = g.p2.hp;
    playFrom(g, g.p1, card('base_twin_strike'));   // 4 dmg x 2 hits, each +3 => 14
    assert.strictEqual(before - g.p2.hp, 14);
});
test('力量 +3 与虚弱 x0.75 同时存在时先乘后加', () => {
    const g = newGame(4242, true);
    global.StatusSystem.apply(g.p1, 'strength', 1, 2, g);
    global.StatusSystem.apply(g.p1, 'weakness', 1, 2, g);
    g.p2.shield = 0;
    const before = g.p2.hp;
    global.DamageCalculator.execute(g.p1, g.p2, 10, {}, g);   // round(7.5)=8 then +3 = 11
    assert.strictEqual(before - g.p2.hp, 11);
});

console.log('\n== 5. 荆棘按段反弹真实伤害 ==');
test('荆棘反弹 3 点真伤，且无视反伤方的护盾', () => {
    const g = newGame(4242, true);
    global.StatusSystem.apply(g.p2, 'thorns', 1, 2, g);
    g.p2.shield = 0;
    g.p1.shield = 20;
    const attackerHp = g.p1.hp;
    playFrom(g, g.p1, card('base_strike'));        // 6 dmg, one hit
    assert.strictEqual(g.p1.shield, 20, '真实伤害不应被护盾吸收');
    assert.strictEqual(attackerHp - g.p1.hp, 3, '反伤必须是 3 点');
    assert.strictEqual(g.p2.maxHp - g.p2.hp, 6, '对手应吃到 6 点攻击伤害');
});
test('多段卡每段各反弹一次（双重打击 → 反弹 6）', () => {
    const g = newGame(4242, true);
    global.StatusSystem.apply(g.p2, 'thorns', 1, 2, g);
    g.p2.shield = 0;
    const attackerHp = g.p1.hp;
    playFrom(g, g.p1, card('base_twin_strike'));
    assert.strictEqual(attackerHp - g.p1.hp, 6, '两段攻击应触发两次 3 点反伤');
});

console.log('\n== 6. 灼烧走护盾并可被易伤放大，中毒穿透两者 ==');
test('灼烧先被护盾吸收', () => {
    const g = newGame(4242, true);
    global.StatusSystem.apply(g.p1, 'burn', 2, 2, g);   // 2 层 x 2 = 4 物理
    g.p1.shield = 10;
    const hpBefore = g.p1.hp;
    g.log = () => {};
    global.StatusSystem.tick(g.p1, 'turn_end', g);
    assert.strictEqual(g.p1.shield, 6, '护盾应吸收 4 点灼烧');
    assert.strictEqual(g.p1.hp, hpBefore, '生命不应受损');
});
test('灼烧受易伤放大 1.5 倍', () => {
    const g = newGame(4242, true);
    global.StatusSystem.apply(g.p1, 'burn', 1, 2, g);      // 2 物理
    global.StatusSystem.apply(g.p1, 'vulnerable', 1, 2, g);
    g.p1.shield = 0;
    const hpBefore = g.p1.hp;
    g.log = () => {};
    global.StatusSystem.tick(g.p1, 'turn_end', g);
    assert.strictEqual(hpBefore - g.p1.hp, 3, 'roundHalfToEven(2*1.5)=3');
});
test('中毒无视护盾与易伤', () => {
    const g = newGame(4242, true);
    global.StatusSystem.apply(g.p1, 'poison', 2, 2, g);    // 4 真伤
    global.StatusSystem.apply(g.p1, 'vulnerable', 1, 2, g);
    g.p1.shield = 20;
    const hpBefore = g.p1.hp;
    g.log = () => {};
    global.StatusSystem.tick(g.p1, 'turn_end', g);
    assert.strictEqual(g.p1.shield, 20, '真实伤害不得消耗护盾');
    assert.strictEqual(hpBefore - g.p1.hp, 4, '真实伤害不得被易伤放大');
});

console.log('\n== 7. 手牌上限 10，超出的抽牌被烧掉而不是拒绝抽牌 ==');
test('第 11 张进入弃牌堆', () => {
    const g = newGame(4242, true);
    g.log = () => {};
    g.p1.hand = new Array(10).fill(null).map((_, i) => card('base_strike'));
    const discardBefore = g.p1.discardPile.length;
    const deckBefore = g.p1.deck.length;
    g.drawCard(g.p1);
    assert.strictEqual(g.p1.hand.length, 10);
    assert.strictEqual(g.p1.discardPile.length, discardBefore + 1, '烧掉的牌要进弃牌堆');
    assert.strictEqual(g.p1.deck.length, deckBefore - 1, '牌仍要消耗掉，不能只是拒绝抽牌');
});

console.log('\n== 8. 分支卡（含降级后的读心卡）按公开信息结算 ==');
test('处刑判决：对手血量 ≥40% 时 8 伤害 + 8 护盾给自己', () => {
    const g = newGame(4242, true);
    g.p2.hp = g.p2.maxHp;
    g.p1.shield = 0;
    const before = g.p2.hp;
    playFrom(g, g.p1, card('base_execute_judgment'));
    assert.strictEqual(before - g.p2.hp, 8, '未达分支阈值只造成 8 点');
    assert.strictEqual(g.p1.shield, 8, 'else 分支的 8 点护盾必须给自己');
});
test('处刑判决：对手血量 <40% 时追加 18 点处刑', () => {
    const g = newGame(4242, true);
    g.p2.hp = Math.floor(g.p2.maxHp * 0.3);
    g.p2.shield = 0;
    const before = g.p2.hp;
    playFrom(g, g.p1, card('base_execute_judgment'));
    assert.strictEqual(before - g.p2.hp, 8 + 18, '主伤害 8 + 分支追加 18');
});
test('Lv.3 的 PVE 分支卡，其分支数值也随等级成长', () => {
    const g = newGame(4242, true);
    const lv3 = card('pve_barricade', 3);
    assert.ok(lv3.shield > card('pve_barricade', 1).shield, '主护盾应随等级提升');
    assert.ok(lv3.then_effects[0].value > card('pve_barricade', 1).then_effects[0].value,
        'then 分支数值也必须随等级提升');
});
test('洞察·读心：对手上一张是攻击牌时命中 20 点反击', () => {
    const g = newGame(4242, true);
    g.p2.lastPlayedCardType = 'attack';
    g.p2.shield = 0;
    g.p1.shield = 0;
    const before = g.p2.hp;
    playFrom(g, g.p1, card('base_read_intent'));       // shield 4 self, then damage 20
    assert.strictEqual(before - g.p2.hp, 20);
    assert.strictEqual(g.p1.shield, 4, '自身护盾不受分支影响');
});
test('洞察·读心：对手上一张是防御牌时只补 3 点护盾', () => {
    const g = newGame(4242, true);
    g.p2.lastPlayedCardType = 'defense';
    g.p1.shield = 0;
    const before = g.p2.hp;
    playFrom(g, g.p1, card('base_read_intent'));
    assert.strictEqual(before, g.p2.hp, '未命中不应有反击伤害');
    assert.strictEqual(g.p1.shield, 7, '基础 4 + else 分支 3');
});
test('屏息：对手上一回合空过则抽 2 张', () => {
    const g = newGame(4242, true);
    g.p2.passedLastTurn = true;
    g.p1.hand = [card('pvp_bated_breath')];
    g.p1.energy = 5;
    const before = g.p1.hand.length;
    const deckBefore = g.p1.deck.length;
    global.CardSystem.play(g.p1, g.p2, 0, g);
    assert.strictEqual(deckBefore - g.p1.deck.length, 2, '必须实际消耗牌堆 2 张');
    assert.strictEqual(g.p1.hand.length, before - 1 + 2, '打出 1 张、抽回 2 张');
});
test('屏息：对手上过牌时不触发抽牌', () => {
    const g = newGame(4242, true);
    g.p2.passedLastTurn = false;
    g.p1.hand = [card('pvp_bated_breath')];
    g.p1.energy = 5;
    const deckBefore = g.p1.deck.length;
    global.CardSystem.play(g.p1, g.p2, 0, g);
    assert.strictEqual(deckBefore, g.p1.deck.length, '未命中不应抽牌');
});

console.log('\n== 9. 自身向效果永远归 caster，状态才看 target ==');
test('pve_combust（target=enemy）护盾给自己、灼烧给对手', () => {
    const g = newGame(4242, true);
    g.p1.shield = 0;
    g.p2.statuses = [];
    playFrom(g, g.p1, card('pve_combust'));
    assert.ok(g.p1.shield >= 4, '护盾必须落在打出者身上');
    assert.strictEqual(g.p2.shield, 0, '绝不能把护盾送给对手');
    assert.ok(global.StatusSystem.has(g.p2, 'burn'), '灼烧必须落在对手身上');
});
test('pve_demon_form 的自伤是真伤且可致死', () => {
    const g = newGame(4242, true);
    g.p1.shield = 0;
    g.p1.hp = 2;
    playFrom(g, g.p1, card('pve_demon_form'));   // strength 3, self damage 3
    assert.ok(global.StatusSystem.has(g.p1, 'strength'), '力量增益仍应生效');
    assert.ok(g.p1.hp <= 0 || g.isGameOver, '自伤 3 点应能打死 2 血的自己');
});

console.log('\n== 10. 延迟反应卡（绝境壁障）==');
test('单次伤害超过 30 时触发 20 点护盾', () => {
    const g = newGame(4242, true);
    g.p1.shield = 0;
    playFrom(g, g.p1, card('base_retaliation_shield'));   // 5 shield + arm reaction
    assert.strictEqual(g.p1.pendingReactions.length, 1, '反应卡应被埋下');
    g.p1.shield = 0;
    g.p2.shield = 0;
    global.DamageCalculator.execute(g.p2, g.p1, 40, { source: '重锤' }, g);
    assert.ok(g.p1.shield >= 20, '触发后应补 20 点护盾，实际 ' + g.p1.shield);
    assert.strictEqual(g.p1.pendingReactions.length, 0, '触发一次后即失效');
});
test('低于阈值的伤害不触发，且反应卡不会被反复引爆', () => {
    const g = newGame(4242, true);
    g.p1.shield = 0;
    playFrom(g, g.p1, card('base_retaliation_shield'));
    global.DamageCalculator.execute(g.p2, g.p1, 10, { source: '试探' }, g);
    assert.strictEqual(g.p1.pendingReactions.length, 1, '未达阈值必须保留');
});
test('反应卡只在一个对手回合内存活', () => {
    const g = newGame(4242, true);
    playFrom(g, g.p1, card('base_retaliation_shield'));
    g.p1.shield = 0;
    g.log = () => {};
    global.TurnSystem.endTurn(g.p1, g);
    global.TurnSystem.endTurn(g.p2, g);
    global.TurnSystem.endTurn(g.p1, g);
    assert.strictEqual(g.p1.pendingReactions.length, 0, '超过一个来回后应自然消散');
});

console.log('\n== 11. 冰冻封锁攻击牌与技能牌 ==');
test('冰冻下攻击牌/技能牌被拒，防御牌可出', () => {
    const g = newGame(4242, true);
    global.StatusSystem.apply(g.p1, 'freeze', 1, 1, g);
    const handBefore = g.p1.hand.length;
    const energyBefore = g.p1.energy;
    g.p1.energy = 10;
    assert.strictEqual(playFrom(g, g.p1, card('base_strike')), false, '攻击牌必须被封锁');
    assert.strictEqual(playFrom(g, g.p1, card('base_battle_cry')), false, '技能牌必须被封锁');
    g.p1.energy = energyBefore;
    assert.strictEqual(playFrom(g, g.p1, card('base_quick_guard')), true, '防御牌不受冰冻影响');
    assert.ok(g.p1.shield > 0);
    assert.ok(g.p1.hand.length <= handBefore + 3, '被拒绝的出牌不应消耗手牌');
});

console.log('\n== 12. 数据驱动的每回合修正必须会过期 ==');
test('坚守（damage_reduction）真实生效且回合末消失', () => {
    const g = newGame(4242, true);
    global.StatusSystem.apply(g.p1, 'damage_reduction', 1, null, g);
    g.p1.shield = 0;
    const before = g.p1.hp;
    global.DamageCalculator.execute(g.p2, g.p1, 10, {}, g);
    const reduced = before - g.p1.hp;
    assert.ok(reduced <= 7 && reduced >= 5, `10 点应被削减至 6 左右，实际 ${reduced}`);
    g.log = () => {};
    global.StatusSystem.tick(g.p1, 'turn_end', g);
    assert.strictEqual(global.StatusSystem.has(g.p1, 'damage_reduction'), false,
        '没有自有触发时机的状态也必须随回合过期，否则减伤会永久化');
});

console.log('\n== 13. 同归于尽判负（Unity 明确把双亡记为玩家失败）==');
test('双方同时倒下时不再是无结果', () => {
    const g = newGame(4242, true);
    g.p1.hp = 1;
    g.p2.hp = 1;
    g.p2.shield = 0;
    g.p1.shield = 0;
    global.StatusSystem.apply(g.p2, 'thorns', 1, 2, g);
    playFrom(g, g.p1, card('base_strike'));
    assert.strictEqual(g.isGameOver, true);
    assert.strictEqual(g.p1.hp <= 0 && g.p2.hp <= 0, true, '应当出现同归于尽的局面');
});

console.log('\n== 14. 完整 AI 对局不得崩溃 ==');
test('AI 对打必须收敛出胜负，且无能量越界或死循环', () => {
    const g = newGame(9917);
    const ai = new global.CardGameAI(g, null);
    let guard = 0;
    let maxEnergySeen = 0;
    while (!g.isGameOver && guard++ < 600) {
        const actor = g.activePlayer;
        if (actor === g.p2) {
            ai.takeTurn('p2');
            if (!g.isGameOver && g.activePlayer === g.p2) g.endTurn(true);
        } else {
            let plays = 0;
            while (plays++ < 8) {
                const idx = actor.hand.findIndex(c => c.cost <= actor.energy);
                if (idx === -1) break;
                global.CardSystem.play(actor, g.p2, idx, g);
                if (g.isGameOver) break;
            }
            if (g.isGameOver) break;
            global.CombatSystem.endTurn(g, true);
        }
        maxEnergySeen = Math.max(maxEnergySeen, g.p1.energy, g.p2.energy);
    }
    assert.ok(g.isGameOver, `对局未在 ${guard} 步内结束，可能存在卡死或死循环`);
    assert.ok(maxEnergySeen <= 10, `能量突破 maxEnergy=${maxEnergySeen}`);
    const loser = g.p1.hp <= 0 ? g.p1 : g.p2;
    assert.ok(loser.hp === 0, '结束条件必须是某方生命归零');
});

console.log('\n== 15. AI 决策质量（修掉 Unity 贪心的三类误判）==');
test('能算准多段卡的真实斩杀线（BaseValue 口径会漏）', () => {
    const g = newGame(4242, true);
    const ai = new global.CardGameAI(g, null);
    g.p2.hp = 8; g.p2.shield = 0;
    g.p1.energy = 5;
    const twin = card('base_twin_strike');        // 4 x 2 = 8 — exactly lethal
    g.p1.hand = [card('base_quick_guard'), twin];  // a safer-looking shield card first
    const best = ai.pickBestPlay(g.p1, g.p2);
    assert.strictEqual(best.card.id, 'base_twin_strike', 'AI 必须识别出多段卡可以斩杀');
});
test('求生时会治疗牌，不象 Unity 贪心那样把 Heal 类型排除在求生分支外', () => {
    const g = newGame(4242, true);
    const ai = new global.CardGameAI(g, null);
    g.p1.hp = 12; g.p1.maxHp = 90;
    g.p1.energy = 6;
    g.p1.hand = [card('base_strike'), card('pve_mend_wounds')];   // 6 dmg vs heal 14
    const best = ai.pickBestPlay(g.p1, g.p2);
    assert.strictEqual(best.card.id, 'pve_mend_wounds', '残血时应优先治疗');
});
test('纯增益状态卡不会被当作 0 分永久忽略', () => {
    const g = newGame(4242, true);
    const ai = new global.CardGameAI(g, null);
    g.p1.energy = 5;
    g.p1.hand = [card('base_inflame')];   // Strength 2, no damage/shield/heal at all
    const best = ai.pickBestPlay(g.p1, g.p2);
    assert.ok(best, '纯增益卡必须能被选中，否则永远不会被打出');
    assert.ok(global.StatusSystem.has(g.p1, 'strength') === false, 'pickBestPlay 不得真正修改状态');
});
test('不会用自杀伤己的牌终结自己', () => {
    const g = newGame(4242, true);
    const ai = new global.CardGameAI(g, null);
    g.p1.hp = 2;
    g.p1.energy = 5;
    g.p1.hand = [card('pve_demon_form'), card('base_quick_guard')];
    const best = ai.pickBestPlay(g.p1, g.p2);
    assert.strictEqual(best.card.id, 'base_quick_guard', '自伤会致死时不得选择该牌');
});

console.log('\n' + '='.repeat(64));
console.log(`战斗规则测试：通过 ${passed}，失败 ${failures.length}`);
if (failures.length) {
    console.log('\n失败明细：');
    failures.forEach(f => console.log('  - ' + f.name + ': ' + f.err.message.split('\n')[0]));
    process.exit(1);
}
