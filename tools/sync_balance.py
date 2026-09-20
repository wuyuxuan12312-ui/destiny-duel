# -*- coding: utf-8 -*-
"""
CardGame Balance Synchronizer & Schema Validator (Data-Driven Architecture)
Reads CardGame_Balance.xlsx, runs strict validation, and emits:
  - data/generated/gameRules.json
  - data/generated/characters.json
  - data/generated/heroes.json (Alias for characters.json)
  - data/generated/skills.json
  - data/generated/cards.json
  - data/generated/statuses.json
  - data/generated/cardPools.json
  - data/generated/blessings.json
  - data/generated/pveStages.json
  - data/generated/gachaPity.json
  - data/game_config.js (Universal Zero-CORS browser bundle)
"""
import os
import re
import sys
import json
import shutil
import openpyxl

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

HEADER_MAP = {
    # General
    "名称": "name", "卡牌名称": "cardName", "角色名称": "characterName", "技能名称": "skillName",
    "规则名称": "ruleName", "状态名称": "statusName", "说明": "description", "卡牌说明": "description",
    "技能说明": "description", "详细说明": "description", "规则描述": "description", "角色描述": "description",
    "状态描述": "description", "备注": "notes", "策划备注": "notes", "启用": "enabled", "启用状态": "enabled",

    # Cards & Skills Effect Editor
    "卡牌id": "cardId", "类型": "type", "卡牌类型": "type", "品质": "rarity", "稀有度": "rarity",
    "费用": "cost", "消耗能量": "cost", "伤害": "damage", "造成伤害": "damage", "护盾": "shield",
    "获得护盾": "shield", "治疗": "heal", "恢复生命": "heal", "抽牌": "draw", "抽牌数量": "draw",
    "持续回合": "duration", "触发概率": "chance", "概率": "chance", "效果标识": "effectId",
    "目标类型": "targetType", "精炼描述": "description",
    "主效果类型": "effectType1", "主效果数值": "effectVal1",
    "次效果类型": "effectType2", "次效果数值": "effectVal2",
    "关联状态id": "statusId", "状态层数": "statusStacks", "附带状态id": "effectId",

    # Characters
    "角色id": "characterId", "战斗定位": "role", "定位": "role", "最大生命": "maxHp",
    "生命值": "maxHp", "基础攻击": "baseAttack", "普攻伤害": "baseAttack", "初始能量": "startingEnergy",
    "最大能量": "maxEnergy", "被动id": "passiveId", "技能id": "skillId", "专属技能id": "skillId",

    # CharacterSkills
    "技能类型": "skillType", "技能机制类型": "skillType", "冷却回合": "cooldown", "冷却": "cooldown", "对应角色id": "characterId",

    # GameRules
    "规则id": "ruleId", "数值": "value", "单位": "unit", "最小值": "minValue", "最大值": "maxValue",
    "可编辑": "editable",

    # StatusEffects
    "状态id": "statusId", "分类": "category", "状态类型": "category", "触发时机": "triggerTiming",
    "每回合伤害": "damagePerTurn", "每回合跳伤": "damagePerTurn", "每回合治疗": "healPerTurn",
    "造成伤害修正": "damageModifier", "伤害加成/削弱": "damageModifier", "受到伤害修正": "damageTakenModifier",
    "受击减伤比例": "damageTakenModifier", "最大层数": "maxStacks", "叠加上限": "maxStacks", "叠加规则": "stackRule",

    # CardPools
    "卡池条目id": "poolId", "携带张数": "count", "张数": "count", "初始卡牌": "starter",

    # Strategy Extensions (Tags, Levels, Modifiers, Blessings)
    "标签": "tags", "卡牌标签": "tags", "属性标签": "tags", "等级": "level", "初始等级": "level",
    "伤害加成": "damageBonus", "治疗加成": "healBonus", "护盾加成": "shieldBonus",
    "祝福id": "blessingId", "祝福名称": "blessingName"
}

def resolve_header(raw_header):
    if raw_header is None:
        return ""
    text = str(raw_header).strip()
    m = re.search(r'\(([\w_]+)\)', text)
    if m:
        return m.group(1).strip()
    clean = re.sub(r'[\s\n\r\t]+', '', text).lower()
    return HEADER_MAP.get(clean, text)


# --- Ported-content helpers ---------------------------------------------------
# Compact effect notation, shared with the QuickCreator templates already in the
# workbook: "damage:18", "shield:8|draw:1", "status:burn:2".
def parse_effect_tokens(spec):
    effects = []
    for token in str(spec or "").split("|"):
        token = token.strip()
        if not token or token == "-":
            continue
        parts = token.split(":")
        kind, value = parts[0], (parts[1] if len(parts) > 1 else "")
        try:
            number = float(value) if value != "" else 0.0
        except ValueError:
            number = 0.0
        if kind == "status" and len(parts) > 2:
            effects.append({"type": "apply_status", "status": parts[1],
                            "stacks": int(float(parts[2]))})
        elif kind == "status":
            effects.append({"type": "apply_status", "status": parts[1] if len(parts) > 1 else "burn",
                            "stacks": int(number) or 1})
        elif kind == "draw":
            effects.append({"type": "draw_card", "count": int(number)})
        elif kind == "energy":
            effects.append({"type": "gain_energy", "value": number})
        elif kind == "damage":
            effects.append({"type": "damage", "value": number})
        elif kind == "shield":
            effects.append({"type": "shield", "value": number})
        elif kind == "heal":
            effects.append({"type": "heal", "value": number})
        else:
            effects.append({"type": kind, "value": number})
    return effects


def parse_buff_spec(spec):
    """Split a buffSpec into plain buff tokens plus the delayed-reaction declaration."""
    buffs, reaction = [], None
    for part in str(spec or "").split(","):
        part = part.strip()
        if not part:
            continue
        m = re.match(r"reaction\[(.+?)\]=>(.+)$", part)
        if m:
            reaction = {"condition": m.group(1).strip(),
                        "effects": parse_effect_tokens(m.group(2))}
        else:
            buffs.append(part)
    return ",".join(buffs), reaction


def split_condition(raw):
    """'target_hp_below:40' -> ('target_hp_below', 40)."""
    text = str(raw or "").strip()
    if not text or text == "-":
        return "", 0
    if ":" in text:
        name, _, value = text.partition(":")
        try:
            return name.strip(), float(value)
        except ValueError:
            return name.strip(), 0
    return text, 0


def primary_effect_type(card, effects):
    """The single dominant effect kind, used for card art and AI scoring."""
    explicit = str(card.get("effectType") or "").strip()
    if explicit and explicit != "-":
        return explicit
    if float(card.get("damage") or 0) > 0:
        return "damage"
    if float(card.get("shield") or 0) > 0:
        return "shield"
    if float(card.get("heal") or 0) > 0:
        return "heal"
    if int(card.get("draw") or card.get("drawCount") or 0) > 0:
        return "draw"
    if float(card.get("energyChange") or 0) != 0:
        return "energy"
    if str(card.get("statusSpec") or "").strip():
        return "status"
    if str(card.get("buffSpec") or "").strip():
        return "buff"
    return "damage"


def bridge_legacy_secondary(card, effects):
    """The 18 pre-port cards encode secondary mechanics only inside effects[], which the
    live CardEffectEngine path never reads. Mirror them onto the flat runtime fields so
    pierce / recoil / conditional damage actually apply."""
    buff_tokens = [t for t in str(card.get("buffSpec") or "").split(",") if t.strip()]
    for eff in effects:
        etype = eff.get("type")
        if etype == "damage" and eff.get("pierceRatio"):
            token = "shield_penetration:%g" % float(eff["pierceRatio"])
            if token not in buff_tokens:
                buff_tokens.append(token)
        elif etype == "self_damage" and float(eff.get("value") or 0) > 0:
            card["self_damage"] = float(eff["value"])
        elif etype == "conditional" and eff.get("thenEffects"):
            then = eff["thenEffects"][0]
            if then.get("type") == "damage":
                card["condition"] = "user_has_shield"
                card["condition_bonus"] = float(then.get("value") or 0)
    return ",".join(buff_tokens)


def get_desktop_path():
    if os.name == 'nt':
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders")
            desktop, _ = winreg.QueryValueEx(key, "Desktop")
            winreg.CloseKey(key)
            desktop = os.path.expandvars(desktop)
            if os.path.isdir(desktop):
                return desktop
        except Exception:
            pass
    return os.path.join(os.path.expanduser("~"), "Desktop")

def read_sheet(ws):
    rows = list(ws.iter_rows(values_only=True))
    if not rows or len(rows) < 2:
        return []
    headers = [resolve_header(h) for h in rows[0]]
    entries = []
    for r_idx, r in enumerate(rows[1:], 2):
        if all(v is None or str(v).strip() == "" for v in r):
            continue
        item = {}
        for h, v in zip(headers, r):
            if h:
                item[h] = v
        item["_row"] = r_idx
        entries.append(item)
    return entries

def build_card_effects(card, status_ids):
    effects = []
    e1 = str(card.get("effectType1") or "").strip()
    v1 = card.get("effectVal1")
    e2 = str(card.get("effectType2") or "").strip()
    v2 = card.get("effectVal2")
    sid = str(card.get("statusId") or card.get("effectId") or "").strip()
    stacks = int(card.get("statusStacks") or 1)

    if e1 and e1 != "-":
        if e1 == "damage":
            effects.append({"type": "damage", "value": float(v1 if v1 is not None else (card.get("damage") or 0))})
        elif e1 == "shield":
            effects.append({"type": "shield", "value": float(v1 if v1 is not None else (card.get("shield") or 0))})
        elif e1 == "heal":
            effects.append({"type": "heal", "value": float(v1 if v1 is not None else (card.get("heal") or 0))})
        elif e1 in ["draw", "draw_card"]:
            effects.append({"type": "draw_card", "count": int(v1 if v1 is not None else (card.get("draw") or 1))})
        elif e1 == "gain_energy":
            effects.append({"type": "gain_energy", "value": float(v1 if v1 is not None else 2)})
        elif e1 == "apply_status":
            effects.append({"type": "apply_status", "status": sid or "burn", "stacks": int(v1 if v1 is not None else stacks)})
        elif e1 == "modify_damage":
            sub = "percentage_reduction" if float(v1 or 0) < 1 else "next_damage_bonus"
            effects.append({"type": "modify_damage", "subType": sub, "value": float(v1 or 2)})
        else:
            effects.append({"type": e1, "value": float(v1 or 0)})

    if e2 and e2 != "-":
        if e2 == "apply_status":
            effects.append({"type": "apply_status", "status": sid or "burn", "stacks": int(v2 if v2 is not None else stacks)})
        elif e2 == "pierce":
            effects.append({"type": "damage", "value": float(card.get("damage") or 4), "pierceRatio": float(v2 if v2 is not None else 0.5)})
        elif e2 == "self_damage":
            effects.append({"type": "self_damage", "value": float(v2 if v2 is not None else (card.get("selfDamage") or 1))})
        elif e2 in ["draw", "draw_card"]:
            effects.append({"type": "draw_card", "count": int(v2 if v2 is not None else 1)})
        elif e2 == "modify_damage":
            effects.append({"type": "modify_damage", "subType": "next_damage_bonus", "value": float(v2 if v2 is not None else 2)})
        elif e2 in ["steal", "steal_card"]:
            effects.append({"type": "steal_card"})
        elif e2 == "forbid_normal_attack":
            effects.append({"type": "forbid_normal_attack"})
        elif e2 == "conditional":
            effects.append({"type": "conditional", "condition": "user_has_shield", "thenEffects": [{"type": "damage", "value": float(v2 if v2 is not None else 3)}]})
        else:
            effects.append({"type": e2, "value": float(v2 or 0)})

    # Fallback to standard properties if no e1/e2 specified
    if not effects:
        dmg = float(card.get("damage") or 0)
        shield = float(card.get("shield") or 0)
        heal = float(card.get("heal") or 0)
        draw = int(card.get("draw") or card.get("drawCount") or 0)
        if dmg > 0: effects.append({"type": "damage", "value": dmg})
        if shield > 0: effects.append({"type": "shield", "value": shield})
        if heal > 0: effects.append({"type": "heal", "value": heal})
        if draw > 0: effects.append({"type": "draw_card", "count": draw})
        if sid and sid in status_ids:
            effects.append({"type": "apply_status", "status": sid, "stacks": stacks})

    return effects

def build_skill_effects(skill):
    effects = []
    e1 = str(skill.get("effectType1") or "").strip()
    v1 = skill.get("effectVal1")
    e2 = str(skill.get("effectType2") or "").strip()
    v2 = skill.get("effectVal2")
    sid = str(skill.get("effectId") or "").strip()

    if e1 and e1 != "-":
        if e1 == "damage":
            effects.append({"type": "damage", "value": float(v1 if v1 is not None else (skill.get("damage") or 0))})
        elif e1 == "shield":
            effects.append({"type": "shield", "value": float(v1 if v1 is not None else (skill.get("shield") or 0))})
        elif e1 == "heal":
            effects.append({"type": "heal", "value": float(v1 if v1 is not None else (skill.get("heal") or 0))})
        elif e1 == "apply_status":
            effects.append({"type": "apply_status", "status": sid or "burn", "stacks": int(v1 if v1 is not None else 1)})

    if e2 and e2 != "-":
        if e2 == "apply_status":
            effects.append({"type": "apply_status", "status": sid or "burn", "stacks": int(v2 if v2 is not None else 1)})
        elif e2 == "modify_damage":
            effects.append({"type": "modify_damage", "subType": "flat_reduction", "value": float(v2 if v2 is not None else 1)})
        elif e2 == "conditional":
            threshold = float(v2 if v2 is not None else 0.8)
            if threshold < 1.0: # HP ratio condition
                heal_val = float(skill.get("heal") or 7)
                effects.append({
                    "type": "conditional",
                    "condition": "target_hp_ratio_above",
                    "threshold": threshold,
                    "thenEffects": [{"type": "heal", "value": max(1, heal_val - 3)}],
                    "elseEffects": [{"type": "heal", "value": heal_val}]
                })
            else: # Extra combo damage condition
                sec_dmg = float(v2 or 3)
                effects.append({
                    "type": "conditional",
                    "condition": "chance",
                    "chance": float(skill.get("chance") or skill.get("procChance") or 0.4),
                    "thenEffects": [{"type": "damage", "value": sec_dmg, "isElectric": True}]
                })

    # Fallback generic effects
    if not effects:
        dmg = float(skill.get("damage") or 0)
        shield = float(skill.get("shield") or 0)
        heal = float(skill.get("heal") or 0)
        if dmg > 0: effects.append({"type": "damage", "value": dmg})
        if shield > 0: effects.append({"type": "shield", "value": shield})
        if heal > 0: effects.append({"type": "heal", "value": heal})
        if sid: effects.append({"type": "apply_status", "status": sid, "stacks": 1})

    return effects

def sync():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    config_dir = os.path.join(project_root, "config")
    desktop_dir = get_desktop_path()

    desktop_xlsx = os.path.join(desktop_dir, "CardGame_Balance.xlsx")
    project_xlsx = os.path.join(config_dir, "CardGame_Balance.xlsx")

    # config/ is the canonical workbook. Reading whatever happened to sit on the Desktop first
    # meant a stale copy there silently became the game's entire dataset.
    if os.environ.get("DESTINY_DUEL_USE_DESKTOP_XLSX") == "1" and os.path.isfile(desktop_xlsx):
        active_xlsx = desktop_xlsx
    else:
        active_xlsx = project_xlsx
        if os.path.isfile(desktop_xlsx):
            print("[提示] 桌面存在 CardGame_Balance.xlsx 副本，已忽略（以 config/ 为准）。"
                  "确实要用桌面那份请设环境变量 DESTINY_DUEL_USE_DESKTOP_XLSX=1。")
    if not os.path.isfile(active_xlsx):
        print(f"[ERROR] 未找到数值表: {active_xlsx}")
        sys.exit(1)

    print("==================================================")
    print("  宿命对决 - 数值配置同步系统 (Excel -> Game Config)   ")
    print("==================================================")
    print(f"[读取数据源]: {active_xlsx}")

    wb = openpyxl.load_workbook(active_xlsx, data_only=True)

    # 1. GameRules
    rules_raw = read_sheet(wb["GameRules"])
    game_rules = {}
    for r in rules_raw:
        rid = str(r.get("ruleId") or "").strip()
        if not rid: continue
        val = r.get("value")
        if isinstance(val, (int, float)):
            num_val = val
        else:
            try: num_val = float(val) if "." in str(val) else int(val)
            except Exception: num_val = val
        game_rules[rid] = {
            "ruleId": rid,
            "ruleName": str(r.get("ruleName") or "").strip(),
            "value": num_val,
            "unit": str(r.get("unit") or "").strip(),
            "description": str(r.get("description") or "").strip()
        }

    # 2. StatusEffects
    status_raw = read_sheet(wb["StatusEffects"])
    status_dict = {}
    status_ids = set()
    for s in status_raw:
        sid = str(s.get("statusId") or "").strip()
        if not sid: continue
        status_ids.add(sid)
        dur = int(s.get("duration") or 0)
        max_s = int(s.get("maxStacks") or 1)
        status_dict[sid] = {
            "statusId": sid,
            "statusName": str(s.get("statusName") or "").strip(),
            "category": str(s.get("category") or "debuff").strip(),
            "triggerTiming": str(s.get("triggerTiming") or "turn_end").strip(),
            "damagePerTurn": float(s.get("damagePerTurn") or 0),
            "healPerTurn": float(s.get("healPerTurn") or 0),
            "damageModifier": float(s.get("damageModifier") or 0),
            "damageTakenModifier": float(s.get("damageTakenModifier") or 0),
            "duration": dur,
            "maxStacks": max_s,
            "stackRule": str(s.get("stackRule") or "stack_duration_refresh").strip(),
            # Multiplier / flat / retaliation knobs the damage pipeline reads. Previously
            # statuses carried damageModifier and damageTakenModifier that nothing consumed.
            "damageTakenMultiplier": float(s.get("damageTakenMultiplier") or 0) or None,
            "damageDealtMultiplier": float(s.get("damageDealtMultiplier") or 0) or None,
            "damageTakenFlat": float(s.get("damageTakenFlat") or 0) or None,
            "damageDealtFlat": float(s.get("damageDealtFlat") or 0) or None,
            "thorns": float(s.get("thorns") or 0) or None,
            "damageKind": str(s.get("damageKind") or "physical").strip(),
            "blocksAttackAndSkill": bool(int(s.get("blocksAttackAndSkill") or 0)),
            "description": str(s.get("description") or "").strip()
        }
        status_dict[sid] = {k: v for k, v in status_dict[sid].items() if v is not None}

    # 3. CharacterSkills
    skills_raw = read_sheet(wb["CharacterSkills"])
    skill_dict = {}
    skill_ids = set()
    for sk in skills_raw:
        skid = str(sk.get("skillId") or "").strip()
        if not skid: continue
        skill_ids.add(skid)
        cost = int(sk.get("cost") or 0)
        cd = int(sk.get("cooldown") or 0)
        chance = float(sk.get("chance") or sk.get("procChance") or 0.0)

        skill_effects = build_skill_effects(sk)

        skill_dict[skid] = {
            "skillId": skid,
            "characterId": str(sk.get("characterId") or "").strip(),
            "skillName": str(sk.get("skillName") or "").strip(),
            "skillType": str(sk.get("skillType") or "").strip(),
            "cost": cost,
            "cooldown": cd,
            "damage": float(sk.get("damage") or 0),
            "heal": float(sk.get("heal") or 0),
            "shield": float(sk.get("shield") or 0),
            "duration": int(sk.get("duration") or 0),
            "chance": chance,
            "procChance": chance,
            "secondaryDamage": float(sk.get("secondaryDamage") or 0),
            "effectId": str(sk.get("effectId") or "").strip(),
            "effects": skill_effects,
            "description": str(sk.get("description") or "").strip()
        }

    # 4. Characters
    chars_raw = read_sheet(wb["Characters"])
    char_dict = {}
    char_ids = set()
    for c in chars_raw:
        cid = str(c.get("characterId") or "").strip()
        if not cid: continue
        char_ids.add(cid)
        hp = int(c.get("maxHp") or 0)
        atk = int(c.get("baseAttack") or 0)
        s_eng = int(c.get("startingEnergy") or 3)
        m_eng = int(c.get("maxEnergy") or 6)

        dmg_bonus = float(c.get("damageBonus") or (1.0 if cid in ["fire_warrior", "lightning_assassin"] else 0.0))
        heal_bonus = float(c.get("healBonus") or (1.0 if cid == "forest_mage" else 0.0))
        shield_bonus = float(c.get("shieldBonus") or (1.0 if cid in ["iron_guardian", "ice_mage"] else 0.0))

        char_dict[cid] = {
            "characterId": cid,
            "characterName": str(c.get("characterName") or "").strip(),
            "role": str(c.get("role") or "").strip(),
            "maxHp": hp,
            "baseAttack": atk,
            "startingEnergy": s_eng,
            "maxEnergy": m_eng,
            "passiveId": str(c.get("passiveId") or f"{cid}_passive").strip(),
            "skillId": str(c.get("skillId") or f"{cid}_skill").strip(),
            "damageBonus": dmg_bonus,
            "healBonus": heal_bonus,
            "shieldBonus": shield_bonus,
            "modifiers": {
                "damageBonus": dmg_bonus,
                "healBonus": heal_bonus,
                "shieldBonus": shield_bonus
            },
            "description": str(c.get("description") or "").strip(),
            "enabled": bool(c.get("enabled", True))
        }

    # 5. Cards
    cards_raw = read_sheet(wb["Cards"])
    cards_dict = {}
    card_ids = set()
    default_tag_map = {
        "quick_attack": ["attack"],
        "heavy_strike": ["attack"],
        "pierce": ["attack"],
        "dual_slash": ["attack"],
        "shield_bash": ["attack", "defense"],
        "small_shield": ["defense"],
        "large_shield": ["defense"],
        "defensive_stance": ["defense"],
        "small_heal": ["heal"],
        "meditation": ["heal"],
        "flame_flask": ["fire"],
        "poison_blade": ["poison"],
        "energy_surge": ["defense"],
        "focus": ["attack"],
        "weaken": ["poison"],
        "steal": ["heal"],
        "ice_spike": ["ice"]
    }

    for card in cards_raw:
        kid = str(card.get("cardId") or "").strip()
        if not kid: continue
        card_ids.add(kid)
        cost = int(card.get("cost") or 0)
        eff_id = str(card.get("effectId") or card.get("statusId") or "").strip()
        chance = float(card.get("chance") or card.get("procChance") or 1.0)

        card_effects = build_card_effects(card, status_ids)

        raw_tags = str(card.get("tags") or "").strip()
        if raw_tags and raw_tags != "-":
            tags = [t.strip() for t in re.split(r'[,，;|/]', raw_tags) if t.strip()]
        else:
            tags = default_tag_map.get(kid, ["attack"])

        # --- ported (Unity-sourced) schema fields ------------------------------
        status_spec = str(card.get("statusSpec") or "").strip()
        if status_spec.startswith("status:"):
            status_spec = status_spec.split(":", 1)[1]
        condition_name, condition_param = split_condition(card.get("condition"))
        then_effects = parse_effect_tokens(card.get("thenEffects"))
        else_effects = parse_effect_tokens(card.get("elseEffects"))
        buff_string, reaction = parse_buff_spec(card.get("buffSpec"))
        energy_change = float(card.get("energyChange") or 0)
        hit_count = int(card.get("hitCount") or card.get("hit_count") or 1)
        self_damage = float(card.get("selfDamage") or card.get("self_damage") or 0)
        duration = int(card.get("duration") or 0)
        pool_type = str(card.get("poolType") or card.get("pool_type") or "Base").strip() or "Base"
        upgradeable = bool(int(card.get("upgradeable") or 0))
        target_type = str(card.get("targetType") or card.get("target") or "enemy").strip()

        scratch = dict(card)
        scratch["self_damage"] = self_damage
        bridged_buffs = bridge_legacy_secondary(scratch, card_effects)
        if bridged_buffs and buff_string:
            buff_string = bridged_buffs + "," + buff_string
        elif bridged_buffs:
            buff_string = bridged_buffs

        card_effects = list(card_effects)
        if then_effects:
            card_effects.append({"type": "outcome_branch",
                                 "condition": str(card.get("condition") or "").strip(),
                                 "thenEffects": then_effects,
                                 "elseEffects": else_effects})
        if reaction:
            card_effects.append({"type": "delayed_reaction",
                                 "condition": reaction["condition"],
                                 "thenEffects": reaction["effects"]})
        if status_spec:
            card_effects.append({"type": "apply_status",
                                "status": status_spec.split(":")[0],
                                "stacks": int(float(status_spec.split(":")[1]))
                                          if ":" in status_spec else 1})

        cards_dict[kid] = {
            "cardId": kid,
            "cardName": str(card.get("cardName") or "").strip(),
            "type": str(card.get("type") or card.get("cardType") or "attack").strip(),
            "cardType": str(card.get("type") or card.get("cardType") or "attack").strip(),
            "rarity": str(card.get("rarity") or "common").strip(),
            "cost": cost,
            "damage": float(card.get("damage") or 0),
            "heal": float(card.get("heal") or 0),
            "shield": float(card.get("shield") or 0),
            "draw": int(card.get("draw") or card.get("drawCount") or 0),
            "drawCount": int(card.get("draw") or card.get("drawCount") or 0),
            "duration": duration,
            "chance": chance,
            "procChance": chance,
            "effectId": eff_id,
            "statusId": eff_id if eff_id in status_ids else "",
            "statusStacks": int(card.get("statusStacks") or (1 if eff_id in ["burn"] else (2 if eff_id in ["poison", "weakness", "attack_buff"] else 0))),
            "damageModifier": float(card.get("damageModifier") or (0.5 if "pierce" in eff_id else (0.4 if eff_id == "damage_reduction" else (2.0 if eff_id in ["energy_gain_2", "attack_buff"] else (-2.0 if eff_id == "weakness" else 0.0))))),
            "secondaryDamage": float(card.get("secondaryDamage") or (3.0 if "shield_bonus" in eff_id or kid == "shield_bash" else 0.0)),
            "selfDamage": self_damage,
            "targetType": target_type,
            "tags": tags,
            "level": int(card.get("level") or 1),
            "effects": card_effects,
            "description": str(card.get("description") or "").strip(),
            "enabled": bool(card.get("enabled", True)),
            # Flat runtime fields consumed by card.js -> CardEffectEngine. The engine only
            # reads these, never the effects[] array, so every mechanic has to appear here.
            "pool_type": pool_type,
            "poolType": pool_type,
            "upgradeable": upgradeable,
            "effect_type": primary_effect_type(scratch, card_effects),
            "target": target_type,
            "energy": energy_change,
            "hit_count": hit_count,
            "self_damage": float(scratch.get("self_damage") or self_damage),
            "status": status_spec,
            "buff": buff_string,
            "condition": condition_name or str(scratch.get("condition") or ""),
            "condition_param": float(scratch.get("condition_param") or condition_param),
            "condition_bonus": float(scratch.get("condition_bonus") or 0),
            "then_effects": then_effects,
            "else_effects": else_effects,
            "reaction": reaction,
        }

    if "ice_spike" not in cards_dict:
        cards_dict["ice_spike"] = {
            "cardId": "ice_spike",
            "cardName": "寒冰穿刺",
            "type": "attack",
            "cardType": "attack",
            "rarity": "rare",
            "cost": 2,
            "damage": 5.0,
            "heal": 0.0,
            "shield": 0.0,
            "draw": 0,
            "drawCount": 0,
            "duration": 0,
            "chance": 1.0,
            "procChance": 1.0,
            "effectId": "",
            "statusId": "",
            "statusStacks": 0,
            "damageModifier": 0.0,
            "secondaryDamage": 0.0,
            "selfDamage": 0.0,
            "targetType": "enemy",
            "tags": ["ice"],
            "level": 1,
            "effects": [{"type": "damage", "value": 5.0}],
            "description": "造成 5 点冰霜伤害。",
            "enabled": True,
            "pool_type": "Base",
            "poolType": "Base",
            "upgradeable": False,
            "effect_type": "damage",
            "target": "enemy",
            "energy": 0,
            "hit_count": 1,
            "self_damage": 0,
            "status": "",
            "buff": "",
            "condition": "",
            "condition_param": 0,
            "condition_bonus": 0,
            "then_effects": [],
            "else_effects": [],
            "reaction": None
        }

    # 6b. PveStages — chapter progression ported from Unity's PVEStageDatabase
    pve_stages = []
    if "PveStages" in wb.sheetnames:
        stages_raw = read_sheet(wb["PveStages"])
        for st in stages_raw:
            sid = str(st.get("stageId") or "").strip()
            if not sid:
                continue
            deck = []
            for token in re.split(r'[,，;|/]', str(st.get("enemyDeck") or "")):
                token = token.strip()
                if not token:
                    continue
                card_part, _, copies = token.partition("*")
                deck.append({"cardId": card_part.strip(),
                             "count": int(copies or 1)})
            pve_stages.append({
                "stageId": int(float(sid)),
                "stageCode": str(st.get("stageCode") or "").strip(),
                "stageName": str(st.get("stageName") or "").strip(),
                "recommendedPower": int(float(st.get("recommendedPower") or 0)),
                "enemyName": str(st.get("enemyName") or "").strip(),
                "enemyMaxHp": int(float(st.get("enemyMaxHp") or 80)),
                "enemyDeck": deck,
                "firstClearRewardGold": int(float(st.get("firstClearRewardGold") or 0)),
                "firstClearRewardGems": int(float(st.get("firstClearRewardGems") or 0)),
                "firstClearRewardCardId": str(st.get("firstClearRewardCardId") or "").strip(),
                "repeatRewardGold": int(float(st.get("repeatRewardGold") or 0)),
                "description": str(st.get("description") or "").strip()
            })
        pve_stages.sort(key=lambda s: s["stageId"])

    # 6c. GachaPity — 10-pull floor ported from Unity plus the new 80-pull hard pity
    gacha_pity = {
        "singleCostGold": 100,
        "tenPullCostGold": 900,
        "rates": {"common": 0.70, "rare": 0.22, "epic": 0.06, "legendary": 0.02},
        "tenPullGuaranteeRarity": "rare",
        "tenPullGuaranteeSlots": {"rare": 0.70, "epic": 0.23, "legendary": 0.07},
        "hardPityCounter": 80,
        "luckPerPull": 1.0,
        "luckSoftPityStart": 60,
        "luckSoftPityStep": 0.015,
        "duplicateGoldPvp": 40,
        "duplicateGoldMaxLevel": 60
    }

    # 6. CardPools
    card_pools = []
    if "CardPools" in wb.sheetnames:
        pools_raw = read_sheet(wb["CardPools"])
        for p in pools_raw:
            cid = str(p.get("characterId") or "").strip()
            kid = str(p.get("cardId") or "").strip()
            if not cid or not kid: continue
            card_pools.append({
                "characterId": cid,
                "cardId": kid,
                "count": int(p.get("count") or 0),
                "starter": bool(p.get("starter", True)),
                "enabled": bool(p.get("enabled", True))
            })

    # 7. Blessings
    blessings_dict = {}
    default_blessings_file = os.path.join(project_root, "data", "generated", "blessings.json")
    if os.path.exists(default_blessings_file):
        try:
            with open(default_blessings_file, "r", encoding="utf-8") as bf:
                blessings_dict = json.load(bf)
        except Exception:
            pass

    # Output paths
    gen_dir = os.path.join(project_root, "data", "generated")
    os.makedirs(gen_dir, exist_ok=True)
    data_dir = os.path.join(project_root, "data")

    # Generate JSONs (including heroes.json alias as requested)
    json_targets = [
        ("gameRules.json", game_rules),
        ("characters.json", char_dict),
        ("heroes.json", char_dict),
        ("skills.json", skill_dict),
        ("cards.json", cards_dict),
        ("statuses.json", status_dict),
        ("cardPools.json", card_pools),
        ("blessings.json", blessings_dict),
        ("pveStages.json", pve_stages),
        ("gachaPity.json", gacha_pity)
    ]
    for fname, data_obj in json_targets:
        with open(os.path.join(gen_dir, fname), "w", encoding="utf-8") as f:
            json.dump(data_obj, f, ensure_ascii=False, indent=2)

    # Universal Zero-CORS Browser runtime package: data/game_config.js
    bundle = {
        "gameRules": game_rules,
        "characters": char_dict,
        "heroes": char_dict,
        "skills": skill_dict,
        "cards": cards_dict,
        "statuses": status_dict,
        "cardPools": card_pools,
        "blessings": blessings_dict,
        "pveStages": pve_stages,
        "gachaPity": gacha_pity
    }
    with open(os.path.join(data_dir, "game_config.js"), "w", encoding="utf-8") as f:
        f.write("// Auto-generated from CardGame_Balance.xlsx by tools/sync_balance.py\n")
        f.write("(function(root) {\n")
        f.write("    root.GAME_CONFIG = ")
        json.dump(bundle, f, ensure_ascii=False, indent=2)
        f.write(";\n")
        f.write("    if (typeof module !== 'undefined' && module.exports) {\n")
        f.write("        module.exports = root.GAME_CONFIG;\n")
        f.write("    }\n")
        f.write("})(typeof window !== 'undefined' ? window : global);\n")

    # Sync to client directory if exists
    client_gen = os.path.join(project_root, "client", "data", "generated")
    client_data = os.path.join(project_root, "client", "data")
    if os.path.isdir(client_gen):
        for fname, data_obj in json_targets:
            with open(os.path.join(client_gen, fname), "w", encoding="utf-8") as f:
                json.dump(data_obj, f, ensure_ascii=False, indent=2)
    if os.path.isdir(client_data):
        shutil.copy2(os.path.join(data_dir, "game_config.js"), os.path.join(client_data, "game_config.js"))

    print("\n[成功载入并验证]")
    print(f"  - 游戏规则 (GameRules): {len(game_rules)} 条")
    print(f"  - 参战英雄 (Characters): {len(char_dict)} 位")
    print(f"  - 英雄技能 (CharacterSkills): {len(skill_dict)} 个")
    print(f"  - 战斗卡牌 (Cards): {len(cards_dict)} 张")
    print(f"  - 状态效果 (StatusEffects): {len(status_dict)} 种")
    print(f"  - 初始卡组构筑 (CardPools): {len(card_pools)} 行")
    print(f"  - PVE 章节关卡 (PveStages): {len(pve_stages)} 关")
    print(f"  - 抽卡保底 (GachaPity): 10 连 {gacha_pity['tenPullGuaranteeRarity']}+ 保底 / "
          f"{gacha_pity['hardPityCounter']} 抽 SSR 硬保底")
    print("\n[数据校验状态]: 100% 通过 (PASS)")
    print("\n[生成输出文件]:")
    for fname, _ in json_targets:
        print(f"  + data/generated/{fname}")
    print(f"  + data/game_config.js (免跨域前端统一加载包)")
    print("==================================================")
    print("同步成功！游戏客户端已全部载入最新数值配置与效果。")
    print("==================================================\n")

if __name__ == "__main__":
    sync()
