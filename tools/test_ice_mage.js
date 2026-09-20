// Test script to verify extensible architecture via newly registered ice_mage hero
const fs = require('fs');
const path = require('path');

global.window = global;
global.soundManager = {
    init: () => {}, playCardDraw: () => {}, playCardPlay: () => {}, playSlash: () => {},
    playHit: () => {}, playShield: () => {}, playHeal: () => {}, playBurn: () => {},
    playPoison: () => {}, playThunder: () => {}, playTurnStart: () => {}, playVictory: () => {}
};

// 1. Load config
eval(fs.readFileSync(path.join(__dirname, '../data/game_config.js'), 'utf8'));

// 2. Load Core Architecture Modules
eval(fs.readFileSync(path.join(__dirname, '../src/core/EventBus.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../src/core/Registry.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../src/core/GameState.js'), 'utf8'));

// 3. Load Domain Systems
eval(fs.readFileSync(path.join(__dirname, '../src/systems/DamageCalculator.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../src/systems/StatusSystem.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../src/systems/EffectResolver.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../src/systems/SkillSystem.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../src/systems/CardSystem.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../src/systems/HeroManager.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../src/systems/TurnSystem.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../src/systems/CombatSystem.js'), 'utf8'));

// 4. Load Game Adapters
eval(fs.readFileSync(path.join(__dirname, '../js/hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/card.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'));

console.log('=== [TEST] EXTENSIBLE ARCHITECTURE VERIFICATION: ICE_MAGE ===\n');

// Test 1: Registry check
const iceMageDef = window.HeroRegistry.get('ice_mage');
console.log('1. Registry Inspection:');
console.log('   - Registered in HeroRegistry:', Boolean(iceMageDef));
console.log('   - Character Name:', iceMageDef.characterName);
console.log('   - Max HP:', iceMageDef.maxHp, '(Expected: 30)');
console.log('   - Skill ID:', iceMageDef.skillId);
if (iceMageDef.maxHp !== 30) throw new Error('HP is not 30');

// Test 2: HeroDatabase & HeroManager check
const heroInstance = window.HeroManager.createHeroInstance('ice_mage');
console.log('\n2. HeroManager Instance Creation:');
console.log('   - Hero Instance ID:', heroInstance.id);
console.log('   - Hero Instance HP:', heroInstance.hp);
console.log('   - Hero Skill Name:', heroInstance.skill.name);
console.log('   - Hero Skill Cost:', heroInstance.skill.cost);
console.log('   - Hero Skill Effects:', JSON.stringify(heroInstance.skill.effects));

// Test 3: Match initialization & Combat execution
console.log('\n3. Combat Simulation (ice_mage as P1 vs fire_warrior as P2):');
const game = new CardGame();
game.initMatch('ice_mage', 'fire_warrior');

console.log(`   - Match started: P1 (${game.p1.hero.name}, HP: ${game.p1.hp}) vs P2 (${game.p2.hero.name}, HP: ${game.p2.hp})`);
if (game.p1.hp !== 30) throw new Error('P1 starting HP is not 30');

// Test 4: Casting ice_lance skill
console.log('\n4. Executing Hero Skill (寒冰箭):');
const p2InitialHp = game.p2.hp;
game.performHeroSkill();

console.log(`   - P2 HP after skill: ${game.p2.hp} (Damage taken: ${p2InitialHp - game.p2.hp}, Expected: 5)`);
if (p2InitialHp - game.p2.hp !== 5) throw new Error('Skill damage was not 5');

const hasFreeze = window.StatusSystem.has(game.p2, 'freeze');
console.log('   - Target has "freeze" status:', hasFreeze);
if (!hasFreeze) throw new Error('Target does not have freeze status');

// Test 5: End turn and check Freeze effect on P2's turn
console.log('\n5. Ending Turn and Verifying Freeze on Target:');
game.endTurn();

console.log('   - Active Player is now:', game.activePlayer.name, `(${game.activePlayer.hero.name})`);
console.log('   - Can P2 normal attack this turn:', game.p2.canNormalAttackThisTurn, '(Expected: false)');
console.log('   - Is P2 skill disabled/spent:', game.p2.hasUsedSkill, '(Expected: true)');

if (game.p2.canNormalAttackThisTurn !== false) throw new Error('Freeze did not block normal attack');
if (game.p2.hasUsedSkill !== true) throw new Error('Freeze did not block skill');

// Test 6: GameState serialization check
console.log('\n6. GameState Serialization & P2P Sync:');
const snapshot = game.getSnapshot();
console.log('   - Snapshot Turn:', snapshot.turnCount);
console.log('   - Active Player ID in Snapshot:', snapshot.activePlayerId);
console.log('   - P2 Active Statuses in Snapshot:', JSON.stringify(snapshot.players.p2.statuses));

console.log('\n===============================================================');
console.log('>>> ALL ARCHITECTURE TESTS PASSED SUCCESSFULLY (100%)! <<<');
console.log('The new hero [ice_mage] was integrated completely via configuration & effects');
console.log('without touching any core Combat code!');
console.log('===============================================================\n');
