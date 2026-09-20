// Destiny Duel - Database Initialization & Seed Script
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const projectRoot = path.resolve(__dirname, '..');
const dbDir = path.join(projectRoot, 'database');
const dbPath = path.join(dbDir, 'destiny_duel.db');
const schemaPath = path.join(dbDir, 'schema.sql');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

console.log('====================================================');
console.log('   Destiny Duel - SQLite Database Initializer       ');
console.log('====================================================');
console.log(`Database path: ${dbPath}`);

const db = new DatabaseSync(dbPath);

// 1. Run Schema
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);
console.log('✅ Schema tables verified/created successfully.');

// 2. Load baseline game configuration
global.window = global;
require(path.join(projectRoot, 'data', 'game_config.js'));
const config = global.GAME_CONFIG || {};

// Password hashing helper (SHA-256 + salt)
function hashPassword(password, salt) {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// 3. Seed Admin User
const checkAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?');
const existingAdmin = checkAdmin.get('admin');
if (!existingAdmin) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword('admin888', salt);
    const insertAdmin = db.prepare('INSERT INTO admin_users (username, password_hash, salt) VALUES (?, ?, ?)');
    insertAdmin.run('admin', hash, salt);
    console.log('✅ Admin user seeded: username=admin, default_password=admin888');
}

// 4. Seed Game Rules
if (config.gameRules) {
    const insertRule = db.prepare(`
        INSERT INTO game_rules (id, name, value, description)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            value = excluded.value,
            description = excluded.description
    `);
    for (const [id, r] of Object.entries(config.gameRules)) {
        insertRule.run(id, r.name || id, Number(r.value || 0), r.description || '');
    }
    console.log(`✅ Game rules seeded: ${Object.keys(config.gameRules).length} rules.`);
}

// 5. Seed Heroes
if (config.characters) {
    const insertHero = db.prepare(`
        INSERT INTO heroes (id, name, role, max_hp, base_attack, starting_energy, max_energy, passive_id, skill_id, avatar_url, description, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            role = excluded.role,
            max_hp = excluded.max_hp,
            base_attack = excluded.base_attack,
            avatar_url = excluded.avatar_url,
            description = excluded.description
    `);

    for (const [id, c] of Object.entries(config.characters)) {
        let avatar = c.avatar || '';
        if (!avatar) {
            const charImg = `assets/characters/${id}.png`;
            if (fs.existsSync(path.join(projectRoot, charImg))) {
                avatar = charImg;
            }
        }
        insertHero.run(
            id,
            c.characterName || c.name || id,
            c.role || '综合型',
            Number(c.maxHp || c.hp || 30),
            Number(c.baseAttack || c.attack || 4),
            Number(c.startingEnergy || 3),
            Number(c.maxEnergy || 6),
            c.passiveId || `${id}_passive`,
            c.skillId || `${id}_skill`,
            avatar,
            c.description || '',
            c.enabled !== false ? 1 : 0
        );
    }
    console.log(`✅ Heroes seeded: ${Object.keys(config.characters).length} heroes.`);
}

// 6. Seed Skills
if (config.skills) {
    const insertSkill = db.prepare(`
        INSERT INTO skills (id, hero_id, name, skill_type, cost, cooldown, damage, heal, shield, duration, effect_type1, effect_val1, effect_type2, effect_val2, effect_id, icon_url, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            cost = excluded.cost,
            cooldown = excluded.cooldown,
            damage = excluded.damage,
            heal = excluded.heal,
            shield = excluded.shield,
            description = excluded.description
    `);

    for (const [id, s] of Object.entries(config.skills)) {
        insertSkill.run(
            id,
            s.characterId || '',
            s.skillName || s.name || id,
            s.skillType || 'normal',
            Number(s.cost || 2),
            Number(s.cooldown || 2),
            Number(s.damage || 0),
            Number(s.heal || 0),
            Number(s.shield || 0),
            Number(s.duration || 0),
            s.effectType1 || 'damage',
            Number(s.effectVal1 || 0),
            s.effectType2 || '-',
            Number(s.effectVal2 || 0),
            s.effectId || '',
            s.iconUrl || '',
            s.description || ''
        );
    }
    console.log(`✅ Skills seeded: ${Object.keys(config.skills).length} skills.`);
}


// Migrate an existing database file: CREATE TABLE IF NOT EXISTS never adds new columns.
(function migrateCardBranchColumns() {
    const cols = db.prepare('PRAGMA table_info(cards)').all().map(c => c.name);
    const add = [];
    if (!cols.includes('then_effects_json')) add.push("ALTER TABLE cards ADD COLUMN then_effects_json TEXT DEFAULT '[]'");
    if (!cols.includes('else_effects_json')) add.push("ALTER TABLE cards ADD COLUMN else_effects_json TEXT DEFAULT '[]'");
    if (!cols.includes('reaction_json')) add.push('ALTER TABLE cards ADD COLUMN reaction_json TEXT');
    for (const sql of add) db.exec(sql);
    if (add.length) console.log(`✅ cards 表新增分支/反应字段 ${add.length} 个。`);
})();

// 7. Seed Cards (handles array or map format)
if (config.cards) {
    const insertCard = db.prepare(`
        INSERT INTO cards (
            id, name, card_type, rarity, cost, damage, shield, heal, draw_count,
            pool_type, upgradeable, level, effect_type, draw, energy, status, buff,
            target, hit_count, self_damage, proc_chance, condition, condition_param,
            condition_bonus, tags, image_url, description, enabled,
            then_effects_json, else_effects_json, reaction_json
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, 1,
            ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            card_type = excluded.card_type,
            rarity = excluded.rarity,
            cost = excluded.cost,
            damage = excluded.damage,
            shield = excluded.shield,
            heal = excluded.heal,
            draw_count = excluded.draw_count,
            pool_type = excluded.pool_type,
            upgradeable = excluded.upgradeable,
            level = excluded.level,
            effect_type = excluded.effect_type,
            draw = excluded.draw,
            energy = excluded.energy,
            status = excluded.status,
            buff = excluded.buff,
            then_effects_json = excluded.then_effects_json,
            else_effects_json = excluded.else_effects_json,
            reaction_json = excluded.reaction_json,
            target = excluded.target,
            hit_count = excluded.hit_count,
            self_damage = excluded.self_damage,
            proc_chance = excluded.proc_chance,
            condition = excluded.condition,
            condition_param = excluded.condition_param,
            condition_bonus = excluded.condition_bonus,
            tags = excluded.tags,
            description = excluded.description,
            enabled = 1
    `);

    const cardList = Array.isArray(config.cards) 
        ? config.cards 
        : Object.entries(config.cards).map(([id, c]) => ({ id, ...c }));

    for (const c of cardList) {
        const tagsStr = Array.isArray(c.tags) ? c.tags.join(',') : (c.tags || '');
        insertCard.run(
            c.cardId || c.id,
            c.cardName || c.name || c.id,
            c.cardType || c.type || 'attack',
            c.rarity || 'common',
            Number(c.cost || 1),
            Number(c.damage || 0),
            Number(c.shield || 0),
            Number(c.heal || 0),
            Number(c.draw !== undefined ? c.draw : (c.draw_count || c.drawCount || 0)),
            c.pool_type || 'Base',
            c.upgradeable ? 1 : 0,
            Number(c.level || 1),
            c.effect_type || 'damage',
            Number(c.draw !== undefined ? c.draw : (c.draw_count || c.drawCount || 0)),
            Number(c.energy || 0),
            c.status || '',
            c.buff || '',
            c.target || 'enemy',
            Number(c.hit_count || 1),
            Number(c.self_damage || c.selfDamage || 0),
            Number(c.proc_chance || c.procChance || 0),
            c.condition || '',
            Number(c.condition_param || 0),
            Number(c.condition_bonus || 0),
            tagsStr,
            c.imageUrl || '',
            c.description || c.desc || '',
            JSON.stringify(c.then_effects || []),
            JSON.stringify(c.else_effects || []),
            c.reaction ? JSON.stringify(c.reaction) : null
        );
    }
    // Prune orphans: an earlier generator seeded a parallel 108-card pool that the browser never
    // loaded. Left in place it would keep entering the gacha pool and the codex.
    const keep = new Set(cardList.map(c => String(c.cardId || c.id)));
    const before = db.prepare('SELECT count(*) as n FROM cards').get().n;
    const orphans = db.prepare('SELECT id FROM cards').all().map(r => r.id).filter(id => !keep.has(String(id)));
    if (orphans.length) {
        const del = db.prepare('DELETE FROM cards WHERE id = ?');
        const delPool = db.prepare('DELETE FROM card_pools WHERE card_id = ?');
        const delCol = db.prepare('DELETE FROM user_collections WHERE card_id = ?');
        const delLvl = db.prepare('DELETE FROM user_card_levels WHERE card_id = ?');
        for (const id of orphans) { del.run(id); delPool.run(id); delCol.run(id); delLvl.run(id); }
        console.log(`✅ 清除已废弃卡牌 ${orphans.length} 张（数据库从 ${before} 收敛到 ${before - orphans.length}）。`);
    }
    console.log(`✅ Cards seeded: ${cardList.length} cards.`);
}

// 8. Seed Statuses
if (config.statuses) {
    const insertStatus = db.prepare(`
        INSERT INTO statuses (id, name, category, trigger_timing, damage_per_turn, heal_per_turn, damage_modifier, damage_taken_modifier, duration, max_stacks, stack_rule, icon_url, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            duration = excluded.duration,
            description = excluded.description
    `);

    for (const [id, st] of Object.entries(config.statuses)) {
        insertStatus.run(
            id,
            st.name || id,
            st.category || 'debuff',
            st.triggerTiming || 'turn_end',
            Number(st.damagePerTurn || 0),
            Number(st.healPerTurn || 0),
            Number(st.damageModifier || 0),
            Number(st.damageTakenModifier || 0),
            Number(st.duration || 1),
            Number(st.maxStacks || 3),
            st.stackRule || 'stack_duration_refresh',
            st.iconUrl || '',
            st.description || ''
        );
    }
    console.log(`✅ Statuses seeded: ${Object.keys(config.statuses).length} statuses.`);
}

// 9. Seed Card Pools
if (config.cardPools) {
    db.exec('DELETE FROM card_pools');
    const insertPool = db.prepare('INSERT INTO card_pools (hero_id, card_id, count, enabled) VALUES (?, ?, ?, ?)');
    for (const p of config.cardPools) {
        insertPool.run(p.characterId, p.cardId, Number(p.count || 2), p.enabled !== false ? 1 : 0);
    }
    console.log(`✅ Card pools seeded: ${config.cardPools.length} pool entries.`);
}

// 10. Seed Gacha Card Packs
const checkPacks = db.prepare('SELECT count(*) as count FROM card_packs').get();
if (checkPacks.count === 0) {
    const insertPack = db.prepare('INSERT INTO card_packs (id, name, description, cost_gold, rates_json, enabled) VALUES (?, ?, ?, ?, ?, ?)');
    insertPack.run(
        'pack_standard',
        '命运符文秘宝包 (Standard Pack)',
        '包含全职业通用符文与战技，保底出产稀有以上卡牌。',
        100,
        JSON.stringify({ SSR: 0.05, SR: 0.20, R: 0.40, N: 0.35 }),
        1
    );
    insertPack.run(
        'pack_elements',
        '极寒与烈焰觉醒包 (Elemental Pack)',
        '烈焰剑士与冰霜法师专属强化包，极高概率抽取灼烧与冰冻特化卡。',
        150,
        JSON.stringify({ SSR: 0.10, SR: 0.30, R: 0.40, N: 0.20 }),
        1
    );
    console.log('✅ Default Card Packs seeded: pack_standard & pack_elements.');
}

// 11. Seed Initial User Collection (give player baseline starter cards)
const checkCol = db.prepare('SELECT count(*) as count FROM user_collections WHERE user_id = ?').get('player_local');
if (checkCol.count === 0) {
    const insertCol = db.prepare('INSERT INTO user_collections (user_id, card_id, count) VALUES (?, ?, ?)');
    const starterCards = ['quick_attack', 'small_shield', 'small_heal', 'meditation', 'pierce'];
    for (const cid of starterCards) {
        insertCol.run('player_local', cid, 2);
    }
    console.log(`✅ Starter collection initialized with 2 of each starter card for player_local.`);
}

// 12. Seed Assets Metadata
const checkAssets = db.prepare('SELECT count(*) as count FROM assets_meta').get();
if (checkAssets.count === 0) {
    const insertAsset = db.prepare('INSERT INTO assets_meta (asset_type, filename, file_path, url_path) VALUES (?, ?, ?, ?)');
    const charDir = path.join(projectRoot, 'assets', 'characters');
    if (fs.existsSync(charDir)) {
        for (const f of fs.readdirSync(charDir)) {
            if (f.endsWith('.png') || f.endsWith('.jpg')) {
                insertAsset.run('hero', f, path.join(charDir, f), `/assets/characters/${f}`);
            }
        }
    }
    console.log('✅ Asset metadata indexed in database.');
}

// 13. Seed PVE chapter stages (ported from Unity's hard-coded InitializeDefaultStages)
if (fs.existsSync(path.join(projectRoot, 'data', 'generated', 'pveStages.json'))) {
    const stages = JSON.parse(fs.readFileSync(path.join(projectRoot, 'data', 'generated', 'pveStages.json'), 'utf8'));
    const insertStage = db.prepare(`
        INSERT INTO pve_stages (stage_id, stage_code, stage_name, recommended_power, enemy_name, enemy_max_hp,
            enemy_deck_json, first_clear_gold, first_clear_gems, first_clear_card_id, repeat_gold, description, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(stage_id) DO UPDATE SET
            stage_code = excluded.stage_code, stage_name = excluded.stage_name,
            recommended_power = excluded.recommended_power, enemy_name = excluded.enemy_name,
            enemy_max_hp = excluded.enemy_max_hp, enemy_deck_json = excluded.enemy_deck_json,
            first_clear_gold = excluded.first_clear_gold, first_clear_gems = excluded.first_clear_gems,
            first_clear_card_id = excluded.first_clear_card_id, repeat_gold = excluded.repeat_gold,
            description = excluded.description
    `);
    for (const st of stages) {
        insertStage.run(st.stageId, st.stageCode, st.stageName, st.recommendedPower, st.enemyName,
            st.enemyMaxHp, JSON.stringify(st.enemyDeck), st.firstClearRewardGold, st.firstClearRewardGems,
            st.firstClearRewardCardId, st.repeatRewardGold, st.description || '');
    }
    console.log(`✅ PVE stages seeded: ${stages.length} 关。`);
}

// 14. Seed the PVE growth pack so the upgradeable pool is actually reachable by gacha
const packCount = db.prepare('SELECT count(*) as count FROM card_packs').get();
if (packCount.count < 3) {
    db.prepare('DELETE FROM card_packs').run();
    const insertPack = db.prepare('INSERT INTO card_packs (id, name, description, cost_gold, rates_json, pool_cards_json, enabled) VALUES (?, ?, ?, ?, ?, ?, 1)');
    const pity = config.gachaPity || {};
    const rates = JSON.stringify(pity.rates || { common: 0.70, rare: 0.22, epic: 0.06, legendary: 0.02 });
    insertPack.run('pack_standard', '命运符文秘包 (Standard Pack)',
        `全卡池随机，${pity.singleCostGold || 100} 金币单抽 / ${pity.tenPullCostGold || 900} 金币十连。十连保底稀有以上，${pity.hardPityCounter || 80} 抽内必出 SSR。`,
        pity.singleCostGold || 100, rates, null);
    insertPack.run('pack_pve_growth', 'PVE成长包 (Adventure Pack)',
        '仅含可升级的 PVE 卡牌；重复抽到会直接升一级，是冒险模式的养成入口。',
        pity.singleCostGold || 100, rates, null);
    console.log('✅ Card packs reseeded from gachaPity rates (2 packs).');
}

console.log('====================================================');
console.log('>>> DATABASE INITIALIZATION COMPLETED (100% SUCCESS) <<<');
console.log('====================================================');
