// Headless validation of the ported content: loads the real runtime modules in the same
// global-script order the browser uses, then asserts the ported dataset is coherent.
const path = require('path');
const { loadGameRuntime, CLIENT_DIR } = require(path.join(__dirname, '..', 'tools', 'load_runtime.js'));

loadGameRuntime({ silent: true });


let failures = 0;
const fail = (msg) => { failures++; console.log('  ✗ ' + msg); };
const ok = (msg) => console.log('  ✓ ' + msg);

const cfg = global.GAME_CONFIG;
const cards = global.CARD_DATABASE;

console.log('\n== 数据集规模 ==');
console.log(`  GAME_CONFIG.cards ${Object.keys(cfg.cards).length} / CARD_DATABASE ${cards.length}`
    + ` / 卡池 Base ${(global.BASE_CARDS || []).length} PVP ${(global.PVP_CARDS || []).length} PVE ${(global.PVE_CARDS || []).length}`);
if (cards.length < 85) fail('卡牌数过少，移植未生效');
if ((global.PVE_CARDS || []).length !== 21) fail('PVE 卡池应为 21 张，实际 ' + (global.PVE_CARDS || []).length);
if ((global.PVP_CARDS || []).length !== 32) fail('PVP 卡池应为 32 张，实际 ' + (global.PVP_CARDS || []).length);

console.log('\n== 卡牌 schema 完整性 ==');
const seenNames = new Map();
const statusIds = new Set(Object.keys(cfg.statuses || {}));
for (const c of cards) {
    const src = cfg.cards[c.id];
    if (!c.name || c.name === c.id) fail(`${c.id} 缺少卡名`);
    if (seenNames.has(c.name)) fail(`卡名重复: ${c.name} (${seenNames.get(c.name)} / ${c.id})`);
    else seenNames.set(c.name, c.id);
    if (!(c.cost >= 0 && c.cost <= 5)) fail(`${c.id} 费用越界 ${c.cost}`);
    if (!['common', 'rare', 'epic', 'legendary'].includes(c.rarity)) fail(`${c.id} 稀有度非法 ${c.rarity}`);
    if (!['Base', 'PVP', 'PVE'].includes(c.pool_type)) fail(`${c.id} 卡池非法 ${c.pool_type}`);
    if (!['attack', 'defense', 'heal', 'skill', 'special'].includes(c.type)) fail(`${c.id} 类型非法 ${c.type}`);
    if (c.status && !statusIds.has(c.status.split(':')[0])) fail(`${c.id} 引用了不存在的状态 ${c.status}`);
    const hasAnything = [c.damage, c.shield, c.heal, c.draw, c.energy].some(v => Number(v) !== 0)
        || c.status || c.buff || (c.then_effects || []).length || (c.effects || []).length;
    if (!hasAnything) fail(`${c.id} 是没有任何效果的空卡（移植丢字段）`);
    if (c.pool_type === 'PVP' && c.upgradeable) fail(`${c.id} PVP 卡不应可升级`);
    if (['pierce', 'steal', 'energy_surge', 'dual_slash', 'flame_flask'].includes(c.id) && !c._legacyChecked) {
        console.log(`  · 旧卡 ${c.id}: dmg${c.damage} shd${c.shield} buff"${c.buff}" cond"${c.condition}" bonus${c.condition_bonus}`);
    }
}
ok(`校验 ${cards.length} 张卡的字段`);

console.log('\n== 机制字段落位 ==');
const branched = cards.filter(c => (c.then_effects || []).length);
console.log(`  带分支/态势判定 ${branched.length} 张，多段 ${cards.filter(c => c.hit_count > 1).length} 张，`
    + `自伤 ${cards.filter(c => c.self_damage > 0).length} 张，带反应触发 ${cards.filter(c => c.reaction).length} 张，`
    + `附带状态 ${cards.filter(c => c.status).length} 张`);
if (branched.length < 16) fail(`分支卡应 16 张，实际 ${branched.length}`);
for (const c of branched) {
    if (!c.condition) fail(`${c.id} 有 then_effects 却没有 condition`);
}
const judg = cards.find(c => c.id === 'base_execute_judgment');
if (judg) {
    console.log(`  · base_execute_judgment → cond "${judg.condition}" then ${JSON.stringify(judg.then_effects)} else ${JSON.stringify(judg.else_effects)}`);
    if (judg.condition !== 'target_hp_below' || judg.condition_param !== 40) fail('处刑判决分支条件映射错误');
}
const react = cards.find(c => c.reaction);
if (react) console.log(`  · ${react.id} reaction → ${JSON.stringify(react.reaction)}`);
else fail('没有任何卡带反应触发（base_retaliation_shield 应带）');
const twin = cards.find(c => c.id === 'base_twin_strike');
if (twin && twin.hit_count !== 2) fail('base_twin_strike 段数应为 2');

console.log('\n== 首领卡组的自身向效果（引擎必须无视 target 只给自己）==');
// Cards like pve_combust legitimately carry target=enemy (the Burn goes to the foe) while
// also granting themselves a shield. Routing is enforced at runtime, see test_pve_battle.js.
const hybrid = cards.filter(c => c.target === 'enemy' && (Number(c.shield) > 0 || Number(c.heal) > 0));
console.log(`  · 混合指向卡牌 ${hybrid.length} 张: ${hybrid.map(c => c.id).join(', ') || '无'}`);

console.log('\n== 规则键与引擎读取一致 ==');
const readKeys = ['initial_hand_size', 'max_hand_size', 'turn_draw_count', 'max_shield',
    'rising_fury_start_round', 'rising_fury_damage_step', 'max_energy', 'initial_energy',
    'shield_decay_ratio', 'energy_refill_mode', 'max_burst_damage_limit', 'pve_max_stage'];
const game = new global.CardGame();
for (const k of readKeys) {
    const inCfg = cfg.gameRules[k] !== undefined;
    console.log(`  ${inCfg ? '✓' : '✗'} getRule('${k}') → ${game.getRule(k, '<<缺失回落默认值>>')}`);
    if (!inCfg) fail(`规则 ${k} 不在 gameRules 中，getRule 会静默回落`);
}

console.log('\n== 英雄与技能 ==');
for (const [id, ch] of Object.entries(cfg.characters)) {
    console.log(`  · ${id} ${ch.characterName} HP${ch.maxHp} 能量${ch.startingEnergy}/${ch.maxEnergy} enabled=${ch.enabled}`);
}

console.log('\n== PVE 关卡与首领卡组合法性 ==');
if (!Array.isArray(cfg.pveStages) || cfg.pveStages.length !== 4) fail('pveStages 应为 4 关');
const byId = new Map(cards.map(c => [c.id, c]));
for (const st of cfg.pveStages || []) {
    const total = st.enemyDeck.reduce((n, e) => n + e.count, 0);
    const bad = [];
    if (total !== 15) bad.push(`张数 ${total}≠15`);
    for (const e of st.enemyDeck) {
        const card = byId.get(e.cardId);
        if (!card) bad.push(`引用不存在的卡 ${e.cardId}`);
        else if (card.pool_type === 'PVP') bad.push(`PVE 战使用了 PVP 池卡 ${e.cardId}`);
        if (e.count > 2) bad.push(`${e.cardId} 超出 2 份上限 (${e.count})`);
    }
    const rewardOk = !st.firstClearRewardCardId || byId.has(st.firstClearRewardCardId);
    if (!rewardOk) bad.push(`首通奖励卡 ${st.firstClearRewardCardId} 不存在`);
    console.log(`  ${bad.length ? '✗' : '✓'} ${st.stageCode} ${st.stageName} | ${st.enemyName} HP${st.enemyMaxHp}`
        + ` | 卡组 ${total} 张 | 首通 ${st.firstClearRewardGold}金/${st.firstClearRewardGems}宝石/${st.firstClearRewardCardId}`
        + (bad.length ? ' → ' + bad.join('; ') : ''));
    if (bad.length) failures += 1;
}
// Unity shipped 80/120/160/260, which measured as unwinnable-to-trivial against the ported
// engine; the shipped ladder was re-derived from win rates (see tests/test_pve_battle.js).
const hpLadder = (cfg.pveStages || []).map(s => s.enemyMaxHp).join('/');
if (hpLadder !== '120/150/208/198') fail(`首领生命与标定曲线不符，实际 ${hpLadder}`);
const goldTotal = (cfg.pveStages || []).reduce((n, s) => n + s.firstClearRewardGold, 0);
if (goldTotal !== 2000) fail(`首通金币合计应为 2000，实际 ${goldTotal}`);

console.log('\n== 卡池起始卡组 (CardPools) 可解析 ==');
const poolByHero = {};
for (const p of cfg.cardPools || []) {
    (poolByHero[p.characterId] = poolByHero[p.characterId] || []).push(p);
}
for (const [hero, entries] of Object.entries(poolByHero)) {
    const total = entries.reduce((n, e) => n + e.count, 0);
    const missing = entries.filter(e => !byId.has(e.cardId));
    const over = entries.filter(e => e.count > 2);
    console.log(`  ${total === 15 && !missing.length && !over.length ? '✓' : '✗'} ${hero}: ${entries.length} 种 / ${total} 张`
        + (missing.length ? ` — 解析不到 ${missing.map(m => m.cardId).join(',')}` : '')
        + (over.length ? ` — 超 2 份 ${over.map(o => o.cardId).join(',')}` : ''));
    if (total !== 15) fail(`${hero} 初始卡组 ${total} 张，不符合 15 张规则`);
    if (missing.length) fail(`${hero} 初始卡组引用了不存在的卡牌`);
    if (over.length) fail(`${hero} 初始卡组单卡超过 2 份`);
}
if (poolByHero['hero_0006']) fail('脏英雄 hero_0006 仍在卡池中');
if (Object.keys(cfg.characters).some(id => id.startsWith('hero_0'))) fail('角色表仍有后台误建英雄');
const deck = global.createShuffledDeck('fire_warrior');
console.log(`  createShuffledDeck('fire_warrior') → ${deck.length} 张`);
if (deck.length !== 15) fail(`默认构筑应为 15 张，实际 ${deck.length}`);
if (deck.some(c => !c.name || c.name === c.id)) fail('构筑中出现未解析卡牌');
// LEGACY_CARD_MAP must not silently retarget a surviving legacy id onto a ported card.
const pierceCard = deck.find(c => c.id === 'pierce') || cards.find(c => c.id === 'pierce');
if (pierceCard && pierceCard.damage !== cfg.cards.pierce.damage) fail('pierce 被重定向到了别的卡');
const sampled = global.createShuffledDeck('lightning_assassin').map(c => c.id);
if (sampled.includes('pvp_shield_breaker') && !sampled.includes('pierce')) {
    fail('lightning_assassin 的 pierce 被旧映射换成了 pvp_shield_breaker');
}
console.log(`  旧卡 pierce 伤害 ${cfg.cards.pierce.damage}，构筑解析后 ${pierceCard ? pierceCard.damage : 'n/a'}`);

console.log('\n' + (failures ? `✗ 校验失败 ${failures} 项` : '✓ 全部校验通过'));
process.exit(failures ? 1 : 0);
