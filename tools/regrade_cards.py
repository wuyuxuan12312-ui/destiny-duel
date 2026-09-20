# -*- coding: utf-8 -*-
"""
卡牌战力评分与重新分级工具

用法：
    python tools/regrade_cards.py --dry-run     # 只预览，不写入
    python tools/regrade_cards.py               # 写入 config/CardGame_Balance.xlsx
    python tools/regrade_cards.py --keep-counts # 不保留现有档位人数，改用固定比例

评分依据 **CardEffectEngine.execute() 实际读取的平铺字段**：
    damage × hitCount / shield / heal / draw / energy / status / self_damage
    + then_effects|else_effects（分支，按 50/50 期望）
    + buff（如 shield_penetration）
注意 card.effects 数组引擎**不读**（只有分支走 executeSpecs），所以不参与评分。
这一点很重要：老卡把效果写在 effects/effectId 里，引擎读不到，评分会如实反映成"弱卡"。

评分公式（基线：1 点能量 ≈ 6 点价值）：
    战力 value = Σ 各效果价值
    超额 over  = value − cost × 6      ← 排序用这个：比"同费的公平卡"强多少
    效率 eff   = value / max(1, cost)

分级默认保留现有各档人数（经济结构不变），只让标签真正反映强度。

写回后需要跑 python tools/sync_balance.py 才会生效到游戏。
"""
import argparse
import json
import os
import shutil
import sys

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, "config", "CardGame_Balance.xlsx")
CARDS_JSON = os.path.join(ROOT, "client", "data", "generated", "cards.json")

# ---- 价值权重 ----
W_DAMAGE, W_SHIELD, W_HEAL, W_DRAW, W_ENERGY = 1.0, 0.9, 0.85, 6.0, 7.0
W_SELF_DAMAGE, W_BUFF_FLAT = -1.2, 3.0
BASELINE_PER_COST = 6.0

STATUS_VALUE = {
    "burn": 2.5, "poison": 2.8, "freeze": 5.0, "vulnerable": 3.0,
    "weakness": 2.6, "weak": 2.6, "strength": 4.0, "thorns": 2.2,
    "regeneration": 3.0, "fortify": 3.0, "dodge": 3.5, "reflect": 3.0,
}

TIER_ORDER = ["common", "rare", "epic", "legendary"]
DEFAULT_RATIO = {"legendary": 0.08, "epic": 0.20, "rare": 0.35}   # 其余 common


def load_cards():
    with open(CARDS_JSON, encoding="utf-8") as f:
        raw = f.read()
    # 生成文件顶部带 // 注释
    raw = "\n".join(l for l in raw.splitlines() if not l.lstrip().startswith("//"))
    return json.loads(raw)


def status_value(spec):
    if not spec:
        return 0.0
    name, _, n = str(spec).partition(":")
    return STATUS_VALUE.get(name.strip().lower(), 2.0) * (int(n) if n.isdigit() else 1)


def spec_value(e):
    if not isinstance(e, dict) or not e.get("type"):
        return 0.0
    t = str(e["type"]).lower()

    def num(x):
        try:
            return float(x)
        except (TypeError, ValueError):
            return 0.0

    if t == "damage":
        return num(e.get("value")) * W_DAMAGE
    if t == "shield":
        return num(e.get("value")) * W_SHIELD
    if t == "heal":
        return num(e.get("value")) * W_HEAL
    if t in ("draw", "draw_card"):
        return num(e.get("count", e.get("value"))) * W_DRAW
    if t in ("energy", "gain_energy"):
        return num(e.get("value", e.get("count"))) * W_ENERGY
    if t == "apply_status":
        return status_value("%s:%s" % (e.get("status"), e.get("stacks") or 1))
    return 0.0


def card_value(c):
    hits = max(1, int(c.get("hit_count") or c.get("hitCount") or 1))
    v = 0.0
    v += float(c.get("damage") or 0) * hits * W_DAMAGE
    v += float(c.get("shield") or 0) * W_SHIELD
    v += float(c.get("heal") or 0) * W_HEAL
    v += float(c.get("draw", c.get("drawCount")) or 0) * W_DRAW
    v += float(c.get("energy", c.get("energyChange")) or 0) * W_ENERGY
    v += status_value(c.get("status") or c.get("statusSpec"))
    v += float(c.get("self_damage", c.get("selfDamage")) or 0) * W_SELF_DAMAGE
    if c.get("buff"):
        v += W_BUFF_FLAT
    t = sum(spec_value(e) for e in (c.get("then_effects") or []))
    f = sum(spec_value(e) for e in (c.get("else_effects") or []))
    if t or f:
        v += 0.5 * t + 0.5 * f
    return max(0.0, v)


def build_ranking(cards, keep_counts):
    rows = []
    for c in cards.values():
        cid = c.get("cardId")
        if not cid:
            continue
        cost = int(c.get("cost") or 0)
        v = card_value(c)
        rows.append({
            "id": cid,
            "name": c.get("cardName"),
            "pool": str(c.get("pool_type") or c.get("poolType") or "").upper(),
            "cost": cost,
            "old": str(c.get("rarity") or "common").lower(),
            "value": round(v, 1),
            "over": round(v - cost * BASELINE_PER_COST, 1),
            "eff": round(v / max(1, cost), 2),
        })
    rows.sort(key=lambda r: (-r["over"], -r["eff"]))

    n = len(rows)
    if keep_counts:
        sizes = {t: sum(1 for r in rows if r["old"] == t) for t in TIER_ORDER}
        sizes["common"] = n - sizes["legendary"] - sizes["epic"] - sizes["rare"]
    else:
        sizes = {
            "legendary": round(n * DEFAULT_RATIO["legendary"]),
            "epic": round(n * DEFAULT_RATIO["epic"]),
            "rare": round(n * DEFAULT_RATIO["rare"]),
        }
        sizes["common"] = n - sizes["legendary"] - sizes["epic"] - sizes["rare"]

    i = 0
    for tier in ["legendary", "epic", "rare", "common"]:
        for _ in range(sizes[tier]):
            if i >= n:
                break
            rows[i]["next"] = tier
            i += 1
    return rows, sizes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="只预览，不写入 Excel")
    ap.add_argument("--keep-counts", action="store_true",
                    help="保留现有各档人数（一次性用；读的是当前稀有度，连跑会来回抖）")
    args = ap.parse_args()

    cards = load_cards()
    # 默认按固定比例切档：不依赖"当前稀有度"，因此幂等，连跑两次结果一致。
    # --keep-counts 读的是当前档位人数，只适合第一次从旧数据迁移时用。
    rows, sizes = build_ranking(cards, keep_counts=args.keep_counts)

    print("目标档位人数: " + "  ".join("%s=%d" % (t, sizes[t]) for t in ["legendary", "epic", "rare", "common"]))
    print()

    cur = None
    for idx, r in enumerate(rows, 1):
        if r["next"] != cur:
            cur = r["next"]
            print("  ── %s (%d 张) ──" % (cur.upper(), sizes[cur]))
        moved = "" if r["old"] == r["next"] else "  ⟵ 原 %s" % r["old"]
        print("   %2d. %-24s %-5s %d费  战力%5s  超额%6s%s" %
              (idx, r["id"], r["pool"], r["cost"], r["value"], r["over"], moved))

    changed = [r for r in rows if r["old"] != r["next"]]
    print("\n改档 %d / %d 张（升级 %d，降级 %d）" % (
        len(changed), len(rows),
        sum(1 for r in changed if TIER_ORDER.index(r["next"]) > TIER_ORDER.index(r["old"])),
        sum(1 for r in changed if TIER_ORDER.index(r["next"]) < TIER_ORDER.index(r["old"]))))

    if args.dry_run:
        print("\n[dry-run] 未写入。去掉 --dry-run 才会写回 Excel。")
        return

    rarity_map = {r["id"]: r["next"] for r in rows}

    backup = os.path.join(os.environ.get("TEMP", "."), "CardGame_Balance.before_regrade.xlsx")
    shutil.copy2(XLSX, backup)
    print("\n[备份] " + backup)

    wb = openpyxl.load_workbook(XLSX)
    ws = wb["Cards"]
    hdr = [str(c.value) if c.value else "" for c in ws[1]]
    col_id = next(i for i, h in enumerate(hdr, 1) if "cardId" in h)
    col_rar = next(i for i, h in enumerate(hdr, 1) if "rarity" in h)

    written = 0
    for r in range(2, ws.max_row + 1):
        cid = ws.cell(r, col_id).value
        if not cid:
            continue
        cid = str(cid).strip()
        if cid in rarity_map:
            ws.cell(r, col_rar).value = rarity_map[cid]
            written += 1

    wb.save(XLSX)
    print("[完成] 已写回 %d 张到 %s" % (written, XLSX))
    print("[下一步] python tools/sync_balance.py")


if __name__ == "__main__":
    main()
