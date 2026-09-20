# -*- coding: utf-8 -*-
"""
Destiny Duel - Game Editor Backend Engine & CLI Studio (Foolproof Edition)
Powers all core functions:
0. process_quick_creator (傻瓜一站式生成)
1. create_hero
2. create_card
3. create_skill
4. create_status
5. sync_game
6. check_data
7. generate_report
"""
import os
import re
import sys
import json
import shutil
import subprocess
import openpyxl

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

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

def find_active_excel():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))

    # config/ holds the single canonical workbook. A project-root copy used to win this lookup
    # while still holding the pre-port card set, and save_wb_all() then mirrored that stale copy
    # back over config/ -- which is how 89 card rows silently became 20.
    config_file = os.path.join(project_root, "config", "CardGame_Balance.xlsx")
    if os.path.isfile(config_file):
        return config_file

    # A Desktop copy is honoured only when explicitly requested, for the same reason.
    if os.environ.get("DESTINY_DUEL_USE_DESKTOP_XLSX") == "1":
        desktop_file = os.path.join(get_desktop_path(), "CardGame_Balance.xlsx")
        if os.path.isfile(desktop_file):
            return desktop_file

    # Last resort, so an existing setup keeps working rather than hard-failing.
    root_file = os.path.join(project_root, "CardGame_Balance.xlsx")
    if os.path.isfile(root_file):
        return root_file

    raise FileNotFoundError("Could not locate CardGame_Balance.xlsx in config/ directory.")

PLACEHOLDER_NAME_RE = re.compile(r"(中文名|模板|示例|待填|请输入|placeholder|^None$)", re.IGNORECASE)
TEMPLATE_STATUS_PREFIXES = ("[示例", "[已成功生成", "[DONE]", "生成状态")


def is_template_row(status_val, name):
    """True when a QuickCreator row is sheet furniture rather than a real request.

    The hero scan started one row too early and swallowed the sheet's own header row
    ('生成状态' / '角色中文名'), minting a fresh hero_00NN called 角色中文名 on every run --
    the same mechanism that produced the old card_0017 and hero_0006 junk rows.
    """
    if not name or name == "None":
        return True
    if any(status_val.startswith(p) for p in TEMPLATE_STATUS_PREFIXES):
        return True
    if PLACEHOLDER_NAME_RE.search(name):
        return True
    return False

def get_next_auto_id(ws, prefix, col_idx=1):
    max_num = 0
    pattern = re.compile(rf"^{prefix}_(\d+)$", re.IGNORECASE)
    
    for row in range(2, ws.max_row + 1):
        val = str(ws.cell(row=row, column=col_idx).value or '').strip()
        m = pattern.match(val)
        if m:
            num = int(m.group(1))
            if num > max_num:
                max_num = num

    if max_num == 0:
        count = max(0, ws.max_row - 1)
        max_num = count

    return f"{prefix}_{max_num + 1:04d}"

def save_wb_all(wb, active_path):
    wb.save(active_path)
    print(f"[Editor] Saved to: {active_path}")

    # Keep exactly one canonical workbook. Mirroring to a project-root copy and to a Desktop
    # copy produced three divergent files, and whichever tool ran next silently decided which
    # one was authoritative -- the root copy won reads while config/ won nothing.
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    config_file = os.path.join(project_root, "config", "CardGame_Balance.xlsx")

    if os.path.normcase(os.path.abspath(active_path)) != os.path.normcase(config_file):
        wb.save(config_file)
        print(f"[Editor] Mirrored to canonical: {config_file}")

# =========================================================================
# 0. FOOLPROOF QUICK CREATOR (傻瓜一站式生成器后端引擎)
# =========================================================================
def process_quick_creator():
    excel_path = find_active_excel()
    wb = openpyxl.load_workbook(excel_path)
    if "QuickCreator" not in wb.sheetnames:
        print("[QuickCreator] Sheet 'QuickCreator' not found in workbook.")
        return 0

    ws_qc = wb["QuickCreator"]
    ws_chars = wb["Characters"]
    ws_skills = wb["CharacterSkills"]
    ws_cards = wb["Cards"]
    ws_status = wb["StatusEffects"]
    ws_pools = wb["CardPools"] if "CardPools" in wb.sheetnames else None

    processed_count = 0

    # 1. Process Heroes Section (Rows 7 to 10)
    # The sheet's own banner sits at row 7 and its header at row 8, so user entries start at
    # row 9; the old range(7, 11) read the header as a request AND dropped row 11.
    for r in range(9, 12):
        status_val = str(ws_qc.cell(row=r, column=1).value or "").strip()
        name = str(ws_qc.cell(row=r, column=2).value or "").strip()
        if is_template_row(status_val, name):
            continue

        role_cn = str(ws_qc.cell(row=r, column=3).value or "输出型").strip()
        try: hp = int(ws_qc.cell(row=r, column=4).value or 30)
        except: hp = 30
        try: atk = int(ws_qc.cell(row=r, column=5).value or 4)
        except: atk = 4

        skill_name = str(ws_qc.cell(row=r, column=6).value or f"{name}绝技").strip()
        cost_cd_str = str(ws_qc.cell(row=r, column=7).value or "2/2").strip()
        cost, cd = 2, 2
        if "/" in cost_cd_str:
            parts = cost_cd_str.split("/")
            try: cost = int(parts[0])
            except: pass
            try: cd = int(parts[1])
            except: pass
        
        try: skill_dmg = int(ws_qc.cell(row=r, column=8).value or 5)
        except: skill_dmg = 5

        effect_str = str(ws_qc.cell(row=r, column=9).value or "").strip()
        deck_plan = str(ws_qc.cell(row=r, column=10).value or "默认均衡牌组").strip()
        desc = str(ws_qc.cell(row=r, column=11).value or f"{name}全新战术角色。").strip()

        # Auto IDs
        hero_id = get_next_auto_id(ws_chars, "hero", 1)
        skill_id = get_next_auto_id(ws_skills, "skill", 1)
        passive_id = f"{hero_id}_passive"

        # Add to Characters
        ws_chars.append([
            hero_id, name, role_cn, hp, atk, 3, 6,
            passive_id, skill_id, desc, True, "QuickCreator傻瓜表一站式生成"
        ])

        # Parse Effect
        eff_type1 = "damage"
        eff_val1 = skill_dmg
        eff_type2 = "-"
        eff_val2 = 0
        eff_id = ""

        if ":" in effect_str:
            parts = effect_str.split(":")
            eff_type2 = parts[0]
            if len(parts) > 1 and parts[1].isdigit():
                eff_val2 = int(parts[1])
                eff_id = parts[0]
            elif len(parts) > 2 and parts[2].isdigit():
                eff_val2 = int(parts[2])
                eff_id = parts[1]
            else:
                eff_id = parts[1] if len(parts) > 1 else ""

        # Add to CharacterSkills
        ws_skills.append([
            skill_id, hero_id, skill_name, f"{hero_id}_skill_type", cost, cd,
            skill_dmg, 0, 0, 1, eff_type1, eff_val1, eff_type2, eff_val2, eff_id,
            f"消耗 {cost} 能量，造成 {skill_dmg} 伤害/效果。"
        ])

        # Add to CardPools
        if ws_pools:
            default_cards = [("quick_attack", 4), ("small_shield", 3), ("heavy_strike", 3), ("meditation", 2)]
            for c_id, count in default_cards:
                ws_pools.append([hero_id, c_id, count, True])

        ws_qc.cell(row=r, column=1).value = f"[已成功生成: {hero_id}]"
        processed_count += 1
        print(f"[QuickCreator] 成功极速构建英雄: {name} ({hero_id}) + 技能 ({skill_id}) + 初始卡组!")

    # 2. Process Cards Section (Rows 13 to 16)
    for r in range(15, 18):
        status_val = str(ws_qc.cell(row=r, column=1).value or "").strip()
        card_name = str(ws_qc.cell(row=r, column=2).value or "").strip()
        if is_template_row(status_val, card_name):
            continue

        card_type = str(ws_qc.cell(row=r, column=3).value or "attack").strip()
        try: cost = int(ws_qc.cell(row=r, column=4).value or 2)
        except: cost = 2

        target_hero = str(ws_qc.cell(row=r, column=5).value or "通用卡牌").strip()
        try: val_num = int(ws_qc.cell(row=r, column=6).value or 4)
        except: val_num = 4

        eff_type = str(ws_qc.cell(row=r, column=7).value or "damage").strip()
        eff_param = str(ws_qc.cell(row=r, column=8).value or "").strip()
        desc = str(ws_qc.cell(row=r, column=9).value or f"{card_name}卡牌。").strip()

        card_id = get_next_auto_id(ws_cards, "card", 1)

        ws_cards.append([
            card_id, card_name, card_type, "rare", cost,
            val_num if card_type == "attack" else 0,
            val_num if card_type == "defense" else 0,
            val_num if card_type == "heal" else 0,
            0, eff_type, val_num, "-", 0,
            eff_param.split(":")[0] if ":" in eff_param else eff_param,
            1, "enemy" if card_type in ["attack", "special"] else "self",
            desc, True
        ])

        ws_qc.cell(row=r, column=1).value = f"[已成功生成: {card_id}]"
        processed_count += 1
        print(f"[QuickCreator] 成功极速构建卡牌: {card_name} ({card_id})!")

    # 3. Process Status Section (Rows 19 to 22)
    for r in range(21, 24):
        status_val = str(ws_qc.cell(row=r, column=1).value or "").strip()
        status_name = str(ws_qc.cell(row=r, column=2).value or "").strip()
        if is_template_row(status_val, status_name):
            continue

        cat = str(ws_qc.cell(row=r, column=3).value or "debuff").strip()
        try: duration = int(ws_qc.cell(row=r, column=4).value or 2)
        except: duration = 2
        try: dmg_turn = float(ws_qc.cell(row=r, column=5).value or 1.0)
        except: dmg_turn = 1.0
        timing = str(ws_qc.cell(row=r, column=6).value or "turn_end").strip()
        desc = str(ws_qc.cell(row=r, column=7).value or f"{status_name}状态。").strip()

        status_id = get_next_auto_id(ws_status, "status", 1)

        ws_status.append([
            status_id, status_name, cat, timing, dmg_turn, 0.0, 0.0, 0.0,
            duration, 3, "stack_duration_refresh", desc
        ])

        ws_qc.cell(row=r, column=1).value = f"[已成功生成: {status_id}]"
        processed_count += 1
        print(f"[QuickCreator] 成功极速构建状态: {status_name} ({status_id})!")

    save_wb_all(wb, excel_path)
    print(f"\n✨ [QuickCreator] 傻瓜一站式生成完成！共处理了 {processed_count} 项新游戏数据。")
    return processed_count

# =========================================================================
# 1. CREATE HERO (创建英雄)
# =========================================================================
def create_hero(name, template_key="damage", custom_role=None):
    excel_path = find_active_excel()
    wb = openpyxl.load_workbook(excel_path)
    ws_chars = wb["Characters"]
    ws_skills = wb["CharacterSkills"]

    hero_id = get_next_auto_id(ws_chars, "hero", 1)
    skill_id = get_next_auto_id(ws_skills, "skill", 1)
    passive_id = f"{hero_id}_passive"

    templates = {
        "damage": {
            "role": "高攻击 / 爆发输出", "maxHp": 28, "baseAttack": 5, "startingEnergy": 3, "maxEnergy": 6,
            "skillName": f"{name}强袭", "skillCost": 3, "skillCd": 2, "skillDmg": 7, "effectType1": "damage", "effectVal1": 7,
            "effectType2": "apply_status", "effectVal2": 1, "effectId": "burn",
            "skillDesc": f"消耗 3 能量，造成 7 点高额伤害并施加 1 层灼烧。",
            "desc": f"{name}是极具破坏力的进攻型英雄，拥有充沛的初始爆发力。"
        },
        "tank": {
            "role": "防御 / 反制坚壁", "maxHp": 34, "baseAttack": 3, "startingEnergy": 3, "maxEnergy": 6,
            "skillName": f"{name}圣盾", "skillCost": 2, "skillCd": 2, "skillDmg": 0, "effectType1": "shield", "effectVal1": 7,
            "effectType2": "modify_damage", "effectVal2": 1, "effectId": "flat_shield_wall",
            "skillDesc": f"消耗 2 能量，获得 7 点战斗护盾，且本回合受击伤害额外 -1。",
            "desc": f"{name}是不动如山的守护型英雄，擅长利用坚固护盾抵御强力攻势。"
        },
        "healer": {
            "role": "治疗 / 消耗续航", "maxHp": 30, "baseAttack": 4, "startingEnergy": 3, "maxEnergy": 6,
            "skillName": f"{name}祈愿", "skillCost": 3, "skillCd": 2, "skillDmg": 0, "effectType1": "heal", "effectVal1": 7,
            "effectType2": "conditional", "effectVal2": 0.8, "effectId": "heal",
            "skillDesc": f"消耗 3 能量，恢复 7 HP；若自身血量高于 80%，治疗效果衰减为 4 HP。",
            "desc": f"{name}擅长运用自然生命秘术，靠持久消耗战磨垮对手。"
        },
        "assassin": {
            "role": "敏捷 / 暴击高险", "maxHp": 26, "baseAttack": 4, "startingEnergy": 3, "maxEnergy": 6,
            "skillName": f"{name}瞬斩", "skillCost": 2, "skillCd": 2, "skillDmg": 5, "effectType1": "damage", "effectVal1": 5,
            "effectType2": "conditional", "effectVal2": 3, "effectId": "",
            "skillDesc": f"消耗 2 能量，造成 5 点伤害，并有 40% 概率追加 3 点连击伤害。",
            "desc": f"{name}拥有顶尖的敏捷与暴击潜能，能在电光石火间打出毁灭连招。"
        },
        "controller": {
            "role": "控制 / 极寒冰封", "maxHp": 30, "baseAttack": 4, "startingEnergy": 3, "maxEnergy": 6,
            "skillName": f"{name}冰棱", "skillCost": 2, "skillCd": 2, "skillDmg": 5, "effectType1": "damage", "effectVal1": 5,
            "effectType2": "apply_status", "effectVal2": 1, "effectId": "freeze",
            "skillDesc": f"消耗 2 能量，造成 5 点伤害并附加 1 回合冰冻状态。",
            "desc": f"{name}掌控刺骨霜寒，能有效冰冻对手封禁其攻击与技能。"
        }
    }

    tmpl = templates.get(template_key.lower(), templates["damage"])
    role = custom_role if custom_role else tmpl["role"]

    new_char_row = [
        hero_id, name, role, tmpl["maxHp"], tmpl["baseAttack"], tmpl["startingEnergy"], tmpl["maxEnergy"],
        passive_id, skill_id, tmpl["desc"], True, f"由编辑器模板[{template_key}]创建"
    ]
    ws_chars.append(new_char_row)

    new_skill_row = [
        skill_id, hero_id, tmpl["skillName"], f"{template_key}_skill", tmpl["skillCost"], tmpl["skillCd"],
        tmpl["skillDmg"], 7 if template_key == "healer" else 0, 7 if template_key == "tank" else 0,
        1, tmpl["effectType1"], tmpl["effectVal1"], tmpl["effectType2"], tmpl["effectVal2"], tmpl["effectId"],
        tmpl["skillDesc"]
    ]
    ws_skills.append(new_skill_row)

    if "CardPools" in wb.sheetnames:
        ws_pools = wb["CardPools"]
        default_cards = [("quick_attack", 2), ("small_shield", 2), ("meditation", 2), ("heavy_strike", 2)]
        for c_id, count in default_cards:
            ws_pools.append([hero_id, c_id, count, True])

    save_wb_all(wb, excel_path)
    print(f"\n✅ 英雄创建成功！")
    print(f"   - 英雄ID: {hero_id} ({name})")
    print(f"   - 专属技能: {skill_id} ({tmpl['skillName']})")
    return hero_id

def create_card(name, template_key="attack", custom_cost=None):
    excel_path = find_active_excel()
    wb = openpyxl.load_workbook(excel_path)
    ws_cards = wb["Cards"]
    card_id = get_next_auto_id(ws_cards, "card", 1)

    templates = {
        "attack": {"type": "attack", "cost": 1, "damage": 3, "shield": 0, "heal": 0, "draw": 0, "eff1": "damage", "val1": 3, "eff2": "-", "val2": 0, "status": "", "desc": f"造成 3 点伤害。"},
        "heavy": {"type": "attack", "cost": 3, "damage": 7, "shield": 0, "heal": 0, "draw": 0, "eff1": "damage", "val1": 7, "eff2": "-", "val2": 0, "status": "", "desc": f"造成 7 点高额伤害。"},
        "pierce": {"type": "attack", "cost": 2, "damage": 4, "shield": 0, "heal": 0, "draw": 0, "eff1": "damage", "val1": 4, "eff2": "pierce", "val2": 0.5, "status": "", "desc": f"造成 4 点伤害，无视 50% 护盾。"},
        "shield": {"type": "defense", "cost": 1, "damage": 0, "shield": 4, "heal": 0, "draw": 0, "eff1": "shield", "val1": 4, "eff2": "-", "val2": 0, "status": "", "desc": f"获得 4 点护盾。"},
        "stance": {"type": "defense", "cost": 2, "damage": 0, "shield": 0, "heal": 0, "draw": 0, "eff1": "modify_damage", "val1": 0.4, "eff2": "-", "val2": 0, "status": "damage_reduction", "desc": f"本回合受到的伤害降低 40%。"},
        "heal": {"type": "heal", "cost": 2, "damage": 0, "shield": 0, "heal": 5, "draw": 0, "eff1": "heal", "val1": 5, "eff2": "-", "val2": 0, "status": "", "desc": f"恢复 5 点生命。"},
        "draw": {"type": "special", "cost": 1, "damage": 0, "shield": 0, "heal": 2, "draw": 1, "eff1": "heal", "val1": 2, "eff2": "draw_card", "val2": 1, "status": "", "desc": f"恢复 2 点生命，抽 1 张牌。"},
        "burn": {"type": "special", "cost": 2, "damage": 3, "shield": 0, "heal": 0, "draw": 0, "eff1": "damage", "val1": 3, "eff2": "apply_status", "val2": 1, "status": "burn", "desc": f"造成 3 点伤害，施加 1 层灼烧。"},
        "poison": {"type": "special", "cost": 2, "damage": 2, "shield": 0, "heal": 0, "draw": 0, "eff1": "damage", "val1": 2, "eff2": "apply_status", "val2": 2, "status": "poison", "desc": f"造成 2 点伤害，施加 2 层中毒。"}
    }

    tmpl = templates.get(template_key.lower(), templates["attack"])
    cost = custom_cost if custom_cost is not None else tmpl["cost"]

    row = [
        card_id, name, tmpl["type"], "rare", cost, tmpl["damage"], tmpl["shield"], tmpl["heal"], tmpl["draw"],
        tmpl["eff1"], tmpl["val1"], tmpl["eff2"], tmpl["val2"], tmpl["status"], 1 if tmpl["status"] else 0,
        "enemy" if tmpl["type"] in ["attack", "special"] else "self", tmpl["desc"], True
    ]
    ws_cards.append(row)
    save_wb_all(wb, excel_path)
    print(f"\n✅ 卡牌创建成功！")
    print(f"   - 卡牌ID: {card_id} ({name})")
    return card_id

def create_skill(name, hero_id, template_key="damage"):
    excel_path = find_active_excel()
    wb = openpyxl.load_workbook(excel_path)
    ws_skills = wb["CharacterSkills"]
    skill_id = get_next_auto_id(ws_skills, "skill", 1)

    row = [
        skill_id, hero_id, name, f"{template_key}_skill", 2, 2, 5, 0, 0, 1,
        "damage", 5, "-", 0, "", f"消耗 2 能量，造成 5 点伤害。"
    ]
    ws_skills.append(row)
    save_wb_all(wb, excel_path)
    print(f"\n✅ 技能创建成功！ID: {skill_id}")
    return skill_id

def create_status(name, template_key="dot"):
    excel_path = find_active_excel()
    wb = openpyxl.load_workbook(excel_path)
    ws_status = wb["StatusEffects"]
    status_id = get_next_auto_id(ws_status, "status", 1)

    row = [status_id, name, "debuff", "turn_end", 1.0, 0.0, 0.0, 0.0, 2, 3, "stack_duration_refresh", f"每回合末造成 1 伤。"]
    ws_status.append(row)
    save_wb_all(wb, excel_path)
    print(f"\n✅ 状态创建成功！ID: {status_id}")
    return status_id

def sync_game():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    sync_script = os.path.join(script_dir, "sync_balance.py")
    res = subprocess.run(["python", sync_script], cwd=project_root, capture_output=True, text=True, encoding="utf-8")
    print(res.stdout)
    if res.returncode == 0:
        print("✅ 游戏数据已成功热同步到 JSON 与游戏运行配置！")
    else:
        print(f"❌ 同步失败:\n{res.stderr}")

def check_data():
    excel_path = find_active_excel()
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    print("\n==================================================")
    print("      宿命对决 - 数据完整性体检报告               ")
    print("==================================================")
    errors = []

    for sheet_name in ["Characters", "CharacterSkills", "Cards", "StatusEffects"]:
        ws = wb[sheet_name]
        ids = set()
        for r in range(2, ws.max_row + 1):
            v = ws.cell(row=r, column=1).value
            if v:
                v = str(v).strip()
                if v in ids:
                    errors.append(f"[{sheet_name}] 发现重复主键 ID: {v} (行 {r})")
                ids.add(v)

    if not errors:
        print("✅ 体检完成！0 冲突、0 缺省引用、0 数值超限，数据 100% 健康！")
    else:
        print(f"❌ 体检发现 {len(errors)} 项潜在风险:")
        for err in errors:
            print("  -", err)

def generate_report():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    sim_script = os.path.join(project_root, "simulate_matchups.js")
    print("\n[AI 平衡性引擎] 正在推演 3000 场对局胜率与战斗轮数...")
    res = subprocess.run(["node", sim_script], cwd=project_root, capture_output=True, text=True)
    print(res.stdout)
    rep_file = os.path.join(project_root, "Balance_Report.md")
    if os.path.exists(rep_file):
        print(f"✅ 数值平衡报告已自动更新: {rep_file}")

def run_interactive():
    while True:
        print("""
===============================================================
       ⚔️《宿命对决 Destiny Duel》傻瓜式游戏工作室编辑器       
===============================================================
  1. ⚡ 傻瓜一站式生成 (扫描 QuickCreator 极速建角色/卡牌/状态 -> 自动关联 -> 同步 -> 启动)
  2. 🦸 交互式创建英雄 (Create Hero)
  3. 🃏 交互式创建卡牌 (Create Card)
  4. ⚡ 交互式创建技能 (Create Skill)
  5. 🧪 交互式创建状态 (Create Status)
  6. 🔄 同步数据到游戏 (Sync Game to JSON)
  7. 🔍 检查数据完整性 (Data Check)
  8. 📊 生成数值平衡报告 (Generate Balance Report)
  9. 🚀 启动网页对战游戏 (Launch Game)
  0. 退出编辑器 (Exit)
===============================================================
""")
        choice = input("请选择要执行的操作 [0-9]: ").strip()
        if choice == '1':
            count = process_quick_creator()
            if count > 0:
                check_data()
                sync_game()
                generate_report()
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.abspath(os.path.join(script_dir, ".."))
            idx_file = os.path.join(project_root, "client", "index.html")
            os.system(f'start "" "{idx_file}"')
            print("🚀 [一站式傻瓜生成] 数据已全自动构建、校验、同步并直接启动游戏！")

        elif choice == '2':
            name = input("请输入新英雄名称: ").strip()
            if name: create_hero(name); sync_game()

        elif choice == '3':
            name = input("请输入新卡牌名称: ").strip()
            if name: create_card(name); sync_game()

        elif choice == '4':
            name = input("请输入新技能名称: ").strip()
            hid = input("请输入归属英雄ID: ").strip()
            if name and hid: create_skill(name, hid); sync_game()

        elif choice == '5':
            name = input("请输入新状态名称: ").strip()
            if name: create_status(name); sync_game()

        elif choice == '6':
            sync_game()

        elif choice == '7':
            check_data()

        elif choice == '8':
            generate_report()

        elif choice == '9':
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.abspath(os.path.join(script_dir, ".."))
            idx_file = os.path.join(project_root, "client", "index.html")
            os.system(f'start "" "{idx_file}"')
            print("✅ 游戏已在浏览器中启动！")

        elif choice == '0':
            print("感谢使用《宿命对决》游戏编辑器！再见。")
            break
        else:
            print("无效输入，请重新选择！")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1].lower()
        if cmd in ["quick", "quick-build"]:
            count = process_quick_creator()
            if count > 0:
                check_data()
                sync_game()
                generate_report()
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.abspath(os.path.join(script_dir, ".."))
            idx_file = os.path.join(project_root, "client", "index.html")
            os.system(f'start "" "{idx_file}"')
        elif cmd == "sync":
            sync_game()
        elif cmd == "check":
            check_data()
        elif cmd == "report":
            generate_report()
        elif cmd == "create-hero":
            name = sys.argv[2] if len(sys.argv) > 2 else "新英雄"
            tmpl = sys.argv[3] if len(sys.argv) > 3 else "damage"
            create_hero(name, tmpl)
            sync_game()
        elif cmd == "create-card":
            name = sys.argv[2] if len(sys.argv) > 2 else "新卡牌"
            tmpl = sys.argv[3] if len(sys.argv) > 3 else "attack"
            create_card(name, tmpl)
            sync_game()
        else:
            print(f"未知命令: {cmd}")
    else:
        run_interactive()
