# -*- coding: utf-8 -*-
"""
Destiny Duel - CardGame Balance & Editor Excel Generator (Foolproof Edition with Rich Inline Guidance)
Generates full-featured CardGame_Balance.xlsx equipped with:
- Sheet 0: ✨ 傻瓜一站式生成器 (QuickCreator - Rich Guidance & Comments)
- Sheet 1: Dashboard (Interactive Studio Control Panel & Visual Flowchart)
- Sheet 2: Templates (Hero, Skill, Card, Status Archetypes)
- Sheet 3: Characters (Hero data with auto-ID & linked skills)
- Sheet 4: CharacterSkills (Skill data with Effect Editor columns)
- Sheet 5: Cards (16 cards with Effect Editor dropdowns)
- Sheet 6: StatusEffects (Status definitions with trigger & stacking rules)
- Sheet 7: GameRules (Core balance constants)
- Sheet 8: CardPools (Deck compositions)
- Sheet 9: EditorManual (Quickstart guide)
"""
import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.comments import Comment
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

def build_editor_workbook():
    wb = openpyxl.Workbook()
    wb.remove(wb.active) # Remove default sheet

    # Fonts
    font_main_title = Font(name="微软雅黑", size=16, bold=True, color="FFFFFF")
    font_sub_title = Font(name="微软雅黑", size=10, color="CBD5E1")
    font_section_title = Font(name="微软雅黑", size=12, bold=True, color="1E293B")
    font_hint_banner = Font(name="微软雅黑", size=11, bold=True, color="0F52BA")
    font_header = Font(name="微软雅黑", size=10, bold=True, color="FFFFFF")
    font_body = Font(name="微软雅黑", size=9.5)
    font_bold_num = Font(name="微软雅黑", size=11, bold=True, color="0F172A")
    font_id = Font(name="Consolas", size=9, bold=True, color="475569")
    font_btn_title = Font(name="微软雅黑", size=11, bold=True, color="FFFFFF")
    font_btn_sub = Font(name="微软雅黑", size=8.5, color="F1F5F9")
    font_stat_val = Font(name="Consolas", size=18, bold=True, color="1E40AF")
    font_stat_lbl = Font(name="微软雅黑", size=9, bold=True, color="64748B")
    font_section_sub = Font(name="微软雅黑", size=9.5, italic=True, color="047857")

    # Header fills
    fill_banner = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    fill_qc_banner = PatternFill(start_color="047857", end_color="047857", fill_type="solid")
    fill_flow_step = PatternFill(start_color="ECFDF5", end_color="ECFDF5", fill_type="solid") # Emerald 50
    fill_stat_card = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    
    fill_btn_hero = PatternFill(start_color="16A34A", end_color="16A34A", fill_type="solid")
    fill_btn_card = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
    fill_btn_skill = PatternFill(start_color="9333EA", end_color="9333EA", fill_type="solid")
    fill_btn_status = PatternFill(start_color="EA580C", end_color="EA580C", fill_type="solid")
    fill_btn_sync = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid")
    fill_btn_check = PatternFill(start_color="D97706", end_color="D97706", fill_type="solid")
    fill_btn_report = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    fill_btn_play = PatternFill(start_color="DC2626", end_color="DC2626", fill_type="solid")

    fill_hdr_templates = PatternFill(start_color="0D9488", end_color="0D9488", fill_type="solid")
    fill_hdr_rules = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
    fill_hdr_chars = PatternFill(start_color="15803D", end_color="15803D", fill_type="solid")
    fill_hdr_skills = PatternFill(start_color="7E22CE", end_color="7E22CE", fill_type="solid")
    fill_hdr_cards = PatternFill(start_color="1D4ED8", end_color="1D4ED8", fill_type="solid")
    fill_hdr_status = PatternFill(start_color="C2410C", end_color="C2410C", fill_type="solid")
    fill_hdr_pools = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid")

    fill_sample = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    fill_sub_hdr = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid") # Emerald 100

    thin_border = Border(
        left=Side(style='thin', color="CBD5E1"),
        right=Side(style='thin', color="CBD5E1"),
        top=Side(style='thin', color="CBD5E1"),
        bottom=Side(style='thin', color="CBD5E1")
    )

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
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 65)

    # =========================================================================
    # SHEET 0: QuickCreator (✨ 傻瓜一站式生成器 - 超全图形引导与批注)
    # =========================================================================
    ws_qc = wb.create_sheet("QuickCreator")
    ws_qc.views.sheetView[0].showGridLines = True

    # 1. Main Banner Header (Rows 1-2)
    ws_qc.merge_cells("A1:K2")
    b_qc = ws_qc.cell(row=1, column=1, value="✨《宿命对决》傻瓜式一站式游戏生成器 (QuickCreator)")
    b_qc.font = font_main_title
    b_qc.fill = fill_qc_banner
    b_qc.alignment = Alignment(horizontal="center", vertical="center")

    # 2. Flowchart Guidance Card (Rows 3-5)
    ws_qc.merge_cells("A3:K5")
    guide_text = (
        "📌【傻瓜式 3 步极速填报指南】\n"
        "1. 在下方第 8~11 行【填入或修改】您的新英雄名称与数值（悬停表头看注释说明）\n"
        "2. 按键盘 Ctrl + S 保存本 Excel 文件\n"
        "3. 双击工程文件夹下的 『🚀一键傻瓜生成并玩游戏.bat』 -> 全自动分派唯一ID、编译JSON并直接调起网页游戏对战！"
    )
    cell_guide = ws_qc.cell(row=3, column=1, value=guide_text)
    cell_guide.font = Font(name="微软雅黑", size=10.5, bold=True, color="047857")
    cell_guide.fill = fill_flow_step
    cell_guide.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    ws_qc.row_dimensions[1].height = 22
    ws_qc.row_dimensions[2].height = 22
    ws_qc.row_dimensions[3].height = 20
    ws_qc.row_dimensions[4].height = 20
    ws_qc.row_dimensions[5].height = 20

    # -------------------------------------------------------------------------
    # Section 1: Hero Quick Creator
    # -------------------------------------------------------------------------
    ws_qc.merge_cells("A7:K7")
    lbl_h = ws_qc.cell(row=7, column=1, value="🦸 专区一：一站式创建新角色  👇【请在下方第 9 行起修改或新增您的英雄数据】（填完直接生成英雄、技能与12张卡组）👇")
    lbl_h.font = Font(name="微软雅黑", size=11, bold=True, color="15803D")
    lbl_h.fill = fill_sub_hdr
    lbl_h.alignment = Alignment(horizontal="left", vertical="center")
    ws_qc.row_dimensions[7].height = 26

    qc_hero_headers = [
        ("生成状态", "自动判定。生成前显示'未生成'，一键运行后自动显示分派的唯一ID(hero_xxxx)。"),
        ("角色中文名", "必填！例如：圣光骑士、冰霜法师、神圣巫医。支持任意中文名称！"),
        ("战斗定位", "点击右侧下拉框选择：输出型、防御型、控制型、治疗型、刺客型。"),
        ("最大生命(HP)", "角色的生命值上限。推荐范围：25 ~ 40 HP。"),
        ("基础攻击", "普通攻击物理伤害。推荐范围：3 ~ 5 点。"),
        ("专属技能名称", "角色的专属大招/技能名字。例如：圣光护盾、寒冰箭、链式闪电。"),
        ("技能消耗/CD", "格式为：能量/冷却。例如 2/2 (消耗2能量，冷却2回合)。"),
        ("技能伤害/治疗", "技能的基础基础数值。例如：5 或 6。"),
        ("技能附加效果", "可选格式:\n - shield:6 (获得6护盾)\n - apply_status:freeze:1 (冻结1回合)\n - apply_status:burn:1 (灼烧1回合)"),
        ("初始牌组方案", "默认保持：默认均衡牌组。系统会自动为新角色配齐12张初始战斗卡牌！"),
        ("角色特色描述", "角色的特色说明或战术风格介绍。")
    ]

    ws_qc.row_dimensions[8].height = 28
    for c_idx, (h_text, h_comment) in enumerate(qc_hero_headers, 1):
        cell = ws_qc.cell(row=8, column=c_idx, value=h_text)
        cell.font = font_header
        cell.fill = fill_btn_hero
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border
        cell.comment = Comment(h_comment, "《宿命对决》向导")

    # Editable Sample rows for Hero Quick Creator
    sample_heroes = [
        ("未生成 (待编译)", "圣光骑士", "防御型", 35, 4, "圣光护盾", "2/2", 6, "shield:6", "默认均衡牌组", "拥有强大圣光庇护的圣骑士，既能防守又能自我恢复。"),
        ("未生成 (待编译)", "冰霜法师", "控制型", 30, 4, "寒冰箭", "2/2", 5, "apply_status:freeze:1", "默认均衡牌组", "掌控极寒冰霜之力的施法者，技能可冻结敌人。"),
        ("未生成 (待编译)", "暗影刺客", "刺客型", 26, 5, "暗影突袭", "2/2", 6, "damage:6", "默认均衡牌组", "高爆发敏捷刺客，能在瞬间造成高额致命伤害。")
    ]
    for r_offset, h_data in enumerate(sample_heroes, 9):
        ws_qc.row_dimensions[r_offset].height = 22
        for c_idx, val in enumerate(h_data, 1):
            cell = ws_qc.cell(row=r_offset, column=c_idx, value=val)
            cell.font = font_body
            cell.border = thin_border
            cell.fill = fill_sample
            if c_idx in [4, 5, 8]:
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif c_idx in [1, 3, 7, 10]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

    # -------------------------------------------------------------------------
    # Section 2: Card Quick Creator
    # -------------------------------------------------------------------------
    ws_qc.merge_cells("A13:K13")
    lbl_c = ws_qc.cell(row=13, column=1, value="🃏 专区二：一站式创建新卡牌  👇【请在下方第 15 行起修改或新增您的卡牌数据】（支持无代码组合效果）👇")
    lbl_c.font = Font(name="微软雅黑", size=11, bold=True, color="1D4ED8")
    lbl_c.fill = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid") # Blue 100
    lbl_c.alignment = Alignment(horizontal="left", vertical="center")
    ws_qc.row_dimensions[13].height = 26

    qc_card_headers = [
        ("生成状态", "生成前显示'未生成'，一键运行后自动显示分派的卡牌ID(card_xxxx)。"),
        ("卡牌中文名", "必填！例如：圣光打击、极寒风暴、钢铁壁垒。"),
        ("卡牌类型", "下拉选择：attack (攻击卡) / defense (防御卡) / heal (治疗卡) / special (特殊状态卡)。"),
        ("能量消耗(Cost)", "打出此卡牌所需的能量，通常为 1 ~ 3 点。"),
        ("目标/归属英雄", "默认填：通用卡牌。若填指定英雄名，则自动加入该英雄卡池。"),
        ("伤害/治疗数值", "卡牌的基础数值（伤害/护盾/治疗量）。"),
        ("附加效果类型", "可选效果：damage, heal, shield, draw_card, apply_status, modify_damage 等。"),
        ("效果参数/状态", "附加效果的参数，如 statusId 或数值（例如 freeze:1 或 2）。"),
        ("卡牌精炼描述", "卡牌在游戏中展示的文本说明。")
    ]
    ws_qc.row_dimensions[14].height = 28
    for c_idx, (h_text, h_comment) in enumerate(qc_card_headers, 1):
        cell = ws_qc.cell(row=14, column=c_idx, value=h_text)
        cell.font = font_header
        cell.fill = fill_btn_card
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border
        cell.comment = Comment(h_comment, "《宿命对决》向导")

    sample_cards = [
        ("未生成 (待编译)", "圣光打击", "attack", 2, "通用卡牌", 5, "heal", "2", "造成 5 点伤害，并恢复自身 2 点生命。"),
        ("未生成 (待编译)", "极寒风暴", "special", 3, "通用卡牌", 4, "apply_status", "freeze:1", "造成 4 点伤害，并极寒冻结目标 1 回合。"),
        ("未生成 (待编译)", "钢铁壁垒", "defense", 2, "通用卡牌", 6, "shield", "6", "架设重型防护壁垒，获得 6 点护盾。")
    ]
    for r_offset, c_data in enumerate(sample_cards, 15):
        ws_qc.row_dimensions[r_offset].height = 22
        for c_idx, val in enumerate(c_data, 1):
            cell = ws_qc.cell(row=r_offset, column=c_idx, value=val)
            cell.font = font_body
            cell.border = thin_border
            cell.fill = fill_sample
            if c_idx in [4, 6]:
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif c_idx in [1, 3, 5, 7]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

    # -------------------------------------------------------------------------
    # Section 3: Status Quick Creator
    # -------------------------------------------------------------------------
    ws_qc.merge_cells("A19:K19")
    lbl_s = ws_qc.cell(row=19, column=1, value="🧪 专区三：一站式创建新状态  👇【请在下方第 21 行起修改或新增您的 Buff / Debuff 状态数据】👇")
    lbl_s.font = Font(name="微软雅黑", size=11, bold=True, color="C2410C")
    lbl_s.fill = PatternFill(start_color="FFEDD5", end_color="FFEDD5", fill_type="solid") # Orange 100
    lbl_s.alignment = Alignment(horizontal="left", vertical="center")
    ws_qc.row_dimensions[19].height = 26

    qc_status_headers = [
        ("生成状态", "生成前显示'未生成'，一键运行后自动显示分派的状态ID(status_xxxx)。"),
        ("状态中文名", "必填！例如：神圣庇护、虚弱、灼烧。"),
        ("状态分类", "下拉选择：buff (益处状态) / debuff (减益状态)。"),
        ("持续回合", "状态在目标身上保留的自然回合数（通常 1~3 回合）。"),
        ("每回合伤害/效果", "回合末或触发时结算的数值（例如每回合造成 1 伤）。"),
        ("触发时机", "下拉选择：turn_end, turn_start, on_hit, on_attack, next_hit。"),
        ("详细效果说明", "状态的展示文本说明。")
    ]
    ws_qc.row_dimensions[20].height = 28
    for c_idx, (h_text, h_comment) in enumerate(qc_status_headers, 1):
        cell = ws_qc.cell(row=20, column=c_idx, value=h_text)
        cell.font = font_header
        cell.fill = fill_btn_status
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border
        cell.comment = Comment(h_comment, "《宿命对决》向导")

    sample_status = [
        ("未生成 (待编译)", "神圣庇护", "buff", 2, 0.0, "on_hit", "受到的所有伤害固定减少 2 点，持续 2 回合。"),
        ("未生成 (待编译)", "极寒冰冻", "debuff", 1, 0.0, "turn_start", "目标处于极寒之中，回合开始时被冻结无法行动。")
    ]
    for r_offset, s_data in enumerate(sample_status, 21):
        ws_qc.row_dimensions[r_offset].height = 22
        for c_idx, val in enumerate(s_data, 1):
            cell = ws_qc.cell(row=r_offset, column=c_idx, value=val)
            cell.font = font_body
            cell.border = thin_border
            cell.fill = fill_sample
            if c_idx in [4, 5]:
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif c_idx in [1, 3, 6]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

    # QuickCreator Data Validations
    dv_qc_role = DataValidation(type="list", formula1='"输出型,防御型,控制型,治疗型,刺客型"', allow_blank=True)
    ws_qc.add_data_validation(dv_qc_role)
    dv_qc_role.add("C9:C12")

    dv_qc_cardtype = DataValidation(type="list", formula1='"attack,defense,heal,special"', allow_blank=True)
    ws_qc.add_data_validation(dv_qc_cardtype)
    dv_qc_cardtype.add("C15:C18")

    dv_qc_statuscat = DataValidation(type="list", formula1='"buff,debuff"', allow_blank=True)
    ws_qc.add_data_validation(dv_qc_statuscat)
    dv_qc_statuscat.add("C21:C24")

    auto_fit(ws_qc)

    # =========================================================================
    # SHEET 1: Dashboard (控制面板 / 游戏工作室编辑器首页 + 流程图图解)
    # =========================================================================
    ws_dash = wb.create_sheet("Dashboard")
    ws_dash.views.sheetView[0].showGridLines = True

    # 1. Main Banner Header (Rows 1-3)
    ws_dash.merge_cells("A1:H2")
    banner_cell = ws_dash.cell(row=1, column=1, value="⚔️《宿命对决 Destiny Duel》可视化游戏制作与数值编辑器")
    banner_cell.font = font_main_title
    banner_cell.fill = fill_banner
    banner_cell.alignment = Alignment(horizontal="center", vertical="center")

    ws_dash.merge_cells("A3:H3")
    sub_cell = ws_dash.cell(row=3, column=1, value="傻瓜式一站式生成架构 | 免写代码 · 极速填空 · 全自动关联与ID生成 · 一键测试")
    sub_cell.font = font_sub_title
    sub_cell.fill = fill_banner
    sub_cell.alignment = Alignment(horizontal="center", vertical="center")

    # 2. Visual Flowchart Card (Rows 5-6)
    ws_dash.merge_cells("A5:B6")
    c_f1 = ws_dash.cell(row=5, column=1, value="1. 填 QuickCreator 表\n(在 Sheet 1 改写名称与数值)")
    c_f1.font = font_bold_num
    c_f1.fill = fill_flow_step
    c_f1.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c_f1.border = thin_border

    ws_dash.merge_cells("C5:D6")
    c_f2 = ws_dash.cell(row=5, column=3, value="2. Ctrl + S 保存 Excel\n(确保修改已存盘)")
    c_f2.font = font_bold_num
    c_f2.fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    c_f2.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c_f2.border = thin_border

    ws_dash.merge_cells("E5:F6")
    c_f3 = ws_dash.cell(row=5, column=5, value="3. 双击运行一键生成.bat\n(自动构建ID/技能/牌组)")
    c_f3.font = font_bold_num
    c_f3.fill = PatternFill(start_color="E0F2FE", end_color="E0F2FE", fill_type="solid")
    c_f3.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c_f3.border = thin_border

    ws_dash.merge_cells("G5:H6")
    c_f4 = ws_dash.cell(row=5, column=7, value="4. 网页游戏自动开打！\n(选人界面直接测试新英雄)")
    c_f4.font = font_bold_num
    c_f4.fill = PatternFill(start_color="FCE7F3", end_color="FCE7F3", fill_type="solid")
    c_f4.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c_f4.border = thin_border

    # 3. Statistics Row (Rows 8-9)
    stat_configs = [
        ("B8:B9", "🦸 英雄总数", "=COUNTA(Characters!A2:A100)"),
        ("C8:C9", "⚡ 技能总数", "=COUNTA(CharacterSkills!A2:A100)"),
        ("D8:D9", "🃏 卡牌总数", "=COUNTA(Cards!A2:A100)"),
        ("E8:E9", "🧪 状态总数", "=COUNTA(StatusEffects!A2:A100)"),
        ("F8:F9", "📐 规则参数", "=COUNTA(GameRules!A2:A100)"),
        ("G8:G9", "📦 卡牌构筑", "=COUNTA(CardPools!A2:A100)")
    ]

    for cell_range, title, formula in stat_configs:
        start_col = cell_range[0]
        c1 = ws_dash[f"{start_col}8"]
        c1.value = title
        c1.font = font_stat_lbl
        c1.alignment = Alignment(horizontal="center", vertical="center")
        c1.fill = fill_stat_card
        c1.border = thin_border

        c2 = ws_dash[f"{start_col}9"]
        c2.value = formula
        c2.font = font_stat_val
        c2.alignment = Alignment(horizontal="center", vertical="center")
        c2.fill = fill_stat_card
        c2.border = thin_border

    # 4. Action Center Header (Row 11)
    ws_dash.merge_cells("A11:H11")
    lbl_action = ws_dash.cell(row=11, column=1, value="🎮 核心功能操作中心 (Action Center)")
    lbl_action.font = font_section_title
    lbl_action.alignment = Alignment(horizontal="left", vertical="center")

    # Action Buttons Grid (Rows 12-17)
    buttons = [
        (12, 2, "1. ⚡ 傻瓜一站式生成", "一键扫描 QuickCreator 自动构建全套数据", fill_qc_banner, "双击 🚀一键傻瓜生成并玩游戏.bat"),
        (12, 4, "2. 🦸 交互式创建英雄", "自动生成 hero_xxxx / 关联技能与被动", fill_btn_hero, "运行 CardGame_Editor.bat -> 选择 2"),
        (12, 6, "3. 🃏 交互式创建卡牌", "自动生成 card_xxxx / 组合效果库", fill_btn_card, "运行 CardGame_Editor.bat -> 选择 3"),
        
        (14, 2, "4. ⚡ 交互式创建技能", "自动生成 skill_xxxx / 绑定指定英雄", fill_btn_skill, "运行 CardGame_Editor.bat -> 选择 4"),
        (14, 4, "5. 🧪 交互式创建状态", "自动生成 status_xxxx / 设堆叠触发", fill_btn_status, "运行 CardGame_Editor.bat -> 选择 5"),
        (14, 6, "6. 🔄 同步游戏数值", "Excel -> JSON -> 前端实时生效", fill_btn_sync, "运行 CardGame_Editor.bat -> 选择 6"),

        (16, 2, "7. 🔍 数据完整性体检", "排查重复ID / 悬空引用 / 边界数值", fill_btn_check, "运行 CardGame_Editor.bat -> 选择 7"),
        (16, 4, "8. 📊 生成平衡报告", "3000场蒙特卡洛AI胜率自动推演", fill_btn_report, "运行 CardGame_Editor.bat -> 选择 8"),
        (16, 6, "9. 🚀 启动对决游戏", "一键打开最新版本网页游戏", fill_btn_play, "运行 CardGame_Editor.bat -> 选择 9")
    ]

    for r, c, b_title, b_sub, b_fill, b_cmd in buttons:
        c1 = ws_dash.cell(row=r, column=c, value=b_title)
        c1.font = font_btn_title
        c1.fill = b_fill
        c1.alignment = Alignment(horizontal="center", vertical="center")
        c1.border = thin_border

        c2 = ws_dash.cell(row=r+1, column=c, value=f"{b_sub}\n[快速操作: {b_cmd}]")
        c2.font = font_btn_sub
        c2.fill = b_fill
        c2.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c2.border = thin_border

    auto_fit(ws_dash)

    # Build underlying tables
    # [Templates]
    ws_tmpl = wb.create_sheet("Templates")
    headers_tmpl = [("模板类别", "templateCategory"), ("模板标识", "templateId"), ("模板名称", "templateName"), ("核心定位/效果", "roleOrEffect"), ("推荐生命(HP)", "hp"), ("推荐攻击/伤害", "attackOrDamage"), ("推荐消耗(Cost)", "cost"), ("冷却/持续", "cooldownOrDuration"), ("默认效果声明 (Effect 1)", "effect1"), ("追加效果声明 (Effect 2)", "effect2"), ("详细说明与策划建议", "description")]
    format_sheet_headers(ws_tmpl, headers_tmpl, fill_hdr_templates)
    template_rows = [
        ("英雄模板", "hero_damage", "输出英雄模板", "高攻击 / 爆发输出", 28, 5, 3, 2, "damage:7", "apply_status:burn:1", "高爆发进攻型角色，初始伤害与斩杀极高，技能施加灼烧。"),
        ("英雄模板", "hero_tank", "防御英雄模板", "防御 / 反制坚壁", 34, 3, 2, 2, "shield:7", "modify_damage:flat_reduction:1", "全游戏最高生命值与减伤被动，凭坚壁化解爆发。"),
        ("英雄模板", "hero_healer", "治疗英雄模板", "治疗 / 消耗续航", 30, 4, 3, 2, "heal:7", "passive_heal_on_turn_end:2", "强大的气血与自然自愈力，靠防守与回复拖垮对手。"),
        ("英雄模板", "hero_assassin", "刺客英雄模板", "敏捷 / 暴击高险", 26, 4, 2, 2, "damage:5", "conditional:chance:0.4:secondary_damage:3", "极致爆发，血量最脆，技能附带追加连击。"),
        ("英雄模板", "hero_controller", "控制英雄模板", "控制 / 极寒冰封", 30, 4, 2, 2, "damage:5", "apply_status:freeze:1", "极寒控场，寒冰箭造成 5 伤害并冻结目标 1 回合。")
    ]
    for r_idx, r_data in enumerate(template_rows, 2):
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_tmpl.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_body
            cell.border = thin_border
    auto_fit(ws_tmpl)

    # [Characters]
    ws_chars = wb.create_sheet("Characters")
    headers_chars = [("角色ID", "characterId"), ("角色名称", "characterName"), ("战斗定位", "role"), ("最大生命", "maxHp"), ("基础攻击", "baseAttack"), ("初始能量", "startingEnergy"), ("最大能量", "maxEnergy"), ("被动ID", "passiveId"), ("专属技能ID", "skillId"), ("角色描述与战术风格", "description"), ("启用状态", "enabled"), ("策划备注", "notes")]
    format_sheet_headers(ws_chars, headers_chars, fill_hdr_chars)
    char_rows = [
        ("fire_warrior", "烈焰剑士", "高攻击 / 爆发输出", 28, 5, 3, 6, "fire_warrior_passive", "fire_warrior_skill", "拥有最高的初始常态伤害与技能斩杀力，能用灼烧持续折磨对手。", True, "高危进攻位"),
        ("iron_guardian", "钢铁守卫", "防御 / 反制坚壁", 34, 3, 3, 6, "iron_guardian_passive", "iron_guardian_skill", "拥有全英雄最高 HP 与减伤被动，凭坚壁化解爆发。", True, "强生存盾坦"),
        ("forest_mage", "森林术士", "治疗 / 消耗续航", 30, 4, 3, 6, "forest_mage_passive", "forest_mage_skill", "强大的自然恢复力，靠持久战拖垮对手。", True, "续航磨血"),
        ("lightning_assassin", "雷电刺客", "敏捷 / 暴击高险", 26, 4, 3, 6, "lightning_assassin_passive", "lightning_assassin_skill", "爆发刺客，普攻暴击与闪电突袭瞬发打出超高伤。", True, "刺客连招"),
        ("ice_mage", "冰霜法师", "控制 / 极寒冰封", 30, 4, 3, 6, "ice_mage_passive", "ice_mage_skill", "技能能冻结敌人使其在下回合无法行动。", True, "控场压制")
    ]
    for r_idx, r_data in enumerate(char_rows, 2):
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_chars.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_id if c_idx in [1, 8, 9] else font_body
            cell.border = thin_border
    auto_fit(ws_chars)

    # [CharacterSkills]
    ws_skills = wb.create_sheet("CharacterSkills")
    headers_skills = [("技能ID", "skillId"), ("对应角色ID", "characterId"), ("技能名称", "skillName"), ("技能机制类型", "skillType"), ("消耗能量", "cost"), ("冷却回合", "cooldown"), ("伤害数值", "damage"), ("治疗数值", "heal"), ("护盾数值", "shield"), ("持续回合", "duration"), ("主效果类型", "effectType1"), ("主效果数值", "effectVal1"), ("次效果类型", "effectType2"), ("次效果数值", "effectVal2"), ("附带状态ID", "effectId"), ("技能详细描述", "description")]
    format_sheet_headers(ws_skills, headers_skills, fill_hdr_skills)
    skill_rows = [
        ("fire_warrior_skill", "fire_warrior", "烈焰斩", "damage_and_burn", 3, 2, 7, 0, 0, 2, "damage", 7, "apply_status", 1, "burn", "造成 7 点伤害，并施加 1 层灼烧"),
        ("iron_guardian_skill", "iron_guardian", "钢铁壁垒", "shield_and_flat_reduction", 2, 2, 0, 0, 7, 1, "shield", 7, "modify_damage", 1, "flat_shield_wall", "获得 7 点护盾，本回合后续减伤 1 点"),
        ("forest_mage_skill", "forest_mage", "自然治愈", "conditional_heal", 3, 2, 0, 7, 0, 0, "heal", 7, "conditional", 0.8, "heal", "恢复 7 HP"),
        ("lightning_assassin_skill", "lightning_assassin", "闪电突袭", "damage_and_combo", 2, 2, 5, 0, 0, 0, "damage", 5, "conditional", 3, "", "造成 5 点伤害，40% 概率触发连击"),
        ("ice_mage_skill", "ice_mage", "寒冰箭", "damage_and_freeze", 2, 2, 5, 0, 0, 1, "damage", 5, "apply_status", 1, "freeze", "造成 5 点伤害，附带 1 回合冰冻")
    ]
    for r_idx, r_data in enumerate(skill_rows, 2):
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_skills.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_id if c_idx in [1, 2, 15] else font_body
            cell.border = thin_border
    auto_fit(ws_skills)

    # [Cards]
    ws_cards = wb.create_sheet("Cards")
    headers_cards = [("卡牌ID", "cardId"), ("卡牌名称", "cardName"), ("卡牌类型", "type"), ("稀有度", "rarity"), ("消耗能量", "cost"), ("造成伤害", "damage"), ("获得护盾", "shield"), ("恢复生命", "heal"), ("抽牌数量", "draw"), ("主效果类型", "effectType1"), ("主效果数值", "effectVal1"), ("次效果类型", "effectType2"), ("次效果数值", "effectVal2"), ("关联状态ID", "statusId"), ("状态层数", "statusStacks"), ("目标类型", "targetType"), ("精炼描述", "description"), ("启用状态", "enabled")]
    format_sheet_headers(ws_cards, headers_cards, fill_hdr_cards)
    cards_rows = [
        ("quick_attack", "快速攻击", "attack", "common", 1, 3, 0, 0, 0, "damage", 3, "-", 0, "", 0, "enemy", "造成 3 点伤害。", True),
        ("heavy_strike", "重击", "attack", "rare", 3, 7, 0, 0, 0, "damage", 7, "-", 0, "", 0, "enemy", "造成 7 点高额伤害。", True),
        ("pierce", "穿刺", "attack", "common", 2, 4, 0, 0, 0, "damage", 4, "pierce", 0.5, "", 0, "enemy", "造成 4 点伤害，无视 50% 护盾。", True),
        ("dual_slash", "双刃斩", "attack", "rare", 2, 5, 0, 0, 0, "damage", 5, "self_damage", 1, "", 0, "enemy", "造成 5 点伤害，自身受到 1 点反噬。", True),
        ("shield_bash", "盾击", "attack", "rare", 2, 3, 0, 0, 0, "damage", 3, "conditional", 3, "", 0, "enemy", "造成 3 点伤害；若有护盾，额外造成 3 点伤害。", True),
        ("small_shield", "小型护盾", "defense", "common", 1, 0, 4, 0, 0, "shield", 4, "-", 0, "", 0, "self", "获得 4 点护盾 (上限 10)。", True),
        ("large_shield", "大型护盾", "defense", "rare", 3, 0, 8, 0, 0, "shield", 8, "-", 0, "", 0, "self", "获得 8 点护盾 (上限 10)。", True),
        ("defensive_stance", "防守姿态", "defense", "rare", 2, 0, 0, 0, 0, "modify_damage", 0.4, "-", 0, "damage_reduction", 1, "self", "本回合受到的所有伤害降低 40%。", True),
        ("small_heal", "小型治疗", "heal", "common", 2, 0, 0, 5, 0, "heal", 5, "-", 0, "", 0, "self", "恢复 5 点生命 (单回合上限 8)。", True),
        ("meditation", "冥想", "heal", "common", 1, 0, 0, 2, 1, "heal", 2, "draw_card", 1, "", 0, "self", "恢复 2 点生命，抽 1 张牌。", True),
        ("flame_flask", "火焰瓶", "special", "rare", 2, 3, 0, 0, 0, "damage", 3, "apply_status", 1, "burn", 1, "enemy", "造成 3 点伤害，施加 1 层灼烧。", True),
        ("poison_blade", "毒刃", "special", "rare", 2, 2, 0, 0, 0, "damage", 2, "apply_status", 2, "poison", 2, "enemy", "造成 2 点伤害，施加 2 层中毒。", True),
        ("energy_surge", "能量爆发", "special", "epic", 0, 0, 0, 0, 0, "gain_energy", 2, "forbid_normal_attack", 0, "", 0, "self", "立即获得 2 点能量，本回合无法普攻。", True),
        ("focus", "专注", "special", "rare", 1, 0, 0, 0, 2, "draw_card", 2, "modify_damage", 2, "attack_buff", 1, "self", "抽 2 张牌，本回合下次伤害 +2 点。", True),
        ("weaken", "虚弱", "special", "common", 2, 0, 0, 0, 0, "apply_status", 2, "-", 0, "weakness", 1, "enemy", "使敌人造成的伤害减少 2 点。", True),
        ("steal", "夺取", "special", "epic", 2, 2, 0, 0, 0, "damage", 2, "steal_card", 1, "", 0, "enemy", "造成 2 点伤害，随机复制对手 1 张手牌。", True)
    ]
    for r_idx, r_data in enumerate(cards_rows, 2):
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_cards.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_id if c_idx in [1, 14] else font_body
            cell.border = thin_border
    auto_fit(ws_cards)

    # [StatusEffects]
    ws_status = wb.create_sheet("StatusEffects")
    headers_status = [("状态ID", "statusId"), ("状态名称", "statusName"), ("分类", "category"), ("触发时机", "triggerTiming"), ("每回合伤害", "damagePerTurn"), ("每回合治疗", "healPerTurn"), ("伤害加成/削弱", "damageModifier"), ("受击减伤比例", "damageTakenModifier"), ("持续回合", "duration"), ("叠加上限", "maxStacks"), ("叠加规则", "stackRule"), ("详细说明", "description")]
    format_sheet_headers(ws_status, headers_status, fill_hdr_status)
    status_rows = [
        ("burn", "灼烧", "debuff", "turn_end", 1.0, 0.0, 0.0, 0.0, 2, 3, "stack_duration_refresh", "每层在回合末造成 1 点真实伤害，持续 2 回合，上限 3 层"),
        ("poison", "中毒", "debuff", "turn_end", 1.0, 0.0, 0.0, 0.0, 2, 99, "stack_infinite", "每层在回合末造成 1 点真实伤害，持续 2 回合"),
        ("weakness", "虚弱", "debuff", "on_attack", 0.0, 0.0, -2.0, 0.0, 1, 1, "refresh_only", "造成的所有伤害减少 2 点"),
        ("attack_buff", "专注加伤", "buff", "next_hit", 0.0, 0.0, 2.0, 0.0, 1, 1, "consume_on_hit", "本回合下一次造成的伤害额外增加 2 点"),
        ("damage_reduction", "防守减伤", "buff", "on_hit", 0.0, 0.0, 0.0, -0.4, 1, 1, "refresh_only", "本回合受到的所有伤害降低 40%"),
        ("flat_shield_wall", "坚壁格挡", "buff", "on_hit", 0.0, 0.0, 0.0, -1.0, 1, 1, "consume_on_hit", "本回合受到的下一次伤害固定扣减 1 点"),
        ("freeze", "冰冻", "debuff", "turn_start", 0.0, 0.0, 0.0, 0.0, 1, 1, "refresh_only", "回合开始时被冻结无法行动")
    ]
    for r_idx, r_data in enumerate(status_rows, 2):
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_status.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_id if c_idx == 1 else font_body
            cell.border = thin_border
    auto_fit(ws_status)

    # [GameRules]
    ws_rules = wb.create_sheet("GameRules")
    headers_rules = [("规则ID", "ruleId"), ("规则名称", "ruleName"), ("规则数值", "value"), ("说明与限制", "description")]
    format_sheet_headers(ws_rules, headers_rules, fill_hdr_rules)
    rules_rows = [
        ("hand_card_limit", "手牌上限", 5, "每名玩家回合末手牌不得超过 5 张"),
        ("start_hand_count", "初始抽牌数", 4, "对局开始时双方玩家抽取的初始手牌数量"),
        ("energy_per_turn", "每回合回复能量", 3, "玩家每回合开始时固定获得的可用能量点数"),
        ("max_shield_cap", "单体护盾上限", 10, "角色可重叠积累的最大护盾绝对值上限"),
        ("max_heal_per_turn", "单回合治疗上限", 8, "单回合内包含技能与卡牌的最大累计回血量"),
        ("normal_attack_cost", "普通攻击消耗能量", 1, "进行一次基础普通攻击消耗的能量"),
        ("normal_attack_damage", "普通攻击伤害", 4, "基础普通攻击造成的固定物理伤害"),
        ("crit_chance", "刺客暴击概率", 0.20, "雷电刺客普通攻击触发 2 倍暴击的百分比概率"),
        ("tank_damage_reduction", "坦克减伤常数", 1, "钢铁守卫被动每次受击固定扣减的伤害数值"),
        ("burn_damage_per_turn", "灼烧回合末伤", 1, "灼烧 Status 每层在回合结算的伤害"),
        ("poison_damage_per_turn", "中毒回合末伤", 1, "中毒 Status 每层在回合结算的伤害"),
        ("target_turn_count_min", "目标最少对战轮数", 6, "平衡性设计预期最少对战回合数"),
        ("target_turn_count_max", "目标最多对战轮数", 10, "平衡性设计预期最多对战回合数")
    ]
    for r_idx, r_data in enumerate(rules_rows, 2):
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_rules.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_id if c_idx == 1 else font_body
            cell.border = thin_border
    auto_fit(ws_rules)

    # [CardPools]
    ws_pools = wb.create_sheet("CardPools")
    headers_pools = [("角色ID", "characterId"), ("卡牌ID", "cardId"), ("构筑张数", "count"), ("启用状态", "enabled")]
    format_sheet_headers(ws_pools, headers_pools, fill_hdr_pools)
    pool_rows = [
        ("fire_warrior", "quick_attack", 4, True), ("fire_warrior", "heavy_strike", 4, True), ("fire_warrior", "small_shield", 2, True), ("fire_warrior", "flame_flask", 2, True),
        ("iron_guardian", "quick_attack", 2, True), ("iron_guardian", "small_shield", 4, True), ("iron_guardian", "large_shield", 3, True), ("iron_guardian", "shield_bash", 3, True),
        ("forest_mage", "quick_attack", 3, True), ("forest_mage", "small_shield", 3, True), ("forest_mage", "small_heal", 3, True), ("forest_mage", "meditation", 3, True),
        ("lightning_assassin", "quick_attack", 4, True), ("lightning_assassin", "pierce", 4, True), ("lightning_assassin", "focus", 2, True), ("lightning_assassin", "poison_blade", 2, True),
        ("ice_mage", "quick_attack", 4, True), ("ice_mage", "small_shield", 3, True), ("ice_mage", "heavy_strike", 3, True), ("ice_mage", "weaken", 2, True)
    ]
    for r_idx, r_data in enumerate(pool_rows, 2):
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_pools.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_id if c_idx in [1, 2] else font_body
            cell.border = thin_border
    auto_fit(ws_pools)

    # [EditorManual]
    ws_man = wb.create_sheet("EditorManual")
    ws_man.views.sheetView[0].showGridLines = True
    ws_man.cell(row=1, column=1, value="📖《宿命对决》游戏制作器完整策划与无代码开发手册").font = font_main_title
    ws_man.cell(row=1, column=1).fill = fill_banner

    manual_text = [
        "一、傻瓜一站式生成器 (QuickCreator) 极速使用指南",
        "1. 打开 CardGame_Balance.xlsx，第一个 Sheet 即为『✨ 傻瓜一站式生成器』。",
        "2. 只要在专区一填写【角色中文名】（如：冰霜法师）及数值，专区二填写【卡牌中文名】，专区三填写【状态中文名】。",
        "3. 双击运行桌面的『🚀一键傻瓜生成并玩游戏.bat』，后端引擎会自动扫描，全自动分派 ID (hero_xxxx, card_xxxx, status_xxxx)，自动关联技能与初始卡组构筑！",
        "4. 编译完成会自动打开浏览器直接体验新角色对战！",
        "",
        "二、无代码效果组合语法 (Effect Types)",
        " - damage:X            -> 造成 X 点物理伤害",
        " - heal:X              -> 恢复 X 点生命",
        " - shield:X            -> 获得 X 点护盾",
        " - draw_card:X         -> 抽取 X 张手牌",
        " - gain_energy:X       -> 获得 X 点能量",
        " - apply_status:NAME:N -> 施加状态 NAME，层数/持续 N",
        " - modify_damage:VAL   -> 下次攻击增伤/减伤",
        "",
        "三、数值平衡建议与规范",
        " - 角色生命值区间建议 25~36 HP",
        " - 普通攻击能量固定 1 费造成 4 伤",
        " - 1 费防御卡建议 4 盾，2 费技能建议 5 伤 + 特效"
    ]
    for idx, t in enumerate(manual_text, 3):
        cell = ws_man.cell(row=idx, column=1, value=t)
        if t.startswith(("一、", "二、", "三、")):
            cell.font = font_section_title
        else:
            cell.font = font_body

    # Save to file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    out_config = os.path.join(project_root, "config", "CardGame_Balance.xlsx")
    out_root = os.path.join(project_root, "CardGame_Balance.xlsx")
    desktop_file = os.path.join(get_desktop_path(), "CardGame_Balance.xlsx")

    wb.save(out_config)
    wb.save(out_root)
    print(f"[BuildExcel] Saved workbook to: {out_config} and {out_root}")

    try:
        wb.save(desktop_file)
        print(f"[BuildExcel] Saved workbook to Desktop: {desktop_file}")
    except Exception as e:
        print(f"[BuildExcel] Note: Could not save to Desktop directly: {e}")

if __name__ == "__main__":
    build_editor_workbook()
