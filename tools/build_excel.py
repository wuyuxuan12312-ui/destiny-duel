# -*- coding: utf-8 -*-
"""
CardGame Balance Excel Generator - Data-Driven Standard Edition
Generates CardGame_Balance.xlsx strictly matching the requested schema with polished aesthetics.
"""
import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation

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

def build_workbook():
    wb = openpyxl.Workbook()
    default_sheet = wb.active

    # Fonts
    font_title = Font(name="微软雅黑", size=14, bold=True, color="1F4E79")
    font_section = Font(name="微软雅黑", size=11, bold=True, color="2C3E50")
    font_header = Font(name="微软雅黑", size=10, bold=True, color="FFFFFF")
    font_body = Font(name="微软雅黑", size=9.5)
    font_bold_num = Font(name="微软雅黑", size=10, bold=True, color="1A365D")
    font_id = Font(name="Consolas", size=9, color="718096")
    font_desc = Font(name="微软雅黑", size=9, color="4A5568")

    # Header fills
    fill_hdr_rules = PatternFill(start_color="37474F", end_color="37474F", fill_type="solid") # Dark Charcoal
    fill_hdr_chars = PatternFill(start_color="1B5E20", end_color="1B5E20", fill_type="solid") # Deep Forest
    fill_hdr_skills = PatternFill(start_color="4A148C", end_color="4A148C", fill_type="solid") # Deep Purple
    fill_hdr_cards = PatternFill(start_color="0D47A1", end_color="0D47A1", fill_type="solid") # Deep Blue
    fill_hdr_status = PatternFill(start_color="E65100", end_color="E65100", fill_type="solid") # Deep Orange
    fill_hdr_pools = PatternFill(start_color="006064", end_color="006064", fill_type="solid") # Deep Cyan
    fill_hdr_notes = PatternFill(start_color="546E7A", end_color="546E7A", fill_type="solid") # Blue Gray

    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_highlight = PatternFill(start_color="FEFCBF", end_color="FEFCBF", fill_type="solid")

    thin_border = Border(
        left=Side(style='thin', color="CBD5E1"),
        right=Side(style='thin', color="CBD5E1"),
        top=Side(style='thin', color="CBD5E1"),
        bottom=Side(style='thin', color="CBD5E1")
    )
    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")

    def format_sheet_headers(ws, headers_def, fill_header):
        ws.views.sheetView[0].showGridLines = True
        ws.freeze_panes = 'A2'
        ws.row_dimensions[1].height = 28
        for col_idx, (cn_name, en_key) in enumerate(headers_def, 1):
            cell = ws.cell(row=1, column=col_idx, value=f"{cn_name}\n({en_key})")
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = thin_border

    def auto_fit(ws):
        from openpyxl.utils import get_column_letter
        for col_idx in range(1, ws.max_column + 1):
            col_letter = get_column_letter(col_idx)
            max_len = 0
            for r in range(1, ws.max_row + 1):
                val = str(ws.cell(row=r, column=col_idx).value or '')
                l = sum(2 if ord(c) > 127 else 1 for c in val)
                if l > max_len:
                    max_len = l
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 10), 60)

    # =========================================================================
    # Sheet 1: GameRules
    # ruleId, ruleName, value, unit, description, minValue, maxValue, editable, notes
    # =========================================================================
    ws_rules = wb.create_sheet("GameRules")
    headers_rules = [
        ("规则ID", "ruleId"),
        ("规则名称", "ruleName"),
        ("数值", "value"),
        ("单位", "unit"),
        ("规则描述", "description"),
        ("最小值", "minValue"),
        ("最大值", "maxValue"),
        ("可编辑", "editable"),
        ("策划备注", "notes")
    ]
    format_sheet_headers(ws_rules, headers_rules, fill_hdr_rules)

    rules_rows = [
        ("max_energy", "最大能量", 6, "点", "每位玩家的最大能量储存上限", 1, 20, True, "未消耗能量可保留至下一回合，但不能突破此上限"),
        ("initial_energy", "第一回合初始能量", 3, "点", "第 1 回合开局拥有的初始能量点数", 0, 10, True, "第 1 回合启动资源"),
        ("turn_energy_recovery", "每回合恢复能量", 3, "点", "第 2 回合起每回合开始时自动恢复的能量点数", 1, 10, True, "常规充能节奏"),
        ("initial_hand_size", "初始手牌", 4, "张", "对局开始双方各自抽取的初始起手卡牌数量", 1, 8, True, "起手手牌数"),
        ("turn_draw_count", "每回合抽牌", 1, "张", "每回合开始时默认摸牌数量", 1, 5, True, "每回合行动前补牌"),
        ("max_hand_size", "最大手牌", 8, "张", "手牌持有数量上限，满手牌时不再摸牌", 4, 12, True, "防无限囤牌保护上限"),
        ("normal_attacks_per_turn", "普通攻击次数", 1, "次", "每回合允许进行普通攻击的最高次数 (0费)", 1, 3, True, "普攻限制"),
        ("skills_per_turn", "技能次数", 1, "次", "每回合允许施放英雄技能的最高次数", 1, 3, True, "技能限制"),
        ("max_shield", "护盾上限", 10, "点", "护盾最大吸收值上限，溢出部分无效", 1, 50, True, "优先抵扣伤害"),
        ("max_heal_per_turn", "治疗上限", 8, "HP", "单回合内单一玩家累计受治疗生命上限", 1, 30, True, "防止治疗卡无脑连刷拖局"),
        ("consecutive_heal_decay", "连续治疗衰减", 1, "点", "同回合内连续多次治疗时的逐次递减惩罚", 0, 5, True, "每连刷一次治疗效果 -1 (保底1)"),
        ("max_burst_damage_limit", "伤害上限", 10, "点", "单次直接行动扣减生命与护盾之和的硬保护上限", 5, 50, True, "防止前两回合被单次秒杀"),
        ("rising_fury_start_round", "第8回合白热化规则", 8, "轮", "决战白热化起始轮次，第8轮起死线收缩加快终局", 3, 20, True, "round >= 8 时所有伤害追加 +(round-7)"),
        ("rising_fury_damage_step", "白热化增伤步长", 1, "点", "白热化阶段每超过1轮全场所有伤害追加点数", 1, 5, True, "每轮增伤递增步长"),
        ("default_deck_size", "默认卡组总张数", 32, "张", "标准对决牌库卡牌总数 (16种*2副本)", 16, 60, True, "卡组总容量"),
        ("turn_duration", "回合时间", 60, "秒", "每回合行动倒计时 (防挂机超时设置)", 15, 300, True, "联机回合思考时间限制"),
        ("disconnect_timeout", "掉线等待时间", 30, "秒", "WebRTC网络掉线重连宽限期", 5, 120, True, "断线判定等待时间")
    ]
    for r_idx, r in enumerate(rules_rows, 2):
        for c_idx, val in enumerate(r, 1):
            cell = ws_rules.cell(row=r_idx, column=c_idx, value=val)
            cell.border = thin_border
            if r_idx % 2 == 1:
                cell.fill = fill_zebra
            if c_idx == 3:
                cell.font = font_bold_num
                cell.alignment = align_center
            elif c_idx in [1, 8]:
                cell.font = font_id
                cell.alignment = align_center
            elif c_idx == 5:
                cell.font = font_desc
                cell.alignment = align_left
            else:
                cell.font = font_body
                cell.alignment = align_center if isinstance(val, (int, float, bool)) else align_left
    auto_fit(ws_rules)

    # =========================================================================
    # Sheet 2: Characters
    # characterId, characterName, role, maxHp, baseAttack, startingEnergy, maxEnergy, passiveId, skillId, description, enabled, notes
    # =========================================================================
    ws_chars = wb.create_sheet("Characters")
    headers_chars = [
        ("角色ID", "characterId"),
        ("角色名称", "characterName"),
        ("战斗定位", "role"),
        ("最大生命", "maxHp"),
        ("基础攻击", "baseAttack"),
        ("初始能量", "startingEnergy"),
        ("最大能量", "maxEnergy"),
        ("被动ID", "passiveId"),
        ("技能ID", "skillId"),
        ("角色描述", "description"),
        ("启用", "enabled"),
        ("策划备注", "notes")
    ]
    format_sheet_headers(ws_chars, headers_chars, fill_hdr_chars)

    chars_rows = [
        ("fire_warrior", "烈焰剑士", "高攻击 / 爆发输出", 28, 5, 3, 6, "fire_warrior_passive", "fire_warrior_skill", "拥有最高的初始常态伤害与技能斩杀力，能用灼烧持续折磨对手。血量较低，忌讳拖入残局。", True, "近战爆发核心，注意压制前期秒杀率"),
        ("iron_guardian", "钢铁守卫", "防御 / 反制坚壁", 34, 3, 3, 6, "iron_guardian_passive", "iron_guardian_skill", "拥有全英雄最高 HP 与减伤被动，凭借钢铁壁垒能从容化解刺客与剑士的爆发。普通攻击较低。", True, "重装坦克，通过防守反击获胜"),
        ("forest_mage", "森林术士", "治疗 / 消耗续航", 30, 4, 3, 6, "forest_mage_passive", "forest_mage_skill", "强大的自然恢复力，擅长利用防守牌触发被动自然回血，靠持久战拖垮一切防御型对手。", True, "续航法师，靠控血与消耗作战"),
        ("lightning_assassin", "雷电刺客", "敏捷 / 暴击高险", 26, 4, 3, 6, "lightning_assassin_passive", "lightning_assassin_skill", "极具威慑力的爆发刺客，虽然血量最脆，但普攻暴击与闪电突袭常常能在瞬间打出逆天胜势。", True, "高风险高回报，普攻20%暴击")
    ]
    for r_idx, r in enumerate(chars_rows, 2):
        for c_idx, val in enumerate(r, 1):
            cell = ws_chars.cell(row=r_idx, column=c_idx, value=val)
            cell.border = thin_border
            if c_idx in [4, 5, 6, 7]:
                cell.font = font_bold_num
                cell.alignment = align_center
            elif c_idx in [1, 8, 9, 11]:
                cell.font = font_id
                cell.alignment = align_center
            elif c_idx == 10:
                cell.font = font_desc
                cell.alignment = align_left
            else:
                cell.font = font_body
                cell.alignment = align_left
    auto_fit(ws_chars)

    # =========================================================================
    # Sheet 3: CharacterSkills
    # skillId, characterId, skillName, skillType, cost, cooldown, damage, heal, shield, duration, chance, effectId, description
    # =========================================================================
    ws_skills = wb.create_sheet("CharacterSkills")
    headers_skills = [
        ("技能ID", "skillId"),
        ("角色ID", "characterId"),
        ("技能名称", "skillName"),
        ("技能类型", "skillType"),
        ("消耗能量", "cost"),
        ("冷却回合", "cooldown"),
        ("造成伤害", "damage"),
        ("恢复生命", "heal"),
        ("获得护盾", "shield"),
        ("持续回合", "duration"),
        ("触发概率", "chance"),
        ("效果标识", "effectId"),
        ("技能描述", "description")
    ]
    format_sheet_headers(ws_skills, headers_skills, fill_hdr_skills)

    skills_rows = [
        ("fire_warrior_skill", "fire_warrior", "烈焰斩", "damage_and_burn", 3, 2, 7, 0, 0, 2, 1.0, "burn", "造成 7 点伤害，并施加 1 层灼烧 (每层回合末 1 伤，持续 2 回合)"),
        ("iron_guardian_skill", "iron_guardian", "钢铁壁垒", "shield_and_flat_reduction", 2, 2, 0, 0, 7, 1, 1.0, "flat_shield_wall", "获得 7 点护盾 (上限 10)，且本回合后续受到的伤害 -1"),
        ("forest_mage_skill", "forest_mage", "自然治愈", "conditional_heal", 3, 2, 0, 7, 0, 0, 1.0, "heal", "恢复 7 HP；若当前 HP 超过最大值的 80%，治疗效果降低为 4 HP (单回合治疗上限 8)"),
        ("lightning_assassin_skill", "lightning_assassin", "闪电突袭", "damage_and_combo", 2, 2, 5, 0, 0, 0, 0.35, "electric_combo", "造成 5 点伤害，并有 35% 概率追加 3 点闪电连击伤害 (共 8 点)")
    ]
    for r_idx, r in enumerate(skills_rows, 2):
        for c_idx, val in enumerate(r, 1):
            cell = ws_skills.cell(row=r_idx, column=c_idx, value=val)
            cell.border = thin_border
            if c_idx in [5, 6, 7, 8, 9, 10, 11]:
                cell.font = font_bold_num
                cell.alignment = align_center
            elif c_idx in [1, 2, 4, 12]:
                cell.font = font_id
                cell.alignment = align_center
            elif c_idx == 13:
                cell.font = font_desc
                cell.alignment = align_left
            else:
                cell.font = font_body
                cell.alignment = align_left
    auto_fit(ws_skills)

    # =========================================================================
    # Sheet 4: Cards
    # cardId, cardName, type, rarity, cost, damage, heal, shield, draw, duration, chance, effectId, targetType, description, enabled
    # =========================================================================
    ws_cards = wb.create_sheet("Cards")
    headers_cards = [
        ("卡牌ID", "cardId"),
        ("卡牌名称", "cardName"),
        ("卡牌类型", "type"),
        ("稀有度", "rarity"),
        ("消耗能量", "cost"),
        ("造成伤害", "damage"),
        ("恢复生命", "heal"),
        ("获得护盾", "shield"),
        ("抽牌数量", "draw"),
        ("持续回合", "duration"),
        ("触发概率", "chance"),
        ("效果标识", "effectId"),
        ("目标类型", "targetType"),
        ("卡牌说明", "description"),
        ("启用", "enabled")
    ]
    format_sheet_headers(ws_cards, headers_cards, fill_hdr_cards)

    cards_rows = [
        ("quick_attack", "快速攻击", "attack", "common", 1, 3, 0, 0, 0, 0, 1.0, "", "enemy", "造成 3 点伤害。", True),
        ("heavy_strike", "重击", "attack", "epic", 3, 7, 0, 0, 0, 0, 1.0, "", "enemy", "造成 7 点高额伤害。", True),
        ("pierce", "穿刺", "attack", "rare", 2, 4, 0, 0, 0, 0, 1.0, "pierce_50", "enemy", "造成 4 点伤害，无视 50% 护盾 (2点直接穿透扣减 HP)。", True),
        ("dual_slash", "双刃斩", "attack", "rare", 2, 5, 0, 0, 0, 0, 1.0, "self_recoil_1", "enemy", "造成 5 点伤害，自身受到 1 点反冲伤害。", True),
        ("shield_bash", "盾击", "attack", "rare", 2, 3, 0, 0, 0, 0, 1.0, "shield_bonus_3", "enemy", "造成 3 点伤害；若自身当前拥有护盾，额外造成 3 点伤害 (共 6 点)。", True),
        ("small_shield", "小型护盾", "defense", "common", 1, 0, 0, 4, 0, 0, 1.0, "", "self", "获得 4 点护盾 (护盾上限 10)。", True),
        ("large_shield", "大型护盾", "defense", "epic", 3, 0, 0, 8, 0, 0, 1.0, "", "self", "获得 8 点坚实护盾 (护盾上限 10)。", True),
        ("defensive_stance", "防守姿态", "defense", "rare", 2, 0, 0, 0, 0, 1, 1.0, "damage_reduction", "self", "本回合内受到的所有伤害降低 40%。", True),
        ("small_heal", "小型治疗", "heal", "rare", 2, 0, 5, 0, 0, 0, 1.0, "", "self", "恢复 5 HP (单回合治疗上限 8)。", True),
        ("meditation", "冥想", "heal", "common", 1, 0, 2, 0, 1, 0, 1.0, "", "self", "恢复 2 HP，然后抽取 1 张牌。", True),
        ("flame_flask", "火焰瓶", "special", "rare", 2, 3, 0, 0, 0, 2, 1.0, "burn", "enemy", "造成 3 点伤害，施加 1 层灼烧 (每层回合末 1 伤，持续 2 回合)。", True),
        ("poison_blade", "毒刃", "special", "rare", 2, 2, 0, 0, 0, 2, 1.0, "poison", "enemy", "造成 2 点伤害，施加 2 层中毒 (每层回合末 1 伤，持续 2 回合)。", True),
        ("energy_surge", "能量爆发", "special", "epic", 0, 0, 0, 0, 0, 1, 1.0, "energy_gain_2", "self", "立即获得 2 点能量 (上限 6)，但本回合不能进行普通攻击。", True),
        ("focus", "专注", "special", "common", 1, 0, 0, 0, 2, 1, 1.0, "attack_buff", "self", "抽取 2 张牌，且本回合下一次造成的伤害 +2。", True),
        ("weaken", "虚弱", "special", "rare", 2, 0, 0, 0, 0, 1, 1.0, "weakness", "enemy", "使敌人造成的伤害减少 2 点 (最低不低于 1)，持续 1 回合。", True),
        ("steal", "夺取", "special", "epic", 2, 2, 0, 0, 1, 0, 1.0, "steal_card", "enemy", "造成 2 点伤害，并随机复制对手手牌中的 1 张牌到自己手牌中。", True)
    ]
    for r_idx, r in enumerate(cards_rows, 2):
        for c_idx, val in enumerate(r, 1):
            cell = ws_cards.cell(row=r_idx, column=c_idx, value=val)
            cell.border = thin_border
            if r_idx % 2 == 1:
                cell.fill = fill_zebra
            if c_idx in [5, 6, 7, 8, 9, 10, 11]:
                cell.font = font_bold_num
                cell.alignment = align_center
            elif c_idx in [1, 3, 4, 12, 13, 15]:
                cell.font = font_id
                cell.alignment = align_center
            elif c_idx == 14:
                cell.font = font_desc
                cell.alignment = align_left
            else:
                cell.font = font_body
                cell.alignment = align_left
    auto_fit(ws_cards)

    # =========================================================================
    # Sheet 5: StatusEffects
    # statusId, statusName, category, triggerTiming, damagePerTurn, healPerTurn, damageModifier, damageTakenModifier, duration, maxStacks, stackRule, description
    # =========================================================================
    ws_status = wb.create_sheet("StatusEffects")
    headers_status = [
        ("状态ID", "statusId"),
        ("状态名称", "statusName"),
        ("分类", "category"),
        ("触发时机", "triggerTiming"),
        ("每回合伤害", "damagePerTurn"),
        ("每回合治疗", "healPerTurn"),
        ("造成伤害修正", "damageModifier"),
        ("受到伤害修正", "damageTakenModifier"),
        ("持续回合", "duration"),
        ("最大层数", "maxStacks"),
        ("叠加规则", "stackRule"),
        ("状态描述", "description")
    ]
    format_sheet_headers(ws_status, headers_status, fill_hdr_status)

    status_rows = [
        ("burn", "灼烧", "debuff", "turn_end", 1, 0, 0, 0.0, 2, 3, "stack_duration_refresh", "每层在回合末造成 1 点真实伤害，持续 2 回合，上限 3 层"),
        ("poison", "中毒", "debuff", "turn_end", 1, 0, 0, 0.0, 2, 99, "stack_infinite", "每层在回合末造成 1 点真实伤害，持续 2 回合，可无上限叠加"),
        ("weakness", "虚弱", "debuff", "on_attack", 0, 0, -2, 0.0, 1, 1, "refresh_only", "造成的所有攻击与技能伤害减少 2 点 (最低扣至 1 点)，持续 1 回合"),
        ("attack_buff", "专注加伤", "buff", "next_hit", 0, 0, 2, 0.0, 1, 1, "consume_on_hit", "本回合下一次造成的伤害额外增加 2 点，命中后消耗"),
        ("damage_reduction", "防守减伤", "buff", "on_hit", 0, 0, 0, -0.4, 1, 1, "max_ratio", "本回合受到的所有伤害降低 40%"),
        ("flat_shield_wall", "坚壁格挡", "buff", "on_hit", 0, 0, 0, -1.0, 1, 1, "consume_on_hit", "本回合受到的下一次伤害固定扣减 1 点，触发后移除")
    ]
    for r_idx, r in enumerate(status_rows, 2):
        for c_idx, val in enumerate(r, 1):
            cell = ws_status.cell(row=r_idx, column=c_idx, value=val)
            cell.border = thin_border
            if c_idx in [5, 6, 7, 8, 9, 10]:
                cell.font = font_bold_num
                cell.alignment = align_center
            elif c_idx in [1, 3, 4, 11]:
                cell.font = font_id
                cell.alignment = align_center
            elif c_idx == 12:
                cell.font = font_desc
                cell.alignment = align_left
            else:
                cell.font = font_body
                cell.alignment = align_left
    auto_fit(ws_status)

    # =========================================================================
    # Sheet 6: CardPools
    # characterId, cardId, count, starter, enabled
    # =========================================================================
    ws_pools = wb.create_sheet("CardPools")
    headers_pools = [
        ("角色ID", "characterId"),
        ("卡牌ID", "cardId"),
        ("携带张数", "count"),
        ("初始卡牌", "starter"),
        ("启用", "enabled")
    ]
    format_sheet_headers(ws_pools, headers_pools, fill_hdr_pools)

    char_ids = ["fire_warrior", "iron_guardian", "forest_mage", "lightning_assassin"]
    card_ids = [c[0] for c in cards_rows]
    pool_rows = []
    for cid in char_ids:
        for kid in card_ids:
            pool_rows.append((cid, kid, 2, True, True))

    for r_idx, r in enumerate(pool_rows, 2):
        for c_idx, val in enumerate(r, 1):
            cell = ws_pools.cell(row=r_idx, column=c_idx, value=val)
            cell.border = thin_border
            if c_idx == 3:
                cell.font = font_bold_num
                cell.alignment = align_center
            elif c_idx in [4, 5]:
                cell.font = font_body
                cell.alignment = align_center
            else:
                cell.font = font_id
                cell.alignment = align_center
    auto_fit(ws_pools)

    # =========================================================================
    # Sheet 7: BalanceNotes
    # date, type, id, oldValue, newValue, reason, author, notes
    # =========================================================================
    ws_notes = wb.create_sheet("BalanceNotes")
    headers_notes = [
        ("调整日期", "date"),
        ("调整类型", "type"),
        ("调整对象ID", "id"),
        ("旧数值", "oldValue"),
        ("新数值", "newValue"),
        ("调整原因", "reason"),
        ("填写人", "author"),
        ("策划备注", "notes")
    ]
    format_sheet_headers(ws_notes, headers_notes, fill_hdr_notes)

    notes_rows = [
        ("2026-09-14", "Architecture", "ALL", "Hardcoded", "Excel Configuration", "建立第一代数据驱动型卡牌配置与双向自动校验同步系统", "策划组", "解耦逻辑与数值，实现零代码热平衡调整"),
        ("2026-09-14", "Card", "heavy_strike", "7", "7", "重击伤害基准定为 7 点 (3费高费斩杀线)", "策划组", "需持续观察是否容易与专注牌打出 9 伤超额爆发"),
        ("2026-09-14", "Character", "iron_guardian", "34 HP", "34 HP", "钢铁守卫初始生命值 34 点，普攻 3 点", "策划组", "防守反击定位，对战刺客与剑士胜率在 52% 附近达成理想平衡")
    ]
    for r_idx, r in enumerate(notes_rows, 2):
        for c_idx, val in enumerate(r, 1):
            cell = ws_notes.cell(row=r_idx, column=c_idx, value=val)
            cell.border = thin_border
            cell.font = font_body
            cell.alignment = align_center if c_idx in [1, 2, 4, 5, 7] else align_left
    auto_fit(ws_notes)

    # =========================================================================
    # Sheet 8: README
    # =========================================================================
    ws_readme = wb.create_sheet("README")
    ws_readme.views.sheetView[0].showGridLines = True
    ws_readme.column_dimensions['A'].width = 18
    ws_readme.column_dimensions['B'].width = 32
    ws_readme.column_dimensions['C'].width = 65

    guide_lines = [
        ("《宿命对决 Destiny Duel》- 数据驱动策划平衡配置手册", "", ""),
        ("版本", "v2.0.0 (Data-Driven Architecture)", "修改本表格数值即可自动驱动全游戏战斗逻辑，无需手写代码！"),
        ("", "", ""),
        ("一、工作表说明 (Sheets Overview)", "", ""),
        ("GameRules", "全局战斗规则", "最大能量(6)、初始能量(3)、回合抽牌(1)、护盾上限(10)、第8轮白热化死线等"),
        ("Characters", "英雄基础属性", "4位英雄的生命值、普攻伤害、初始能量、最大能量与关联技能/被动ID"),
        ("CharacterSkills", "英雄主动技能", "技能消耗、冷却回合、伤害、护盾、治疗量、连击概率与效果类型"),
        ("Cards", "卡牌核心数据库", "16张核心卡牌的费用、伤害、护盾、回复、抽牌数、附加状态与效果标识"),
        ("StatusEffects", "状态效果系统", "灼烧、中毒、虚弱、加伤、减伤等 Buff/Debuff 触发时机、跳伤与持续回合"),
        ("CardPools", "角色卡组构筑池", "配置每个英雄在开局牌库中携带哪些牌及各自张数，直接修改 count 即可调整卡组"),
        ("BalanceNotes", "平衡历史记录", "记录数值变动日期、对象ID、新旧数值、改动意图与作者"),
        ("README", "使用指南与规范", "本说明文档"),
        ("", "", ""),
        ("二、数值修改与同步步骤 (How to Sync)", "", ""),
        ("第 1 步", "修改并保存 Excel", "直接在对应工作表中修改数值，按 Ctrl + S 保存此文件"),
        ("第 2 步", "执行同步转换", "在项目终端运行：npm run balance:sync\n或者直接双击运行：tools/sync_balance.bat"),
        ("第 3 步", "刷新游戏验证", "刷新浏览器网页，游戏将立即从 data/game_config.js 载入最新数值！"),
        ("", "", ""),
        ("三、自动校验规则 (Validation Rules)", "", ""),
        ("合规范围", "自动安全检查", "HP必须 >= 1，费用与CD必须 >= 0，概率必须在 0~1 之间，持续时间必须 >= 0"),
        ("外键强完整性", "禁止悬空引用", "Card 引用的 effectId/statusId，以及 Character 引用的 skillId 必须存在于对应表")
    ]
    for r_idx, r in enumerate(guide_lines, 1):
        for c_idx, val in enumerate(r, 1):
            cell = ws_readme.cell(row=r_idx, column=c_idx, value=val)
            if r_idx == 1:
                cell.font = font_title
            elif val.startswith(("一、", "二、", "三、")):
                cell.font = font_section
                cell.fill = fill_highlight
            elif c_idx == 1 and val:
                cell.font = font_bold_num
            else:
                cell.font = font_body

    wb.remove(default_sheet)

    # Save
    desktop_dir = get_desktop_path()
    desktop_file = os.path.join(desktop_dir, "CardGame_Balance.xlsx")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    config_dir = os.path.join(project_root, "config")
    os.makedirs(config_dir, exist_ok=True)
    project_file = os.path.join(config_dir, "CardGame_Balance.xlsx")

    wb.save(desktop_file)
    print(f"[OK] Saved Desktop Excel: {desktop_file}")
    wb.save(project_file)
    print(f"[OK] Saved Project Copy: {project_file}")

if __name__ == "__main__":
    build_workbook()
