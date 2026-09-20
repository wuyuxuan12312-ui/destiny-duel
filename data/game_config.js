// Auto-generated from CardGame_Balance.xlsx by tools/sync_balance.py
(function(root) {
    root.GAME_CONFIG = {
  "gameRules": {
    "hand_card_limit": {
      "ruleId": "hand_card_limit",
      "ruleName": "hand_card_limit",
      "value": 10,
      "unit": "",
      "description": "每名玩家手牌张数上限"
    },
    "start_hand_count": {
      "ruleId": "start_hand_count",
      "ruleName": "start_hand_count",
      "value": 4,
      "unit": "",
      "description": "对局开始时双方玩家抽取的初始手牌数量"
    },
    "energy_per_turn": {
      "ruleId": "energy_per_turn",
      "ruleName": "energy_per_turn",
      "value": 3,
      "unit": "",
      "description": "第 2~3 轮每回合的能量覆盖值"
    },
    "max_shield_cap": {
      "ruleId": "max_shield_cap",
      "ruleName": "单体护盾上限",
      "value": 50,
      "unit": "",
      "description": "角色可重叠积累的最大护盾绝对值上限"
    },
    "max_heal_per_turn": {
      "ruleId": "max_heal_per_turn",
      "ruleName": "max_heal_per_turn",
      "value": 30,
      "unit": "",
      "description": "单回合治疗上限"
    },
    "normal_attack_cost": {
      "ruleId": "normal_attack_cost",
      "ruleName": "普通攻击消耗能量",
      "value": 0,
      "unit": "",
      "description": "进行一次基础普通攻击消耗的能量"
    },
    "normal_attack_damage": {
      "ruleId": "normal_attack_damage",
      "ruleName": "普通攻击伤害",
      "value": 4,
      "unit": "",
      "description": "基础普通攻击造成的固定物理伤害"
    },
    "crit_chance": {
      "ruleId": "crit_chance",
      "ruleName": "刺客暴击概率",
      "value": 0.2,
      "unit": "",
      "description": "雷电刺客普通攻击触发 2 倍暴击的百分比概率"
    },
    "tank_damage_reduction": {
      "ruleId": "tank_damage_reduction",
      "ruleName": "坦克减伤常数",
      "value": 3,
      "unit": "",
      "description": "钢铁守卫被动每次受击固定扣减的伤害数值"
    },
    "burn_damage_per_turn": {
      "ruleId": "burn_damage_per_turn",
      "ruleName": "burn_damage_per_turn",
      "value": 2,
      "unit": "",
      "description": "灼烧每层回合末伤害"
    },
    "poison_damage_per_turn": {
      "ruleId": "poison_damage_per_turn",
      "ruleName": "poison_damage_per_turn",
      "value": 2,
      "unit": "",
      "description": "中毒每层回合末真实伤害"
    },
    "target_turn_count_min": {
      "ruleId": "target_turn_count_min",
      "ruleName": "目标最少对战轮数",
      "value": 6,
      "unit": "",
      "description": "平衡性设计预期最少对战回合数"
    },
    "target_turn_count_max": {
      "ruleId": "target_turn_count_max",
      "ruleName": "目标最多对战轮数",
      "value": 10,
      "unit": "",
      "description": "平衡性设计预期最多对战回合数"
    },
    "max_energy": {
      "ruleId": "max_energy",
      "ruleName": "max_energy",
      "value": 10,
      "unit": "",
      "description": "能量上限；回合内通过卡牌可超过能量阶梯但受此上限约束"
    },
    "initial_energy": {
      "ruleId": "initial_energy",
      "ruleName": "initial_energy",
      "value": 4,
      "unit": "",
      "description": "首回合能量（高于第 1~3 轮的覆盖值）"
    },
    "nature_heal_amount": {
      "ruleId": "nature_heal_amount",
      "ruleName": "nature_heal_amount",
      "value": 5,
      "unit": "",
      "description": "Updated rule nature_heal_amount"
    },
    "max_burst_damage_limit": {
      "ruleId": "max_burst_damage_limit",
      "ruleName": "max_burst_damage_limit",
      "value": 50,
      "unit": "",
      "description": "单次伤害上限"
    },
    "initial_hand_size": {
      "ruleId": "initial_hand_size",
      "ruleName": "initial_hand_size",
      "value": 4,
      "unit": "",
      "description": "开局双方各自抽取的手牌数量"
    },
    "max_hand_size": {
      "ruleId": "max_hand_size",
      "ruleName": "max_hand_size",
      "value": 10,
      "unit": "",
      "description": "手牌上限；超出上限的抽牌直接进入弃牌堆烧掉"
    },
    "turn_draw_count": {
      "ruleId": "turn_draw_count",
      "ruleName": "turn_draw_count",
      "value": 1,
      "unit": "",
      "description": "第 2 轮起每回合抽牌数量"
    },
    "energy_ladder_round_4": {
      "ruleId": "energy_ladder_round_4",
      "ruleName": "energy_ladder_round_4",
      "value": 4,
      "unit": "",
      "description": "第 4~7 轮每回合能量覆盖值"
    },
    "energy_ladder_round_8": {
      "ruleId": "energy_ladder_round_8",
      "ruleName": "energy_ladder_round_8",
      "value": 5,
      "unit": "",
      "description": "第 8 轮起每回合能量覆盖值"
    },
    "energy_refill_mode": {
      "ruleId": "energy_refill_mode",
      "ruleName": "energy_refill_mode",
      "value": 1,
      "unit": "",
      "description": "1 表示回合初能量为硬覆盖，未花费的能量不结转到下回合"
    },
    "shield_decay_ratio": {
      "ruleId": "shield_decay_ratio",
      "ruleName": "shield_decay_ratio",
      "value": 0.5,
      "unit": "",
      "description": "回合末未打破的护盾按比例向下取整衰减"
    },
    "max_shield": {
      "ruleId": "max_shield",
      "ruleName": "max_shield",
      "value": 50,
      "unit": "",
      "description": "护盾叠加上限"
    },
    "rising_fury_start_round": {
      "ruleId": "rising_fury_start_round",
      "ruleName": "rising_fury_start_round",
      "value": 9,
      "unit": "",
      "description": "从该轮开始每轮伤害递增"
    },
    "rising_fury_damage_step": {
      "ruleId": "rising_fury_damage_step",
      "ruleName": "rising_fury_damage_step",
      "value": 1,
      "unit": "",
      "description": "递增步长"
    },
    "pve_max_stage": {
      "ruleId": "pve_max_stage",
      "ruleName": "pve_max_stage",
      "value": 4,
      "unit": "",
      "description": "当前章节关卡总数"
    }
  },
  "characters": {
    "fire_warrior": {
      "characterId": "fire_warrior",
      "characterName": "烈焰剑士",
      "role": "高攻击 / 爆发输出",
      "maxHp": 96,
      "baseAttack": 12,
      "startingEnergy": 4,
      "maxEnergy": 10,
      "passiveId": "fire_warrior_passive",
      "skillId": "fire_warrior_skill",
      "damageBonus": 1.0,
      "healBonus": 0.0,
      "shieldBonus": 0.0,
      "modifiers": {
        "damageBonus": 1.0,
        "healBonus": 0.0,
        "shieldBonus": 0.0
      },
      "description": "拥有最高的初始常态伤害与技能斩杀力，能用灼烧持续折磨对手。",
      "enabled": true
    },
    "iron_guardian": {
      "characterId": "iron_guardian",
      "characterName": "钢铁守卫",
      "role": "防御 / 反制坚壁",
      "maxHp": 108,
      "baseAttack": 8,
      "startingEnergy": 4,
      "maxEnergy": 10,
      "passiveId": "iron_guardian_passive",
      "skillId": "iron_guardian_skill",
      "damageBonus": 0.0,
      "healBonus": 0.0,
      "shieldBonus": 1.0,
      "modifiers": {
        "damageBonus": 0.0,
        "healBonus": 0.0,
        "shieldBonus": 1.0
      },
      "description": "拥有全英雄最高 HP 与减伤被动，凭坚壁化解爆发。",
      "enabled": true
    },
    "forest_mage": {
      "characterId": "forest_mage",
      "characterName": "森林术士",
      "role": "治疗 / 消耗续航",
      "maxHp": 100,
      "baseAttack": 10,
      "startingEnergy": 4,
      "maxEnergy": 10,
      "passiveId": "forest_mage_passive",
      "skillId": "forest_mage_skill",
      "damageBonus": 0.0,
      "healBonus": 1.0,
      "shieldBonus": 0.0,
      "modifiers": {
        "damageBonus": 0.0,
        "healBonus": 1.0,
        "shieldBonus": 0.0
      },
      "description": "强大的自然恢复力，靠持久战拖垮对手。",
      "enabled": true
    },
    "lightning_assassin": {
      "characterId": "lightning_assassin",
      "characterName": "雷电刺客",
      "role": "敏捷 / 暴击高险",
      "maxHp": 96,
      "baseAttack": 10,
      "startingEnergy": 4,
      "maxEnergy": 10,
      "passiveId": "lightning_assassin_passive",
      "skillId": "lightning_assassin_skill",
      "damageBonus": 1.0,
      "healBonus": 0.0,
      "shieldBonus": 0.0,
      "modifiers": {
        "damageBonus": 1.0,
        "healBonus": 0.0,
        "shieldBonus": 0.0
      },
      "description": "爆发刺客，普攻暴击与闪电突袭瞬发打出超高伤。",
      "enabled": true
    },
    "ice_mage": {
      "characterId": "ice_mage",
      "characterName": "冰霜法师",
      "role": "控制 / 极寒冰封",
      "maxHp": 104,
      "baseAttack": 9,
      "startingEnergy": 4,
      "maxEnergy": 10,
      "passiveId": "ice_mage_passive",
      "skillId": "ice_mage_skill",
      "damageBonus": 0.0,
      "healBonus": 0.0,
      "shieldBonus": 1.0,
      "modifiers": {
        "damageBonus": 0.0,
        "healBonus": 0.0,
        "shieldBonus": 1.0
      },
      "description": "技能能冻结敌人使其在下回合无法行动。",
      "enabled": true
    }
  },
  "heroes": {
    "fire_warrior": {
      "characterId": "fire_warrior",
      "characterName": "烈焰剑士",
      "role": "高攻击 / 爆发输出",
      "maxHp": 96,
      "baseAttack": 12,
      "startingEnergy": 4,
      "maxEnergy": 10,
      "passiveId": "fire_warrior_passive",
      "skillId": "fire_warrior_skill",
      "damageBonus": 1.0,
      "healBonus": 0.0,
      "shieldBonus": 0.0,
      "modifiers": {
        "damageBonus": 1.0,
        "healBonus": 0.0,
        "shieldBonus": 0.0
      },
      "description": "拥有最高的初始常态伤害与技能斩杀力，能用灼烧持续折磨对手。",
      "enabled": true
    },
    "iron_guardian": {
      "characterId": "iron_guardian",
      "characterName": "钢铁守卫",
      "role": "防御 / 反制坚壁",
      "maxHp": 108,
      "baseAttack": 8,
      "startingEnergy": 4,
      "maxEnergy": 10,
      "passiveId": "iron_guardian_passive",
      "skillId": "iron_guardian_skill",
      "damageBonus": 0.0,
      "healBonus": 0.0,
      "shieldBonus": 1.0,
      "modifiers": {
        "damageBonus": 0.0,
        "healBonus": 0.0,
        "shieldBonus": 1.0
      },
      "description": "拥有全英雄最高 HP 与减伤被动，凭坚壁化解爆发。",
      "enabled": true
    },
    "forest_mage": {
      "characterId": "forest_mage",
      "characterName": "森林术士",
      "role": "治疗 / 消耗续航",
      "maxHp": 100,
      "baseAttack": 10,
      "startingEnergy": 4,
      "maxEnergy": 10,
      "passiveId": "forest_mage_passive",
      "skillId": "forest_mage_skill",
      "damageBonus": 0.0,
      "healBonus": 1.0,
      "shieldBonus": 0.0,
      "modifiers": {
        "damageBonus": 0.0,
        "healBonus": 1.0,
        "shieldBonus": 0.0
      },
      "description": "强大的自然恢复力，靠持久战拖垮对手。",
      "enabled": true
    },
    "lightning_assassin": {
      "characterId": "lightning_assassin",
      "characterName": "雷电刺客",
      "role": "敏捷 / 暴击高险",
      "maxHp": 96,
      "baseAttack": 10,
      "startingEnergy": 4,
      "maxEnergy": 10,
      "passiveId": "lightning_assassin_passive",
      "skillId": "lightning_assassin_skill",
      "damageBonus": 1.0,
      "healBonus": 0.0,
      "shieldBonus": 0.0,
      "modifiers": {
        "damageBonus": 1.0,
        "healBonus": 0.0,
        "shieldBonus": 0.0
      },
      "description": "爆发刺客，普攻暴击与闪电突袭瞬发打出超高伤。",
      "enabled": true
    },
    "ice_mage": {
      "characterId": "ice_mage",
      "characterName": "冰霜法师",
      "role": "控制 / 极寒冰封",
      "maxHp": 104,
      "baseAttack": 9,
      "startingEnergy": 4,
      "maxEnergy": 10,
      "passiveId": "ice_mage_passive",
      "skillId": "ice_mage_skill",
      "damageBonus": 0.0,
      "healBonus": 0.0,
      "shieldBonus": 1.0,
      "modifiers": {
        "damageBonus": 0.0,
        "healBonus": 0.0,
        "shieldBonus": 1.0
      },
      "description": "技能能冻结敌人使其在下回合无法行动。",
      "enabled": true
    }
  },
  "skills": {
    "fire_warrior_skill": {
      "skillId": "fire_warrior_skill",
      "characterId": "fire_warrior",
      "skillName": "烈焰斩",
      "skillType": "damage_and_burn",
      "cost": 3,
      "cooldown": 2,
      "damage": 18.0,
      "heal": 0.0,
      "shield": 0.0,
      "duration": 2,
      "chance": 0.0,
      "procChance": 0.0,
      "secondaryDamage": 0.0,
      "effectId": "burn",
      "effects": [
        {
          "type": "damage",
          "value": 18.0
        },
        {
          "type": "apply_status",
          "status": "burn",
          "stacks": 2
        }
      ],
      "description": "造成 18 点伤害，并施加 2 层灼烧"
    },
    "iron_guardian_skill": {
      "skillId": "iron_guardian_skill",
      "characterId": "iron_guardian",
      "skillName": "钢铁壁垒",
      "skillType": "shield_and_flat_reduction",
      "cost": 2,
      "cooldown": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 25.0,
      "duration": 1,
      "chance": 0.0,
      "procChance": 0.0,
      "secondaryDamage": 0.0,
      "effectId": "flat_shield_wall",
      "effects": [
        {
          "type": "shield",
          "value": 25.0
        },
        {
          "type": "modify_damage",
          "subType": "flat_reduction",
          "value": 3.0
        }
      ],
      "description": "获得 25 点护盾，本回合后续减伤 3 点"
    },
    "forest_mage_skill": {
      "skillId": "forest_mage_skill",
      "characterId": "forest_mage",
      "skillName": "自然治愈",
      "skillType": "heal",
      "cost": 3,
      "cooldown": 2,
      "damage": 0.0,
      "heal": 20.0,
      "shield": 0.0,
      "duration": 0,
      "chance": 0.0,
      "procChance": 0.0,
      "secondaryDamage": 0.0,
      "effectId": "heal",
      "effects": [
        {
          "type": "heal",
          "value": 20.0
        }
      ],
      "description": "恢复 20 HP"
    },
    "lightning_assassin_skill": {
      "skillId": "lightning_assassin_skill",
      "characterId": "lightning_assassin",
      "skillName": "闪电突袭",
      "skillType": "damage_and_combo",
      "cost": 2,
      "cooldown": 2,
      "damage": 15.0,
      "heal": 0.0,
      "shield": 0.0,
      "duration": 0,
      "chance": 0.0,
      "procChance": 0.0,
      "secondaryDamage": 0.0,
      "effectId": "",
      "effects": [
        {
          "type": "damage",
          "value": 15.0
        },
        {
          "type": "conditional",
          "condition": "chance",
          "chance": 0.4,
          "thenEffects": [
            {
              "type": "damage",
              "value": 10.0,
              "isElectric": true
            }
          ]
        }
      ],
      "description": "造成 15 点伤害，40% 概率追加 10 点雷电伤害"
    },
    "ice_mage_skill": {
      "skillId": "ice_mage_skill",
      "characterId": "ice_mage",
      "skillName": "寒冰箭",
      "skillType": "damage_and_freeze",
      "cost": 2,
      "cooldown": 2,
      "damage": 14.0,
      "heal": 0.0,
      "shield": 0.0,
      "duration": 1,
      "chance": 0.0,
      "procChance": 0.0,
      "secondaryDamage": 0.0,
      "effectId": "freeze",
      "effects": [
        {
          "type": "damage",
          "value": 14.0
        },
        {
          "type": "apply_status",
          "status": "freeze",
          "stacks": 1
        }
      ],
      "description": "造成 14 点伤害，附带 1 回合冰冻"
    },
    "skill_0006": {
      "skillId": "skill_0006",
      "characterId": "hero_0006",
      "skillName": "火卫强袭",
      "skillType": "damage_skill",
      "cost": 3,
      "cooldown": 2,
      "damage": 7.0,
      "heal": 0.0,
      "shield": 0.0,
      "duration": 1,
      "chance": 0.0,
      "procChance": 0.0,
      "secondaryDamage": 0.0,
      "effectId": "burn",
      "effects": [
        {
          "type": "damage",
          "value": 7.0
        },
        {
          "type": "apply_status",
          "status": "burn",
          "stacks": 1
        }
      ],
      "description": "消耗 3 能量，造成 7 点高额伤害并施加 1 层灼烧。"
    }
  },
  "cards": {
    "quick_attack": {
      "cardId": "quick_attack",
      "cardName": "快速攻击",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 1,
      "damage": 3.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 3.0
        }
      ],
      "description": "造成 3 点伤害。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "heavy_strike": {
      "cardId": "heavy_strike",
      "cardName": "重击",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 3,
      "damage": 7.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 7.0
        }
      ],
      "description": "造成 7 点高额伤害。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pierce": {
      "cardId": "pierce",
      "cardName": "穿刺",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 2,
      "damage": 4.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 4.0
        },
        {
          "type": "damage",
          "value": 4.0,
          "pierceRatio": 0.5
        }
      ],
      "description": "造成 4 点伤害，无视 50% 护盾。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "shield_penetration:0.5",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "dual_slash": {
      "cardId": "dual_slash",
      "cardName": "双刃斩",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 5.0
        },
        {
          "type": "self_damage",
          "value": 1.0
        }
      ],
      "description": "造成 5 点伤害，自身受到 1 点反噬。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 1.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "shield_bash": {
      "cardId": "shield_bash",
      "cardName": "盾击",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 2,
      "damage": 3.0,
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
      "secondaryDamage": 3.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "attack",
        "defense"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 3.0
        },
        {
          "type": "conditional",
          "condition": "user_has_shield",
          "thenEffects": [
            {
              "type": "damage",
              "value": 3.0
            }
          ]
        }
      ],
      "description": "造成 3 点伤害；若有护盾，额外造成 3 点伤害。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "user_has_shield",
      "condition_param": 0.0,
      "condition_bonus": 3.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "small_shield": {
      "cardId": "small_shield",
      "cardName": "小型护盾",
      "type": "defense",
      "cardType": "defense",
      "rarity": "common",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 4.0,
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
      "targetType": "self",
      "tags": [
        "defense"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 4.0
        }
      ],
      "description": "获得 4 点护盾 (上限 10)。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "large_shield": {
      "cardId": "large_shield",
      "cardName": "大型护盾",
      "type": "defense",
      "cardType": "defense",
      "rarity": "common",
      "cost": 3,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 8.0,
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
      "targetType": "self",
      "tags": [
        "defense"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 8.0
        }
      ],
      "description": "获得 8 点护盾 (上限 10)。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "defensive_stance": {
      "cardId": "defensive_stance",
      "cardName": "防守姿态",
      "type": "defense",
      "cardType": "defense",
      "rarity": "common",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "damage_reduction",
      "statusId": "damage_reduction",
      "statusStacks": 1,
      "damageModifier": 0.4,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "defense"
      ],
      "level": 1,
      "effects": [
        {
          "type": "modify_damage",
          "subType": "percentage_reduction",
          "value": 0.4
        },
        {
          "type": "apply_status",
          "status": "damage_reduction",
          "stacks": 1
        }
      ],
      "description": "本回合受到的所有伤害降低 40%。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "status",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "damage_reduction:1",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "small_heal": {
      "cardId": "small_heal",
      "cardName": "小型治疗",
      "type": "heal",
      "cardType": "heal",
      "rarity": "common",
      "cost": 2,
      "damage": 0.0,
      "heal": 5.0,
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
      "targetType": "self",
      "tags": [
        "heal"
      ],
      "level": 1,
      "effects": [
        {
          "type": "heal",
          "value": 5.0
        }
      ],
      "description": "恢复 5 点生命 (单回合上限 8)。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "heal",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "meditation": {
      "cardId": "meditation",
      "cardName": "冥想",
      "type": "heal",
      "cardType": "heal",
      "rarity": "common",
      "cost": 1,
      "damage": 0.0,
      "heal": 2.0,
      "shield": 0.0,
      "draw": 1,
      "drawCount": 1,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "",
      "statusId": "",
      "statusStacks": 0,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "heal"
      ],
      "level": 1,
      "effects": [
        {
          "type": "heal",
          "value": 2.0
        },
        {
          "type": "draw_card",
          "count": 1
        }
      ],
      "description": "恢复 2 点生命，抽 1 张牌。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "heal",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "flame_flask": {
      "cardId": "flame_flask",
      "cardName": "火焰瓶",
      "type": "special",
      "cardType": "special",
      "rarity": "common",
      "cost": 2,
      "damage": 3.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "burn",
      "statusId": "burn",
      "statusStacks": 1,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "fire"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 3.0
        },
        {
          "type": "apply_status",
          "status": "burn",
          "stacks": 1
        },
        {
          "type": "apply_status",
          "status": "burn",
          "stacks": 1
        }
      ],
      "description": "造成 3 点伤害，施加 1 层灼烧。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "burn:1",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "poison_blade": {
      "cardId": "poison_blade",
      "cardName": "毒刃",
      "type": "special",
      "cardType": "special",
      "rarity": "common",
      "cost": 2,
      "damage": 2.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "poison",
      "statusId": "poison",
      "statusStacks": 2,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "poison"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 2.0
        },
        {
          "type": "apply_status",
          "status": "poison",
          "stacks": 2
        },
        {
          "type": "apply_status",
          "status": "poison",
          "stacks": 2
        }
      ],
      "description": "造成 2 点伤害，施加 2 层中毒。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "poison:2",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "energy_surge": {
      "cardId": "energy_surge",
      "cardName": "能量爆发",
      "type": "special",
      "cardType": "special",
      "rarity": "legendary",
      "cost": 0,
      "damage": 0.0,
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
      "targetType": "self",
      "tags": [
        "defense"
      ],
      "level": 1,
      "effects": [
        {
          "type": "gain_energy",
          "value": 2.0
        },
        {
          "type": "forbid_normal_attack"
        }
      ],
      "description": "立即获得 2 点能量，本回合无法普攻。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "energy",
      "target": "self",
      "energy": 2.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "focus": {
      "cardId": "focus",
      "cardName": "专注",
      "type": "special",
      "cardType": "special",
      "rarity": "epic",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 2,
      "drawCount": 2,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "attack_buff",
      "statusId": "attack_buff",
      "statusStacks": 1,
      "damageModifier": 2.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "draw_card",
          "count": 2
        },
        {
          "type": "modify_damage",
          "subType": "next_damage_bonus",
          "value": 2.0
        },
        {
          "type": "apply_status",
          "status": "attack_buff",
          "stacks": 1
        }
      ],
      "description": "抽 2 张牌，本回合下次伤害 +2 点。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "draw",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "attack_buff:1",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "weaken": {
      "cardId": "weaken",
      "cardName": "虚弱",
      "type": "special",
      "cardType": "special",
      "rarity": "common",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "weakness",
      "statusId": "weakness",
      "statusStacks": 1,
      "damageModifier": -2.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "poison"
      ],
      "level": 1,
      "effects": [
        {
          "type": "apply_status",
          "status": "weakness",
          "stacks": 2
        },
        {
          "type": "apply_status",
          "status": "weakness",
          "stacks": 2
        }
      ],
      "description": "使敌人造成的伤害减少 2 点。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "status",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "weakness:2",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "steal": {
      "cardId": "steal",
      "cardName": "夺取",
      "type": "special",
      "cardType": "special",
      "rarity": "common",
      "cost": 2,
      "damage": 2.0,
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
      "tags": [
        "heal"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 2.0
        },
        {
          "type": "steal_card"
        }
      ],
      "description": "造成 2 点伤害，随机复制对手 1 张手牌。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_battle_cry": {
      "cardId": "base_battle_cry",
      "cardName": "战吼破甲",
      "type": "skill",
      "cardType": "skill",
      "rarity": "common",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 2,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "vulnerable",
      "statusId": "vulnerable",
      "statusStacks": 2,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "apply_status",
          "status": "vulnerable",
          "stacks": 2
        },
        {
          "type": "apply_status",
          "status": "vulnerable",
          "stacks": 2
        }
      ],
      "description": "发出震撼战吼，使目标陷入 2 回合易伤状态（受到伤害 +50%）。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "status",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "vulnerable:2",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_cleave": {
      "cardId": "base_cleave",
      "cardName": "横扫千军",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 1,
      "damage": 8.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 8.0
        }
      ],
      "description": "大范围横扫，造成 8 点物理伤害。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_inflame": {
      "cardId": "base_inflame",
      "cardName": "燃火",
      "type": "skill",
      "cardType": "skill",
      "rarity": "common",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 2,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "strength",
      "statusId": "strength",
      "statusStacks": 2,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "apply_status",
          "status": "strength",
          "stacks": 2
        },
        {
          "type": "apply_status",
          "status": "strength",
          "stacks": 2
        }
      ],
      "description": "点燃战意，获得 2 回合【力量】（每段伤害 +3）。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "status",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "strength:2",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_iron_wave": {
      "cardId": "base_iron_wave",
      "cardName": "铁斩波",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 1,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 5.0
        }
      ],
      "description": "势大力沉的一记横斩，造成 5 点物理伤害。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_limit_break": {
      "cardId": "base_limit_break",
      "cardName": "突破极限",
      "type": "skill",
      "cardType": "skill",
      "rarity": "legendary",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 3,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "strength",
      "statusId": "strength",
      "statusStacks": 3,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "apply_status",
          "status": "strength",
          "stacks": 3
        },
        {
          "type": "apply_status",
          "status": "strength",
          "stacks": 3
        }
      ],
      "description": "【传说】突破肉体极限：获得 3 回合【力量】并立即回复 1 点能量。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "energy",
      "target": "self",
      "energy": 1.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "strength:3",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_pommel_strike": {
      "cardId": "base_pommel_strike",
      "cardName": "剑柄打击",
      "type": "attack",
      "cardType": "attack",
      "rarity": "epic",
      "cost": 1,
      "damage": 9.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 1,
      "drawCount": 1,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "",
      "statusId": "",
      "statusStacks": 0,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 9.0
        },
        {
          "type": "draw_card",
          "count": 1
        }
      ],
      "description": "用剑柄猛砸对手并顺势调整姿态：造成 9 点伤害，抽 1 张牌。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_quick_guard": {
      "cardId": "base_quick_guard",
      "cardName": "疾风格挡",
      "type": "defense",
      "cardType": "defense",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 9.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 9.0
        }
      ],
      "description": "以迅捷身法卸开攻击，获得 9 点护盾。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_read_intent": {
      "cardId": "base_read_intent",
      "cardName": "洞察·读心",
      "type": "skill",
      "cardType": "skill",
      "rarity": "epic",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 4.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 4.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_last_was_attack",
          "thenEffects": [
            {
              "type": "damage",
              "value": 20.0
            }
          ],
          "elseEffects": [
            {
              "type": "shield",
              "value": 3.0
            }
          ]
        }
      ],
      "description": "【博弈·态势】获得 4 点护盾；若对手上一回合打出的是攻击牌，立即反击造成 20 点伤害，否则再获得 3 点护盾。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_last_was_attack",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "damage",
          "value": 20.0
        }
      ],
      "else_effects": [
        {
          "type": "shield",
          "value": 3.0
        }
      ],
      "reaction": null
    },
    "base_retaliation_shield": {
      "cardId": "base_retaliation_shield",
      "cardName": "绝境壁障",
      "type": "defense",
      "cardType": "defense",
      "rarity": "common",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 5.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 5.0
        },
        {
          "type": "delayed_reaction",
          "condition": "damage_taken_gt:30",
          "thenEffects": [
            {
              "type": "shield",
              "value": 20.0
            }
          ]
        }
      ],
      "description": "预置战术壁障。下一回合中，若对方造成单次伤害高于 30 点，立即触发获得 20 点护盾！",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "reaction[damage_taken_gt:30]=>shield:20",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": {
        "condition": "damage_taken_gt:30",
        "effects": [
          {
            "type": "shield",
            "value": 20.0
          }
        ]
      }
    },
    "base_second_wind": {
      "cardId": "base_second_wind",
      "cardName": "重整旗鼓",
      "type": "skill",
      "cardType": "skill",
      "rarity": "epic",
      "cost": 1,
      "damage": 0.0,
      "heal": 8.0,
      "shield": 4.0,
      "draw": 1,
      "drawCount": 1,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "",
      "statusId": "",
      "statusStacks": 0,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 4.0
        },
        {
          "type": "heal",
          "value": 8.0
        },
        {
          "type": "draw_card",
          "count": 1
        }
      ],
      "description": "整顿阵型：恢复 8 点生命、获得 4 点护盾并抽 1 张牌。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_shield_block": {
      "cardId": "base_shield_block",
      "cardName": "坚固壁垒",
      "type": "defense",
      "cardType": "defense",
      "rarity": "common",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 8.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 8.0
        }
      ],
      "description": "构筑晶石护盾，为自身抵挡 8 点伤害。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_shrug_it_off": {
      "cardId": "base_shrug_it_off",
      "cardName": "卸力",
      "type": "defense",
      "cardType": "defense",
      "rarity": "epic",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 8.0,
      "draw": 1,
      "drawCount": 1,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "",
      "statusId": "",
      "statusStacks": 0,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 8.0
        },
        {
          "type": "draw_card",
          "count": 1
        }
      ],
      "description": "卸开攻势并立刻重整架势：获得 8 点护盾，抽 1 张牌。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_strike": {
      "cardId": "base_strike",
      "cardName": "迅捷打击",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 1,
      "damage": 6.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 6.0
        }
      ],
      "description": "对敌方目标造成 6 点敏捷打击物理伤害。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_twin_strike": {
      "cardId": "base_twin_strike",
      "cardName": "双重打击",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 1,
      "damage": 4.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 4.0
        }
      ],
      "description": "挥出两段连击，每段造成 4 点物理伤害。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 2,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_divine_heal": {
      "cardId": "base_divine_heal",
      "cardName": "神圣治愈",
      "type": "heal",
      "cardType": "heal",
      "rarity": "common",
      "cost": 2,
      "damage": 0.0,
      "heal": 12.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "heal",
          "value": 12.0
        }
      ],
      "description": "虔诚祈祷，立即为自身恢复 12 点生命值。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "heal",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_execute_judgment": {
      "cardId": "base_execute_judgment",
      "cardName": "处刑判决",
      "type": "attack",
      "cardType": "attack",
      "rarity": "epic",
      "cost": 2,
      "damage": 8.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 8.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_hp_below:40",
          "thenEffects": [
            {
              "type": "damage",
              "value": 18.0
            }
          ],
          "elseEffects": [
            {
              "type": "shield",
              "value": 8.0
            }
          ]
        }
      ],
      "description": "【博弈·分支】造成 8 点伤害；若对手生命低于 40%，追加 18 点处刑伤害，否则转为 8 点护盾。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_hp_below",
      "condition_param": 40.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "damage",
          "value": 18.0
        }
      ],
      "else_effects": [
        {
          "type": "shield",
          "value": 8.0
        }
      ],
      "reaction": null
    },
    "base_fireball": {
      "cardId": "base_fireball",
      "cardName": "炽炎火球",
      "type": "attack",
      "cardType": "attack",
      "rarity": "rare",
      "cost": 2,
      "damage": 12.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 1,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "burn",
      "statusId": "burn",
      "statusStacks": 1,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 12.0
        },
        {
          "type": "apply_status",
          "status": "burn",
          "stacks": 1
        },
        {
          "type": "apply_status",
          "status": "burn",
          "stacks": 1
        }
      ],
      "description": "投掷爆裂火球，造成 12 点火系伤害并附加 1 回合灼烧。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "burn:1",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_heavy_strike": {
      "cardId": "base_heavy_strike",
      "cardName": "强袭重斩",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 2,
      "damage": 14.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 14.0
        }
      ],
      "description": "积聚力量沉重劈砍，造成 14 点爆发性物理伤害。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_iron_bastion": {
      "cardId": "base_iron_bastion",
      "cardName": "钢铁堡垒",
      "type": "defense",
      "cardType": "defense",
      "rarity": "epic",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 20.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 2,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "thorns",
      "statusId": "thorns",
      "statusStacks": 2,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 20.0
        },
        {
          "type": "apply_status",
          "status": "thorns",
          "stacks": 2
        },
        {
          "type": "apply_status",
          "status": "thorns",
          "stacks": 2
        }
      ],
      "description": "化为钢铁堡垒：获得 20 点护盾并附 2 回合【荆棘】（受击反弹 3 点真伤）。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "thorns:2",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "base_iron_defense": {
      "cardId": "base_iron_defense",
      "cardName": "绝对壁垒",
      "type": "defense",
      "cardType": "defense",
      "rarity": "rare",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 16.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 16.0
        }
      ],
      "description": "展开绝对防御力场，为自身构筑 16 点坚固护盾。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_combust": {
      "cardId": "pve_combust",
      "cardName": "燃烧",
      "type": "skill",
      "cardType": "skill",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 4.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 3,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "burn",
      "statusId": "burn",
      "statusStacks": 3,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 4.0
        },
        {
          "type": "apply_status",
          "status": "burn",
          "stacks": 3
        },
        {
          "type": "apply_status",
          "status": "burn",
          "stacks": 3
        }
      ],
      "description": "引燃自身周围：获得 4 点护盾并施加 3 回合【灼烧】。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "shield",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "burn:3",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_entrench": {
      "cardId": "pve_entrench",
      "cardName": "巩固",
      "type": "defense",
      "cardType": "defense",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 12.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 12.0
        }
      ],
      "description": "巩固防线，获得 12 点护盾。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_herb_salve": {
      "cardId": "pve_herb_salve",
      "cardName": "草药膏",
      "type": "heal",
      "cardType": "heal",
      "rarity": "common",
      "cost": 1,
      "damage": 0.0,
      "heal": 8.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "heal",
          "value": 8.0
        }
      ],
      "description": "敷上草药，恢复 8 点生命。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "heal",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_metallicize": {
      "cardId": "pve_metallicize",
      "cardName": "金属化",
      "type": "defense",
      "cardType": "defense",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 10.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 1,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "strength",
      "statusId": "strength",
      "statusStacks": 1,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 10.0
        },
        {
          "type": "apply_status",
          "status": "strength",
          "stacks": 1
        },
        {
          "type": "apply_status",
          "status": "strength",
          "stacks": 1
        }
      ],
      "description": "金属化躯体：获得 10 点护盾与 1 回合【力量】。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "strength:1",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_rampage": {
      "cardId": "pve_rampage",
      "cardName": "暴怒",
      "type": "attack",
      "cardType": "attack",
      "rarity": "rare",
      "cost": 1,
      "damage": 10.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 10.0
        }
      ],
      "description": "陷入暴怒，造成 10 点伤害（强化后数值成长更快）。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_scout_eye": {
      "cardId": "pve_scout_eye",
      "cardName": "侦察之眼",
      "type": "skill",
      "cardType": "skill",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 2,
      "drawCount": 2,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "",
      "statusId": "",
      "statusStacks": 0,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "draw_card",
          "count": 2
        }
      ],
      "description": "侦察地形与敌情，抽 2 张牌。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "draw",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_spark": {
      "cardId": "pve_spark",
      "cardName": "火花",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 1,
      "damage": 7.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 7.0
        }
      ],
      "description": "迸发火星，造成 7 点伤害。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_spark_sigil": {
      "cardId": "pve_spark_sigil",
      "cardName": "火花印记",
      "type": "skill",
      "cardType": "skill",
      "rarity": "rare",
      "cost": 1,
      "damage": 10.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 10.0
        }
      ],
      "description": "【PVE成长卡】唤起火花法印，初始造成 10 点伤害。随强化等级动态提升伤害（每级+20%）。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_stone_skin": {
      "cardId": "pve_stone_skin",
      "cardName": "石化皮肤",
      "type": "defense",
      "cardType": "defense",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 10.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 10.0
        }
      ],
      "description": "皮肤石化，获得 10 点护盾。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_thorn_mail": {
      "cardId": "pve_thorn_mail",
      "cardName": "荆棘甲",
      "type": "defense",
      "cardType": "defense",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 8.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 2,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "thorns",
      "statusId": "thorns",
      "statusStacks": 2,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 8.0
        },
        {
          "type": "apply_status",
          "status": "thorns",
          "stacks": 2
        },
        {
          "type": "apply_status",
          "status": "thorns",
          "stacks": 2
        }
      ],
      "description": "披上荆棘甲：获得 8 点护盾并附 2 回合【荆棘】。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "thorns:2",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_wild_swing": {
      "cardId": "pve_wild_swing",
      "cardName": "乱斩",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 1,
      "damage": 4.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 4.0
        }
      ],
      "description": "毫无章法地挥砍两次，每段造成 4 点伤害。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 2,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_apotheosis": {
      "cardId": "pve_apotheosis",
      "cardName": "升华",
      "type": "skill",
      "cardType": "skill",
      "rarity": "legendary",
      "cost": 2,
      "damage": 0.0,
      "heal": 20.0,
      "shield": 10.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 10.0
        },
        {
          "type": "heal",
          "value": 20.0
        }
      ],
      "description": "【传说】超凡升华：恢复 20 点生命并获得 10 点护盾。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_barricade": {
      "cardId": "pve_barricade",
      "cardName": "磐石壁垒",
      "type": "defense",
      "cardType": "defense",
      "rarity": "epic",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 20.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 20.0
        },
        {
          "type": "outcome_branch",
          "condition": "user_hp_above:60",
          "thenEffects": [
            {
              "type": "shield",
              "value": 8.0
            }
          ],
          "elseEffects": []
        }
      ],
      "description": "【博弈·分支】获得 20 点护盾；若自身生命高于 60%，额外获得 8 点护盾。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "user_hp_above",
      "condition_param": 60.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "shield",
          "value": 8.0
        }
      ],
      "else_effects": [],
      "reaction": null
    },
    "pve_demon_form": {
      "cardId": "pve_demon_form",
      "cardName": "恶魔形态",
      "type": "skill",
      "cardType": "skill",
      "rarity": "common",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 3,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "strength",
      "statusId": "strength",
      "statusStacks": 3,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 3.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "apply_status",
          "status": "strength",
          "stacks": 3
        },
        {
          "type": "apply_status",
          "status": "strength",
          "stacks": 3
        }
      ],
      "description": "化身为魔：获得 3 回合【力量】，自身承受 3 点反噬。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "status",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 3.0,
      "status": "strength:3",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_feed": {
      "cardId": "pve_feed",
      "cardName": "进食",
      "type": "attack",
      "cardType": "attack",
      "rarity": "rare",
      "cost": 2,
      "damage": 14.0,
      "heal": 4.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 14.0
        },
        {
          "type": "heal",
          "value": 4.0
        }
      ],
      "description": "撕咬并吞食：造成 14 点伤害并恢复 4 点生命。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "damage",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_iron_bark": {
      "cardId": "pve_iron_bark",
      "cardName": "铁树皮",
      "type": "defense",
      "cardType": "defense",
      "rarity": "rare",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 17.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 17.0
        }
      ],
      "description": "树皮铁化，获得 17 点护盾。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_juggernaut": {
      "cardId": "pve_juggernaut",
      "cardName": "主宰",
      "type": "defense",
      "cardType": "defense",
      "rarity": "epic",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 16.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 3,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "thorns",
      "statusId": "thorns",
      "statusStacks": 3,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 16.0
        },
        {
          "type": "apply_status",
          "status": "thorns",
          "stacks": 3
        },
        {
          "type": "apply_status",
          "status": "thorns",
          "stacks": 3
        }
      ],
      "description": "成为战场主宰：获得 16 点护盾并附 3 回合【荆棘】。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "thorns:3",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_mend_wounds": {
      "cardId": "pve_mend_wounds",
      "cardName": "缝合伤口",
      "type": "heal",
      "cardType": "heal",
      "rarity": "common",
      "cost": 2,
      "damage": 0.0,
      "heal": 14.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "heal",
          "value": 14.0
        }
      ],
      "description": "缝合伤口，恢复 14 点生命。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "heal",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_reaper": {
      "cardId": "pve_reaper",
      "cardName": "死神收割",
      "type": "attack",
      "cardType": "attack",
      "rarity": "rare",
      "cost": 2,
      "damage": 9.0,
      "heal": 9.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 9.0
        },
        {
          "type": "heal",
          "value": 9.0
        }
      ],
      "description": "收割生命之力：造成 9 点伤害并恢复 9 点生命。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "damage",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_bludgeon": {
      "cardId": "pve_bludgeon",
      "cardName": "重锤",
      "type": "attack",
      "cardType": "attack",
      "rarity": "rare",
      "cost": 3,
      "damage": 22.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 22.0
        }
      ],
      "description": "抡起巨锤砸下，造成 22 点沉重伤害。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pve_immortal_loop": {
      "cardId": "pve_immortal_loop",
      "cardName": "不朽轮回",
      "type": "attack",
      "cardType": "attack",
      "rarity": "legendary",
      "cost": 3,
      "damage": 24.0,
      "heal": 12.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 24.0
        },
        {
          "type": "heal",
          "value": 12.0
        }
      ],
      "description": "【传说】轮回不止：造成 24 点伤害并恢复 12 点生命。",
      "enabled": true,
      "pool_type": "PVE",
      "poolType": "PVE",
      "upgradeable": true,
      "effect_type": "damage",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_adrenaline": {
      "cardId": "pvp_adrenaline",
      "cardName": "肾上腺素",
      "type": "skill",
      "cardType": "skill",
      "rarity": "legendary",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 1,
      "drawCount": 1,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "",
      "statusId": "",
      "statusStacks": 0,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "draw_card",
          "count": 1
        }
      ],
      "description": "肾上腺素飙升：立即回复 2 点能量并抽 1 张牌。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "draw",
      "target": "self",
      "energy": 2.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_backstab": {
      "cardId": "pvp_backstab",
      "cardName": "背刺",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 1,
      "damage": 10.0,
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
      "selfDamage": 2.0,
      "targetType": "enemy",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 10.0
        }
      ],
      "description": "不计代价的贴身重击：造成 10 点伤害，自身承受 2 点反噬。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 2.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_bated_breath": {
      "cardId": "pvp_bated_breath",
      "cardName": "屏息",
      "type": "skill",
      "cardType": "skill",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 5.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 5.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_last_was_pass",
          "thenEffects": [
            {
              "type": "draw_card",
              "count": 2
            }
          ],
          "elseEffects": []
        }
      ],
      "description": "【博弈·态势】获得 5 点护盾；若对手上一回合一张牌都没有打出，抽 2 张牌。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_last_was_pass",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "draw_card",
          "count": 2
        }
      ],
      "else_effects": [],
      "reaction": null
    },
    "pvp_battle_focus": {
      "cardId": "pvp_battle_focus",
      "cardName": "战斗专注",
      "type": "skill",
      "cardType": "skill",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 2,
      "drawCount": 2,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "",
      "statusId": "",
      "statusStacks": 0,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "draw_card",
          "count": 2
        }
      ],
      "description": "进入战斗专注状态，抽 2 张牌。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "draw",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_blood_price": {
      "cardId": "pvp_blood_price",
      "cardName": "血偿",
      "type": "attack",
      "cardType": "attack",
      "rarity": "epic",
      "cost": 1,
      "damage": 8.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 8.0
        },
        {
          "type": "outcome_branch",
          "condition": "user_hp_below:50",
          "thenEffects": [
            {
              "type": "damage",
              "value": 14.0
            }
          ],
          "elseEffects": [
            {
              "type": "shield",
              "value": 6.0
            }
          ]
        }
      ],
      "description": "【博弈·分支】造成 8 点伤害；若自身生命低于 50%（背水），追加 14 点伤害，否则获得 6 点护盾。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "user_hp_below",
      "condition_param": 50.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "damage",
          "value": 14.0
        }
      ],
      "else_effects": [
        {
          "type": "shield",
          "value": 6.0
        }
      ],
      "reaction": null
    },
    "pvp_crowd_surge": {
      "cardId": "pvp_crowd_surge",
      "cardName": "群情激愤",
      "type": "attack",
      "cardType": "attack",
      "rarity": "epic",
      "cost": 1,
      "damage": 8.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 8.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_hand_at_least:5",
          "thenEffects": [
            {
              "type": "damage",
              "value": 10.0
            }
          ],
          "elseEffects": [
            {
              "type": "draw_card",
              "count": 1
            }
          ]
        }
      ],
      "description": "【博弈·分支】造成 8 点伤害；若对手手牌不少于 5 张（在囤牌），追加 10 点伤害，否则自己抽 1 张牌。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_hand_at_least",
      "condition_param": 5.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "damage",
          "value": 10.0
        }
      ],
      "else_effects": [
        {
          "type": "draw_card",
          "count": 1
        }
      ],
      "reaction": null
    },
    "pvp_ember_touch": {
      "cardId": "pvp_ember_touch",
      "cardName": "余烬之触",
      "type": "attack",
      "cardType": "attack",
      "rarity": "rare",
      "cost": 1,
      "damage": 4.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 2,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "burn",
      "statusId": "burn",
      "statusStacks": 2,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 4.0
        },
        {
          "type": "apply_status",
          "status": "burn",
          "stacks": 2
        },
        {
          "type": "apply_status",
          "status": "burn",
          "stacks": 2
        }
      ],
      "description": "留下灼热余烬，造成 4 点伤害并施加 2 回合【灼烧】。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "burn:2",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_frost_bolt": {
      "cardId": "pvp_frost_bolt",
      "cardName": "霜矢",
      "type": "attack",
      "cardType": "attack",
      "rarity": "rare",
      "cost": 1,
      "damage": 5.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 1,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "freeze",
      "statusId": "freeze",
      "statusStacks": 1,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 5.0
        },
        {
          "type": "apply_status",
          "status": "freeze",
          "stacks": 1
        },
        {
          "type": "apply_status",
          "status": "freeze",
          "stacks": 1
        }
      ],
      "description": "射出寒霜箭矢，造成 5 点伤害并施加 1 回合【冰冻】。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "freeze:1",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_guard_stance": {
      "cardId": "pvp_guard_stance",
      "cardName": "守势",
      "type": "defense",
      "cardType": "defense",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 9.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 9.0
        }
      ],
      "description": "收招入守，获得 9 点护盾。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_iron_read": {
      "cardId": "pvp_iron_read",
      "cardName": "铁壁预判",
      "type": "defense",
      "cardType": "defense",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 8.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 8.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_last_was_defense",
          "thenEffects": [
            {
              "type": "heal",
              "value": 10.0
            }
          ],
          "elseEffects": []
        }
      ],
      "description": "【博弈·态势】获得 8 点护盾；若对手上一回合打出的是防御或治疗牌，额外恢复 10 点生命。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_last_was_defense",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "heal",
          "value": 10.0
        }
      ],
      "else_effects": [],
      "reaction": null
    },
    "pvp_mirror_ward": {
      "cardId": "pvp_mirror_ward",
      "cardName": "镜像护壁",
      "type": "defense",
      "cardType": "defense",
      "rarity": "epic",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 10.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 10.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_last_was_defense",
          "thenEffects": [
            {
              "type": "heal",
              "value": 8.0
            }
          ],
          "elseEffects": [
            {
              "type": "shield",
              "value": 3.0
            }
          ]
        }
      ],
      "description": "【博弈·态势】获得 10 点护盾；若对手上一回合打出的是防御或治疗牌，恢复 8 点生命，否则再获得 3 点护盾。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_last_was_defense",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "heal",
          "value": 8.0
        }
      ],
      "else_effects": [
        {
          "type": "shield",
          "value": 3.0
        }
      ],
      "reaction": null
    },
    "pvp_read_the_blade": {
      "cardId": "pvp_read_the_blade",
      "cardName": "识刃",
      "type": "skill",
      "cardType": "skill",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 4.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 4.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_last_was_attack",
          "thenEffects": [
            {
              "type": "damage",
              "value": 14.0
            }
          ],
          "elseEffects": [
            {
              "type": "shield",
              "value": 2.0
            }
          ]
        }
      ],
      "description": "【博弈·态势】获得 4 点护盾；若对手上一回合打出的是攻击牌，造成 14 点反击伤害，否则再获得 2 点护盾。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_last_was_attack",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "damage",
          "value": 14.0
        }
      ],
      "else_effects": [
        {
          "type": "shield",
          "value": 2.0
        }
      ],
      "reaction": null
    },
    "pvp_read_the_incant": {
      "cardId": "pvp_read_the_incant",
      "cardName": "断咒",
      "type": "skill",
      "cardType": "skill",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 4.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 4.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_last_was_skill",
          "thenEffects": [
            {
              "type": "damage",
              "value": 15.0
            }
          ],
          "elseEffects": [
            {
              "type": "shield",
              "value": 2.0
            }
          ]
        }
      ],
      "description": "【博弈·态势】获得 4 点护盾；若对手上一回合打出的是技能牌，造成 15 点反击伤害，否则再获得 2 点护盾。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_last_was_skill",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "damage",
          "value": 15.0
        }
      ],
      "else_effects": [
        {
          "type": "shield",
          "value": 2.0
        }
      ],
      "reaction": null
    },
    "pvp_read_the_ward": {
      "cardId": "pvp_read_the_ward",
      "cardName": "破壁",
      "type": "skill",
      "cardType": "skill",
      "rarity": "rare",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 4.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 4.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_last_was_defense",
          "thenEffects": [
            {
              "type": "damage",
              "value": 16.0
            }
          ],
          "elseEffects": []
        }
      ],
      "description": "【博弈·态势】获得 4 点护盾；若对手上一回合打出的是防御或治疗牌，造成 16 点破壁伤害。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_last_was_defense",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "damage",
          "value": 16.0
        }
      ],
      "else_effects": [],
      "reaction": null
    },
    "pvp_shield_breaker": {
      "cardId": "pvp_shield_breaker",
      "cardName": "破盾",
      "type": "attack",
      "cardType": "attack",
      "rarity": "epic",
      "cost": 1,
      "damage": 7.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 7.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_has_no_shield",
          "thenEffects": [
            {
              "type": "damage",
              "value": 8.0
            }
          ],
          "elseEffects": [
            {
              "type": "apply_status",
              "status": "vulnerable",
              "stacks": 2
            }
          ]
        }
      ],
      "description": "【博弈·分支】造成 7 点伤害；若对手身上没有护盾（裸防），追加 8 点伤害，否则施加 2 回合【易伤】。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_has_no_shield",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "damage",
          "value": 8.0
        }
      ],
      "else_effects": [
        {
          "type": "apply_status",
          "status": "vulnerable",
          "stacks": 2
        }
      ],
      "reaction": null
    },
    "pvp_swift_jab": {
      "cardId": "pvp_swift_jab",
      "cardName": "疾刺",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 1,
      "damage": 7.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 7.0
        }
      ],
      "description": "快节奏的直刺，造成 7 点伤害。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_venom_dart": {
      "cardId": "pvp_venom_dart",
      "cardName": "毒镖",
      "type": "attack",
      "cardType": "attack",
      "rarity": "rare",
      "cost": 1,
      "damage": 3.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 3,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "poison",
      "statusId": "poison",
      "statusStacks": 3,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 3.0
        },
        {
          "type": "apply_status",
          "status": "poison",
          "stacks": 3
        },
        {
          "type": "apply_status",
          "status": "poison",
          "stacks": 3
        }
      ],
      "description": "淬毒飞镖，造成 3 点伤害并施加 3 回合【中毒】（回合末穿透真伤）。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "poison:3",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_weak_point": {
      "cardId": "pvp_weak_point",
      "cardName": "弱点识破",
      "type": "skill",
      "cardType": "skill",
      "rarity": "common",
      "cost": 1,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 3,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "weakness",
      "statusId": "weakness",
      "statusStacks": 3,
      "damageModifier": -2.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "apply_status",
          "status": "weakness",
          "stacks": 3
        },
        {
          "type": "apply_status",
          "status": "weakness",
          "stacks": 3
        }
      ],
      "description": "看破对手破绽，施加 3 回合【虚弱】（其伤害 -25%）。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "status",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "weakness:3",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_bulwark": {
      "cardId": "pvp_bulwark",
      "cardName": "铁壁",
      "type": "defense",
      "cardType": "defense",
      "rarity": "rare",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 16.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 16.0
        }
      ],
      "description": "架起重盾，获得 16 点护盾。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_double_slash": {
      "cardId": "pvp_double_slash",
      "cardName": "双连斩",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
      "cost": 2,
      "damage": 6.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 6.0
        }
      ],
      "description": "连续两段斩击，每段造成 6 点伤害。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 2,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_execute": {
      "cardId": "pvp_execute",
      "cardName": "处决",
      "type": "attack",
      "cardType": "attack",
      "rarity": "epic",
      "cost": 2,
      "damage": 14.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 14.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_hp_below:35",
          "thenEffects": [
            {
              "type": "damage",
              "value": 10.0
            }
          ],
          "elseEffects": [
            {
              "type": "shield",
              "value": 6.0
            }
          ]
        }
      ],
      "description": "【博弈·分支】造成 14 点伤害；若对手生命低于 35%，追加 10 点处决伤害，否则自身获得 6 点护盾。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_hp_below",
      "condition_param": 35.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "damage",
          "value": 10.0
        }
      ],
      "else_effects": [
        {
          "type": "shield",
          "value": 6.0
        }
      ],
      "reaction": null
    },
    "pvp_flame_slash": {
      "cardId": "pvp_flame_slash",
      "cardName": "烈焰斩",
      "type": "attack",
      "cardType": "attack",
      "rarity": "rare",
      "cost": 2,
      "damage": 10.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 2,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "burn",
      "statusId": "burn",
      "statusStacks": 2,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 10.0
        },
        {
          "type": "apply_status",
          "status": "burn",
          "stacks": 2
        },
        {
          "type": "apply_status",
          "status": "burn",
          "stacks": 2
        }
      ],
      "description": "【PVP竞技专属】挥出烈焰斩击，造成 10 点伤害并附加 2 回合灼烧状态。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "burn:2",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_fortress": {
      "cardId": "pvp_fortress",
      "cardName": "要塞",
      "type": "defense",
      "cardType": "defense",
      "rarity": "epic",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 18.0,
      "draw": 1,
      "drawCount": 1,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "",
      "statusId": "",
      "statusStacks": 0,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 18.0
        },
        {
          "type": "draw_card",
          "count": 1
        }
      ],
      "description": "构筑要塞并调度后援：获得 18 点护盾，抽 1 张牌。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_iron_hide": {
      "cardId": "pvp_iron_hide",
      "cardName": "铁甲术",
      "type": "defense",
      "cardType": "defense",
      "rarity": "rare",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 14.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 1,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "strength",
      "statusId": "strength",
      "statusStacks": 1,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 14.0
        },
        {
          "type": "apply_status",
          "status": "strength",
          "stacks": 1
        },
        {
          "type": "apply_status",
          "status": "strength",
          "stacks": 1
        }
      ],
      "description": "硬化表皮：获得 14 点护盾与 1 回合【力量】。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "strength:1",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_last_stand": {
      "cardId": "pvp_last_stand",
      "cardName": "背水一战",
      "type": "defense",
      "cardType": "defense",
      "rarity": "epic",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 12.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "shield",
          "value": 12.0
        },
        {
          "type": "outcome_branch",
          "condition": "user_hp_below:35",
          "thenEffects": [
            {
              "type": "heal",
              "value": 14.0
            }
          ],
          "elseEffects": [
            {
              "type": "shield",
              "value": 10.0
            }
          ]
        }
      ],
      "description": "【博弈·分支】获得 12 点护盾；若自身生命低于 35%（濒死），改为恢复 14 点生命，否则额外获得 10 点护盾。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "shield",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "user_hp_below",
      "condition_param": 35.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "heal",
          "value": 14.0
        }
      ],
      "else_effects": [
        {
          "type": "shield",
          "value": 10.0
        }
      ],
      "reaction": null
    },
    "pvp_mirror_duel": {
      "cardId": "pvp_mirror_duel",
      "cardName": "镜像对决",
      "type": "attack",
      "cardType": "attack",
      "rarity": "epic",
      "cost": 2,
      "damage": 10.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 10.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_last_was_attack",
          "thenEffects": [
            {
              "type": "damage",
              "value": 20.0
            }
          ],
          "elseEffects": [
            {
              "type": "shield",
              "value": 5.0
            }
          ]
        }
      ],
      "description": "【博弈·态势】造成 10 点伤害；若对手上一回合打出的是攻击牌，追加 20 点反击伤害，否则获得 5 点护盾。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_last_was_attack",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "damage",
          "value": 20.0
        }
      ],
      "else_effects": [
        {
          "type": "shield",
          "value": 5.0
        }
      ],
      "reaction": null
    },
    "pvp_perfect_insight": {
      "cardId": "pvp_perfect_insight",
      "cardName": "完美洞察",
      "type": "skill",
      "cardType": "skill",
      "rarity": "legendary",
      "cost": 2,
      "damage": 0.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 3,
      "drawCount": 3,
      "duration": 0,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "",
      "statusId": "",
      "statusStacks": 0,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "draw_card",
          "count": 3
        }
      ],
      "description": "【传说】洞悉全局：抽 3 张牌并立即回复 2 点能量。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "draw",
      "target": "self",
      "energy": 2.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_rend": {
      "cardId": "pvp_rend",
      "cardName": "撕裂",
      "type": "attack",
      "cardType": "attack",
      "rarity": "rare",
      "cost": 2,
      "damage": 11.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 2,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "vulnerable",
      "statusId": "vulnerable",
      "statusStacks": 2,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 11.0
        },
        {
          "type": "apply_status",
          "status": "vulnerable",
          "stacks": 2
        },
        {
          "type": "apply_status",
          "status": "vulnerable",
          "stacks": 2
        }
      ],
      "description": "撕裂护甲，造成 11 点伤害并施加 2 回合【易伤】（受伤 +50%）。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "vulnerable:2",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_rupture": {
      "cardId": "pvp_rupture",
      "cardName": "崩裂",
      "type": "attack",
      "cardType": "attack",
      "rarity": "rare",
      "cost": 2,
      "damage": 8.0,
      "heal": 0.0,
      "shield": 0.0,
      "draw": 0,
      "drawCount": 0,
      "duration": 4,
      "chance": 1.0,
      "procChance": 1.0,
      "effectId": "poison",
      "statusId": "poison",
      "statusStacks": 4,
      "damageModifier": 0.0,
      "secondaryDamage": 0.0,
      "selfDamage": 0.0,
      "targetType": "enemy",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 8.0
        },
        {
          "type": "apply_status",
          "status": "poison",
          "stacks": 4
        },
        {
          "type": "apply_status",
          "status": "poison",
          "stacks": 4
        }
      ],
      "description": "击碎对手护体真气，造成 8 点伤害并施加 4 回合【中毒】。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "poison:4",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_soul_drain": {
      "cardId": "pvp_soul_drain",
      "cardName": "汲魂",
      "type": "attack",
      "cardType": "attack",
      "rarity": "rare",
      "cost": 2,
      "damage": 10.0,
      "heal": 8.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 10.0
        },
        {
          "type": "heal",
          "value": 8.0
        }
      ],
      "description": "汲取对手生命：造成 10 点伤害并恢复自身 8 点生命。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_annihilation": {
      "cardId": "pvp_annihilation",
      "cardName": "湮灭",
      "type": "attack",
      "cardType": "attack",
      "rarity": "epic",
      "cost": 3,
      "damage": 30.0,
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
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 30.0
        }
      ],
      "description": "【传说】倾尽全力的一击，造成 30 点毁灭性伤害。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    },
    "pvp_oracle_gambit": {
      "cardId": "pvp_oracle_gambit",
      "cardName": "神谕豪赌",
      "type": "attack",
      "cardType": "attack",
      "rarity": "legendary",
      "cost": 3,
      "damage": 12.0,
      "heal": 6.0,
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
      "targetType": "self",
      "tags": [
        "attack"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 12.0
        },
        {
          "type": "heal",
          "value": 6.0
        },
        {
          "type": "outcome_branch",
          "condition": "target_last_was_defense",
          "thenEffects": [
            {
              "type": "damage",
              "value": 24.0
            }
          ],
          "elseEffects": [
            {
              "type": "shield",
              "value": 4.0
            }
          ]
        }
      ],
      "description": "【博弈·态势】造成 12 点伤害并恢复 6 点生命；若对手上一回合打出的是防御或治疗牌，追加 24 点伤害，否则获得 4 点护盾。",
      "enabled": true,
      "pool_type": "PVP",
      "poolType": "PVP",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "self",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "target_last_was_defense",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [
        {
          "type": "damage",
          "value": 24.0
        }
      ],
      "else_effects": [
        {
          "type": "shield",
          "value": 4.0
        }
      ],
      "reaction": null
    },
    "ice_spike": {
      "cardId": "ice_spike",
      "cardName": "寒冰穿刺",
      "type": "attack",
      "cardType": "attack",
      "rarity": "common",
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
      "tags": [
        "ice"
      ],
      "level": 1,
      "effects": [
        {
          "type": "damage",
          "value": 5.0
        }
      ],
      "description": "造成 5 点冰霜伤害。",
      "enabled": true,
      "pool_type": "Base",
      "poolType": "Base",
      "upgradeable": false,
      "effect_type": "damage",
      "target": "enemy",
      "energy": 0.0,
      "hit_count": 1,
      "self_damage": 0.0,
      "status": "",
      "buff": "",
      "condition": "",
      "condition_param": 0.0,
      "condition_bonus": 0.0,
      "then_effects": [],
      "else_effects": [],
      "reaction": null
    }
  },
  "statuses": {
    "burn": {
      "statusId": "burn",
      "statusName": "灼烧",
      "category": "debuff",
      "triggerTiming": "turn_end",
      "damagePerTurn": 2.0,
      "healPerTurn": 0.0,
      "damageModifier": 0.0,
      "damageTakenModifier": 0.0,
      "duration": 2,
      "maxStacks": 3,
      "stackRule": "stack_duration_refresh",
      "damageKind": "physical",
      "blocksAttackAndSkill": false,
      "description": "每层在回合末造成 2 点物理伤害（可被护盾吸收、受易伤放大），持续 2 回合，最多 3 层。"
    },
    "poison": {
      "statusId": "poison",
      "statusName": "中毒",
      "category": "debuff",
      "triggerTiming": "turn_end",
      "damagePerTurn": 2.0,
      "healPerTurn": 0.0,
      "damageModifier": 0.0,
      "damageTakenModifier": 0.0,
      "duration": 2,
      "maxStacks": 6,
      "stackRule": "stack_duration_refresh",
      "damageKind": "true",
      "blocksAttackAndSkill": false,
      "description": "每层在回合末造成 2 点真实伤害（无视护盾与易伤），持续 2 回合，最多 6 层。"
    },
    "weakness": {
      "statusId": "weakness",
      "statusName": "虚弱",
      "category": "debuff",
      "triggerTiming": "on_attack",
      "damagePerTurn": 0.0,
      "healPerTurn": 0.0,
      "damageModifier": -2.0,
      "damageTakenModifier": 0.0,
      "duration": 1,
      "maxStacks": 1,
      "stackRule": "refresh_only",
      "damageDealtMultiplier": 0.75,
      "damageKind": "physical",
      "blocksAttackAndSkill": false,
      "description": "造成的伤害降低 25%（最少仍造成 1 点）。"
    },
    "attack_buff": {
      "statusId": "attack_buff",
      "statusName": "蓄力",
      "category": "buff",
      "triggerTiming": "next_hit",
      "damagePerTurn": 0.0,
      "healPerTurn": 0.0,
      "damageModifier": 2.0,
      "damageTakenModifier": 0.0,
      "duration": 1,
      "maxStacks": 3,
      "stackRule": "consume_on_hit",
      "damageDealtFlat": 2.0,
      "damageKind": "physical",
      "blocksAttackAndSkill": false,
      "description": "下一次攻击伤害 +2 点。"
    },
    "damage_reduction": {
      "statusId": "damage_reduction",
      "statusName": "坚守",
      "category": "buff",
      "triggerTiming": "on_hit",
      "damagePerTurn": 0.0,
      "healPerTurn": 0.0,
      "damageModifier": 0.0,
      "damageTakenModifier": -0.4,
      "duration": 1,
      "maxStacks": 1,
      "stackRule": "refresh_only",
      "damageTakenMultiplier": 0.6,
      "damageKind": "physical",
      "blocksAttackAndSkill": false,
      "description": "本回合受到的伤害降低 40%。"
    },
    "flat_shield_wall": {
      "statusId": "flat_shield_wall",
      "statusName": "钢壁",
      "category": "buff",
      "triggerTiming": "on_hit",
      "damagePerTurn": 0.0,
      "healPerTurn": 0.0,
      "damageModifier": 0.0,
      "damageTakenModifier": -1.0,
      "duration": 1,
      "maxStacks": 1,
      "stackRule": "consume_on_hit",
      "damageTakenFlat": -1.0,
      "damageKind": "physical",
      "blocksAttackAndSkill": false,
      "description": "下一次受到的伤害固定减少 1 点。"
    },
    "freeze": {
      "statusId": "freeze",
      "statusName": "冰冻",
      "category": "debuff",
      "triggerTiming": "turn_start",
      "damagePerTurn": 0.0,
      "healPerTurn": 0.0,
      "damageModifier": 0.0,
      "damageTakenModifier": 0.0,
      "duration": 1,
      "maxStacks": 1,
      "stackRule": "refresh_only",
      "damageKind": "physical",
      "blocksAttackAndSkill": true,
      "description": "无法行动：不能普通攻击、不能施放技能，且无法打出攻击牌与技能牌。"
    },
    "vulnerable": {
      "statusId": "vulnerable",
      "statusName": "易伤",
      "category": "debuff",
      "triggerTiming": "on_hit",
      "damagePerTurn": 0.0,
      "healPerTurn": 0.0,
      "damageModifier": 0.0,
      "damageTakenModifier": 0.5,
      "duration": 2,
      "maxStacks": 1,
      "stackRule": "refresh_only",
      "damageTakenMultiplier": 1.5,
      "damageKind": "physical",
      "blocksAttackAndSkill": false,
      "description": "受到的所有非真实伤害提高 50%。"
    },
    "strength": {
      "statusId": "strength",
      "statusName": "力量",
      "category": "buff",
      "triggerTiming": "on_attack",
      "damagePerTurn": 0.0,
      "healPerTurn": 0.0,
      "damageModifier": 3.0,
      "damageTakenModifier": 0.0,
      "duration": 2,
      "maxStacks": 1,
      "stackRule": "refresh_only",
      "damageDealtFlat": 3.0,
      "damageKind": "physical",
      "blocksAttackAndSkill": false,
      "description": "每次打出卡牌的伤害 +3 点（多段攻击每段都加）。"
    },
    "thorns": {
      "statusId": "thorns",
      "statusName": "荆棘",
      "category": "buff",
      "triggerTiming": "on_hit",
      "damagePerTurn": 0.0,
      "healPerTurn": 0.0,
      "damageModifier": 0.0,
      "damageTakenModifier": 0.0,
      "duration": 2,
      "maxStacks": 1,
      "stackRule": "refresh_only",
      "thorns": 3.0,
      "damageKind": "physical",
      "blocksAttackAndSkill": false,
      "description": "受到攻击牌伤害时反弹 3 点真实伤害，多段攻击每段各反弹一次。"
    }
  },
  "cardPools": [
    {
      "characterId": "fire_warrior",
      "cardId": "quick_attack",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "fire_warrior",
      "cardId": "heavy_strike",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "fire_warrior",
      "cardId": "flame_flask",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "fire_warrior",
      "cardId": "dual_slash",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "fire_warrior",
      "cardId": "base_fireball",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "fire_warrior",
      "cardId": "base_inflame",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "fire_warrior",
      "cardId": "base_strike",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "fire_warrior",
      "cardId": "base_execute_judgment",
      "count": 1,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "iron_guardian",
      "cardId": "small_shield",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "iron_guardian",
      "cardId": "base_iron_wave",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "iron_guardian",
      "cardId": "base_shield_block",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "iron_guardian",
      "cardId": "base_iron_bastion",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "iron_guardian",
      "cardId": "base_retaliation_shield",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "iron_guardian",
      "cardId": "defensive_stance",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "iron_guardian",
      "cardId": "base_quick_guard",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "iron_guardian",
      "cardId": "base_divine_heal",
      "count": 1,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "forest_mage",
      "cardId": "small_heal",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "forest_mage",
      "cardId": "meditation",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "forest_mage",
      "cardId": "base_second_wind",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "forest_mage",
      "cardId": "small_shield",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "forest_mage",
      "cardId": "base_shrug_it_off",
      "count": 1,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "forest_mage",
      "cardId": "base_inflame",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "forest_mage",
      "cardId": "base_strike",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "forest_mage",
      "cardId": "base_shield_block",
      "count": 1,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "lightning_assassin",
      "cardId": "quick_attack",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "lightning_assassin",
      "cardId": "pierce",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "lightning_assassin",
      "cardId": "dual_slash",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "lightning_assassin",
      "cardId": "base_strike",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "lightning_assassin",
      "cardId": "base_pommel_strike",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "lightning_assassin",
      "cardId": "energy_surge",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "lightning_assassin",
      "cardId": "base_cleave",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "lightning_assassin",
      "cardId": "weaken",
      "count": 1,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "ice_mage",
      "cardId": "ice_spike",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "ice_mage",
      "cardId": "weaken",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "ice_mage",
      "cardId": "base_battle_cry",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "ice_mage",
      "cardId": "base_fireball",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "ice_mage",
      "cardId": "base_quick_guard",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "ice_mage",
      "cardId": "base_iron_defense",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "ice_mage",
      "cardId": "base_shield_block",
      "count": 2,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "ice_mage",
      "cardId": "poison_blade",
      "count": 1,
      "starter": true,
      "enabled": true
    },
    {
      "characterId": "forest_mage",
      "cardId": "base_quick_guard",
      "count": 1,
      "starter": true,
      "enabled": true
    }
  ],
  "blessings": {
    "mark_of_flame": {
      "id": "mark_of_flame",
      "name": "烈火之印",
      "icon": "🔥",
      "tag": "fire",
      "description": "所有火系卡牌与烈焰造成的伤害额外 +2 点",
      "modifiers": {
        "fireDamageBonus": 2
      }
    },
    "iron_bastion": {
      "id": "iron_bastion",
      "name": "坚钢壁障",
      "icon": "🛡️",
      "tag": "defense",
      "description": "所有防御卡牌获得的护盾额外 +2 点",
      "modifiers": {
        "shieldBonus": 2
      }
    },
    "fountain_of_life": {
      "id": "fountain_of_life",
      "name": "生命之泉",
      "icon": "🌿",
      "tag": "heal",
      "description": "所有治疗卡牌恢复的生命值额外 +2 点",
      "modifiers": {
        "healBonus": 2
      }
    },
    "swift_strike": {
      "id": "swift_strike",
      "name": "疾风战意",
      "icon": "⚡",
      "tag": "attack",
      "description": "所有攻击卡牌与普通攻击基础伤害额外 +1 点",
      "modifiers": {
        "damageBonus": 1
      }
    },
    "frost_embrace": {
      "id": "frost_embrace",
      "name": "极寒凝霜",
      "icon": "❄️",
      "tag": "ice",
      "description": "所有冰系卡牌造成的伤害额外 +2 点",
      "modifiers": {
        "iceDamageBonus": 2
      }
    },
    "venomous_edge": {
      "id": "venomous_edge",
      "name": "淬毒利刃",
      "icon": "🐍",
      "tag": "poison",
      "description": "所有毒系卡牌造成的伤害额外 +2 点",
      "modifiers": {
        "poisonDamageBonus": 2
      }
    }
  },
  "pveStages": [
    {
      "stageId": 1,
      "stageCode": "1-1",
      "stageName": "试炼之始",
      "recommendedPower": 100,
      "enemyName": "草原先锋",
      "enemyMaxHp": 120,
      "enemyDeck": [
        {
          "cardId": "base_strike",
          "count": 2
        },
        {
          "cardId": "base_cleave",
          "count": 2
        },
        {
          "cardId": "base_iron_wave",
          "count": 2
        },
        {
          "cardId": "base_twin_strike",
          "count": 2
        },
        {
          "cardId": "base_shield_block",
          "count": 2
        },
        {
          "cardId": "base_quick_guard",
          "count": 2
        },
        {
          "cardId": "base_pommel_strike",
          "count": 2
        },
        {
          "cardId": "base_shrug_it_off",
          "count": 1
        }
      ],
      "firstClearRewardGold": 200,
      "firstClearRewardGems": 20,
      "firstClearRewardCardId": "base_strike",
      "repeatRewardGold": 50,
      "description": "新手试炼。对手只用基础打击与格挡，是学习斩杀线与能量覆盖节奏的一关。"
    },
    {
      "stageId": 2,
      "stageCode": "1-2",
      "stageName": "熔岩幼龙",
      "recommendedPower": 220,
      "enemyName": "熔岩幼龙",
      "enemyMaxHp": 150,
      "enemyDeck": [
        {
          "cardId": "base_fireball",
          "count": 2
        },
        {
          "cardId": "pve_combust",
          "count": 2
        },
        {
          "cardId": "base_inflame",
          "count": 2
        },
        {
          "cardId": "base_cleave",
          "count": 2
        },
        {
          "cardId": "base_twin_strike",
          "count": 2
        },
        {
          "cardId": "pve_bludgeon",
          "count": 2
        },
        {
          "cardId": "base_heavy_strike",
          "count": 2
        },
        {
          "cardId": "base_strike",
          "count": 1
        }
      ],
      "firstClearRewardGold": 300,
      "firstClearRewardGems": 30,
      "firstClearRewardCardId": "base_fireball",
      "repeatRewardGold": 80,
      "description": "灼烧开始登场：护盾会被持续烧穿，堆甲拖回合不再可靠。"
    },
    {
      "stageId": 3,
      "stageCode": "1-3",
      "stageName": "守卫之壁",
      "recommendedPower": 380,
      "enemyName": "古代魔像",
      "enemyMaxHp": 208,
      "enemyDeck": [
        {
          "cardId": "base_iron_defense",
          "count": 2
        },
        {
          "cardId": "pve_iron_bark",
          "count": 2
        },
        {
          "cardId": "pve_entrench",
          "count": 2
        },
        {
          "cardId": "base_heavy_strike",
          "count": 2
        },
        {
          "cardId": "pve_spark_sigil",
          "count": 2
        },
        {
          "cardId": "pve_bludgeon",
          "count": 1
        },
        {
          "cardId": "base_shield_block",
          "count": 1
        },
        {
          "cardId": "base_quick_guard",
          "count": 2
        },
        {
          "cardId": "base_battle_cry",
          "count": 1
        }
      ],
      "firstClearRewardGold": 500,
      "firstClearRewardGems": 50,
      "firstClearRewardCardId": "base_iron_defense",
      "repeatRewardGold": 120,
      "description": "高血量盾战，考验的是输出效率与耐久，而不是爆发。平均要打上七轮以上。"
    },
    {
      "stageId": 4,
      "stageCode": "1-4",
      "stageName": "暗影巨龙",
      "recommendedPower": 550,
      "enemyName": "暗影巨龙·阿扎卡",
      "enemyMaxHp": 198,
      "enemyDeck": [
        {
          "cardId": "base_fireball",
          "count": 2
        },
        {
          "cardId": "pve_spark_sigil",
          "count": 2
        },
        {
          "cardId": "base_heavy_strike",
          "count": 2
        },
        {
          "cardId": "pve_reaper",
          "count": 2
        },
        {
          "cardId": "base_iron_defense",
          "count": 2
        },
        {
          "cardId": "base_divine_heal",
          "count": 2
        },
        {
          "cardId": "base_inflame",
          "count": 2
        },
        {
          "cardId": "base_strike",
          "count": 1
        }
      ],
      "firstClearRewardGold": 1000,
      "firstClearRewardGems": 100,
      "firstClearRewardCardId": "pve_spark_sigil",
      "repeatRewardGold": 250,
      "description": "章节首领。爆发与治疗兼备，用初始卡组很难撼动它——先靠前三关的奖励去抽卡并强化 PVE 卡牌再来。"
    }
  ],
  "gachaPity": {
    "singleCostGold": 100,
    "tenPullCostGold": 900,
    "rates": {
      "common": 0.7,
      "rare": 0.22,
      "epic": 0.06,
      "legendary": 0.02
    },
    "tenPullGuaranteeRarity": "rare",
    "tenPullGuaranteeSlots": {
      "rare": 0.7,
      "epic": 0.23,
      "legendary": 0.07
    },
    "hardPityCounter": 80,
    "luckPerPull": 1.0,
    "luckSoftPityStart": 60,
    "luckSoftPityStep": 0.015,
    "duplicateGoldPvp": 40,
    "duplicateGoldMaxLevel": 60
  }
};
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.GAME_CONFIG;
    }
})(typeof window !== 'undefined' ? window : global);
