// Destiny Duel - Admin CMS JavaScript Controller
(function() {
  const API_BASE = '';
  let authToken = localStorage.getItem('destiny_duel_admin_token') || '';

  // DOM Elements
  const loginOverlay = document.getElementById('login-overlay');
  const loginUsername = document.getElementById('login-username');
  const loginPassword = document.getElementById('login-password');
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const btnLogout = document.getElementById('btn-logout');
  const currentUserLabel = document.getElementById('current-user-label');
  const topbarSectionTitle = document.getElementById('topbar-section-title');
  const btnRefreshData = document.getElementById('btn-refresh-data');
  const toastContainer = document.getElementById('toast-container');

  // Generic Modal
  const modalGeneric = document.getElementById('modal-generic');
  const modalGenericTitle = document.getElementById('modal-generic-title');
  const modalGenericBody = document.getElementById('modal-generic-body');
  const btnSaveGeneric = document.getElementById('btn-save-generic');
  let currentGenericSaveHandler = null;

  // Cache Data
  let cacheHeroes = [];
  let cacheCards = [];
  let cacheSkills = [];
  let cacheStatuses = [];
  let cacheRules = [];
  let cachePacks = [];

  // ==========================================================================
  // UTILITY & TOAST
  // ==========================================================================
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async function apiFetch(url, options = {}) {
    const headers = options.headers || {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    options.headers = headers;

    const res = await fetch(url, options);
    if (res.status === 401) {
      authToken = '';
      localStorage.removeItem('destiny_duel_admin_token');
      loginOverlay.classList.add('active');
      throw new Error('未授权，请重新登录');
    }
    return res.json();
  }

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================
  async function initAuth() {
    if (authToken) {
      try {
        const res = await apiFetch('/api/admin/verify');
        if (res.valid) {
          loginOverlay.classList.remove('active');
          currentUserLabel.textContent = res.username || 'admin';
          loadAllData();
          return;
        }
      } catch (err) {
        console.warn('Token verify failed:', err);
      }
    }
    loginOverlay.classList.add('active');
  }

  btnLoginSubmit.addEventListener('click', async () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();
    if (!password) {
      loginErrorMsg.textContent = '请输入密码';
      loginErrorMsg.style.display = 'block';
      return;
    }

    try {
      loginErrorMsg.style.display = 'none';
      btnLoginSubmit.disabled = true;
      btnLoginSubmit.textContent = '登录中...';

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      }).then(r => r.json());

      if (res.success && res.token) {
        authToken = res.token;
        localStorage.setItem('destiny_duel_admin_token', authToken);
        loginOverlay.classList.remove('active');
        currentUserLabel.textContent = res.username;
        showToast('登录成功，欢迎使用管理后台！', 'success');
        loadAllData();
      } else {
        loginErrorMsg.textContent = res.error || '登录失败，请核对密码';
        loginErrorMsg.style.display = 'block';
      }
    } catch (err) {
      loginErrorMsg.textContent = '网络请求失败，请确认服务端已启动';
      loginErrorMsg.style.display = 'block';
    } finally {
      btnLoginSubmit.disabled = false;
      btnLoginSubmit.textContent = '立即登录后台';
    }
  });

  loginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnLoginSubmit.click();
  });

  btnLogout.addEventListener('click', () => {
    authToken = '';
    localStorage.removeItem('destiny_duel_admin_token');
    loginOverlay.classList.add('active');
    showToast('已安全退出登录', 'info');
  });

  // ==========================================================================
  // NAVIGATION & TAB SWITCHING
  // ==========================================================================
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      link.classList.add('active');
      const targetId = link.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      topbarSectionTitle.textContent = link.textContent;
    });
  });

  btnRefreshData.addEventListener('click', () => {
    loadAllData();
    showToast('数据已刷新', 'info');
  });

  function loadAllData() {
    loadHeroes();
    loadCards();
    loadSkills();
    loadStatuses();
    loadRules();
    loadMedia();
    loadGacha();
  }

  // ==========================================================================
  // 1. HEROES CRUD
  // ==========================================================================
  async function loadHeroes() {
    try {
      const heroes = await apiFetch('/api/heroes');
      cacheHeroes = heroes;
      const tbody = document.getElementById('heroes-tbody');
      tbody.innerHTML = '';

      heroes.forEach(h => {
        const tr = document.createElement('tr');
        const avatarSrc = h.avatar_url ? h.avatar_url : 'assets/characters/fire_warrior.png';
        tr.innerHTML = `
          <td><img src="${avatarSrc}" class="avatar-thumb" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'44\\' height=\\'44\\'><rect fill=\\'%23333\\' width=\\'44\\' height=\\'44\\'/><text fill=\\'%23fff\\' x=\\'22\\' y=\\'26\\' font-size=\\'12\\' text-anchor=\\'middle\\'>无图</text></svg>'"></td>
          <td style="font-family: monospace; font-size: 0.8rem; color: #60a5fa;">${h.id}</td>
          <td><strong>${h.name}</strong></td>
          <td><span class="badge" style="background:#374151;">${h.role || '综合型'}</span></td>
          <td><strong style="color: #34d399;">${h.max_hp}</strong> HP</td>
          <td><strong style="color: #f87171;">${h.base_attack}</strong> 点</td>
          <td style="font-size: 0.8rem; color: #c084fc;">${h.skill_id || '-'}</td>
          <td><span class="badge ${h.enabled ? 'badge-buff' : 'badge-debuff'}">${h.enabled ? '已启用' : '已禁用'}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm btn-edit-hero" data-id="${h.id}">编辑</button>
            <button class="btn btn-danger btn-sm btn-del-hero" data-id="${h.id}">删除</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Hook Events
      tbody.querySelectorAll('.btn-edit-hero').forEach(btn => {
        btn.addEventListener('click', () => openHeroModal(btn.getAttribute('data-id')));
      });
      tbody.querySelectorAll('.btn-del-hero').forEach(btn => {
        btn.addEventListener('click', () => deleteHero(btn.getAttribute('data-id')));
      });
    } catch (err) {
      console.error('Failed to load heroes:', err);
    }
  }

  const modalHero = document.getElementById('modal-hero');
  const btnAddHero = document.getElementById('btn-add-hero');
  const btnSaveHero = document.getElementById('btn-save-hero');

  btnAddHero.addEventListener('click', () => openHeroModal(null));

  function openHeroModal(heroId) {
    const isEdit = Boolean(heroId);
    document.getElementById('modal-hero-title').textContent = isEdit ? '编辑英雄属性与立绘' : '创建新英雄';
    document.getElementById('hero-id').value = heroId || '';

    if (isEdit) {
      const h = cacheHeroes.find(x => x.id === heroId);
      if (h) {
        document.getElementById('hero-name').value = h.name;
        document.getElementById('hero-role').value = h.role;
        document.getElementById('hero-hp').value = h.max_hp;
        document.getElementById('hero-atk').value = h.base_attack;
        document.getElementById('hero-avatar').value = h.avatar_url || '';
        document.getElementById('hero-desc').value = h.description || '';
      }
    } else {
      document.getElementById('hero-name').value = '';
      document.getElementById('hero-role').value = '输出型';
      document.getElementById('hero-hp').value = 30;
      document.getElementById('hero-atk').value = 4;
      document.getElementById('hero-avatar').value = '';
      document.getElementById('hero-desc').value = '';
    }

    modalHero.classList.add('active');
  }

  btnSaveHero.addEventListener('click', async () => {
    const heroId = document.getElementById('hero-id').value;
    const name = document.getElementById('hero-name').value.trim();
    if (!name) return alert('英雄名称不能为空！');

    const payload = {
      name,
      role: document.getElementById('hero-role').value,
      max_hp: Number(document.getElementById('hero-hp').value),
      base_attack: Number(document.getElementById('hero-atk').value),
      avatar_url: document.getElementById('hero-avatar').value.trim(),
      description: document.getElementById('hero-desc').value.trim(),
      enabled: 1
    };

    try {
      if (heroId) {
        await apiFetch(`/api/heroes/${heroId}`, { method: 'PUT', body: payload });
        showToast(`英雄 ${name} 更新成功！`, 'success');
      } else {
        await apiFetch('/api/heroes', { method: 'POST', body: payload });
        showToast(`新英雄 ${name} 创建成功并自动配置套牌！`, 'success');
      }
      modalHero.classList.remove('active');
      loadHeroes();
    } catch (err) {
      alert('保存失败: ' + err.message);
    }
  });

  async function deleteHero(heroId) {
    if (!confirm(`确定要删除英雄 [${heroId}] 吗？对应卡组与技能将被一并清除。`)) return;
    try {
      await apiFetch(`/api/heroes/${heroId}`, { method: 'DELETE' });
      showToast('英雄删除成功', 'info');
      loadHeroes();
    } catch (err) {
      alert('删除失败: ' + err.message);
    }
  }

  // ==========================================================================
  // 2. CARDS CRUD
  // ==========================================================================
  async function loadCards() {
    try {
      const cards = await apiFetch('/api/cards');
      cacheCards = cards;
      const tbody = document.getElementById('cards-tbody');
      tbody.innerHTML = '';

      cards.forEach(c => {
        const tr = document.createElement('tr');
        const rarityBadge = {
          epic: '<span class="badge badge-ssr">史诗/SSR</span>',
          rare: '<span class="badge badge-sr">稀有/SR</span>',
          common: '<span class="badge badge-n">普通/N</span>'
        }[c.rarity] || `<span class="badge badge-r">${c.rarity}</span>`;

        tr.innerHTML = `
          <td><span style="font-size:1.4rem;">🎴</span></td>
          <td style="font-family: monospace; font-size: 0.8rem; color: #93c5fd;">${c.id}</td>
          <td><strong>${c.name}</strong></td>
          <td><span class="badge" style="background:#374151;">${c.card_type}</span></td>
          <td>${rarityBadge}</td>
          <td><strong style="color: #60a5fa;">${c.cost}</strong> 费</td>
          <td>
            ${c.damage ? `<span style="color:#f87171;">⚔️${c.damage}</span> ` : ''}
            ${c.shield ? `<span style="color:#60a5fa;">🛡️${c.shield}</span> ` : ''}
            ${c.heal ? `<span style="color:#34d399;">💖${c.heal}</span> ` : ''}
          </td>
          <td style="font-size:0.8rem; color:#a78bfa;">${c.effect_type1 || '-'} (${c.effect_val1 || 0})</td>
          <td style="font-size: 0.78rem; color: var(--text-secondary); max-width: 180px;">${c.description || ''}</td>
          <td>
            <button class="btn btn-secondary btn-sm btn-edit-card" data-id="${c.id}">编辑</button>
            <button class="btn btn-danger btn-sm btn-del-card" data-id="${c.id}">删除</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.btn-edit-card').forEach(btn => {
        btn.addEventListener('click', () => openCardModal(btn.getAttribute('data-id')));
      });
      tbody.querySelectorAll('.btn-del-card').forEach(btn => {
        btn.addEventListener('click', () => deleteCard(btn.getAttribute('data-id')));
      });
    } catch (err) {
      console.error('Failed to load cards:', err);
    }
  }

  const modalCard = document.getElementById('modal-card');
  const btnAddCard = document.getElementById('btn-add-card');
  const btnSaveCard = document.getElementById('btn-save-card');

  btnAddCard.addEventListener('click', () => openCardModal(null));

  function openCardModal(cardId) {
    const isEdit = Boolean(cardId);
    document.getElementById('modal-card-title').textContent = isEdit ? '编辑卡牌属性与效果' : '创建新卡牌';
    document.getElementById('card-id').value = cardId || '';

    if (isEdit) {
      const c = cacheCards.find(x => x.id === cardId);
      if (c) {
        document.getElementById('card-name').value = c.name;
        document.getElementById('card-type').value = c.card_type;
        document.getElementById('card-rarity').value = c.rarity;
        document.getElementById('card-cost').value = c.cost;
        document.getElementById('card-dmg').value = c.damage;
        document.getElementById('card-shield').value = c.shield;
        document.getElementById('card-heal').value = c.heal;
        document.getElementById('card-draw').value = c.draw_count;
        document.getElementById('card-eff1').value = c.effect_type1 || 'damage';
        document.getElementById('card-effval1').value = c.effect_val1 || 0;
        document.getElementById('card-desc').value = c.description || '';
      }
    } else {
      document.getElementById('card-name').value = '';
      document.getElementById('card-type').value = 'attack';
      document.getElementById('card-rarity').value = 'rare';
      document.getElementById('card-cost').value = 2;
      document.getElementById('card-dmg').value = 4;
      document.getElementById('card-shield').value = 0;
      document.getElementById('card-heal').value = 0;
      document.getElementById('card-draw').value = 0;
      document.getElementById('card-eff1').value = 'damage';
      document.getElementById('card-effval1').value = 4;
      document.getElementById('card-desc').value = '';
    }

    modalCard.classList.add('active');
  }

  btnSaveCard.addEventListener('click', async () => {
    const cardId = document.getElementById('card-id').value;
    const name = document.getElementById('card-name').value.trim();
    if (!name) return alert('卡牌名称不能为空！');

    const payload = {
      name,
      card_type: document.getElementById('card-type').value,
      rarity: document.getElementById('card-rarity').value,
      cost: Number(document.getElementById('card-cost').value),
      damage: Number(document.getElementById('card-dmg').value || 0),
      shield: Number(document.getElementById('card-shield').value || 0),
      heal: Number(document.getElementById('card-heal').value || 0),
      draw_count: Number(document.getElementById('card-draw').value || 0),
      effect_type1: document.getElementById('card-eff1').value,
      effect_val1: Number(document.getElementById('card-effval1').value || 0),
      description: document.getElementById('card-desc').value.trim(),
      enabled: 1
    };

    try {
      if (cardId) {
        await apiFetch(`/api/cards/${cardId}`, { method: 'PUT', body: payload });
        showToast(`卡牌 ${name} 更新成功！`, 'success');
      } else {
        await apiFetch('/api/cards', { method: 'POST', body: payload });
        showToast(`卡牌 ${name} 创建成功！`, 'success');
      }
      modalCard.classList.remove('active');
      loadCards();
    } catch (err) {
      alert('保存失败: ' + err.message);
    }
  });

  async function deleteCard(cardId) {
    if (!confirm(`确定要删除卡牌 [${cardId}] 吗？`)) return;
    try {
      await apiFetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      showToast('卡牌删除成功', 'info');
      loadCards();
    } catch (err) {
      alert('删除失败: ' + err.message);
    }
  }

  // ==========================================================================
  // 3. SKILLS CRUD
  // ==========================================================================
  async function loadSkills() {
    try {
      const skills = await apiFetch('/api/skills');
      cacheSkills = skills;
      const tbody = document.getElementById('skills-tbody');
      tbody.innerHTML = '';

      skills.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-family: monospace; font-size: 0.8rem; color: #a78bfa;">${s.id}</td>
          <td style="font-size: 0.82rem; color: #60a5fa;">${s.hero_id}</td>
          <td><strong>${s.name}</strong></td>
          <td><strong style="color: #38bdf8;">${s.cost}</strong> 费</td>
          <td><strong style="color: #fbbf24;">${s.cooldown}</strong> 轮</td>
          <td>${s.damage ? `<span style="color:#f87171;">⚔️${s.damage}</span>` : '-'}</td>
          <td>
            ${s.shield ? `<span style="color:#60a5fa;">🛡️${s.shield}</span> ` : ''}
            ${s.heal ? `<span style="color:#34d399;">💖${s.heal}</span>` : ''}
          </td>
          <td><span class="badge" style="background:#374151;">${s.effect_id || '-'}</span></td>
          <td style="font-size: 0.78rem; color: var(--text-secondary); max-width: 200px;">${s.description}</td>
          <td>
            <button class="btn btn-secondary btn-sm btn-edit-skill" data-id="${s.id}">调整</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.btn-edit-skill').forEach(btn => {
        btn.addEventListener('click', () => editSkill(btn.getAttribute('data-id')));
      });
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  }

  function editSkill(skillId) {
    const s = cacheSkills.find(x => x.id === skillId);
    if (!s) return;

    modalGenericTitle.textContent = `调整专属技能: ${s.name} (${s.id})`;
    modalGenericBody.innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">技能名称</label>
          <input type="text" id="edit-skill-name" class="form-input" value="${s.name}">
        </div>
        <div class="form-group">
          <label class="form-label">能量消耗</label>
          <input type="number" id="edit-skill-cost" class="form-input" value="${s.cost}" min="0" max="6">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">冷却回合 (CD)</label>
          <input type="number" id="edit-skill-cd" class="form-input" value="${s.cooldown}" min="0" max="5">
        </div>
        <div class="form-group">
          <label class="form-label">基础伤害</label>
          <input type="number" id="edit-skill-dmg" class="form-input" value="${s.damage || 0}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">技能描述</label>
        <textarea id="edit-skill-desc" class="form-textarea" rows="2">${s.description || ''}</textarea>
      </div>
    `;

    currentGenericSaveHandler = async () => {
      const payload = {
        name: document.getElementById('edit-skill-name').value.trim(),
        cost: Number(document.getElementById('edit-skill-cost').value),
        cooldown: Number(document.getElementById('edit-skill-cd').value),
        damage: Number(document.getElementById('edit-skill-dmg').value),
        heal: s.heal,
        shield: s.shield,
        effect_type1: s.effect_type1,
        effect_val1: s.effect_val1,
        effect_type2: s.effect_type2,
        effect_val2: s.effect_val2,
        effect_id: s.effect_id,
        description: document.getElementById('edit-skill-desc').value.trim()
      };
      await apiFetch(`/api/skills/${skillId}`, { method: 'PUT', body: payload });
      showToast('技能调整已保存！', 'success');
      modalGeneric.classList.remove('active');
      loadSkills();
    };

    modalGeneric.classList.add('active');
  }

  // ==========================================================================
  // 4. STATUSES & RULES
  // ==========================================================================
  async function loadStatuses() {
    try {
      const statuses = await apiFetch('/api/statuses');
      cacheStatuses = statuses;
      const tbody = document.getElementById('statuses-tbody');
      tbody.innerHTML = '';

      statuses.forEach(st => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-family: monospace; font-size: 0.8rem; color: #fb923c;">${st.id}</td>
          <td><strong>${st.name}</strong></td>
          <td><span class="badge ${st.category === 'buff' ? 'badge-buff' : 'badge-debuff'}">${st.category}</span></td>
          <td style="font-size:0.8rem;">${st.trigger_timing}</td>
          <td>${st.damage_per_turn ? `每轮 ${st.damage_per_turn} 伤` : (st.heal_per_turn ? `每轮 ${st.heal_per_turn} 疗` : '-')}</td>
          <td>${st.damage_modifier || st.damage_taken_modifier || '-'}</td>
          <td><strong>${st.duration}</strong> 回合</td>
          <td>上限 ${st.max_stacks} 层</td>
          <td style="font-size: 0.78rem; color: var(--text-secondary); max-width: 200px;">${st.description}</td>
          <td>
            <button class="btn btn-secondary btn-sm btn-edit-status" data-id="${st.id}">修改</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.btn-edit-status').forEach(btn => {
        btn.addEventListener('click', () => editStatus(btn.getAttribute('data-id')));
      });
    } catch (err) {
      console.error('Failed to load statuses:', err);
    }
  }

  function editStatus(stId) {
    const st = cacheStatuses.find(x => x.id === stId);
    if (!st) return;

    modalGenericTitle.textContent = `修改状态属性: ${st.name}`;
    modalGenericBody.innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">状态名称</label>
          <input type="text" id="edit-status-name" class="form-input" value="${st.name}">
        </div>
        <div class="form-group">
          <label class="form-label">持续自然回合</label>
          <input type="number" id="edit-status-dur" class="form-input" value="${st.duration}" min="1" max="10">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">每回合跳伤</label>
          <input type="number" step="0.5" id="edit-status-dmg" class="form-input" value="${st.damage_per_turn || 0}">
        </div>
        <div class="form-group">
          <label class="form-label">最大叠加上限</label>
          <input type="number" id="edit-status-stacks" class="form-input" value="${st.max_stacks}" min="1" max="99">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">详细说明</label>
        <textarea id="edit-status-desc" class="form-textarea" rows="2">${st.description || ''}</textarea>
      </div>
    `;

    currentGenericSaveHandler = async () => {
      const payload = {
        name: document.getElementById('edit-status-name').value.trim(),
        category: st.category,
        trigger_timing: st.trigger_timing,
        damage_per_turn: Number(document.getElementById('edit-status-dmg').value),
        heal_per_turn: st.heal_per_turn,
        damage_modifier: st.damage_modifier,
        damage_taken_modifier: st.damage_taken_modifier,
        duration: Number(document.getElementById('edit-status-dur').value),
        max_stacks: Number(document.getElementById('edit-status-stacks').value),
        stack_rule: st.stack_rule,
        description: document.getElementById('edit-status-desc').value.trim()
      };
      await apiFetch(`/api/statuses/${stId}`, { method: 'PUT', body: payload });
      showToast('状态效果更新成功！', 'success');
      modalGeneric.classList.remove('active');
      loadStatuses();
    };

    modalGeneric.classList.add('active');
  }

  async function loadRules() {
    try {
      const rules = await apiFetch('/api/rules');
      cacheRules = rules;
      const tbody = document.getElementById('rules-tbody');
      tbody.innerHTML = '';

      rules.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-family: monospace; font-size: 0.8rem; color: #38bdf8;">${r.id}</td>
          <td><strong>${r.name}</strong></td>
          <td><strong style="color: #f59e0b; font-size: 1rem;">${r.value}</strong></td>
          <td style="font-size: 0.8rem; color: var(--text-secondary);">${r.description || ''}</td>
          <td>
            <button class="btn btn-secondary btn-sm btn-edit-rule" data-id="${r.id}">调整数值</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.btn-edit-rule').forEach(btn => {
        btn.addEventListener('click', () => editRule(btn.getAttribute('data-id')));
      });
    } catch (err) {
      console.error('Failed to load rules:', err);
    }
  }

  function editRule(ruleId) {
    const r = cacheRules.find(x => x.id === ruleId);
    if (!r) return;

    modalGenericTitle.textContent = `调整全局规则: ${r.name}`;
    modalGenericBody.innerHTML = `
      <div class="form-group">
        <label class="form-label">规则数值</label>
        <input type="number" step="0.01" id="edit-rule-val" class="form-input" value="${r.value}">
      </div>
      <div class="form-group">
        <label class="form-label">说明描述</label>
        <textarea id="edit-rule-desc" class="form-textarea" rows="2">${r.description || ''}</textarea>
      </div>
    `;

    currentGenericSaveHandler = async () => {
      const payload = {
        value: Number(document.getElementById('edit-rule-val').value),
        description: document.getElementById('edit-rule-desc').value.trim()
      };
      await apiFetch(`/api/rules/${ruleId}`, { method: 'PUT', body: payload });
      showToast('全局规则数值已实时更新！', 'success');
      modalGeneric.classList.remove('active');
      loadRules();
    };

    modalGeneric.classList.add('active');
  }

  btnSaveGeneric.addEventListener('click', () => {
    if (typeof currentGenericSaveHandler === 'function') {
      currentGenericSaveHandler();
    }
  });

  // Close modals
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-backdrop').forEach(m => {
        if (m.id !== 'login-overlay') m.classList.remove('active');
      });
    });
  });

  // ==========================================================================
  // 5. MEDIA UPLOADER & GALLERY
  // ==========================================================================
  const mediaDropzone = document.getElementById('media-dropzone');
  const mediaFileInput = document.getElementById('media-file-input');
  const assetGalleryGrid = document.getElementById('asset-gallery-grid');

  mediaDropzone.addEventListener('click', () => mediaFileInput.click());

  mediaDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    mediaDropzone.style.borderColor = 'var(--accent)';
  });
  mediaDropzone.addEventListener('dragleave', () => {
    mediaDropzone.style.borderColor = 'var(--border-color)';
  });
  mediaDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    mediaDropzone.style.borderColor = 'var(--border-color)';
    if (e.dataTransfer.files.length > 0) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  });

  mediaFileInput.addEventListener('change', () => {
    if (mediaFileInput.files.length > 0) {
      handleUploadFile(mediaFileInput.files[0]);
    }
  });

  async function handleUploadFile(file) {
    showToast(`正在上传 ${file.name}...`, 'info');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const res = await apiFetch('/api/upload', {
          method: 'POST',
          body: {
            filename: file.name,
            base64Data: ev.target.result,
            assetType: 'image'
          }
        });
        if (res.success) {
          showToast(`图片上传成功: ${res.url}`, 'success');
          loadMedia();
        }
      } catch (err) {
        alert('上传失败: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  }

  async function loadMedia() {
    try {
      const assets = await apiFetch('/api/assets');
      assetGalleryGrid.innerHTML = '';
      assets.forEach(a => {
        const card = document.createElement('div');
        card.className = 'asset-card';
        card.innerHTML = `
          <img src="${a.url_path}" class="asset-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'120\\' height=\\'120\\'><rect fill=\\'%23222\\' width=\\'120\\' height=\\'120\\'/><text fill=\\'%23666\\' x=\\'60\\' y=\\'65\\' font-size=\\'12\\' text-anchor=\\'middle\\'>预览失败</text></svg>'">
          <div class="asset-info">
            <div class="asset-name" title="${a.filename}">${a.filename}</div>
            <button class="btn btn-secondary btn-sm btn-copy-path" data-path="${a.url_path}" style="width:100%; font-size:0.7rem;">复制路径</button>
          </div>
        `;
        assetGalleryGrid.appendChild(card);
      });

      assetGalleryGrid.querySelectorAll('.btn-copy-path').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.getAttribute('data-path'));
          showToast('已复制图片路径到剪贴板！', 'info');
        });
      });
    } catch (err) {
      console.error('Failed to load assets:', err);
    }
  }

  // ==========================================================================
  // 6. EXCEL IMPORT & EXPORT
  // ==========================================================================
  const excelDropzone = document.getElementById('excel-dropzone');
  const excelFileInput = document.getElementById('excel-file-input');
  const excelSyncLog = document.getElementById('excel-sync-log');
  const btnExportExcel = document.getElementById('btn-export-excel');

  excelDropzone.addEventListener('click', () => excelFileInput.click());

  excelFileInput.addEventListener('change', () => {
    if (excelFileInput.files.length > 0) {
      handleExcelUpload(excelFileInput.files[0]);
    }
  });

  async function handleExcelUpload(file) {
    excelSyncLog.style.display = 'block';
    excelSyncLog.textContent = `[Excel 导入] 正在读取 ${file.name}...\n[Excel 导入] 正在调用后端数据校验并同步入库...`;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const res = await apiFetch('/api/excel/import', {
          method: 'POST',
          body: { base64Data: ev.target.result }
        });
        if (res.success) {
          excelSyncLog.textContent += `\n[Excel 导入] 校验通过！全量数据已成功同步写入 SQLite 数据库！\n[Excel 导入] 客户端将实时生效。`;
          showToast('Excel 导入并同步成功！', 'success');
          loadAllData();
        } else {
          excelSyncLog.textContent += `\n[Excel 导入失败] ${res.error}`;
        }
      } catch (err) {
        excelSyncLog.textContent += `\n[导入异常] ${err.message}`;
      }
    };
    reader.readAsDataURL(file);
  }

  btnExportExcel.addEventListener('click', () => {
    window.open('/config/CardGame_Balance.xlsx', '_blank');
    showToast('已下载当前最新的 Excel 平衡配置文件', 'info');
  });

  // ==========================================================================
  // 7. GACHA & CARD PACKS
  // ==========================================================================
  async function loadGacha() {
    try {
      const packs = await apiFetch('/api/gacha/packs');
      cachePacks = packs;
      const tbody = document.getElementById('gacha-tbody');
      tbody.innerHTML = '';

      packs.forEach(p => {
        const tr = document.createElement('tr');
        const r = p.rates || {};
        tr.innerHTML = `
          <td style="font-family: monospace; font-size: 0.8rem; color: #a78bfa;">${p.id}</td>
          <td><strong>${p.name}</strong></td>
          <td><strong style="color: #fbbf24;">${p.cost_gold}</strong> 币</td>
          <td><span class="badge badge-ssr">${((r.SSR || 0)*100).toFixed(0)}%</span></td>
          <td><span class="badge badge-sr">${((r.SR || 0)*100).toFixed(0)}%</span></td>
          <td><span class="badge badge-r">${((r.R || 0)*100).toFixed(0)}%</span></td>
          <td><span class="badge badge-n">${((r.N || 0)*100).toFixed(0)}%</span></td>
          <td style="font-size: 0.78rem; color: var(--text-secondary);">${p.description || ''}</td>
          <td>
            <button class="btn btn-secondary btn-sm btn-edit-pack" data-id="${p.id}">调整概率</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.btn-edit-pack').forEach(btn => {
        btn.addEventListener('click', () => editGachaPack(btn.getAttribute('data-id')));
      });
    } catch (err) {
      console.error('Failed to load gacha packs:', err);
    }
  }

  function editGachaPack(packId) {
    const p = cachePacks.find(x => x.id === packId);
    if (!p) return;
    const r = p.rates || {};

    modalGenericTitle.textContent = `调整卡包出货概率: ${p.name}`;
    modalGenericBody.innerHTML = `
      <div class="form-group">
        <label class="form-label">卡包名称</label>
        <input type="text" id="edit-pack-name" class="form-input" value="${p.name}">
      </div>
      <div class="form-group">
        <label class="form-label">单抽消耗金币</label>
        <input type="number" id="edit-pack-cost" class="form-input" value="${p.cost_gold}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">SSR 概率 (0.01~1.0)</label>
          <input type="number" step="0.01" id="edit-pack-ssr" class="form-input" value="${r.SSR || 0.05}">
        </div>
        <div class="form-group">
          <label class="form-label">SR 概率</label>
          <input type="number" step="0.01" id="edit-pack-sr" class="form-input" value="${r.SR || 0.20}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">R 概率</label>
          <input type="number" step="0.01" id="edit-pack-r" class="form-input" value="${r.R || 0.40}">
        </div>
        <div class="form-group">
          <label class="form-label">N 概率</label>
          <input type="number" step="0.01" id="edit-pack-n" class="form-input" value="${r.N || 0.35}">
        </div>
      </div>
    `;

    currentGenericSaveHandler = async () => {
      const payload = {
        name: document.getElementById('edit-pack-name').value.trim(),
        description: p.description,
        cost_gold: Number(document.getElementById('edit-pack-cost').value),
        rates: {
          SSR: Number(document.getElementById('edit-pack-ssr').value),
          SR: Number(document.getElementById('edit-pack-sr').value),
          R: Number(document.getElementById('edit-pack-r').value),
          N: Number(document.getElementById('edit-pack-n').value)
        }
      };
      await apiFetch(`/api/gacha/packs/${packId}`, { method: 'PUT', body: payload });
      showToast('卡包概率配置已更新！', 'success');
      modalGeneric.classList.remove('active');
      loadGacha();
    };

    modalGeneric.classList.add('active');
  }

  // Run on start
  initAuth();
})();
