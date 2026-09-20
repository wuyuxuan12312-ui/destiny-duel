// Integration test for the REST backend: gacha pity, wallet persistence, and PVE progress.
// Spawns the real server on a scratch port and talks to it over HTTP.
const path = require('path');
const assert = require('assert');
const { spawn } = require('node:child_process');

const PORT = 4319;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
const failures = [];
async function test(name, fn) {
    try { await fn(); passed++; console.log('  ✓ ' + name); }
    catch (err) { failures.push({ name, err }); console.log('  ✗ ' + name + '\n      ' + String(err.message).split('\n').join('\n      ')); }
}

async function api(pathname, options = {}) {
    const res = await fetch(BASE + pathname, {
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    let payload = null;
    try { payload = await res.json(); } catch (err) { payload = null; }
    return { status: res.status, payload };
}

async function waitForServer(attempts = 60) {
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(BASE + '/api/game/config');
            if (res.ok) return;
        } catch (err) { /* not up yet */ }
        await new Promise(r => setTimeout(r, 250));
    }
    throw new Error('服务端未能在超时前启动');
}

const server = spawn(process.execPath, [path.join(ROOT, 'server', 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
    stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', () => {});
server.stderr.on('data', d => process.stderr.write('[server] ' + d));

async function main() {
    await waitForServer();
    const user = 'test_' + Date.now();

    console.log('\n== 1. 配置接口与本地 bundle 同构 ==');
    const cfg = (await api('/api/game/config')).payload;
    await test('cards 是按 id 索引的对象，且保留分支/反应字段', () => {
        assert.ok(cfg && cfg.cards && !Array.isArray(cfg.cards), 'cards 必须是对象，否则客户端重建卡表会全线失效');
        assert.ok(Object.keys(cfg.cards).length >= 85, `卡数 ${Object.keys(cfg.cards).length}`);
        const judgment = cfg.cards['base_execute_judgment'];
        assert.strictEqual(judgment.condition, 'target_hp_below');
        assert.strictEqual(judgment.condition_param, 40);
        assert.deepStrictEqual(judgment.then_effects, [{ type: 'damage', value: 18 }]);
        assert.deepStrictEqual(judgment.else_effects, [{ type: 'shield', value: 8 }]);
    });
    await test('pveStages / gachaPity 一并下发', () => {
        assert.strictEqual(cfg.pveStages.length, 4);
        assert.strictEqual(cfg.gachaPity.hardPityCounter, 80);
        assert.strictEqual(cfg.gameRules.max_hand_size.value, 10);
    });

    console.log('\n== 2. 钱包 ==');
    await test('首次访问自动建档，默认 2000 金 / 100 宝石', async () => {
        const { payload } = await api(`/api/player/wallet?userId=${user}`);
        assert.strictEqual(payload.gold, 2000);
        assert.strictEqual(payload.gems, 100);
        assert.strictEqual(payload.pity_since_ssr, 0);
    });
    await test('客户端只能提交增量，不能直接设定余额', async () => {
        const after = await api('/api/player/wallet', { method: 'POST', body: { userId: user, deltaGold: 300, gold: 999999 } });
        assert.strictEqual(after.payload.gold, 2300, `实际 ${after.payload.gold}，绝对值字段必须被忽略`);
    });

    console.log('\n== 3. 抽卡：扣费、落库、稀有度对齐 ==');
    let goldBefore = (await api(`/api/player/wallet?userId=${user}`)).payload.gold;
    const ten = await api('/api/gacha/draw', { method: 'POST', body: { userId: user, packId: 'pack_standard', count: 10 } });
    await test('十连按 900 扣费并返回 10 张', () => {
        assert.strictEqual(ten.status, 200);
        assert.strictEqual(ten.payload.results.length, 10);
        assert.strictEqual(ten.payload.gold, goldBefore - 900 + (ten.payload.refundGold || 0));
    });
    await test('十连保底：至少一张 R 及以上', () => {
        const order = ['common', 'rare', 'epic', 'legendary'];
        const best = Math.max(...ten.payload.results.map(r => order.indexOf(r.rarityKey)));
        assert.ok(best >= 1, `十连全是 N: ${ten.payload.results.map(r => r.rarityKey).join(',')}`);
    });
    await test('抽到的卡稀有度与卡池一致（不会再出现 epic 当 SSR 发）', () => {
        for (const r of ten.payload.results) {
            const card = cfg.cards[r.card.id];
            assert.ok(card, `抽出数据库里不存在的卡 ${r.card.id}`);
            assert.strictEqual(card.rarity, r.rarityKey,
                `卡 ${r.card.id} 稀有度 ${card.rarity} 与抽出档位 ${r.rarityKey} 不符`);
        }
    });
    await test('金币不足时拒绝并报错', async () => {
        const poor = 'poor_' + Date.now();
        await api('/api/player/wallet', { method: 'POST', body: { userId: poor, deltaGold: -2000 } });
        const denied = await api('/api/gacha/draw', { method: 'POST', body: { userId: poor, count: 10 } });
        assert.strictEqual(denied.status, 400);
        assert.ok(/金币不足/.test(denied.payload.error || ''), denied.payload.error);
    });

    console.log('\n== 4. 80 抽硬保底与幸运值（纯逻辑，覆盖服务端同款实现）==');
    const GachaSystem = require(path.join(ROOT, 'client', 'src', 'systems', 'GachaSystem.js'));
    await test('连续 80 抽未出 SSR 时第 80 抽强制出 SSR', () => {
        const conf = GachaSystem.config();
        const pity = GachaSystem.freshPityState();
        let hits = 0;
        // rng pinned to the worst case: always rolls the lowest rarity
        const neverLucky = () => 0.999999;
        for (let i = 1; i <= conf.hardPityCounter; i++) {
            const rarity = GachaSystem.rollRarity(pity, neverLucky, conf);
            if (rarity === 'legendary') { hits++; assert.strictEqual(i, conf.hardPityCounter, `SSR 提前出现在第 ${i} 抽，硬保底不该是概率性的`); }
        }
        assert.strictEqual(hits, 1, '80 抽内必须恰好触发一次硬保底');
        assert.strictEqual(pity.sinceSSR, 0, '出 SSR 后计数必须清零');
    });
    await test('软保底区间内 SSR 概率随抽数单调上升', () => {
        const conf = GachaSystem.config();
        const rateAt = (sinceSSR) => {
            let hits = 0;
            const trials = 4000;
            for (let i = 0; i < trials; i++) {
                const pity = { sinceSSR, luck: 0, totalPulls: 0 };
                if (GachaSystem.rollRarity(pity, Math.random, conf) === 'legendary') hits++;
            }
            return hits / trials;
        };
        const early = rateAt(conf.luckSoftPityStart - 20);
        const late = rateAt(conf.hardPityCounter - 1);
        console.log(`      ${conf.luckSoftPityStart - 20} 抽位 ${(early * 100).toFixed(2)}% → ${conf.hardPityCounter - 1} 抽位 ${(late * 100).toFixed(2)}%`);
        assert.ok(late > early * 3, '临近硬保底的 SSR 概率必须显著抬升，否则幸运值形同虚设');
    });
    await test('基础概率与配置吻合（70/22/6/2）', () => {
        const conf = GachaSystem.config();
        const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
        const trials = 20000;
        // Measured away from the pity floor: a shared counter over 20k pulls necessarily inflates
        // the legendary rate by the forced pull every 80th, which is the pity working, not a defect.
        for (let i = 0; i < trials; i++) {
            const pity = { sinceSSR: 0, luck: 0, totalPulls: 0 };
            counts[GachaSystem.rollRarity(pity, Math.random, conf)]++;
        }
        for (const key of Object.keys(counts)) {
            const observed = counts[key] / trials;
            const expected = conf.rates[key];
            assert.ok(Math.abs(observed - expected) < 0.025,
                `${key} 实际 ${(observed * 100).toFixed(1)}% 期望 ${(expected * 100).toFixed(1)}%`);
        }
    });
    await test('PVE 重复卡免费升级、满级后转金币', () => {
        const conf = GachaSystem.config();
        const pveCard = { pool_type: 'PVE', upgradeable: 1 };
        assert.deepStrictEqual(GachaSystem.duplicateOutcome(pveCard, 1, conf), { type: 'level', newLevel: 2, gold: 0 });
        assert.deepStrictEqual(GachaSystem.duplicateOutcome(pveCard, 3, conf), { type: 'gold', gold: conf.duplicateGoldMaxLevel, newLevel: 3 });
        assert.deepStrictEqual(GachaSystem.duplicateOutcome({ pool_type: 'PVP', upgradeable: 0 }, 1, conf),
            { type: 'gold', gold: conf.duplicateGoldPvp, newLevel: 1 });
    });
    await test('PVE 成长包只掉可升级卡', async () => {
        const packUser = 'pvepack_' + Date.now();
        const { payload } = await api('/api/gacha/draw', { method: 'POST', body: { userId: packUser, packId: 'pack_pve_growth', count: 10 } });
        assert.ok(payload.results.length > 0);
        for (const r of payload.results) {
            assert.strictEqual(cfg.cards[r.card.id].pool_type, 'PVE', `成长包掉出了 ${r.card.id}（${cfg.cards[r.card.id].pool_type}）`);
        }
    });

    console.log('\n== 5. PVE 进度持久化（不可回退）==');
    await test('写入后回读，且重复提交更低的进度不会倒退', async () => {
        await api('/api/pve/progress', { method: 'POST', body: { userId: user, cleared: 3, highest: 4, collectedRewards: [1, 2, 3] } });
        const got = (await api(`/api/pve/progress?userId=${user}`)).payload;
        assert.strictEqual(got.clearedStage, 3);
        assert.strictEqual(got.highestStage, 4);
        await api('/api/pve/progress', { method: 'POST', body: { userId: user, cleared: 1, highest: 1, collectedRewards: [] } });
        const again = (await api(`/api/pve/progress?userId=${user}`)).payload;
        assert.strictEqual(again.clearedStage, 3, '进度被旧 payload 覆写了');
        assert.strictEqual(again.highestStage, 4);
    });
    await test('首通奖励清单只增不减', async () => {
        const merged = (await api(`/api/pve/progress?userId=${user}`)).payload;
        assert.deepStrictEqual(merged.collectedRewards.sort(), [1, 2, 3]);
    });
    await test('关卡接口返回 4 关合法卡组', async () => {
        const stages = (await api('/api/pve/stages')).payload;
        assert.strictEqual(stages.length, 4);
        for (const stage of stages) {
            const total = stage.enemyDeck.reduce((n, e) => n + e.count, 0);
            assert.strictEqual(total, 15, `${stage.stageCode} 共 ${total} 张`);
            for (const entry of stage.enemyDeck) {
                assert.ok(entry.count <= 2, `${entry.cardId} ${entry.count} 份`);
                assert.ok(cfg.cards[entry.cardId], `未知卡牌 ${entry.cardId}`);
            }
        }
    });
}

main()
    .then(() => {
        console.log('\n' + '='.repeat(60));
        console.log(`服务端接口测试：通过 ${passed}，失败 ${failures.length}`);
        if (failures.length) {
            failures.forEach(f => console.log('  - ' + f.name + ': ' + f.err.message.split('\n')[0]));
            server.kill();
            process.exit(1);
        }
        server.kill();
        process.exit(0);
    })
    .catch(err => {
        console.error('测试运行失败:', err);
        server.kill();
        process.exit(1);
    });
