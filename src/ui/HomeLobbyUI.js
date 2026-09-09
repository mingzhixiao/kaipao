// ---------------- 现代流行 H5 游戏首页大厅、五大管理与背包系统控制器 ----------------
import { saveManager } from '../systems/SaveManager.js';
import { GAME_CONFIG } from '../core/Config.js';
import { runeSystem, RUNE_CATALOG, getRuneUpgradeCost, getRuneUpgradeShardCost } from '../systems/RuneSystem.js';

export class HomeLobbyUI {
  constructor() {
    this.game = null;
    this.activeTab = 'lobby';
    this.selectedChapter = 1;
    this.runeFilter = 'all';
    this.backpackFilter = 'all';
    this.dom = {};
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
          <div class="lobby-power-banner">
            <span class="lobby-power-label"><img class="ui-icon-inline" src="assets/icons/icon_stamina.png" alt="Power"> 综合战力评分</span>
            <span class="lobby-power-val" id="lobby-total-power">1280</span>
          </div>

          <div class="lobby-stage-arena">
            <div class="lobby-stage-arena-glow"></div>
            <div class="lobby-fortress-truck" title="重型突击战车"></div>
            <div class="lobby-floating-pet" id="lobby-arena-pet" title="出战伙伴">
              <img id="lobby-arena-pet-img" src="assets/pets/fluffy.png" alt="Pet">
            </div>
          </div>

          <div class="lobby-current-stage-card">
            <div>
              <div class="lobby-stage-info-title">当前作战区域</div>
              <div class="lobby-stage-info-name" id="lobby-stage-name">STAGE 1 · 废土前哨</div>
              <div class="lobby-stage-info-desc" id="lobby-stage-desc">抵御 5 波尸潮 · 首通奖励 80 废料</div>
            </div>
            <button class="lobby-stage-change-btn" id="btn-switch-to-trials">切换关卡</button>
          </div>

          <!-- 城防加固科技专区 (通关第1关解锁) -->
          <div class="lobby-fortification-card" id="lobby-fortification-section">
            <div class="lobby-fortification-header">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:18px;">🛡️</span>
                <div>
                  <div style="font-weight:900;color:#f8fafc;font-size:13px;">基地城防加固工程</div>
                  <div style="font-size:11px;color:#94a3b8;">强化外挂装甲壁、能量屏障与自愈反伤</div>
                </div>
              </div>
              <span id="lobby-fort-status-badge" style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:12px;background:rgba(56,189,248,0.2);color:#38bdf8;border:1px solid rgba(56,189,248,0.4);">Lv.1</span>
            </div>
            <div class="lobby-fort-grid" id="lobby-fort-grid"></div>
          </div>

          <div class="lobby-battle-cta-wrap">
            <button class="lobby-battle-btn" id="btn-lobby-battle">
              <img class="ui-icon-inline" src="assets/icons/icon_level.png" alt="Battle" style="width:20px;height:20px;">
              <span>立即出击 BATTLE</span>
            </button>
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
            <div class="section-subtitle">管理各类枪械配件、技能芯片与宠物基因碎片</div>
          </div>
          <div class="backpack-summary-bar">
            <span class="backpack-count-tag" id="backpack-total-held">物资种类: 0 种</span>
            <button class="backpack-open-crate-btn" id="btn-quick-open-crate">📦 开启军备箱</button>
          </div>
          <div class="filter-bar" id="backpack-filter-bar">
            <div class="filter-pill active" data-bfilter="all">全部物资</div>
            <div class="filter-pill" data-bfilter="weapon">枪械配件</div>
            <div class="filter-pill" data-bfilter="skill">技能芯片</div>
            <div class="filter-pill" data-bfilter="pet">宠物基因</div>
            <div class="filter-pill" data-bfilter="consumable">军备补给</div>
          </div>
          <div class="backpack-grid" id="backpack-items-list"></div>
        </div>

        <!-- Tab 5: 宠物乐园 (Pets) -->
        <div class="lobby-tab-view" id="view-pets">
          <div class="section-header">
            <div class="section-title">🐾 战术宠物乐园</div>
            <div class="section-subtitle">携带伴飞伙伴助阵（消耗专属基因碎片升级）</div>
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

        <!-- Tab 7: 试炼之路 (Trials) -->
        <div class="lobby-tab-view" id="view-trials">
          <div class="section-header">
            <div class="section-title">⚔️ 试炼之路</div>
            <div class="section-subtitle">战役章节推进与无尽挑战</div>
          </div>
          <div class="stages-flow-list" id="stages-list"></div>
        </div>
      </main>

      <!-- 底部 7 大主流导航栏 -->
      <nav class="lobby-bottom-nav">
        <button class="nav-tab-btn active" data-tab="lobby">
          <span class="nav-tab-icon">🏰</span>
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
          <span class="nav-tab-icon">🐾</span>
          <span class="nav-tab-label">宠物</span>
        </button>
        <button class="nav-tab-btn" data-tab="runes">
          <span class="nav-tab-icon">💠</span>
          <span class="nav-tab-label">符文</span>
        </button>
        <button class="nav-tab-btn" data-tab="trials">
          <span class="nav-tab-icon">⚔️</span>
          <span class="nav-tab-label">试炼</span>
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

    // 首页出击按钮
    document.getElementById('btn-lobby-battle').addEventListener('click', () => {
      const stageId = saveManager.getEquippedStage();
      this.launchBattle(stageId);
    });

    // 首页“切换关卡”跳转试炼之路
    document.getElementById('btn-switch-to-trials').addEventListener('click', () => {
      this.switchTab('trials');
    });

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
      alert('🔒【符文矩阵工坊】尚未解锁！\n通关第 2 关【锈蚀公路】后开放。');
      return;
    }
    if (tabId === 'pets' && !saveManager.isSystemUnlocked('pets')) {
      alert('🔒【战术宠物乐园】尚未解锁！\n通关第 3 关【断裂立交】后开放。');
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
    else if (this.activeTab === 'trials') this.renderTrials();
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
    const navLabels = { lobby: '基地', weapons: '枪械', skills: '技能', backpack: '背包', pets: '宠物', runes: '符文', trials: '试炼' };
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

    const currentStageId = saveManager.getEquippedStage();
    const stage = GAME_CONFIG.stages.find(s => s.id === currentStageId) || GAME_CONFIG.stages[0];
    const nameEl = document.getElementById('lobby-stage-name');
    const descEl = document.getElementById('lobby-stage-desc');
    const curMode = saveManager.getMode();
    const modeTag = curMode === 'elite' ? '<span style="color:#f43f5e;font-weight:900;margin-left:6px;">[💀 精英模式]</span>' : '';
    if (nameEl) nameEl.innerHTML = `STAGE ${stage.id} · ${stage.name} ${modeTag}`;
    if (descEl) descEl.textContent = stage.endless ? '无尽模式 · 极限生存挑战' : `通关波次 ${stage.clearWaves} · 难度 x${stage.difficulty}`;

    // 渲染基地城防加固系统
    this.renderFortification();
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
          🔒 通关第 1 关【废土前哨】后解锁城防加固工程
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
          alert(res.message);
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
          if (!res.success) alert(res.message);
          else this.render();
        } else if (action === 'upgrade-bulletspeed') {
          const res = saveManager.upgradeWeaponBulletSpeed(id);
          if (!res.success) alert(res.message);
          else this.render();
        } else if (action === 'upgrade-attackspeed') {
          const res = saveManager.upgradeWeaponAttackSpeed(id);
          if (!res.success) alert(res.message);
          else this.render();
        } else if (action === 'upgrade-magazine') {
          const res = saveManager.upgradeWeaponMagazine(id);
          if (!res.success) alert(res.message);
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
        alert(res.message);
        if (res.success) this.render();
      };
    });

    container.querySelectorAll('[data-action="toggle-equip-skill"]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const res = saveManager.toggleEquipSkill(id);
        if (!res.success) {
          alert(res.message);
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

  // 4. 战术背包 (Backpack / Inventory)
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
      if (count > 0) totalItems++;
      if (this.backpackFilter === 'all') return true;
      return cfg.category === this.backpackFilter;
    });

    if (totalHeldEl) totalHeldEl.textContent = `当前仓位: ${totalItems} 种素材物资`;

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
      actionButtonHtml = `<button class="weapon-btn primary" id="btn-modal-action">前往培养宠物</button>`;
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
      alert('军备箱库存不足！可通过通关关卡或指挥官升级获得。');
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

  // 5. 宠物乐园 (专属基因 + 废料)
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

      const shardItem = GAME_CONFIG.items[cfg.materialId] || { name: '基因碎片', icon: 'assets/icons/icon_shard.png' };
      const heldShards = saveManager.getItemCount(cfg.materialId);
      const canAffordShards = heldShards >= shardCost;
      const canAffordScrap = saveManager.getScrap() >= scrapCost;
      const canUpgrade = saved.unlocked && canAffordShards && canAffordScrap;

      const tierTitle = saved.level >= 10 ? '三阶·终极霸者' : (saved.level >= 5 ? '二阶·觉醒进阶' : '一阶·幼生形态');
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

  // 7. 试炼之路 (5 大主题战区切换 & 普通/精英双难度)
  renderTrials() {
    const container = document.getElementById('stages-list');
    if (!container) return;
    const curMode = saveManager.getMode() || 'normal';
    const unlocked = saveManager.getUnlockedStage();
    const equipped = saveManager.getEquippedStage();

    const equippedStage = GAME_CONFIG.stages.find(s => s.id === equipped) || GAME_CONFIG.stages[0];
    const equippedChapter = equippedStage?.chapter || 1;
    if (!this.selectedChapter) {
      this.selectedChapter = equippedChapter;
    }

    const chapters = GAME_CONFIG.chapters || [];

    // 1. 战区选择器选项卡 (Chapters Tabs)
    const chapterTabsHtml = `
      <div class="lobby-chapter-nav" style="grid-column: 1 / -1; display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:10px; -webkit-overflow-scrolling:touch;">
        ${chapters.map(ch => {
          const isActive = ch.id === this.selectedChapter;
          const isChLocked = curMode === 'normal' && ch.stages[0] > unlocked && ch.id !== 6;
          return `
            <button class="chapter-tab-btn ${isActive ? 'active-chapter' : ''}" data-action="switch-chapter" data-chapter-id="${ch.id}" style="flex:0 0 auto; display:flex; align-items:center; gap:5px; padding:7px 12px; border-radius:10px; border:1px solid ${isActive ? ch.color : 'rgba(59,130,246,0.25)'}; background:${isActive ? `linear-gradient(135deg, ${ch.color}22, rgba(15,23,42,0.95))` : 'rgba(15,23,42,0.75)'}; color:${isActive ? '#fff' : '#94a3b8'}; cursor:pointer; font-size:12px; font-weight:700; transition:all 0.2s ease; box-shadow:${isActive ? `0 0 14px ${ch.color}44` : 'none'};">
              <span>${ch.icon}</span>
              <span>${ch.shortName}</span>
              <span style="font-size:10px; opacity:0.75;">(${ch.stages[0] === ch.stages[1] ? ch.stages[0] : `${ch.stages[0]}-${ch.stages[1]}`})</span>
              ${isChLocked ? '<span style="font-size:10px;">🔒</span>' : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;

    // 2. 当前选中战区的信息横幅
    const curChapter = chapters.find(c => c.id === this.selectedChapter) || chapters[0];
    const chStages = GAME_CONFIG.stages.filter(s => s.chapter === this.selectedChapter);
    const chClearedCount = chStages.filter(s => (saveManager.getHighestStageCleared() || 0) >= s.id).length;
    
    const chapterBannerHtml = `
      <div style="grid-column: 1 / -1; margin-bottom:10px; padding:10px 14px; border-radius:12px; background:linear-gradient(135deg, rgba(30,41,59,0.75), rgba(15,23,42,0.95)); border:1px solid ${curChapter.color}44; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <div style="font-size:14px; font-weight:900; color:${curChapter.color}; display:flex; align-items:center; gap:6px;">
            <span>${curChapter.icon}</span>
            <span>${curChapter.name}</span>
          </div>
          <div style="font-size:11px; color:#94a3b8; margin-top:3px;">${curChapter.desc}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:11px; padding:3px 8px; border-radius:6px; background:rgba(255,255,255,0.06); color:#cbd5e1;">
            战区进度: <b style="color:${curChapter.color};">${chClearedCount} / ${chStages.length}</b>
          </span>
          ${equippedChapter !== this.selectedChapter ? `
            <button class="quick-jump-btn" data-action="jump-current" style="font-size:11px; padding:4px 9px; border-radius:6px; border:1px solid rgba(56,189,248,0.4); background:rgba(2,132,199,0.25); color:#38bdf8; cursor:pointer;">
              🎯 直达当前防线 (S${equipped})
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // 3. 难度模式选择栏
    const modeSelectorHtml = `
      <div style="grid-column: 1 / -1; margin-bottom: 8px;">
        <div style="display:flex; gap:8px; background:rgba(15,23,42,0.8); padding:4px; border-radius:10px; border:1px solid rgba(59,130,246,0.3);">
          <button class="mode-toggle-btn ${curMode === 'normal' ? 'active-normal' : ''}" data-action="switch-mode" data-mode="normal" style="flex:1;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:6px;${curMode === 'normal' ? 'background:linear-gradient(135deg,#0284c7,#38bdf8);color:#0f172a;box-shadow:0 0 12px rgba(56,189,248,0.4);' : 'background:transparent;color:#94a3b8;'}">
            <span>🛡️ 普通模式</span>
            <span style="font-size:10px;padding:1px 6px;border-radius:10px;background:${curMode === 'normal' ? 'rgba(15,23,42,0.2)' : 'rgba(51,65,85,0.5)'};">标准探索</span>
          </button>
          <button class="mode-toggle-btn ${curMode === 'elite' ? 'active-elite' : ''}" data-action="switch-mode" data-mode="elite" style="flex:1;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:6px;${curMode === 'elite' ? 'background:linear-gradient(135deg,#e11d48,#f43f5e);color:#fff;box-shadow:0 0 14px rgba(244,63,94,0.5);' : 'background:transparent;color:#94a3b8;'}">
            <span>💀 精英模式</span>
            <span style="font-size:10px;padding:1px 6px;border-radius:10px;background:${curMode === 'elite' ? 'rgba(255,255,255,0.25)' : 'rgba(244,63,94,0.15)'};color:${curMode === 'elite' ? '#fff' : '#f43f5e'};">200% 战利品</span>
          </button>
        </div>
        <div style="font-size:11px;padding:6px 10px;border-radius:6px;margin-top:6px;border:1px solid ${curMode === 'elite' ? 'rgba(244,63,94,0.3);background:rgba(136,19,55,0.25);color:#fca5a5;' : 'rgba(56,189,248,0.2);background:rgba(12,74,110,0.2);color:#7dd3fc;'}">
          ${curMode === 'elite' ? '⚠️ <b>极度凶险战区</b>：感染者狂暴化（攻击力+85% · 生命+60% · 密度更高），所有专属技能芯片与战利品翻倍掉落！' : '🌿 <b>标准防线推进</b>：稳步歼灭轻度感染者，获取基础物资与技能合成碎片。'}
        </div>
      </div>
    `;

    // 4. 当前战区的关卡卡片
    const stagesHtml = chStages.map(st => {
      let isLocked = false;
      let lockReason = '';
      if (curMode === 'normal') {
        isLocked = st.id > unlocked;
        lockReason = '未解锁';
      } else {
        const isEliteUnlocked = saveManager.isEliteUnlocked(st.id);
        isLocked = !isEliteUnlocked;
        lockReason = `需先通关普通第${st.id}关`;
      }

      const isSelected = st.id === equipped;
      const isEliteCleared = curMode === 'elite' && saveManager.isEliteCleared(st.id);
      const isNormalCleared = (saveManager.getHighestStageCleared() || 0) >= st.id;
      const goal = st.endless ? '无尽尸潮极限模式' : `防守 ${st.clearWaves} 波次`;

      const lootBadges = (st.targetDrops || []).map(drop => `
        <span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:2px 6px;border-radius:4px;background:${drop.highlight ? 'rgba(234,179,8,0.2)' : 'rgba(30,41,59,0.8)'};border:1px solid ${drop.highlight ? '#eab308' : 'rgba(71,85,105,0.5)'};color:${drop.highlight ? '#fde047' : '#cbd5e1'};">
          ${this.formatItemIcon(drop.icon, drop.name, 'mat-req-icon-img')}
          <span>${drop.name}</span>
        </span>
      `).join('');

      let bossBadge = '';
      if (st.isChapterBoss) {
        bossBadge = '<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:linear-gradient(135deg,#e11d48,#be123c);color:#fff;font-weight:900;letter-spacing:0.5px;box-shadow:0 0 8px rgba(225,29,72,0.6);">👑 战区霸主</span>';
      } else if (st.isMiniBoss) {
        bossBadge = '<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(249,115,22,0.2);color:#fb923c;border:1px solid rgba(249,115,22,0.5);font-weight:800;">💀 中阶首领</span>';
      }

      return `
        <div class="stage-flow-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''} ${curMode === 'elite' ? 'elite-stage-card' : ''} ${st.isChapterBoss ? 'chapter-boss-card' : ''}" data-stage-id="${st.id}" style="${curMode === 'elite' && !isLocked ? 'border-color:rgba(244,63,94,0.4);background:linear-gradient(135deg, rgba(30,10,20,0.8), rgba(15,23,42,0.9));' : ''}">
          <div class="stage-flow-left" style="flex:1;">
            <div class="stage-flow-badge" style="${curMode === 'elite' ? 'background:linear-gradient(135deg,#e11d48,#be123c);color:#fff;' : (st.isChapterBoss ? 'background:linear-gradient(135deg,#eab308,#f59e0b);color:#0f172a;' : '')}">${st.id}</div>
            <div style="flex:1;">
              <div class="stage-flow-title" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span style="font-weight:800;">${st.name}</span>
                ${bossBadge}
                ${curMode === 'elite' ? '<span style="font-size:10px;color:#f43f5e;font-weight:900;background:rgba(244,63,94,0.15);padding:1px 4px;border-radius:4px;">ELITE</span>' : ''}
                ${isEliteCleared ? '<span style="font-size:10px;color:#22c55e;">★已通关</span>' : (isNormalCleared && curMode === 'normal' ? '<span style="font-size:10px;color:#38bdf8;">✓ 已通关</span>' : '')}
                ${isLocked ? '🔒' : ''}
              </div>
              <div class="stage-flow-sub" style="margin-top:2px;">${goal} · 难度系数 x${(st.difficulty * (curMode === 'elite' ? 1.6 : 1.0)).toFixed(2)}</div>
              <div style="font-size:10px;color:#64748b;margin-top:2px;">${st.desc || ''}</div>
              <!-- 定向掉落物预览 -->
              <div style="margin-top:6px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
                <span style="font-size:10px;color:#94a3b8;font-weight:bold;">特色产出:</span>
                ${lootBadges}
              </div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:center;margin-left:8px;gap:6px;">
            ${!isLocked ? `
              <button class="stage-flow-btn" data-action="pick-stage" data-id="${st.id}" style="${curMode === 'elite' ? 'background:linear-gradient(135deg,#e11d48,#f43f5e);border-color:#fb7185;color:#fff;' : (st.isChapterBoss ? 'background:linear-gradient(135deg,#d97706,#f59e0b);border-color:#fde047;color:#0f172a;font-weight:900;' : '')}">
                ${isSelected ? (curMode === 'elite' ? '出击精英' : '出击此关') : '选定此关'}
              </button>
              ${((curMode === 'normal' && isNormalCleared) || (curMode === 'elite' && isEliteCleared)) ? `
                <button class="stage-sweep-btn ${curMode === 'elite' ? 'elite-sweep-btn' : ''}" data-action="sweep-stage" data-id="${st.id}" data-mode="${curMode}" title="快速消耗5点体能扫荡本关，瞬间获取对应物资掉落" style="padding:4px 10px;font-size:11px;font-weight:900;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:4px;border:1px solid ${curMode === 'elite' ? '#f43f5e' : '#38bdf8'};background:${curMode === 'elite' ? 'rgba(244,63,94,0.2)' : 'rgba(56,189,248,0.2)'};color:${curMode === 'elite' ? '#fecdd3' : '#bae6fd'};">
                  ⚡ ${curMode === 'elite' ? '精英扫荡' : '极速扫荡'}
                </button>
              ` : ''}
            ` : `<span style="font-size:11px;color:#ef4444;background:rgba(239,68,68,0.15);padding:3px 6px;border-radius:4px;">${lockReason}</span>`}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = chapterTabsHtml + chapterBannerHtml + modeSelectorHtml + stagesHtml;

    // 战区切换
    container.querySelectorAll('[data-action="switch-chapter"]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this.selectedChapter = parseInt(btn.dataset.chapterId, 10);
        this.renderTrials();
      };
    });

    // 直达当前防线
    const jumpBtn = container.querySelector('[data-action="jump-current"]');
    if (jumpBtn) {
      jumpBtn.onclick = (e) => {
        e.stopPropagation();
        this.selectedChapter = equippedChapter;
        this.renderTrials();
      };
    }

    // 模式切换
    container.querySelectorAll('[data-action="switch-mode"]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const mode = btn.dataset.mode;
        saveManager.setMode(mode);
        this.renderTrials();
      };
    });

    // 出击与选定
    container.querySelectorAll('[data-action="pick-stage"]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        saveManager.setEquippedStage(id);
        this.launchBattle(id);
      };
    });

    // 关卡扫荡
    container.querySelectorAll('[data-action="sweep-stage"]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        const mode = btn.dataset.mode || 'normal';
        this.handleSweepStage(id, mode);
      };
    });

    container.querySelectorAll('.stage-flow-card:not(.locked)').forEach(card => {
      card.onclick = () => {
        const id = parseInt(card.dataset.stageId, 10);
        saveManager.setEquippedStage(id);
        this.render();
      };
    });
  }

  // 扫荡已通关的关卡
  handleSweepStage(stageId, mode = 'normal') {
    const energy = saveManager.getEnergy();
    if (energy < 5) {
      alert('作战体能不足（扫荡需要 5 点能量）！请等待恢复或稍后再试。');
      return;
    }

    const res = saveManager.sweepStage(stageId, mode);
    if (!res.success) {
      alert(res.message || '扫荡失败！');
      return;
    }

    // 刷新大厅顶栏能量/货币与试炼界面
    this.renderHeader();
    this.renderTrials();

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

    // 金币
    lootCards.push(`
      <div class="sweep-loot-card">
        <span style="font-size:24px;">💰</span>
        <div>
          <div style="font-size:11px;color:#94a3b8;">废料金币</div>
          <div style="font-size:15px;font-weight:900;color:#facc15;">+${res.scrapEarned}</div>
        </div>
      </div>
    `);

    // 军工芯片
    if (res.gemsEarned > 0) {
      lootCards.push(`
        <div class="sweep-loot-card">
          <span style="font-size:24px;">💎</span>
          <div>
            <div style="font-size:11px;color:#94a3b8;">军工核心晶石</div>
            <div style="font-size:15px;font-weight:900;color:#38bdf8;">+${res.gemsEarned}</div>
          </div>
        </div>
      `);
    }

    // 定向技能芯片
    if (res.chipsAwarded > 0 && res.targetChipItem) {
      lootCards.push(`
        <div class="sweep-loot-card">
          <span style="font-size:24px;">🧩</span>
          <div>
            <div style="font-size:11px;color:#94a3b8;">${res.targetChipItem.name}</div>
            <div style="font-size:15px;font-weight:900;color:#c084fc;">+${res.chipsAwarded} 碎片</div>
          </div>
        </div>
      `);
    }

    // 基础枪械碎片
    if (res.regularShards > 0) {
      lootCards.push(`
        <div class="sweep-loot-card">
          <span style="font-size:24px;">🔧</span>
          <div>
            <div style="font-size:11px;color:#94a3b8;">基础枪械强化碎片</div>
            <div style="font-size:15px;font-weight:900;color:#fb923c;">+${res.regularShards} 碎片</div>
          </div>
        </div>
      `);
    }

    // 稀有军工枪械核心（精英专属）
    if (res.rareShards > 0) {
      lootCards.push(`
        <div class="sweep-loot-card rare-highlight">
          <span style="font-size:26px;">👑</span>
          <div style="flex:1;">
            <div style="font-size:11px;color:#f43f5e;font-weight:900;display:flex;align-items:center;gap:4px;">
              <span>💎 稀有军工枪械核心</span>
              <span style="background:rgba(244,63,94,0.25);border:1px solid #f43f5e;font-size:9px;padding:1px 5px;border-radius:4px;color:#fff;">精英战区专属特产</span>
            </div>
            <div style="font-size:15px;font-weight:900;color:#fda4af;">+${res.rareShards} 核心 (可用于突破强化 6~1000 级)</div>
          </div>
        </div>
      `);
    }

    // 指挥官经验
    lootCards.push(`
      <div class="sweep-loot-card">
        <span style="font-size:24px;">🎖️</span>
        <div>
          <div style="font-size:11px;color:#94a3b8;">指挥官经验</div>
          <div style="font-size:15px;font-weight:900;color:#4ade80;">+${res.expGained} EXP</div>
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
                第 ${stageId} 关 · ${isElite ? '💀 精英极限扫荡' : '🛡️ 战术极速扫荡'} 成功！
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
      alert('作战体能不足（需要 5 点能量）！请等待恢复或在背包中使用高能能量剂。');
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
    const equippedSkills = saveManager.getEquippedSkills();
    for (const id of ['rocket', 'truck', 'freeze']) {
      if (this.game.skills[id]) {
        this.game.skills[id].level = equippedSkills.includes(id) ? 1 : 0;
      }
    }
    if (this.game.feature?.skills) {
      for (const id of ['laser', 'tornado', 'boomerang', 'bomber']) {
        if (this.game.feature.skills[id]) {
          this.game.feature.skills[id].level = equippedSkills.includes(id) ? 1 : 0;
        }
      }
    }

    if (this.game.feature?.syncPet) {
      this.game.feature.syncPet();
    }
    this.game.isPaused = false;
  }
}

export const homeLobbyUI = new HomeLobbyUI();
