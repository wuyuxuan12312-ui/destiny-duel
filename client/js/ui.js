// UI & Animation Feedback Controller (Local 1v1 + Online P2P Multiplayer)
class CardBattleUI {
    constructor(game, network) {
        this.game = game;
        this.network = network;

        this.isOnline = false;
        this.isAIMode = false;
        this.isPveMode = false;
        this.currentPveStage = null;
        this.pendingPveStage = null;
        this.ai = (typeof CardGameAI !== 'undefined') ? new CardGameAI(this.game, this) : null;
        this.aiTriggerPending = false;
        this.aiPump = null;
        this.gacha = (typeof CardGameGacha !== 'undefined') ? new CardGameGacha() : null;
        this.pveView = (typeof PveView !== 'undefined')
            ? new PveView((stage) => this.enterPveStage(stage)) : null;
        this.isHost = false;
        this.localPlayerId = 'p1'; // 'p1' for Host, 'p2' for Guest
        this.selectedP1Hero = null;
        this.selectedP2Hero = null;
        this.mySelectedHero = null;
        this.oppSelectedHero = null;
        this.oppDeckSpec = null;
        this.selectingForPlayer = 1; // 1 = P1, 2 = P2 (for local hotseat)
        this.selectedCardIndex = -1; // Index of currently selected card in hand (-1 if none)

        this.initDOMElements();
        this.applySettings();
        this.initStartMenu();
        this.initLobbyScreen();
        this.initNetworkEvents();
        this.initHeroSelectScreen();
        this.hookGameCallbacks();
        this.checkUrlForRoomCode();
        this.syncConfigWithServer();
    }

    initDOMElements() {
        // Screens
        this.startMenuScreen = document.getElementById('screen-start-menu');
        this.lobbyScreen = document.getElementById('screen-lobby');
        this.heroSelectScreen = document.getElementById('screen-hero-select');
        this.battleScreen = document.getElementById('screen-battle');
        this.gameOverModal = document.getElementById('modal-game-over');
        this.toastModal = document.getElementById('modal-toast');

        // Lobby elements
        this.btnCreateRoom = document.getElementById('btn-create-room');
        this.hostRoomInfo = document.getElementById('host-room-info');
        this.displayRoomCode = document.getElementById('display-room-code');
        this.btnCopyLink = document.getElementById('btn-copy-link');
        this.inputRoomCode = document.getElementById('input-room-code');
        this.btnJoinRoom = document.getElementById('btn-join-room');
        this.joinStatusMsg = document.getElementById('join-status-msg');
        this.btnStartLocal = document.getElementById('btn-start-local');

        // Hero Select elements
        this.heroSelectTitle = document.getElementById('hero-select-title');
        this.heroCardsContainer = document.getElementById('hero-cards-grid');
        this.btnHeroBackLobby = document.getElementById('btn-hero-back-lobby');
        this.heroSelectNetworkStatus = document.getElementById('hero-select-network-status');

        // Battle Top Bar
        this.battleModeBadge = document.getElementById('battle-mode-badge');
        this.btnLeaveBattle = document.getElementById('btn-leave-battle');

        // Battle elements - Opponent (Top)
        this.oppAvatar = document.getElementById('opp-avatar');
        this.oppName = document.getElementById('opp-name');
        this.oppHeroTitle = document.getElementById('opp-hero-title');
        this.oppHpBar = document.getElementById('opp-hp-bar');
        this.oppHpText = document.getElementById('opp-hp-text');
        this.oppShieldBar = document.getElementById('opp-shield-bar');
        this.oppShieldText = document.getElementById('opp-shield-text');
        this.oppEnergyGems = document.getElementById('opp-energy-gems');
        this.oppBuffs = document.getElementById('opp-buffs');
        this.oppHandDisplay = document.getElementById('opp-hand-display');
        this.oppCharacterBox = document.getElementById('opp-character-box');

        // Battle elements - Active Player (Bottom)
        this.actAvatar = document.getElementById('act-avatar');
        this.actName = document.getElementById('act-name');
        this.actHeroTitle = document.getElementById('act-hero-title');
        this.actHpBar = document.getElementById('act-hp-bar');
        this.actHpText = document.getElementById('act-hp-text');
        this.actShieldBar = document.getElementById('act-shield-bar');
        this.actShieldText = document.getElementById('act-shield-text');
        this.actEnergyGems = document.getElementById('act-energy-gems');
        this.actEnergyCount = document.getElementById('act-energy-count');
        this.actBuffs = document.getElementById('act-buffs');
        this.actHandContainer = document.getElementById('act-hand-container');
        this.actCharacterBox = document.getElementById('act-character-box');

        // Combat controls
        this.btnNormalAtk = document.getElementById('btn-normal-atk');
        this.btnHeroSkill = document.getElementById('btn-hero-skill');
        this.btnEndTurn = document.getElementById('btn-end-turn');

        // Center logs & banners
        this.combatLogContainer = document.getElementById('combat-log-list');
        this.turnBanner = document.getElementById('turn-banner');
        this.turnBannerText = document.getElementById('turn-banner-text');

        // Game Over elements
        this.winnerTitle = document.getElementById('winner-title');
        this.winnerAvatar = document.getElementById('winner-avatar');
        this.winnerSub = document.getElementById('winner-sub');
        this.statRounds = document.getElementById('stat-rounds');
        this.statDmgP1 = document.getElementById('stat-dmg-p1');
        this.statDmgP2 = document.getElementById('stat-dmg-p2');
        this.statHealP1 = document.getElementById('stat-heal-p1');
        this.statHealP2 = document.getElementById('stat-heal-p2');
        this.statCardsP1 = document.getElementById('stat-cards-p1');
        this.statCardsP2 = document.getElementById('stat-cards-p2');
        this.btnRestartMatch = document.getElementById('btn-restart-match');
        this.btnChangeHeroes = document.getElementById('btn-change-heroes');
        this.btnGameOverLobby = document.getElementById('btn-game-over-lobby');

        // Toast modal elements
        this.toastTitle = document.getElementById('toast-title');
        this.toastMsg = document.getElementById('toast-msg');
        this.btnToastConfirm = document.getElementById('btn-toast-confirm');

        // Status detail modal & turn history elements
        this.btnOpenStatus = document.getElementById('btn-open-status');
        this.btnOpenTurnHistory = document.getElementById('btn-open-turn-history');
        this.btnQuickHistory = document.getElementById('btn-quick-history');
        this.modalStatusDetail = document.getElementById('modal-status-detail');
        this.btnCloseStatusModal = document.getElementById('btn-close-status-modal');
        this.btnStatusConfirm = document.getElementById('btn-status-confirm');
        this.tabStatusSelf = document.getElementById('tab-status-self');
        this.tabStatusOpp = document.getElementById('tab-status-opp');
        this.tabStatusHistory = document.getElementById('tab-status-history');
        this.statusPanelBody = document.getElementById('status-panel-body');

        this.activeStatusTab = 'self';

        if (this.btnOpenStatus) {
            this.btnOpenStatus.addEventListener('click', () => {
                this.openStatusModal('self');
            });
        }
        if (this.btnOpenTurnHistory) {
            this.btnOpenTurnHistory.addEventListener('click', () => {
                this.openStatusModal('history');
            });
        }
        if (this.btnQuickHistory) {
            this.btnQuickHistory.addEventListener('click', () => {
                this.openStatusModal('history');
            });
        }
        if (this.tabStatusHistory) {
            this.tabStatusHistory.addEventListener('click', () => {
                this.openStatusModal('history');
            });
        }
        if (this.btnCloseStatusModal) {
            this.btnCloseStatusModal.addEventListener('click', () => {
                if (this.modalStatusDetail) this.modalStatusDetail.classList.remove('active');
            });
        }
        if (this.btnStatusConfirm) {
            this.btnStatusConfirm.addEventListener('click', () => {
                if (this.modalStatusDetail) this.modalStatusDetail.classList.remove('active');
            });
        }
        if (this.tabStatusSelf) {
            this.tabStatusSelf.addEventListener('click', () => {
                this.openStatusModal('self');
            });
        }
        if (this.tabStatusOpp) {
            this.tabStatusOpp.addEventListener('click', () => {
                this.openStatusModal('opp');
            });
        }

        // Clicking on character cards opens status modal
        if (this.actCharacterBox) {
            this.actCharacterBox.addEventListener('click', () => {
                this.openStatusModal('self');
            });
        }
        if (this.oppCharacterBox) {
            this.oppCharacterBox.addEventListener('click', () => {
                this.openStatusModal('opp');
            });
        }

        // Deselect card when clicking elsewhere on the battlefield
        document.addEventListener('click', (e) => {
            if (this.selectedCardIndex !== -1 && !e.target.closest('#act-hand-container') && !e.target.closest('.modal-backdrop')) {
                this.selectedCardIndex = -1;
                this.updateCardSelectionVisuals();
            }
        });

        // Bind battle buttons
        this.btnNormalAtk.addEventListener('click', () => {
            if (this.isOnline && this.game.activePlayer && this.game.activePlayer.id !== this.localPlayerId) return;
            if (window.soundManager) window.soundManager.init();
            this.game.performNormalAttack();
        });

        this.btnHeroSkill.addEventListener('click', () => {
            if (this.isOnline && this.game.activePlayer && this.game.activePlayer.id !== this.localPlayerId) return;
            if (window.soundManager) window.soundManager.init();
            this.game.performHeroSkill();
        });

        this.btnEndTurn.addEventListener('click', () => {
            if (this.isOnline && this.game.activePlayer && this.game.activePlayer.id !== this.localPlayerId) {
                console.warn('[END TURN CLICK] Ignored: not your turn!');
                return;
            }

            if (window.soundManager) window.soundManager.init();

            // Immediately lock UI button to give instant visual feedback
            this.btnEndTurn.disabled = true;
            this.btnEndTurn.innerHTML = `<span>⏳ 正在切换回合...</span>`;
            this.btnEndTurn.classList.add('btn-spent');

            this.game.endTurn();
        });

        this.btnLeaveBattle.addEventListener('click', () => {
            if (confirm('确定要退出当前对局吗？')) {
                if (this.isOnline && this.network) {
                    this.network.send({ type: 'LEAVE_MATCH' });
                    this.network.disconnect();
                }
                this.returnToLobby();
            }
        });

        this.btnRestartMatch.addEventListener('click', () => {
            this.gameOverModal.classList.remove('active');
            if (this.isPveMode && this.currentPveStage) {
                this.retryPveStage();
                return;
            }
            if (this.isOnline) {
                if (this.isHost) {
                    this.startOnlineMatchAsHost();
                } else {
                    this.network.send({ type: 'REMATCH_REQUEST' });
                    this.showToast('已申请再来一局', '等待房主重新发牌开局...');
                }
            } else {
                this.game.initMatch(this.selectedP1Hero, this.selectedP2Hero);
            }
        });

        this.btnChangeHeroes.addEventListener('click', () => {
            this.gameOverModal.classList.remove('active');
            this.battleScreen.classList.remove('active');

            if (this.isPveMode && this.currentPveStage) {
                this.hidePveRewardModal();
                this.heroSelectScreen.classList.add('active');
                this.heroSelectScreen.style.display = 'flex';
                this.initHeroSelectScreen();
                if (this.heroSelectTitle) {
                    this.heroSelectTitle.textContent = `⚔️ 讨伐 ${this.currentPveStage.stageCode} · 选择出战英雄`;
                }
                return;
            }

            this.heroSelectScreen.classList.add('active');

            if (this.isOnline) {
                this.mySelectedHero = null;
                this.oppSelectedHero = null;
                this.selectedP1Hero = null;
                this.selectedP2Hero = null;
                this.network.send({ type: 'CHANGE_HERO_REQUEST' });
                this.setupHeroSelectForOnline();
            } else {
                this.selectingForPlayer = 1;
                this.selectedP1Hero = null;
                this.selectedP2Hero = null;
                this.updateHeroSelectTitle();
            }
        });

        this.btnGameOverLobby.addEventListener('click', () => {
            this.gameOverModal.classList.remove('active');
            if (this.isOnline && this.network) {
                this.network.send({ type: 'LEAVE_MATCH' });
                this.network.disconnect();
            }
            if (this.isPveMode) {
                // Relabelled "🗺️ 返回章节地图" for the campaign, so it has to land on the map —
                // and re-open it rather than leaving whatever the pre-battle render showed.
                this.hidePveRewardModal();
                if (this.battleScreen) this.battleScreen.classList.remove('active');
                this.setPlayMode('menu');
                if (this.pveView) this.pveView.open();
                return;
            }
            this.returnToStartMenu();
        });

        this.btnToastConfirm.addEventListener('click', () => {
            this.toastModal.classList.remove('active');
            if (this.pendingToastAction) {
                const action = this.pendingToastAction;
                this.pendingToastAction = null;
                action();
            }
        });
    }

    initStartMenu() {
        const goldDisplay = document.getElementById('start-menu-gold');
        if (goldDisplay) {
            goldDisplay.setAttribute('data-wallet-gold', '');
            goldDisplay.textContent = window.Wallet ? Wallet.getGold().toLocaleString() : '2,000';
        }
        if (window.Wallet) {
            Wallet.seedStarterCollection();
            // The backend owns gold and the gacha pity counters; pull them so a returning player
            // does not silently start from the local cache.
            Wallet.syncFromServer().then(() => Wallet.refreshHud());
        }

        // 0. PVE campaign
        const btnPve = document.getElementById('menu-btn-pve');
        if (btnPve) {
            btnPve.addEventListener('click', () => {
                if (window.soundManager) window.soundManager.init();
                if (!window.PveSystem) { this.showToast('⚠️ 关卡数据未加载（缺少 pveStages）'); return; }
                this.startMenuScreen.classList.remove('active');
                this.startMenuScreen.style.display = 'none';
                this.pveView.open();
            });
        }

        // 1. AI Mode
        const btnAI = document.getElementById('menu-btn-ai');
        if (btnAI) {
            btnAI.addEventListener('click', () => {
                if (window.soundManager) window.soundManager.init();
                this.setPlayMode('ai');
                this.battleModeBadge.textContent = '🤖 单人切磋 (对战 AI)';

                this.startMenuScreen.classList.remove('active');
                this.heroSelectScreen.classList.add('active');

                this.selectingForPlayer = 1;
                this.selectedP1Hero = null;
                this.selectedP2Hero = null;
                this.heroSelectNetworkStatus.textContent = '单人切磋模式：请选定你的出战英雄';
                this.btnHeroBackLobby.textContent = '← 返回主菜单';
                this.btnHeroBackLobby.style.display = 'block';
                this.initHeroSelectScreen();
                this.updateHeroSelectTitle();
            });
        }

        // 2. Local 2P Mode
        const btnLocal = document.getElementById('menu-btn-local');
        if (btnLocal) {
            btnLocal.addEventListener('click', () => {
                if (window.soundManager) window.soundManager.init();
                this.setPlayMode('local');
                this.battleModeBadge.textContent = '🎮 本地双人对决';

                this.startMenuScreen.classList.remove('active');
                this.heroSelectScreen.classList.add('active');

                this.selectingForPlayer = 1;
                this.selectedP1Hero = null;
                this.selectedP2Hero = null;
                this.heroSelectNetworkStatus.textContent = '';
                this.btnHeroBackLobby.textContent = '← 返回主菜单';
                this.btnHeroBackLobby.style.display = 'block';
                this.initHeroSelectScreen();
                this.updateHeroSelectTitle();
            });
        }

        // 3. Online Mode
        const btnOnline = document.getElementById('menu-btn-online');
        if (btnOnline) {
            btnOnline.addEventListener('click', () => {
                if (window.soundManager) window.soundManager.init();
                this.setPlayMode('online');
                this.startMenuScreen.classList.remove('active');
                this.lobbyScreen.classList.add('active');
            });
        }

        // 4. Gacha Mode
        const btnGacha = document.getElementById('menu-btn-gacha');
        if (btnGacha) {
            btnGacha.addEventListener('click', () => {
                if (window.soundManager) window.soundManager.init();
                if (this.gacha) this.gacha.openGachaModal();
            });
        }

        // 5. Collection Mode
        const btnCol = document.getElementById('menu-btn-collection');
        if (btnCol) {
            btnCol.addEventListener('click', () => {
                if (window.soundManager) window.soundManager.init();
                if (this.gacha) this.gacha.openCollectionModal();
            });
        }

        // 6. Settings Mode
        
        // 7. Deck Builder Mode
        const btnDeck = document.getElementById('menu-btn-deck');
        if (btnDeck) {
            btnDeck.addEventListener('click', () => {
                if (window.soundManager) window.soundManager.init();
                if (window.DeckBuilder) {
                    window.DeckBuilder.openModal();
                }
            });
        }

        const btnSettings = document.getElementById('menu-btn-settings');
        if (btnSettings) {
            btnSettings.addEventListener('click', () => {
                if (window.soundManager) window.soundManager.init();
                this.openSettingsModal();
            });
        }

        // Back from Lobby to Menu
        const btnLobbyBack = document.getElementById('btn-lobby-back-menu');
        if (btnLobbyBack) {
            btnLobbyBack.addEventListener('click', () => {
                this.returnToStartMenu();
            });
        }

        // Settings modal controls
        const btnCloseSettings = document.getElementById('btn-close-settings');
        const btnSaveSettings = document.getElementById('btn-save-settings');
        const modalSettings = document.getElementById('modal-settings');
        if (btnCloseSettings) {
            btnCloseSettings.addEventListener('click', () => {
                // ✕ means cancel: put the stored values back into the controls and the engine.
                this.applySettings();
                if (modalSettings) modalSettings.classList.remove('active');
            });
        }
        if (btnSaveSettings) {
            btnSaveSettings.addEventListener('click', () => {
                this.saveSettings();
                if (modalSettings) modalSettings.classList.remove('active');
            });
        }

        const soundCheckbox = document.getElementById('setting-sound-fx');
        if (soundCheckbox) {
            soundCheckbox.addEventListener('change', (e) => {
                if (window.soundManager) window.soundManager.enabled = e.target.checked;
            });
        }
    }

    /**
     * Settings used to be write-nothing: "保存并返回" only closed the modal, so both controls
     * snapped back to the HTML defaults on the next load. They are stored together now, and the
     * values are pushed into the systems that read them (soundManager and the AI pacing).
     */
    loadSettings() {
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem('destiny_duel_settings') || '{}') || {};
        } catch (err) {
            saved = {};
        }
        return {
            aiSpeedMs: Number(saved.aiSpeedMs) || 800,
            soundFx: saved.soundFx !== false
        };
    }

    applySettings() {
        const s = this.loadSettings();
        const select = document.getElementById('setting-ai-speed');
        if (select && [...select.options].some(o => Number(o.value) === s.aiSpeedMs)) {
            select.value = String(s.aiSpeedMs);
        }
        const checkbox = document.getElementById('setting-sound-fx');
        if (checkbox) checkbox.checked = s.soundFx;
        if (window.soundManager) window.soundManager.enabled = s.soundFx;
        if (this.ai) this.ai.applySpeedSetting();
    }

    saveSettings() {
        const select = document.getElementById('setting-ai-speed');
        const checkbox = document.getElementById('setting-sound-fx');
        const payload = {
            aiSpeedMs: select ? (Number(select.value) || 800) : 800,
            soundFx: checkbox ? !!checkbox.checked : true
        };
        localStorage.setItem('destiny_duel_settings', JSON.stringify(payload));
        this.applySettings();
    }

    openSettingsModal() {
        const modalSettings = document.getElementById('modal-settings');
        if (modalSettings) modalSettings.classList.add('active');
    }

    returnToStartMenu() {
        if (this.gameOverModal) this.gameOverModal.classList.remove('active');
        if (this.battleScreen) this.battleScreen.classList.remove('active');
        if (this.heroSelectScreen) this.heroSelectScreen.classList.remove('active');
        if (this.lobbyScreen) this.lobbyScreen.classList.remove('active');
        if (this.pveView) this.pveView.close();
        if (this.startMenuScreen) {
            this.startMenuScreen.classList.add('active');
            this.startMenuScreen.style.display = 'flex';
        }
        this.hidePveRewardModal();

        const goldDisplay = document.getElementById('start-menu-gold');
        if (goldDisplay) {
            goldDisplay.textContent = window.Wallet ? Wallet.getGold().toLocaleString() : '2,000';
        }

        this.btnCreateRoom.disabled = false;
        this.btnCreateRoom.textContent = '创建新房间 (我是房主)';
        this.hostRoomInfo.style.display = 'none';
        this.btnJoinRoom.disabled = false;
        this.joinStatusMsg.textContent = '';
        this.isOnline = false;
        this.isAIMode = false;
        this.isPveMode = false;
        this.pendingPveStage = null;
        this.currentPveStage = null;
        this.game.isOnline = false;
        if (window.Wallet) Wallet.refreshHud();
    }

    async syncConfigWithServer() {
        const statusBadge = document.getElementById('menu-network-status');
        const settingStatus = document.getElementById('setting-db-status');
        try {
            const res = await fetch('/api/game/config');
            if (res.ok) {
                const config = await res.json();
                // Guard the shape, not just truthiness: the endpoint used to return cards as an
                // array with different key names, which silently shredded the card table.
                const usable = config && config.cards && !Array.isArray(config.cards)
                    && Object.keys(config.cards).length >= 10 && config.gameRules;
                if (usable) {
                    window.GAME_CONFIG = config;
                    // The databases are built once at boot from the static bundle; without these
                    // two calls a server edit changed only the hero grid and never reached combat.
                    // Each step is guarded on its own so one throwing cannot make the whole sync
                    // report "offline" while the config was in fact applied.
                    const steps = [
                        ['Registries', () => window.Registries && window.Registries.loadFromConfig(config)],
                        ['refreshCardDatabase', () => window.refreshCardDatabase && window.refreshCardDatabase()],
                        ['refreshHeroDatabase', () => window.refreshHeroDatabase && window.refreshHeroDatabase()],
                        ['renderHeroCards', () => this.initHeroSelectScreen()]
                    ];
                    for (const [label, step] of steps) {
                        try { step(); } catch (stepErr) {
                            console.warn(`[CONFIG] ${label} 失败：`, stepErr);
                        }
                    }
                    if (statusBadge) {
                        statusBadge.textContent = `🟢 云端数据库已同步 · ${Object.keys(config.cards).length} 卡`;
                        statusBadge.className = 'meta-badge pulse';
                    }
                    if (settingStatus) {
                        settingStatus.textContent = '已连接 SQLite 云端数据库';
                        settingStatus.className = 'status-tag online';
                    }
                    return;
                }
                console.warn('[CONFIG] 服务端配置结构不符合预期，继续使用本地离线数据。');
            }
        } catch (e) {
            console.log('[CONFIG] Running in local/offline file mode.', e.message);
        }

        if (statusBadge) {
            statusBadge.textContent = '🟠 本地离线预设数据';
            statusBadge.style.color = '#f59e0b';
            statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
            statusBadge.style.background = 'rgba(245, 158, 11, 0.15)';
        }
        if (settingStatus) {
            settingStatus.textContent = '本地离线模式 (静态 game_config.js)';
            settingStatus.className = 'status-tag offline';
        }
    }

    initLobbyScreen() {
        // Create Room (Host)
        this.btnCreateRoom.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.init();
            this.btnCreateRoom.disabled = true;
            this.btnCreateRoom.textContent = '正在初始化房间...';
            this.network.createRoom();
        });

        // Copy Invitation Link
        this.btnCopyLink.addEventListener('click', () => {
            const shareUrl = `${window.location.origin}${window.location.pathname}?room=${this.network.roomCode}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
                const prevText = this.btnCopyLink.textContent;
                this.btnCopyLink.textContent = '✅ 已复制链接！';
                setTimeout(() => this.btnCopyLink.textContent = prevText, 2000);
            }).catch(() => {
                prompt('复制此链接发送给好友：', shareUrl);
            });
        });

        // Join Room (Guest)
        this.btnJoinRoom.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.init();
            const code = this.inputRoomCode.value.trim();
            if (code.length !== 4) {
                this.joinStatusMsg.textContent = '请输入 4 位数字房间号！';
                return;
            }
            this.joinStatusMsg.textContent = `正在连接房间 ${code}...`;
            this.btnJoinRoom.disabled = true;
            this.network.joinRoom(code);
        });

        // Enter on input room code
        this.inputRoomCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.btnJoinRoom.click();
            }
        });

        // Start Local 1v1
        this.btnStartLocal.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.init();
            this.setPlayMode('local');
            this.battleModeBadge.textContent = '🎮 本地双人对决';

            this.lobbyScreen.classList.remove('active');
            this.heroSelectScreen.classList.add('active');

            this.selectingForPlayer = 1;
            this.selectedP1Hero = null;
            this.selectedP2Hero = null;
            this.heroSelectNetworkStatus.textContent = '';
            this.btnHeroBackLobby.style.display = 'block';
            this.initHeroSelectScreen();
            this.updateHeroSelectTitle();
        });

        // Back from Hero Select to Lobby / Start Menu
        this.btnHeroBackLobby.addEventListener('click', () => {
            if (this.isOnline && this.network) {
                this.network.disconnect();
                this.returnToLobby();
            } else {
                this.returnToStartMenu();
            }
        });
    }

    checkUrlForRoomCode() {
        const urlParams = new URLSearchParams(window.location.search);
        const room = urlParams.get('room');
        if (room && room.length === 4) {
            this.inputRoomCode.value = room;
            this.joinStatusMsg.textContent = `已自动识别邀请房间号 ${room}，点击加入对战！`;
        }
    }

    initNetworkEvents() {
        if (!this.network) return;

        // When Host room is created
        this.network.onRoomCreated = (code) => {
            this.displayRoomCode.textContent = code;
            this.hostRoomInfo.style.display = 'flex';
            this.btnCreateRoom.textContent = '房间已创建';
            this.btnCreateRoom.disabled = true;
        };

        // When P2P connection is established
        this.network.onConnected = (isHost) => {
            if (window.soundManager) window.soundManager.playTurnStart();
            this.setPlayMode('online');
            this.isHost = isHost;
            this.localPlayerId = isHost ? 'p1' : 'p2';
            this.game.localPlayerId = this.localPlayerId;

            this.mySelectedHero = null;
            this.oppSelectedHero = null;
            this.oppDeckSpec = null;
            this.selectedP1Hero = null;
            this.selectedP2Hero = null;

            this.lobbyScreen.classList.remove('active');
            this.heroSelectScreen.classList.add('active');
            this.battleModeBadge.textContent = `🌐 联机对战 | 房号: ${this.network.roomCode} | 你是: ${isHost ? '玩家 1 (房主)' : '玩家 2'}`;

            this.setupHeroSelectForOnline();
        };

        // When disconnected
        this.network.onDisconnected = () => {
            this.showToast('对手已断开连接', '当前在线对决已结束。', () => {
                this.returnToLobby();
            });
        };

        // Network error
        this.network.onError = (msg) => {
            const asHost = this.network.isHost;
            this.joinStatusMsg.textContent = msg;
            this.btnJoinRoom.disabled = false;
            this.btnCreateRoom.disabled = false;
            this.btnCreateRoom.textContent = asHost ? '重试：创建新房间 (我是房主)' : '创建新房间 (我是房主)';
            if (asHost) {
                this.hostRoomInfo.style.display = 'none';
                this.displayRoomCode.textContent = '----';
            }
        };

        // Network messages
        this.network.onMessage = (data) => {
            this.handleNetworkMessage(data);
        };

        // Game action sync
        this.game.onNetworkAction = (actionData) => {
            if (this.isOnline && this.network) {
                this.network.send({
                    type: 'ACTION',
                    action: actionData
                });
            }
        };
    }

    handleNetworkMessage(data) {
        if (!data || !data.type) return;

        switch (data.type) {
            case 'SELECT_HERO':
                this.oppSelectedHero = data.heroId;
                this.oppDeckSpec = data.deck || null;
                if (this.isHost) {
                    this.selectedP2Hero = data.heroId;
                } else {
                    this.selectedP1Hero = data.heroId;
                }
                this.updateOnlineHeroSelectStatus();
                this.checkBothHeroesSelected();
                break;

            case 'START_MATCH':
                this.selectedP1Hero = data.p1HeroId;
                this.selectedP2Hero = data.p2HeroId;
                this.startOnlineMatch(data.p1HeroId, data.p2HeroId, data.p1Spec, data.p2Spec, data.seed);
                break;

            case 'ACTION':
                const action = data.action;
                if (action.type === 'NORMAL_ATTACK') {
                    this.game.performNormalAttack(true);
                } else if (action.type === 'HERO_SKILL') {
                    this.game.performHeroSkill(true);
                } else if (action.type === 'PLAY_CARD') {
                    this.game.playCard(action.cardIndex, true);
                } else if (action.type === 'END_TURN') {
                    console.log('[END TURN RECEIVE] received from opponent');
                    this.game.endTurn(true);
                }
                break;

            case 'REMATCH_REQUEST':
                if (this.isHost) {
                    this.showToast('对手申请再来一局', '对手请求重新开局对决！', () => {
                        this.startOnlineMatchAsHost();
                    });
                }
                break;

            case 'CHANGE_HERO_REQUEST':
                this.gameOverModal.classList.remove('active');
                this.battleScreen.classList.remove('active');
                this.heroSelectScreen.classList.add('active');
                this.mySelectedHero = null;
                this.oppSelectedHero = null;
                this.selectedP1Hero = null;
                this.selectedP2Hero = null;
                this.setupHeroSelectForOnline();
                break;

            case 'LEAVE_MATCH':
                this.showToast('对手已退出', '对手退出了对战。', () => {
                    this.returnToLobby();
                });
                break;
        }
    }

    setupHeroSelectForOnline() {
        this.btnHeroBackLobby.style.display = 'block';
        const roleName = this.isHost ? '玩家 1 (房主)' : '玩家 2';
        this.heroSelectTitle.innerHTML = `你是 <span style="color: ${this.isHost ? '#00d4ff' : '#ffaa00'}">${roleName}</span> · 请选择出战英雄`;
        this.heroSelectNetworkStatus.textContent = '请点击并锁定你的出战英雄';
        this.initHeroSelectScreen();
    }

    updateOnlineHeroSelectStatus() {
        if (this.mySelectedHero && this.oppSelectedHero) {
            this.heroSelectNetworkStatus.textContent = '双方已锁定英雄！正在初始化战斗...';
        } else if (this.mySelectedHero) {
            this.heroSelectNetworkStatus.textContent = '你已锁定英雄！等待对手选定...';
        } else if (this.oppSelectedHero) {
            this.heroSelectNetworkStatus.textContent = '对手已锁定英雄！请尽快选择你的出战英雄...';
        }
    }

    checkBothHeroesSelected() {
        if (this.isHost && this.selectedP1Hero && this.selectedP2Hero) {
            // Both picked! Host starts the match
            setTimeout(() => {
                this.startOnlineMatchAsHost();
            }, 600);
        }
    }

    /**
     * A deck travels over the wire as {heroId, cardIds, levels}, never as card objects. The old
     * payload hand-picked a legacy field list (damage/shield/heal/…) and silently dropped
     * hit_count, status, buff, condition, then_effects, else_effects, reaction, level and the
     * effect callback — so every ported mechanic simply did not exist in an online match. Each
     * peer rebuilds both decks from its own card table with the same seed, so the order and the
     * contents are identical on both sides.
     */
    deckSpecFor(heroId) {
        const cardIds = (window.DeckBuilder && DeckBuilder.getDeck(heroId)) || [];
        const levels = {};
        cardIds.forEach(id => {
            const lv = (window.DeckBuilder && DeckBuilder.getCardLevel(id)) || 1;
            if (lv > 1) levels[id] = lv;
        });
        return { heroId: heroId, cardIds: cardIds, levels: levels };
    }

    buildDecksFromSpecs(p1Spec, p2Spec, seed) {
        const build = (spec) => {
            const ids = (spec && Array.isArray(spec.cardIds) && spec.cardIds.length > 0) ? spec.cardIds : null;
            return createShuffledDeck(spec.heroId, ids, window.createMatchRng(seed), spec.levels || {});
        };
        return { p1Deck: build(p1Spec), p2Deck: build(p2Spec) };
    }

    /** Both peers call this with identical payloads, so both deal the same 30 cards. */
    startOnlineMatch(p1HeroId, p2HeroId, p1Spec, p2Spec, seed) {
        const customDecks = this.buildDecksFromSpecs(
            p1Spec || { heroId: p1HeroId }, p2Spec || { heroId: p2HeroId }, seed);
        this.startBattle(p1HeroId, p2HeroId, customDecks, seed);
    }

    startOnlineMatchAsHost() {
        const seed = Math.floor(Math.random() * 100000000);
        const p1Spec = this.deckSpecFor(this.selectedP1Hero);
        // The guest ships its own deck; an empty spec falls back to that hero's configured pool,
        // which is still identical on both peers.
        const p2Spec = this.oppDeckSpec || { heroId: this.selectedP2Hero, cardIds: [], levels: {} };

        this.network.send({
            type: 'START_MATCH',
            p1HeroId: this.selectedP1Hero,
            p2HeroId: this.selectedP2Hero,
            seed: seed,
            p1Spec: p1Spec,
            p2Spec: p2Spec
        });

        this.startOnlineMatch(this.selectedP1Hero, this.selectedP2Hero, p1Spec, p2Spec, seed);
    }

    returnToLobby() {
        this.gameOverModal.classList.remove('active');
        this.battleScreen.classList.remove('active');
        this.heroSelectScreen.classList.remove('active');
        this.lobbyScreen.classList.add('active');

        this.btnCreateRoom.disabled = false;
        this.btnCreateRoom.textContent = '创建新房间 (我是房主)';
        this.hostRoomInfo.style.display = 'none';
        this.btnJoinRoom.disabled = false;
        this.joinStatusMsg.textContent = '';
        this.isOnline = false;
        this.game.isOnline = false;
    }

    showToast(title, msg, onConfirm) {
        this.toastTitle.textContent = title;
        this.toastMsg.textContent = msg;
        this.pendingToastAction = onConfirm;
        this.toastModal.classList.add('active');
    }

    initHeroSelectScreen() {
        this.heroCardsContainer.innerHTML = '';

        const btnHeroDeck = document.getElementById('btn-hero-open-deck');
        if (btnHeroDeck && !btnHeroDeck._bound) {
            btnHeroDeck._bound = true;
            btnHeroDeck.addEventListener('click', () => {
                if (window.DeckBuilder) {
                    window.DeckBuilder.openModal(this.selectedP1Hero || 'fire_warrior');
                }
            });
        }

        const seenIds = new Set();
        const heroes = Object.values(window.HERO_DATABASE).filter(hero => {
            if (!hero || seenIds.has(hero.id)) return false;
            seenIds.add(hero.id);
            return true;
        });

        heroes.forEach(hero => {
            const cardEl = document.createElement('div');
            cardEl.className = 'hero-select-card';
            cardEl.id = `hero-card-${hero.id}`;
            cardEl.innerHTML = `
                <div class="hero-card-header" style="background: ${hero.avatarBg}">
                    ${hero.image ? `<div class="hero-card-portrait-wrap"><img src="${hero.image}" alt="${hero.name}" class="hero-card-portrait" /></div>` : `<span class="hero-card-icon">${hero.icon}</span>`}
                    <div class="hero-card-name-box">
                        <h3 class="hero-card-name">${hero.name}</h3>
                        <span class="hero-card-title">${hero.title}</span>
                    </div>
                </div>
                <div class="hero-card-body">
                    <div class="hero-stats-row">
                        <div class="stat-pill"><span class="pill-label">HP</span><span class="pill-val hp-val">${hero.hp}</span></div>
                        <div class="stat-pill"><span class="pill-label">普攻</span><span class="pill-val atk-val">${hero.normalAttack}</span></div>
                    </div>
                    <div class="hero-feature-box">
                        <span class="feature-tag passive">被动：${hero.passive.name}</span>
                        <p class="feature-desc">${hero.passive.desc}</p>
                    </div>
                    <div class="hero-feature-box">
                        <span class="feature-tag skill">技能：${hero.skill.name} (${hero.skill.cost}能/CD ${hero.skill.cooldown})</span>
                        <p class="feature-desc">${hero.skill.desc}</p>
                    </div>
                    ${hero.description ? `<p class="hero-tactical-tip">${hero.description}</p>` : ''}
                    <button class="btn-select-hero" style="border-color: ${hero.themeColor}; color: ${hero.themeColor}">选择出战</button>
                </div>
            `;

            cardEl.querySelector('.btn-select-hero').addEventListener('click', () => {
                if (window.soundManager) {
                    window.soundManager.init();
                    window.soundManager.playCardPlay();
                }
                this.onHeroSelected(hero.id);
            });

            this.heroCardsContainer.appendChild(cardEl);
        });
    }

    updateHeroSelectTitle() {
        if (this.selectingForPlayer === 1) {
            this.heroSelectTitle.innerHTML = `<span>PLAYER 1</span> 请选择你的英雄`;
            this.heroSelectTitle.style.color = '#00d4ff';
        } else {
            this.heroSelectTitle.innerHTML = `<span>PLAYER 2</span> 请选择你的英雄`;
            this.heroSelectTitle.style.color = '#ffaa00';
        }
    }

    onHeroSelected(heroId) {
        if (this.isOnline) {
            // Online hero selection
            if (this.mySelectedHero) return; // Already locked
            this.mySelectedHero = heroId;

            if (this.isHost) {
                this.selectedP1Hero = heroId;
            } else {
                this.selectedP2Hero = heroId;
            }

            // Lock UI
            const cardEl = document.getElementById(`hero-card-${heroId}`);
            if (cardEl) {
                cardEl.classList.add('locked-selected');
                const btn = cardEl.querySelector('.btn-select-hero');
                btn.textContent = '✅ 已选定出战';
                btn.disabled = true;
            }

            // Disable all other buttons
            const allBtns = this.heroCardsContainer.querySelectorAll('.btn-select-hero');
            allBtns.forEach(b => {
                if (b.textContent !== '✅ 已选定出战') b.disabled = true;
            });

            // Notify peer
            this.network.send({
                type: 'SELECT_HERO',
                heroId: heroId,
                deck: this.deckSpecFor(heroId)
            });

            this.updateOnlineHeroSelectStatus();
            this.checkBothHeroesSelected();
        } else {
            // PVE campaign: the player picks a hero, the stage supplies the opponent.
            if (this.isPveMode) {
                this.selectedP1Hero = heroId;
                this.showBlessingModal((blessingId) => {
                    this.startPveBattle(this.selectedP1Hero, this.pendingPveStage, blessingId);
                }, this.blessingSubtitle(heroId));
                return;
            }

            // AI Mode or Local 1v1 hotseat hero selection
            if (this.isAIMode) {
                this.selectedP1Hero = heroId;
                const heroKeys = Object.keys(window.HERO_DATABASE);
                const otherHeroes = heroKeys.filter(k => k !== heroId);
                this.selectedP2Hero = otherHeroes.length > 0
                    ? otherHeroes[Math.floor(Math.random() * otherHeroes.length)]
                    : heroId;
                this.showBlessingModal((blessingId) => {
                    this.startBattle(this.selectedP1Hero, this.selectedP2Hero, null, null, blessingId);
                }, this.blessingSubtitle(heroId));
                return;
            }

            if (this.selectingForPlayer === 1) {
                this.selectedP1Hero = heroId;
                this.selectingForPlayer = 2;
                this.updateHeroSelectTitle();

                this.heroCardsContainer.classList.add('flash-transition');
                setTimeout(() => this.heroCardsContainer.classList.remove('flash-transition'), 300);
            } else {
                this.selectedP2Hero = heroId;
                this.showBlessingModal((blessingId) => {
                    this.startBattle(this.selectedP1Hero, this.selectedP2Hero, null, null, blessingId);
                }, this.blessingSubtitle(heroId));
            }
        }
    }

    /**
     * The three play modes are mutually exclusive, but each entry point used to set only its own
     * flag: after a solo or PVE match, going online left isAIMode/isPveMode on, which labelled the
     * remote opponent "电脑 (AI)", dealt it a random blessing, let this machine run the AI on the
     * opponent's turn, and finished online matches with the campaign settlement screen.
     * @param {'ai'|'local'|'online'|'pve'|'menu'} mode
     */
    setPlayMode(mode) {
        this.isAIMode = mode === 'ai' || mode === 'pve';
        this.isPveMode = mode === 'pve';
        this.isOnline = mode === 'online';
        if (mode !== 'pve') {
            this.currentPveStage = null;
            this.pendingPveStage = null;
        }
        this.game.isAIMode = this.isAIMode;
        this.game.isOnline = this.isOnline;
        this.game.isPveBattle = mode === 'pve';
        if (mode !== 'online') {
            this.localPlayerId = 'p1';
            this.game.localPlayerId = 'p1';
        }
    }

    blessingSubtitle(heroId) {
        const hero = (window.HERO_DATABASE && window.HERO_DATABASE[heroId]) || null;
        return hero
            ? `为【${hero.name}】挑选一项战前祝福，随后立即开战`
            : '选择一项强力被动祝福，直接强化英雄的 Modifier 战斗修正属性！';
    }

    startBattle(p1HeroId, p2HeroId, customDecks = null, seed = null, p1BlessingId = null) {
        this.heroSelectScreen.classList.remove('active');
        this.battleScreen.classList.add('active');
        this.game.isOnline = this.isOnline;
        this.game.isAIMode = this.isAIMode;
        this.game.localPlayerId = this.localPlayerId;

        // Auto load custom 12-card decks if customDecks was not passed
        if (!customDecks && window.DeckBuilder) {
            const p1CardIds = window.DeckBuilder.getDeck(p1HeroId);
            const p2CardIds = window.DeckBuilder.getDeck(p2HeroId);
            const p1Deck = window.createShuffledDeck(p1HeroId, p1CardIds);
            const p2Deck = window.createShuffledDeck(p2HeroId, p2CardIds);
            customDecks = { p1Deck, p2Deck };
        }

        this.game.initMatch(p1HeroId, p2HeroId, customDecks, seed);

        // Apply blessing
        if (p1BlessingId && this.game.p1) {
            this.game.applyBlessing(this.game.p1, p1BlessingId);
        }
        if (this.isAIMode && this.game.p2) {
            const aiBlessings = ['mark_of_flame', 'iron_bastion', 'fountain_of_life', 'swift_strike', 'frost_embrace', 'venomous_edge'];
            const aiPick = aiBlessings[Math.floor(Math.random() * aiBlessings.length)];
            this.game.applyBlessing(this.game.p2, aiPick);
        }

        if (this.isAIMode) {
            this.game.p1.name = '玩家 1 (你)';
            this.game.p2.name = '电脑 (AI)';
            if (this.battleModeBadge) this.battleModeBadge.textContent = '🤖 单人切磋 (对战 AI)';
        } else if (!this.isOnline) {
            this.game.p1.name = '玩家 1';
            this.game.p2.name = '玩家 2';
            if (this.battleModeBadge) this.battleModeBadge.textContent = '🎮 本地双人对弈';
        }

        this.renderBattlefield();
    }

    /**
     * Chapter map node clicked: show the hero picker. The stage defines the opponent, so this is
     * a one-sided selection rather than the hotseat two-step.
     */
    enterPveStage(stage) {
        this.setPlayMode('pve');       // the stage boss is driven by the same AI as 切磋
        this.pendingPveStage = stage;

        if (this.pveView) this.pveView.close();
        this.selectedP1Hero = null;
        this.selectedP2Hero = null;
        this.selectingForPlayer = 1;
        this.initHeroSelectScreen();
        if (this.heroSelectTitle) {
            this.heroSelectTitle.textContent = `⚔️ 讨伐 ${stage.stageCode} · ${stage.stageName}`;
        }
        const subtitle = this.heroSelectNetworkStatus;
        if (subtitle) {
            subtitle.textContent = `对手：${stage.enemyName}（首领生命 ${stage.enemyMaxHp}） · 推荐战力 ${stage.recommendedPower}`;
        }
        this.heroSelectScreen.classList.add('active');
        this.heroSelectScreen.style.display = 'flex';
    }

    startPveBattle(playerHeroId, stage, blessingId) {
        if (!stage) { this.returnToStartMenu(); return; }
        this.currentPveStage = stage;

        this.heroSelectScreen.classList.remove('active');
        this.heroSelectScreen.style.display = 'none';
        this.battleScreen.classList.add('active');

        this.game.isOnline = false;
        this.game.isAIMode = true;
        this.game.localPlayerId = 'p1';

        const deckIds = window.DeckBuilder ? DeckBuilder.getDeck(playerHeroId) : null;
        // Always go through PveSystem.startBattle: it registers the boss hero definition and deals
        // both opening hands from the final decks. Calling initPveMatch with a bare enemy id used to
        // skip that step and silently spawn a 30-HP boss.
        PveSystem.startBattle(this.game, playerHeroId, stage, Date.now() & 0x7fffffff, deckIds);

        if (blessingId) this.game.applyBlessing(this.game.p1, blessingId);

        this.game.p1.name = '你';
        this.game.p2.name = stage.enemyName;
        if (this.battleModeBadge) {
            this.battleModeBadge.textContent = `🗺️ 章节讨伐 ${stage.stageCode} · ${stage.stageName}`;
        }

        this.renderBattlefield();
    }

    /**
     * PVE settlement. Rewards are granted by PveSystem (which is what knows whether this was a
     * first clear); the old code paid a flat +100 gold for any AI win and never touched stages.
     */
    settlePveVictory(stage, playerWon) {
        const summary = { stage, playerWon, rewards: null };
        if (playerWon) {
            summary.rewards = PveSystem.settleVictory(stage, {
                onCurrency: ({ gold, gems, unlockedCardId }) => {
                    if (window.Wallet) Wallet.credit(gold, gems);
                    if (unlockedCardId) Wallet.grant(unlockedCardId, 1);
                }
            });
            PveSystem.syncToServer();
        }
        return summary;
    }

    showPveRewardModal(settlement) {
        const { stage, playerWon, rewards } = settlement;
        const body = document.getElementById('pve-reward-body');
        if (!body) return;

        if (!playerWon) {
            body.innerHTML = `
                <div class="pve-reward-empty">
                    首领剩余血量未被清空。${stage.stageName} 的首领 ${stage.enemyName} 仍是 ${stage.enemyMaxHp} 生命。<br>
                    提示：先打前面的关卡攒金币，用抽卡把 PVE 卡牌升到 Lv.3 再回来。
                </div>`;
        } else {
            const rows = [];
            rows.push(`<div class="pve-reward-row ${rewards.isFirstClear ? 'is-new' : ''}">
                    <span>${rewards.isFirstClear ? '🏆 首通奖励' : '🔁 重复讨伐'}</span><b>+${rewards.gold} 金币</b></div>`);
            if (rewards.gems) {
                rows.push(`<div class="pve-reward-row is-new"><span>💎 首通宝石</span><b>+${rewards.gems}</b></div>`);
            }
            if (rewards.unlockedCardId) {
                const card = (window.CARD_BY_ID || {})[rewards.unlockedCardId];
                rows.push(`<div class="pve-reward-row is-new"><span>🎴 获得卡牌</span><b>${card ? card.name : rewards.unlockedCardId}</b></div>`);
            }
            if (rewards.hasNextStage) {
                const next = PveSystem.getStage(rewards.nextStageId);
                if (next) {
                    rows.push(`<div class="pve-reward-row"><span>🔓 解锁关卡</span><b>${next.stageCode} ${next.stageName}</b></div>`);
                }
            }
            body.innerHTML = `<div class="pve-reward-list">${rows.join('')}</div>`;
        }
        body.style.display = 'block';

        // Repurpose the three actions for the campaign: retry, pick another hero, chapter map.
        const restart = document.getElementById('btn-restart-match');
        const change = document.getElementById('btn-change-heroes');
        const lobby = document.getElementById('btn-game-over-lobby');
        if (restart) restart.textContent = '⚔️ 再次讨伐本关';
        if (change) change.textContent = '🦸 换一个英雄';
        if (lobby) lobby.textContent = '🗺️ 返回章节地图';
    }

    hidePveRewardModal() {
        const body = document.getElementById('pve-reward-body');
        if (body) { body.style.display = 'none'; body.innerHTML = ''; }
        const restart = document.getElementById('btn-restart-match');
        const change = document.getElementById('btn-change-heroes');
        const lobby = document.getElementById('btn-game-over-lobby');
        if (restart) restart.textContent = '再来一局';
        if (change) change.textContent = '返回选择角色';
        if (lobby) lobby.textContent = '返回大厅';
    }

    /** Replay the same stage with the same hero, straight from the game-over modal. */
    retryPveStage() {
        const stage = this.currentPveStage;
        const heroId = this.selectedP1Hero;
        if (!stage || !heroId) return;
        this.gameOverModal.classList.remove('active');
        this.hidePveRewardModal();
        this.startPveBattle(heroId, stage, null);
    }

    /**
     * Shared card chrome (rarity seal, card-pool tag, mechanic badges, illustration layer) so the
     * battlefield, codex and gacha reveal all describe a card the same way.
     */
    static cardVisualExtras(card) {
        const rarityKey = (card.rarity || card.tier || 'common').toLowerCase();
        const sealLabel = { common: 'N', rare: 'R', epic: 'SR', legendary: 'SSR' }[rarityKey] || 'N';
        const seal = `<div class="rarity-seal seal-${rarityKey}">${sealLabel}</div>`;

        const poolKey = String(card.pool_type || 'Base').toLowerCase();
        const poolLabel = { base: '基础', pvp: '竞技', pve: '成长' }[poolKey] || '基础';
        const poolTag = `<div class="card-pool-tag pool-${poolKey}">${poolLabel}</div>`;

        const badges = [];
        if (Number(card.hit_count || 1) > 1) badges.push(`<span class="mech-badge mech-multi">${card.hit_count} 段</span>`);
        if (Number(card.self_damage || 0) > 0) badges.push(`<span class="mech-badge mech-recoil">反噬 ${card.self_damage}</span>`);
        if (card.condition && card.condition.indexOf('last_was') !== -1) badges.push('<span class="mech-badge mech-branch">态势判定</span>');
        else if (card.condition) badges.push('<span class="mech-badge mech-branch">条件分支</span>');
        if (card.reaction) badges.push('<span class="mech-badge mech-reaction">延迟反应</span>');
        const mechBadges = badges.length ? `<div class="card-mech-badges">${badges.join('')}</div>` : '';

        const element = card.element || 'strike';
        // Per-card illustration first, element tile as the fallback, and only then the pure CSS
        // gradient — a missing file must degrade quietly instead of leaving a broken image icon.
        const cardId = String(card.id || card.cardId || '').replace(/[^a-zA-Z0-9_-]/g, '');
        const elementSrc = `assets/card-art/${element}.jpg`;
        const artSrc = cardId ? `assets/card-art/by-id/${cardId}.jpg` : elementSrc;
        const artImg = `<img class="card-art-img" src="${artSrc}" alt="" data-fallback="${elementSrc}" data-fb="0"
            onload="if (this.naturalWidth) this.classList.add('is-loaded');"
            onerror="if (this.dataset.fb === '0') { this.dataset.fb = '1'; this.src = this.dataset.fallback; } else { this.remove(); }" />`;

        return { seal, poolTag, mechBadges, artImg, sealLabel };
    }

    static rarityLabel(card) {
        return CardBattleUI.cardVisualExtras(card).sealLabel;
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

    showBlessingModal(callback, subtitleText) {
        const modal = document.getElementById('modal-blessing-select');
        const grid = document.getElementById('blessing-cards-grid');
        const btnConfirm = document.getElementById('btn-confirm-blessing');
        const btnSkip = document.getElementById('btn-skip-blessing');
        const btnClose = document.getElementById('btn-close-blessing');

        if (!modal || !grid || !btnConfirm) {
            if (callback) callback('swift_strike');
            return;
        }

        const subtitle = modal.querySelector('.banner-subtitle');
        if (subtitle && subtitleText) subtitle.textContent = subtitleText;

        grid.innerHTML = '';
        let selectedId = null;
        btnConfirm.disabled = true;
        btnConfirm.style.opacity = '0.5';
        btnConfirm.textContent = '请先点击选择一项祝福';

        const closeModalAndRun = (chosenId) => {
            modal.classList.remove('active');
            modal.style.display = 'none';
            if (callback) callback(chosenId);
        };

        if (btnSkip) {
            btnSkip.onclick = () => closeModalAndRun(null);
        }
        if (btnClose) {
            btnClose.onclick = () => closeModalAndRun(null);
        }
        modal.onclick = (e) => {
            if (e.target === modal) closeModalAndRun(null);
        };

        const blessingsConfig = (window.GAME_CONFIG && window.GAME_CONFIG.blessings) ? window.GAME_CONFIG.blessings : {};
        const blessingList = Object.values(blessingsConfig);
        if (blessingList.length === 0) {
            // No data to offer: deal the match without a blessing rather than rendering a modal
            // out of a second, hand-maintained copy of the table (which used to drift from config).
            if (callback) callback(null);
            return;
        }

        blessingList.forEach(b => {
            const item = document.createElement('div');
            item.className = 'blessing-card-item';
            item.dataset.id = b.id;

            let modStr = '';
            if (b.modifiers) {
                const parts = [];
                if (b.modifiers.damageBonus) parts.push(`全伤+${b.modifiers.damageBonus}`);
                if (b.modifiers.shieldBonus) parts.push(`护盾+${b.modifiers.shieldBonus}`);
                if (b.modifiers.healBonus) parts.push(`治疗+${b.modifiers.healBonus}`);
                if (b.modifiers.fireDamageBonus) parts.push(`火伤+${b.modifiers.fireDamageBonus}`);
                if (b.modifiers.iceDamageBonus) parts.push(`冰伤+${b.modifiers.iceDamageBonus}`);
                if (b.modifiers.poisonDamageBonus) parts.push(`毒伤+${b.modifiers.poisonDamageBonus}`);
                modStr = parts.join(' | ');
            }

            item.innerHTML = `
                <div class="blessing-card-icon">${b.icon || '✨'}</div>
                <strong class="blessing-card-name">${b.name}</strong>
                <p class="blessing-card-desc">${b.description}</p>
                ${modStr ? `<span class="blessing-card-mod">${modStr}</span>` : ''}
            `;

            item.addEventListener('click', () => {
                grid.querySelectorAll('.blessing-card-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                selectedId = b.id;
                btnConfirm.disabled = false;
                btnConfirm.style.opacity = '1';
                btnConfirm.textContent = `确认选择【${b.name}】并出征 ⚔️`;
            });

            grid.appendChild(item);
        });

        // onclick (not addEventListener) so reopening the modal replaces the handler instead of
        // stacking one per open. Cloning the node to drop listeners used to leave this reference
        // pointing at the detached copy, so the visible button stayed disabled forever.
        btnConfirm.onclick = () => {
            if (!selectedId) return;
            closeModalAndRun(selectedId);
        };

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    hookGameCallbacks() {
        this.game.onStateChange = () => this.renderBattlefield();
        this.game.onDamageDealt = (target, hpDmg, shieldDmg, isCrit) => this.showDamageFeedback(target, hpDmg, shieldDmg, isCrit);
        this.game.onHeal = (player, amount) => this.showHealFeedback(player, amount);
        this.game.onShieldGain = (player, amount) => this.showShieldFeedback(player, amount);
        this.game.onLogAdded = (log) => this.addLogToUI(log);
        this.game.onGameOver = (result) => this.showGameOverScreen(result);
    }

    renderBattlefield() {
        if (!this.game.p1 || !this.game.p2) return;

        let localPlayer, oppPlayer;
        if (this.isOnline) {
            localPlayer = this.game[this.localPlayerId];
            oppPlayer = this.localPlayerId === 'p1' ? this.game.p2 : this.game.p1;
        } else if (this.isAIMode) {
            localPlayer = this.game.p1;
            oppPlayer = this.game.p2;
        } else {
            localPlayer = this.game.activePlayer;
            oppPlayer = this.game.inactivePlayer;
        }

        const currentPlayerId = this.game.activePlayer.id;
        const currentLocalId = this.isOnline ? this.localPlayerId : (this.isAIMode ? 'p1' : localPlayer.id);
        const isMyTurn = (currentPlayerId === currentLocalId);

        // 1. Render Opponent (Top)
        if (oppPlayer.hero.image) {
            this.oppAvatar.innerHTML = `<img src="${oppPlayer.hero.image}" alt="${oppPlayer.hero.name}" class="avatar-img" />`;
            this.oppAvatar.style.background = oppPlayer.hero.avatarBg;
        } else {
            this.oppAvatar.textContent = oppPlayer.hero.icon;
            this.oppAvatar.style.background = oppPlayer.hero.avatarBg;
        }
        this.oppName.textContent = oppPlayer.name;
        this.oppHeroTitle.textContent = `${oppPlayer.hero.name} · ${oppPlayer.hero.title}`;

        const oppHpPct = (oppPlayer.hp / oppPlayer.maxHp) * 100;
        this.oppHpBar.style.width = `${Math.max(0, oppHpPct)}%`;
        this.oppHpText.textContent = `${oppPlayer.hp} / ${oppPlayer.maxHp}`;

        const oppShieldPct = (oppPlayer.shield / 10) * 100;
        this.oppShieldBar.style.width = `${Math.min(100, oppShieldPct)}%`;
        this.oppShieldText.textContent = `${oppPlayer.shield} / 10`;

        this.renderEnergyGems(this.oppEnergyGems, oppPlayer.energy);
        this.renderBuffBadges(this.oppBuffs, oppPlayer);

        if (this.isOnline) {
            this.renderOppHandCards(oppPlayer.hand.length);
        } else {
            this.renderOppHandCards(oppPlayer.hand.length);
        }

        // 2. Render Local Player (Bottom)
        if (localPlayer.hero.image) {
            this.actAvatar.innerHTML = `<img src="${localPlayer.hero.image}" alt="${localPlayer.hero.name}" class="avatar-img" />`;
            this.actAvatar.style.background = localPlayer.hero.avatarBg;
        } else {
            this.actAvatar.textContent = localPlayer.hero.icon;
            this.actAvatar.style.background = localPlayer.hero.avatarBg;
        }
        this.actName.textContent = localPlayer.name;
        this.actHeroTitle.textContent = `${localPlayer.hero.name} · ${localPlayer.hero.title}`;

        const actHpPct = (localPlayer.hp / localPlayer.maxHp) * 100;
        this.actHpBar.style.width = `${Math.max(0, actHpPct)}%`;
        this.actHpText.textContent = `${localPlayer.hp} / ${localPlayer.maxHp}`;

        const actShieldPct = (localPlayer.shield / 10) * 100;
        this.actShieldBar.style.width = `${Math.min(100, actShieldPct)}%`;
        this.actShieldText.textContent = `${localPlayer.shield} / 10`;

        this.renderEnergyGems(this.actEnergyGems, localPlayer.energy);
        this.actEnergyCount.textContent = `${localPlayer.energy}/6`;
        this.renderBuffBadges(this.actBuffs, localPlayer);

        // 3. Render Action Buttons
        if (!isMyTurn) {
            const waitMsg = this.isAIMode ? '🤖 AI 思考决策中...' : '⏳ 对手行动中...';
            this.btnNormalAtk.disabled = true;
            this.btnNormalAtk.innerHTML = `<span>${waitMsg}</span>`;
            this.btnNormalAtk.classList.add('btn-spent');

            this.btnHeroSkill.disabled = true;
            this.btnHeroSkill.innerHTML = `<span>${waitMsg}</span>`;
            this.btnHeroSkill.classList.add('btn-spent');

            this.btnEndTurn.disabled = true;
            this.btnEndTurn.innerHTML = `<span>${waitMsg}</span>`;
            this.btnEndTurn.classList.add('btn-spent');

            this.actHandContainer.classList.add('hand-disabled');
        } else {
            this.actHandContainer.classList.remove('hand-disabled');

            // Normal attack button
            if (localPlayer.hasNormalAttacked) {
                this.btnNormalAtk.disabled = true;
                this.btnNormalAtk.innerHTML = `<span>⚔️ 本回合已攻击</span>`;
                this.btnNormalAtk.classList.add('btn-spent');
            } else if (!localPlayer.canNormalAttackThisTurn) {
                this.btnNormalAtk.disabled = true;
                this.btnNormalAtk.innerHTML = `<span>🚫 普攻受限 (能量爆发)</span>`;
                this.btnNormalAtk.classList.add('btn-spent');
            } else {
                this.btnNormalAtk.disabled = false;
                this.btnNormalAtk.innerHTML = `<span>⚔️ 普通攻击 (${localPlayer.hero.normalAttack} 伤)</span>`;
                this.btnNormalAtk.classList.remove('btn-spent');
            }

            // Hero skill button
            const skill = localPlayer.hero.skill;
            if (localPlayer.hasUsedSkill) {
                this.btnHeroSkill.disabled = true;
                this.btnHeroSkill.innerHTML = `<span>✨ 本回合已使用技能</span>`;
                this.btnHeroSkill.classList.add('btn-spent');
            } else if (localPlayer.skillCooldown > 0) {
                this.btnHeroSkill.disabled = true;
                this.btnHeroSkill.innerHTML = `<span>⏳ 冷却中 (剩 ${localPlayer.skillCooldown} 回合)</span>`;
                this.btnHeroSkill.classList.add('btn-spent');
            } else if (localPlayer.energy < skill.cost) {
                this.btnHeroSkill.disabled = true;
                this.btnHeroSkill.innerHTML = `<span>⚡ ${skill.name} (需 ${skill.cost} 能)</span>`;
                this.btnHeroSkill.classList.add('btn-spent');
            } else {
                this.btnHeroSkill.disabled = false;
                this.btnHeroSkill.innerHTML = `<span>✨ ${skill.name} (${skill.cost} 能)</span>`;
                this.btnHeroSkill.classList.remove('btn-spent');
            }

            // End turn button
            this.btnEndTurn.disabled = false;
            this.btnEndTurn.innerHTML = `<span>⌛ 结束回合</span>`;
            this.btnEndTurn.classList.remove('btn-spent');
        }

        // 4. Render Local Player's Hand Cards
        this.renderHandCards(localPlayer, isMyTurn);

        // 5. Update Turn Banner
        const currentRound = Math.ceil(this.game.turnCount / 2);
        if (this.isOnline) {
            if (isMyTurn) {
                this.turnBannerText.textContent = `⚡ 你的回合 (第 ${currentRound} 轮) - 请出牌或行动！`;
                this.turnBanner.style.borderColor = '#00ff88';
            } else {
                this.turnBannerText.textContent = `⏳ 对手回合中 (第 ${currentRound} 轮) - 等待出牌...`;
                this.turnBanner.style.borderColor = '#ffaa00';
            }
        } else {
            this.turnBannerText.textContent = `${this.game.activePlayer.name} 的回合 (第 ${currentRound} 轮)`;
            this.turnBanner.style.borderColor = this.game.activePlayer.id === 'p1' ? '#00d4ff' : '#ffaa00';
        }

        // Live update status modal if open
        if (this.modalStatusDetail && this.modalStatusDetail.classList.contains('active')) {
            this.renderStatusModal();
        }

        // Level-triggered: read the current state and decide, so a render that happens to land
        // while the AI is mid-turn cannot swallow the only trigger for the next one.
        this.pumpAI();
    }

    /**
     * Start the AI if it is the AI's turn and nothing is already moving. Called from every render
     * and from the watchdog, so the decision is always made from live state rather than from a
     * single edge that can be missed.
     */
    pumpAI() {
        if (!this.isAIMode || !this.ai) return;
        const game = this.game;
        if (!game || game.isGameOver) return;
        if (!this.battleScreen || !this.battleScreen.classList.contains('active')) return;

        this.ensureAiPump();

        const actor = game.p2;
        if (!actor || game.activePlayer !== actor) return;
        if (this.ai.isRunning || this.aiTriggerPending) return;

        this.aiTriggerPending = true;
        setTimeout(() => {
            this.aiTriggerPending = false;
            if (this.isAIMode && !game.isGameOver && game.activePlayer === actor && !this.ai.isRunning) {
                this.ai.runAITurn();
            }
        }, 200);
    }

    /**
     * Watchdog for the case where a turn begins while no render follows — without it a single
     * missed trigger strands the match on the opponent's turn with a dead board.
     */
    ensureAiPump() {
        if (this.aiPump || !this.isAIMode) return;
        this.aiPump = setInterval(() => {
            if (!this.isAIMode || this.game.isGameOver || !this.battleScreen.classList.contains('active')) {
                clearInterval(this.aiPump);
                this.aiPump = null;
                return;
            }
            this.pumpAI();
        }, 700);
    }

    renderEnergyGems(container, energyCount) {
        container.innerHTML = '';
        for (let i = 1; i <= 6; i++) {
            const gem = document.createElement('div');
            gem.className = 'energy-gem';
            if (i <= energyCount) {
                gem.classList.add('charged');
            }
            container.appendChild(gem);
        }
    }

    renderBuffBadges(container, player) {
        container.innerHTML = '';
        let badgeCount = 0;

        if (player.shield > 0) {
            badgeCount++;
            this.addBadge(container, {
                icon: '🛡️',
                label: '护盾',
                val: player.shield,
                dur: null,
                color: '#00d4ff',
                type: 'buff',
                tooltip: `战斗护盾: 可抵扣 ${player.shield} 点物理/技能伤害（最大上限 10 点）`
            }, container);
        }
        if (player.debuffs.burnStacks > 0) {
            badgeCount++;
            const burnDmg = player.debuffs.burnStacks * 1;
            this.addBadge(container, {
                icon: '🔥',
                label: '灼烧',
                val: `x${player.debuffs.burnStacks}`,
                dur: `${player.debuffs.burnDuration}T`,
                color: '#ff4422',
                type: 'debuff',
                tooltip: `灼烧Debuff: 当前 ${player.debuffs.burnStacks} 层，回合末结算 ${burnDmg} 点真实伤害（剩余 ${player.debuffs.burnDuration} 回合）`
            }, container);
        }
        if (player.debuffs.poisonStacks > 0) {
            badgeCount++;
            const poisonDmg = player.debuffs.poisonStacks * 1;
            this.addBadge(container, {
                icon: '🐍',
                label: '中毒',
                val: `x${player.debuffs.poisonStacks}`,
                dur: `${player.debuffs.poisonDuration}T`,
                color: '#bb33ff',
                type: 'debuff',
                tooltip: `中毒Debuff: 当前 ${player.debuffs.poisonStacks} 层，回合末结算 ${poisonDmg} 点真实伤害（剩余 ${player.debuffs.poisonDuration} 回合）`
            }, container);
        }
        if (player.debuffs.weaken > 0) {
            badgeCount++;
            this.addBadge(container, {
                icon: '🌀',
                label: '虚弱',
                val: `-${player.debuffs.weaken}伤`,
                dur: '1T',
                color: '#ff9900',
                type: 'debuff',
                tooltip: `虚弱Debuff: 造成的物理攻击与卡牌伤害降低 ${player.debuffs.weaken} 点（持续 1 回合）`
            }, container);
        }
        if (player.debuffs && player.debuffs.freeze > 0) {
            badgeCount++;
            this.addBadge(container, {
                icon: '❄️',
                label: '冰冻',
                val: '封禁',
                dur: `${player.debuffs.freeze}T`,
                color: '#00e5ff',
                type: 'debuff',
                tooltip: `冰冻Debuff: 极寒冰封状态，回合开始时无法进行普通攻击与技能行动（剩余 ${player.debuffs.freeze} 回合）`
            }, container);
        }
        if (player.buffs.damageReduction > 0) {
            badgeCount++;
            const pct = Math.round(player.buffs.damageReduction * 100);
            this.addBadge(container, {
                icon: '🥋',
                label: '减伤',
                val: `${pct}%`,
                dur: '1T',
                color: '#33ff88',
                type: 'buff',
                tooltip: `防守Buff: 本回合受到的物理与技能伤害降低 ${pct}%`
            }, container);
        }
        if (player.buffs.flatDamageReduction > 0) {
            badgeCount++;
            this.addBadge(container, {
                icon: '🛡️',
                label: '坚壁',
                val: `-${player.buffs.flatDamageReduction}`,
                dur: '1次',
                color: '#00ffff',
                type: 'buff',
                tooltip: `坚甲Buff: 本回合受到的下一次伤害减少 ${player.buffs.flatDamageReduction} 点`
            }, container);
        }
        if (player.buffs.nextDamageBonus > 0) {
            badgeCount++;
            this.addBadge(container, {
                icon: '🎯',
                label: '蓄力',
                val: `+${player.buffs.nextDamageBonus}`,
                dur: '1次',
                color: '#ffdd00',
                type: 'buff',
                tooltip: `战术蓄力Buff: 下一次造成的物理或技能伤害额外增加 ${player.buffs.nextDamageBonus} 点`
            }, container);
        }

        // Empty state indicator
        if (badgeCount === 0) {
            const emptyEl = document.createElement('span');
            emptyEl.className = 'status-badge-empty';
            emptyEl.innerHTML = `<span class="badge-icon">✨</span><span class="badge-name">状态正常</span>`;
            emptyEl.title = '当前未处于任何异常或增益状态。点击可查看角色天赋机制与实时牌库数据';
            emptyEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const isMe = (container === this.actBuffs);
                this.openStatusModal(isMe ? 'self' : 'opp');
            });
            container.appendChild(emptyEl);
        }
    }

    addBadge(container, badgeInfo, parentContainer) {
        const badge = document.createElement('div');
        badge.className = `status-badge pill-badge ${badgeInfo.type}`;
        badge.style.borderColor = badgeInfo.color;
        badge.style.boxShadow = `0 0 8px ${badgeInfo.color}55`;

        let innerHtml = `<span class="badge-icon">${badgeInfo.icon}</span><span class="badge-label">${badgeInfo.label}</span>`;
        if (badgeInfo.val !== undefined && badgeInfo.val !== null) {
            innerHtml += `<span class="badge-val-tag">${badgeInfo.val}</span>`;
        }
        if (badgeInfo.dur) {
            innerHtml += `<span class="badge-dur-tag">${badgeInfo.dur}</span>`;
        }

        badge.innerHTML = innerHtml;
        if (badgeInfo.tooltip) {
            badge.title = `${badgeInfo.tooltip} (点击查看完整状态与机制详情)`;
        }
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            const isMe = (parentContainer === this.actBuffs);
            this.openStatusModal(isMe ? 'self' : 'opp');
        });
        container.appendChild(badge);
    }

    openStatusModal(tab = 'self') {
        this.activeStatusTab = tab;
        if (this.tabStatusSelf) this.tabStatusSelf.classList.toggle('active', tab === 'self');
        if (this.tabStatusOpp) this.tabStatusOpp.classList.toggle('active', tab === 'opp');
        if (this.tabStatusHistory) this.tabStatusHistory.classList.toggle('active', tab === 'history');

        const titleEl = document.querySelector('.status-modal-title');
        if (titleEl) {
            if (tab === 'history') {
                titleEl.textContent = '📜 逐回合战斗对局详情与明细战记';
            } else {
                titleEl.textContent = '🔍 实时战斗与英雄状态面板';
            }
        }

        this.renderStatusModal();
        if (this.modalStatusDetail) {
            this.modalStatusDetail.classList.add('active');
        }
    }

    renderStatusModal() {
        if (!this.game || !this.statusPanelBody) return;

        if (this.activeStatusTab === 'history') {
            this.renderHistoryTab();
            return;
        }

        if (!this.game.p1 || !this.game.p2) return;

        let localPlayer, oppPlayer;
        if (this.isOnline) {
            localPlayer = this.game[this.localPlayerId];
            oppPlayer = this.localPlayerId === 'p1' ? this.game.p2 : this.game.p1;
        } else if (this.isAIMode) {
            localPlayer = this.game.p1;
            oppPlayer = this.game.p2;
        } else {
            localPlayer = this.game.activePlayer;
            oppPlayer = this.game.inactivePlayer;
        }
        if (!localPlayer || !oppPlayer) return;

        const isSelf = (this.activeStatusTab === 'self');
        const targetPlayer = isSelf ? localPlayer : oppPlayer;
        if (!targetPlayer) return;

        // Tab titles
        if (this.tabStatusSelf) {
            this.tabStatusSelf.textContent = `🛡️ 我的状态 (${localPlayer.name} · ${localPlayer.hero.name})`;
        }
        if (this.tabStatusOpp) {
            this.tabStatusOpp.textContent = `⚔️ 对手状态 (${oppPlayer.name} · ${oppPlayer.hero.name})`;
        }

        const hero = targetPlayer.hero;

        // Buffs List
        let buffsHtml = '';
        let buffCount = 0;

        if (targetPlayer.blessing) {
            buffCount++;
            buffsHtml += `
                <div class="status-card-item" style="border-color: #8b5cf6; background: rgba(139, 92, 246, 0.1);">
                    <div class="status-item-left">
                        <span class="status-item-icon">${targetPlayer.blessing.icon || '✨'}</span>
                        <div class="status-item-text-group">
                            <span class="status-item-title" style="color: #c084fc;">战斗祝福：${targetPlayer.blessing.name}</span>
                            <span class="status-item-desc">${targetPlayer.blessing.description}</span>
                        </div>
                    </div>
                    <span class="status-item-badge buff" style="background: #8b5cf6; color: #fff;">已生效</span>
                </div>
            `;
        }

        if (targetPlayer.modifiers) {
            const mods = targetPlayer.modifiers;
            const activeMods = [];
            if (mods.damageBonus > 0) activeMods.push(`全伤 +${mods.damageBonus}`);
            if (mods.shieldBonus > 0) activeMods.push(`护盾 +${mods.shieldBonus}`);
            if (mods.healBonus > 0) activeMods.push(`治疗 +${mods.healBonus}`);
            if (mods.fireDamageBonus > 0) activeMods.push(`火伤 +${mods.fireDamageBonus}`);
            if (mods.iceDamageBonus > 0) activeMods.push(`冰伤 +${mods.iceDamageBonus}`);
            if (mods.poisonDamageBonus > 0) activeMods.push(`毒伤 +${mods.poisonDamageBonus}`);

            if (activeMods.length > 0) {
                buffCount++;
                buffsHtml += `
                    <div class="status-card-item">
                        <div class="status-item-left">
                            <span class="status-item-icon">⚡</span>
                            <div class="status-item-text-group">
                                <span class="status-item-title">英雄修正属性 (Modifiers)</span>
                                <span class="status-item-desc">${activeMods.join('，')}</span>
                            </div>
                        </div>
                        <span class="status-item-badge buff">${activeMods.length} 项修正</span>
                    </div>
                `;
            }
        }

        if (targetPlayer.shield > 0) {
            buffCount++;
            buffsHtml += `
                <div class="status-card-item">
                    <div class="status-item-left">
                        <span class="status-item-icon">🛡️</span>
                        <div class="status-item-text-group">
                            <span class="status-item-title">战斗护盾</span>
                            <span class="status-item-desc">可抵扣物理攻击及技能伤害（回合开始时重置）</span>
                        </div>
                    </div>
                    <span class="status-item-badge buff">${targetPlayer.shield} 点护盾</span>
                </div>
            `;
        }

        if (targetPlayer.buffs.damageReduction > 0) {
            buffCount++;
            const pct = Math.round(targetPlayer.buffs.damageReduction * 100);
            buffsHtml += `
                <div class="status-card-item">
                    <div class="status-item-left">
                        <span class="status-item-icon">🥋</span>
                        <div class="status-item-text-group">
                            <span class="status-item-title">百分比减伤防守</span>
                            <span class="status-item-desc">本回合受到的所有物理与技能伤害降低 ${pct}%</span>
                        </div>
                    </div>
                    <span class="status-item-badge buff">减伤 ${pct}%</span>
                </div>
            `;
        }

        if (targetPlayer.buffs.flatDamageReduction > 0) {
            buffCount++;
            buffsHtml += `
                <div class="status-card-item">
                    <div class="status-item-left">
                        <span class="status-item-icon">🛡️</span>
                        <div class="status-item-text-group">
                            <span class="status-item-title">坚甲防护</span>
                            <span class="status-item-desc">本回合受到的下一次伤害减少 ${targetPlayer.buffs.flatDamageReduction} 点</span>
                        </div>
                    </div>
                    <span class="status-item-badge buff">减伤 -${targetPlayer.buffs.flatDamageReduction}伤</span>
                </div>
            `;
        }

        if (targetPlayer.buffs.nextDamageBonus > 0) {
            buffCount++;
            buffsHtml += `
                <div class="status-card-item">
                    <div class="status-item-left">
                        <span class="status-item-icon">🎯</span>
                        <div class="status-item-text-group">
                            <span class="status-item-title">战术伤害蓄力</span>
                            <span class="status-item-desc">下一次攻击或技能造成的伤害提升 ${targetPlayer.buffs.nextDamageBonus} 点</span>
                        </div>
                    </div>
                    <span class="status-item-badge buff">伤害 +${targetPlayer.buffs.nextDamageBonus}</span>
                </div>
            `;
        }

        if (buffCount === 0) {
            buffsHtml = `<div class="status-empty-text">🍃 当前无活跃的增益 Buff</div>`;
        }

        // Debuffs List
        let debuffsHtml = '';
        let debuffCount = 0;

        if (targetPlayer.debuffs.burnStacks > 0) {
            debuffCount++;
            const burnDmg = targetPlayer.debuffs.burnStacks * 1;
            debuffsHtml += `
                <div class="status-card-item">
                    <div class="status-item-left">
                        <span class="status-item-icon">🔥</span>
                        <div class="status-item-text-group">
                            <span class="status-item-title">灼烧状态</span>
                            <span class="status-item-desc">回合结束时受到 1伤/层 真实伤害（剩余 ${targetPlayer.debuffs.burnDuration} 回合）</span>
                        </div>
                    </div>
                    <span class="status-item-badge debuff">${targetPlayer.debuffs.burnStacks} 层 (预估 ${burnDmg} 伤)</span>
                </div>
            `;
        }

        if (targetPlayer.debuffs.poisonStacks > 0) {
            debuffCount++;
            const poisonDmg = targetPlayer.debuffs.poisonStacks * 1;
            debuffsHtml += `
                <div class="status-card-item">
                    <div class="status-item-left">
                        <span class="status-item-icon">🐍</span>
                        <div class="status-item-text-group">
                            <span class="status-item-title">剧毒缠身</span>
                            <span class="status-item-desc">回合结束时受到 1 伤/层 真实伤害（剩余 ${targetPlayer.debuffs.poisonDuration} 回合）</span>
                        </div>
                    </div>
                    <span class="status-item-badge debuff">${targetPlayer.debuffs.poisonStacks} 层 (共 ${poisonDmg} 伤)</span>
                </div>
            `;
        }

        if (targetPlayer.debuffs.weaken > 0) {
            debuffCount++;
            debuffsHtml += `
                <div class="status-card-item">
                    <div class="status-item-left">
                        <span class="status-item-icon">🌀</span>
                        <div class="status-item-text-group">
                            <span class="status-item-title">虚弱削弱</span>
                            <span class="status-item-desc">攻击与卡牌基础伤害降低 ${targetPlayer.debuffs.weaken} 点</span>
                        </div>
                    </div>
                    <span class="status-item-badge debuff">伤害 -${targetPlayer.debuffs.weaken}</span>
                </div>
            `;
        }

        if (debuffCount === 0) {
            debuffsHtml = `<div class="status-empty-text">✨ 当前处于健康状态，无负面 Debuff</div>`;
        }

        // Hero Ability & Turn State
        let passiveStatusText = '';
        if (hero.id === 'iron_guardian' || hero.id === 'iron_guard') {
            passiveStatusText = targetPlayer.ironGuardPassiveUsedThisTurn ?
                '<span style="color:#ffaa00;">[本回合已触发]</span>' :
                '<span style="color:#00ff88;">[待生效：本回合首次受击 -1 伤]</span>';
        } else if (hero.id === 'forest_mage' || hero.id === 'forest_warlock') {
            const hasTakenDamage = Boolean(targetPlayer.tookDamageSinceLastTurn || targetPlayer.tookDamageThisTurn);
            passiveStatusText = hasTakenDamage ?
                '<span style="color:#ff5544;">[本轮已受伤害：无法触发天赋自愈]</span>' :
                '<span style="color:#00ff88;">[目前未受伤害：回合结束将回复 2 HP]</span>';
        } else if (hero.id === 'fire_warrior' || hero.id === 'flame_swordsman') {
            passiveStatusText = '<span style="color:#ffaa00;">[常驻触发：伤害有 20% 概率施加灼烧]</span>';
        } else if (hero.id === 'lightning_assassin') {
            passiveStatusText = '<span style="color:#ffcc00;">[常驻触发：普攻 20% 概率触发 2 倍暴击]</span>';
        } else {
            passiveStatusText = `<span style="color:#00e5ff;">[${hero.passive ? hero.passive.name : '专属被动'}] ${hero.passive ? hero.passive.desc : ''}</span>`;
        }

        const skillCdText = targetPlayer.skillCooldown > 0 ?
            `<span style="color:#ff5544;">冷却中 (剩余 ${targetPlayer.skillCooldown} 回合)</span>` :
            (hero.skill.skillType === 'none'
                ? `<span style="color:#94a3b8;">不可施放</span>`
                : `<span style="color:#00ff88;">就绪 (消耗 ${hero.skill.cost} 能)</span>`);

        const normalAtkText = targetPlayer.hasNormalAttacked ?
            `<span style="color:#ffaa00;">本回合已使用</span>` :
            `<span style="color:#00ff88;">可用 (${hero.normalAttack} 点基础伤害)</span>`;

        // Render full html
        this.statusPanelBody.innerHTML = `
            <!-- 1. 英雄基础与机制状态 -->
            <div class="status-section">
                <div class="status-section-header hero-header">
                    <span>👑 角色机制与技能状态 (${targetPlayer.name})</span>
                </div>
                <div class="hero-summary-box">
                    ${hero.image ? `<img src="${hero.image}" alt="${hero.name}" class="hero-summary-portrait" />` : `<span style="font-size:36px;">${hero.icon}</span>`}
                    <div class="hero-summary-info">
                        <div style="font-size:15px; font-weight:bold; color:#ffffff;">${hero.name} <span style="font-size:12px; color:#7a94b5;">(${hero.title})</span></div>
                        <div style="font-size:12px; color:#00ffff;">生命: ${targetPlayer.hp} / ${targetPlayer.maxHp} &nbsp;|&nbsp; 能量: ${targetPlayer.energy} / 6 &nbsp;|&nbsp; 护盾: ${targetPlayer.shield}</div>
                    </div>
                </div>
                <div class="status-grid">
                    <div class="status-card-item">
                        <div class="status-item-left">
                            <span class="status-item-icon">✨</span>
                            <div class="status-item-text-group">
                                <span class="status-item-title">被动天赋：${hero.passive.name}</span>
                                <span class="status-item-desc">${hero.passive.desc}</span>
                            </div>
                        </div>
                        <div style="font-size:12px; font-weight:bold;">${passiveStatusText}</div>
                    </div>
                    <div class="status-card-item">
                        <div class="status-item-left">
                            <span class="status-item-icon">🔮</span>
                            <div class="status-item-text-group">
                                <span class="status-item-title">专属技能：${hero.skill.name}</span>
                                <span class="status-item-desc">${hero.skill.desc}</span>
                            </div>
                        </div>
                        <div style="font-size:12px; font-weight:bold;">${skillCdText}</div>
                    </div>
                    <div class="status-card-item">
                        <div class="status-item-left">
                            <span class="status-item-icon">⚔️</span>
                            <div class="status-item-text-group">
                                <span class="status-item-title">普通攻击</span>
                                <span class="status-item-desc">单回合限使用一次物理普通攻击</span>
                            </div>
                        </div>
                        <div style="font-size:12px; font-weight:bold;">${normalAtkText}</div>
                    </div>
                </div>
            </div>

            <!-- 2. 增益 Buff -->
            <div class="status-section">
                <div class="status-section-header buff-header">
                    <span>🛡️ 增益状态 (BUFF)</span>
                </div>
                <div class="status-grid">
                    ${buffsHtml}
                </div>
            </div>

            <!-- 3. 减益 Debuff -->
            <div class="status-section">
                <div class="status-section-header debuff-header">
                    <span>⚠️ 减益状态 (DEBUFF)</span>
                </div>
                <div class="status-grid">
                    ${debuffsHtml}
                </div>
            </div>

            <!-- 4. 牌库与实时战斗统计 -->
            <div class="status-section">
                <div class="status-section-header stats-header">
                    <span>📊 牌库构筑与实时对决统计</span>
                </div>
                <div class="stats-grid-2col">
                    <div class="stat-box-mini">
                        <span class="stat-box-label">抽牌堆剩余</span>
                        <span class="stat-box-value">${targetPlayer.deck.length} 张</span>
                    </div>
                    <div class="stat-box-mini">
                        <span class="stat-box-label">弃牌堆卡牌</span>
                        <span class="stat-box-value">${targetPlayer.discardPile.length} 张</span>
                    </div>
                    <div class="stat-box-mini">
                        <span class="stat-box-label">手牌数量</span>
                        <span class="stat-box-value">${targetPlayer.hand.length} / 8 张</span>
                    </div>
                    <div class="stat-box-mini">
                        <span class="stat-box-label">已打出卡牌</span>
                        <span class="stat-box-value">${targetPlayer.stats.cardsPlayed} 张</span>
                    </div>
                    <div class="stat-box-mini">
                        <span class="stat-box-label">累计打出伤害</span>
                        <span class="stat-box-value" style="color:#ff5544;">${targetPlayer.stats.totalDamageDealt} 点</span>
                    </div>
                    <div class="stat-box-mini">
                        <span class="stat-box-label">累计生命恢复</span>
                        <span class="stat-box-value" style="color:#00ff88;">${targetPlayer.stats.totalHealingDone} 点</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderOppHandCards(count) {
        this.oppHandDisplay.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const cardBack = document.createElement('div');
            cardBack.className = 'opp-card-back';
            cardBack.innerHTML = `
                <div class="card-back-pattern">
                    <div class="card-back-frame">
                        <div class="card-back-rune">✧</div>
                    </div>
                </div>
            `;
            this.oppHandDisplay.appendChild(cardBack);
        }
    }

    formatCardDesc(desc) {
        if (!desc) return '';
        return desc
            .replace(/(\d+)\s*点高额伤害/g, '<span class="hl-dmg">$1 点高伤</span>')
            .replace(/(\d+)\s*点伤害/g, '<span class="hl-dmg">$1 伤害</span>')
            .replace(/(\d+)\s*点护盾/g, '<span class="hl-shield">$1 护盾</span>')
            .replace(/(\d+)\s*护盾/g, '<span class="hl-shield">$1 护盾</span>')
            .replace(/恢复\s*(\d+)\s*点生命/g, '<span class="hl-heal">恢复 $1 生命</span>')
            .replace(/恢复\s*(\d+)\s*HP/g, '<span class="hl-heal">恢复 $1 HP</span>')
            .replace(/抽\s*(\d+)\s*张牌/g, '<span class="hl-draw">抽 $1 张牌</span>')
            .replace(/获得\s*(\d+)\s*点能量/g, '<span class="hl-energy">+$1 能量</span>')
            .replace(/伤害\s*\+(\d+)\s*点/g, '<span class="hl-dmg">伤害 +$1</span>')
            .replace(/减少\s*(\d+)\s*点/g, '<span class="hl-weaken">-$1 伤</span>')
            .replace(/降低\s*(\d+)%/g, '<span class="hl-shield">减伤 $1%</span>')
            .replace(/无视\s*(\d+)%\s*护盾/g, '<span class="hl-dmg">穿透 $1% 护盾</span>')
            .replace(/灼烧/g, '<span class="hl-burn">灼烧</span>')
            .replace(/中毒/g, '<span class="hl-poison">中毒</span>')
            .replace(/虚弱/g, '<span class="hl-weaken">虚弱</span>');
    }

    renderHandCards(player, isMyTurn) {
        this.actHandContainer.innerHTML = '';

        // Reset selected index if invalid
        if (this.selectedCardIndex >= player.hand.length) {
            this.selectedCardIndex = -1;
        }

        player.hand.forEach((card, index) => {
            const cardEl = document.createElement('div');
            const cardTier = card.tier || 'common';
            const artTheme = card.artTheme || `theme-${card.id}`;
            const iconFile = card.iconName || 'attack-sword.svg';

            const isSelected = (this.selectedCardIndex === index);
            const hasSelection = (this.selectedCardIndex !== -1);
            let stateClasses = '';
            if (isSelected) stateClasses += ' is-selected';
            else if (hasSelection) stateClasses += ' dimmed-by-selection';

            cardEl.className = `battle-card type-${card.type} tier-${cardTier} ${artTheme}${stateClasses}`;
            cardEl.dataset.index = index;

            const canAfford = player.energy >= card.cost;
            if (!canAfford || !isMyTurn) cardEl.classList.add('unaffordable');

            let typeBadge = '';
            if (card.type === 'attack') typeBadge = '<span class="card-type-tag atk">攻击</span>';
            else if (card.type === 'defense') typeBadge = '<span class="card-type-tag def">防御</span>';
            else if (card.type === 'heal') typeBadge = '<span class="card-type-tag heal">回复</span>';
            else typeBadge = '<span class="card-type-tag spec">特殊</span>';

            const formattedDesc = this.formatCardDesc(card.desc);
            const extras = CardBattleUI.cardVisualExtras(card);

            cardEl.innerHTML = `
                ${(card.level && card.level > 1) ? `<div class="card-level-badge">Lv.${card.level}</div>` : ''}
                <div class="card-tier-glow"></div>
                <div class="card-corner-trim tl"></div>
                <div class="card-corner-trim tr"></div>
                <div class="card-corner-trim bl"></div>
                <div class="card-corner-trim br"></div>
                <div class="card-cost-circle">
                    <span class="cost-val">${card.cost}</span>
                </div>
                <div class="card-art-area">
                    <div class="art-backdrop"></div>
                    <div class="art-halo"></div>
                    ${extras.artImg}
                    <div class="art-icon-wrap">
                        <img src="assets/card-icons/${iconFile}" class="card-svg-icon" alt="${card.name}" draggable="false" />
                    </div>
                    <div class="art-particles"></div>
                </div>
                ${extras.seal}
                <div class="card-name-bar">
                    <span class="card-title">${card.name}</span>
                    ${typeBadge}
                </div>
                ${extras.mechBadges}
                ${(card.tags && card.tags.length > 0) ? `<div class="card-tags-bar">${card.tags.map(t => `<span class="card-tag-pill tag-${t}">${this.formatTag(t)}</span>`).join('')}</div>` : ''}
                <div class="card-desc-box">${formattedDesc}</div>
                ${extras.poolTag}
                ${isSelected ? '<div class="card-play-hint">⚡ 点击确认打出</div>' : ''}
            `;

            // Click handling with anti-misclick confirmation logic.
            //
            // There used to be a second `dblclick` handler here as a "fast path", but a double
            // click already *is* two clicks: the first selected, the second played and re-rendered
            // the hand, and the dblclick event then fired on the stale element and played whatever
            // card had slid into that index — one gesture, two cards spent. The confirm-on-second-
            // click path below needs no double-click shortcut.
            cardEl.addEventListener('click', (e) => {
                e.stopPropagation();

                if (!isMyTurn) {
                    this.showToast('行动提示', '当前不是你的回合，请等待对手行动完毕。');
                    return;
                }

                if (!canAfford) {
                    this.showToast('能量不足', `打出「${card.name}」需要 ${card.cost} 点能量，当前只有 ${player.energy} 点能量。`);
                    return;
                }

                if (this.game.isGameOver) return;

                if (this.selectedCardIndex === index) {
                    // Already selected: second click executes the card play!
                    this.selectedCardIndex = -1;
                    this.game.playCard(index);
                } else {
                    // First click: select and highlight the card for safe inspection
                    this.selectedCardIndex = index;
                    this.updateCardSelectionVisuals();
                    if (window.soundManager) window.soundManager.playCardDraw();
                }
            });

            this.actHandContainer.appendChild(cardEl);
        });
    }

    updateCardSelectionVisuals() {
        const cards = this.actHandContainer.querySelectorAll('.battle-card');
        const hasSelection = (this.selectedCardIndex !== -1);

        cards.forEach((cardEl, idx) => {
            const isSelected = (idx === this.selectedCardIndex);

            if (isSelected) {
                cardEl.classList.add('is-selected');
                cardEl.classList.remove('dimmed-by-selection');
                if (!cardEl.querySelector('.card-play-hint')) {
                    const hint = document.createElement('div');
                    hint.className = 'card-play-hint';
                    hint.textContent = '⚡ 点击确认打出';
                    cardEl.appendChild(hint);
                }
            } else {
                cardEl.classList.remove('is-selected');
                const hint = cardEl.querySelector('.card-play-hint');
                if (hint) hint.remove();

                if (hasSelection) {
                    cardEl.classList.add('dimmed-by-selection');
                } else {
                    cardEl.classList.remove('dimmed-by-selection');
                }
            }
        });
    }

    getCharacterBox(target) {
        if (!target) return this.actCharacterBox;
        const targetId = (typeof target === 'string') ? target : target.id;
        if (this.isOnline) {
            return (targetId === this.localPlayerId) ? this.actCharacterBox : this.oppCharacterBox;
        } else if (this.isAIMode) {
            return (targetId === 'p1') ? this.actCharacterBox : this.oppCharacterBox;
        } else {
            return (this.game && this.game.activePlayer && targetId === this.game.activePlayer.id)
                ? this.actCharacterBox
                : this.oppCharacterBox;
        }
    }

    showDamageFeedback(target, hpDmg, shieldDmg, isCrit) {
        const box = this.getCharacterBox(target);
        if (!box) return;

        box.classList.remove('damage-shake');
        void box.offsetWidth;
        box.classList.add('damage-shake');

        const totalDmg = hpDmg + shieldDmg;
        if (totalDmg > 0) {
            const floatNum = document.createElement('div');
            floatNum.className = `floating-number ${isCrit ? 'crit' : 'dmg'}`;
            floatNum.textContent = `-${totalDmg}${isCrit ? ' CRIT!' : ''}`;
            box.appendChild(floatNum);
            setTimeout(() => floatNum.remove(), 1000);
        }
    }

    showHealFeedback(player, amount) {
        const box = this.getCharacterBox(player);
        if (!box) return;

        if (amount > 0) {
            const floatNum = document.createElement('div');
            floatNum.className = 'floating-number heal';
            floatNum.textContent = `+${amount} HP`;
            box.appendChild(floatNum);
            setTimeout(() => floatNum.remove(), 1000);
        }
    }

    showShieldFeedback(player, amount) {
        const box = this.getCharacterBox(player);
        if (!box) return;

        if (amount > 0) {
            const floatNum = document.createElement('div');
            floatNum.className = 'floating-number shield';
            floatNum.textContent = `+${amount} 护盾`;
            box.appendChild(floatNum);
            setTimeout(() => floatNum.remove(), 1000);
        }
    }


    categorizeLogEntry(log) {
        const txt = log.text || '';
        if (txt.includes('--- 第') || txt.includes('战斗开始') || txt.includes('的回合 ---')) {
            return { type: 'turn', icon: '⏳', name: '轮换', badgeClass: 'turn' };
        }
        if (txt.includes('普通攻击')) {
            return { type: 'atk', icon: '⚔️', name: '普攻', badgeClass: 'atk' };
        }
        if (txt.includes('施放技能') || txt.includes('技能「') || txt.includes('角色技能')) {
            return { type: 'skill', icon: '🔮', name: '技能', badgeClass: 'skill' };
        }
        if (txt.includes('使用了卡牌') || txt.includes('打出「') || txt.includes('打出手牌')) {
            return { type: 'card', icon: '🎴', name: '卡牌', badgeClass: 'card' };
        }
        if ((txt.includes('受到') && (txt.includes('点伤害') || txt.includes('反冲') || txt.includes('造成了'))) || txt.includes('扣减')) {
            return { type: 'dmg', icon: '💥', name: '受击', badgeClass: 'dmg' };
        }
        if (txt.includes('恢复') || txt.includes('治疗')) {
            return { type: 'heal', icon: '💚', name: '治疗', badgeClass: 'heal' };
        }
        if (txt.includes('护盾') || txt.includes('坚甲') || txt.includes('壁垒')) {
            return { type: 'shield', icon: '🛡️', name: '护盾', badgeClass: 'shield' };
        }
        if (txt.includes('状态') || txt.includes('灼烧') || txt.includes('中毒') || txt.includes('冰冻') || txt.includes('消退') || txt.includes('减伤') || txt.includes('坚壁') || txt.includes('专注')) {
            return { type: 'status', icon: '🔥', name: '状态', badgeClass: 'status' };
        }
        return { type: 'info', icon: '💬', name: '战讯', badgeClass: 'info' };
    }

    formatLogText(text) {
        if (!text) return '';
        return text
            .replace(/「(.*?)」/g, '<strong class="hl-card">「$1」</strong>')
            .replace(/(\d+)\s*点高额伤害/g, '<strong class="hl-dmg">$1 点高伤</strong>')
            .replace(/(\d+)\s*点伤害/g, '<strong class="hl-dmg">$1 点伤害</strong>')
            .replace(/造成了\s*(\d+)\s*点伤害/g, '造成了 <strong class="hl-dmg">$1 点伤害</strong>')
            .replace(/(\d+)\s*点护盾/g, '<strong class="hl-shield">$1 点护盾</strong>')
            .replace(/(\d+)\s*点生命/g, '<strong class="hl-heal">$1 点生命</strong>')
            .replace(/恢复\s*(\d+)\s*HP/g, '恢复 <strong class="hl-heal">$1 HP</strong>')
            .replace(/受击伤害额外\s*-\s*(\d+)\s*点/g, '<strong class="hl-shield">受击额外 -$1 点</strong>')
            .replace(/\(护盾吸收\s*(\d+)\)/g, '(<span class="hl-shield">护盾吸收 $1</span>)')
            .replace(/\(生命扣减\s*(\d+)\)/g, '(<span class="hl-dmg">生命扣减 $1</span>)')
            .replace(/--- 第 (\d+) 轮:(.*?)的回合 ---/g, '<span style="color:#c4b5fd; font-weight:bold;">⚡ 第 $1 轮 · $2 的回合</span>')
            .replace(/战斗开始！(.*?VS.*?)/g, '<span style="color:#00d4ff; font-weight:bold;">⚔️ $1</span>');
    }

    renderHistoryTab() {
        if (!this.statusPanelBody) return;
        const rawLogs = (this.game && this.game.logs) ? this.game.logs : [];

        if (rawLogs.length === 0) {
            this.statusPanelBody.innerHTML = `
                <div style="text-align:center; padding:45px 20px; color:#94a3b8;">
                    <div style="font-size:42px; margin-bottom:12px;">📜</div>
                    <div style="font-size:16px; font-weight:800; color:#e2e8f0;">暂无回合战报记录</div>
                    <div style="font-size:13px; margin-top:6px; color:#64748b; max-width: 360px; margin-left:auto; margin-right:auto;">
                        当前对局刚开始，一旦发动普攻、施放技能或打出手牌，这里将实时汇总每一轮的详细战况和数值明细。
                    </div>
                </div>
            `;
            return;
        }

        if (!this.historyTypeFilter) this.historyTypeFilter = 'all';
        if (!this.historyRoundFilter) this.historyRoundFilter = 'all';
        if (this.historySortAsc === undefined) this.historySortAsc = true;
        if (!this.historyCollapsedRounds) this.historyCollapsedRounds = new Set();

        const roundsMap = new Map();
        rawLogs.forEach(log => {
            const r = log.round || 1;
            if (!roundsMap.has(r)) roundsMap.set(r, []);
            roundsMap.get(r).push(log);
        });

        const allRoundNums = Array.from(roundsMap.keys()).sort((a, b) => a - b);
        const sortedRoundKeys = Array.from(roundsMap.keys()).sort((a, b) => b - a);

        let totalBattleDmg = 0;
        let totalBattleHeal = 0;
        let totalBattleShield = 0;
        let totalBattleCards = 0;

        rawLogs.forEach(l => {
            const t = l.text || '';
            const dM = t.match(/受到\s*(\d+)\s*点伤害/) || t.match(/造成了\s*(\d+)\s*点伤害/);
            if (dM) totalBattleDmg += parseInt(dM[1], 10);
            const hM = t.match(/恢复了\s*(\d+)\s*点生命/) || t.match(/恢复\s*(\d+)\s*HP/);
            if (hM) totalBattleHeal += parseInt(hM[1], 10);
            const sM = t.match(/获得了\s*(\d+)\s*点护盾/);
            if (sM) totalBattleShield += parseInt(sM[1], 10);
            if (t.includes('使用了卡牌') || t.includes('打出')) totalBattleCards++;
        });

        let html = `
            <div class="history-controls-bar">
                <div class="history-stats-banner">
                    <span style="color:#00d4ff; font-weight:800; font-size:14px;">📜 全局战斗战报概览</span>
                    <div style="display:flex; gap:12px; font-size:12px; flex-wrap:wrap;">
                        <span>累计: <strong style="color:#00d4ff;">${allRoundNums.length}</strong> 轮</span>
                        <span>总指令: <strong style="color:#38bdf8;">${rawLogs.length}</strong> 条</span>
                        <span>总伤: <strong style="color:#ff5544;">${totalBattleDmg}</strong> 点</span>
                        <span>治疗: <strong style="color:#10b981;">${totalBattleHeal}</strong> 点</span>
                        <span>出牌: <strong style="color:#fbbf24;">${totalBattleCards}</strong> 张</span>
                    </div>
                </div>

                <div class="history-filter-row" style="margin-top:6px;">
                    <span style="font-size:11.5px; color:#94a3b8; font-weight:bold;">分类筛选:</span>
                    <button class="history-filter-btn ${this.historyTypeFilter === 'all' ? 'active' : ''}" data-type="all">🌟 全部</button>
                    <button class="history-filter-btn ${this.historyTypeFilter === 'atk_dmg' ? 'active' : ''}" data-type="atk_dmg">⚔️ 普攻/伤害</button>
                    <button class="history-filter-btn ${this.historyTypeFilter === 'card' ? 'active' : ''}" data-type="card">🎴 卡牌出牌</button>
                    <button class="history-filter-btn ${this.historyTypeFilter === 'skill' ? 'active' : ''}" data-type="skill">🔮 英雄技能</button>
                    <button class="history-filter-btn ${this.historyTypeFilter === 'heal_shield' ? 'active' : ''}" data-type="heal_shield">🛡️ 护盾/治疗</button>
                    <button class="history-filter-btn ${this.historyTypeFilter === 'status' ? 'active' : ''}" data-type="status">🔥 状态结算</button>
                </div>

                <div class="history-filter-row" style="margin-top:4px;">
                    <span style="font-size:11.5px; color:#94a3b8; font-weight:bold;">轮次直达:</span>
                    <button class="history-round-pill ${this.historyRoundFilter === 'all' ? 'active' : ''}" data-round="all">全部轮次</button>
                    ${allRoundNums.map(r => `
                        <button class="history-round-pill ${String(this.historyRoundFilter) === String(r) ? 'active' : ''}" data-round="${r}">第 ${r} 轮</button>
                    `).join('')}
                    <button id="btn-toggle-sort-order" class="history-filter-btn" style="margin-left:auto;">
                        ${this.historySortAsc ? '⏳ 轮内正序 (1->N)' : '⌛ 轮内倒序 (最新在前)'}
                    </button>
                </div>
            </div>

            <div class="history-timeline-list">
        `;

        const displayedRounds = (this.historyRoundFilter === 'all')
            ? sortedRoundKeys
            : sortedRoundKeys.filter(r => String(r) === String(this.historyRoundFilter));

        let totalMatchedEntries = 0;

        displayedRounds.forEach(rNum => {
            const rawRoundLogs = roundsMap.get(rNum) || [];
            const orderedLogs = this.historySortAsc ? [...rawRoundLogs].reverse() : [...rawRoundLogs];

            let rDmg = 0;
            let rHeal = 0;
            let rShield = 0;
            let rCards = 0;

            orderedLogs.forEach(entry => {
                const t = entry.text || '';
                const dM = t.match(/受到\s*(\d+)\s*点伤害/) || t.match(/造成了\s*(\d+)\s*点伤害/);
                if (dM) rDmg += parseInt(dM[1], 10);
                const hM = t.match(/恢复了\s*(\d+)\s*点生命/) || t.match(/恢复\s*(\d+)\s*HP/);
                if (hM) rHeal += parseInt(hM[1], 10);
                const sM = t.match(/获得了\s*(\d+)\s*点护盾/);
                if (sM) rShield += parseInt(sM[1], 10);
                if (t.includes('使用了卡牌') || t.includes('打出')) rCards++;
            });

            const filteredLogs = orderedLogs.filter(entry => {
                if (this.historyTypeFilter === 'all') return true;
                const cat = this.categorizeLogEntry(entry);
                if (this.historyTypeFilter === 'atk_dmg') return cat.type === 'atk' || cat.type === 'dmg';
                if (this.historyTypeFilter === 'card') return cat.type === 'card';
                if (this.historyTypeFilter === 'skill') return cat.type === 'skill';
                if (this.historyTypeFilter === 'heal_shield') return cat.type === 'heal' || cat.type === 'shield';
                if (this.historyTypeFilter === 'status') return cat.type === 'status';
                return true;
            });

            if (filteredLogs.length === 0 && this.historyTypeFilter !== 'all') {
                return;
            }

            totalMatchedEntries += filteredLogs.length;
            const isCollapsed = this.historyCollapsedRounds.has(rNum);

            html += `
                <div class="history-round-card ${isCollapsed ? 'collapsed' : ''}" data-round-card="${rNum}">
                    <div class="history-round-header" data-toggle-round="${rNum}">
                        <div class="round-header-left">
                            <span class="round-title-text">⚔️ 第 ${rNum} 轮战斗明细</span>
                            ${rDmg > 0 ? `<span class="round-stat-pill dmg">💥 伤害 ${rDmg}</span>` : ''}
                            ${rHeal > 0 ? `<span class="round-stat-pill heal">💚 治疗 ${rHeal}</span>` : ''}
                            ${rShield > 0 ? `<span class="round-stat-pill shield">🛡️ 护盾 ${rShield}</span>` : ''}
                            ${rCards > 0 ? `<span class="round-stat-pill card">🎴 出牌 ${rCards}</span>` : ''}
                        </div>
                        <div class="round-header-right">
                            <span class="round-log-count">${filteredLogs.length} 条行动</span>
                            <span class="round-toggle-arrow">▼</span>
                        </div>
                    </div>
                    <div class="history-round-logs">
            `;

            filteredLogs.forEach((entry, idx) => {
                const cat = this.categorizeLogEntry(entry);
                const stepNum = this.historySortAsc ? (idx + 1) : (filteredLogs.length - idx);
                const formattedTxt = this.formatLogText(entry.text);

                html += `
                    <div class="history-log-row ${cat.badgeClass}">
                        <span class="history-log-step">#${stepNum}</span>
                        <span class="log-time">[${entry.time || ''}]</span>
                        <span class="history-log-badge ${cat.badgeClass}">${cat.icon} ${cat.name}</span>
                        <span class="log-txt">${formattedTxt}</span>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        if (totalMatchedEntries === 0) {
            html += `
                <div style="text-align:center; padding:30px; color:#94a3b8; background:rgba(15,23,42,0.5); border-radius:10px;">
                    <div style="font-size:28px; margin-bottom:8px;">🔍</div>
                    <div style="font-size:14px; color:#cbd5e1;">当前筛选条件下暂无战报记录</div>
                    <button class="history-filter-btn" data-type="all" style="margin-top:10px; padding:5px 14px;">显示全部战报</button>
                </div>
            `;
        }

        html += `
            </div>
        `;

        this.statusPanelBody.innerHTML = html;

        const filterBtns = this.statusPanelBody.querySelectorAll('.history-filter-btn[data-type]');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.historyTypeFilter = btn.dataset.type;
                this.renderHistoryTab();
            });
        });

        const roundPills = this.statusPanelBody.querySelectorAll('.history-round-pill[data-round]');
        roundPills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.stopPropagation();
                this.historyRoundFilter = pill.dataset.round;
                this.renderHistoryTab();
            });
        });

        const sortBtn = this.statusPanelBody.querySelector('#btn-toggle-sort-order');
        if (sortBtn) {
            sortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.historySortAsc = !this.historySortAsc;
                this.renderHistoryTab();
            });
        }

        const roundHeaders = this.statusPanelBody.querySelectorAll('[data-toggle-round]');
        roundHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const rNum = parseInt(header.dataset.toggleRound, 10);
                if (this.historyCollapsedRounds.has(rNum)) {
                    this.historyCollapsedRounds.delete(rNum);
                } else {
                    this.historyCollapsedRounds.add(rNum);
                }
                const card = this.statusPanelBody.querySelector(`[data-round-card="${rNum}"]`);
                if (card) {
                    card.classList.toggle('collapsed', this.historyCollapsedRounds.has(rNum));
                }
            });
        });
    }

    addLogToUI(logEntry) {
        const li = document.createElement('div');
        li.className = 'log-item';
        li.textContent = logEntry.text;
        this.combatLogContainer.prepend(li);

        while (this.combatLogContainer.children.length > 12) {
            this.combatLogContainer.removeChild(this.combatLogContainer.lastChild);
        }

        if (this.modalStatusDetail && this.modalStatusDetail.classList.contains('active') && this.activeStatusTab === 'history') {
            this.renderHistoryTab();
        }
    }

    showGameOverScreen(result) {
        const winner = result.winner;
        let pveSettlement = null;
        if (this.isPveMode && this.currentPveStage) {
            const playerWon = winner.id === 'p1';
            pveSettlement = this.settlePveVictory(this.currentPveStage, playerWon);
            const rewards = pveSettlement.rewards;
            this.winnerTitle.textContent = playerWon
                ? `🏆 讨伐成功！${this.currentPveStage.enemyName} 已被击败`
                : `💀 讨伐失败！${this.currentPveStage.enemyName} 仍然屹立`;
            this.winnerAvatar.textContent = playerWon ? '🏆' : this.currentPveStage.stageId >= 4 ? '🐉' : '💀';
            this.winnerAvatar.style.background = playerWon
                ? 'linear-gradient(135deg, #00d4ff, #00ff88)'
                : 'linear-gradient(135deg, #ff4444, #880000)';
            if (playerWon && rewards) {
                const parts = [`🪙 +${rewards.gold} 金币`];
                if (rewards.gems) parts.push(`💎 +${rewards.gems} 宝石`);
                if (rewards.unlockedCardId) {
                    const card = (window.CARD_BY_ID || {})[rewards.unlockedCardId];
                    parts.push(`🎴 ${card ? card.name : rewards.unlockedCardId}`);
                }
                this.winnerSub.textContent = `历经 ${result.rounds} 轮讨伐${rewards.isFirstClear ? '（首通）' : '（重复）'}，获得 ${parts.join('、')}。`;
            } else if (!playerWon) {
                this.winnerSub.textContent = `历经 ${result.rounds} 轮。先清前置关卡攒资源，把 PVE 卡牌升上 Lv.3 再回来。`;
            } else {
                this.winnerSub.textContent = `历经 ${result.rounds} 轮，获得 🪙 +${rewards.gold} 金币。`;
            }
        } else if (this.isAIMode) {
            const isMe = (winner.id === 'p1');
            this.winnerTitle.textContent = isMe ? '🏆 恭喜！你战胜了 AI！' : '💀 惜败！你被 AI 击败了！';
            this.winnerAvatar.textContent = isMe ? '🏆' : '🤖';
            this.winnerAvatar.style.background = isMe ? 'linear-gradient(135deg, #00d4ff, #00ff88)' : 'linear-gradient(135deg, #ff4444, #880000)';
            if (isMe) {
                Wallet.credit(100, 0);
                const gold = Wallet.getGold();
                if (this.gacha) {
                    this.gacha.gold = gold;
                    this.gacha.updateGoldDisplay();
                }
                this.winnerSub.textContent = `历经 ${result.rounds} 轮对决获胜！获得对局奖励：🪙 +100 金币！可在主菜单抽取卡牌。`;
            } else {
                this.winnerSub.textContent = `历经 ${result.rounds} 轮对战。胜败乃兵家常事，调整战术再来一局吧！`;
            }
        } else if (this.isOnline) {
            const isMe = (winner.id === this.localPlayerId);
            this.winnerTitle.textContent = isMe ? '🏆 恭喜！你获得了胜利！' : '💀 惜败！你被对手击败了！';
            this.winnerAvatar.textContent = isMe ? '🏆' : '💀';
            this.winnerAvatar.style.background = isMe ? 'linear-gradient(135deg, #00d4ff, #00ff88)' : 'linear-gradient(135deg, #ff4444, #880000)';
            this.winnerSub.textContent = `历经 ${result.rounds} 轮鏖战，${winner.name}【${winner.hero.name}】赢得对决！`;
        } else {
            this.winnerTitle.textContent = `${winner.name} 获得胜利！`;
            if (winner.hero.image) {
                this.winnerAvatar.innerHTML = `<img src="${winner.hero.image}" alt="${winner.hero.name}" class="avatar-img" />`;
                this.winnerAvatar.style.background = winner.hero.avatarBg;
            } else {
                this.winnerAvatar.textContent = winner.hero.icon;
                this.winnerAvatar.style.background = winner.hero.avatarBg;
            }
            this.winnerSub.textContent = `【${winner.hero.name}】战胜了对手！历经 ${result.rounds} 轮鏖战。`;
        }

        this.statRounds.textContent = result.rounds;
        if (pveSettlement) this.showPveRewardModal(pveSettlement);
        this.statDmgP1.textContent = result.p1Stats.totalDamageDealt;
        this.statDmgP2.textContent = result.p2Stats.totalDamageDealt;
        this.statHealP1.textContent = result.p1Stats.totalHealingDone;
        this.statHealP2.textContent = result.p2Stats.totalHealingDone;
        this.statCardsP1.textContent = result.p1Stats.cardsPlayed;
        this.statCardsP2.textContent = result.p2Stats.cardsPlayed;

        // Render game over history timeline grouped by rounds
        const historyList = document.getElementById('game-over-history-list');
        const toggleBtn = document.getElementById('btn-toggle-over-history');
        if (historyList && this.game && this.game.logs) {
            const rawLogs = this.game.logs;
            const roundsMap = new Map();
            rawLogs.forEach(log => {
                const r = log.round || 1;
                if (!roundsMap.has(r)) roundsMap.set(r, []);
                roundsMap.get(r).push(log);
            });
            const sortedRoundKeys = Array.from(roundsMap.keys()).sort((a, b) => a - b);
            let hHtml = '';
            sortedRoundKeys.forEach(rNum => {
                const rLogs = [...roundsMap.get(rNum)].reverse();
                hHtml += `
                    <div style="margin-bottom: 8px; background: rgba(20,30,50,0.85); border: 1px solid rgba(0,212,255,0.25); border-radius: 6px; padding: 6px 10px;">
                        <div style="font-size: 12px; font-weight: bold; color: #00d4ff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 3px; margin-bottom: 4px; display: flex; justify-content: space-between;">
                            <span>⚔️ 第 ${rNum} 轮战果明细</span>
                            <span style="color:#94a3b8; font-size:11px;">${rLogs.length} 条记录</span>
                        </div>
                `;
                rLogs.forEach((entry, idx) => {
                    const cat = this.categorizeLogEntry(entry);
                    const formatted = this.formatLogText(entry.text);
                    hHtml += `
                        <div style="font-size: 11.5px; padding: 2px 0; display: flex; gap: 6px; align-items: center; color: #e2e8f0;">
                            <span style="color: #64748b; font-size: 10px;">#${idx+1} [${entry.time}]</span>
                            <span class="history-log-badge ${cat.badgeClass}" style="font-size: 10px; padding: 0 4px;">${cat.icon} ${cat.name}</span>
                            <span>${formatted}</span>
                        </div>
                    `;
                });
                hHtml += `</div>`;
            });
            historyList.innerHTML = hHtml || '<div style="color:#94a3b8; text-align:center;">暂无战报记录</div>';

            if (toggleBtn) {
                toggleBtn.onclick = () => {
                    const isHidden = historyList.style.display === 'none';
                    historyList.style.display = isHidden ? 'block' : 'none';
                    toggleBtn.textContent = isHidden ? '📜 收起战报明细 ▲' : '📜 查看本局逐回合战报明细 ▼';
                };
            }
        }

        this.gameOverModal.classList.add('active');
    }
}

window.CardBattleUI = CardBattleUI;

