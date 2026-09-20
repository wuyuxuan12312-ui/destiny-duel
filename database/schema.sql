-- ============================================================================
-- 《宿命对决 Destiny Duel》- 全局 SQLite 数据库架构 DDL
-- ============================================================================

-- 1. 英雄基础数据表 (heroes)
CREATE TABLE IF NOT EXISTS heroes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT DEFAULT '输出型',
    max_hp INTEGER NOT NULL DEFAULT 30,
    base_attack INTEGER NOT NULL DEFAULT 4,
    starting_energy INTEGER DEFAULT 3,
    max_energy INTEGER DEFAULT 6,
    passive_id TEXT,
    skill_id TEXT,
    avatar_url TEXT DEFAULT '',
    description TEXT,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 英雄专属技能表 (skills)
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    hero_id TEXT,
    name TEXT NOT NULL,
    skill_type TEXT,
    cost INTEGER DEFAULT 2,
    cooldown INTEGER DEFAULT 2,
    damage INTEGER DEFAULT 0,
    heal INTEGER DEFAULT 0,
    shield INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    effect_type1 TEXT,
    effect_val1 REAL DEFAULT 0,
    effect_type2 TEXT,
    effect_val2 REAL DEFAULT 0,
    effect_id TEXT,
    icon_url TEXT DEFAULT '',
    description TEXT
);

-- 3. 战斗卡牌表 (cards)
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    card_type TEXT NOT NULL,       -- attack, defense, heal, special, resource, control
    rarity TEXT DEFAULT 'common',   -- N, R, SR, SSR / common, rare, epic
    cost INTEGER NOT NULL DEFAULT 1,
    damage INTEGER DEFAULT 0,
    shield INTEGER DEFAULT 0,
    heal INTEGER DEFAULT 0,
    draw_count INTEGER DEFAULT 0,
    pool_type TEXT DEFAULT 'Base',  -- Base, PVP, PVE
    upgradeable INTEGER DEFAULT 0,  -- 0 = 否, 1 = 是
    level INTEGER DEFAULT 1,        -- 基础等级 (1)
    effect_type TEXT DEFAULT 'damage', -- damage, heal, shield, draw, energy, status, buff
    draw INTEGER DEFAULT 0,
    energy INTEGER DEFAULT 0,
    status TEXT DEFAULT '',
    buff TEXT DEFAULT '',
    target TEXT DEFAULT 'enemy',    -- enemy, self
    hit_count INTEGER DEFAULT 1,
    self_damage INTEGER DEFAULT 0,
    proc_chance REAL DEFAULT 0,
    condition TEXT DEFAULT '',
    condition_param REAL DEFAULT 0,
    condition_bonus REAL DEFAULT 0,
    tags TEXT DEFAULT '',
    then_effects_json TEXT DEFAULT '[]',      -- 分支/态势判定命中后的效果
    else_effects_json TEXT DEFAULT '[]',      -- 未命中时的效果
    reaction_json TEXT,                       -- 延迟反应卡 {condition, effects}
    image_url TEXT DEFAULT '',
    description TEXT,
    enabled INTEGER DEFAULT 1
);

-- 4. 状态效果表 (statuses)
CREATE TABLE IF NOT EXISTS statuses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'debuff', -- buff, debuff
    trigger_timing TEXT,            -- turn_start, turn_end, on_hit, on_attack
    damage_per_turn REAL DEFAULT 0,
    heal_per_turn REAL DEFAULT 0,
    damage_modifier REAL DEFAULT 0,
    damage_taken_modifier REAL DEFAULT 0,
    duration INTEGER DEFAULT 1,
    max_stacks INTEGER DEFAULT 3,
    stack_rule TEXT DEFAULT 'stack_duration_refresh',
    icon_url TEXT DEFAULT '',
    description TEXT
);

-- 5. 游戏全局规则表 (game_rules)
CREATE TABLE IF NOT EXISTS game_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    value REAL NOT NULL,
    description TEXT
);

-- 6. 初始对战卡组构筑表 (card_pools)
CREATE TABLE IF NOT EXISTS card_pools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hero_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 2,
    enabled INTEGER DEFAULT 1
);

-- 7. 抽卡卡池表 (card_packs)
CREATE TABLE IF NOT EXISTS card_packs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cost_gold INTEGER DEFAULT 100,
    image_url TEXT DEFAULT '',
    rates_json TEXT NOT NULL,       -- {"SSR": 0.05, "SR": 0.20, "R": 0.40, "N": 0.35}
    pool_cards_json TEXT,           -- 包含的可抽卡牌 ID 数组，为 null 则抽全卡池
    enabled INTEGER DEFAULT 1
);

-- 8. 玩家卡牌收藏库 (user_collections)
CREATE TABLE IF NOT EXISTS user_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT 'player_local',
    card_id TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. 管理员权限表 (admin_users)
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. 图片资源元数据表 (assets_meta)
CREATE TABLE IF NOT EXISTS assets_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_type TEXT NOT NULL,       -- hero, card, skill, ui
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    url_path TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. 未来扩展架构预留 (装备、天赋、赛季、排行榜)
CREATE TABLE IF NOT EXISTS equipments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slot TEXT,                     -- weapon, armor, accessory
    bonus_hp INTEGER DEFAULT 0,
    bonus_attack INTEGER DEFAULT 0,
    effect_json TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS talents (
    id TEXT PRIMARY KEY,
    hero_id TEXT,
    tree_branch TEXT,
    tier INTEGER DEFAULT 1,
    effect_json TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS leaderboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id TEXT,
    player_name TEXT NOT NULL,
    score INTEGER DEFAULT 1000,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 12. PVE 移植新增表（章节关卡 / 玩家钱包与保底 / 关卡进度）
-- ============================================================

-- 章节关卡定义。数值来源仍是 CardGame_Balance.xlsx 的 PveStages 表，
-- 这里存服务端副本以便后台与统计查询。
CREATE TABLE IF NOT EXISTS pve_stages (
    stage_id INTEGER PRIMARY KEY,
    stage_code TEXT NOT NULL,
    stage_name TEXT NOT NULL,
    recommended_power INTEGER DEFAULT 0,
    enemy_name TEXT NOT NULL,
    enemy_max_hp INTEGER NOT NULL,
    enemy_deck_json TEXT NOT NULL,        -- [{"cardId":"base_strike","count":2}, ...] 共 15 张
    first_clear_gold INTEGER DEFAULT 0,
    first_clear_gems INTEGER DEFAULT 0,
    first_clear_card_id TEXT DEFAULT '',
    repeat_gold INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    enabled INTEGER DEFAULT 1
);

-- 玩家钱包与抽卡保底。保底计数必须落库：只存在浏览器里会让玩家换个设备就重置 80 抽进度。
CREATE TABLE IF NOT EXISTS player_wallet (
    user_id TEXT PRIMARY KEY,
    gold INTEGER NOT NULL DEFAULT 2000,
    gems INTEGER NOT NULL DEFAULT 100,
    pity_since_ssr INTEGER NOT NULL DEFAULT 0,
    pity_luck REAL NOT NULL DEFAULT 0,
    total_pulls INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 关卡进度。collected_json 记录已领取的首通奖励，防止重复领取。
CREATE TABLE IF NOT EXISTS pve_progress (
    user_id TEXT PRIMARY KEY,
    cleared_stage INTEGER NOT NULL DEFAULT 0,
    highest_stage INTEGER NOT NULL DEFAULT 1,
    wins_json TEXT NOT NULL DEFAULT '{}',
    collected_json TEXT NOT NULL DEFAULT '[]',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 卡牌等级（PVE 卡 Lv.1~3）。重复抽到即免费升级，是 Unity 侧抽卡与强化两条路线的合并点。
CREATE TABLE IF NOT EXISTS user_card_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    UNIQUE(user_id, card_id)
);
