// ---------------- 现代流行 H5 游戏首页大厅、五大管理与背包系统控制器 ----------------
import { saveManager } from '../systems/SaveManager.js';
import { GAME_CONFIG } from '../core/Config.js';
import { runeSystem, RUNE_CATALOG, getRuneUpgradeCost, getRuneUpgradeShardCost } from '../systems/RuneSystem.js';
import { showToast } from './Toast.js';

export class HomeLobbyUI {
  constructor() {
    this.game = null;
    this.activeTab = 'lobby';
    this.runeFilter = 'all';
    this.backpackFilter = 'all';
    this.dom = {};
    // 首页滑选轨道当前选中的关卡（浏览态，出击时才写回 SaveManager）
    this.selectedStageId = 1;
    this.selectedStageIndex = 0;
    // 程序主动滚动轨道时会连续触发 scroll，这段时间内暂停反向同步，避免来回打架
    this._suppressStageSync = false;
    this._stageSyncTimer = 0;
    // 手指停下后把卡片吸附到正中的延时句柄
    this._stageSettleTimer = 0;
    // rAF 节流的兜底同步句柄
    this._stageTrailTimer = 0;
  }

  init(game) {
    this.game = game;
    window.homeLobbyUI = this;
    this.buildDOM();
    this.initEventListeners();
  }

  formatItemIcon(icon, alt = '', cls = 'backpack-item-img', itemId = null) {
    const iconMap = {
      '🔩': 'assets/icons/icon_part.png',
      '💾': 'assets/icons/icon_chip.png',
      '🧬': 'assets/icons/icon_shard.png',
      '🪙': 'assets/icons/icon_coin.png',
      '💰': 'assets/icons/icon_coin.png',
      '💎': 'assets/icons/icon_gem.png',
      '⚡': 'assets/icons/icon_stamina.png',
      '🎖️': 'assets/icons/icon_rank.png',
      '🏅': 'assets/icons/icon_rank.png',
      '❤️': 'assets/icons/icon_hp.png',
      '🛡️': 'assets/icons/icon_shield.png',
      '⚔️': 'assets/icons/icon_level.png',
      '💀': 'assets/icons/icon_kills.png',
      '☠️': 'assets/icons/icon_kills.png',
      '🎲': 'assets/icons/icon_reroll.png',
      '⚙️': 'assets/icons/icon_settings.png',
      '📦': 'assets/items/item_chip_rocket.png'
    };
    if (typeof icon === 'string' && iconMap[icon]) {
      icon = iconMap[icon];
    }
    const candidateId = itemId || (typeof icon === 'string' && GAME_CONFIG.items[icon] ? icon : null);
    if (candidateId && GAME_CONFIG.items[candidateId]?.icon) {
      icon = GAME_CONFIG.items[candidateId].icon;
    }
    if (typeof icon === 'string' && !icon.includes('.png') && candidateId) {
      icon = `assets/items/item_${candidateId}.png`;
    }
    if (typeof icon === 'string' && (icon.includes('.png') || icon.includes('assets/'))) {
      return `<img src="${icon}" class="${cls}" alt="${alt}" />`;
    }
    return icon || '';
  }

  initEventListeners() {
    this.bindEvents();
    this.render();
    this.show();
  }

  buildDOM() {
    let el = document.getElementById('home-lobby');
    if (!el) {
      el = document.createElement('div');
      el.id = 'home-lobby';
      this.game.container.appendChild(el);
    }
    this.dom.root = el;

    el.innerHTML = `
      <!-- 顶部指挥官信息与资源栏 -->
      <header class="lobby-header">
        <div class="lobby-commander-box">
          <div class="lobby-avatar-wrap">
            <img class="ui-icon-inline" src="assets/icons/icon_rank.png" alt="Rank">
            <span class="lobby-avatar-level" id="lobby-cmd-lvl">1</span>
          </div>
          <div class="lobby-commander-meta">
            <span class="lobby-commander-name">防线特级指挥官</span>
            <div class="lobby-exp-track">
              <div class="lobby-exp-bar" id="lobby-cmd-exp-bar"></div>
            </div>
          </div>
        </div>

        <div class="lobby-currencies">
          <div class="lobby-pill energy" title="作战体能">
            <img class="ui-icon-inline" src="assets/icons/icon_stamina.png" alt="Energy">
            <span id="lobby-energy">50/50</span>
          </div>
          <div class="lobby-pill scrap" title="工业废料">
            <img class="ui-icon-inline" src="assets/icons/icon_coin.png" alt="Scrap">
            <span id="lobby-scrap">0</span>
          </div>
          <div class="lobby-pill gems" title="高能晶核">
            <img class="ui-icon-inline" src="assets/icons/icon_gem.png" alt="Gems">
            <span id="lobby-gems">0</span>
          </div>
        </div>
      </header>

      <!-- 动态内容区 -->
      <main class="lobby-content-container">
        <!-- Tab 1: 首页大厅 (Lobby) -->
        <div class="lobby-tab-view active" id="view-lobby">
          <div class="lobby-stage-heading">
            <div class="lobby-stage-copy">
              <div class="lobby-stage-info-title">当前作战区域</div>
              <div class="lobby-stage-info-name" id="lobby-stage-name">STAGE 1 · 小行星前哨</div>
              <div class="lobby-stage-info-desc" id="lobby-stage-desc">抵御 5 波异星狂潮 · 首通奖励 80 废料</div>
            </div>
            <div class="lobby-stage-tools">
              <div class="lobby-power-banner" title="综合战力评分">
                <img class="ui-icon-inline" src="assets/icons/icon_stamina.png" alt="Power">
                <span class="lobby-power-val" id="lobby-total-power">1280</span>
              </div>
            </div>
          </div>

          <!-- 关卡滑选轨道：左右滑动浏览全部关卡，点卡片选中，点「详情」看掉落 -->
          <div class="lobby-stage-picker">
            <div class="lobby-stage-picker-head">
              <span class="lobby-stage-picker-tip">◀ 左右滑动选择关卡 ▶</span>
              <span class="lobby-stage-picker-pos" id="lobby-stage-pos">1 / 51</span>
            </div>
            <div class="lobby-stage-carousel-shell">
              <div class="lobby-stage-carousel" id="lobby-stage-carousel">
                <div class="lobby-stage-track" id="lobby-stage-track"></div>
              </div>
              <button class="lobby-stage-nav-btn prev" id="lobby-stage-prev" type="button" aria-label="上一关">‹</button>
              <button class="lobby-stage-nav-btn next" id="lobby-stage-next" type="button" aria-label="下一关">›</button>
            </div>
          </div>

          <div class="lobby-mode-selector" aria-label="作战模式">
            <button class="lobby-mode-btn" type="button" data-lobby-mode="normal"><span>标准防守</span><small>基础奖励</small></button>
            <button class="lobby-mode-btn elite" type="button" data-lobby-mode="elite"><span>精英突袭</span><small>双倍掉落</small></button>
          </div>

          <div class="lobby-stage-arena">
            <div class="lobby-stage-arena-glow"></div>
            <div class="lobby-arena-callout"><span>前线整备完成</span><strong id="lobby-arena-stage">小行星前哨</strong></div>
            <div class="lobby-fortress-truck" title="磁浮重装扫荡舰"></div>
            <div class="lobby-floating-pet" id="lobby-arena-pet" title="出战伙伴">
              <img id="lobby-arena-pet-img" src="assets/pets/fluffy.png" alt="Pet">
            </div>
          </div>

          <div class="lobby-reward-preview" aria-label="星级通关奖励预览">
            <div class="lobby-reward-node"><span class="lobby-reward-stars">★</span><img class="lobby-reward-node-img" src="assets/icons/icon_coin.png" alt="废料" style="width:28px;height:28px;max-width:28px;max-height:28px;object-fit:contain;"><strong id="lobby-reward-scrap">55+</strong><small>险守奖励</small></div>
            <div class="lobby-reward-line"></div>
            <div class="lobby-reward-node featured"><span class="lobby-reward-stars">★★★</span><img class="lobby-reward-node-img" id="lobby-reward-chip-img" src="assets/items/item_chip_rocket.png" alt="定向芯片" style="width:28px;height:28px;max-width:28px;max-height:28px;object-fit:contain;"><strong id="lobby-reward-chip">定向芯片</strong><small>稳固防线</small></div>
            <div class="lobby-reward-line"></div>
            <div class="lobby-reward-node perfect"><span class="lobby-reward-stars">★★★★★</span><img class="lobby-reward-node-img" src="assets/items/item_supply_crate.png" alt="军备箱" style="width:28px;height:28px;max-width:28px;max-height:28px;object-fit:contain;"><strong id="lobby-reward-perfect">晶核 +5</strong><small>完美守卫</small></div>
          </div>

          <div class="lobby-battle-cta-wrap">
            <button class="lobby-battle-btn" id="btn-lobby-battle">
              <img class="ui-icon-inline" src="assets/icons/icon_level.png" alt="Battle" style="width:20px;height:20px;">
              <span>开始防守</span>
            </button>
          </div>

          <!-- 城防管理放在主战斗入口之后，首屏优先展示关卡与载具。 -->
          <div class="lobby-fortification-card" id="lobby-fortification-section">
            <div class="lobby-fortification-header">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:18px;">🛡️</span>
                <div>
                  <div style="font-weight:900;color:#f8fafc;font-size:13px;">基地城防加固工程</div>
                  <div style="font-size:11px;color:#94a3b8;">强化装甲、护盾、自愈与反伤</div>
                </div>
              </div>
              <span id="lobby-fort-status-badge" style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:12px;background:rgba(56,189,248,0.2);color:#38bdf8;border:1px solid rgba(56,189,248,0.4);">Lv.1</span>
            </div>
            <div class="lobby-fort-grid" id="lobby-fort-grid"></div>
          </div>
        </div>

        <!-- Tab 2: 枪械管理 (Weapons) -->
        <div class="lobby-tab-view" id="view-weapons">
          <div class="section-header">
            <div class="section-title">🔫 枪械武器库</div>
            <div class="section-subtitle">切换并改装主防线武器（消耗专属零件强化）</div>
          </div>
          <div class="weapons-grid" id="weapons-list"></div>
        </div>

        <!-- Tab 3: 技能管理 (Skills) -->
        <div class="lobby-tab-view" id="view-skills">
          <div class="section-header">
            <div class="section-title">📖 战术技能图谱</div>
            <div class="section-subtitle">战术技能专精（消耗专属芯片）与元素协同</div>
          </div>
          <div class="filter-bar">
            <div class="filter-pill active" id="skill-filter-active">战术技能库 (7)</div>
            <div class="filter-pill" id="skill-filter-synergy">元素反应矩阵 (5)</div>
          </div>
          <div id="skills-catalog-container" class="skills-catalog-grid"></div>
        </div>

        <!-- Tab 4: 战术背包 (Backpack / Inventory) -->
        <div class="lobby-tab-view" id="view-backpack">
          <div class="section-header">
            <div class="section-title">🎒 军备战术背包</div>
            <div class="section-subtitle">管理各类枪械配件、技能芯片与伴飞僚机核心</div>
          </div>
          <div class="backpack-summary-bar">
            <span class="backpack-count-tag" id="backpack-total-held">物资种类: 0 种</span>
            <button class="backpack-open-crate-btn" id="btn-quick-open-crate">📦 开启军备箱</button>
          </div>
          <div class="filter-bar" id="backpack-filter-bar">
            <div class="filter-pill active" data-bfilter="all">全部物资</div>
            <div class="filter-pill" data-bfilter="weapon">枪械配件</div>
            <div class="filter-pill" data-bfilter="skill">技能芯片</div>
            <div class="filter-pill" data-bfilter="pet">僚机核心</div>
            <div class="filter-pill" data-bfilter="consumable">军备补给</div>
          </div>
          <div class="backpack-grid" id="backpack-items-list"></div>
        </div>

        <!-- Tab 5: 伴飞战术僚机 (Pets) -->
        <div class="lobby-tab-view" id="view-pets">
          <div class="section-header">
            <div class="section-title">🛸 伴飞战术僚机</div>
            <div class="section-subtitle">配置伴飞突击僚机协同作战（消耗专属核心升级）</div>
          </div>
          <div class="pets-showcase-grid" id="pets-list"></div>
        </div>

        <!-- Tab 6: 符文秘境 (Runes) -->
        <div class="lobby-tab-view" id="view-runes">
          <div class="section-header">
            <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">
              <span>💠 符文矩阵工坊</span>
              <span class="rune-shard-summary-badge" id="lobby-rune-shard-badge">🧩 远古符文碎片: 0</span>
            </div>
            <div class="section-subtitle">全方位永久提升枪械、防御与战术属性（消耗远古符文碎片与废料）</div>
          </div>
          <div class="filter-bar" id="rune-filter-bar">
            <div class="filter-pill active" data-filter="all">全部</div>
            <div class="filter-pill" data-filter="gun">枪械</div>
            <div class="filter-pill" data-filter="defense">防御</div>
            <div class="filter-pill" data-filter="skill">技能</div>
            <div class="filter-pill" data-filter="util">战术</div>
          </div>
          <div class="runes-grid" id="runes-list"></div>
        </div>

      </main>

      <!-- 底部主流导航栏 -->
      <nav class="lobby-bottom-nav">
        <button class="nav-tab-btn active" data-tab="lobby">
          <span class="nav-tab-icon">🛡️</span>
          <span class="nav-tab-label">基地</span>
        </button>
        <button class="nav-tab-btn" data-tab="weapons">
          <span class="nav-tab-icon">🔫</span>
          <span class="nav-tab-label">枪械</span>
        </button>
        <button class="nav-tab-btn" data-tab="skills">
          <span class="nav-tab-icon">📖</span>
          <span class="nav-tab-label">技能</span>
        </button>
        <button class="nav-tab-btn" data-tab="backpack">
          <span class="nav-tab-icon">🎒</span>
          <span class="nav-tab-label">背包</span>
        </button>
        <button class="nav-tab-btn" data-tab="pets">
          <span class="nav-tab-icon">🛸</span>
          <span class="nav-tab-label">僚机</span>
        </button>
        <button class="nav-tab-btn" data-tab="runes">
          <span class="nav-tab-icon">💠</span>
          <span class="nav-tab-label">符文</span>
        </button>
      </nav>

      <!-- 物品详情抽屉弹窗容器 -->
      <div id="lobby-item-modal" style="display:none;"></div>
      <!-- 开启补给箱奖励弹窗容器 -->
      <div id="lobby-crate-modal" style="display:none;"></div>
    `;
  }

  bindEvents() {
    // 底部 Tab 切换
    this.dom.root.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const handleTab = (e) => {
        if (e) e.preventDefault();
        const tab = btn.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      };
      btn.addEventListener('click', handleTab);
      btn.addEventListener('touchend', handleTab);
    });

    // 首页出击按钮：打的就是滑选轨道上当前选中的那一关
    document.getElementById('btn-lobby-battle').addEventListener('click', () => {
      this.confirmStageAndLaunch();
    });

    this.dom.root.querySelectorAll('[data-lobby-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.lobbyMode;
        const stageId = this.selectedStageId || saveManager.getEquippedStage();
        if (mode === 'elite' && !saveManager.isEliteUnlocked(stageId)) {
          showToast(`🔒 第 ${stageId} 关的【精英突袭】尚未解锁！\n先通关本关标准模式后再来挑战。`, { tone: 'warn' });
          return;
        }
        saveManager.setMode(mode);
        this.renderLobby();
      });
    });

    // 关卡滑选轨道：滚动时把居中卡片同步为当前选中关卡
    const carousel = document.getElementById('lobby-stage-carousel');
    const track = document.getElementById('lobby-stage-track');
    if (carousel && track) {
      let ticking = false;
      carousel.addEventListener('scroll', () => {
        // 用 rAF 节流跟随滑动，避免每像素都算一次最近卡片
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(() => {
            ticking = false;
            this.syncStageFromScroll();
          });
        }
        // 兜底：rAF 那一帧被拖后时，甩动的最后一帧位置不能丢
        clearTimeout(this._stageTrailTimer);
        this._stageTrailTimer = setTimeout(() => this.syncStageFromScroll(), 120);
      }, { passive: true });

      // 卡片内容每次渲染都会重建，所以用事件委托绑定一次
      track.addEventListener('click', (e) => {
        const detailBtn = e.target.closest('[data-action="stage-detail"]');
        if (detailBtn) {
          e.stopPropagation();
          this.showStageDetail(parseInt(detailBtn.dataset.id, 10));
          return;
        }
        const card = e.target.closest('.lobby-stage-card');
        if (card) this.pickStage(parseInt(card.dataset.stageId, 10), { scroll: true });
      });

      document.getElementById('lobby-stage-prev').onclick = () => this.stepStage(-1);
      document.getElementById('lobby-stage-next').onclick = () => this.stepStage(1);
    }

    // 背包分类筛选
    const bpFilterBar = document.getElementById('backpack-filter-bar');
    if (bpFilterBar) {
      bpFilterBar.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          bpFilterBar.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.backpackFilter = pill.dataset.bfilter;
          this.renderBackpack();
        });
      });
    }

    // 快捷开箱按钮
    const btnCrate = document.getElementById('btn-quick-open-crate');
    if (btnCrate) {
      btnCrate.onclick = () => this.handleOpenCrate();
    }

    // 技能库模式切换
    const filterActive = document.getElementById('skill-filter-active');
    const filterSynergy = document.getElementById('skill-filter-synergy');
    if (filterActive && filterSynergy) {
      filterActive.addEventListener('click', () => {
        filterActive.classList.add('active');
        filterSynergy.classList.remove('active');
        this.renderSkills('skills');
      });
      filterSynergy.addEventListener('click', () => {
        filterSynergy.classList.add('active');
        filterActive.classList.remove('active');
        this.renderSkills('synergies');
      });
    }

    // 符文分类筛选
    const runeFilterBar = document.getElementById('rune-filter-bar');
    if (runeFilterBar) {
      runeFilterBar.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          runeFilterBar.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.runeFilter = pill.dataset.filter;
          this.renderRunes();
        });
      });
    }
  }

  switchTab(tabId) {
    if (tabId === 'runes' && !saveManager.isSystemUnlocked('runes')) {
      showToast('🔒【符文矩阵工坊】尚未解锁！\n通关第 3 关【环形山断层】后开放。', { tone: 'warn' });
      return;
    }
    if (tabId === 'pets' && !saveManager.isSystemUnlocked('pets')) {
      showToast('🔒【伴飞僚机机库】尚未解锁！\n通关第 6 关【陨石风蚀巨壁】后开放。', { tone: 'warn' });
      return;
    }
    this.activeTab = tabId;
    this.dom.root.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    this.dom.root.querySelectorAll('.lobby-tab-view').forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });
    this.render();
  }

  show() {
    this.dom.root.style.display = 'flex';
    if (this.game) this.game.isPaused = true;
    // 每次回到大厅都从实际出战的关卡开始浏览
    this.selectedStageId = saveManager.getEquippedStage();
    this.selectedStageIndex = this.stageIndexOf(this.selectedStageId);
    this.render();
  }

  hide() {
    this.dom.root.style.display = 'none';
  }

  render() {
    this.renderHeader();
    if (this.activeTab === 'lobby') this.renderLobby();
    else if (this.activeTab === 'weapons') this.renderWeapons();
    else if (this.activeTab === 'skills') this.renderSkills();
    else if (this.activeTab === 'backpack') this.renderBackpack();
    else if (this.activeTab === 'pets') this.renderPets();
    else if (this.activeTab === 'runes') this.renderRunes();
  }

  renderHeader() {
    const lvl = saveManager.getCommanderLevel();
    const exp = saveManager.getCommanderExp();
    const needed = saveManager.getExpForNextLevel();
    const pct = Math.min(100, Math.round((exp / needed) * 100));

    const elLvl = document.getElementById('lobby-cmd-lvl');
    const elExp = document.getElementById('lobby-cmd-exp-bar');
    const elEnergy = document.getElementById('lobby-energy');
    const elScrap = document.getElementById('lobby-scrap');
    const elGems = document.getElementById('lobby-gems');

    if (elLvl) elLvl.textContent = lvl;
    if (elExp) elExp.style.width = `${pct}%`;
    if (elEnergy) elEnergy.textContent = `${saveManager.getEnergy()}/${saveManager.getMaxEnergy()}`;
    if (elScrap) elScrap.textContent = saveManager.getScrap();
    if (elGems) elGems.textContent = saveManager.getGems();

    // 动态同步底部导航栏锁定角标
    const navLabels = { lobby: '基地', weapons: '枪械', skills: '技能', backpack: '背包', pets: '僚机', runes: '符文' };
    this.dom.root.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const tab = btn.dataset.tab;
      let locked = false;
      if (tab === 'runes' && !saveManager.isSystemUnlocked('runes')) locked = true;
      if (tab === 'pets' && !saveManager.isSystemUnlocked('pets')) locked = true;
      btn.classList.toggle('nav-locked', locked);
      const labelEl = btn.querySelector('.nav-tab-label');
      if (labelEl && navLabels[tab]) {
        labelEl.textContent = locked ? `${navLabels[tab]} 🔒` : navLabels[tab];
      }
    });
  }

  // 1. 首页大厅
  renderLobby() {
    this.renderStageCarousel();
    this.renderStageSummary();
    this.renderFortification();
  }

  // 首页「当前作战区域」文案、竞技场与星级奖励预览：跟随滑选轨道当前选中的关卡
  renderStageSummary() {
    const powerEl = document.getElementById('lobby-total-power');
    if (powerEl) powerEl.textContent = saveManager.calcCombatPower().toLocaleString();

    const petImg = document.getElementById('lobby-arena-pet-img');
    const selectedPetId = saveManager.getPetData().selected;
    if (petImg) {
      if (selectedPetId && GAME_CONFIG.pets.types[selectedPetId] && saveManager.isSystemUnlocked('pets')) {
        petImg.src = GAME_CONFIG.pets.types[selectedPetId].asset;
        petImg.parentElement.style.display = 'block';
      } else {
        petImg.parentElement.style.display = 'none';
      }
    }

    const currentStageId = this.selectedStageId || saveManager.getEquippedStage();
    const stage = GAME_CONFIG.stages.find(s => s.id === currentStageId) || GAME_CONFIG.stages[0];
    const nameEl = document.getElementById('lobby-stage-name');
    const descEl = document.getElementById('lobby-stage-desc');
    const curMode = saveManager.getMode();
    if (nameEl) nameEl.textContent = `STAGE ${stage.id} · ${stage.name}`;
    const shownResistance = Math.min(0.6, (stage.physicalResistance || 0) + (GAME_CONFIG.modes?.[curMode]?.physicalResistanceBonus || 0));
    if (descEl) descEl.textContent = stage.endless ? `无尽模式 · 极限生存挑战 · 物抗 ${Math.round(shownResistance * 100)}%+` : `通关波次 ${stage.clearWaves} · 难度 x${stage.difficulty} · 物抗 ${Math.round(shownResistance * 100)}%+`;

    const arenaStageEl = document.getElementById('lobby-arena-stage');
    if (arenaStageEl) arenaStageEl.textContent = stage.name;
    this.dom.root.querySelectorAll('[data-lobby-mode]').forEach(btn => {
      const mode = btn.dataset.lobbyMode;
      const locked = mode === 'elite' && !saveManager.isEliteUnlocked(stage.id);
      btn.classList.toggle('active', mode === curMode);
      btn.classList.toggle('locked', locked);
      btn.setAttribute('aria-pressed', mode === curMode ? 'true' : 'false');
      btn.title = locked ? '通关本关标准模式后解锁' : '';
      const hint = btn.querySelector('small');
      if (hint) hint.textContent = locked ? '通关后解锁' : (mode === 'elite' ? '双倍掉落' : '基础奖励');
    });

    // 星级奖励预览直接对应结算规则，让玩家在出击前知道保住血量的价值。
    const baseScrap = (stage.scrapReward || 60) + Math.max(1, stage.clearWaves || 1) * 5;
    const firstDrop = stage.targetDrops?.[0];
    const scrapEl = document.getElementById('lobby-reward-scrap');
    const chipEl = document.getElementById('lobby-reward-chip');
    const chipImgEl = document.getElementById('lobby-reward-chip-img');
    const perfectEl = document.getElementById('lobby-reward-perfect');
    if (scrapEl) scrapEl.textContent = `${Math.round(baseScrap * 0.65 * (curMode === 'elite' ? 1.8 : 1))}+`;
    if (chipEl) chipEl.textContent = firstDrop?.name || '定向芯片';
    if (chipImgEl && firstDrop?.icon) { chipImgEl.src = firstDrop.icon; chipImgEl.alt = firstDrop.name || '定向芯片'; }
    if (perfectEl) perfectEl.textContent = curMode === 'elite' ? '晶核 +10' : '晶核 +5';
  }

  renderFortification() {
    const grid = document.getElementById('lobby-fort-grid');
    const badge = document.getElementById('lobby-fort-status-badge');
    if (!grid) return;

    const isUnlocked = saveManager.isSystemUnlocked('fortification');
    if (!isUnlocked) {
      if (badge) badge.textContent = '🔒 未解锁';
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:12px;background:rgba(15,23,42,0.6);border:1px dashed rgba(100,116,139,0.3);border-radius:8px;font-size:11px;color:#94a3b8;">
          🔒 通关第 1 关【小行星前哨】后解锁城防加固工程
        </div>
      `;
      return;
    }

    const fort = saveManager.getFortification();
    const avgLv = Math.round(((fort.hpLevel || 1) + (fort.shieldLevel || 1) + (fort.regenLevel || 1) + (fort.armorLevel || 1)) / 4);
    if (badge) badge.textContent = `综合防御 Lv.${avgLv}`;

    const upgrades = GAME_CONFIG.fortressUpgrades || {};
    grid.innerHTML = Object.entries(upgrades).map(([key, cfg]) => {
      const curLv = saveManager.getFortificationLevel(key);
      const isMax = curLv >= (cfg.maxLevel || 25);
      const curVal = cfg.baseVal + (curLv - 1) * cfg.addPerLvl;
      const nextVal = curVal + cfg.addPerLvl;
      const cost = saveManager.getFortificationCost(key);
      const canAfford = saveManager.getScrap() >= cost;

      return `
        <div class="fort-item-card" style="background:rgba(15,23,42,0.7);border:1px solid rgba(59,130,246,0.25);border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:12px;font-weight:800;color:#f8fafc;">${cfg.name}</span>
              <span style="font-size:11px;color:#38bdf8;font-weight:900;">Lv.${curLv}</span>
            </div>
            <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:4px;">
              <span style="font-size:14px;font-weight:900;color:#22c55e;">${curVal}</span>
              ${!isMax ? `<span style="font-size:10px;color:#64748b;">→</span><span style="font-size:12px;color:#38bdf8;font-weight:bold;">${nextVal}</span>` : '<span style="color:#10b981;font-size:10px;">MAX</span>'}
              <span style="font-size:10px;color:#94a3b8;">${cfg.unit}</span>
            </div>
            <div style="font-size:10px;color:#94a3b8;line-height:1.25;margin-bottom:6px;">${cfg.desc}</div>
          </div>
          <button class="weapon-btn upgrade" data-action="upgrade-fort" data-key="${key}" style="padding:4px 8px;font-size:10px;width:100%;margin-top:auto;" ${isMax || !canAfford ? 'disabled' : ''}>
            ${isMax ? '已达上限' : `<img class="ui-icon-inline" src="assets/icons/icon_coin.png" alt="Coin"> ${cost} 强化`}
          </button>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-action="upgrade-fort"]').forEach(btn => {
      btn.onclick = () => {
        const key = btn.dataset.key;
        const res = saveManager.upgradeFortification(key);
        if (!res.success) {
          showToast(res.message, { tone: 'warn' });
        } else {
          this.render();
        }
      };
    });
  }

  // 2. 枪械管理 (专属零件 + 废料)
  renderWeapons() {
    const container = document.getElementById('weapons-list');
    if (!container) return;
    const weaponData = saveManager.getWeaponData();
    const equippedId = weaponData.equipped;

    container.innerHTML = Object.entries(GAME_CONFIG.weapons).map(([id, cfg]) => {
      const state = weaponData.weapons[id] || { unlocked: false, level: 1, powerLevel: 1, bulletSpeedLevel: 1, attackSpeedLevel: 1, magazineLevel: 1 };
      const isEquipped = id === equippedId;
      const partCost = 2 + (state.level - 1) * 2;
      const scrapCost = 60 + (state.level - 1) * 45;
      const unlockCost = state.unlockCost || 150;

      // 实时动态综合数值
      const damage = saveManager.getWeaponDamage(id);
      const bulletSpeed = saveManager.getWeaponBulletSpeed(id);
      const fireInterval = saveManager.getWeaponFireInterval(id);

      const partItem = GAME_CONFIG.items[cfg.materialId] || { name: '专属零件', icon: '🔩' };
      const heldParts = saveManager.getItemCount(cfg.materialId);
      const canAffordParts = heldParts >= partCost;
      const canAffordScrap = saveManager.getScrap() >= scrapCost;
      const canUpgrade = state.unlocked && canAffordParts && canAffordScrap;

      const heldRare = saveManager.getItemCount('rare_weapon_shard');

      // 1. 力量强化 (power_shard)
      const pLevel = saveManager.getWeaponPowerLevel(id);
      const nextDmg = damage + 3.5;
      const pReq = GAME_CONFIG.getWeaponUpgradeRequirements(pLevel);
      const heldPShards = saveManager.getItemCount('power_shard');
      const canUpgradePower = state.unlocked && pReq && heldPShards >= pReq.basicShardCost && (pReq.rareShardCost === 0 || heldRare >= pReq.rareShardCost) && saveManager.getScrap() >= pReq.scrapCost;

      // 2. 射速强化 (bulletspeed_shard)
      const bsLevel = saveManager.getWeaponBulletSpeedLevel(id);
      const nextSpd = Math.min(2000, bulletSpeed + 2);
      const bsReq = GAME_CONFIG.getWeaponUpgradeRequirements(bsLevel);
      const heldBsShards = saveManager.getItemCount('bulletspeed_shard');
      const canUpgradeBulletSpeed = state.unlocked && bsReq && heldBsShards >= bsReq.basicShardCost && (bsReq.rareShardCost === 0 || heldRare >= bsReq.rareShardCost) && saveManager.getScrap() >= bsReq.scrapCost;

      // 3. 攻速强化 (attackspeed_shard)
      const asLevel = saveManager.getWeaponAttackSpeedLevel(id);
      const nextInterval = Math.max(0.18, fireInterval * 0.998).toFixed(3);
      const asReq = GAME_CONFIG.getWeaponUpgradeRequirements(asLevel);
      const heldAsShards = saveManager.getItemCount('attackspeed_shard');
      const canUpgradeAttackSpeed = state.unlocked && asReq && heldAsShards >= asReq.basicShardCost && (asReq.rareShardCost === 0 || heldRare >= asReq.rareShardCost) && saveManager.getScrap() >= asReq.scrapCost;

      // 4. 弹匣扩容 (mag_shard)
      const magLevel = saveManager.getWeaponMagazineLevel(id);
      const magCapacity = saveManager.getWeaponMagazineCapacity(id);
      const nextMagCapacity = magCapacity + 2;
      const reloadTime = (cfg.baseStats.reloadTime || 1.5).toFixed(1);
      const magReq = GAME_CONFIG.getWeaponUpgradeRequirements(magLevel);
      const heldMagShards = saveManager.getItemCount('mag_shard');
      const canUpgradeMag = state.unlocked && magReq && heldMagShards >= magReq.basicShardCost && (magReq.rareShardCost === 0 || heldRare >= magReq.rareShardCost) && saveManager.getScrap() >= magReq.scrapCost;

      return `
        <div class="weapon-card ${isEquipped ? 'equipped' : ''}">
          <div class="weapon-card-header">
            <div class="weapon-card-title">
              <div class="weapon-icon-circle">${cfg.icon}</div>
              <div class="weapon-name-wrap">
                <b>${cfg.name}</b>
                <span class="weapon-tag">${cfg.tag}</span>
                <div style="font-size:11px;color:#facc15;font-weight:800;margin-top:2px;">枪械阶位: Lv.${state.level}</div>
              </div>
            </div>
            ${isEquipped ? '<span style="color:#38bdf8;font-size:11px;font-weight:800;">✓ 已装备</span>' : ''}
          </div>

          <div class="weapon-desc">${cfg.desc}</div>

          <div class="weapon-stats-grid">
            <div class="weapon-stat-item">
              <span class="weapon-stat-label">综合威力</span>
              <span class="weapon-stat-val" style="color:#fb923c;">${damage}</span>
            </div>
            <div class="weapon-stat-item">
              <span class="weapon-stat-label">射击间隔</span>
              <span class="weapon-stat-val" style="color:#fde047;">${fireInterval}s</span>
            </div>
            <div class="weapon-stat-item">
              <span class="weapon-stat-label">弹丸射速</span>
              <span class="weapon-stat-val" style="color:#38bdf8;">${bulletSpeed}</span>
            </div>
            <div class="weapon-stat-item">
              <span class="weapon-stat-label">弹匣容量</span>
              <span class="weapon-stat-val" style="color:#a855f7;">${magCapacity}发</span>
            </div>
            <div class="weapon-stat-item">
              <span class="weapon-stat-label">穿透/弹道</span>
              <span class="weapon-stat-val">${cfg.baseStats.pierce}穿 / ${cfg.baseStats.multishot}弹</span>
            </div>
            <div class="weapon-stat-item">
              <span class="weapon-stat-label">换弹耗时</span>
              <span class="weapon-stat-val" style="color:#94a3b8;">${reloadTime}s</span>
            </div>
          </div>

          ${state.unlocked ? `
            <div class="mat-req-box">
              <div class="mat-req-left">
                <span>${this.formatItemIcon(partItem.icon, partItem.name, 'mat-req-icon-img')}</span>
                <span>${partItem.name} (升级枪械主等级提升威力/射速/攻速)</span>
              </div>
              <div class="mat-req-status ${canAffordParts ? 'met' : 'unmet'}">
                ${heldParts}/${partCost} ${canAffordParts ? '✓' : '✕ (缺少)'}
              </div>
            </div>

            <!-- 碎片升级专区 (理论上限 1000 级) -->
            <div class="weapon-modules-container">
              <!-- 力量强化 -->
              <div class="weapon-mod-card power">
                <div class="weapon-mod-header">
                  <span class="weapon-mod-title">💪 力量模组 (Lv.${pLevel}/1000)</span>
                  <span class="weapon-mod-val">${damage} ➔ <b style="color:#fb923c;">${nextDmg}</b> 威力</span>
                </div>
                <div class="weapon-mod-body">
                  <span class="weapon-mod-req">
                    力量碎片 ${heldPShards}/${pReq ? pReq.basicShardCost : 'MAX'}
                    ${pReq && pReq.rareShardCost > 0 ? ` · <span style="color:${heldRare >= pReq.rareShardCost ? '#38bdf8' : '#f43f5e'};font-weight:bold;">💎稀有核心 ${heldRare}/${pReq.rareShardCost}</span>` : '<span style="color:#34d399;font-size:10px;">(免稀有核心)</span>'}
                  </span>
                  <button class="weapon-mod-btn power" data-action="upgrade-power" data-id="${id}" ${!canUpgradePower ? 'disabled' : ''}>
                    <img class="ui-icon-inline" src="assets/icons/icon_coin.png" alt="Coin"> ${pReq ? pReq.scrapCost : '-'} 强击
                  </button>
                </div>
              </div>

              <!-- 射速强化 -->
              <div class="weapon-mod-card bulletspeed">
                <div class="weapon-mod-header">
                  <span class="weapon-mod-title">🚀 射速模组 (Lv.${bsLevel}/1000)</span>
                  <span class="weapon-mod-val">${bulletSpeed} ➔ <b style="color:#38bdf8;">${nextSpd}</b> 弹速</span>
                </div>
                <div class="weapon-mod-body">
                  <span class="weapon-mod-req">
                    射速碎片 ${heldBsShards}/${bsReq ? bsReq.basicShardCost : 'MAX'}
                    ${bsReq && bsReq.rareShardCost > 0 ? ` · <span style="color:${heldRare >= bsReq.rareShardCost ? '#38bdf8' : '#f43f5e'};font-weight:bold;">💎稀有核心 ${heldRare}/${bsReq.rareShardCost}</span>` : '<span style="color:#34d399;font-size:10px;">(免稀有核心)</span>'}
                  </span>
                  <button class="weapon-mod-btn bulletspeed" data-action="upgrade-bulletspeed" data-id="${id}" ${!canUpgradeBulletSpeed ? 'disabled' : ''}>
                    <img class="ui-icon-inline" src="assets/icons/icon_coin.png" alt="Coin"> ${bsReq ? bsReq.scrapCost : '-'} 提速
                  </button>
                </div>
              </div>

              <!-- 攻速强化 -->
              <div class="weapon-mod-card attackspeed">
                <div class="weapon-mod-header">
                  <span class="weapon-mod-title">⚡ 攻速模组 (Lv.${asLevel}/1000)</span>
                  <span class="weapon-mod-val">${fireInterval}s ➔ <b style="color:#fde047;">${nextInterval}s</b> 间隔</span>
                </div>
                <div class="weapon-mod-body">
                  <span class="weapon-mod-req">
                    攻速碎片 ${heldAsShards}/${asReq ? asReq.basicShardCost : 'MAX'}
                    ${asReq && asReq.rareShardCost > 0 ? ` · <span style="color:${heldRare >= asReq.rareShardCost ? '#38bdf8' : '#f43f5e'};font-weight:bold;">💎稀有核心 ${heldRare}/${asReq.rareShardCost}</span>` : '<span style="color:#34d399;font-size:10px;">(免稀有核心)</span>'}
                  </span>
                  <button class="weapon-mod-btn attackspeed" data-action="upgrade-attackspeed" data-id="${id}" ${!canUpgradeAttackSpeed ? 'disabled' : ''}>
                    <img class="ui-icon-inline" src="assets/icons/icon_coin.png" alt="Coin"> ${asReq ? asReq.scrapCost : '-'} 频发
                  </button>
                </div>
              </div>

              <!-- 弹匣扩容 -->
              <div class="weapon-mod-card magazine">
                <div class="weapon-mod-header">
                  <span class="weapon-mod-title">🔋 弹匣扩容 (Lv.${magLevel}/1000)</span>
                  <span class="weapon-mod-val">${magCapacity} ➔ <b style="color:#a855f7;">${nextMagCapacity} 发</b></span>
                </div>
                <div class="weapon-mod-body">
                  <span class="weapon-mod-req">
                    弹匣碎片 ${heldMagShards}/${magReq ? magReq.basicShardCost : 'MAX'}
                    ${magReq && magReq.rareShardCost > 0 ? ` · <span style="color:${heldRare >= magReq.rareShardCost ? '#38bdf8' : '#f43f5e'};font-weight:bold;">💎稀有核心 ${heldRare}/${magReq.rareShardCost}</span>` : '<span style="color:#34d399;font-size:10px;">(免稀有核心)</span>'}
                  </span>
                  <button class="weapon-mod-btn magazine" data-action="upgrade-magazine" data-id="${id}" ${!canUpgradeMag ? 'disabled' : ''}>
                    <img class="ui-icon-inline" src="assets/icons/icon_coin.png" alt="Coin"> ${magReq ? magReq.scrapCost : '-'} 扩容
                  </button>
                </div>
              </div>
            </div>
          ` : ''}

          <div class="weapon-actions">
            ${state.unlocked ? `
              <button class="weapon-btn upgrade" data-action="upgrade-weapon" data-id="${id}" data-scost="${scrapCost}" data-pcost="${partCost}" ${!canUpgrade ? 'disabled' : ''}>
                <img class="ui-icon-inline" src="assets/icons/icon_coin.png" alt="Coin"> ${scrapCost} 枪械升阶
              </button>
              <button class="weapon-btn primary" data-action="equip-weapon" data-id="${id}" ${isEquipped ? 'disabled' : ''}>
                ${isEquipped ? '已出战' : '装备此枪'}
              </button>
            ` : `
              <button class="weapon-btn primary" data-action="unlock-weapon" data-id="${id}" data-cost="${unlockCost}" ${saveManager.getGems() < unlockCost ? 'disabled' : ''} style="background:#9333ea;border-color:#c084fc;">
                <img class="ui-icon-inline" src="assets/icons/icon_gem.png" alt="Gem"> ${unlockCost} 晶核解锁
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'equip-weapon') {
          saveManager.equipWeapon(id);
          this.render();
        } else if (action === 'upgrade-weapon') {
          const scost = parseInt(btn.dataset.scost, 10);
          const pcost = parseInt(btn.dataset.pcost, 10);
          if (saveManager.upgradeWeapon(id, scost, pcost)) this.render();
        } else if (action === 'upgrade-power') {
          const res = saveManager.upgradeWeaponPower(id);
          if (!res.success) showToast(res.message, { tone: 'warn' });
          else this.render();
        } else if (action === 'upgrade-bulletspeed') {
          const res = saveManager.upgradeWeaponBulletSpeed(id);
          if (!res.success) showToast(res.message, { tone: 'warn' });
          else this.render();
        } else if (action === 'upgrade-attackspeed') {
          const res = saveManager.upgradeWeaponAttackSpeed(id);
          if (!res.success) showToast(res.message, { tone: 'warn' });
          else this.render();
        } else if (action === 'upgrade-magazine') {
          const res = saveManager.upgradeWeaponMagazine(id);
          if (!res.success) showToast(res.message, { tone: 'warn' });
          else this.render();
        } else if (action === 'unlock-weapon') {
          const cost = parseInt(btn.dataset.cost, 10);
          if (saveManager.unlockWeapon(id, cost)) this.render();
        }
      };
    });
  }

  // 3. 技能管理 (专属芯片 + 废料)
  renderSkills(mode = 'skills') {
    const container = document.getElementById('skills-catalog-container');
    if (!container) return;

    if (mode === 'synergies') {
      container.innerHTML = GAME_CONFIG.synergyCatalog.map(syn => `
        <div class="synergy-card">
          <img src="${syn.icon}" alt="${syn.name}">
          <div>
            <div style="font-weight:800;color:#f8fafc;font-size:14px;">${syn.name} <span style="font-size:10px;color:#c084fc;">${syn.synergy}</span></div>
            <div style="font-size:11px;color:#94a3b8;margin-top:3px;">${syn.desc}</div>
          </div>
        </div>
      `).join('');
      return;
    }

    const skillData = saveManager.getSkillData();
    const equippedSkills = saveManager.getEquippedSkills();

    const bannerHtml = `
      <div style="grid-column: 1 / -1; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(90deg, rgba(30,58,138,0.4), rgba(15,23,42,0.8)); border:1px solid rgba(59,130,246,0.3); border-radius:10px; padding:8px 14px; margin-bottom:4px;">
        <div style="font-size:12px; color:#e2e8f0; font-weight:700;">
          出战战术技能: <span style="color:${equippedSkills.length >= 4 ? '#facc15' : '#38bdf8'}; font-weight:900;">${equippedSkills.length} / 4</span>
          <span style="font-size:11px; color:#94a3b8; margin-left:8px;">(战斗初始默认携带且均为 Lv.1)</span>
        </div>
        <div style="font-size:11px; color:#34d399;">
          ${equippedSkills.length === 4 ? '✓ 槽位已满' : `还可佩戴 ${4 - equippedSkills.length} 个`}
        </div>
      </div>
    `;

    container.innerHTML = bannerHtml + GAME_CONFIG.skillCatalog.map(sk => {
      const isUnlocked = saveManager.isSkillUnlocked(sk.id);
      const level = skillData.levels[sk.id] || 1;
      const chipItem = GAME_CONFIG.items[sk.materialId] || { name: '战术芯片', icon: '💾' };
      const heldChips = saveManager.getItemCount(sk.materialId);
      const synthCost = GAME_CONFIG.SKILL_SYNTHESIS_COST || 10;
      const isEquipped = equippedSkills.includes(sk.id);

      if (!isUnlocked) {
        const canSynth = heldChips >= synthCost;
        const pct = Math.min(100, Math.round((heldChips / synthCost) * 100));

        return `
          <div class="skill-catalog-card locked-skill-card" style="border-color:rgba(100,116,139,0.3);background:rgba(15,23,42,0.75);">
            <img class="skill-catalog-img" src="${sk.asset}" alt="${sk.name}" style="filter:grayscale(0.8) brightness(0.7);">
            <div class="skill-catalog-info">
              <div class="skill-catalog-header">
                <span class="skill-catalog-name" style="color:#94a3b8;">${sk.name}</span>
                <span class="skill-catalog-type" style="background:#1e293b;color:#94a3b8;border-color:#475569;">🔒 待合成 · ${sk.type}</span>
              </div>
              <div class="skill-catalog-desc">${sk.desc}</div>

              <!-- 碎片收集进度条 -->
              <div style="margin-top:6px;background:rgba(30,41,59,0.8);border:1px solid rgba(71,85,105,0.4);border-radius:6px;padding:6px 8px;">
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
                  <span style="color:#cbd5e1;display:flex;align-items:center;gap:4px;">
                    ${this.formatItemIcon(chipItem.icon, chipItem.name, 'mat-req-icon-img')} 碎片收集
                  </span>
                  <span style="font-weight:800;color:${canSynth ? '#facc15' : '#38bdf8'};">${heldChips} / ${synthCost} 块</span>
                </div>
                <div style="height:5px;background:#0f172a;border-radius:3px;overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:${canSynth ? 'linear-gradient(90deg,#eab308,#f59e0b)' : 'linear-gradient(90deg,#3b82f6,#60a5fa)'};"></div>
                </div>
                <div style="font-size:10px;color:#60a5fa;margin-top:4px;">📍 ${sk.unlockHint || '关卡掉落获取'}</div>
              </div>

              <div style="margin-top:8px;">
                <button class="weapon-btn ${canSynth ? 'synth-ready' : 'disabled'}" data-action="synthesize-skill" data-id="${sk.id}" style="width:100%;padding:6px 12px;font-size:11px;${canSynth ? 'background:linear-gradient(135deg,#eab308,#f59e0b);color:#0f172a;font-weight:900;border-color:#facc15;box-shadow:0 0 12px rgba(234,179,8,0.4);' : 'background:#1e293b;color:#64748b;border-color:#334155;'}" ${!canSynth ? 'disabled' : ''}>
                  ${canSynth ? '⚡ 消耗 10 碎片合成解锁' : `芯片不足 (${heldChips}/${synthCost})`}
                </button>
              </div>
            </div>
          </div>
        `;
      }

      // 已解锁技能卡片
      const chipCost = 2 + Math.floor((level - 1) / 2);
      const scrapCost = 50 + (level - 1) * 35;
      const canAffordChips = heldChips >= chipCost;
      const canAffordScrap = saveManager.getScrap() >= scrapCost;
      const canUpgrade = canAffordChips && canAffordScrap;

      return `
        <div class="skill-catalog-card ${isEquipped ? 'equipped-card' : ''}" style="${isEquipped ? 'border-color:rgba(52,211,153,0.5);box-shadow:0 0 14px rgba(16,185,129,0.18);' : ''}">
          <img class="skill-catalog-img" src="${sk.asset}" alt="${sk.name}">
          <div class="skill-catalog-info">
            <div class="skill-catalog-header">
              <span class="skill-catalog-name">${sk.name}</span>
              <span class="skill-catalog-type" style="${isEquipped ? 'background:#065f46;color:#34d399;border-color:#10b981;' : ''}">${isEquipped ? '★ 出战中 · ' : ''}${sk.type}</span>
            </div>
            <div class="skill-catalog-desc">${sk.desc}</div>
            <div class="skill-catalog-meta">
              <span>基础冷却: ${sk.cooldown}s</span>
              <span style="color:#facc15;">专精等级: Lv.${level}</span>
            </div>

            <div class="mat-req-box" style="margin-top:6px;">
              <div class="mat-req-left">
                <span>${this.formatItemIcon(chipItem.icon, chipItem.name, 'mat-req-icon-img')}</span>
                <span>${chipItem.name}</span>
              </div>
              <div class="mat-req-status ${canAffordChips ? 'met' : 'unmet'}">
                ${heldChips}/${chipCost} ${canAffordChips ? '✓' : '✕'}
              </div>
            </div>

            <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
              <button class="weapon-btn ${isEquipped ? 'equipped' : 'primary'}" data-action="toggle-equip-skill" data-id="${sk.id}" style="padding:6px 12px;font-size:11px;flex:1;${isEquipped ? 'background:linear-gradient(135deg,#059669,#10b981);border-color:#34d399;color:#fff;' : 'background:linear-gradient(135deg,#2563eb,#3b82f6);border-color:#60a5fa;color:#fff;'}">
                ${isEquipped ? '✓ 已佩戴 (点击卸下)' : '+ 佩戴出战'}
              </button>
              <button class="weapon-btn upgrade" data-action="upgrade-skill" data-id="${sk.id}" data-scost="${scrapCost}" data-ccost="${chipCost}" style="padding:6px 10px;font-size:11px;" ${!canUpgrade ? 'disabled' : ''}>
                <img class="ui-icon-inline" src="assets/icons/icon_coin.png" alt="Coin"> ${scrapCost} 强化
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-action="synthesize-skill"]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const res = saveManager.synthesizeSkill(id);
        showToast(res.message, { tone: res.success ? 'success' : 'warn' });
        if (res.success) this.render();
      };
    });

    container.querySelectorAll('[data-action="toggle-equip-skill"]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const res = saveManager.toggleEquipSkill(id);
        if (!res.success) {
          showToast(res.message, { tone: 'warn' });
        } else {
          this.render();
        }
      };
    });

    container.querySelectorAll('[data-action="upgrade-skill"]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const scost = parseInt(btn.dataset.scost, 10);
        const ccost = parseInt(btn.dataset.ccost, 10);
        if (saveManager.upgradeSkillMastery(id, scost, ccost)) this.render();
      };
    });
  }

  // 4. 战术背包 (Backpack / Inventory) - 只展示数量大于 0 的物资
  renderBackpack() {
    const container = document.getElementById('backpack-items-list');
    const totalHeldEl = document.getElementById('backpack-total-held');
    if (!container) return;

    const inventory = saveManager.getInventory();
    const allItemKeys = Object.keys(GAME_CONFIG.items);
    let totalItems = 0;

    const filteredKeys = allItemKeys.filter(key => {
      const cfg = GAME_CONFIG.items[key];
      const count = inventory[key] || 0;
      if (count <= 0) return false; // 数量为 0 不展示
      totalItems++;
      if (this.backpackFilter === 'all') return true;
      return cfg.category === this.backpackFilter;
    });

    if (totalHeldEl) totalHeldEl.textContent = `当前仓位: ${totalItems} 种素材物资`;

    if (filteredKeys.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 45px 20px; color: #64748b; text-align: center;">
          <span style="font-size: 40px; margin-bottom: 8px;">🎒</span>
          <div style="font-size: 14px; font-weight: bold; color: #94a3b8;">暂无可展示的物资</div>
          <div style="font-size: 11px; margin-top: 4px; color: #64748b;">出击前线战区关卡或进行极速扫荡，即可收集各类战备素材与图纸！</div>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredKeys.map(key => {
      const item = GAME_CONFIG.items[key];
      const count = inventory[key] || 0;

      return `
        <div class="item-slot rarity-${item.rarity}" data-item-id="${item.id}">
          <span class="item-name-sub">${item.name}</span>
          <div class="item-slot-icon">${this.formatItemIcon(item.icon, item.name, 'backpack-item-img', item.id)}</div>
          <span class="item-count-badge">x${count}</span>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.item-slot').forEach(slot => {
      slot.onclick = () => {
        const itemId = slot.dataset.itemId;
        this.showItemDetail(itemId);
      };
    });
  }

  // 物品详情抽屉弹窗
  showItemDetail(itemId) {
    const item = GAME_CONFIG.items[itemId];
    if (!item) return;
    const held = saveManager.getItemCount(itemId);
    const modal = document.getElementById('lobby-item-modal');
    if (!modal) return;

    const rarityNames = {
      legendary: '传说品质',
      epic: '史诗品质',
      rare: '稀有品质',
      fine: '精良品质'
    };
    const rarityColors = {
      legendary: '#f59e0b',
      epic: '#a855f7',
      rare: '#0ea5e9',
      fine: '#10b981'
    };

    let actionButtonHtml = '';
    if (item.targetType === 'weapon' || item.targetType === 'magazine') {
      actionButtonHtml = `<button class="weapon-btn primary" id="btn-modal-action">前往改装枪械</button>`;
    } else if (item.targetType === 'rune') {
      actionButtonHtml = `<button class="weapon-btn primary" id="btn-modal-action">前往符文矩阵</button>`;
    } else if (item.targetType === 'pet') {
      actionButtonHtml = `<button class="weapon-btn primary" id="btn-modal-action">前往整备僚机</button>`;
    } else if (item.targetType === 'skill') {
      actionButtonHtml = `<button class="weapon-btn primary" id="btn-modal-action">前往技能专精</button>`;
    } else if (item.targetType === 'crate') {
      actionButtonHtml = `<button class="weapon-btn primary" id="btn-modal-action" style="background:#a855f7;border-color:#c084fc;" ${held <= 0 ? 'disabled' : ''}>立即开启军备箱</button>`;
    } else if (item.targetType === 'energy') {
      actionButtonHtml = `<button class="weapon-btn primary" id="btn-modal-action" style="background:#0284c7;border-color:#38bdf8;" ${held <= 0 ? 'disabled' : ''}>使用药剂 (+25体能)</button>`;
    }

    modal.innerHTML = `
      <div class="item-modal-overlay">
        <div class="item-detail-card">
          <div class="item-detail-header">
            <div class="item-detail-avatar" style="border-color:${rarityColors[item.rarity]}">
              ${this.formatItemIcon(item.icon, item.name, 'modal-item-img', item.id || itemId)}
            </div>
            <div class="item-detail-info">
              <div class="item-detail-name">${item.name}</div>
              <div class="item-detail-tag-row">
                <span class="item-quality-pill" style="background:${rarityColors[item.rarity]}">${rarityNames[item.rarity]}</span>
              </div>
              <div class="item-detail-held">当前持有: ${held} 件</div>
            </div>
          </div>

          <div class="item-detail-desc">${item.desc}</div>
          <div class="item-detail-usage">💡 ${item.usage}</div>

          <div class="item-detail-actions">
            ${actionButtonHtml}
            <button class="weapon-btn upgrade" id="btn-modal-close" style="background:#334155;color:#e2e8f0;border-color:#64748b;">关闭</button>
          </div>
        </div>
      </div>
    `;
    modal.style.display = 'block';

    document.getElementById('btn-modal-close').onclick = () => {
      modal.style.display = 'none';
    };

    const btnAction = document.getElementById('btn-modal-action');
    if (btnAction) {
      btnAction.onclick = () => {
        modal.style.display = 'none';
        if (item.targetType === 'weapon' || item.targetType === 'magazine') {
          this.switchTab('weapons');
        } else if (item.targetType === 'rune') {
          this.switchTab('runes');
        } else if (item.targetType === 'pet') {
          this.switchTab('pets');
        } else if (item.targetType === 'skill') {
          this.switchTab('skills');
        } else if (item.targetType === 'crate') {
          this.handleOpenCrate();
        } else if (item.targetType === 'energy') {
          if (saveManager.useEnergyPotion()) {
            this.render();
          }
        }
      };
    }
  }

  // 开启军备箱
  handleOpenCrate() {
    const res = saveManager.openSupplyCrate();
    if (!res) {
      showToast('军备箱库存不足！可通过通关关卡或指挥官升级获得。', { tone: 'warn' });
      return;
    }
    this.render();

    const modal = document.getElementById('lobby-crate-modal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="item-modal-overlay">
        <div class="crate-reward-card">
          <div class="crate-reward-title">✨ 军备箱物资开启 ✨</div>
          <div style="font-size:13px;color:#facc15;font-weight:800;"><img class="ui-icon-inline" src="assets/icons/icon_coin.png" alt="Coin"> 额外获得废料 +${res.scrap}</div>

          <div class="crate-reward-items-grid">
            ${res.items.map(it => {
              const cfg = GAME_CONFIG.items[it.id] || { name: '物资', icon: 'assets/icons/icon_chip.png' };
              return `
                <div class="crate-reward-item">
                  <span class="crate-reward-item-icon">${this.formatItemIcon(cfg.icon, cfg.name, 'crate-item-icon-img')}</span>
                  <span class="crate-reward-item-name">${cfg.name}</span>
                  <span class="crate-reward-item-cnt">+${it.count}</span>
                </div>
              `;
            }).join('')}
          </div>

          <button class="weapon-btn primary" id="btn-crate-confirm" style="width:100%;height:44px;font-size:14px;">收入背包</button>
        </div>
      </div>
    `;
    modal.style.display = 'block';

    document.getElementById('btn-crate-confirm').onclick = () => {
      modal.style.display = 'none';
      this.render();
    };
  }

  // 5. 伴飞战术僚机 (专属核心 + 废料)
  renderPets() {
    const container = document.getElementById('pets-list');
    if (!container) return;
    const petData = saveManager.getPetData();
    const selected = petData.selected;

    container.innerHTML = Object.entries(GAME_CONFIG.pets.types).map(([id, cfg]) => {
      const saved = petData.pets[id] || { unlocked: false, level: 1 };
      const isDeployed = selected === id;
      const shardCost = 2 + Math.floor((saved.level - 1) / 2) + (saved.level >= 5 ? 2 : 0);
      const scrapCost = 50 + (saved.level - 1) * 50 + (saved.level >= 5 ? (saved.level - 4) * 60 : 0);
      const unlockCost = cfg.unlockCost || 200;

      const shardItem = GAME_CONFIG.items[cfg.materialId] || { name: '僚机核心', icon: 'assets/icons/icon_shard.png' };
      const heldShards = saveManager.getItemCount(cfg.materialId);
      const canAffordShards = heldShards >= shardCost;
      const canAffordScrap = saveManager.getScrap() >= scrapCost;
      const canUpgrade = saved.unlocked && canAffordShards && canAffordScrap;

      const curEvo = (cfg.evolutions || []).slice().reverse().find(e => saved.level >= e.level);
      const tierTitle = curEvo?.title || (saved.level >= 10 ? '三阶·重装机' : (saved.level >= 5 ? '二阶·突击机' : '一阶·侦察机'));
      const tierBadgeColor = saved.level >= 10 ? '#f59e0b' : (saved.level >= 5 ? '#a855f7' : '#38bdf8');

      const stats = {
        hp: Math.round(cfg.baseStats.hp * (1 + (saved.level - 1) * 0.25)),
        atk: Math.round(cfg.baseStats.attack * (1 + (saved.level - 1) * 0.25)),
        speed: cfg.baseStats.attackSpeed,
        range: cfg.baseStats.range
      };

      return `
        <div class="pet-card ${isDeployed ? 'deployed' : ''}">
          <div class="pet-card-top">
            <div class="pet-card-avatar">
              <img src="${cfg.asset}" alt="${cfg.name}">
            </div>
            <div class="pet-card-details">
              <div class="pet-card-name-row">
                <span class="pet-card-name">${cfg.name}</span>
                <span class="pet-card-tag" style="background:${tierBadgeColor}22;color:${tierBadgeColor};border:1px solid ${tierBadgeColor}55;">${tierTitle}</span>
              </div>
              <div style="font-size:11px;color:#facc15;font-weight:800;margin:2px 0;">成长等级: Lv.${saved.level} (每级全属性 +25%)</div>
              <div class="pet-card-desc">${cfg.description}</div>
            </div>
          </div>

          <div class="pet-stats-box">
            <div><div class="pet-stat-unit">护盾/生命</div><div class="pet-stat-num" style="color:#22c55e;">${stats.hp}</div></div>
            <div><div class="pet-stat-unit">攻击力</div><div class="pet-stat-num" style="color:#f59e0b;">${stats.atk}</div></div>
            <div><div class="pet-stat-unit">攻速</div><div class="pet-stat-num">${stats.speed}</div></div>
            <div><div class="pet-stat-unit">射程</div><div class="pet-stat-num">${stats.range}</div></div>
          </div>

          ${saved.unlocked ? `
            <div class="mat-req-box">
              <div class="mat-req-left">
                <span>${this.formatItemIcon(shardItem.icon, shardItem.name, 'mat-req-icon-img')}</span>
                <span>${shardItem.name}</span>
              </div>
              <div class="mat-req-status ${canAffordShards ? 'met' : 'unmet'}">
                ${heldShards}/${shardCost} ${canAffordShards ? '✓' : '✕ (缺少)'}
              </div>
            </div>
          ` : ''}

          <div class="pet-card-actions">
            ${saved.unlocked ? `
              <button class="weapon-btn upgrade" data-action="upgrade-pet" data-id="${id}" data-scost="${scrapCost}" data-hcost="${shardCost}" ${!canUpgrade ? 'disabled' : ''}>
                <img class="ui-icon-inline" src="assets/icons/icon_coin.png" alt="Coin"> ${scrapCost} 升级
              </button>
              <button class="weapon-btn primary" data-action="deploy-pet" data-id="${id}" ${isDeployed ? 'disabled' : ''}>
                ${isDeployed ? '已出战' : '选此出战'}
              </button>
            ` : `
              <button class="weapon-btn primary" data-action="unlock-pet" data-id="${id}" data-cost="${unlockCost}" ${saveManager.getGems() < unlockCost ? 'disabled' : ''} style="background:#9333ea;border-color:#c084fc;">
                <img class="ui-icon-inline" src="assets/icons/icon_gem.png" alt="Gem"> ${unlockCost} 晶核召唤
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'deploy-pet') {
          saveManager.setSelectedPet(id);
          this.render();
        } else if (action === 'upgrade-pet') {
          const scost = parseInt(btn.dataset.scost, 10);
          const hcost = parseInt(btn.dataset.hcost, 10);
          if (saveManager.upgradePet(id, scost, hcost)) this.render();
        } else if (action === 'unlock-pet') {
          const cost = parseInt(btn.dataset.cost, 10);
          if (saveManager.unlockPet(id, cost)) this.render();
        }
      };
    });
  }

  // 6. 符文管理 (消耗远古符文碎片 rune_shard + 废料)
  renderRunes() {
    const container = document.getElementById('runes-list');
    if (!container) return;
    runeSystem.reload();

    const heldRuneShards = saveManager.getItemCount('rune_shard');
    const badgeEl = document.getElementById('lobby-rune-shard-badge');
    if (badgeEl) {
      badgeEl.textContent = `🧩 远古符文碎片: ${heldRuneShards}`;
    }

    const filtered = RUNE_CATALOG.filter(r => this.runeFilter === 'all' || r.category === this.runeFilter);

    container.innerHTML = filtered.map(rune => {
      const level = runeSystem.getLevel(rune.id);
      const isMax = level >= rune.maxLevel;
      const scrapCost = isMax ? 0 : getRuneUpgradeCost(rune, level);
      const shardCost = isMax ? 0 : getRuneUpgradeShardCost(rune, level);
      const canAffordScrap = saveManager.getScrap() >= scrapCost;
      const canAffordShards = heldRuneShards >= shardCost;
      const canAfford = canAffordScrap && canAffordShards && !isMax;

      return `
        <div class="rune-item-card cat-${rune.category}">
          <div class="rune-item-left">
            <div class="rune-item-icon cat-${rune.category}">
              <img class="rune-icon-img" src="${rune.asset || `assets/runes/rune_${rune.id}.png`}" alt="${rune.name}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';">
              <span class="rune-icon-fallback" style="display:none;">${rune.icon}</span>
            </div>
            <div>
              <div class="rune-item-name">${rune.name} <span style="font-size:11px;color:#38bdf8;">Lv.${level}/${rune.maxLevel}</span></div>
              <div class="rune-item-desc">${rune.desc}</div>
              ${!isMax ? `
                <div style="font-size:11px;color:#cbd5e1;margin-top:3px;display:flex;align-items:center;gap:6px;">
                  <span>需碎片: <b style="color:${canAffordShards ? '#4ade80' : '#ef4444'};">${heldRuneShards}/${shardCost}</b></span>
                  <span>|</span>
                  <span>需金币: <b style="color:${canAffordScrap ? '#fde047' : '#ef4444'};">${scrapCost}</b></span>
                </div>
              ` : ''}
            </div>
          </div>
          <button class="rune-item-btn" data-action="upgrade-rune" data-id="${rune.id}" ${!canAfford ? 'disabled' : ''}>
            ${isMax ? '已满级' : `<img class="ui-icon-inline" src="assets/icons/icon_coin.png" alt="Coin"> ${scrapCost} 强化`}
          </button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-action="upgrade-rune"]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        if (runeSystem.tryUpgrade(id)) {
          this.render();
        }
      };
    });
  }

  // 7. 关卡滑选轨道：全部关卡铺成一条横向卡片流，左右滑动浏览
  renderStageCarousel() {
    const track = document.getElementById('lobby-stage-track');
    if (!track) return;

    const stages = GAME_CONFIG.stages || [];
    const curMode = saveManager.getMode() || 'normal';
    const isElite = curMode === 'elite';
    const highestCleared = saveManager.getHighestStageCleared() || 0;

    track.innerHTML = stages.map(st => {
      const lock = this.getStageLockState(st, curMode);
      const isSelected = st.id === this.selectedStageId;
      const chapter = (GAME_CONFIG.chapters || []).find(c => c.id === st.chapter);

      // 只显示当前模式下的通关状态，避免两种模式的标记混在一起
      let stateHtml;
      if (lock.locked) stateHtml = '<span class="lobby-stage-card-state locked">🔒 未解锁</span>';
      else if (isElite && saveManager.isEliteCleared(st.id)) stateHtml = '<span class="lobby-stage-card-state cleared">★ 精英已通关</span>';
      else if (!isElite && highestCleared >= st.id) stateHtml = '<span class="lobby-stage-card-state cleared">✓ 已通关</span>';
      else stateHtml = `<span class="lobby-stage-card-state">${isElite ? '精英待攻克' : '待攻克'}</span>`;

      let bossHtml = '';
      if (st.isChapterBoss) bossHtml = '<span class="lobby-stage-card-boss chapter">👑 霸主</span>';
      else if (st.isMiniBoss) bossHtml = '<span class="lobby-stage-card-boss mini">💀 首领</span>';

      return `
        <div class="lobby-stage-card ${isSelected ? 'selected' : ''} ${lock.locked ? 'locked' : ''} ${isElite ? 'elite' : ''}" data-stage-id="${st.id}">
          <div class="lobby-stage-card-top">
            <span class="lobby-stage-card-no"${chapter ? ` style="--chapter-color:${chapter.color};"` : ''}>${st.id}</span>
            ${bossHtml}
          </div>
          <div class="lobby-stage-card-name">${st.name}</div>
          <div class="lobby-stage-card-meta">${chapter ? chapter.shortName : ''} · x${st.difficulty}</div>
          <div class="lobby-stage-card-waves">${st.endless ? '无尽波次' : `防守 ${st.clearWaves} 波`}</div>
          ${stateHtml}
          <button class="lobby-stage-card-detail" type="button" data-action="stage-detail" data-id="${st.id}">详情</button>
        </div>
      `;
    }).join('');

    // 卡片是整段重建的，scrollLeft 会归零，必须重新对准当前选中的关卡
    this.updateStagePosLabel(this.selectedStageIndex);
    this.scrollStageTo(this.selectedStageIndex, false);
  }

  // 关卡在指定模式下的解锁状态
  getStageLockState(stage, mode) {
    if (mode === 'elite') {
      return saveManager.isEliteUnlocked(stage.id)
        ? { locked: false, reason: '' }
        : { locked: true, reason: `需先通关第 ${stage.id} 关的标准模式` };
    }
    return stage.id <= saveManager.getUnlockedStage()
      ? { locked: false, reason: '' }
      : { locked: true, reason: '请先通关前面的关卡' };
  }

  // 关卡 ID 在轨道中的下标
  stageIndexOf(stageId) {
    const idx = (GAME_CONFIG.stages || []).findIndex(s => s.id === stageId);
    return idx < 0 ? 0 : idx;
  }

  // 把某张卡片滚到可视区正中
  scrollStageTo(index, smooth = true) {
    const carousel = document.getElementById('lobby-stage-carousel');
    const track = document.getElementById('lobby-stage-track');
    if (!carousel || !track || !track.children.length) return;

    const cards = track.children;
    const clamped = Math.max(0, Math.min(cards.length - 1, index));
    const card = cards[clamped];
    const target = card.offsetLeft - (carousel.clientWidth - card.offsetWidth) / 2;

    // 程序滚动会连续触发 scroll 事件，期间挂起反向同步，避免和手势来回打架
    this._suppressStageSync = true;
    const left = Math.max(0, target);
    // 老 WebView 不认 scrollTo 的 options 形式，会静默不滚动，所以先探测再降级
    if (typeof carousel.scrollTo === 'function' && 'scrollBehavior' in document.documentElement.style) {
      carousel.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    } else {
      carousel.scrollLeft = left;
    }
    clearTimeout(this._stageSyncTimer);
    this._stageSyncTimer = setTimeout(() => {
      this._suppressStageSync = false;
      // 抑制窗口盖住了这期间的滚动事件，结束后按最终位置补一次校准
      this.syncStageFromScroll();
    }, smooth ? 450 : 0);
  }

  // 手指滑动结束后，取离可视区中心最近的一张卡片作为选中项
  syncStageFromScroll() {
    if (this._suppressStageSync) return;
    const carousel = document.getElementById('lobby-stage-carousel');
    const track = document.getElementById('lobby-stage-track');
    if (!carousel || !track || !track.children.length) return;

    const cards = track.children;
    const center = carousel.scrollLeft + carousel.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < cards.length; i++) {
      const dist = Math.abs(cards[i].offsetLeft + cards[i].offsetWidth / 2 - center);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    this.applyStageSelection(parseInt(cards[best].dataset.stageId, 10), best);

    // 已经对准正中就不用再动，否则「吸附 -> 触发滚动 -> 再吸附」会自己转起来
    if (bestDist <= 2) return;

    // 手指停下后把卡片吸附到正中。CSS scroll-snap 也能吸附，但它和程序滚动
    // 会互相抢位置，所以这里自己来，等滚动真正静下来再动手。
    clearTimeout(this._stageSettleTimer);
    this._stageSettleTimer = setTimeout(() => {
      if (this._suppressStageSync) return;
      this.scrollStageTo(this.selectedStageIndex, true);
    }, 160);
  }

  // 切换选中关卡：只更新浏览态与高亮，不重建轨道（否则会打断滑动）
  applyStageSelection(stageId, index) {
    if (!stageId) return;
    this.selectedStageId = stageId;
    this.selectedStageIndex = index;

    const track = document.getElementById('lobby-stage-track');
    if (track) {
      track.querySelectorAll('.lobby-stage-card').forEach(card => {
        card.classList.toggle('selected', parseInt(card.dataset.stageId, 10) === stageId);
      });
    }
    this.updateStagePosLabel(index);
    this.renderStageSummary();
  }

  // 点卡片：选中并把它滚到中间
  pickStage(stageId, { scroll = false } = {}) {
    const index = this.stageIndexOf(stageId);
    if (scroll) this.scrollStageTo(index, true);
    this.applyStageSelection(stageId, index);
  }

  // 左右箭头：移动一关
  stepStage(delta) {
    const stages = GAME_CONFIG.stages || [];
    const next = Math.max(0, Math.min(stages.length - 1, this.selectedStageIndex + delta));
    if (next === this.selectedStageIndex) return;
    this.scrollStageTo(next, true);
    this.applyStageSelection(stages[next].id, next);
  }

  updateStagePosLabel(index) {
    const el = document.getElementById('lobby-stage-pos');
    if (!el) return;
    const total = (GAME_CONFIG.stages || []).length;
    el.textContent = `${Math.max(0, Math.min(total - 1, index)) + 1} / ${total}`;
  }

  // 开始防守：打的就是轨道上当前选中的那一关
  confirmStageAndLaunch() {
    const stageId = this.selectedStageId || saveManager.getEquippedStage();
    const stage = (GAME_CONFIG.stages || []).find(s => s.id === stageId);
    if (!stage) return;

    const lock = this.getStageLockState(stage, saveManager.getMode() || 'normal');
    if (lock.locked) {
      showToast(`🔒 第 ${stageId} 关【${stage.name}】尚未解锁！\n${lock.reason}。`, { tone: 'warn' });
      return;
    }

    // 出击时才把浏览到的关卡写回存档，纯滑动浏览不产生存档写入
    saveManager.setEquippedStage(stageId);
    this.launchBattle(stageId);
  }

  // 关卡详情：列出该关的全部掉落产出，扫荡入口也收在这里
  showStageDetail(stageId) {
    const stage = (GAME_CONFIG.stages || []).find(s => s.id === stageId);
    if (!stage) return;

    const oldModal = document.getElementById('stage-detail-modal');
    if (oldModal) oldModal.remove();

    const curMode = saveManager.getMode() || 'normal';
    const isElite = curMode === 'elite';
    const modeCfg = GAME_CONFIG.modes?.[curMode] || GAME_CONFIG.modes?.normal || {};
    const lock = this.getStageLockState(stage, curMode);
    const normalCleared = (saveManager.getHighestStageCleared() || 0) >= stage.id;
    const canSweep = isElite ? saveManager.isEliteCleared(stage.id) : normalCleared;
    const chapter = (GAME_CONFIG.chapters || []).find(c => c.id === stage.chapter);
    const accent = isElite ? '#f43f5e' : (chapter?.color || '#38bdf8');

    const dropRow = (id, name, icon, sub, highlight = false) => `
      <div class="stage-detail-drop${highlight ? ' highlight' : ''}">
        ${this.formatItemIcon(icon, name, 'stage-detail-drop-icon', id)}
        <div>
          <div class="stage-detail-drop-name">${name}</div>
          <div class="stage-detail-drop-sub">${sub}</div>
        </div>
      </div>
    `;

    // 特色产出：关卡配置里写死的定向掉落
    const featuredHtml = (stage.targetDrops || []).map(drop =>
      dropRow(drop.id, drop.name, drop.icon, '本关定向产出', !!drop.highlight)
    ).join('') || '<div class="stage-detail-empty">本关无定向产出</div>';

    // 常规产出：与扫荡结算共用同一个素材池
    const commonHtml = ['power_shard', 'bulletspeed_shard', 'attackspeed_shard', 'mag_shard', 'rune_shard']
      .map(id => {
        const cfg = GAME_CONFIG.items?.[id] || {};
        return dropRow(id, cfg.name || id, cfg.icon || id, '随机 1~2 份');
      }).join('');

    const eliteHtml = isElite
      ? dropRow(
          'rare_weapon_shard',
          GAME_CONFIG.items?.rare_weapon_shard?.name || '稀有军工枪械核心',
          GAME_CONFIG.items?.rare_weapon_shard?.icon,
          '精英模式必掉 · 枪械 6 级以上突破素材',
          true
        )
      : '';

    const scrapAvg = Math.round((stage.scrapReward || 80) * (modeCfg.scrapMult || 1));
    const resistance = Math.min(0.6, (stage.physicalResistance || 0) + (modeCfg.physicalResistanceBonus || 0));

    const modal = document.createElement('div');
    modal.id = 'stage-detail-modal';
    modal.className = 'stage-detail-backdrop';
    modal.innerHTML = `
      <div class="stage-detail-dialog${isElite ? ' elite' : ''}" style="--stage-accent:${accent};">
        <div class="stage-detail-header">
          <div class="stage-detail-title-box">
            <span class="stage-detail-no">${stage.id}</span>
            <div>
              <div class="stage-detail-name">${stage.name}</div>
              <div class="stage-detail-sub">${chapter ? `${chapter.icon} ${chapter.name}` : ''} · ${isElite ? '💀 精英突袭' : '🛡️ 标准防守'}</div>
            </div>
          </div>
          <button class="stage-detail-close" id="stage-detail-close-x" type="button" aria-label="关闭">✕</button>
        </div>

        <div class="stage-detail-stats">
          <div><span>通关波次</span><strong>${stage.endless ? '无尽' : stage.clearWaves}</strong></div>
          <div><span>难度系数</span><strong>x${(stage.difficulty * (isElite ? 1.6 : 1.0)).toFixed(2)}</strong></div>
          <div><span>物理抗性</span><strong>${Math.round(resistance * 100)}%</strong></div>
          <div><span>废料产出</span><strong>约 ${scrapAvg}</strong></div>
        </div>

        ${stage.desc ? `<div class="stage-detail-desc">${stage.desc}</div>` : ''}

        <div class="stage-detail-section-title">🎯 特色产出</div>
        <div class="stage-detail-drops">${featuredHtml}</div>

        ${eliteHtml ? `<div class="stage-detail-section-title">👑 精英专属</div><div class="stage-detail-drops">${eliteHtml}</div>` : ''}

        <div class="stage-detail-section-title">📦 常规素材（随机掉落）</div>
        <div class="stage-detail-drops">${commonHtml}</div>

        <div class="stage-detail-actions">
          ${canSweep
            ? `<button class="stage-sweep-btn${isElite ? ' elite-sweep-btn' : ''}" id="stage-detail-sweep" type="button">⚡ ${isElite ? '精英扫荡' : '极速扫荡'}（消耗 5 体能）</button>`
            : `<span class="stage-detail-lock-hint">${lock.locked ? `🔒 ${lock.reason}，暂不可出击` : '通关本关后可开启扫荡'}</span>`}
          <button class="stage-detail-ok" id="stage-detail-confirm" type="button">确定</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#stage-detail-close-x').onclick = closeModal;
    modal.querySelector('#stage-detail-confirm').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    const sweepBtn = modal.querySelector('#stage-detail-sweep');
    if (sweepBtn) {
      sweepBtn.onclick = () => {
        // 扫荡结果弹窗会盖在详情之上，先把详情收掉
        closeModal();
        this.handleSweepStage(stageId, curMode);
      };
    }
  }

  // 扫荡已通关的关卡
  handleSweepStage(stageId, mode = 'normal') {
    const energy = saveManager.getEnergy();
    if (energy < 5) {
      showToast('作战体能不足（扫荡需要 5 点能量）！请等待恢复或稍后再试。', { tone: 'warn' });
      return;
    }

    const res = saveManager.sweepStage(stageId, mode);
    if (!res.success) {
      showToast(res.message || '扫荡失败！', { tone: 'warn' });
      return;
    }

    // 扫荡会消耗体能、推进指挥官等级并入库战利品，顶栏与轨道状态都要跟着刷新
    this.renderHeader();
    this.renderStageCarousel();
    this.renderStageSummary();

    // 弹出炫酷的扫荡战利品清单
    this.showSweepResultModal(res, stageId, mode);
  }

  // 展示扫荡战利品弹窗
  showSweepResultModal(res, stageId, mode) {
    const oldModal = document.getElementById('sweep-result-modal');
    if (oldModal) oldModal.remove();

    const isElite = mode === 'elite';
    const curEnergy = saveManager.getEnergy();

    const modal = document.createElement('div');
    modal.id = 'sweep-result-modal';
    modal.className = 'sweep-modal-backdrop';

    const lootCards = [];

    // 废料：sweepStage 返回的字段是 scrap
    lootCards.push(`
      <div class="sweep-loot-card">
        <span style="font-size:24px;">💰</span>
        <div>
          <div style="font-size:11px;color:#94a3b8;">工业废料</div>
          <div style="font-size:15px;font-weight:900;color:#facc15;">+${res.scrap || 0}</div>
        </div>
      </div>
    `);

    // 高能晶核（精英模式有几率掉落）
    if (res.gems > 0) {
      lootCards.push(`
        <div class="sweep-loot-card">
          <span style="font-size:24px;">💎</span>
          <div>
            <div style="font-size:11px;color:#94a3b8;">高能晶核</div>
            <div style="font-size:15px;font-weight:900;color:#38bdf8;">+${res.gems}</div>
          </div>
        </div>
      `);
    }

    // 战利品是一个 { 物品ID: 数量 } 的字典，名称与图标统一查 GAME_CONFIG.items
    Object.entries(res.items || {}).forEach(([itemId, count]) => {
      if (!count) return;
      const cfg = GAME_CONFIG.items?.[itemId] || {};
      const isRare = itemId === 'rare_weapon_shard';
      lootCards.push(`
        <div class="sweep-loot-card${isRare ? ' rare-highlight' : ''}">
          ${this.formatItemIcon(cfg.icon || itemId, cfg.name || itemId, 'sweep-loot-icon', itemId)}
          <div style="flex:1;">
            <div style="font-size:11px;color:${isRare ? '#f43f5e' : '#94a3b8'};font-weight:${isRare ? 900 : 400};">${cfg.name || itemId}</div>
            <div style="font-size:15px;font-weight:900;color:${isRare ? '#fda4af' : '#c084fc'};">+${count} ${isRare ? '核心' : '碎片'}</div>
            ${isRare ? '<div style="font-size:10px;color:#fda4af;">可用于枪械 6 级以上突破强化</div>' : ''}
          </div>
        </div>
      `);
    });

    // 指挥官经验
    lootCards.push(`
      <div class="sweep-loot-card">
        <span style="font-size:24px;">🎖️</span>
        <div>
          <div style="font-size:11px;color:#94a3b8;">指挥官经验</div>
          <div style="font-size:15px;font-weight:900;color:#4ade80;">+${res.exp || 0} EXP</div>
        </div>
      </div>
    `);

    modal.innerHTML = `
      <div class="sweep-modal-dialog ${isElite ? 'elite-sweep-modal' : ''}">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:22px;">⚡</span>
            <div>
              <div style="font-size:16px;font-weight:900;color:${isElite ? '#f43f5e' : '#38bdf8'};">
                第 ${stageId} 关 · ${res.stageName || ''} ${isElite ? '💀 精英极限扫荡' : '🛡️ 战术极速扫荡'} 成功！
              </div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">
                战线肃清完毕 · 消耗能量 5 点 (剩余: ${curEnergy} ⚡)
              </div>
            </div>
          </div>
          <button id="close-sweep-x" style="background:transparent;border:none;color:#94a3b8;font-size:20px;cursor:pointer;padding:4px 8px;">✕</button>
        </div>

        <div class="sweep-loot-grid">
          ${lootCards.join('')}
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
          <button id="btn-sweep-again" style="flex:1;padding:10px;border-radius:8px;border:1px solid ${isElite ? '#f43f5e' : '#38bdf8'};background:${isElite ? 'rgba(244,63,94,0.15)' : 'rgba(56,189,248,0.15)'};color:${isElite ? '#fda4af' : '#7dd3fc'};font-weight:bold;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;gap:4px;">
            ⚡ 再扫一次 (${curEnergy >= 5 ? '消耗 5 ⚡' : '能量不足'})
          </button>
          <button id="btn-sweep-confirm" style="flex:1;padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;font-weight:900;cursor:pointer;font-size:13px;box-shadow:0 0 10px rgba(2,132,199,0.5);">
            确定收下
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#close-sweep-x').onclick = closeModal;
    modal.querySelector('#btn-sweep-confirm').onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };

    const againBtn = modal.querySelector('#btn-sweep-again');
    againBtn.onclick = () => {
      closeModal();
      this.handleSweepStage(stageId, mode);
    };
  }

  // 发起战斗
  launchBattle(stageId) {
    if (!saveManager.useEnergy(5)) {
      showToast('作战体能不足（需要 5 点能量）！请等待恢复或在背包中使用高能能量剂。', { tone: 'warn' });
      return;
    }
    this.hide();

    // 应用装备的枪械综合属性（主等级 + 力量/射速/攻速/弹匣碎片等级）
    const equippedWeaponId = saveManager.getEquippedWeapon();
    const weaponConfig = GAME_CONFIG.weapons[equippedWeaponId] || GAME_CONFIG.weapons.assault;
    const weaponLevel = saveManager.getWeaponData().weapons[equippedWeaponId]?.level || 1;

    const actualDamage = saveManager.getWeaponDamage(equippedWeaponId);
    const actualBulletSpeed = saveManager.getWeaponBulletSpeed(equippedWeaponId);
    const actualFireInterval = saveManager.getWeaponFireInterval(equippedWeaponId);
    const actualMagazineCapacity = saveManager.getWeaponMagazineCapacity(equippedWeaponId);

    this.game.weapon = {
      ...GAME_CONFIG.weapon,
      damage: actualDamage,
      bulletSpeed: actualBulletSpeed,
      pierceCount: weaponConfig.baseStats.pierce,
      multishot: weaponConfig.baseStats.multishot,
      critChance: weaponConfig.baseStats.critChance + (weaponLevel - 1) * (weaponConfig.growth.critPerLevel || 0)
    };
    this.game.hero.baseAttackInterval = actualFireInterval;
    this.game.hero.magazineCapacity = actualMagazineCapacity;
    this.game.hero.currentAmmo = actualMagazineCapacity;
    this.game.hero.reloadTime = weaponConfig.baseStats.reloadTime || 1.4;

    // 应用关卡与开战
    this.game.startStage(stageId);

    // 同步出战佩戴的技能（初始默认携带且均为 Lv.1）
    // 全部技能状态都在 game.skills，无需再分别处理核心技能与特性技能
    const equippedSkills = saveManager.getEquippedSkills();
    for (const id of ['rocket', 'truck', 'freeze', 'laser', 'tornado', 'boomerang', 'bomber']) {
      const state = this.game.skills[id];
      if (state) state.level = equippedSkills.includes(id) ? 1 : 0;
    }

    if (this.game.feature?.syncPet) {
      this.game.feature.syncPet();
    }
    this.game.isPaused = false;
  }
}

export const homeLobbyUI = new HomeLobbyUI();
