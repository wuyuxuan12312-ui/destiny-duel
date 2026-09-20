// PVE chapter map: the screen the ported single-player campaign is entered from.
//
// Renders GAME_CONFIG.pveStages as a node map rather than a list, so progression reads spatially
// and a locked stage is obvious. All rules (unlock, rewards, validation) live in PveSystem; this
// file only draws and forwards intent.
(function(root) {
    class PveView {
        constructor(onStartStage) {
            this.onStartStage = onStartStage;
            this.screen = null;
            this.progress = null;
        }

        ensureDom() {
            if (this.screen) return this.screen;
            this.screen = root.document.getElementById('screen-pve');
            if (!this.screen) {
                this.screen = root.document.createElement('div');
                this.screen.id = 'screen-pve';
                this.screen.className = 'game-screen pve-screen';
                root.document.querySelector('.game-container')
                    ? root.document.querySelector('.game-container').appendChild(this.screen)
                    : root.document.body.appendChild(this.screen);
            }
            return this.screen;
        }

        open() {
            this.progress = root.PveSystem.loadProgress();
            this.render();
            const screens = root.document.querySelectorAll('.game-screen');
            for (let i = 0; i < screens.length; i++) screens[i].classList.remove('active');
            this.ensureDom().classList.add('active');
            this.screen.style.display = 'flex';
        }

        close() {
            this.screen.style.display = 'none';
            this.screen.classList.remove('active');
        }

        static elementOf(stage) {
            const deck = (stage.enemyDeck || []).map(d => d.cardId).join(' ');
            const text = `${stage.stageName} ${stage.enemyName} ${deck}`;
            if (/fire|flame|burn|熔岩|火|炎|灼/.test(text)) return 'fire';
            if (/shadow|dragon|暗|龙|湮|魔/.test(text)) return 'arcane';
            if (/golem|iron|stone|石|铁|壁|像/.test(text)) return 'shield';
            return 'strike';
        }

        render() {
            const view = this;
            const stages = root.PveSystem.getStages();
            const progress = this.progress || root.PveSystem.loadProgress();
            const chapterDone = stages.every(s => root.PveSystem.isCleared(s.stageId, progress));
            const totalGold = stages.reduce((n, s) => n + (Number(s.firstClearRewardGold) || 0), 0);
            const earnedGold = stages.filter(s => (progress.collectedRewards || []).indexOf(s.stageId) !== -1)
                .reduce((n, s) => n + (Number(s.firstClearRewardGold) || 0), 0);

            const nodes = stages.map(stage => {
                const unlocked = root.PveSystem.isUnlocked(stage.stageId, progress);
                const cleared = root.PveSystem.isCleared(stage.stageId, progress);
                const stars = root.PveSystem.starsFor(stage, progress);
                const element = PveView.elementOf(stage);
                const deckSize = (stage.enemyDeck || []).reduce((n, e) => n + e.count, 0);
                return `
                <div class="pve-node element-${element} ${cleared ? 'is-cleared' : ''} ${unlocked ? '' : 'is-locked'}"
                     data-stage="${stage.stageId}" role="button" tabindex="${unlocked ? 0 : -1}"
                     aria-disabled="${unlocked ? 'false' : 'true'}">
                    <div class="pve-node-aura"></div>
                    <div class="pve-node-code">${stage.stageCode}</div>
                    <div class="pve-node-portrait">
                        <span class="pve-node-icon">${cleared ? '🏆' : (unlocked ? '⚔️' : '🔒')}</span>
                    </div>
                    <h3 class="pve-node-name">${stage.stageName}</h3>
                    <div class="pve-node-enemy">${stage.enemyName}</div>
                    <div class="pve-node-hp"><span>首领生命</span><b>${stage.enemyMaxHp}</b></div>
                    <div class="pve-node-stars" aria-label="通关评价">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
                    <div class="pve-node-rewards">
                        <span title="首通金币">🪙 ${stage.firstClearRewardGold}</span>
                        <span title="首通宝石">💎 ${stage.firstClearRewardGems}</span>
                        <span title="首领卡组张数">🂠 ${deckSize}</span>
                    </div>
                    <p class="pve-node-desc">${stage.description || ''}</p>
                    <div class="pve-node-cta">${cleared ? '再次讨伐' : (unlocked ? '开始讨伐' : '通关上一关解锁')}</div>
                </div>`;
            }).join('');

            this.ensureDom().innerHTML = `
                <div class="pve-map-header">
                    <button class="pve-back-btn" id="pve-back-btn">← 返回大厅</button>
                    <div class="pve-chapter-title">
                        <span class="pve-chapter-kicker">CHAPTER I</span>
                        <h2>第一章 · 宿命开端</h2>
                    </div>
                    <div class="pve-chapter-meta">
                        <div class="pve-meta-item"><span>已探明</span><b>${Math.min(progress.cleared, stages.length)}/${stages.length}</b></div>
                        <div class="pve-meta-item"><span>章节金库</span><b>${earnedGold}/${totalGold}</b></div>
                        <div class="pve-meta-item pve-meta-gold"><span>持有金币</span><b data-wallet-gold>${root.Wallet.getGold().toLocaleString()}</b></div>
                    </div>
                </div>
                <div class="pve-track">
                    <div class="pve-track-line"></div>
                    <div class="pve-node-grid">${nodes}</div>
                </div>
                ${chapterDone ? '<div class="pve-chapter-clear">👑 第一章已全通！用章节奖励抽卡并强化 PVE 卡牌，再去挑战首领。</div>' : ''}
            `;

            const back = this.screen.querySelector('#pve-back-btn');
            if (back) back.addEventListener('click', () => view.requestClose());
            this.screen.querySelectorAll('.pve-node').forEach(node => {
                const stageId = Number(node.getAttribute('data-stage'));
                if (!root.PveSystem.isUnlocked(stageId, progress)) return;
                const handler = () => {
                    const stage = root.PveSystem.getStage(stageId);
                    const problems = root.PveSystem.validateStage(stage);
                    if (problems.length) {
                        root.alert(`关卡数据异常：${problems.join('；')}`);
                        return;
                    }
                    if (view.onStartStage) view.onStartStage(stage);
                };
                node.addEventListener('click', handler);
                node.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
                });
            });
        }

        requestClose() {
            this.close();
            const menu = root.document.getElementById('screen-start-menu');
            if (menu) {
                menu.classList.add('active');
                menu.style.display = 'flex';
            }
        }
    }

    root.PveView = PveView;
})(typeof window !== 'undefined' ? window : global);
