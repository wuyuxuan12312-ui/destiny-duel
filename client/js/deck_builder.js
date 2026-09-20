// Deck Builder & Card Upgrade System (15-Card Deck Management)
(function(root) {
    // --- 卡组构筑硬性规则（唯一真源，UI 与存档校验共用）---
    const DECK_SIZE = 15;      // 必须恰好 15 张
    const MAX_COPIES = 2;      // 单卡同名上限
    const MAX_LEGENDARY = 2;   // 传说(SSR)上限
    const MAX_EPIC = 3;        // 史诗(SR)上限
                               // 普通/稀有不受限

    class DeckBuilder {
        constructor() {
            this.currentHeroId = 'fire_warrior';
            this.currentFilterTag = 'all';
            this.goldStorageKey = 'destiny_duel_player_gold';
            this.levelStorageKey = 'destiny_duel_card_levels';
            this.deckStoragePrefix = 'destiny_duel_custom_deck_';

            this.defaultDecks = DeckBuilder.readOpeningDecksFromConfig();


            if (typeof document !== 'undefined') {
                this.initElements();
                this.bindEvents();
            }
        }

        // --- Data & Persistence APIs ---
        /**
         * Opening decks come from the workbook's CardPools table. They used to be hard-coded here
         * against a set of base_* ids that no generator ever produced, so every hero silently fell
         * back to a shuffled pool and the deck editor's "default" was a fiction.
         */
        static readOpeningDecksFromConfig() {
            const decks = {};
            const pools = (root.GAME_CONFIG && root.GAME_CONFIG.cardPools) || [];
            const known = new Set((root.CARD_DATABASE || []).map(c => c.id));
            pools.forEach(entry => {
                if (!entry || !entry.characterId) return;
                if (entry.enabled === false || entry.enabled === 0) return;
                if (known.size && !known.has(entry.cardId)) return;
                const list = decks[entry.characterId] || (decks[entry.characterId] = []);
                for (let i = 0; i < (Number(entry.count) || 1); i++) list.push(entry.cardId);
            });
            return decks;
        }

        getOpeningDeck(heroId) {
            return (DeckBuilder.readOpeningDecksFromConfig()[heroId] || []).slice();
        }

        // --- Deck Validation ---
        /**
         * 卡组条目既可能是卡牌 id（存档 / workingDeck 里存的就是 id），
         * 也可能直接是卡牌对象（调用方手里已有对象时）。
         *
         * ⚠️ 这里必须解析：写规则时很容易顺手写成 `c.tier`，但传入的是字符串 id，
         * 于是 `c.tier` 恒为 undefined、传说与史诗计数永远是 0，规则**静默失效**。
         * 所以下面统一走 resolveCard()。
         */
        resolveCard(entry) {
            if (!entry) return null;
            if (typeof entry === 'object') return entry;
            const db = root.CARD_DATABASE || [];
            return db.find(c => c.id === entry) || null;
        }

        static rarityOf(card) {
            if (!card) return 'common';
            return String(card.tier || card.rarity || 'common').toLowerCase();
        }

        /** 统计卡组里的传说 / 史诗张数（无法解析的条目按普通处理，不静默算成传说） */
        getRarityQuota(deck) {
            const quota = { legendary: 0, epic: 0 };
            (deck || []).forEach(entry => {
                const card = this.resolveCard(entry);
                const r = DeckBuilder.rarityOf(card);
                if (r === 'legendary') quota.legendary++;
                else if (r === 'epic') quota.epic++;
            });
            return quota;
        }

        /**
         * 卡组是否合规。返回 boolean（对外契约）。
         * 需要失败原因时用 validateDeckDetailed()。
         */
        validateDeck(deck) {
            return this.validateDeckDetailed(deck).valid;
        }

        validateDeckDetailed(deck) {
            if (!Array.isArray(deck) || deck.length !== DECK_SIZE) {
                return {
                    valid: false,
                    message: `卡组必须恰好包含 ${DECK_SIZE} 张卡牌（当前 ${Array.isArray(deck) ? deck.length : 0} 张）！`,
                    legendary: 0, epic: 0
                };
            }

            const copies = {};
            let legendary = 0, epic = 0;
            for (const entry of deck) {
                const card = this.resolveCard(entry);
                if (!card) {
                    return { valid: false, message: `卡组里含有无法识别的卡牌「${entry}」！`, legendary, epic };
                }
                const id = card.id;
                copies[id] = (copies[id] || 0) + 1;
                if (copies[id] > MAX_COPIES) {
                    return {
                        valid: false,
                        message: `「${card.name || id}」已放入 ${copies[id]} 张，单卡同名上限为 ${MAX_COPIES} 张！`,
                        legendary, epic
                    };
                }
                const r = DeckBuilder.rarityOf(card);
                if (r === 'legendary') legendary++;
                else if (r === 'epic') epic++;
            }

            if (legendary > MAX_LEGENDARY) {
                return {
                    valid: false,
                    message: `传说卡 ${legendary} 张，每个角色最多携带 ${MAX_LEGENDARY} 张！`,
                    legendary, epic
                };
            }
            if (epic > MAX_EPIC) {
                return {
                    valid: false,
                    message: `史诗卡 ${epic} 张，每个角色最多携带 ${MAX_EPIC} 张！`,
                    legendary, epic
                };
            }
            return { valid: true, message: '', legendary, epic };
        }

        /** 这张卡还能不能再加一张进卡组（配卡界面实时置灰用） */
        canAddCard(deck, card) {
            if (!card) return { ok: false, reason: '卡牌数据为空' };
            if ((deck || []).length >= DECK_SIZE) return { ok: false, reason: '卡组已满' };

            const copies = (deck || []).filter(e => {
                const c = this.resolveCard(e);
                return c && c.id === card.id;
            }).length;
            if (copies >= MAX_COPIES) return { ok: false, reason: `已满${MAX_COPIES}张` };

            const quota = this.getRarityQuota(deck);
            const r = DeckBuilder.rarityOf(card);
            if (r === 'legendary' && quota.legendary >= MAX_LEGENDARY) {
                return { ok: false, reason: `传说名额已满 ${quota.legendary}/${MAX_LEGENDARY}` };
            }
            if (r === 'epic' && quota.epic >= MAX_EPIC) {
                return { ok: false, reason: `史诗名额已满 ${quota.epic}/${MAX_EPIC}` };
            }
            return { ok: true, reason: '' };
        }

        getPlayerGold() {
            return root.Wallet ? root.Wallet.getGold() : 2000;
        }

        setPlayerGold(amount) {
            if (root.Wallet) {
                root.Wallet.setGold(amount);
                root.Wallet.refreshHud();
            }
            const dbGold = root.document && root.document.getElementById
                ? root.document.getElementById('deck-builder-gold') : null;
            if (dbGold) dbGold.textContent = Math.max(0, Math.round(amount)).toLocaleString();
        }

        getCardLevels() {
            if (root.Wallet) return root.Wallet.getLevels();
            try {
                if (typeof localStorage === 'undefined') return {};
                const data = localStorage.getItem(this.levelStorageKey);
                return data ? JSON.parse(data) : {};
            } catch (e) {
                return {};
            }
        }

        getCardLevel(cardId) {
            const resolvedId = cardId;
            const levels = this.getCardLevels();
            return Number(levels[resolvedId]) || 1;
        }

        getUpgradeCost(cardId) {
            const level = this.getCardLevel(cardId);
            return level * 50;
        }

        upgradeCard(cardId) {
            const resolvedId = cardId;
            const card = root.CARD_DATABASE ? root.CARD_DATABASE.find(c => c.id === resolvedId) : null;
            if (!card || !card.upgradeable) {
                return { success: false, message: `卡牌「${card ? card.name : resolvedId}」为竞技/基础卡牌，属性已固定，不可升级！仅PVE成长卡牌可升级。` };
            }
            const maxLevel = (card && card.maxLevel) ? card.maxLevel : 3;
            const currentLevel = this.getCardLevel(resolvedId);
            if (currentLevel >= maxLevel) {
                return { success: false, message: `卡牌「${card ? card.name : resolvedId}」已达到最高等级 (Lv.${maxLevel})！` };
            }
            const cost = this.getUpgradeCost(resolvedId);
            const gold = this.getPlayerGold();
            if (gold < cost) {
                return { success: false, message: `金币不足！升级需要 ${cost} 金币 (当前拥有: ${gold})！` };
            }

            this.setPlayerGold(gold - cost);
            const levels = this.getCardLevels();
            levels[resolvedId] = currentLevel + 1;
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(this.levelStorageKey, JSON.stringify(levels));
                }
            } catch (e) {}

            return { success: true, newLevel: currentLevel + 1, cost };
        }

        getDefaultDeck(heroId) {
            let hid = heroId || 'fire_warrior';
            if (hid === 'flame_swordsman') hid = 'fire_warrior';
            if (hid === 'iron_guard') hid = 'iron_guardian';
            if (hid === 'forest_warlock') hid = 'forest_mage';

            if (this.defaultDecks[hid]) {
                return [...this.defaultDecks[hid]];
            }
            return [
                'base_quick_attack', 'base_quick_attack', 'base_heavy_strike', 'base_heavy_strike',
                'base_small_shield', 'base_small_shield', 'base_defensive_stance', 'base_defensive_stance',
                'base_heal', 'base_focus', 'base_energy_surge', 'base_energy_surge',
                'base_dual_slash', 'base_dual_slash', 'base_purify'
            ];
        }

        getDeck(heroId) {
            let hid = heroId || 'fire_warrior';
            if (hid === 'flame_swordsman') hid = 'fire_warrior';
            if (hid === 'iron_guard') hid = 'iron_guardian';
            if (hid === 'forest_warlock') hid = 'forest_mage';

            try {
                if (typeof localStorage !== 'undefined') {
                    const raw = localStorage.getItem(this.deckStoragePrefix + hid);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            const cleaned = parsed.map(id => id).filter(id => {
                                return root.CARD_DATABASE ? root.CARD_DATABASE.some(c => c.id === id) : true;
                            });
                            // 存档也要过一遍规则：旧版本存档可能带着不合规的稀有度配比，
                            // 放进来会让战斗端拿着违规卡组开局。
                            if (this.validateDeck(cleaned)) {
                                return cleaned;
                            }
                        }
                    }
                }
            } catch (e) {}
            return this.getDefaultDeck(hid);
        }

        saveDeck(heroId, cardIds) {
            let hid = heroId || 'fire_warrior';
            if (hid === 'flame_swordsman') hid = 'fire_warrior';
            if (hid === 'iron_guard') hid = 'iron_guardian';
            if (hid === 'forest_warlock') hid = 'forest_mage';

            // 张数、单卡上限、稀有度配额一次判完 —— 不能只判张数，
            // 否则 UI 被绕过（或将来多一个调用方）时违规卡组会直接落盘。
            const verdict = this.validateDeckDetailed(cardIds);
            if (!verdict.valid) {
                return { success: false, message: verdict.message };
            }

            const cleaned = cardIds.slice();
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(this.deckStoragePrefix + hid, JSON.stringify(cleaned));
                }
                return { success: true, message: '卡组保存成功！' };
            } catch (e) {
                return { success: false, message: '保存失败：' + e.message };
            }
        }

        // --- UI Controller ---
        initElements() {
            if (typeof document === 'undefined') return;
            this.modal = document.getElementById('modal-deck-builder');
            this.heroTabsContainer = document.getElementById('deck-hero-tabs');
            this.deckSlotsContainer = document.getElementById('deck-slots-grid');
            this.cardPoolContainer = document.getElementById('deck-cardpool-grid');
            this.deckCountDisplay = document.getElementById('deck-count-display');
            this.goldDisplay = document.getElementById('deck-builder-gold');
            this.filterTabsContainer = document.getElementById('deck-tag-filters');
            this.btnSave = document.getElementById('btn-save-deck');
            this.btnReset = document.getElementById('btn-reset-deck');
            this.btnRecommend = document.getElementById('btn-recommend-deck');
            this.btnClose = document.getElementById('btn-close-deck-builder');
        }

        bindEvents() {
            if (typeof document === 'undefined') return;
            if (this.btnClose && !this.btnClose._bound) {
                this.btnClose._bound = true;
                this.btnClose.addEventListener('click', () => this.closeModal());
            }

            if (this.modal && !this.modal._boundBackdrop) {
                this.modal._boundBackdrop = true;
                this.modal.addEventListener('click', (e) => {
                    if (e.target === this.modal) this.closeModal();
                });
            }

            if (this.btnSave && !this.btnSave._bound) {
                this.btnSave._bound = true;
                this.btnSave.addEventListener('click', () => {
                    const res = this.saveDeck(this.currentHeroId, this.workingDeck);
                    if (res.success) {
                        alert(`✅ 【${this.getHeroDisplayName(this.currentHeroId)}】15张对战卡组已保存！战斗将使用此配置。`);
                    } else {
                        alert(`⚠️ ${res.message}`);
                    }
                });
            }

            if (this.btnReset && !this.btnReset._bound) {
                this.btnReset._bound = true;
                this.btnReset.addEventListener('click', () => {
                    if (confirm('确定清空当前卡组吗？')) {
                        this.workingDeck = [];
                        this.renderDeckSlots();
                        this.renderCardPool();
                    }
                });
            }

            if (this.btnRecommend && !this.btnRecommend._bound) {
                this.btnRecommend._bound = true;
                this.btnRecommend.addEventListener('click', () => {
                    this.workingDeck = this.getDefaultDeck(this.currentHeroId);
                    this.renderDeckSlots();
                    this.renderCardPool();
                });
            }

            if (this.filterTabsContainer && !this.filterTabsContainer._bound) {
                this.filterTabsContainer._bound = true;
                this.filterTabsContainer.addEventListener('click', (e) => {
                    const tab = e.target.closest('.tag-filter-btn');
                    if (tab && tab.dataset.tag) {
                        this.currentFilterTag = tab.dataset.tag;
                        this.filterTabsContainer.querySelectorAll('.tag-filter-btn').forEach(b => b.classList.remove('active'));
                        tab.classList.add('active');
                        this.renderCardPool();
                    }
                });
            }
        }

        getHeroDisplayName(heroId) {
            const map = {
                fire_warrior: '烈焰剑士',
                flame_swordsman: '烈焰剑士',
                iron_guardian: '钢铁守卫',
                iron_guard: '钢铁守卫',
                forest_mage: '森林术士',
                forest_warlock: '森林术士',
                lightning_assassin: '雷电刺客',
                ice_mage: '冰霜法师'
            };
            return map[heroId] || heroId;
        }

        openModal(heroId = 'fire_warrior') {
            this.initElements();
            this.bindEvents();

            let hid = heroId;
            if (hid === 'flame_swordsman') hid = 'fire_warrior';
            if (hid === 'iron_guard') hid = 'iron_guardian';
            if (hid === 'forest_warlock') hid = 'forest_mage';

            this.currentHeroId = hid;
            this.workingDeck = [...this.getDeck(hid)];
            if (this.goldDisplay) this.goldDisplay.textContent = this.getPlayerGold();

            this.renderHeroTabs();
            this.renderDeckSlots();
            this.renderCardPool();

            if (this.modal) {
                this.modal.classList.add('active');
                this.modal.style.display = 'flex';
            }
        }

        closeModal() {
            if (this.modal) {
                this.modal.classList.remove('active');
                this.modal.style.display = 'none';
            }
        }

        renderHeroTabs() {
            if (!this.heroTabsContainer) return;
            const heroes = [
                { id: 'fire_warrior', name: '烈焰剑士', icon: '🔥', role: '狂暴输出' },
                { id: 'iron_guardian', name: '钢铁守卫', icon: '🛡️', role: '重装防御' },
                { id: 'forest_mage', name: '森林术士', icon: '🌿', role: '持续恢复/毒' },
                { id: 'lightning_assassin', name: '雷电刺客', icon: '⚡', role: '暴击斩杀' },
                { id: 'ice_mage', name: '冰霜法师', icon: '❄️', role: '极寒控制' }
            ];

            this.heroTabsContainer.innerHTML = '';
            heroes.forEach(h => {
                const btn = document.createElement('button');
                btn.className = `deck-hero-tab-btn ${this.currentHeroId === h.id ? 'active' : ''}`;
                btn.innerHTML = `${h.icon} <strong>${h.name}</strong> <span class="tab-role">${h.role}</span>`;
                btn.addEventListener('click', () => {
                    this.currentHeroId = h.id;
                    this.workingDeck = [...this.getDeck(h.id)];
                    this.renderHeroTabs();
                    this.renderDeckSlots();
                    this.renderCardPool();
                });
                this.heroTabsContainer.appendChild(btn);
            });
        }

        renderDeckSlots() {
            if (!this.deckSlotsContainer) return;
            this.deckSlotsContainer.innerHTML = '';

            const cardMap = {};
            if (root.CARD_DATABASE) {
                root.CARD_DATABASE.forEach(c => { cardMap[c.id] = c; });
            }

            const count = this.workingDeck.length;
            if (this.deckCountDisplay) {
                const quota = this.getRarityQuota(this.workingDeck);
                const quotaHtml =
                    `<span class="deck-quota" title="每个角色最多携带 ${MAX_LEGENDARY} 张传说、${MAX_EPIC} 张史诗">` +
                    `传说 <strong style="color:${quota.legendary > MAX_LEGENDARY ? '#e74c3c' : '#f1c40f'}">${quota.legendary}/${MAX_LEGENDARY}</strong>` +
                    ` · 史诗 <strong style="color:${quota.epic > MAX_EPIC ? '#e74c3c' : '#b07cf0'}">${quota.epic}/${MAX_EPIC}</strong>` +
                    `</span>`;
                this.deckCountDisplay.innerHTML = `已选择: <strong style="color: ${count === 15 ? '#2ecc71' : '#ffaa00'}">${count} / ${DECK_SIZE}</strong> 张 ${count === 15 ? '<span class="deck-ready-badge">✅ 卡组已就绪</span>' : '<span class="deck-warn-badge">⚠️ 需选满15张</span>'} ${quotaHtml}`;
            }

            const verdict = this.validateDeckDetailed(this.workingDeck);
            if (this.btnSave) {
                this.btnSave.disabled = !verdict.valid;
                this.btnSave.style.opacity = verdict.valid ? '1' : '0.5';
                this.btnSave.title = verdict.valid ? '' : verdict.message;
            }

            // Render 15 slots
            for (let i = 0; i < 15; i++) {
                const rawCardId = this.workingDeck[i];
                const cardId = rawCardId;
                const slotEl = document.createElement('div');
                slotEl.className = `deck-slot-card ${cardId ? 'filled' : 'empty'}`;

                if (cardId && cardMap[cardId]) {
                    const card = cardMap[cardId];
                    const level = this.getCardLevel(cardId);
                    const scaled = root.getCardScaledStats ? root.getCardScaledStats(card, level) : card;

                    let tagsHtml = '';
                    if (scaled.tags && Array.isArray(scaled.tags)) {
                        tagsHtml = scaled.tags.map(t => `<span class="slot-tag-pill tag-${t}">${this.formatTag(t)}</span>`).join('');
                    }

                    let statHint = '';
                    if (scaled.damage > 0) statHint += `⚔️${scaled.damage} `;
                    if (scaled.shield > 0) statHint += `🛡️${scaled.shield} `;
                    if (scaled.heal > 0) statHint += `🌿${scaled.heal} `;

                    slotEl.innerHTML = `
                        <div class="slot-remove-badge" title="移出卡组">✕</div>
                        <div class="slot-cost-badge">${scaled.cost}</div>
                        <div class="slot-card-name">${scaled.name}</div>
                        <div class="slot-level-badge">Lv.${level}</div>
                        <div class="slot-stats-hint">${statHint || (card.poolType === 'pvp' ? '竞技' : (card.poolType === 'pve' ? '成长' : '基础'))}</div>
                        <div class="slot-tags-row">${tagsHtml}</div>
                    `;

                    slotEl.addEventListener('click', () => {
                        this.workingDeck.splice(i, 1);
                        this.renderDeckSlots();
                        this.renderCardPool();
                    });
                } else {
                    slotEl.innerHTML = `
                        <div class="empty-slot-icon">➕</div>
                        <div class="empty-slot-text">空卡位 #${i + 1}</div>
                    `;
                }

                this.deckSlotsContainer.appendChild(slotEl);
            }
        }

        renderCardPool() {
            if (!this.cardPoolContainer || !root.CARD_DATABASE) return;
            this.cardPoolContainer.innerHTML = '';

            const currentGold = this.getPlayerGold();
            const countsInDeck = {};
            this.workingDeck.forEach(id => {
                const resolved = id;
                countsInDeck[resolved] = (countsInDeck[resolved] || 0) + 1;
            });

            const filteredCards = root.CARD_DATABASE.filter(card => {
                if (this.currentFilterTag === 'all') return true;
                if (this.currentFilterTag === 'base' || this.currentFilterTag === 'pvp' || this.currentFilterTag === 'pve') {
                    return card.poolType === this.currentFilterTag;
                }
                if (!card.tags || !Array.isArray(card.tags)) return false;
                return card.tags.includes(this.currentFilterTag);
            });

            filteredCards.forEach(card => {
                const cardId = card.id;
                const level = this.getCardLevel(cardId);
                const scaled = root.getCardScaledStats ? root.getCardScaledStats(card, level) : card;
                const copiesInDeck = countsInDeck[cardId] || 0;
                // 加入判定统一走 canAddCard：张数 / 单卡上限 / 稀有度配额一次判完
                const addVerdict = this.canAddCard(this.workingDeck, card);
                const canAdd = addVerdict.ok;
                const upgradeCost = this.getUpgradeCost(cardId);
                const isUpgradeable = Boolean(card.upgradeable);
                const maxLevel = card.maxLevel || (isUpgradeable ? 3 : 1);
                const canUpgrade = isUpgradeable && (level < maxLevel) && (currentGold >= upgradeCost);

                const cardItem = document.createElement('div');
                cardItem.className = `pool-card-item tier-${card.tier || card.rarity || 'common'}`;

                let tagsHtml = '';
                if (scaled.tags && Array.isArray(scaled.tags)) {
                    tagsHtml = scaled.tags.map(t => `<span class="pool-tag-pill tag-${t}">${this.formatTag(t)}</span>`).join('');
                }

                let statDesc = '';
                if (scaled.damage > 0) statDesc += `⚔️伤害 ${scaled.damage} `;
                if (scaled.shield > 0) statDesc += `🛡️护盾 ${scaled.shield} `;
                if (scaled.heal > 0) statDesc += `🌿治疗 ${scaled.heal} `;

                const fullDesc = scaled.description || scaled.desc || card.description || statDesc || '无特殊描述';

                let poolBadge = '';
                if (card.poolType === 'base') poolBadge = '<span class="pool-type-badge base">基础通用</span>';
                else if (card.poolType === 'pvp') poolBadge = '<span class="pool-type-badge pvp">PVP竞技</span>';
                else if (card.poolType === 'pve') poolBadge = '<span class="pool-type-badge pve">PVE成长</span>';

                let upgradeBtnHtml = '';
                if (!isUpgradeable) {
                    upgradeBtnHtml = `<button class="btn-pool-upgrade disabled" disabled title="基础与PVP竞技卡牌数值平衡固定，不可升级">🔒 固定Lv.1</button>`;
                } else if (level >= maxLevel) {
                    upgradeBtnHtml = `<button class="btn-pool-upgrade disabled" disabled>⭐ 已满级(Lv.${maxLevel})</button>`;
                } else {
                    upgradeBtnHtml = `<button class="btn-pool-upgrade ${canUpgrade ? '' : 'disabled'}" ${canUpgrade ? '' : 'disabled'}>⭐ 升至Lv.${level + 1} (${upgradeCost}🪙)</button>`;
                }

                cardItem.innerHTML = `
                    <div class="pool-card-header">
                        <span class="pool-card-icon">${card.icon || '🃏'}</span>
                        <div class="pool-card-titles">
                            <strong class="pool-card-name">${scaled.name}</strong>
                            <div class="pool-card-meta-line">
                                <span class="pool-card-cost">⚡ ${scaled.cost} 能</span>
                                ${poolBadge}
                            </div>
                        </div>
                        <span class="pool-level-badge">Lv.${level}</span>
                    </div>
                    <div class="pool-card-tags">${tagsHtml}</div>
                    <div class="pool-card-desc">${fullDesc}</div>
                    <div class="pool-card-stats-row">${statDesc || `<span style="color:#64748b;font-size:11px;">类型: ${card.type || '技能'}</span>`}</div>
                    <div class="pool-card-actions">
                        <button class="btn-pool-add ${canAdd ? '' : 'disabled'}" ${canAdd ? '' : 'disabled'} title="${canAdd ? '' : addVerdict.reason}">
                            ${canAdd ? `➕ 加入 (${copiesInDeck}/${MAX_COPIES})` : addVerdict.reason}
                        </button>
                        ${upgradeBtnHtml}
                    </div>
                `;

                // Add to deck
                const btnAdd = cardItem.querySelector('.btn-pool-add');
                if (btnAdd && canAdd) {
                    btnAdd.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // 再判一次：渲染到点击之间卡组可能已经变了
                        if (this.canAddCard(this.workingDeck, card).ok) {
                            this.workingDeck.push(cardId);
                            this.renderDeckSlots();
                            this.renderCardPool();
                        }
                    });
                }

                // Upgrade card
                const btnUpgrade = cardItem.querySelector('.btn-pool-upgrade');
                if (btnUpgrade && isUpgradeable && level < maxLevel) {
                    btnUpgrade.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const res = this.upgradeCard(cardId);
                        if (res.success) {
                            if (root.soundManager) root.soundManager.playVictory();
                            this.renderDeckSlots();
                            this.renderCardPool();
                        } else {
                            if (typeof alert !== 'undefined') alert(res.message);
                        }
                    });
                }

                this.cardPoolContainer.appendChild(cardItem);
            });
        }

        formatTag(tag) {
            const map = {
                fire: '🔥 火焰',
                ice: '❄️ 冰霜',
                poison: '🐍 剧毒',
                defense: '🛡️ 防御',
                heal: '🌿 治疗',
                attack: '🗡️ 攻击',
                base: '🌟 基础',
                pvp: '⚔️ 竞技',
                pve: '🌿 成长',
                resource: '⚡ 资源',
                control: '🌀 控制',
                utility: '✨ 辅助'
            };
            return map[tag] || tag;
        }
    }

    root.DeckBuilder = new DeckBuilder();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.DeckBuilder;
    }
})(typeof window !== 'undefined' ? window : global);
