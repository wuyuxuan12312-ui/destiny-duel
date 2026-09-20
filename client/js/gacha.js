// Destiny Duel - Card Gacha (Summon) & Card Collection Controller (Enhanced UI)
(function(root) {
    class CardGameGacha {
        constructor() {
            this.activePack = null;
            this.gold = root.Wallet ? root.Wallet.getGold() : 2000;

            // Collection Filter & View State
            this.currentTab = 'cards';
            this.typeFilter = 'all';
            this.rarityFilter = 'all';
            this.ownedFilter = 'all';
            this.searchQuery = '';
            this.allCards = [];
            this.allHeroes = [];

            if (typeof document !== 'undefined') {
                this.initDOMElements();
            }
        }

        getStoredCollection() {
            try {
                const raw = localStorage.getItem('destiny_duel_user_collection');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object') return parsed;
                }
            } catch (e) {}
            // Default 5 starter cards
            const starter = {
                quick_attack: 2,
                small_shield: 2,
                small_heal: 2,
                meditation: 2,
                pierce: 2
            };
            this.saveStoredCollection(starter);
            return starter;
        }

        saveStoredCollection(col) {
            try {
                localStorage.setItem('destiny_duel_user_collection', JSON.stringify(col));
            } catch (e) {}
        }

        recordDrawnCards(results) {
            const col = this.getStoredCollection();
            results.forEach(item => {
                const card = item.card;
                const cid = card.id || card.cardId;
                const oldCount = Number(col[cid]) || 0;
                col[cid] = oldCount + 1;
                item.isNew = (oldCount === 0);
                item.ownedCount = col[cid];
            });
            this.saveStoredCollection(col);
        }

        initDOMElements() {
            this.modalGacha = document.getElementById('modal-gacha');
            this.modalCollection = document.getElementById('modal-collection');
            this.gachaPackContainer = document.getElementById('gacha-packs-container');
            this.gachaResultContainer = document.getElementById('gacha-results-area');
            this.playerGoldDisplay = document.getElementById('player-gold-val');
            this.collectionGrid = document.getElementById('collection-cards-grid');
            this.collectionHeroesGrid = document.getElementById('collection-heroes-grid');
            this.cardsToolbar = document.getElementById('col-cards-toolbar');
            this.inspectModal = document.getElementById('modal-inspect-detail');
            this.inspectBody = document.getElementById('inspect-body');
            this.inspectTitle = document.getElementById('inspect-title');

            this.updateGoldDisplay();

            const btnCloseGacha = document.getElementById('btn-close-gacha');
            if (btnCloseGacha && !btnCloseGacha._bound) {
                btnCloseGacha._bound = true;
                btnCloseGacha.addEventListener('click', () => this.closeGachaModal());
            }

            const btnCloseCol = document.getElementById('btn-close-collection');
            if (btnCloseCol && !btnCloseCol._bound) {
                btnCloseCol._bound = true;
                btnCloseCol.addEventListener('click', () => this.closeCollectionModal());
            }

            const btnCloseInspect = document.getElementById('btn-close-inspect');
            if (btnCloseInspect && !btnCloseInspect._bound) {
                btnCloseInspect._bound = true;
                btnCloseInspect.addEventListener('click', () => this.closeInspectModal());
            }

            // Primary Tabs: Cards vs Heroes
            const tabCards = document.getElementById('tab-col-cards');
            const tabHeroes = document.getElementById('tab-col-heroes');
            if (tabCards && !tabCards._bound) {
                tabCards._bound = true;
                tabCards.addEventListener('click', () => {
                    this.currentTab = 'cards';
                    tabCards.classList.add('active');
                    if (tabHeroes) tabHeroes.classList.remove('active');
                    if (this.cardsToolbar) this.cardsToolbar.style.display = 'flex';
                    if (this.collectionGrid) this.collectionGrid.style.display = 'grid';
                    if (this.collectionHeroesGrid) this.collectionHeroesGrid.style.display = 'none';
                    this.renderCardsGrid();
                });
            }

            if (tabHeroes && !tabHeroes._bound) {
                tabHeroes._bound = true;
                tabHeroes.addEventListener('click', () => {
                    this.currentTab = 'heroes';
                    tabHeroes.classList.add('active');
                    if (tabCards) tabCards.classList.remove('active');
                    if (this.cardsToolbar) this.cardsToolbar.style.display = 'none';
                    if (this.collectionGrid) this.collectionGrid.style.display = 'none';
                    if (this.collectionHeroesGrid) this.collectionHeroesGrid.style.display = 'grid';
                    this.renderHeroesGrid();
                });
            }

            // Category, Rarity & Owned Filter Buttons
            const filterBtns = document.querySelectorAll('.collection-filter-bar .btn-filter');
            filterBtns.forEach(btn => {
                if (btn._bound) return;
                btn._bound = true;
                btn.addEventListener('click', () => {
                    const filterType = btn.getAttribute('data-filter');
                    const rarityType = btn.getAttribute('data-rarity');
                    const ownedType = btn.getAttribute('data-owned');

                    if (filterType !== null) {
                        filterBtns.forEach(b => {
                            if (b.hasAttribute('data-filter')) b.classList.remove('active');
                        });
                        btn.classList.add('active');
                        this.typeFilter = filterType;
                    } else if (rarityType !== null) {
                        filterBtns.forEach(b => {
                            if (b.hasAttribute('data-rarity')) b.classList.remove('active');
                        });
                        btn.classList.add('active');
                        this.rarityFilter = rarityType;
                    } else if (ownedType !== null) {
                        filterBtns.forEach(b => {
                            if (b.hasAttribute('data-owned')) b.classList.remove('active');
                        });
                        btn.classList.add('active');
                        this.ownedFilter = ownedType;
                    }

                    this.renderCardsGrid();
                });
            });

            // Search input
            const inputSearch = document.getElementById('input-col-search');
            if (inputSearch && !inputSearch._bound) {
                inputSearch._bound = true;
                inputSearch.addEventListener('input', (e) => {
                    this.searchQuery = (e.target.value || '').trim().toLowerCase();
                    this.renderCardsGrid();
                });
            }
        }

        updateGoldDisplay() {
            const shown = Number(this.gold || 0).toLocaleString();
            if (this.playerGoldDisplay) this.playerGoldDisplay.textContent = shown;
            // Wallet owns the storage key and the HUD nodes; writing a second key here is what let
            // the gacha screen and the deck builder disagree about how much gold the player has.
            if (root.Wallet) root.Wallet.refreshHud();
            const dbGold = document.getElementById('deck-builder-gold');
            if (dbGold) dbGold.textContent = shown;
        }

        // Gacha Pack APIs
        async openGachaModal() {
            if (!this.modalGacha) return;
            this.modalGacha.style.display = 'flex';
            this.gachaResultContainer.innerHTML = '';
            this.gachaResultContainer.style.display = 'none';
            this.gachaPackContainer.style.display = 'grid';

            // Reconcile with the backend first: gold and the pity counters live there now.
            if (window.Wallet) {
                Wallet.seedStarterCollection();
                this.gold = Wallet.getGold();
                this.updateGoldDisplay();
                Wallet.syncFromServer().then(payload => {
                    if (payload) {
                        this.gold = Wallet.getGold();
                        this.updateGoldDisplay();
                        this.renderPityPanel(this.pityPanel);
                    }
                });
            }
            if (!this.pityPanel) {
                this.pityPanel = document.createElement('div');
                this.pityPanel.className = 'gacha-pity-wrapper';
                this.gachaPackContainer.parentNode.insertBefore(this.pityPanel, this.gachaPackContainer);
            }
            this.renderPityPanel(this.pityPanel);

            try {
                const res = await fetch('/api/gacha/packs');
                const packs = await res.json();
                this.renderPacks(packs);
            } catch (err) {
                const conf = (root.GAME_CONFIG && root.GAME_CONFIG.gachaPity) || (root.GachaSystem && root.GachaSystem.config()) || {};
                this.renderPacks([
                    {
                        id: 'pack_standard',
                        name: '命运符文秘包 (Standard Pack)',
                        description: '全卡池随机。十连最后一张保底稀有以上，第 ' + (conf.hardPityCounter || 80) + ' 抽必出 SSR。',
                        cost_gold: conf.singleCostGold || 100
                    },
                    {
                        id: 'pack_pve_growth',
                        name: 'PVE 成长包 (Adventure Pack)',
                        description: '仅含可升级的 PVE 卡牌；重复抽到会直接升一级，是冒险模式的养成入口。',
                        cost_gold: conf.singleCostGold || 100
                    }
                ]);
            }
        }

        renderPacks(packs) {
            this.gachaPackContainer.innerHTML = '';
            const conf = (root.GAME_CONFIG && root.GAME_CONFIG.gachaPity)
                || (root.GachaSystem && root.GachaSystem.config()) || {};
            const globalRates = conf.rates || {};
            // The server hands out the same lowercase rarity keys the roller uses. The labels used
            // to look them up under the display names (SSR / SR / R), which never existed on the
            // payload, so every pack advertised the hardcoded 5% / 20% / 40% fallback while the
            // draw itself ran at 2% / 6% / 22%.
            const pct = (rates, key) => {
                const v = Number(rates[key] !== undefined ? rates[key] : globalRates[key]);
                return Number.isFinite(v) ? `${Number((v * 100).toFixed(1))}%` : '--';
            };

            packs.forEach(p => {
                const rates = p.rates || {};
                const card = document.createElement('div');
                card.className = 'gacha-pack-card';
                card.innerHTML = `
                    <div class="pack-badge">🪙 ${p.cost_gold} 金币</div>
                    <div class="pack-icon">✨🎴✨</div>
                    <h3 class="pack-name">${p.name}</h3>
                    <p class="pack-desc">${p.description || ''}</p>
                    <div class="pack-rates">
                        <span>SSR: ${pct(rates, 'legendary')}</span>
                        <span>SR: ${pct(rates, 'epic')}</span>
                        <span>R: ${pct(rates, 'rare')}</span>
                        <span>N: ${pct(rates, 'common')}</span>
                    </div>
                    <div class="pack-actions">
                        <button class="btn-gacha-draw btn-draw-1" data-pack="${p.id}">单抽 (1次)</button>
                        <button class="btn-gacha-draw btn-draw-10" data-pack="${p.id}">十连抽 (10次)</button>
                    </div>
                `;
                this.gachaPackContainer.appendChild(card);
            });

            // No price rides on the button: executeDraw() derives it from gachaPity, which is the
            // same table the server charges from, so a label can never disagree with the backend.
            this.gachaPackContainer.querySelectorAll('.btn-draw-1').forEach(btn => {
                btn.addEventListener('click', () => this.executeDraw(btn.getAttribute('data-pack'), 1));
            });
            this.gachaPackContainer.querySelectorAll('.btn-draw-10').forEach(btn => {
                btn.addEventListener('click', () => this.executeDraw(btn.getAttribute('data-pack'), 10));
            });
        }

        async executeDraw(packId, count) {
            const conf = (root.GAME_CONFIG && root.GAME_CONFIG.gachaPity)
                || (root.GachaSystem ? root.GachaSystem.config() : {});
            // The server prices the pull too, so the charge is derived here from the same table
            // rather than from anything a button label carries.
            const price = count >= 10 ? (conf.tenPullCostGold || 900) : (conf.singleCostGold || 100) * count;
            this.gold = root.Wallet ? root.Wallet.getGold() : this.gold;
            if (this.gold < price) {
                alert(`金币不足！当前 ${this.gold} 金币，本次需要 ${price} 金币。\n（讨伐章节关卡与对战 AI 都能获得金币。）`);
                return;
            }

            this.gachaPackContainer.style.display = 'none';
            this.gachaResultContainer.style.display = 'flex';
            this.gachaResultContainer.innerHTML = `
                <div class="gacha-summoning-spinner">
                    <div class="summon-rune-circle"></div>
                    <div style="margin-top: 15px; font-weight: bold; color: #fbbf24;">正在凝聚符文共鸣，召唤卡牌中...</div>
                </div>
            `;

            try {
                const res = await fetch('/api/gacha/draw', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        packId,
                        count,
                        userId: root.Wallet ? root.Wallet.getUserId() : 'player_local'
                    })
                });
                if (!res.ok) {
                    const errPayload = await res.json().catch(() => ({}));
                    throw new Error(errPayload.error || `服务端拒绝抽卡 (${res.status})`);
                }
                const data = await res.json();
                // The backend is the wallet authority: apply its number rather than pre-subtracting
                // locally, which used to double-charge once the server started charging too.
                if (typeof data.gold === 'number' && root.Wallet) {
                    root.Wallet.applyServer({ gold: data.gold, gems: root.Wallet.getGems(),
                        pity_since_ssr: data.pity && data.pity.sinceSSR,
                        pity_luck: data.pity && data.pity.luck,
                        total_pulls: data.pity && data.pity.totalPulls });
                    this.gold = data.gold;
                }
                if (data.results && Array.isArray(data.results)) this.recordDrawnCards(data.results);
                setTimeout(() => {
                    this.renderDrawResults(data.results || []);
                }, 700);
            } catch (err) {
                console.warn('[gacha] 服务端不可用，改用本地保底规则结算：', err.message);
                setTimeout(() => {
                    this.renderOfflineDrawResults(count, price);
                }, 700);
            }
        }

        /**
         * Offline draw. Previously this rolled raw Math.random() with no pity, so a player without
         * the backend could pull 80 times and never see an SSR.
         */
        rollLocally(count) {
            const GachaSystem = root.GachaSystem;
            const conf = (root.GAME_CONFIG && root.GAME_CONFIG.gachaPity)
                || (GachaSystem ? GachaSystem.config() : {});
            const pity = root.Wallet ? Object.assign(GachaSystem.freshPityState(), root.Wallet.getPity())
                : GachaSystem.freshPityState();
            // Bucket from the normalized client database, not GAME_CONFIG.cards: the config rows are
            // keyed cardId/cardName, so a raw-config bucket produced cards with no `id` and offline
            // draws could never be recorded into the collection.
            const pool = (root.CARD_DATABASE && root.CARD_DATABASE.length > 0)
                ? root.CARD_DATABASE
                : Object.values((root.GAME_CONFIG && root.GAME_CONFIG.cards) || {});
            const buckets = GachaSystem.bucketByRarity(pool);
            const results = GachaSystem.rollBatch(pity, count, Math.random, conf).map(rarity => {
                const card = GachaSystem.pickCard(buckets, rarity, Math.random);
                return card ? {
                    card,
                    rarity: GachaSystem.DISPLAY[rarity],
                    rarityKey: rarity,
                    isNew: !root.Wallet || !root.Wallet.owns(card.id)
                } : null;
            }).filter(Boolean);
            if (root.Wallet) root.Wallet.setPity(pity);
            return results;
        }

        /** The pity readout: how far from the guaranteed SSR, and the ten-pull floor. */
        renderPityPanel(container) {
            if (!container || !root.GAME_CONFIG || !root.GAME_CONFIG.gachaPity) return;
            const conf = root.GAME_CONFIG.gachaPity;
            const pity = root.Wallet ? root.Wallet.getPity() : { sinceSSR: 0, luck: 0, totalPulls: 0 };
            const since = Number(pity.sinceSSR || 0);
            const hardPct = Math.min(100, (since / conf.hardPityCounter) * 100);
            const softStart = conf.luckSoftPityStart;
            const ssrChance = conf.rates.legendary
                + (since >= softStart ? (since - softStart + 1) * conf.luckSoftPityStep : 0);
            container.innerHTML = `
                <div class="pity-panel">
                    <div class="pity-row">
                        <span class="pity-label">距离保底 SSR</span>
                        <div class="pity-bar"><div class="pity-bar-fill pity-hard" style="width:${hardPct}%"></div></div>
                        <span class="pity-value">${conf.hardPityCounter - since} 抽</span>
                    </div>
                    <div class="pity-row">
                        <span class="pity-label">幸运值累积</span>
                        <div class="pity-bar"><div class="pity-bar-fill" style="width:${Math.min(100, since / softStart * 100)}%"></div></div>
                        <span class="pity-value">${since < softStart ? '未激活' : '+' + ((ssrChance - conf.rates.legendary) * 100).toFixed(1) + '%'}</span>
                    </div>
                    <div class="pity-row">
                        <span class="pity-label">本号累计抽取</span>
                        <div class="pity-bar"><div class="pity-bar-fill" style="width:100%"></div></div>
                        <span class="pity-value">${Number(pity.totalPulls || 0)} 次</span>
                    </div>
                    <div class="pity-note">
                        基础概率 SSR ${(conf.rates.legendary * 100).toFixed(0)}% · SR ${(conf.rates.epic * 100).toFixed(0)}% ·
                        R ${(conf.rates.rare * 100).toFixed(0)}% · N ${(conf.rates.common * 100).toFixed(0)}%。
                        十连的最后一张若前九张全为 N，则按 70% R / 23% SR / 7% SSR 强制出稀有以上；
                        第 ${conf.hardPityCounter} 抽必出 SSR，出货后计数清零。累计 ${since} 抽未出 SSR，
                        当前 SSR 实际概率 ${(ssrChance * 100).toFixed(1)}%。
                    </div>
                </div>`;
        }

        renderDrawResults(results) {
            this.gachaResultContainer.innerHTML = `
                <div class="gacha-results-header">
                    <h2>🎉 祈愿召唤结果 (${results.length} 张卡牌)</h2>
                    <button id="btn-draw-again" class="btn-lobby-sm">返回卡包列表</button>
                </div>
                <div class="gacha-cards-grid"></div>
            `;

            const grid = this.gachaResultContainer.querySelector('.gacha-cards-grid');
            results.forEach((item, idx) => {
                const c = item.card;
                const normR = this.normalizeRarity(item.rarity || c.rarity || c.tier);
                const el = document.createElement('div');
                el.className = `draw-card-item rarity-${normR.toLowerCase()}`;
                el.style.animationDelay = `${idx * 0.08}s`;
                
                const iconName = c.iconName || c.icon_name || 'attack-sword.svg';
                const iconSrc = `assets/card-icons/${iconName}`;

                el.innerHTML = `
                    <div class="card-rarity-tag ${normR.toLowerCase()}">${normR}</div>
                    <div class="draw-card-cost">💎 ${c.cost}</div>
                    <div class="draw-card-art-box">
                        <img src="${iconSrc}" class="draw-card-art-img" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
                        <span class="draw-card-emoji" style="display:none;">${c.icon || '🃏'}</span>
                    </div>
                    <div class="draw-card-name">${c.name || c.cardName}</div>
                    <div class="draw-card-desc">${c.description || c.desc || ''}</div>
                    ${item.isNew ? '<div class="new-card-badge">NEW!</div>' : ''}
                `;
                grid.appendChild(el);
            });

            document.getElementById('btn-draw-again').addEventListener('click', () => {
                this.gachaResultContainer.style.display = 'none';
                this.gachaPackContainer.style.display = 'grid';
            });
        }

        renderOfflineDrawResults(count, price) {
            // The previous fallback rolled from a literal ['N','N','R','R','SR','SSR'] table, i.e.
            // a 17% SSR chance offline versus the configured 2%, and charged nothing.
            const results = (root.GachaSystem && root.GAME_CONFIG && root.GAME_CONFIG.cards)
                ? this.rollLocally(count)
                : [];
            if (results.length === 0) {
                this.gachaResultContainer.innerHTML = `
                    <div class="pve-reward-empty">卡池为空，无法抽取。请先运行 tools/sync_balance.py 生成卡牌数据。</div>
                    <button id="btn-draw-again" class="btn-lobby-sm">返回卡包列表</button>`;
                const back = this.gachaResultContainer.querySelector('#btn-draw-again');
                if (back) back.addEventListener('click', () => this.openGachaModal());
                return;
            }
            if (window.Wallet && price) Wallet.credit(-price, 0);
            this.gold = window.Wallet ? Wallet.getGold() : this.gold;
            this.recordDrawnCards(results);
            this.renderDrawResults(results);
        }

        normalizeRarity(val) {
            if (!val) return 'N';
            const v = String(val).toUpperCase();
            if (v === 'SSR' || v === 'EPIC' || v === 'LEGENDARY') return 'SSR';
            if (v === 'SR' || v === 'RARE') return 'SR';
            if (v === 'R') return 'R';
            if (v === 'N' || v === 'COMMON') return 'N';
            return v;
        }

        // Collection APIs
        async openCollectionModal() {
            if (!this.modalCollection) return;
            this.modalCollection.style.display = 'flex';
            if (this.collectionGrid) {
                this.collectionGrid.innerHTML = '<div style="color:#94a3b8; padding:30px; text-align:center;">正在载入卡牌与英雄图鉴...</div>';
            }

            const localOwned = this.getStoredCollection();

            let serverCards = null;
            try {
                const res = await fetch('/api/collection?userId=player_local');
                if (res.ok) {
                    serverCards = await res.json();
                }
            } catch (err) {}

            const basePool = (window.CARD_DATABASE && window.CARD_DATABASE.length > 0)
                ? window.CARD_DATABASE
                : (root.GAME_CONFIG && root.GAME_CONFIG.cards ? Object.values(root.GAME_CONFIG.cards) : (serverCards || []));

            const mergedMap = new Map();

            // Populate all base cards
            basePool.forEach(c => {
                const id = c.id || c.card_id || c.cardId;
                if (!id) return;
                const count = Number(localOwned[id]) || 0;
                mergedMap.set(id, {
                    ...c,
                    id: id,
                    name: c.name || c.cardName || id,
                    card_type: c.card_type || c.type || 'attack',
                    rarity: c.rarity || c.tier || 'common',
                    desc: c.desc || c.description || '',
                    owned_count: count
                });
            });

            // Merge server response if present
            if (serverCards && Array.isArray(serverCards)) {
                serverCards.forEach(sc => {
                    const id = sc.id;
                    if (!id) return;
                    const serverCount = Number(sc.owned_count) || 0;
                    const localCount = Number(localOwned[id]) || 0;
                    const bestCount = Math.max(serverCount, localCount);
                    localOwned[id] = bestCount;

                    const existing = mergedMap.get(id);
                    if (existing) {
                        existing.owned_count = bestCount;
                        if (!existing.name && sc.name) existing.name = sc.name;
                        if (!existing.desc && sc.description) existing.desc = sc.description;
                    } else {
                        mergedMap.set(id, {
                            ...sc,
                            owned_count: bestCount,
                            desc: sc.description || ''
                        });
                    }
                });
                this.saveStoredCollection(localOwned);
            }

            this.allCards = Array.from(mergedMap.values());

            if (root.HERO_DATABASE) {
                this.allHeroes = Object.values(root.HERO_DATABASE);
            }

            const countCards = document.getElementById('col-cards-count');
            const countHeroes = document.getElementById('col-heroes-count');
            if (countCards) countCards.textContent = this.allCards.length;
            if (countHeroes) countHeroes.textContent = this.allHeroes.length;

            if (this.currentTab === 'cards') {
                this.renderCardsGrid();
            } else {
                this.renderHeroesGrid();
            }
        }

        renderCardsGrid() {
            if (!this.collectionGrid) return;
            this.collectionGrid.innerHTML = '';

            let filtered = this.allCards.filter(c => {
                const cType = (c.card_type || c.type || '').toLowerCase();
                const normRarity = this.normalizeRarity(c.rarity || c.tier);
                const owned = Number(c.owned_count) || 0;

                // Type filter
                if (this.typeFilter !== 'all') {
                    const filter = this.typeFilter.toLowerCase();
                    const hasTag = Array.isArray(c.tags) && c.tags.includes(filter);
                    if (cType !== filter && !hasTag) {
                        return false;
                    }
                }

                // Rarity filter
                if (this.rarityFilter !== 'all') {
                    const targetRarity = this.normalizeRarity(this.rarityFilter);
                    if (normRarity !== targetRarity) {
                        return false;
                    }
                }

                // Owned filter
                if (this.ownedFilter === 'unlocked' && owned <= 0) {
                    return false;
                }
                if (this.ownedFilter === 'locked' && owned > 0) {
                    return false;
                }

                // Search query
                if (this.searchQuery) {
                    const nameStr = (c.name || c.cardName || '').toLowerCase();
                    const descStr = (c.desc || c.description || '').toLowerCase();
                    if (!nameStr.includes(this.searchQuery) && !descStr.includes(this.searchQuery)) {
                        return false;
                    }
                }
                return true;
            });

            if (filtered.length === 0) {
                this.collectionGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px;">
                        <div style="font-size: 40px; margin-bottom: 10px;">🔍</div>
                        <div style="font-size: 15px; font-weight: bold;">没有找到符合条件的卡牌</div>
                    </div>
                `;
                return;
            }

            filtered.forEach(c => {
                const cardEl = document.createElement('div');
                const normRarity = this.normalizeRarity(c.rarity || c.tier);
                const rClass = normRarity.toLowerCase();
                const typeName = c.card_type || c.type || 'attack';
                const owned = Number(c.owned_count) || 0;
                const isUnlocked = owned > 0;

                cardEl.className = `collection-card-item rarity-${rClass} ${isUnlocked ? 'unlocked' : 'locked'}`;

                const iconName = c.iconName || c.icon_name || 'attack-sword.svg';
                const iconSrc = `assets/card-icons/${iconName}`;

                cardEl.innerHTML = `
                    <div class="col-card-top-bar">
                        <span class="col-card-cost">💎 ${c.cost}</span>
                        <span class="col-card-name">${c.name || c.cardName}</span>
                        <span class="card-rarity-badge ${rClass}">${normRarity}</span>
                    </div>

                    <div class="col-card-art">
                        <img src="${iconSrc}" class="col-card-icon-img" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
                        <span class="col-card-emoji-icon" style="display:none;">${c.icon || '⚔️'}</span>
                        ${!isUnlocked ? '<div class="card-locked-overlay">🔒</div>' : ''}
                    </div>

                    <div class="col-card-stats-row">
                        ${c.damage ? `<span class="col-stat-pill dmg">⚔️ ${c.damage} 伤</span>` : ''}
                        ${c.shield ? `<span class="col-stat-pill shield">🛡️ ${c.shield} 盾</span>` : ''}
                        ${c.heal ? `<span class="col-stat-pill heal">💚 ${c.heal} 疗</span>` : ''}
                        <span class="col-type-tag ${typeName}">${this.getTypeLabel(typeName)}</span>
                    </div>

                    <div class="col-card-desc-box">${c.desc || c.description || '无详细描述'}</div>

                    <div class="col-card-footer">
                        <span class="col-owned-tag ${isUnlocked ? 'unlocked' : 'locked'}">
                            ${isUnlocked ? `✅ 已拥有 x${owned}` : '🔒 未获得 (抽卡解锁)'}
                        </span>
                        <span class="col-inspect-hint">点击检视 →</span>
                    </div>
                `;

                cardEl.addEventListener('click', () => this.inspectCard(c));
                this.collectionGrid.appendChild(cardEl);
            });
        }

        renderHeroesGrid() {
            if (!this.collectionHeroesGrid) return;
            this.collectionHeroesGrid.innerHTML = '';

            const heroes = this.allHeroes.length > 0 ? this.allHeroes : Object.values(window.HERO_DATABASE || {});

            heroes.forEach(h => {
                const cardEl = document.createElement('div');
                cardEl.className = 'collection-hero-card';
                cardEl.style.borderColor = h.themeColor || '#00d4ff';

                cardEl.innerHTML = `
                    <div class="col-hero-portrait-box" style="background: ${h.avatarBg || 'rgba(0,0,0,0.5)'}">
                        ${h.image ? `<img src="${h.image}" alt="${h.name}" class="col-hero-portrait-img" />` : `<span class="col-hero-emoji">${h.icon}</span>`}
                        <div class="col-hero-tag">${h.role || '参战英雄'}</div>
                    </div>
                    <div class="col-hero-info-box">
                        <div class="col-hero-title-row">
                            <h3 class="col-hero-name" style="color: ${h.themeColor || '#fff'}">${h.name}</h3>
                            <span class="col-hero-title-sub">${h.title || ''}</span>
                        </div>
                        <div class="col-hero-stats">
                            <span class="hero-stat-pill hp">❤️ 生命值: ${h.hp}</span>
                            <span class="hero-stat-pill atk">⚔️ 基础攻击: ${h.normalAttack || h.attack}</span>
                        </div>
                        <div class="col-hero-ability">
                            <div class="ability-title">被动 · ${h.passive?.name || h.passiveName}</div>
                            <div class="ability-desc">${h.passive?.desc || h.passiveDesc}</div>
                        </div>
                        <div class="col-hero-ability">
                            <div class="ability-title">技能 · ${h.skill?.name || h.skillName} (${h.skill?.cost || 2}能/CD ${h.skill?.cooldown || 2})</div>
                            <div class="ability-desc">${h.skill?.desc || h.skillDesc}</div>
                        </div>
                        <div class="col-hero-lore">${h.desc || ''}</div>
                    </div>
                `;

                this.collectionHeroesGrid.appendChild(cardEl);
            });
        }

        inspectCard(c) {
            if (!this.inspectModal || !this.inspectBody) return;
            const rarity = (c.rarity || c.tier || 'N').toUpperCase();
            const iconName = c.iconName || c.icon_name || 'attack-sword.svg';
            const iconSrc = `assets/card-icons/${iconName}`;

            if (this.inspectTitle) {
                this.inspectTitle.textContent = `🎴 卡牌全景检视 · ${c.name || c.cardName}`;
            }

            this.inspectBody.innerHTML = `
                <div class="inspect-card-container rarity-${rarity.toLowerCase()}">
                    <div class="inspect-art-large">
                        <img src="${iconSrc}" class="inspect-art-img" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
                        <span class="inspect-art-emoji" style="display:none;">${c.icon || '🃏'}</span>
                    </div>
                    <div class="inspect-card-details">
                        <div class="inspect-row-header">
                            <h2>${c.name || c.cardName}</h2>
                            <span class="card-rarity-badge ${rarity.toLowerCase()}">${rarity} 品质</span>
                        </div>
                        <div class="inspect-meta-tags">
                            <span class="inspect-meta-pill">💎 能量消耗: ${c.cost} 点</span>
                            <span class="inspect-meta-pill">类型: ${this.getTypeLabel(c.card_type || c.type)}</span>
                            <span class="inspect-meta-pill">出牌效果: ${c.damage ? `造成 ${c.damage} 伤害` : ''}${c.shield ? `获得 ${c.shield} 护盾` : ''}${c.heal ? `恢复 ${c.heal} 生命` : ''}</span>
                        </div>
                        <div class="inspect-desc-large">
                            <h4>📜 战术描述与机制效果</h4>
                            <p>${c.desc || c.description || '无详细战术描述'}</p>
                        </div>
                    </div>
                </div>
            `;
            this.inspectModal.style.display = 'flex';
        }

        closeInspectModal() {
            if (this.inspectModal) this.inspectModal.style.display = 'none';
        }

        getTypeLabel(t) {
            switch ((t || '').toLowerCase()) {
                case 'attack': return '⚔️ 攻击卡';
                case 'defense': return '🛡️ 防御卡';
                case 'heal': return '💚 治疗卡';
                case 'special': return '✨ 特殊法术';
                default: return '🎴 战术卡';
            }
        }

        closeGachaModal() {
            if (this.modalGacha) this.modalGacha.style.display = 'none';
        }

        closeCollectionModal() {
            if (this.modalCollection) this.modalCollection.style.display = 'none';
        }
    }

    root.CardGameGacha = CardGameGacha;
})(typeof window !== 'undefined' ? window : global);
