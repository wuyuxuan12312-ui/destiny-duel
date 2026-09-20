// Card database built from GAME_CONFIG, plus the visual/art classification layer.
(function(root) {
    // Visual identity per card: which SVG glyph, which procedural CSS art theme, and which
    // generated-illustration bucket to use. `element` drives all three so a card never looks
    // accidental just because nobody hand-assigned its art.
    const ELEMENT_PALETTES = {
        fire: { icon: '🔥', iconName: 'fire.svg', artTheme: 'theme-element-fire', color: '#ff6b35' },
        ice: { icon: '❄️', iconName: 'magic.svg', artTheme: 'theme-element-ice', color: '#4dd2ff' },
        poison: { icon: '🐍', iconName: 'poison.svg', artTheme: 'theme-element-poison', color: '#7ed957' },
        shield: { icon: '🛡️', iconName: 'shield.svg', artTheme: 'theme-element-shield', color: '#5c8fd6' },
        heal: { icon: '💚', iconName: 'heal.svg', artTheme: 'theme-element-heal', color: '#34d399' },
        energy: { icon: '⚡', iconName: 'lightning.svg', artTheme: 'theme-element-energy', color: '#ffd23f' },
        arcane: { icon: '🌀', iconName: 'magic.svg', artTheme: 'theme-element-arcane', color: '#c084fc' },
        strike: { icon: '🗡️', iconName: 'attack-sword.svg', artTheme: 'theme-element-strike', color: '#e8ecf4' },
        brute: { icon: '🔨', iconName: 'attack-sword.svg', artTheme: 'theme-element-brute', color: '#ff9f43' },
        mindgame: { icon: '👁️', iconName: 'magic.svg', artTheme: 'theme-element-mindgame', color: '#00e5d0' },
        blood: { icon: '🩸', iconName: 'attack-sword.svg', artTheme: 'theme-element-blood', color: '#e0475b' }
    };

    // Chinese-first keyword buckets. The ported cards carry Unity mechanic tags
    // (attack/branch/mindgame) rather than elements, so element is inferred from text.
    const ELEMENT_KEYWORDS = [
        // Only the re-anchored read cards are 态势; a plain HP/shield branch must not borrow the
        // mind-game art just because its text also carries the 【博弈】 prefix.
        ['mindgame', ['读心', '洞察', '预判', '识刃', '断咒', '镜像', '屏息', '读牌', '破壁', '态势', 'mindgame']],
        ['fire', ['火', '炎', '炽', '燃', '灼', '爆', '熔', '焰', 'flame', 'fire', 'burn', 'ignite', 'ember', 'spark']],
        ['ice', ['冰', '霜', '寒', '冻', '冰晶', 'ice', 'frost', 'chill', 'blizzard']],
        ['poison', ['毒', '蚀', '腐', '疫', '瘴', 'poison', 'toxic', 'venom', 'acid', 'plague']],
        ['heal', ['治愈', '治疗', '恢复', '回春', '圣', '生命', '草', '缝合', '进食', '收割', '重整', 'heal', 'mending', 'holy', 'vitality', 'salve', 'mend']],
        ['shield', ['盾', '壁', '甲', '壁垒', '守护', '格挡', '守卫', '巩固', '金属', '磐石', '要塞', '背水', '卸力', 'shield', 'barrier', 'armor', 'rampart', 'bastion', 'bulwark', 'ward', 'fortress', 'guard', 'defense', 'defensive']],
        ['energy', ['能量', '雷', '电', '风暴', '肾上腺', '突破极限', '升华', 'energy', 'mana', 'thunder', 'storm', 'surge', 'adrenaline']],
        ['arcane', ['虚弱', '诅咒', '易伤', '战吼', '暴怒', '恶魔', '魔法', '秘', '燃火', '侦察', 'curse', 'dispel', 'silence', 'chaos', 'rune', 'cry', 'demon', 'rampage']],
        ['blood', ['血', '处刑', '处决', '湮灭', '狂战', '献祭', '汲魂', 'blood', 'execute', 'execution', 'sacrifice', 'soul']],
        ['brute', ['重斩', '横扫', '强袭', '乱斩', '锤', '劈', '裂', '崩', '巨力', 'cleave', 'bludgeon', 'hammer', 'rupture', 'juggernaut', 'slam']]
    ];

    function classifyElement(cardId, name, description, tags, effectType, cardType) {
        const haystack = [cardId, name, description, (tags || []).join(' ')].join(' ').toLowerCase();
        for (const entry of ELEMENT_KEYWORDS) {
            const element = entry[0];
            const words = entry[1];
            for (const word of words) {
                if (haystack.indexOf(word) !== -1) return element;
            }
        }
        if (effectType === 'shield' || cardType === 'defense') return 'shield';
        if (effectType === 'heal') return 'heal';
        if (effectType === 'energy') return 'energy';
        if (effectType === 'status' || effectType === 'buff') return 'arcane';
        return 'strike';
    }

    function getCardVisual(cardId, tags, effectType, cardType, name, description) {
        const element = classifyElement(cardId, name || '', description || '', tags, effectType, cardType);
        const palette = ELEMENT_PALETTES[element] || ELEMENT_PALETTES.strike;
        return {
            element: element,
            icon: palette.icon,
            iconName: palette.iconName,
            artTheme: palette.artTheme,
            accentColor: palette.color
        };
    }

    root.ELEMENT_PALETTES = ELEMENT_PALETTES;
    root.getCardVisual = getCardVisual;

    // Unity's CardInstance ladders. Damage and heal grow +20%/+40% and +20%/+35%, shield grows
    // +25%/+50%; branch and reaction outcome values use the shield ladder in Unity too
    // (EffectSpec.ValueAtLevel), which is an inconsistency deliberately preserved for parity.
    const LEVEL_LADDERS = {
        damage: [1.00, 1.20, 1.40],
        shield: [1.00, 1.25, 1.50],
        heal: [1.00, 1.20, 1.35],
        spec: [1.00, 1.25, 1.50]
    };

    function ladder(kind, level) {
        const table = LEVEL_LADDERS[kind] || LEVEL_LADDERS.damage;
        return table[Math.min(Math.max(1, level | 0), 3) - 1];
    }

    function scaleEffectSpecs(specs, level) {
        if (!Array.isArray(specs) || specs.length === 0) return specs;
        const scale = root.MathUtil ? root.MathUtil.scaleByLevel : (v, m) => Math.round(v * m);
        return specs.map(spec => {
            const copy = Object.assign({}, spec);
            if (spec.status) return copy;                      // status stacks are level-independent in Unity
            if (typeof copy.value === 'number') {
                copy.value = scale(copy.value, ladder('spec', level));
            }
            if (typeof copy.count === 'number') copy.count = spec.count;
            return copy;
        });
    }

    function getCardScaledStats(card, level = 1) {
        if (root.PlayerCardInstance) {
            const instance = new root.PlayerCardInstance(card, level);
            if (instance && typeof instance === 'object') {
                instance.then_effects = scaleEffectSpecs(card.then_effects, instance.level);
                instance.else_effects = scaleEffectSpecs(card.else_effects, instance.level);
                if (card.reaction) {
                    instance.reaction = {
                        condition: card.reaction.condition,
                        effects: scaleEffectSpecs(card.reaction.effects, instance.level)
                    };
                }
            }
            return instance;
        }
        const lvl = Math.min(3, Math.max(1, Number(level) || 1));
        const scale = root.MathUtil ? root.MathUtil.scaleByLevel : (v, m) => Math.round(v * m);
        const scaled = Object.assign({}, card, {
            level: lvl,
            damage: card.damage > 0 ? scale(card.damage, ladder('damage', lvl)) : 0,
            shield: card.shield > 0 ? scale(card.shield, ladder('shield', lvl)) : 0,
            heal: card.heal > 0 ? scale(card.heal, ladder('heal', lvl)) : 0,
            then_effects: scaleEffectSpecs(card.then_effects, lvl),
            else_effects: scaleEffectSpecs(card.else_effects, lvl)
        });
        if (card.reaction) {
            scaled.reaction = {
                condition: card.reaction.condition,
                effects: scaleEffectSpecs(card.reaction.effects, lvl)
            };
        }
        return scaled;
    }

    function toTagArray(rawTags, id, cfg) {
        let tags = rawTags;
        if (typeof tags === 'string') {
            tags = tags.split(/[,，;|/]/).map(t => t.trim()).filter(Boolean);
        } else if (!Array.isArray(tags)) {
            tags = [];
        }
        if (tags.length === 0) {
            const haystack = [id, cfg.cardName || '', cfg.description || ''].join(' ').toLowerCase();
            if (/火|炎|灼|flame|fire|burn/.test(haystack)) tags = ['fire'];
            else if (/冰|霜|ice|frost/.test(haystack)) tags = ['ice'];
            else if (/毒|poison|toxic/.test(haystack)) tags = ['poison'];
            else if (/盾|壁|shield|armor|barrier/.test(haystack)) tags = ['defense'];
            else if (/愈|治疗|heal|holy/.test(haystack)) tags = ['heal'];
            else if (/能量|energy|mana/.test(haystack)) tags = ['resource'];
            else tags = ['attack'];
        }
        return tags;
    }

    function buildCardDatabase() {
        const configCards = (root.GAME_CONFIG && root.GAME_CONFIG.cards) ? root.GAME_CONFIG.cards : {};
        const cardIds = Object.keys(configCards);

        return cardIds.map(id => {
            const cfg = configCards[id] || {};
            const rawTags = toTagArray(cfg.tags, id, cfg);
            const effectType = cfg.effect_type || 'damage';
            const cardType = cfg.cardType || cfg.type || 'attack';
            const visual = getCardVisual(id, rawTags, effectType, cardType, cfg.cardName, cfg.description);
            const drawCount = Number(cfg.draw !== undefined ? cfg.draw : (cfg.draw_count || cfg.drawCount || 0));
            const selfDamage = Number(cfg.self_damage !== undefined ? cfg.self_damage : (cfg.selfDamage || 0));
            const procChance = Number(cfg.proc_chance !== undefined ? cfg.proc_chance : (cfg.procChance || 0));

            const cardObj = {
                id: id,
                name: cfg.cardName || cfg.name || id,
                cost: Number(cfg.cost !== undefined ? cfg.cost : 1),
                type: cardType,
                tier: cfg.rarity || 'common',
                rarity: cfg.rarity || 'common',
                pool_type: cfg.pool_type || 'Base',
                poolType: (cfg.pool_type || cfg.poolType || 'base').toLowerCase(),
                upgradeable: Boolean(cfg.upgradeable),
                effect_type: effectType,
                tags: rawTags,
                level: Number(cfg.level || 1),
                damage: Number(cfg.damage || 0),
                heal: Number(cfg.heal || 0),
                shield: Number(cfg.shield || 0),
                draw: drawCount,
                drawCount: drawCount,
                energy: Number(cfg.energy || 0),
                status: cfg.status || '',
                buff: cfg.buff || '',
                duration: Number(cfg.duration || 0),
                hit_count: Number(cfg.hit_count || 1),
                self_damage: selfDamage,
                selfDamage: selfDamage,
                proc_chance: procChance,
                procChance: procChance,
                condition: cfg.condition || '',
                condition_param: Number(cfg.condition_param || 0),
                condition_bonus: Number(cfg.condition_bonus || 0),
                then_effects: Array.isArray(cfg.then_effects) ? cfg.then_effects : [],
                else_effects: Array.isArray(cfg.else_effects) ? cfg.else_effects : [],
                reaction: cfg.reaction || null,
                targetType: cfg.target || cfg.targetType || 'enemy',
                target: cfg.target || cfg.targetType || 'enemy',
                desc: cfg.description || cfg.desc || '',
                description: cfg.description || cfg.desc || '',
                icon: visual.icon,
                iconName: visual.iconName,
                element: visual.element,
                artTheme: visual.artTheme,
                accentColor: visual.accentColor,
                effects: cfg.effects || (root.CardSystem ? root.CardSystem.getEffects(Object.assign({ id: id }, cfg)) : null),
                effect: function(user, target, game) {
                    if (root.CardEffectEngine) {
                        root.CardEffectEngine.execute(this, {
                            user,
                            target,
                            game,
                            sourceName: this.name,
                            sourceItem: this
                        });
                    } else if (root.EffectResolver && root.CardSystem) {
                        root.EffectResolver.resolve(root.CardSystem.getEffects(this), {
                            user,
                            target,
                            game,
                            sourceName: this.name,
                            sourceItem: this
                        });
                    }
                }
            };

            if (root.CardRegistry) root.CardRegistry.register(id, cardObj);
            return cardObj;
        });
    }

    function rebuildPools() {
        root.CARD_DATABASE = buildCardDatabase();
        root.CARD_BY_ID = {};
        root.CARD_DATABASE.forEach(c => { root.CARD_BY_ID[c.id] = c; });
        root.BASE_CARDS = root.CARD_DATABASE.filter(c => c.pool_type === 'Base');
        root.PVP_CARDS = root.CARD_DATABASE.filter(c => c.pool_type === 'PVP');
        root.PVE_CARDS = root.CARD_DATABASE.filter(c => c.pool_type === 'PVE');
    }

    // Build a fresh deck for one side. cardIds are resolved by exact id only — there is no
    // legacy alias table any more, because the merged dataset keeps every surviving id unique
    // and an alias map silently retargeted `pierce` onto the ported `pvp_shield_breaker`.
    //
    // levelOverride carries another player's upgrade levels: online, each side ships its deck as
    // {cardIds, levels} and rebuilds it from its own card table, so every mechanic field and the
    // effect callback stay intact instead of being flattened onto the wire.
    function createShuffledDeck(characterId, customCardIds = null, rng = null, levelOverride = null) {
        const cardMap = root.CARD_BY_ID || {};
        const levelOf = (id, fallback) => {
            // An override map — even an empty one — is authoritative: online, each peer must build
            // the opponent's deck from the levels that peer was *told*, not from its own collection,
            // or the two sides would disagree about the same card.
            if (levelOverride) {
                const lv = Number(levelOverride[id]);
                return lv > 1 ? lv : 1;
            }
            return (root.DeckBuilder && typeof root.DeckBuilder.getCardLevel === 'function')
                ? root.DeckBuilder.getCardLevel(id) : fallback;
        };
        const deck = [];

        const pushCard = (baseCard, level) => {
            const scaled = getCardScaledStats(baseCard, level);
            deck.push(Object.assign({}, scaled, { uid: 'card_' + Math.random().toString(36).substr(2, 9) }));
        };

        if (Array.isArray(customCardIds) && customCardIds.length > 0) {
            customCardIds.forEach(cid => {
                const baseCard = cardMap[cid];
                if (baseCard) pushCard(baseCard, levelOf(cid, baseCard.level || 1));
            });
        } else {
            const pools = root.GAME_CONFIG && root.GAME_CONFIG.cardPools;
            const charPool = pools && characterId
                ? pools.filter(p => p.characterId === characterId && p.enabled !== false)
                : [];
            if (charPool.length > 0) {
                charPool.forEach(entry => {
                    const baseCard = cardMap[entry.cardId];
                    if (!baseCard) return;
                    const level = levelOf(entry.cardId, baseCard.level || 1);
                    for (let i = 0; i < (entry.count || 1); i++) pushCard(baseCard, level);
                });
            } else {
                const pool = (root.BASE_CARDS && root.BASE_CARDS.length > 0) ? root.BASE_CARDS : root.CARD_DATABASE;
                pool.slice(0, 8).forEach(card => {
                    const level = levelOf(card.id, card.level || 1);
                    pushCard(card, level);
                    pushCard(card, level);
                });
            }
        }

        // Shuffle with the match's seeded RNG when one is available so online lockstep peers
        // deal identical decks; Math.random() only as a headless fallback.
        const random = typeof rng === 'function' ? rng : Math.random;
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            const tmp = deck[i];
            deck[i] = deck[j];
            deck[j] = tmp;
        }
        return deck;
    }

    root.createShuffledDeck = createShuffledDeck;
    root.getCardScaledStats = getCardScaledStats;
    root.scaleEffectSpecs = scaleEffectSpecs;
    root.LEVEL_LADDERS = LEVEL_LADDERS;
    root.createCardInstance = function(cardOrId, level = 1) {
        const base = typeof cardOrId === 'string' ? (root.CARD_BY_ID || {})[cardOrId] : cardOrId;
        return getCardScaledStats(base, level);
    };
    root.refreshCardDatabase = rebuildPools;

    rebuildPools();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            CARD_DATABASE: root.CARD_DATABASE,
            BASE_CARDS: root.BASE_CARDS,
            PVP_CARDS: root.PVP_CARDS,
            PVE_CARDS: root.PVE_CARDS,
            createShuffledDeck,
            getCardScaledStats,
            createCardInstance: root.createCardInstance
        };
    }
})(typeof window !== 'undefined' ? window : global);
