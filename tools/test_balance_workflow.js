// Test script for verifying the entire balance workflow (Friendly edition)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('  BALANCE WORKFLOW TEST SUITE (Friendly Edition)');
console.log('====================================================\n');

// 1. Initial State Verification
console.log('[Test 1] Verifying game_config.js structure...');
const { loadGameRuntime } = require('./load_runtime.js');
loadGameRuntime({ silent: true });

const initialFireWarriorHp = window.HERO_DATABASE['fire_warrior'].hp;
const initialHeavyStrikeDmg = window.CARD_DATABASE.find(c => c.id === 'heavy_strike').damage;
const initialHeavyStrikeCost = window.CARD_DATABASE.find(c => c.id === 'heavy_strike').cost;
const initialSkillCd = window.HERO_DATABASE['fire_warrior'].skill.cooldown;
const initialBurnDuration = window.GAME_CONFIG.statuses['burn'].duration;
const initialPoolCount = window.GAME_CONFIG.cardPools.find(p => p.characterId === 'fire_warrior' && p.cardId === 'heavy_strike').count;

console.log(`  - fire_warrior initial HP: ${initialFireWarriorHp}`);
console.log(`  - heavy_strike initial damage: ${initialHeavyStrikeDmg}`);
console.log(`  - heavy_strike initial cost: ${initialHeavyStrikeCost}`);
console.log(`  - fire_warrior skill CD: ${initialSkillCd}`);
console.log(`  - burn duration: ${initialBurnDuration}`);
console.log(`  - fire_warrior heavy_strike pool count: ${initialPoolCount}`);

if (initialFireWarriorHp !== 96 || initialHeavyStrikeDmg !== 7 || initialHeavyStrikeCost !== 3) {
    throw new Error(`Initial balance values do not match expected baseline! HP=${initialFireWarriorHp}, dmg=${initialHeavyStrikeDmg}, cost=${initialHeavyStrikeCost}`);
}
console.log('  [PASS] Initial state matches baseline.');

// 2. Modify Excel values using header-aware cell updater
console.log('\n[Test 2] Modifying Excel values (HP: 96->100, heavy_strike damage: 7->6, cost: 3->2, skill CD: 2->1, burn duration: 2->3, pool count: 2->4)...');
const modifyPy = `
import openpyxl, os, re

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(project_root, "config", "CardGame_Balance.xlsx")
wb = openpyxl.load_workbook(path)

def get_col_index(ws, key):
    for col in range(1, ws.max_column + 1):
        v = str(ws.cell(1, col).value or "")
        if key.lower() in v.lower():
            return col
    return None

# Characters: fire_warrior HP 96 -> 100
ws_chars = wb["Characters"]
col_cid = get_col_index(ws_chars, "characterId")
col_hp = get_col_index(ws_chars, "maxHp")
for r in range(2, ws_chars.max_row + 1):
    if ws_chars.cell(r, col_cid).value == "fire_warrior":
        ws_chars.cell(r, col_hp, 100)

# Cards: heavy_strike damage 7 -> 6, cost 3 -> 2
ws_cards = wb["Cards"]
col_kid = get_col_index(ws_cards, "cardId")
col_cost = get_col_index(ws_cards, "cost")
col_dmg = get_col_index(ws_cards, "damage")
for r in range(2, ws_cards.max_row + 1):
    if ws_cards.cell(r, col_kid).value == "heavy_strike":
        ws_cards.cell(r, col_cost, 2)
        ws_cards.cell(r, col_dmg, 6)

# Skills: fire_warrior_skill cooldown 2 -> 1
ws_skills = wb["CharacterSkills"]
col_sid = get_col_index(ws_skills, "skillId")
col_cd = get_col_index(ws_skills, "cooldown")
for r in range(2, ws_skills.max_row + 1):
    if ws_skills.cell(r, col_sid).value == "fire_warrior_skill":
        ws_skills.cell(r, col_cd, 1)

# Status: burn duration 2 -> 3
ws_status = wb["StatusEffects"]
col_stat_id = get_col_index(ws_status, "statusId")
col_dur = get_col_index(ws_status, "duration")
for r in range(2, ws_status.max_row + 1):
    if ws_status.cell(r, col_stat_id).value == "burn":
        ws_status.cell(r, col_dur, 3)

# CardPools: fire_warrior heavy_strike count 2 -> 4
ws_pools = wb["CardPools"]
col_pcid = get_col_index(ws_pools, "characterId")
col_pkid = get_col_index(ws_pools, "cardId")
col_pcount = get_col_index(ws_pools, "count")
for r in range(2, ws_pools.max_row + 1):
    if ws_pools.cell(r, col_pcid).value == "fire_warrior" and ws_pools.cell(r, col_pkid).value == "heavy_strike":
        ws_pools.cell(r, col_pcount, 4)

wb.save(path)
print("Modified Excel saved successfully.")
`;
fs.writeFileSync(path.join(__dirname, 'temp_modify.py'), modifyPy, 'utf8');
execSync('python tools/temp_modify.py', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
fs.unlinkSync(path.join(__dirname, 'temp_modify.py'));

// 3. Run sync_balance.py
console.log('\n[Test 3] Running python tools/sync_balance.py...');
execSync('python tools/sync_balance.py', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

// 4. Reload generated JSONs and game objects
console.log('\n[Test 4] Reloading game config and verifying changes take effect...');
loadGameRuntime({ silent: true });

const newHeroHp = window.HERO_DATABASE['fire_warrior'].hp;
const newCardDmg = window.CARD_DATABASE.find(c => c.id === 'heavy_strike').damage;
const newCardCost = window.CARD_DATABASE.find(c => c.id === 'heavy_strike').cost;
const newSkillCd = window.HERO_DATABASE['fire_warrior'].skill.cooldown;
const newBurnDuration = window.GAME_CONFIG.statuses['burn'].duration;
const newPoolCount = window.GAME_CONFIG.cardPools.find(p => p.characterId === 'fire_warrior' && p.cardId === 'heavy_strike').count;

console.log(`  - fire_warrior new HP: ${newHeroHp} (expected: 100)`);
console.log(`  - heavy_strike new damage: ${newCardDmg} (expected: 6)`);
console.log(`  - heavy_strike new cost: ${newCardCost} (expected: 2)`);
console.log(`  - fire_warrior skill CD: ${newSkillCd} (expected: 1)`);
console.log(`  - burn new duration: ${newBurnDuration} (expected: 3)`);
console.log(`  - fire_warrior heavy_strike count: ${newPoolCount} (expected: 4)`);

if (newHeroHp !== 100) throw new Error(`HP check failed: expected 100, got ${newHeroHp}`);
if (newCardDmg !== 6) throw new Error(`Damage check failed: expected 6, got ${newCardDmg}`);
if (newCardCost !== 2) throw new Error(`Cost check failed: expected 2, got ${newCardCost}`);
if (newSkillCd !== 1) throw new Error(`Skill CD check failed: expected 1, got ${newSkillCd}`);
if (newBurnDuration !== 3) throw new Error(`Burn duration check failed: expected 3, got ${newBurnDuration}`);
if (newPoolCount !== 4) throw new Error(`CardPool check failed: expected 4, got ${newPoolCount}`);
console.log('  [PASS] All 6 configuration changes verified in game runtime!');

// 5. Verify In-Game Combat Logic with New Values
console.log('\n[Test 5] Simulating match with updated values...');
const game = new CardGame();
game.initMatch('fire_warrior', 'iron_guardian');

if (game.p1.hp !== 100 || game.p1.maxHp !== 100) {
    throw new Error(`Game P1 starting HP mismatch: expected 100, got ${game.p1.hp}`);
}
console.log(`  - P1 starting HP in actual match: ${game.p1.hp} (verified 100)`);

const heavyCard = window.CARD_DATABASE.find(c => c.id === 'heavy_strike');
game.p1.hand = [{ ...heavyCard }];
game.p1.energy = 4;
const prevTargetHp = game.p2.hp;
game.playCard(0);

const dealt = prevTargetHp - game.p2.hp;
console.log(`  - heavy_strike dealt: ${dealt} dmg (6 base + 1 fire passive - 3 iron passive = 4)`);
if (dealt !== 4) {
    throw new Error(`heavy_strike expected 4 damage dealt to iron_guardian, got ${dealt}`);
}
console.log('  [PASS] Game logic successfully applied modified card damage!');

// 6. Restore original values safely (without wiping ported cards!)
console.log('\n[Test 6] Restoring baseline Excel values...');
const restorePy = `
import openpyxl, os

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(project_root, "config", "CardGame_Balance.xlsx")
wb = openpyxl.load_workbook(path)

def get_col_index(ws, key):
    for col in range(1, ws.max_column + 1):
        v = str(ws.cell(1, col).value or "")
        if key.lower() in v.lower():
            return col
    return None

# Restore Characters: fire_warrior HP -> 96
ws_chars = wb["Characters"]
col_cid = get_col_index(ws_chars, "characterId")
col_hp = get_col_index(ws_chars, "maxHp")
for r in range(2, ws_chars.max_row + 1):
    if ws_chars.cell(r, col_cid).value == "fire_warrior":
        ws_chars.cell(r, col_hp, 96)

# Restore Cards: heavy_strike damage -> 7, cost -> 3
ws_cards = wb["Cards"]
col_kid = get_col_index(ws_cards, "cardId")
col_cost = get_col_index(ws_cards, "cost")
col_dmg = get_col_index(ws_cards, "damage")
for r in range(2, ws_cards.max_row + 1):
    if ws_cards.cell(r, col_kid).value == "heavy_strike":
        ws_cards.cell(r, col_cost, 3)
        ws_cards.cell(r, col_dmg, 7)

# Restore Skills: fire_warrior_skill cooldown -> 2
ws_skills = wb["CharacterSkills"]
col_sid = get_col_index(ws_skills, "skillId")
col_cd = get_col_index(ws_skills, "cooldown")
for r in range(2, ws_skills.max_row + 1):
    if ws_skills.cell(r, col_sid).value == "fire_warrior_skill":
        ws_skills.cell(r, col_cd, 2)

# Restore Status: burn duration -> 2
ws_status = wb["StatusEffects"]
col_stat_id = get_col_index(ws_status, "statusId")
col_dur = get_col_index(ws_status, "duration")
for r in range(2, ws_status.max_row + 1):
    if ws_status.cell(r, col_stat_id).value == "burn":
        ws_status.cell(r, col_dur, 2)

# Restore CardPools: fire_warrior heavy_strike count -> 2
ws_pools = wb["CardPools"]
col_pcid = get_col_index(ws_pools, "characterId")
col_pkid = get_col_index(ws_pools, "cardId")
col_pcount = get_col_index(ws_pools, "count")
for r in range(2, ws_pools.max_row + 1):
    if ws_pools.cell(r, col_pcid).value == "fire_warrior" and ws_pools.cell(r, col_pkid).value == "heavy_strike":
        ws_pools.cell(r, col_pcount, 2)

wb.save(path)
print("Restored Excel saved successfully.")
`;
fs.writeFileSync(path.join(__dirname, 'temp_restore.py'), restorePy, 'utf8');
execSync('python tools/temp_restore.py', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
fs.unlinkSync(path.join(__dirname, 'temp_restore.py'));

execSync('python tools/sync_balance.py', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

loadGameRuntime({ silent: true });

if (window.HERO_DATABASE['fire_warrior'].hp !== 96 || window.CARD_DATABASE.find(c => c.id === 'heavy_strike').damage !== 7) {
    throw new Error('Failed to restore baseline values!');
}
console.log('  [PASS] Baseline values cleanly restored.');

console.log('\n====================================================');
console.log('  ALL TESTS PASSED SUCCESSFULLY!');
console.log('====================================================\n');
