# -*- coding: utf-8 -*-
"""
Card System Reference Compiler (retired as a game-config writer)

Reads config/CardGame_Cards.xlsx and refreshes reference JSON only:
  - data/generated/cards_base.json
  - data/generated/cards_pvp.json
  - data/generated/cards_pve.json
  - data/generated/card_effects.json
  - data/generated/cards.json

It no longer writes data/game_config.js and no longer touches the SQLite database —
see main() for the guard. Everything below the early `return` is unreachable history
kept for reference. The live pipeline is:
  tools/port_unity_content.py  ->  config/CardGame_Balance.xlsx
  tools/sync_balance.py        ->  data/game_config.js + data/generated/*
  database/init_db.js          ->  database/destiny_duel.db
"""
import os
import sys
import json
import sqlite3
import shutil
import openpyxl

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(PROJECT_ROOT, 'config', 'CardGame_Cards.xlsx')
GEN_DIR = os.path.join(PROJECT_ROOT, 'data', 'generated')
GAME_CONFIG_PATH = os.path.join(PROJECT_ROOT, 'data', 'game_config.js')
DB_PATH = os.path.join(PROJECT_ROOT, 'database', 'destiny_duel.db')

HEADER_MAP = {
    "卡牌id": "id", "id": "id", "卡牌ID": "id",
    "卡牌名称": "name", "name": "name", "名称": "name",
    "效果描述": "description", "描述": "description", "description": "description", "说明": "description",
    "消耗能量": "cost", "费用": "cost", "cost": "cost",
    "品质": "rarity", "稀有度": "rarity", "rarity": "rarity",
    "类型": "type", "卡牌类型": "type", "type": "type",
    "卡池类型": "pool_type", "pool_type": "pool_type",
    "是否可升级": "upgradeable", "upgradeable": "upgradeable",
    "初始等级": "level", "等级": "level", "level": "level",
    "主要效果": "effect_type", "主效果": "effect_type", "effect_type": "effect_type",
    "伤害数值": "damage", "伤害": "damage", "damage": "damage",
    "治疗数值": "heal", "治疗": "heal", "heal": "heal",
    "护盾数值": "shield", "护盾": "shield", "shield": "shield",
    "抽牌数量": "draw", "抽牌": "draw", "draw": "draw",
    "能量变化": "energy", "能量": "energy", "energy": "energy",
    "状态效果": "status", "状态": "status", "status": "status",
    "增益效果": "buff", "增益": "buff", "buff": "buff",
    "目标类型": "target", "目标": "target", "target": "target",
    "攻击段数": "hit_count", "hit_count": "hit_count",
    "反噬伤害": "self_damage", "self_damage": "self_damage",
    "触发概率": "proc_chance", "概率": "proc_chance", "proc_chance": "proc_chance",
    "触发条件": "condition", "条件": "condition", "condition": "condition",
    "条件参数": "condition_param", "condition_param": "condition_param",
    "条件追加数值": "condition_bonus", "condition_bonus": "condition_bonus",
    "流派标签": "tags", "标签": "tags", "tags": "tags",
    "效果类型标识": "effect_type", "效果中文名称": "name", "机制执行说明": "description", "默认作用目标": "target"
}

def parse_sheet(sheet):
    rows = list(sheet.iter_rows(values_only=True))
    if not rows or len(rows) < 2:
        return []
    
    header_row = rows[0]
    headers = []
    for h in header_row:
        if h is None:
            headers.append(None)
            continue
        h_str = str(h).strip()
        h_key = HEADER_MAP.get(h_str, HEADER_MAP.get(h_str.lower(), h_str))
        headers.append(h_key)

    items = []
    for row in rows[1:]:
        if not any(row):
            continue
        obj = {}
        for col_idx, val in enumerate(row):
            k = headers[col_idx] if col_idx < len(headers) else None
            if not k:
                continue
            if val is None:
                val = ""
            elif isinstance(val, (int, float)):
                pass
            else:
                val = str(val).strip()
            obj[k] = val

        # Post-process types
        if "id" in obj and obj["id"]:
            obj["cost"] = int(obj.get("cost") or 0)
            obj["damage"] = int(obj.get("damage") or 0)
            obj["heal"] = int(obj.get("heal") or 0)
            obj["shield"] = int(obj.get("shield") or 0)
            obj["draw"] = int(obj.get("draw") or 0)
            obj["energy"] = int(obj.get("energy") or 0)
            obj["hit_count"] = int(obj.get("hit_count") or 1)
            obj["self_damage"] = int(obj.get("self_damage") or 0)
            obj["proc_chance"] = float(obj.get("proc_chance") or 0.0)
            obj["condition_param"] = float(obj.get("condition_param") or 0.0)
            obj["condition_bonus"] = float(obj.get("condition_bonus") or 0.0)
            obj["level"] = int(obj.get("level") or 1)
            obj["upgradeable"] = 1 if str(obj.get("upgradeable", "")).lower() in ("1", "true", "yes", "是") else 0
            obj["target"] = str(obj.get("target") or "enemy")
            obj["effect_type"] = str(obj.get("effect_type") or "damage")
            obj["status"] = str(obj.get("status") or "")
            obj["buff"] = str(obj.get("buff") or "")
            obj["condition"] = str(obj.get("condition") or "")
            
            raw_tags = str(obj.get("tags") or "")
            obj["tags"] = [t.strip() for t in raw_tags.replace("，", ",").split(",") if t.strip()]

            items.append(obj)
    return items

def main():
    if not os.path.exists(EXCEL_PATH):
        print(f"Error: {EXCEL_PATH} not found.")
        sys.exit(1)

    # This generator used to write data/game_config.js and reseed the SQLite database with a
    # parallel 108-card pool that the browser never loaded. Since the Unity content port made
    # CardGame_Balance.xlsx the single source of truth, running it unguarded silently destroys
    # the shipped dataset. It can still refresh its own reference JSON on request.
    if "--reference-only" not in sys.argv:
        print("⛔ sync_cards.py 已停用为游戏配置写入器。")
        print("   data/game_config.js 与 database/destiny_duel.db 现在由以下链路唯一负责：")
        print("     1) python tools/port_unity_content.py   （Unity 资产 -> CardGame_Balance.xlsx）")
        print("     2) python tools/sync_balance.py         （xlsx -> data/generated + game_config.js + SQLite）")
        print("   config/CardGame_Cards.xlsx 那 108 张卡是并行的另一套设计，浏览器从未加载过。")
        print("   如只想刷新 data/generated/cards_{base,pvp,pve}.json 参考文件，请加 --reference-only。")
        sys.exit(2)

    print(f"📖 Reading {EXCEL_PATH} ...")
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    
    base_cards = parse_sheet(wb["Cards_Base"]) if "Cards_Base" in wb.sheetnames else []
    pvp_cards = parse_sheet(wb["Cards_PVP"]) if "Cards_PVP" in wb.sheetnames else []
    pve_cards = parse_sheet(wb["Cards_PVE"]) if "Cards_PVE" in wb.sheetnames else []
    
    effects = []
    if "Card_Effects" in wb.sheetnames:
        for r in list(wb["Card_Effects"].iter_rows(values_only=True))[1:]:
            if r and any(r):
                effects.append({
                    "effect_type": str(r[0] or ""),
                    "name": str(r[1] or ""),
                    "description": str(r[2] or ""),
                    "target": str(r[3] or "")
                })

    all_cards = base_cards + pvp_cards + pve_cards
    print(f"   Base cards: {len(base_cards)}")
    print(f"   PVP cards:  {len(pvp_cards)}")
    print(f"   PVE cards:  {len(pve_cards)}")
    print(f"   Total:      {len(all_cards)}")

    # 1. Output JSON files
    os.makedirs(GEN_DIR, exist_ok=True)
    with open(os.path.join(GEN_DIR, 'cards_base.json'), 'w', encoding='utf-8') as f:
        json.dump(base_cards, f, ensure_ascii=False, indent=2)
    with open(os.path.join(GEN_DIR, 'cards_pvp.json'), 'w', encoding='utf-8') as f:
        json.dump(pvp_cards, f, ensure_ascii=False, indent=2)
    with open(os.path.join(GEN_DIR, 'cards_pve.json'), 'w', encoding='utf-8') as f:
        json.dump(pve_cards, f, ensure_ascii=False, indent=2)
    with open(os.path.join(GEN_DIR, 'card_effects.json'), 'w', encoding='utf-8') as f:
        json.dump(effects, f, ensure_ascii=False, indent=2)
    
    # Combined map
    cards_map = {c["id"]: c for c in all_cards}
    with open(os.path.join(GEN_DIR, 'cards.json'), 'w', encoding='utf-8') as f:
        json.dump(cards_map, f, ensure_ascii=False, indent=2)

    # 2. Update data/game_config.js
    # Permanently disabled: game_config.js is generated solely by tools/sync_balance.py from
    # CardGame_Balance.xlsx. Writing it from here is what used to wipe the shipped 90-card set
    # back to this parallel 108-card pool.
    print("✅ 参考 JSON 已刷新到 data/generated/cards_{base,pvp,pve}.json / card_effects.json / cards.json")
    print("⏹  按设计到此为止：不写 data/game_config.js，不动 database/destiny_duel.db。")
    print("   要让配置进入游戏，请运行 python tools/sync_balance.py")
    return

    def load_json(name, default_val):
        p = os.path.join(GEN_DIR, name)
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        return default_val

    cfg_obj = {
        "gameRules": load_json('gameRules.json', {}),
        "characters": load_json('characters.json', {}),
        "heroes": load_json('heroes.json', {}),
        "skills": load_json('skills.json', {}),
        "cards": cards_map,
        "cards_base": base_cards,
        "cards_pvp": pvp_cards,
        "cards_pve": pve_cards,
        "card_effects": effects,
        "statuses": load_json('statuses.json', {}),
        "cardPools": load_json('cardPools.json', {}),
        "blessings": load_json('blessings.json', {})
    }

    new_js = (
        "// Auto-generated from CardGame_Cards.xlsx and CardGame_Balance.xlsx\n"
        "(function(root) {\n"
        f"    root.GAME_CONFIG = {json.dumps(cfg_obj, ensure_ascii=False, indent=2)};\n"
        "    if (typeof module !== 'undefined' && module.exports) {\n"
        "        module.exports = root.GAME_CONFIG;\n"
        "    }\n"
        "})(typeof window !== 'undefined' ? window : global);\n"
    )
    with open(GAME_CONFIG_PATH, 'w', encoding='utf-8') as f:
        f.write(new_js)
    print(f"✅ Updated {GAME_CONFIG_PATH}")

    # 3. Update SQLite Database
    if os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()

        # Check and add missing columns to cards table
        cur.execute("PRAGMA table_info(cards)")
        existing_cols = {row[1] for row in cur.fetchall()}

        cols_to_add = [
            ("pool_type", "TEXT DEFAULT 'Base'"),
            ("upgradeable", "INTEGER DEFAULT 0"),
            ("level", "INTEGER DEFAULT 1"),
            ("effect_type", "TEXT DEFAULT 'damage'"),
            ("draw", "INTEGER DEFAULT 0"),
            ("energy", "INTEGER DEFAULT 0"),
            ("status", "TEXT DEFAULT ''"),
            ("buff", "TEXT DEFAULT ''"),
            ("target", "TEXT DEFAULT 'enemy'"),
            ("hit_count", "INTEGER DEFAULT 1"),
            ("self_damage", "INTEGER DEFAULT 0"),
            ("proc_chance", "REAL DEFAULT 0"),
            ("condition", "TEXT DEFAULT ''"),
            ("condition_param", "REAL DEFAULT 0"),
            ("condition_bonus", "REAL DEFAULT 0"),
            ("tags", "TEXT DEFAULT ''")
        ]

        for col_name, col_def in cols_to_add:
            if col_name not in existing_cols:
                cur.execute(f"ALTER TABLE cards ADD COLUMN {col_name} {col_def}")
                print(f"   [DB Migration] Added column cards.{col_name}")

        # Insert / Update all 108 cards
        upsert_sql = """
        INSERT INTO cards (
            id, name, card_type, rarity, cost, damage, shield, heal, draw_count,
            pool_type, upgradeable, level, effect_type, draw, energy, status, buff,
            target, hit_count, self_damage, proc_chance, condition, condition_param,
            condition_bonus, tags, description, enabled
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, 1
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
        """

        for c in all_cards:
            tags_str = ",".join(c.get("tags") or []) if isinstance(c.get("tags"), list) else str(c.get("tags") or "")
            cur.execute(upsert_sql, (
                c["id"], c["name"], c.get("type", "attack"), c.get("rarity", "common"),
                c.get("cost", 1), c.get("damage", 0), c.get("shield", 0), c.get("heal", 0),
                c.get("draw", 0), c.get("pool_type", "Base"), c.get("upgradeable", 0),
                c.get("level", 1), c.get("effect_type", "damage"), c.get("draw", 0),
                c.get("energy", 0), c.get("status", ""), c.get("buff", ""),
                c.get("target", "enemy"), c.get("hit_count", 1), c.get("self_damage", 0),
                c.get("proc_chance", 0), c.get("condition", ""), c.get("condition_param", 0),
                c.get("condition_bonus", 0), tags_str, c.get("description", "")
            ))

        # Clean up obsolete cards not present in the current Excel workbook
        current_ids = [c["id"] for c in all_cards]
        placeholders = ",".join("?" for _ in current_ids)
        cur.execute(f"DELETE FROM cards WHERE id NOT IN ({placeholders})", current_ids)
        cur.execute(f"DELETE FROM user_collections WHERE card_id NOT IN ({placeholders})", current_ids)

        # Default ownership for player_local: all 12 Base cards owned with count = 2
        for bc in base_cards:
            cur.execute("""
                INSERT INTO user_collections (user_id, card_id, count)
                VALUES ('player_local', ?, 2)
                ON CONFLICT(id) DO UPDATE SET count = MAX(count, 2)
            """, (bc["id"],))

        conn.commit()
        conn.close()
        print(f"✅ Synchronized {len(all_cards)} cards into SQLite database {DB_PATH}")

    # 4. Copy to client directory
    client_dir = os.path.join(PROJECT_ROOT, 'client')
    if os.path.exists(client_dir):
        client_game_config = os.path.join(client_dir, 'data', 'game_config.js')
        if os.path.exists(os.path.dirname(client_game_config)):
            shutil.copy2(GAME_CONFIG_PATH, client_game_config)
        client_gen = os.path.join(client_dir, 'data', 'generated')
        if os.path.exists(client_gen):
            for fname in os.listdir(GEN_DIR):
                shutil.copy2(os.path.join(GEN_DIR, fname), os.path.join(client_gen, fname))
        print("✅ Synced generated files to client/ directory")

    print("\n🎉 Card system synchronization finished successfully!")

if __name__ == '__main__':
    import re
    main()
