# -*- coding: utf-8 -*-
"""
Unity -> Web content porter for《宿命对决 Destiny Duel》.

Reads the real shipped Unity content (CardData ScriptableObjects under
D:/project/unitycard/Assets/Resources/Cards/{Base,PVE,PVP}/*.asset) and upserts it
into config/CardGame_Balance.xlsx, which remains the single source of truth that
tools/sync_balance.py consumes.

Port decisions (agreed scope):
  * 73 Unity cards become canonical; the 18 live web cards keep their original ids and
    are merged in (no id collision), so no legacy id translation table is needed.
  * Combat rules follow Unity: shield halves (floor) at the end of the owner's turn,
    energy is a hard per-round overwrite, Burn/Poison magnitudes re-based to Unity's.
  * Rarity is stored with Unity's enum names (common/rare/epic/legendary) which the web
    already uses, and displayed as N/R/SR/SSR.
  * The READ mind-game subsystem is deliberately NOT ported. The 9 read cards are folded
    into public-info outcome branches (ConditionType.LastEnemyCardWasAttack/Defense, which
    need no hidden-card access); the one 'Pass' guess becomes a flat blended effect.
    Branch values are kept verbatim; only the description wording changes so the card text
    never claims a mechanic the engine does not have.
  * Unity hard-codes shield/heal/energy/draw to the caster regardless of CardData.target,
    so `target` is normalised to mean "who the *status* lands on"; shield/heal/energy/draw
    always hit the caster. Cards authored target:Enemy while shielding self are rewritten.
  * base_iron_wave advertised 5 shield the engine never granted; the text is corrected
    rather than the number, so no card gains free power.
"""
import os
import re
import sys
import shutil
import openpyxl

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

UNITY_CARDS_DIR = r"D:\project\unitycard\Assets\Resources\Cards"
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
XLSX = os.path.join(PROJECT_ROOT, "config", "CardGame_Balance.xlsx")

# --- Unity enum orders (Assets/Core/GameEnums.cs) ---
CARD_TYPE = {0: "attack", 1: "defense", 2: "heal", 3: "skill", 4: "skill"}  # Special unused
RARITY = {0: "common", 1: "rare", 2: "epic", 3: "legendary"}
POOL_TYPE = {0: "Base", 1: "PVP", 2: "PVE"}
TARGET_TYPE = {0: "enemy", 1: "self", 2: "all_enemies", 3: "all"}
STATUS_TYPE = {
    0: "", 1: "burn", 2: "poison", 3: "freeze",
    4: "vulnerable", 5: "weakness", 6: "strength", 7: "thorns",
}
EFFECT_TYPE = {0: "damage", 1: "shield", 2: "heal", 3: "draw", 4: "energy",
               5: "status", 6: "buff", 7: "none"}
BRANCH_COND = {
    0: "always",
    1: "damage_taken_gt:{v}",
    2: "user_hp_below:{v}",
    3: "target_has_status",
    4: "target_hp_below:{v}",
    5: "target_hp_above:{v}",
    6: "user_hp_above:{v}",
    7: "user_shield_at_least:{v}",
    8: "target_shield_at_least:{v}",
    9: "target_has_no_shield",
    10: "user_energy_at_least:{v}",
    11: "target_hand_at_least:{v}",
    12: "user_hand_at_least:{v}",
    13: "target_has_status",
    14: "target_lacks_status",
    15: "target_last_was_attack",
    16: "target_last_was_defense",
    17: "always",
}
READ_GUESS = {0: None, 1: "attack", 2: "defense", 3: "skill", 4: "pass"}

# A read card predicts the opponent's *next* play. Without the read-mark subsystem that is
# not observable, so each guess is re-anchored to the equivalent piece of public information
# the engine already tracks: what the opponent did on their previous turn.
READ_TO_BRANCH = {
    "attack": "target_last_was_attack",
    "defense": "target_last_was_defense",
    "skill": "target_last_was_skill",
    "pass": "target_last_was_pass",
}

# Rewritten card text for every card whose mechanic was re-anchored, so shipped text never
# promises a mechanic the engine lacks. Keyed by card id.
DESCRIPTION_OVERRIDES = {
    "base_read_intent":
        "【博弈·态势】获得 4 点护盾；若对手上一回合打出的是攻击牌，立即反击造成 20 点伤害，否则再获得 3 点护盾。",
    "pvp_mirror_ward":
        "【博弈·态势】获得 10 点护盾；若对手上一回合打出的是防御或治疗牌，恢复 8 点生命，否则再获得 3 点护盾。",
    "pvp_iron_read":
        "【博弈·态势】获得 8 点护盾；若对手上一回合打出的是防御或治疗牌，额外恢复 10 点生命。",
    "pvp_mirror_duel":
        "【博弈·态势】造成 10 点伤害；若对手上一回合打出的是攻击牌，追加 20 点反击伤害，否则获得 5 点护盾。",
    "pvp_bated_breath":
        "【博弈·态势】获得 5 点护盾；若对手上一回合一张牌都没有打出，抽 2 张牌。",
    "pvp_read_the_blade":
        "【博弈·态势】获得 4 点护盾；若对手上一回合打出的是攻击牌，造成 14 点反击伤害，否则再获得 2 点护盾。",
    "pvp_read_the_incant":
        "【博弈·态势】获得 4 点护盾；若对手上一回合打出的是技能牌，造成 15 点反击伤害，否则再获得 2 点护盾。",
    "pvp_read_the_ward":
        "【博弈·态势】获得 4 点护盾；若对手上一回合打出的是防御或治疗牌，造成 16 点破壁伤害。",
    "pvp_oracle_gambit":
        "【博弈·态势】造成 12 点伤害并恢复 6 点生命；若对手上一回合打出的是防御或治疗牌，追加 24 点伤害，否则获得 4 点护盾。",
    "base_iron_wave":
        "势大力沉的一记横斩，造成 5 点物理伤害。",
}


def decode_unity_string(raw):
    """Unity serialises non-ASCII as \\uXXXX escapes inside a quoted scalar."""
    text = str(raw).strip()
    if text.startswith('"') and text.endswith('"'):
        text = text[1:-1]
    text = re.sub(r'\\u([0-9A-Fa-f]{4})', lambda m: chr(int(m.group(1), 16)), text)
    return text.replace('\\"', '"')


def parse_asset(path):
    with open(path, encoding="utf-8") as fh:
        lines = fh.read().splitlines()

    flat, blocks, cur_block = {}, {}, None
    for line in lines:
        m = re.match(r"^  ([A-Za-z]\w*):(.*)$", line)
        if m:
            key, rest = m.group(1), m.group(2).strip()
            cur_block = None
            if rest == "":
                blocks[key] = {}
                cur_block = key
            elif rest.startswith("- "):
                flat.setdefault(key, []).append(decode_unity_string(rest[2:]))
            else:
                flat[key] = decode_unity_string(rest)
            continue
        m = re.match(r"^    ([A-Za-z]\w*):(.*)$", line)
        if m and cur_block:
            blocks[cur_block][m.group(1)] = decode_unity_string(m.group(2).strip())
    return flat, blocks


def to_int(value, default=0):
    try:
        return int(float(str(value)))
    except (TypeError, ValueError):
        return default


def load_unity_cards():
    cards = []
    for pool_dir in ("Base", "PVE", "PVP"):
        directory = os.path.join(UNITY_CARDS_DIR, pool_dir)
        if not os.path.isdir(directory):
            continue
        for name in sorted(os.listdir(directory)):
            if not name.endswith(".asset"):
                continue
            flat, blocks = parse_asset(os.path.join(directory, name))
            if not flat.get("id"):
                continue
            flat["_blocks"] = blocks
            flat["_poolDir"] = pool_dir
            cards.append(flat)
    return cards


def effect_spec(effect_key, blocks):
    """Render a Unity EffectSpec block into the compact `type:value` token that
    tools/sync_balance.py parses. Status specs carry their stacks: `status:burn:2`."""
    block = blocks.get(effect_key) or {}
    kind = EFFECT_TYPE.get(to_int(block.get("effect"), 7), "none")
    value = to_int(block.get("value"), 0)
    if kind == "none":
        return ""
    if kind == "status":
        status_id = STATUS_TYPE.get(to_int(block.get("status"), 0), "")
        stacks = max(1, to_int(block.get("statusDuration"), 1))
        return "status:%s:%d" % (status_id, stacks)
    if value == 0:
        return ""
    return "%s:%d" % (kind, value)


def convert(card):
    """Unity CardData asset -> a row dict keyed by the xlsx english column names."""
    flat, blocks = card, card["_blocks"]
    cid = flat["id"]
    ctype = CARD_TYPE.get(to_int(flat.get("type"), 0), "attack")
    target = TARGET_TYPE.get(to_int(flat.get("target"), 0), "enemy")
    status_id = STATUS_TYPE.get(to_int(flat.get("statusType"), 0), "")
    status_dur = to_int(flat.get("statusDuration"), 0)

    damage = to_int(flat.get("damage"))
    shield = to_int(flat.get("shield"))
    heal = to_int(flat.get("heal"))
    draw = to_int(flat.get("drawCount"))
    energy = to_int(flat.get("energyChange"))
    hit = max(1, to_int(flat.get("hitCount"), 1))
    self_damage = to_int(flat.get("selfDamage"))
    pool = POOL_TYPE.get(to_int(flat.get("poolType")), card["_poolDir"])

    description = flat.get("description", "")
    condition, then_fx, else_fx = "", "", ""

    if to_int(flat.get("hasReadEffect")) == 1:
        guess = READ_GUESS.get(to_int(flat.get("readGuess")))
        condition = READ_TO_BRANCH.get(guess, "")
        then_fx = effect_spec("readHit", blocks)
        else_fx = effect_spec("readMiss", blocks)

    elif to_int(flat.get("hasOutcomeBranch")) == 1:
        template = BRANCH_COND.get(to_int(flat.get("branchCondition")), "")
        condition = template.format(v=to_int(flat.get("branchConditionValue"), 0)) \
            if "{v}" in template else template
        then_fx = effect_spec("thenEffect", blocks)
        else_fx = effect_spec("elseEffect", blocks)

    if cid in DESCRIPTION_OVERRIDES:
        description = DESCRIPTION_OVERRIDES[cid]

    # shield/heal/energy/draw are caster-bound in the Unity engine regardless of `target`,
    # so `target` only ever selects where a *status* lands.
    if any((shield, heal, energy, draw)) and not status_id:
        target = "self"

    buff_tokens = []
    if to_int(flat.get("hasTriggerEffect")) == 1:
        reaction_kind = EFFECT_TYPE.get(to_int(flat.get("reactionEffect"), 7), "none")
        reaction_value = to_int(flat.get("reactionValue"), 0)
        reaction_token = {"damage": "damage", "shield": "shield", "heal": "heal"}.get(reaction_kind)
        if reaction_token and reaction_value:
            buff_tokens.append("reaction[damage_taken_gt:%d]=>%s:%d" % (
                to_int(flat.get("conditionValue"), 30), reaction_token, reaction_value))

    status_spec = ("status:%s:%d" % (status_id, max(1, status_dur))) if status_id and status_dur else ""

    tags = flat.get("tags") or []
    if isinstance(tags, str):
        tags = [tags]
    tags = [t for t in (str(x).strip() for x in tags) if t]

    return {
        "cardId": cid,
        "cardName": flat.get("cardName", cid),
        "type": ctype,
        "rarity": RARITY.get(to_int(flat.get("rarity")), "common"),
        "cost": to_int(flat.get("cost"), 1),
        "damage": damage,
        "shield": shield,
        "heal": heal,
        "draw": draw,
        "effectType1": "-", "effectVal1": "", "effectType2": "-", "effectVal2": "",
        "statusId": status_id,
        "statusStacks": max(1, status_dur) if status_id else 0,
        "targetType": target,
        "description": description,
        "enabled": True,
        "poolType": pool,
        "upgradeable": 1 if to_int(flat.get("upgradeable")) == 1 else 0,
        "level": 1,
        "hitCount": hit,
        "selfDamage": self_damage,
        "energyChange": energy,
        "statusSpec": status_spec,
        "buffSpec": ",".join(buff_tokens),
        "tags": ",".join(tags),
        "duration": status_dur,
        "condition": condition,
        "thenEffects": then_fx,
        "elseEffects": else_fx,
    }


# ---------------------------------------------------------------- xlsx handling

NEW_CARD_COLUMNS = [
    ("卡池\n(poolType)", "Base"),
    ("可升级\n(upgradeable)", 0),
    ("等级\n(level)", 1),
    ("攻击段数\n(hitCount)", 1),
    ("自伤\n(selfDamage)", 0),
    ("能量变动\n(energyChange)", 0),
    ("附带状态\n(statusSpec)", ""),
    ("特殊机制\n(buffSpec)", ""),
    ("属性标签\n(tags)", ""),
    ("状态持续回合\n(duration)", 0),
    ("分支条件\n(condition)", ""),
    ("分支成功\n(thenEffects)", ""),
    ("分支失败\n(elseEffects)", ""),
]

CARD_FIELDS = ("cardId", "cardName", "type", "rarity", "cost", "damage", "shield", "heal",
               "draw", "effectType1", "effectVal1", "effectType2", "effectVal2", "statusId",
               "statusStacks", "targetType", "description", "enabled")
CARD_EXTRA_FIELDS = ("poolType", "upgradeable", "level", "hitCount", "selfDamage",
                     "energyChange", "statusSpec", "buffSpec", "tags", "duration",
                     "condition", "thenEffects", "elseEffects")

STAGE_HEADERS = [
    "关卡序号\n(stageId)", "关卡代码\n(stageCode)", "关卡名称\n(stageName)",
    "推荐战力\n(recommendedPower)", "敌方首领\n(enemyName)", "敌方生命\n(enemyMaxHp)",
    "首领卡组\n(enemyDeck)", "首通金币\n(firstClearRewardGold)",
    "首通宝石\n(firstClearRewardGems)", "首通奖励卡\n(firstClearRewardCardId)",
    "重复金币\n(repeatRewardGold)", "关卡描述\n(description)",
]

# Boss decks and HP. Unity shipped 1 chapter of 4 stages whose only real stat was enemyMaxHp
# (80/120/160/260) with decks that broke its own deck rules and a Novice AI that had an
# approximate lethal check — the numbers were never validated for winnability.
#
# Re-derived against the ported engine by measuring 14-seed win rates for all five heroes with a
# starter deck: 100% / 90% / 40% / 10%, monotonic, with no hero shut out before the final stage.
# Stage 1-4 is deliberately a wall for an un-upgraded deck (it becomes 100% once PVE cards reach
# Lv.3), which is what makes the gacha-and-upgrade loop the chapter actually rewards.
# Two rules the tuning forced, both worth keeping when editing these:
#   * no thorns-bearing card in a boss deck (base_iron_bastion / pve_juggernaut / pve_thorn_mail) —
#     retaliation interacts with specific player decks strongly enough to zero one hero out;
#   * no finisher card (base_execute_judgment) either, for the same cliff reason.
PVE_STAGES = [
    (1, "1-1", "试炼之始", 100, "草原先锋", 120,
     "base_strike*2,base_cleave*2,base_iron_wave*2,base_twin_strike*2,"
     "base_shield_block*2,base_quick_guard*2,base_pommel_strike*2,base_shrug_it_off*1",
     200, 20, "base_strike", 50,
     "新手试炼。对手只用基础打击与格挡，是学习斩杀线与能量覆盖节奏的一关。"),
    (2, "1-2", "熔岩幼龙", 220, "熔岩幼龙", 150,
     "base_fireball*2,pve_combust*2,base_inflame*2,base_cleave*2,"
     "base_twin_strike*2,base_shield_block*2,base_heavy_strike*2,base_strike*1",
     300, 30, "base_fireball", 80,
     "灼烧开始登场：护盾会被持续烧穿，堆甲拖回合不再可靠。"),
    (3, "1-3", "守卫之壁", 380, "古代魔像", 208,
     "base_iron_defense*2,pve_iron_bark*2,pve_entrench*2,base_heavy_strike*2,"
     "pve_spark_sigil*2,base_shield_block*2,base_quick_guard*2,base_battle_cry*1",
     500, 50, "base_iron_defense", 120,
     "高血量盾战，考验的是输出效率与耐久，而不是爆发。平均要打上七轮以上。"),
    (4, "1-4", "暗影巨龙", 550, "暗影巨龙·阿扎卡", 198,
     "base_fireball*2,pve_spark_sigil*2,base_heavy_strike*2,pve_reaper*2,"
     "base_iron_defense*2,base_divine_heal*2,base_inflame*2,base_strike*1",
     1000, 100, "pve_spark_sigil", 250,
     "章节首领。爆发与治疗兼备，用初始卡组很难撼动它——先靠前三关的奖励去抽卡并强化 PVE 卡牌再来。"),
]

JUNK_CARD_IDS = {"card_0017"}      # unnamed CMS row that leaked into the shipped dataset
JUNK_CHARACTER_IDS = {"hero_0006"}  # 28-HP CMS test hero that leaked into the roster

# Per-hero opening decks. The workbook previously carried 12 cards per hero, which the
# 15-card deck rule rejects; these are 15 cards with at most 2 copies each, and they mix
# the retained legacy web cards with the ported Base pool so both stay relevant.
STARTER_DECKS = [
    ("fire_warrior", [("quick_attack", 2), ("heavy_strike", 2), ("flame_flask", 2),
                      ("dual_slash", 2), ("base_fireball", 2), ("base_inflame", 2),
                      ("base_strike", 2), ("base_execute_judgment", 1)]),
    ("iron_guardian", [("small_shield", 2), ("large_shield", 2), ("base_shield_block", 2),
                       ("base_iron_bastion", 2), ("base_retaliation_shield", 2),
                       ("defensive_stance", 2), ("base_quick_guard", 2),
                       ("base_divine_heal", 1)]),
    ("forest_mage", [("small_heal", 2), ("meditation", 2), ("base_second_wind", 2),
                     ("small_shield", 2), ("base_shrug_it_off", 2), ("base_inflame", 2),
                     ("base_strike", 2), ("focus", 1)]),
    ("lightning_assassin", [("quick_attack", 2), ("pierce", 2), ("dual_slash", 2),
                            ("base_strike", 2), ("base_pommel_strike", 2),
                            ("energy_surge", 2), ("base_cleave", 2), ("weaken", 1)]),
    ("ice_mage", [("ice_spike", 2), ("weaken", 2), ("base_battle_cry", 2),
                  ("base_fireball", 2), ("base_quick_guard", 2), ("base_iron_defense", 2),
                  ("base_shield_block", 2), ("poison_blade", 1)]),
]

# Status effects after the Unity rule alignment.
STATUS_ROWS = [
    ("burn", "灼烧", "debuff", "turn_end", 2, 0, 0, 0, 2, 3, "stack_duration_refresh",
     "每层在回合末造成 2 点物理伤害（可被护盾吸收、受易伤放大），持续 2 回合，最多 3 层。",
     {"damageKind": "physical"}),
    ("poison", "中毒", "debuff", "turn_end", 2, 0, 0, 0, 2, 6, "stack_duration_refresh",
     "每层在回合末造成 2 点真实伤害（无视护盾与易伤），持续 2 回合，最多 6 层。",
     {"damageKind": "true"}),
    ("freeze", "冰冻", "debuff", "turn_start", 0, 0, 0, 0, 1, 1, "refresh_only",
     "无法行动：不能普通攻击、不能施放技能，且无法打出攻击牌与技能牌。",
     {"blocksAttackAndSkill": 1}),
    ("weakness", "虚弱", "debuff", "on_attack", 0, 0, -2, 0, 1, 1, "refresh_only",
     "造成的伤害降低 25%（最少仍造成 1 点）。",
     {"damageDealtMultiplier": 0.75}),
    ("attack_buff", "蓄力", "buff", "next_hit", 0, 0, 2, 0, 1, 3, "consume_on_hit",
     "下一次攻击伤害 +2 点。", {"damageDealtFlat": 2}),
    ("damage_reduction", "坚守", "buff", "on_hit", 0, 0, 0, -0.4, 1, 1, "refresh_only",
     "本回合受到的伤害降低 40%。", {"damageTakenMultiplier": 0.6}),
    ("flat_shield_wall", "钢壁", "buff", "on_hit", 0, 0, 0, -1, 1, 1, "consume_on_hit",
     "下一次受到的伤害固定减少 1 点。", {"damageTakenFlat": -1}),
    ("vulnerable", "易伤", "debuff", "on_hit", 0, 0, 0, 0.5, 2, 1, "refresh_only",
     "受到的所有非真实伤害提高 50%。", {"damageTakenMultiplier": 1.5}),
    ("strength", "力量", "buff", "on_attack", 0, 0, 3, 0, 2, 1, "refresh_only",
     "每次打出卡牌的伤害 +3 点（多段攻击每段都加）。", {"damageDealtFlat": 3}),
    ("thorns", "荆棘", "buff", "on_hit", 0, 0, 0, 0, 2, 1, "refresh_only",
     "受到攻击牌伤害时反弹 3 点真实伤害，多段攻击每段各反弹一次。", {"thorns": 3}),
]

# Hero HP brought into a narrow band. The roster previously spanned 85-120 HP, which dominated
# the PVE difficulty curve far more than any stage parameter: the weakest hero could not win
# stage 2 at any boss HP while the strongest won stage 4. Identity now comes from the passive
# and the opening deck, with endurance differences kept but no longer decisive.
HERO_HP = {
    "fire_warrior": 96,
    "iron_guardian": 108,
    "forest_mage": 100,
    "lightning_assassin": 96,
    "ice_mage": 104,
}

GAME_RULE_UPDATES = {
    "initial_hand_size": (4, "开局双方各自抽取的手牌数量"),
    "max_hand_size": (10, "手牌上限；超出上限的抽牌直接进入弃牌堆烧掉"),
    "turn_draw_count": (2, "第 2 轮起每回合抽牌数量"),
    "start_hand_count": (4, "对局开始时双方玩家抽取的初始手牌数量"),
    "hand_card_limit": (10, "每名玩家手牌张数上限"),
    "energy_per_turn": (3, "第 2~3 轮每回合的能量覆盖值"),
    "energy_ladder_round_4": (4, "第 4~7 轮每回合能量覆盖值"),
    "energy_ladder_round_8": (5, "第 8 轮起每回合能量覆盖值"),
    "energy_refill_mode": (1, "1 表示回合初能量为硬覆盖，未花费的能量不结转到下回合"),
    "shield_decay_ratio": (0.5, "回合末未打破的护盾按比例向下取整衰减"),
    "max_shield": (50, "护盾叠加上限"),
    "max_energy": (10, "能量上限；回合内通过卡牌可超过能量阶梯但受此上限约束"),
    "initial_energy": (4, "首回合能量（高于第 1~3 轮的覆盖值）"),
    "rising_fury_start_round": (9, "从该轮开始每轮伤害递增"),
    "rising_fury_damage_step": (1, "递增步长"),
    "max_burst_damage_limit": (50, "单次伤害上限"),
    "max_heal_per_turn": (30, "单回合治疗上限"),
    "burn_damage_per_turn": (2, "灼烧每层回合末伤害"),
    "poison_damage_per_turn": (2, "中毒每层回合末真实伤害"),
    "pve_max_stage": (4, "当前章节关卡总数"),
}


def read_header_map(ws, header_row_idx=1):
    mapping = {}
    for cell in ws[header_row_idx]:
        if cell.value:
            m = re.search(r"\((\w+)\)", str(cell.value))
            key = m.group(1) if m else re.sub(r"\s", "", str(cell.value))
            mapping[key] = cell.column
    return mapping


def ensure_columns(ws, header_row_idx, new_columns):
    existing = read_header_map(ws, header_row_idx)
    next_col = (max(existing.values()) if existing else 0) + 1
    for header, _default in new_columns:
        key = re.search(r"\((\w+)\)", header).group(1)
        if key in existing:
            continue
        ws.cell(row=header_row_idx, column=next_col, value=header)
        next_col += 1
    return read_header_map(ws, header_row_idx)


def write_card_row(ws, headers, row, card):
    for field in CARD_FIELDS + CARD_EXTRA_FIELDS:
        col = headers.get(field)
        if col:
            ws.cell(row=row, column=col, value=card[field])


def main():
    if not os.path.isfile(XLSX):
        print("[ERROR] 未找到数值表: %s" % XLSX)
        return 1

    shutil.copy2(XLSX, XLSX + ".bak")

    assets = load_unity_cards()
    if not assets:
        # One-time migration: the workbook already carries the 73 ported cards, so a missing Unity
        # source tree is fine for day-to-day work. Re-porting only matters if this script itself
        # changes and the .asset files still exist to be re-read.
        print("[跳过] 未找到 Unity 源目录 %s" % UNITY_CARDS_DIR)
        print("       内容已固化在 config/CardGame_Balance.xlsx，日常改数值请直接运行：")
        print("         python tools/sync_balance.py")
        return 0
    if len(assets) < 70:
        print("[ERROR] 仅解析到 %d 张 Unity 卡牌，疑似源目录不完整，中止写入。" % len(assets))
        return 1

    ported = {c["cardId"]: c for c in (convert(a) for a in assets)}
    print("[源数据] 解析 Unity 卡牌 %d 张（Base/PVE/PVP = %d/%d/%d）" % (
        len(ported),
        sum(1 for c in ported.values() if c["poolType"] == "Base"),
        sum(1 for c in ported.values() if c["poolType"] == "PVE"),
        sum(1 for c in ported.values() if c["poolType"] == "PVP")))
    print("[机制] 分支/态势判定 %d 张，延迟反应触发 %d 张，多段攻击 %d 张，带自伤 %d 张" % (
        sum(1 for c in ported.values() if c["condition"]),
        sum(1 for c in ported.values() if "reaction[" in c["buffSpec"]),
        sum(1 for c in ported.values() if c["hitCount"] > 1),
        sum(1 for c in ported.values() if c["selfDamage"] > 0)))

    wb = openpyxl.load_workbook(XLSX)
    ws = wb["Cards"]
    headers = ensure_columns(ws, 1, NEW_CARD_COLUMNS)

    junk_ids = JUNK_CARD_IDS          # unnamed CMS row that leaked into the shipped set
    overwritten, kept, dropped = 0, 0, 0
    for row in range(2, ws.max_row + 1):
        cid = str(ws.cell(row=row, column=headers["cardId"]).value or "").strip()
        if not cid:
            continue
        if cid in junk_ids:
            for col in range(1, ws.max_column + 1):
                ws.cell(row=row, column=col).value = None
            dropped += 1
            continue
        if cid in ported:
            write_card_row(ws, headers, row, ported.pop(cid))
            overwritten += 1
        else:
            defaults = {"poolType": "Base", "upgradeable": 0, "level": 1, "hitCount": 1,
                        "selfDamage": 0, "energyChange": 0, "statusSpec": "", "buffSpec": "",
                        "tags": "", "condition": "", "thenEffects": "", "elseEffects": "",
                        "duration": 0}
            for key, value in defaults.items():
                col = headers.get(key)
                if col and ws.cell(row=row, column=col).value in (None, ""):
                    ws.cell(row=row, column=col, value=value)
            kept += 1

    row_cursor = ws.max_row + 1
    for card in sorted(ported.values(), key=lambda c: (c["poolType"], c["cost"], c["cardId"])):
        write_card_row(ws, headers, row_cursor, card)
        row_cursor += 1

    print("[Cards] 旧 18 张保留 %d 张、被同名移植卡覆盖 %d 张、清除脏数据 %d 张；新增移植卡 %d 张" % (
        kept, overwritten, dropped, len(ported)))

    # --- PveStages -------------------------------------------------------------
    if "PveStages" in wb.sheetnames:
        del wb["PveStages"]
    stages_ws = wb.create_sheet("PveStages")
    for idx, header in enumerate(STAGE_HEADERS, start=1):
        stages_ws.cell(row=1, column=idx, value=header)
    for r_idx, stage in enumerate(PVE_STAGES, start=2):
        for c_idx, value in enumerate(stage, start=1):
            stages_ws.cell(row=r_idx, column=c_idx, value=value)
    print("[PveStages] 写入章节关卡 %d 关（首领卡组已全部改为合法 15 张 / 单卡不超 2 份）" % len(PVE_STAGES))

    # --- StatusEffects -----------------------------------------------------------
    sus = wb["StatusEffects"]
    sus_headers = ensure_columns(sus, 1, [
        ("伤害类型\n(damageKind)", ""), ("受伤乘数\n(damageTakenMultiplier)", ""),
        ("伤害乘数\n(damageDealtMultiplier)", ""), ("固定受伤修正\n(damageTakenFlat)", ""),
        ("固定伤害修正\n(damageDealtFlat)", ""), ("荆棘反弹\n(thorns)", ""),
        ("封锁攻防牌\n(blocksAttackAndSkill)", "")])
    base_keys = ("statusId", "statusName", "category", "triggerTiming", "damagePerTurn",
                 "healPerTurn", "damageModifier", "damageTakenModifier", "duration",
                 "maxStacks", "stackRule", "description")
    seen = set()
    for row in range(2, sus.max_row + 1):
        sid = str(sus.cell(row=row, column=sus_headers["statusId"]).value or "").strip()
        match = next((s for s in STATUS_ROWS if s[0] == sid), None)
        if not match:
            continue
        seen.add(sid)
        values = dict(zip(base_keys, match[:12]))
        values.update(match[12])
        for key, value in values.items():
            col = sus_headers.get(key)
            if col:
                sus.cell(row=row, column=col, value=value)
    for status in STATUS_ROWS:
        if status[0] in seen:
            continue
        row = sus.max_row + 1
        values = dict(zip(base_keys, status[:12]))
        values.update(status[12])
        for key, value in values.items():
            col = sus_headers.get(key)
            if col:
                sus.cell(row=row, column=col, value=value)
    print("[StatusEffects] 新增/覆盖状态效果 %d 种（含易伤、力量、荆棘）" % len(STATUS_ROWS))

    # --- GameRules ---------------------------------------------------------------
    gws = wb["GameRules"]
    gh = read_header_map(gws)
    existing = {}
    for row in range(2, gws.max_row + 1):
        rid = str(gws.cell(row=row, column=gh["ruleId"]).value or "").strip()
        if rid:
            existing[rid] = row
    added = 0
    for rid, (value, desc) in GAME_RULE_UPDATES.items():
        row = existing.get(rid)
        if row is None:
            row = gws.max_row + 1
            added += 1
        gws.cell(row=row, column=gh["ruleId"], value=rid)
        if "ruleName" in gh:
            gws.cell(row=row, column=gh["ruleName"], value=rid)
        gws.cell(row=row, column=gh["value"], value=value)
        if "description" in gh:
            gws.cell(row=row, column=gh["description"], value=desc)
    print("[GameRules] 规则 %d 条（新增 %d 条；含修正引擎实际读取但配置缺失的 6 个失效键）" % (
        len(GAME_RULE_UPDATES), added))

    # --- Characters: drop the CMS junk rows ------------------------------------
    cws = wb["Characters"]
    ch = read_header_map(cws)
    removed_chars = 0
    for row in range(cws.max_row, 1, -1):
        cid = str(cws.cell(row=row, column=ch["characterId"]).value or "").strip()
        if cid in JUNK_CHARACTER_IDS:
            for col in range(1, cws.max_column + 1):
                cws.cell(row=row, column=col).value = None
            removed_chars += 1
    if removed_chars:
        print("[Characters] 清除后台误建英雄 %d 位" % removed_chars)

    # Balance the roster's endurance so stage difficulty, not hero choice, drives the PVE curve.
    tuned = 0
    for row in range(2, cws.max_row + 1):
        cid = str(cws.cell(row=row, column=ch["characterId"]).value or "").strip()
        if cid in HERO_HP and "maxHp" in ch:
            cws.cell(row=row, column=ch["maxHp"], value=HERO_HP[cid])
            tuned += 1
    print("[Characters] 英雄生命收拢到 %s 区间（调整 %d 位）" % (
        "、".join(str(v) for v in sorted(HERO_HP.values())), tuned))

    # --- CardPools: rebuild 15-card opening decks -------------------------------
    pws = wb["CardPools"]
    ph = read_header_map(pws)
    known_ids = {str(ws.cell(row=r, column=headers["cardId"]).value or "").strip()
                 for r in range(2, ws.max_row + 1)} | {"ice_spike"}
    for row in range(pws.max_row, 1, -1):
        for col in range(1, pws.max_column + 1):
            pws.cell(row=row, column=col).value = None
    prow = 2
    for hero, deck in STARTER_DECKS:
        total = sum(count for _, count in deck)
        if total != 15:
            print("[ERROR] %s 初始卡组为 %d 张，不符合 15 张规则" % (hero, total))
            return 1
        for card_id, count in deck:
            if card_id not in known_ids:
                print("[ERROR] %s 初始卡组引用了不存在的卡牌 %s" % (hero, card_id))
                return 1
            pws.cell(row=prow, column=ph["characterId"], value=hero)
            pws.cell(row=prow, column=ph["cardId"], value=card_id)
            pws.cell(row=prow, column=ph["count"], value=count)
            if "enabled" in ph:
                pws.cell(row=prow, column=ph["enabled"], value=True)
            prow += 1
    print("[CardPools] 重写 %d 位英雄的初始卡组，全部为合法 15 张（原为 12 张）" % len(STARTER_DECKS))

    wb.save(XLSX)
    print("[完成] 已写入 %s（原表备份为 .bak）" % XLSX)
    print("[下一步] python tools/sync_balance.py 重新生成 data/game_config.js")
    return 0


if __name__ == "__main__":
    sys.exit(main())
