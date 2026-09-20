// Destiny Duel - High-Performance Zero-Dependency HTTP & REST Server
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { execSync } = require('node:child_process');

const PORT = process.env.PORT || 3000;
const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'database', 'destiny_duel.db');
const uploadsDir = path.join(projectRoot, 'assets', 'uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Connect to SQLite Database
const db = new DatabaseSync(dbPath);

// Gacha rules come from the same module the browser loads, so the two can't drift apart.
const GachaSystem = require(path.join(projectRoot, 'client', 'src', 'systems', 'GachaSystem.js'));
const { attachWebSocketServer } = require('./websocket_room.js');

const DEFAULT_GOLD = 2000;
const DEFAULT_GEMS = 100;

function ensureWallet(userId) {
    let wallet = db.prepare('SELECT * FROM player_wallet WHERE user_id = ?').get(userId);
    if (!wallet) {
        db.prepare(`INSERT INTO player_wallet (user_id, gold, gems, pity_since_ssr, pity_luck, total_pulls)
                    VALUES (?, ?, ?, 0, 0, 0)`).run(userId, DEFAULT_GOLD, DEFAULT_GEMS);
        wallet = db.prepare('SELECT * FROM player_wallet WHERE user_id = ?').get(userId);
    }
    return wallet;
}

function saveWallet(wallet) {
    db.prepare(`UPDATE player_wallet
                SET gold = ?, gems = ?, pity_since_ssr = ?, pity_luck = ?, total_pulls = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?`)
      .run(Math.max(0, Math.round(wallet.gold)), Math.max(0, Math.round(wallet.gems)),
           Math.max(0, wallet.pity_since_ssr | 0), Math.max(0, Number(wallet.pity_luck) || 0),
           Math.max(0, wallet.total_pulls | 0), wallet.user_id);
}

const insertCollection = db.prepare(`
    INSERT INTO user_collections (user_id, card_id, count)
    VALUES (?, ?, ?)
    ON CONFLICT DO NOTHING
`);
const upsertCollectionCount = db.prepare(`
    UPDATE user_collections SET count = ? WHERE user_id = ? AND card_id = ?
`);

function saveCollection(userId, cardId, count) {
    const existing = db.prepare('SELECT id FROM user_collections WHERE user_id = ? AND card_id = ?')
        .get(userId, cardId);
    if (existing) upsertCollectionCount.run(count, userId, cardId);
    else insertCollection.run(userId, cardId, count);
}

function saveCardLevel(userId, cardId, level) {
    db.prepare(`
        INSERT INTO user_card_levels (user_id, card_id, level)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, card_id) DO UPDATE SET level = excluded.level
    `).run(userId, cardId, Math.max(1, Math.min(3, level | 0)));
}

/**
 * A card_pack row restricts which cards can drop. Rates live in GAME_CONFIG.gachaPity now, so the
 * pack only contributes a pool membership filter; an empty/absent list means the whole card set.
 */
function buildPackFilter(pack) {
    let list = null;
    try {
        const parsed = JSON.parse(pack.pool_cards_json || 'null');
        if (Array.isArray(parsed) && parsed.length) list = new Set(parsed.map(String));
    } catch (err) { /* tolerate a malformed admin edit and fall through to the full pool */ }
    const poolType = /pve/i.test(pack.id || '') ? 'PVE' : null;
    return (card) => {
        if (list && !list.has(String(card.id))) return false;
        if (poolType && String(card.pool_type || '').toUpperCase() !== poolType) return false;
        return true;
    };
}

// Active Session Tokens
const activeTokens = new Map(); // token -> { username, expiresAt }

function hashPassword(password, salt) {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function verifyAuth(req) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token || !activeTokens.has(token)) return null;
    const session = activeTokens.get(token);
    if (Date.now() > session.expiresAt) {
        activeTokens.delete(token);
        return null;
    }
    return session;
}

// MIME Types Map
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8'
};

// Response Helpers
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 25 * 1024 * 1024) { // 25MB limit
                req.destroy();
                reject(new Error('Payload too large'));
            }
        });
        req.on('end', () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                resolve({ raw: body });
            }
        });
        req.on('error', reject);
    });
}

/**
 * The game config served to the browser is the *generated artifact*, read straight from
 * data/generated/*.json — the same objects tools/sync_balance.py writes into data/game_config.js.
 *
 * This used to re-assemble the config from SQLite with its own key names and array-vs-object
 * shapes, which meant a client that fetched it got a structurally different GAME_CONFIG than the
 * one it booted with (cards became an array, cardName became name, and the branch/reaction fields
 * were absent entirely). SQLite stays the CMS store; the admin's edits regenerate this artifact.
 */
const GENERATED_DIR = path.join(projectRoot, 'data', 'generated');
const generatedCache = new Map();   // name -> { mtimeMs, value }

/**
 * Cached on file mtime, so an admin edit that regenerates the artifact is picked up on the next
 * request without a restart and without every write handler having to remember to invalidate.
 */
function readGenerated(name) {
    const file = path.join(GENERATED_DIR, name);
    let mtimeMs = 0;
    try {
        mtimeMs = fs.statSync(file).mtimeMs;
    } catch (err) {
        return {};
    }
    const cached = generatedCache.get(name);
    if (cached && cached.mtimeMs === mtimeMs) return cached.value;
    let value;
    try {
        value = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        console.warn(`[config] 无法解析 data/generated/${name}:`, err.message);
        return {};
    }
    generatedCache.set(name, { mtimeMs, value });
    return value;
}

function getFullGameConfig() {
    const gameRules = readGenerated('gameRules.json');
    const characters = readGenerated('characters.json');
    const skills = readGenerated('skills.json');
    const cards = readGenerated('cards.json');
    const statuses = readGenerated('statuses.json');
    const cardPools = readGenerated('cardPools.json');
    const blessings = readGenerated('blessings.json');
    const pveStages = readGenerated('pveStages.json');
    const gachaPity = readGenerated('gachaPity.json');
    return {
        gameRules, characters, heroes: characters, skills, cards, statuses,
        cardPools: Array.isArray(cardPools) ? cardPools : [],
        blessings, pveStages, gachaPity
    };
}

// Server Request Dispatcher
const server = http.createServer(async (req, res) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        });
        return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    try {
        // ====================================================================
        // API ROUTES
        // ====================================================================

        // 1. Admin Auth
        if (pathname === '/api/admin/login' && req.method === 'POST') {
            const { username, password } = await readBody(req);
            const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
            if (!user) {
                return sendJson(res, 401, { success: false, error: '用户不存在' });
            }
            const expectedHash = hashPassword(password, user.salt);
            if (expectedHash !== user.password_hash) {
                return sendJson(res, 401, { success: false, error: '密码错误' });
            }

            const token = crypto.randomBytes(32).toString('hex');
            activeTokens.set(token, {
                username: user.username,
                expiresAt: Date.now() + 24 * 3600 * 1000 // 24 hours
            });

            return sendJson(res, 200, { success: true, token, username: user.username });
        }

        if (pathname === '/api/admin/verify') {
            let session = verifyAuth(req);
            if (!session && req.method === 'POST') {
                const body = await readBody(req);
                if (body && body.token && activeTokens.has(body.token)) {
                    session = activeTokens.get(body.token);
                }
            }
            if (!session) return sendJson(res, 401, { valid: false });
            return sendJson(res, 200, { valid: true, username: session.username });
        }

        // 2. Full Game Config (Read directly from database)
        if (pathname === '/api/game/config' && req.method === 'GET') {
            const config = getFullGameConfig();
            return sendJson(res, 200, config);
        }

        // 3. Heroes CRUD
        if (pathname === '/api/heroes' && req.method === 'GET') {
            const rows = db.prepare('SELECT * FROM heroes ORDER BY id').all();
            return sendJson(res, 200, rows);
        }

        if (pathname === '/api/heroes' && req.method === 'POST') {
            if (!verifyAuth(req)) return sendJson(res, 401, { error: '未授权' });
            const body = await readBody(req);
            const heroId = body.id || `hero_${Date.now().toString().slice(-4)}`;
            const skillId = body.skill_id || `${heroId}_skill`;
            const passiveId = body.passive_id || `${heroId}_passive`;

            db.prepare(`
                INSERT INTO heroes (id, name, role, max_hp, base_attack, starting_energy, max_energy, passive_id, skill_id, avatar_url, description, enabled)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                heroId, body.name, body.role || '综合型', Number(body.max_hp || 30), Number(body.base_attack || 4),
                3, 6, passiveId, skillId, body.avatar_url || '', body.description || '', body.enabled ? 1 : 0
            );

            // Also create starter skill if provided
            if (body.skill_name) {
                db.prepare(`
                    INSERT INTO skills (id, hero_id, name, skill_type, cost, cooldown, damage, heal, shield, duration, effect_type1, effect_val1, effect_type2, effect_val2, effect_id, icon_url, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    skillId, heroId, body.skill_name, 'custom', Number(body.skill_cost || 2), Number(body.skill_cd || 2),
                    Number(body.skill_dmg || 5), 0, 0, 1, 'damage', Number(body.skill_dmg || 5), '-', 0, '', '', body.skill_desc || ''
                );
            }

            // Create starter deck
            const defaultCards = [['quick_attack', 4], ['small_shield', 3], ['heavy_strike', 3], ['meditation', 2]];
            for (const [cid, cnt] of defaultCards) {
                db.prepare('INSERT INTO card_pools (hero_id, card_id, count, enabled) VALUES (?, ?, ?, 1)').run(heroId, cid, cnt);
            }

            return sendJson(res, 200, { success: true, id: heroId });
        }

        if (pathname.startsWith('/api/heroes/') && req.method === 'PUT') {
            if (!verifyAuth(req)) return sendJson(res, 401, { error: '未授权' });
            const id = pathname.split('/').pop();
            const b = await readBody(req);
            db.prepare(`
                UPDATE heroes SET
                    name = ?, role = ?, max_hp = ?, base_attack = ?,
                    avatar_url = ?, description = ?, enabled = ?
                WHERE id = ?
            `).run(
                b.name, b.role, Number(b.max_hp), Number(b.base_attack),
                b.avatar_url || '', b.description || '', b.enabled ? 1 : 0, id
            );
            return sendJson(res, 200, { success: true });
        }

        if (pathname.startsWith('/api/heroes/') && req.method === 'DELETE') {
            if (!verifyAuth(req)) return sendJson(res, 401, { error: '未授权' });
            const id = pathname.split('/').pop();
            db.prepare('DELETE FROM heroes WHERE id = ?').run(id);
            db.prepare('DELETE FROM skills WHERE hero_id = ?').run(id);
            db.prepare('DELETE FROM card_pools WHERE hero_id = ?').run(id);
            return sendJson(res, 200, { success: true });
        }

        // 4. Cards CRUD
        if (pathname === '/api/cards' && req.method === 'GET') {
            const rows = db.prepare('SELECT * FROM cards ORDER BY id').all();
            return sendJson(res, 200, rows);
        }

        if (pathname === '/api/cards' && req.method === 'POST') {
            if (!verifyAuth(req)) return sendJson(res, 401, { error: '未授权' });
            const b = await readBody(req);
            const cardId = b.id || `card_${Date.now().toString().slice(-4)}`;
            db.prepare(`
                INSERT INTO cards (id, name, card_type, rarity, cost, damage, shield, heal, draw_count, effect_type1, effect_val1, effect_type2, effect_val2, status_id, status_stacks, target_type, image_url, description, enabled)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                cardId, b.name, b.card_type || 'attack', b.rarity || 'common',
                Number(b.cost || 1), Number(b.damage || 0), Number(b.shield || 0), Number(b.heal || 0), Number(b.draw_count || 0),
                b.effect_type1 || 'damage', Number(b.effect_val1 || 0), b.effect_type2 || '-', Number(b.effect_val2 || 0),
                b.status_id || '', Number(b.status_stacks || 0), b.target_type || 'enemy',
                b.image_url || '', b.description || '', b.enabled ? 1 : 0
            );
            return sendJson(res, 200, { success: true, id: cardId });
        }

        if (pathname.startsWith('/api/cards/') && req.method === 'PUT') {
            if (!verifyAuth(req)) return sendJson(res, 401, { error: '未授权' });
            const id = pathname.split('/').pop();
            const b = await readBody(req);
            db.prepare(`
                UPDATE cards SET
                    name = ?, card_type = ?, rarity = ?, cost = ?, damage = ?,
                    shield = ?, heal = ?, draw_count = ?, effect_type1 = ?, effect_val1 = ?,
                    effect_type2 = ?, effect_val2 = ?, status_id = ?, status_stacks = ?,
                    target_type = ?, image_url = ?, description = ?, enabled = ?
                WHERE id = ?
            `).run(
                b.name, b.card_type, b.rarity, Number(b.cost), Number(b.damage),
                Number(b.shield), Number(b.heal), Number(b.draw_count), b.effect_type1, Number(b.effect_val1),
                b.effect_type2, Number(b.effect_val2), b.status_id, Number(b.status_stacks),
                b.target_type, b.image_url || '', b.description || '', b.enabled ? 1 : 0, id
            );
            return sendJson(res, 200, { success: true });
        }

        if (pathname.startsWith('/api/cards/') && req.method === 'DELETE') {
            if (!verifyAuth(req)) return sendJson(res, 401, { error: '未授权' });
            const id = pathname.split('/').pop();
            db.prepare('DELETE FROM cards WHERE id = ?').run(id);
            db.prepare('DELETE FROM card_pools WHERE card_id = ?').run(id);
            return sendJson(res, 200, { success: true });
        }

        // 5. Skills CRUD
        if (pathname === '/api/skills' && req.method === 'GET') {
            const rows = db.prepare('SELECT * FROM skills ORDER BY id').all();
            return sendJson(res, 200, rows);
        }

        if (pathname.startsWith('/api/skills/') && req.method === 'PUT') {
            if (!verifyAuth(req)) return sendJson(res, 401, { error: '未授权' });
            const id = pathname.split('/').pop();
            const b = await readBody(req);
            db.prepare(`
                UPDATE skills SET
                    name = ?, cost = ?, cooldown = ?, damage = ?, heal = ?, shield = ?,
                    effect_type1 = ?, effect_val1 = ?, effect_type2 = ?, effect_val2 = ?,
                    effect_id = ?, icon_url = ?, description = ?
                WHERE id = ?
            `).run(
                b.name, Number(b.cost), Number(b.cooldown), Number(b.damage), Number(b.heal), Number(b.shield),
                b.effect_type1, Number(b.effect_val1), b.effect_type2, Number(b.effect_val2),
                b.effect_id || '', b.icon_url || '', b.description || '', id
            );
            return sendJson(res, 200, { success: true });
        }

        // 6. Statuses CRUD
        if (pathname === '/api/statuses' && req.method === 'GET') {
            const rows = db.prepare('SELECT * FROM statuses ORDER BY id').all();
            return sendJson(res, 200, rows);
        }

        if (pathname.startsWith('/api/statuses/') && req.method === 'PUT') {
            if (!verifyAuth(req)) return sendJson(res, 401, { error: '未授权' });
            const id = pathname.split('/').pop();
            const b = await readBody(req);
            db.prepare(`
                UPDATE statuses SET
                    name = ?, category = ?, trigger_timing = ?, damage_per_turn = ?,
                    heal_per_turn = ?, damage_modifier = ?, damage_taken_modifier = ?,
                    duration = ?, max_stacks = ?, stack_rule = ?, description = ?
                WHERE id = ?
            `).run(
                b.name, b.category, b.trigger_timing, Number(b.damage_per_turn),
                Number(b.heal_per_turn), Number(b.damage_modifier), Number(b.damage_taken_modifier),
                Number(b.duration), Number(b.max_stacks), b.stack_rule, b.description || '', id
            );
            return sendJson(res, 200, { success: true });
        }

        // 7. Rules CRUD
        if (pathname === '/api/rules' && req.method === 'GET') {
            const rows = db.prepare('SELECT * FROM game_rules ORDER BY id').all();
            return sendJson(res, 200, rows);
        }

        if (pathname.startsWith('/api/rules/') && req.method === 'PUT') {
            if (!verifyAuth(req)) return sendJson(res, 401, { error: '未授权' });
            const id = pathname.split('/').pop();
            const b = await readBody(req);
            db.prepare('UPDATE game_rules SET value = ?, description = ? WHERE id = ?')
              .run(Number(b.value), b.description || '', id);
            return sendJson(res, 200, { success: true });
        }

        // 8. Image Asset Upload (Base64 data URI)
        if (pathname === '/api/upload' && req.method === 'POST') {
            if (!verifyAuth(req)) return sendJson(res, 401, { error: '未授权' });
            const { filename, base64Data, assetType = 'general' } = await readBody(req);
            if (!filename || !base64Data) {
                return sendJson(res, 400, { error: '缺少图片文件名或数据' });
            }

            const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(cleanBase64, 'base64');
            const safeName = `${Date.now()}_${path.basename(filename).replace(/[^\w.-]/g, '_')}`;
            const targetPath = path.join(uploadsDir, safeName);
            fs.writeFileSync(targetPath, buffer);

            const urlPath = `/assets/uploads/${safeName}`;
            db.prepare('INSERT INTO assets_meta (asset_type, filename, file_path, url_path) VALUES (?, ?, ?, ?)')
              .run(assetType, safeName, targetPath, urlPath);

            return sendJson(res, 200, { success: true, url: urlPath, filename: safeName });
        }

        if (pathname === '/api/assets' && req.method === 'GET') {
            const rows = db.prepare('SELECT * FROM assets_meta ORDER BY id DESC').all();
            return sendJson(res, 200, rows);
        }

        // 9. Gacha Packs & Draw System
        if (pathname === '/api/gacha/packs' && req.method === 'GET') {
            const packs = db.prepare('SELECT * FROM card_packs WHERE enabled = 1').all();
            return sendJson(res, 200, packs.map(p => ({ ...p, rates: JSON.parse(p.rates_json || '{}') })));
        }

        if (pathname.startsWith('/api/gacha/packs/') && req.method === 'PUT') {
            if (!verifyAuth(req)) return sendJson(res, 401, { error: '未授权' });
            const id = pathname.split('/').pop();
            const b = await readBody(req);
            db.prepare('UPDATE card_packs SET name = ?, description = ?, cost_gold = ?, rates_json = ? WHERE id = ?')
              .run(b.name, b.description, Number(b.cost_gold || 100), JSON.stringify(b.rates), id);
            return sendJson(res, 200, { success: true });
        }

        // Draw Cards (单抽或十连抽) — rules shared with the client via GachaSystem.js
        if (pathname === '/api/gacha/draw' && req.method === 'POST') {
            const body = await readBody(req);
            const userId = body.userId || 'player_local';
            const count = Math.max(1, Math.min(10, Number(body.count) || 1));
            const packId = body.packId || 'pack_standard';

            const wallet = ensureWallet(userId);
            const pack = db.prepare('SELECT * FROM card_packs WHERE id = ?').get(packId);
            const gachaConf = GachaSystem.config();
            const cost = count >= 10 ? gachaConf.tenPullCostGold : gachaConf.singleCostGold * count;
            if (wallet.gold < cost) {
                return sendJson(res, 400, { error: '金币不足', gold: wallet.gold, cost });
            }

            const allCards = db.prepare('SELECT * FROM cards WHERE enabled = 1').all();
            const buckets = GachaSystem.bucketByRarity(allCards);
            const poolFilter = pack ? buildPackFilter(pack) : null;

            const owned = new Map(db.prepare('SELECT card_id, count FROM user_collections WHERE user_id = ?')
                .all(userId).map(r => [r.card_id, r.count]));
            const levels = new Map(db.prepare('SELECT card_id, level FROM user_card_levels WHERE user_id = ?')
                .all(userId).map(r => [r.card_id, r.level]));

            const pity = {
                sinceSSR: wallet.pity_since_ssr,
                luck: wallet.pity_luck,
                totalPulls: wallet.total_pulls
            };
            const rarities = GachaSystem.rollBatch(pity, count, Math.random, gachaConf);
            const results = [];
            let goldRefund = 0;

            for (const rarity of rarities) {
                const drawn = GachaSystem.pickCard(buckets, rarity, Math.random, poolFilter);
                if (!drawn) continue;
                const alreadyOwned = (owned.get(drawn.id) || 0) > 0;
                let outcome = { type: 'unlock', gold: 0, newLevel: 1 };
                if (alreadyOwned) {
                    outcome = GachaSystem.duplicateOutcome(drawn, levels.get(drawn.id) || 1, gachaConf);
                    if (outcome.type === 'gold') goldRefund += outcome.gold;
                    else levels.set(drawn.id, outcome.newLevel);
                } else {
                    levels.set(drawn.id, 1);
                }
                const newCount = (owned.get(drawn.id) || 0) + 1;
                owned.set(drawn.id, newCount);
                saveCollection(userId, drawn.id, newCount);
                saveCardLevel(userId, drawn.id, levels.get(drawn.id) || 1);
                results.push({
                    card: drawn,
                    rarity: GachaSystem.DISPLAY[rarity],
                    rarityKey: rarity,
                    isNew: !alreadyOwned,
                    duplicateGold: outcome.gold || 0,
                    cardLevel: levels.get(drawn.id) || 1
                });
            }

            wallet.gold = wallet.gold - cost + goldRefund;
            wallet.pity_since_ssr = pity.sinceSSR;
            wallet.pity_luck = pity.luck;
            wallet.total_pulls = pity.totalPulls;
            saveWallet(wallet);
            return sendJson(res, 200, {
                success: true,
                results,
                gold: wallet.gold,
                refundGold: goldRefund,
                pity: { sinceSSR: pity.sinceSSR, luck: pity.luck, totalPulls: pity.totalPulls }
            });
        }

        // 10b. Player wallet (gold / gems / gacha pity). Persisted server-side so pity cannot be
        // lost by clearing localStorage or switching device.
        if (pathname === '/api/player/wallet' && req.method === 'GET') {
            const wallet = ensureWallet(parsedUrl.searchParams.get('userId') || 'player_local');
            return sendJson(res, 200, wallet);
        }

        if (pathname === '/api/player/wallet' && req.method === 'POST') {
            const body = await readBody(req);
            const userId = body.userId || 'player_local';
            const wallet = ensureWallet(userId);
            // Only deltas and capped absolutes are accepted: the client never gets to set its own
            // gold outright, which keeps the economy from being trivially editable.
            if (body.deltaGold) wallet.gold = Math.max(0, wallet.gold + Number(body.deltaGold) || 0);
            if (body.deltaGems) wallet.gems = Math.max(0, wallet.gems + Number(body.deltaGems) || 0);
            saveWallet(wallet);
            return sendJson(res, 200, wallet);
        }

        // 10c. PVE stage progress
        if (pathname === '/api/pve/progress' && req.method === 'GET') {
            const userId = parsedUrl.searchParams.get('userId') || 'player_local';
            const row = db.prepare('SELECT * FROM pve_progress WHERE user_id = ?').get(userId);
            if (!row) return sendJson(res, 200, { userId, clearedStage: 0, highestStage: 1, wins: {}, collectedRewards: [] });
            return sendJson(res, 200, {
                userId,
                clearedStage: row.cleared_stage,
                highestStage: row.highest_stage,
                wins: JSON.parse(row.wins_json || '{}'),
                collectedRewards: JSON.parse(row.collected_json || '[]'),
                updatedAt: row.updated_at
            });
        }

        if (pathname === '/api/pve/progress' && req.method === 'POST') {
            const body = await readBody(req);
            const userId = body.userId || parsedUrl.searchParams.get('userId') || 'player_local';
            const incomingCleared = Math.max(0, Math.min(999, Number(body.cleared) || 0));
            const incomingHighest = Math.max(1, Math.min(1000, Number(body.highest) || 1));
            const existing = db.prepare('SELECT * FROM pve_progress WHERE user_id = ?').get(userId);
            // Monotonic: a stale or replayed client payload can never walk progress backwards.
            const cleared = Math.max(existing ? existing.cleared_stage : 0, incomingCleared);
            const highest = Math.max(existing ? existing.highest_stage : 1, incomingHighest);
            const wins = Object.assign({}, existing ? JSON.parse(existing.wins_json || '{}') : {}, body.wins || {});
            const collected = Array.from(new Set([]
                .concat(existing ? JSON.parse(existing.collected_json || '[]') : [])
                .concat(body.collectedRewards || [])));
            db.prepare(`
                INSERT INTO pve_progress (user_id, cleared_stage, highest_stage, wins_json, collected_json, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    cleared_stage = excluded.cleared_stage,
                    highest_stage = excluded.highest_stage,
                    wins_json = excluded.wins_json,
                    collected_json = excluded.collected_json,
                    updated_at = CURRENT_TIMESTAMP
            `).run(userId, cleared, highest, JSON.stringify(wins), JSON.stringify(collected));
            return sendJson(res, 200, { success: true, clearedStage: cleared, highestStage: highest });
        }

        // 10d. Chapter definitions, served from the database copy
        if (pathname === '/api/pve/stages' && req.method === 'GET') {
            const rows = db.prepare('SELECT * FROM pve_stages WHERE enabled = 1 ORDER BY stage_id').all();
            return sendJson(res, 200, rows.map(r => ({
                stageId: r.stage_id,
                stageCode: r.stage_code,
                stageName: r.stage_name,
                recommendedPower: r.recommended_power,
                enemyName: r.enemy_name,
                enemyMaxHp: r.enemy_max_hp,
                enemyDeck: JSON.parse(r.enemy_deck_json || '[]'),
                firstClearRewardGold: r.first_clear_gold,
                firstClearRewardGems: r.first_clear_gems,
                firstClearRewardCardId: r.first_clear_card_id,
                repeatRewardGold: r.repeat_gold,
                description: r.description
            })));
        }

        // 10. User Card Collection
        if (pathname === '/api/collection' && req.method === 'GET') {
            const userId = parsedUrl.searchParams.get('userId') || 'player_local';
            const rows = db.prepare(`
                SELECT c.*, COALESCE(uc.count, 0) as owned_count, uc.unlocked_at
                FROM cards c
                LEFT JOIN user_collections uc ON uc.card_id = c.id AND uc.user_id = ?
                WHERE c.enabled = 1
                ORDER BY c.rarity DESC, c.cost ASC
            `).all(userId);
            return sendJson(res, 200, rows);
        }

        // 11. Excel CMS Import / Sync
        if (pathname === '/api/excel/import' && req.method === 'POST') {
            if (!verifyAuth(req)) return sendJson(res, 401, { error: '未授权' });
            const { base64Data } = await readBody(req);
            const excelTarget = path.join(projectRoot, 'config', 'CardGame_Balance.xlsx');
            if (base64Data) {
                const buffer = Buffer.from(base64Data.replace(/^data:.*?;base64,/, ''), 'base64');
                fs.writeFileSync(excelTarget, buffer);
            }

            // Trigger sync and re-init
            try {
                execSync(`python "${path.join(projectRoot, 'tools', 'sync_balance.py')}"`, { cwd: projectRoot, encoding: 'utf-8' });
                execSync(`node "${path.join(projectRoot, 'database', 'init_db.js')}"`, { cwd: projectRoot, encoding: 'utf-8' });
                return sendJson(res, 200, { success: true, message: 'Excel 导入并同步至数据库成功！' });
            } catch (err) {
                return sendJson(res, 500, { success: false, error: err.message });
            }
        }

        // ====================================================================
        // STATIC FILE SERVING (CLIENT, ADMIN, ASSETS)
        // ====================================================================
        let filePath = '';
        if (pathname === '/' || pathname === '/index.html') {
            // Serve client index
            filePath = fs.existsSync(path.join(projectRoot, 'client', 'index.html'))
                ? path.join(projectRoot, 'client', 'index.html')
                : path.join(projectRoot, 'index.html');
        } else if (pathname === '/admin' || pathname === '/admin/') {
            filePath = path.join(projectRoot, 'admin', 'index.html');
        } else if (pathname.startsWith('/admin/')) {
            filePath = path.join(projectRoot, pathname);
        } else if (pathname.startsWith('/client/')) {
            filePath = path.join(projectRoot, pathname);
        } else if (pathname.startsWith('/assets/')) {
            filePath = path.join(projectRoot, pathname);
        } else {
            // Check client directory first, then root
            const clientAttempt = path.join(projectRoot, 'client', pathname);
            if (fs.existsSync(clientAttempt)) {
                filePath = clientAttempt;
            } else {
                filePath = path.join(projectRoot, pathname);
            }
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            const data = fs.readFileSync(filePath);
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            });
            return res.end(data);
        }

        // 404 Not Found
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');

    } catch (err) {
        console.error('[Server Error]', err);
        sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
    }
});

// Attach WebSocket Room Relay Server for real-time multiplayer
attachWebSocketServer(server);

server.listen(PORT, () => {
    console.log('====================================================');
    console.log(`⚔️  Destiny Duel Server running at http://localhost:${PORT}`);
    console.log(`🎮  Game Client URL:  http://localhost:${PORT}/`);
    console.log(`🛠️   Admin CMS URL:   http://localhost:${PORT}/admin`);
    console.log(`🌐  WebSocket Room:   ws://localhost:${PORT}/ws`);
    console.log('====================================================');
});
