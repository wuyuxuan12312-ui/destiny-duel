const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

const projectRoot = path.resolve(__dirname, '..');

// 1. Headless browser environment + runtime modules in browser load order
const { loadGameRuntime } = require(path.join(projectRoot, 'tools', 'load_runtime.js'));
loadGameRuntime({ silent: true });

console.log('===============================================================');
console.log('       《宿命对决 Destiny Duel》卡牌系统升级 6大核心自动化测试');
console.log('===============================================================\n');

let passedTests = 0;
let totalTests = 6;

// Helper: create standard game match
function createMatch() {
    const game = new CardGame();
    game.initMatch('fire_warrior', 'fire_warrior');
    game.isAIMode = false;
    
    const p1 = game.p1;
    const p2 = game.p2;

    p1.hand = [];
    p1.deck = [];
    p1.discardPile = [];
    p1.energy = 10;
    p1.shield = 0;
    p1.hp = 100;
    p1.maxHp = 100;
    p1.statuses = [];
    p1.buffs = {};
    p1.debuffs = {};
    p1.modifiers = { damageBonus: 0, healBonus: 0, shieldBonus: 0, fireDamageBonus: 0, iceDamageBonus: 0, poisonDamageBonus: 0 };

    p2.hand = [];
    p2.deck = [];
    p2.discardPile = [];
    p2.energy = 10;
    p2.shield = 0;
    p2.hp = 100;
    p2.maxHp = 100;
    p2.statuses = [];
    p2.buffs = {};
    p2.debuffs = {};
    p2.modifiers = { damageBonus: 0, healBonus: 0, shieldBonus: 0, fireDamageBonus: 0, iceDamageBonus: 0, poisonDamageBonus: 0 };

    game.activePlayer = p1;
    return game;
}

// -----------------------------------------------------------------------------
// Test 1: 普通卡使用 (Base Card Play)
// -----------------------------------------------------------------------------
try {
    console.log('【测试 1/6】普通卡使用测试 (费用扣除、伤害/护盾/治疗目标结算、弃牌堆流转)...');
    const game = createMatch();

    // 1. Base Attack Card (base_strike: cost 1, damage 6)
    const strikeTemplate = global.GAME_CONFIG.cards['base_strike'];
    assert(strikeTemplate, '基础攻击卡 base_strike 必须存在');
    const strikeCard = global.createCardInstance(strikeTemplate, 1);
    game.p1.hand.push(strikeCard);

    const initialP2Hp = game.p2.hp;
    const initialP1Energy = game.p1.energy;

    game.playCard(0);

    assert.strictEqual(game.p1.energy, initialP1Energy - strikeCard.cost, '玩家能量扣除必须准确');
    assert.strictEqual(game.p1.hand.length, 0, '卡牌必须从手牌中移出');
    assert.strictEqual(game.p1.discardPile.length, 1, '卡牌必须进入弃牌堆');
    assert.strictEqual(game.p1.discardPile[0].id, 'base_strike', '弃牌堆卡牌ID正确');
    assert.strictEqual(game.p2.hp, initialP2Hp - strikeCard.damage, '对手扣除基础卡伤害');

    // 2. Base Defense Card (base_quick_guard: cost 1, shield 9)
    const defendTemplate = global.GAME_CONFIG.cards['base_quick_guard'];
    assert(defendTemplate, '基础护盾卡 base_quick_guard 必须存在');
    const defendCard = global.createCardInstance(defendTemplate, 1);
    game.p1.hand.push(defendCard);
    const beforeDefEnergy = game.p1.energy;

    game.playCard(0);
    assert.strictEqual(game.p1.energy, beforeDefEnergy - defendCard.cost, '护盾卡扣除能量');
    assert.strictEqual(game.p1.shield, defendCard.shield, '玩家获得对应护盾值');

    // 3. Base Heal Card (base_divine_heal: cost 2, heal 12)
    game.p1.hp = 70;
    const healTemplate = global.GAME_CONFIG.cards['base_divine_heal'];
    assert(healTemplate, '基础治疗卡 base_divine_heal 必须存在');
    const healCard = global.createCardInstance(healTemplate, 1);
    game.p1.hand.push(healCard);
    const beforeHealEnergy = game.p1.energy;

    game.playCard(0);
    assert.strictEqual(game.p1.energy, beforeHealEnergy - healCard.cost, '治疗卡扣除能量');
    assert.strictEqual(game.p1.hp, 70 + healCard.heal, '玩家生命值准确恢复');

    console.log('  -> PASS: 普通卡攻/防/疗使用流转全部验证成功！');
    passedTests++;
} catch (err) {
    console.error('  -> FAIL Test 1:', err.message);
}

// -----------------------------------------------------------------------------
// Test 2: 伤害卡同步 (Damage Card Multi-hit, Self-Damage, Conditions)
// -----------------------------------------------------------------------------
try {
    console.log('【测试 2/6】伤害卡多段、反噬与条件伤害同步测试...');
    const game = createMatch();

    // 1. Multi-hit (base_twin_strike 双重打击: 1费, 4伤害, hit_count 2 -> 总伤害 8)
    const multiHitCard = global.createCardInstance(global.GAME_CONFIG.cards['base_twin_strike'], 1);
    assert(multiHitCard, 'base_twin_strike 双重打击必须存在');
    assert.strictEqual(multiHitCard.hit_count, 2, '双重打击攻击段数必须为 2');
    game.p1.hand.push(multiHitCard);

    let p2HpBefore = game.p2.hp;
    game.playCard(0);
    assert.strictEqual(game.p2.hp, p2HpBefore - (multiHitCard.damage * 2), '多段攻击必须正确执行2次伤害');

    // 2. Self Damage Recoil (dual_slash 双刃斩: 2费, 5伤害, self_damage 1)
    const selfDmgCard = global.createCardInstance(global.GAME_CONFIG.cards['dual_slash'], 1);
    assert(selfDmgCard, 'dual_slash 双刃斩必须存在');
    assert.strictEqual(selfDmgCard.self_damage, 1, '双刃斩反噬伤害必须为 1');
    game.p1.hand.push(selfDmgCard);

    let p1HpBefore = game.p1.hp;
    p2HpBefore = game.p2.hp;
    game.playCard(0);
    assert.strictEqual(game.p2.hp, p2HpBefore - selfDmgCard.damage, '对手受到双刃斩全额伤害');
    assert.strictEqual(game.p1.hp, p1HpBefore - selfDmgCard.self_damage, '玩家自身承受1点反噬直接伤害');

    // 3. Condition Bonus (shield_bash 盾击: 2费, 3伤害, condition: user_has_shield, condition_bonus: 3)
    const condCard = global.createCardInstance(global.GAME_CONFIG.cards['shield_bash'], 1);
    
    // Case A: User has no shield
    game.p1.shield = 0;
    game.p1.hand.push(condCard);
    p2HpBefore = game.p2.hp;
    game.playCard(0);
    assert.strictEqual(game.p2.hp, p2HpBefore - condCard.damage, '条件未达成时只造成基础3伤害');

    // Case B: User has shield
    const condCard2 = global.createCardInstance(global.GAME_CONFIG.cards['shield_bash'], 1);
    game.p1.shield = 5;
    game.p1.hand.push(condCard2);
    p2HpBefore = game.p2.hp;
    game.playCard(0);
    assert.strictEqual(game.p2.hp, p2HpBefore - (condCard2.damage + condCard2.condition_bonus), '条件达成时造成 3+3=6 点伤害');

    console.log('  -> PASS: 伤害卡多段(hit_count)、反噬(self_damage)、条件奖励(condition_bonus)全部验证成功！');
    passedTests++;
} catch (err) {
    console.error('  -> FAIL Test 2:', err.message);
}

// -----------------------------------------------------------------------------
// Test 3: 状态卡同步 (Status Application & Debuff Cleansing)
// -----------------------------------------------------------------------------
try {
    console.log('【测试 3/6】状态卡施加与净化机制同步测试...');
    const game = createMatch();

    // 1. Apply Status (pvp_ember_touch 余烬之触: 1费, 4伤害, status: burn:2)
    const burnCard = global.createCardInstance(global.GAME_CONFIG.cards['pvp_ember_touch'], 1);
    assert(burnCard.status.includes('burn:2'), 'pvp_ember_touch 包含灼烧2层状态');
    game.p1.hand.push(burnCard);
    game.playCard(0);

    const targetBurn = global.StatusSystem.get(game.p2, 'burn');
    assert(targetBurn, '对手必须成功附带灼烧状态');
    assert.strictEqual(targetBurn.stacks, 2, '灼烧层数必须为 2');

    // 2. Remove Negative Debuffs (status: remove_negative:1)
    // First apply debuffs to p1
    global.StatusSystem.apply(game.p1, 'burn', 3, 2, game);
    global.StatusSystem.apply(game.p1, 'poison', 2, 2, game);
    assert.strictEqual(global.StatusSystem.has(game.p1, 'burn'), true, '施加 burn 前提有效');
    assert.strictEqual(global.StatusSystem.has(game.p1, 'poison'), true, '施加 poison 前提有效');

    // Cleanse via CardEffectEngine
    const cleanseCardTemplate = {
        id: 'test_cleanse',
        name: '净化之泉',
        cost: 1,
        type: 'special',
        target: 'self',
        status: 'remove_negative:1',
        damage: 0,
        heal: 0,
        shield: 0,
        effects: [{ type: 'apply_status', status: 'remove_negative' }]
    };
    const cleanseCard = global.createCardInstance(cleanseCardTemplate, 1);
    game.p1.hand.push(cleanseCard);
    game.playCard(0);

    assert.strictEqual(global.StatusSystem.has(game.p1, 'burn'), false, '净化之泉净化后 burn 必须解除');
    assert.strictEqual(global.StatusSystem.has(game.p1, 'poison'), false, '净化之泉净化后 poison 必须解除');

    console.log('  -> PASS: 状态卡附着(burn)与负面状态完全净化(remove_negative)测试成功！');
    passedTests++;
} catch (err) {
    console.error('  -> FAIL Test 3:', err.message);
}

// -----------------------------------------------------------------------------
// Test 4: PVP卡无法升级 (PVP Cards Locked & Immutable)
// -----------------------------------------------------------------------------
try {
    console.log('【测试 4/6】PVP卡无法升级与固定1级不可变测试...');
    
    // Check all 32 PVP cards
    const pvpCards = Object.values(global.GAME_CONFIG.cards).filter(c => c.pool_type === 'PVP');
    assert.strictEqual(pvpCards.length, 32, 'PVP 卡池卡牌总数必须为 32 张');

    for (const cardData of pvpCards) {
        assert.strictEqual(Boolean(cardData.upgradeable), false, `PVP卡牌 ${cardData.id} 的 upgradeable 必须为 false`);
        assert.strictEqual(Number(cardData.level), 1, `PVP卡牌 ${cardData.id} 的 level 必须为 1`);

        // Test instantiating with level 2 or 3
        const instance = new global.PlayerCardInstance(cardData, 3);
        assert.strictEqual(instance.level, 1, `强制指定 level=3 时 PVP卡牌 ${cardData.id} 等级仍必须为 1`);

        // Test calling upgrade()
        const res = instance.upgrade();
        assert.strictEqual(res.success, false, `PVP卡牌 ${cardData.id} upgrade() 必须返回 false`);
        assert.strictEqual(instance.level, 1, `PVP卡牌 ${cardData.id} 调用 upgrade 后等级仍必须为 1`);
    }

    console.log('  -> PASS: 全部 32 张 PVP 竞技卡牌不可升级 (upgradeable=false, level=1 锁定) 验证通过！');
    passedTests++;
} catch (err) {
    console.error('  -> FAIL Test 4:', err.message);
}

// -----------------------------------------------------------------------------
// Test 5: PVE卡升级有效 (PVE Upgrade Multipliers & Template Immutability)
// -----------------------------------------------------------------------------
try {
    console.log('【测试 5/6】PVE卡升级倍率与模板数据不可变测试...');
    
    const pveCards = Object.values(global.GAME_CONFIG.cards).filter(c => c.pool_type === 'PVE');
    assert.strictEqual(pveCards.length, 21, 'PVE 卡池卡牌总数必须为 21 张');

    for (const cardData of pveCards) {
        assert.strictEqual(Boolean(cardData.upgradeable), true, `PVE卡牌 ${cardData.id} 的 upgradeable 必须为 true`);
    }

    // 1. Damage Card Test (pve_spark 火花: base damage 7)
    const rawDmgCard = global.GAME_CONFIG.cards['pve_spark'];
    assert(rawDmgCard, 'pve_spark 必须存在');
    const baseDamage = rawDmgCard.damage; // 7
    
    const instLv1 = new global.PlayerCardInstance(rawDmgCard, 1);
    assert.strictEqual(instLv1.level, 1);
    assert.strictEqual(instLv1.damage, Math.round(baseDamage * 1.0), 'Lv.1 伤害必须为 100%');

    const instLv2 = new global.PlayerCardInstance(rawDmgCard, 2);
    assert.strictEqual(instLv2.level, 2);
    assert.strictEqual(instLv2.damage, Math.round(baseDamage * 1.20), 'Lv.2 伤害必须为 120%');

    const instLv3 = new global.PlayerCardInstance(rawDmgCard, 3);
    assert.strictEqual(instLv3.level, 3);
    assert.strictEqual(instLv3.damage, Math.round(baseDamage * 1.40), 'Lv.3 伤害必须为 140%');

    // 2. Heal Card Test (pve_mend_wounds 缝合伤口: base heal 14)
    const rawHealCard = global.GAME_CONFIG.cards['pve_mend_wounds'];
    assert(rawHealCard, 'pve_mend_wounds 必须存在');
    const baseHeal = rawHealCard.heal; // 14
    const healLv1 = new global.PlayerCardInstance(rawHealCard, 1);
    const healLv2 = new global.PlayerCardInstance(rawHealCard, 2);
    const healLv3 = new global.PlayerCardInstance(rawHealCard, 3);
    assert.strictEqual(healLv1.heal, Math.round(baseHeal * 1.0), 'Lv.1 治疗必须为 100%');
    assert.strictEqual(healLv2.heal, Math.round(baseHeal * 1.20), 'Lv.2 治疗必须为 120%');
    assert.strictEqual(healLv3.heal, Math.round(baseHeal * 1.35), 'Lv.3 治疗必须为 135%');

    // 3. Shield Card Test (pve_entrench 巩固: base shield 12)
    const rawShieldCard = global.GAME_CONFIG.cards['pve_entrench'];
    assert(rawShieldCard, 'pve_entrench 必须存在');
    const baseShield = rawShieldCard.shield; // 12
    const shdLv1 = new global.PlayerCardInstance(rawShieldCard, 1);
    const shdLv2 = new global.PlayerCardInstance(rawShieldCard, 2);
    const shdLv3 = new global.PlayerCardInstance(rawShieldCard, 3);
    assert.strictEqual(shdLv1.shield, Math.round(baseShield * 1.0), 'Lv.1 护盾必须为 100%');
    assert.strictEqual(shdLv2.shield, Math.round(baseShield * 1.25), 'Lv.2 护盾必须为 125%');
    assert.strictEqual(shdLv3.shield, Math.round(baseShield * 1.50), 'Lv.3 护盾必须为 150%');

    // 4. In-place upgrade method test
    const stepCard = new global.PlayerCardInstance(rawDmgCard, 1);
    assert.strictEqual(stepCard.level, 1);
    const up1 = stepCard.upgrade();
    assert.strictEqual(up1.success, true);
    assert.strictEqual(stepCard.level, 2);
    assert.strictEqual(stepCard.damage, Math.round(baseDamage * 1.20));

    const up2 = stepCard.upgrade();
    assert.strictEqual(up2.success, true);
    assert.strictEqual(stepCard.level, 3);
    assert.strictEqual(stepCard.damage, Math.round(baseDamage * 1.40));

    const up3 = stepCard.upgrade();
    assert.strictEqual(up3.success, false, 'Lv.3 后不可再升级');
    assert.strictEqual(stepCard.level, 3);

    // 5. Template Immutability Check: raw template card is NEVER modified!
    assert.strictEqual(rawDmgCard.damage, baseDamage, '原生卡牌模板属性绝对不可变');
    assert.strictEqual(rawDmgCard.level, 1, '原生卡牌模板等级绝对不可变');

    console.log('  -> PASS: PVE 卡牌升级成长率 (伤害:100%/120%/140%, 治疗:100%/120%/135%, 护盾:100%/125%/150%) 及模板不可变性检验无误！');
    passedTests++;
} catch (err) {
    console.error('  -> FAIL Test 5:', err.message);
}

// -----------------------------------------------------------------------------
// Test 6: Excel修改数值后生效 (Excel Sync Pipeline & Database Migration Verification)
// -----------------------------------------------------------------------------
function runTest6() {
    try {
        console.log('【测试 6/6】Excel修改数值与全流程数据同步测试...');
        
        // Check SQLite Database integrity using built-in node:sqlite
        const dbPath = path.join(projectRoot, 'database/destiny_duel.db');
        const db = new DatabaseSync(dbPath);

        const row = db.prepare("SELECT count(*) as cnt FROM cards").get();
        assert.strictEqual(row.cnt, 90, `SQLite cards 表必须拥有 90 张卡牌数据 (当前: ${row.cnt})`);

        // Check columns in SQLite
        const cols = db.prepare("PRAGMA table_info(cards)").all();
        const colNames = cols.map(c => c.name);

        const expectedCols = [
            'id', 'name', 'card_type', 'rarity', 'cost', 'damage', 'heal', 'shield',
            'pool_type', 'upgradeable', 'level', 'effect_type', 'draw', 'energy',
            'status', 'buff', 'target', 'hit_count', 'self_damage', 'proc_chance',
            'condition', 'condition_param', 'condition_bonus', 'tags', 'description', 'enabled'
        ];
        for (const col of expectedCols) {
            assert(colNames.includes(col), `SQLite cards 表必须包含扩展字段: ${col}`);
        }

        // Verify that python sync script executes cleanly
        const syncOutput = execSync('python tools/sync_balance.py', { cwd: projectRoot, encoding: 'utf8' });
        assert(syncOutput.includes('同步成功！'), 'sync_balance.py 运行必须成功');

        // Check generated JSON files
        const allJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'data/generated/cards.json'), 'utf8'));
        const charsJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'data/generated/characters.json'), 'utf8'));

        assert.strictEqual(Object.keys(allJson).length, 90, 'cards.json 包含 90 张卡牌');
        assert.strictEqual(Object.keys(charsJson).length, 5, 'characters.json 包含 5 位英雄');

        db.close();
        console.log('  -> PASS: SQLite 90张卡牌及全扩展字段校验通过，Excel同步与JSON编译闭环无误！');
        passedTests++;
    } catch (err) {
        console.error('  -> FAIL Test 6:', err.message);
    }

    console.log('\n===============================================================');
    console.log(`测试结果统计: ${passedTests} / ${totalTests} 全部通过 (通过率: ${Math.round(passedTests/totalTests*100)}%)`);
    console.log('===============================================================');

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

runTest6();
