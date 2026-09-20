// Regression guards for the bugs that only surface when somebody actually clicks: an AI turn that
// could be left un-triggered forever, hero metadata that never reached the panels, and label text
// that read config keys which do not exist.
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { execFileSync } = require('child_process');
const { loadGameRuntime, CLIENT_DIR } = require(path.join(__dirname, '..', 'tools', 'load_runtime.js'));

loadGameRuntime({ silent: true });

const results = { passed: 0, failures: [] };

async function test(name, fn) {
    try {
        await fn();
        results.passed++;
        console.log('  ✓ ' + name);
    } catch (err) {
        results.failures.push({ name, err });
        console.log('  ✗ ' + name + '\n      ' + String(err.message).split('\n').join('\n      '));
    }
}

function freshGame() {
    const game = new global.CardGame();
    game.initMatch('fire_warrior', 'iron_guardian', null, 12345);
    return game;
}

async function main() {
    // ---- Hero roster / metadata -------------------------------------------------------------

    await test('HERO_DATABASE 只列出配置里真实存在的英雄（旧别名不再当作英雄）', () => {
        const roster = Object.keys(global.HERO_DATABASE);
        const configured = Object.keys(global.GAME_CONFIG.characters);
        assert.deepStrictEqual(roster.slice().sort(), configured.slice().sort(),
            `roster=${roster.join(',')} vs config=${configured.join(',')}`);
        for (const ghost of ['flame_swordsman', 'iron_guard', 'forest_warlock']) {
            assert.ok(!(ghost in global.HERO_DATABASE), `${ghost} 仍然被当成一名独立英雄`);
        }
    });

    await test('旧英雄 id 依旧能解析到正式英雄（存档卡组不会因为别名表被删而失效）', () => {
        assert.strictEqual(global.HeroManager.createHeroInstance('flame_swordsman').id, 'fire_warrior');
        assert.strictEqual(global.HeroManager.createHeroInstance('iron_guard').id, 'iron_guardian');
        assert.strictEqual(global.HeroManager.createHeroInstance('forest_warlock').id, 'forest_mage');
    });

    await test('每名英雄都有可展示的定位描述与被动说明（曾经渲染出 undefined 与空白）', () => {
        for (const [id, hero] of Object.entries(global.HERO_DATABASE)) {
            assert.ok(hero.description && hero.description.trim().length > 4, `${id} 缺少 description`);
            assert.ok(hero.desc === undefined, `${id} 不应该再挂一个 desc 字段`);
            assert.ok(hero.passive.name && hero.passive.name !== '专属被动', `${id} 被动名仍是占位符`);
            assert.ok(hero.passive.desc && hero.passive.desc.length > 8, `${id} 缺少被动说明`);
        }
    });

    await test('被动文案里的数字就是引擎实际使用的规则值', () => {
        const rules = global.GAME_CONFIG.gameRules;
        const tank = rules.tank_damage_reduction.value;
        const nature = rules.nature_heal_amount.value;
        const crit = Math.round(rules.crit_chance.value * 100);
        assert.ok(global.HERO_DATABASE.iron_guardian.passive.desc.includes(String(tank)),
            `坚甲文案应包含 ${tank}：${global.HERO_DATABASE.iron_guardian.passive.desc}`);
        assert.ok(global.HERO_DATABASE.forest_mage.passive.desc.includes(String(nature)),
            `自然恢复文案应包含 ${nature}：${global.HERO_DATABASE.forest_mage.passive.desc}`);
        assert.ok(global.HERO_DATABASE.lightning_assassin.passive.desc.includes(`${crit}%`),
            `暴击文案应包含 ${crit}%：${global.HERO_DATABASE.lightning_assassin.passive.desc}`);
    });

    await test('进入过 PVE 后，首领不会混进可出战英雄名单', () => {
        const playableBefore = Object.keys(global.HERO_DATABASE);
        const stages = global.PveSystem.getStages();
        const enemyId = global.PveSystem.ensureEnemyDefined(stages[0]);
        assert.ok(enemyId, '首领定义应当注册到 GAME_CONFIG.characters');
        global.refreshHeroDatabase();

        const after = Object.keys(global.HERO_DATABASE);
        assert.ok(!(enemyId in global.GAME_CONFIG.characters) || global.GAME_CONFIG.characters[enemyId].enabled === false,
            '首领角色应当标记为 enabled: false');
        assert.ok(!(enemyId in global.HERO_DATABASE), `${enemyId} 出现在可出战名单里：${after.join(',')}`);
        assert.deepStrictEqual(after.slice().sort(), playableBefore.slice().sort(),
            '刷新英雄库后名单发生变化（首领泄漏或原有英雄丢失）');
        assert.strictEqual(global.HeroManager.createHeroInstance(enemyId).hp, stages[0].enemyMaxHp,
            '首领自身的定义仍要能被战斗读取');
    });

    // ---- AI turn hand-back ------------------------------------------------------------------

    await test('AI 在调用 endTurn 之前已经释放 isRunning，回合切换时的渲染才能接手', async () => {
        const game = freshGame();
        const ai = new global.CardGameAI(game, null);
        ai.headless = false;
        ai.thinkMs = 1;
        ai.actMs = 1;

        game.activePlayer = game.p2;
        let runningAtEndTurn = null;
        const originalEndTurn = game.endTurn.bind(game);
        game.endTurn = (fastForward) => {
            runningAtEndTurn = ai.isRunning;
            return originalEndTurn(fastForward);
        };

        await ai.runAITurn();
        assert.ok(runningAtEndTurn !== null, 'AI 这一回合没有交还控制权');
        assert.strictEqual(runningAtEndTurn, false,
            'endTurn 触发渲染时 AI 仍标记为运行中，下一次 AI 回合会被跳过并永久卡死');
        assert.strictEqual(ai.isRunning, false, 'runAITurn 结束后仍占用 isRunning');
    });

    await test('AI 决策抛错时依然交还回合，不会把对局留在首领回合', async () => {
        const game = freshGame();
        const ai = new global.CardGameAI(game, null);
        ai.headless = true;
        game.activePlayer = game.p2;
        ai.takeTurn = () => { throw new Error('决策器炸了'); };
        const originalError = console.error;
        console.error = () => {};

        try {
            await ai.runAITurn();
        } finally {
            console.error = originalError;
        }
        assert.strictEqual(game.activePlayer, game.p1, '抛错后没有交还控制权');
        assert.strictEqual(ai.isRunning, false);
    });

    await test('await 期间回合已被别人推进时，AI 不再重复交还控制权', async () => {
        const game = freshGame();
        const ai = new global.CardGameAI(game, null);
        ai.headless = false;
        ai.thinkMs = 1;
        ai.actMs = 1;
        game.activePlayer = game.p2;

        let endTurnCalls = 0;
        const originalEndTurn = game.endTurn.bind(game);
        game.endTurn = (fastForward) => {
            endTurnCalls++;
            if (endTurnCalls === 1) {
                // The player passing instantly inside the AI's turn leaves p2 active again.
                game.activePlayer = game.p2;
                return;
            }
            return originalEndTurn(fastForward);
        };

        await ai.runAITurn();
        assert.strictEqual(endTurnCalls, 1, 'AI 在控制权已易主后又交还了一次回合');
        assert.strictEqual(ai.isRunning, false);
    });

    // ---- Static guards for the label/reference traps ---------------------------------------

    await test('祝福弹窗不再用 cloneNode 换节点（旧写法把引用留在了游离节点上）', () => {
        const src = fs.readFileSync(path.join(CLIENT_DIR, 'js', 'ui.js'), 'utf8');
        assert.ok(!/cloneNode/.test(src), 'client/js/ui.js 里仍然出现 cloneNode');
        assert.ok(/btnConfirm\.onclick\s*=/.test(src), '确认按钮没有重新绑定到当前 DOM 节点');
    });

    await test('ui.js 是全局脚本，不能出现 IIFE 才有的 root 别名', () => {
        const src = fs.readFileSync(path.join(CLIENT_DIR, 'js', 'ui.js'), 'utf8');
        assert.ok(!/^\s*\(function\s*\(root\)/m.test(src), 'ui.js 变成了 IIFE，下面的断言需要重写');
        assert.ok(!/\broot\./.test(src), 'ui.js 里使用了 root.*，点击时会直接抛 ReferenceError');
    });

    await test('手牌只有一条出牌入口，双击不会重复消耗卡牌', () => {
        const src = fs.readFileSync(path.join(CLIENT_DIR, 'js', 'ui.js'), 'utf8');
        assert.ok(!/addEventListener\(\s*['"]dblclick['"]/.test(src),
            '手牌上又出现了 dblclick 快捷路径：第二次 click 已经打出并重排手牌，dblclick 会把滑进同一 index 的牌再打一次');
        const hand = src.slice(src.indexOf('renderHandCards('));
        const localPlays = (hand.slice(0, hand.indexOf('updateCardSelectionVisuals')).match(/this\.game\.playCard\(/g) || []).length;
        assert.strictEqual(localPlays, 1, `手牌渲染里应当只有一个出牌入口，实际 ${localPlays} 个`);
    });

    await test('祝福候选只来自 GAME_CONFIG，不再维护第二份会漂移的副本', () => {
        const src = fs.readFileSync(path.join(CLIENT_DIR, 'js', 'ui.js'), 'utf8');
        assert.ok(!/烈焰印记|钢铁壁垒|生命源泉/.test(src), 'ui.js 里仍保留硬编码祝福表');
    });

    await test('卡包概率标签读取的是配置里真实存在的小写品质键', () => {
        const src = fs.readFileSync(path.join(CLIENT_DIR, 'js', 'gacha.js'), 'utf8');
        assert.ok(!/rates\??\.(SSR|SR|R|N)\b/.test(src), '仍在按大写品质键读取概率');
        for (const key of ['legendary', 'epic', 'rare', 'common']) {
            assert.ok(src.includes(`'${key}'`), `标签缺少 ${key} 档概率`);
        }
        const rates = global.GAME_CONFIG.gachaPity.rates;
        assert.deepStrictEqual(Object.keys(rates).sort(), ['common', 'epic', 'legendary', 'rare']);
    });

    await test('静态接线审计零告警（无重复 id / 无失效引用 / 无静默失效的选择器）', () => {
        const out = execFileSync(process.execPath,
            [path.join(__dirname, '..', 'tools', 'audit_ui_refs.js')],
            { encoding: 'utf8' });
        const sections = (out.match(/^== /gm) || []).length;
        const clean = (out.match(/\(无\)/g) || []).length;
        assert.ok(sections >= 4, `审计段数异常，工具可能被改坏：\n${out}`);
        assert.strictEqual(clean, sections, `审计存在告警：\n${out}`);
    });

    console.log(`\nUI 回归测试：通过 ${results.passed}，失败 ${results.failures.length}`);
    if (results.failures.length) process.exitCode = 1;
}

main();
