# 《宿命对决 Destiny Duel》游戏架构设计与开发者手册

> **阅读建议**：本文档旨在帮助任何新加入项目的开发者在 **30 分钟内** 全面掌握本项目底层引擎架构，并能独立扩展新英雄、新技能、新卡牌、新状态与新战斗机制。

---

## 目录
1. [架构核心设计哲学](#一架构核心设计哲学)
2. [项目目录与模块划分](#二项目目录与模块划分)
3. [核心系统与运行管道](#三核心系统与运行管道)
4. [新人 30 分钟快速开发教程](#四新人-30-分钟快速开发教程)
   - [教程 1：如何添加一个新英雄](#教程-1如何添加一个新英雄)
   - [教程 2：如何添加一个新技能](#教程-2如何添加一个新技能)
   - [教程 3：如何添加一张新卡牌](#教程-3如何添加一张新卡牌)
   - [教程 4：如何添加一个新状态-buffdebuff](#教程-4如何添加一个新状态-buffdebuff)
   - [教程 5：如何扩展一个全新机制-custom-effect](#教程-5如何扩展一个全新机制-custom-effect)
5. [多人联机与 GameState 同步规范](#五多人联机与-gamestate-同步规范)

---

## 一、架构核心设计哲学

《宿命对决》全面采用 **“数据配置驱动 (Data-Driven) + 事件总线 (Event-Driven) + 声明式效果 (Declarative Effects)”** 的现代游戏架构：

1. **零硬编码分支**：核心战斗逻辑中绝不存在 `if (hero === 'fire_warrior')` 或 `if (card === 'fire_flask')` 这样的硬编码特判。
2. **声明式效果流**：卡牌与技能只通过数据声明 `effects: [...]`（如造成伤害、增加护盾、施加状态等），由统一的 `EffectResolver` 调度执行。
3. **被动与规则解耦**：英雄被动、装备效果与规则机制均挂载于全局 `EventBus`，监听生命周期事件（`beforeDamage`, `onDamage`, `onTurnEnd` 等）做出响应。
4. **纯数据网络同步**：多人联机只同步纯数据快照与输入指令，不同步函数闭包，确保 WebRTC P2P 高性能与防脱节。

---

## 二、项目目录与模块划分

```text
card_game/
├── data/                       # 策划配置与静态数据
│   ├── game_config.js          # 前端全局配置聚合 (characters, skills, cards, statuses)
│   └── generated/              # 由 Excel 导出的各独立 JSON 表
│       ├── characters.json     # 英雄基础属性
│       ├── skills.json         # 角色技能配置
│       ├── cards.json          # 卡牌属性与效果
│       └── statuses.json       # 状态 Buff/Debuff 模板
│
├── src/                        # 游戏核心系统框架
│   ├── core/
│   │   ├── EventBus.js         # 高性能发布/订阅事件总线
│   │   ├── Registry.js         # 英雄、技能、卡牌、状态、效果注册表
│   │   └── GameState.js        # 纯数据状态快照与序列化
│   └── systems/
│       ├── DamageCalculator.js # 集中式伤害计算流水线
│       ├── StatusSystem.js     # 状态管理与叠加系统 (StatusManager)
│       ├── EffectResolver.js   # 统一效果解析器
│       ├── SkillSystem.js      # 技能执行器
│       ├── CardSystem.js       # 卡牌解析与执行器 (CardResolver)
│       ├── HeroManager.js      # 英雄实例创建与事件被动绑定
│       ├── TurnSystem.js       # 回合开始/结束生命周期
│       └── CombatSystem.js     # 战斗行动调度总线
│
├── js/                         # 适配器与业务层
│   ├── game.js                 # CardGame 引擎对外统一门面 (Facade)
│   ├── hero.js                 # 英雄数据库适配器
│   ├── card.js                 # 卡牌数据库与洗牌算法适配器
│   ├── network.js              # WebRTC P2P 联机管理器 (PeerJS)
│   ├── ui.js                   # 前端界面、动画反馈与触屏控制器
│   └── audio.js                # 音效管理器
│
├── tools/                      # 自动化运维工具
│   ├── test_ice_mage.js        # 新架构扩展性自动化测试
│   └── sync_balance.py         # Excel 与 JSON 同步脚本
│
├── simulate_matchups.js        # 3000场蒙特卡洛平衡模拟器
├── index.html                  # 网页入口
├── style.css                   # 全局五级自适应响应式样式表
└── ARCHITECTURE.md             # 本架构手册
```

---

## 三、核心系统与运行管道

### 1. 伤害计算流水线 (DamageCalculator)
所有普通攻击、卡牌攻击、技能攻击均经过以下标准管线：
```text
[攻击基础伤害 (Raw Damage)]
       │
       ▼
[beforeDamage 事件钩子] ───► (暴击翻倍判定、特定强化)
       │
       ▼
[攻击方增伤 Buff] ─────────► (专注加伤 +2、残局 Rising Fury 渐进加伤)
       │
       ▼
[攻击方减伤 Debuff] ───────► (虚弱状态减伤 -2)
       │
       ▼
[防御方被动/固定减伤] ─────► (钢铁壁垒 -1、坚甲被动 -1)
       │
       ▼
[防御方百分比减伤] ────────► (防守姿态降低 40%)
       │
       ▼
[爆发伤害上限裁决] ────────► (防止秒杀的 Max Burst Cap 校验)
       │
       ▼
[护盾吸收与穿刺分流] ──────► (先扣减穿刺真伤，余量护盾吸收，溢出扣减 HP)
       │
       ▼
[HP 扣减与死亡判定] ───────► (触发 onDamage 与 onDeath 事件)
```

### 2. 状态叠加与生命周期 (StatusSystem)
支持 4 种通用的状态堆叠策略 (`stackRule`)：
- `stack_duration_refresh`：层数相加（受 `maxStacks` 约束），持续时间刷新（如【灼烧】）。
- `stack_infinite`：层数无上限累加，持续时间刷新（如【剧毒】）。
- `refresh_only`：层数固定为 1，仅重置或延长持续时间（如【虚弱】、【冰冻】）。
- `consume_on_hit`：生效一次后即自动消耗（如【专注加伤】、【坚壁格挡】）。

---

## 四、新人 30 分钟快速开发教程

### 教程 1：如何添加一个新英雄
**示例需求**：新增英雄【冰霜法师】(`ice_mage`)，HP: 30，攻击: 4，拥有专属被动【冰霜亲和】与专属技能【寒冰箭】。

1. 打开 `data/generated/characters.json`（或在 Excel 中配置后同步），添加：
```json
"ice_mage": {
  "characterId": "ice_mage",
  "characterName": "冰霜法师",
  "role": "控制 / 极寒冰封",
  "maxHp": 30,
  "baseAttack": 4,
  "startingEnergy": 3,
  "maxEnergy": 6,
  "passiveId": "ice_mage_passive",
  "skillId": "ice_mage_skill",
  "description": "掌控寒冰秘术的法师，能发动寒冰箭造成 5 点伤害并冰冻对手。"
}
```
2. （可选）如果该英雄有基于事件触发的专属被动，在 `src/systems/HeroManager.js` 的 `HeroManager.registerPassive` 中注册：
```javascript
HeroManager.registerPassive('ice_mage_passive', (player, eventBus, game) => {
    // 例如：被动效果为受到火系伤害减免 1 点
    eventBus.on('beforeDamage', (evt) => {
        if (evt.defender === player && evt.options.source?.includes('灼')) {
            evt.rawDamage = Math.max(1, evt.rawDamage - 1);
            game.log(`❄️【冰霜亲和】${player.name} 抵御了火焰热浪，伤害 -1！`);
        }
    });
});
```

---

### 教程 2：如何添加一个新技能
**示例需求**：为冰霜法师配置技能【寒冰箭】(`ice_mage_skill`)，消耗 2 能量，冷却 2 回合，造成 5 点伤害，并附加 1 回合【冰冻】。

打开 `data/generated/skills.json`，声明式定义 `effects`：
```json
"ice_mage_skill": {
  "skillId": "ice_mage_skill",
  "characterId": "ice_mage",
  "skillName": "寒冰箭",
  "cost": 2,
  "cooldown": 2,
  "effects": [
    { "type": "damage", "value": 5 },
    { "type": "apply_status", "status": "freeze", "duration": 1, "stacks": 1 }
  ],
  "description": "造成 5 点伤害，并附加 1 回合冰冻状态。"
}
```
**无需编写任何 JavaScript 代码，技能系统将自动解析执行！**

---

### 教程 3：如何添加一张新卡牌
**示例需求**：新增一张卡牌【圣光治愈】(`holy_heal`)，消耗 1 能量，恢复 3 点生命并抽 1 张牌。

打开 `data/generated/cards.json`：
```json
"holy_heal": {
  "cardId": "holy_heal",
  "cardName": "圣光治愈",
  "cost": 1,
  "cardType": "heal",
  "rarity": "rare",
  "effects": [
    { "type": "heal", "value": 3 },
    { "type": "draw_card", "count": 1 }
  ],
  "description": "恢复 3 点生命，并抽取 1 张手牌。"
}
```

---

### 教程 4：如何添加一个新状态 (Buff/Debuff)
**示例需求**：新增【冰冻】(`freeze`) 状态，持续 1 回合，回合开始时阻止该玩家普攻与技能。

1. 打开 `data/generated/statuses.json` 添加模板：
```json
"freeze": {
  "statusId": "freeze",
  "statusName": "冰冻",
  "category": "debuff",
  "triggerTiming": "turn_start",
  "duration": 1,
  "maxStacks": 1,
  "stackRule": "refresh_only",
  "description": "目标处于极寒冰冻之中，回合开始时被冻结无法行动"
}
```
2. 在 `src/systems/StatusSystem.js` 的 `tick()` 中响应对应逻辑：
```javascript
else if (st.statusId === 'freeze') {
    if (timing === 'turn_start') {
        game.log(`❄️【冰冻判定】${player.name} 处于深度冰冻状态！无法行动！`);
        player.canNormalAttackThisTurn = false;
        player.hasUsedSkill = true;
    }
}
```

---

### 教程 5：如何扩展一个全新机制 (Custom Effect)
**示例需求**：希望游戏支持全新机制【吸血】(`lifesteal`)：造成伤害的同时恢复自身等量生命值。

只需在 `src/systems/EffectResolver.js` 注册一个新的 Effect 处理器：
```javascript
EffectResolver.register('lifesteal', (effect, context) => {
    const { user, target, game, sourceName } = context;
    const dmg = Number(effect.value || 0);

    // 1. 造成伤害
    const res = DamageCalculator.execute(user, target, dmg, { source: sourceName }, game);

    // 2. 将造成的 HP 伤害转化为自身治疗
    if (res.hpDmg > 0 && game.healPlayer) {
        game.healPlayer(user, res.hpDmg, '吸血转化');
    }
});
```
注册后，任何卡牌或技能都可以直接使用 `{ "type": "lifesteal", "value": 4 }`！

---

## 五、多人联机与 GameState 同步规范

在 WebRTC P2P 联机模式下，客户端之间仅同步操作指令（`ACTION`）与纯数据状态：

1. **指令广播**：
   - 普通攻击：`{ type: 'ACTION', action: { type: 'NORMAL_ATTACK' } }`
   - 释放技能：`{ type: 'ACTION', action: { type: 'HERO_SKILL' } }`
   - 打出卡牌：`{ type: 'ACTION', action: { type: 'PLAY_CARD', cardIndex: 0 } }`
   - 结束回合：`{ type: 'ACTION', action: { type: 'END_TURN' } }`

2. **状态快照 (GameState.serialize)**：
   用于断线重连、回合校验或观战，只包含纯 JSON 数据结构（`players`, `turnCount`, `hand`, `deckCount`, `statuses` 等），**严禁在 GameState 中附带任何函数、DOM 元素或复杂原型对象**。

---

## 六、Excel 游戏制作工具 (Game Studio Editor) 指南

本项目已全面升级 `CardGame_Balance.xlsx` 为游戏工作室制作工具，结合 `tools/editor.py` 与桌面快捷方式 `CardGame_Editor.bat`，普通玩家也能轻松设计新玩法：

### 1. 首页控制面板 (Dashboard Sheet)
- **实时统计**：实时汇总当前英雄总数、技能总数、卡牌总数、状态总数。
- **8 大核心功能入口**：
  1. 创建英雄 (Create Hero)
  2. 创建卡牌 (Create Card)
  3. 创建技能 (Create Skill)
  4. 创建状态 (Create Status)
  5. 同步游戏 (Sync Game to JSON)
  6. 数据检查 (Data Check)
  7. 生成平衡报告 (Generate Balance Report)
  8. 启动游戏 (Launch Game)

### 2. 全自动 ID 系统 (Auto-ID System)
禁止手动输入杂乱 ID，由生成器统一分配规范且全局唯一的 ID：
- 英雄：`hero_0001` ~ `hero_9999`
- 技能：`skill_0001` ~ `skill_9999`
- 卡牌：`card_0001` ~ `card_9999`
- 状态：`status_0001` ~ `status_9999`

### 3. 模板库系统 (Templates Sheet)
提供 5 大英雄原型与 9 种经典卡牌原型：
- **英雄模板**：输出型、防御型、治疗型、刺客型、控制型
- **卡牌模板**：轻攻击、高费强袭、破盾穿刺、战斗护盾、防守姿态、调息抽牌、附魔灼烧、能量爆发等

### 4. 无代码效果编辑器 (Effect Editor)
在 Cards 和 CharacterSkills 表中配置效果，只需在下拉列表选择 `EffectType1` 与 `EffectType2`：
- `damage`、`shield`、`heal`、`draw_card`、`gain_energy`、`apply_status`、`modify_damage`、`steal_card`、`self_damage`
- 同步引擎会自动将其编译为底层架构识别的 `effects: [...]` 结构。

### 5. 一键使用指南
双击桌面上的 **`CardGame_Editor.bat`**，即可开启交互式制作控制台，输入编号 `1~8` 便捷完成制作、体检与同步！

---
*文档更新日期：2026年9月14日*
*宿命对决 架构核心团队*
