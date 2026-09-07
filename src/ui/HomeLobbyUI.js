// ---------------- 现代流行 H5 游戏首页大厅、五大管理与背包系统控制器 ----------------
import { saveManager } from '../systems/SaveManager.js';
import { GAME_CONFIG } from '../core/Config.js';
import { runeSystem, RUNE_CATALOG, getRuneUpgradeCost } from '../systems/RuneSystem.js';

export class HomeLobbyUI {
  constructor() {
    this.game = null;
    this.activeTab = 'lobby';
    this.runeFilter = 'all';
    this.backpackFilter = 'all';
    this.dom = {};
  }

  init(game) {
    this.game = game;
    window.homeLobbyUI = this;
    this.buildDOM();
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
            <span>🎖️</span>
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
            <span>⚡</span>
            <span id="lobby-energy">50/50</span>
          </div>
          <div class="lobby-pill scrap" title="工业废料">
            <span>🪙</span>
            <span id="lobby-scrap">0</span>
          </div>
          <div class="lobby-pill gems" title="高能晶核">
            <span>💎</span>
            <span id="lobby-gems">0</span>
          </div>
        </div>
      </header>

      <!-- 动态内容区 -->
      <main class="lobby-content-container">
        <!-- Tab 1: 首页大厅 (Lobby) -->
        <div class="lobby-tab-view active" id="view-lobby">
          <div class="lobby-power-banner">
            <span class="lobby-power-label">⚡ 综合战力评分</span>
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
              <div class="lobby-stage-info-desc" id="lobby-stage-desc">抵御 5 波尸潮 · 首通奖励 60 废料</div>
            </div>
            <button class="lobby-stage-change-btn" id="btn-switch-to-trials">切换关卡</button>
          </div>

          <div class="lobby-battle-cta-wrap">
            <button class="lobby-battle-btn" id="btn-lobby-battle">
              <span>⚔️</span>
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
            <div class="section-title">💠 符文矩阵工坊</div>
            <div class="section-subtitle">全方位永久提升枪械、防御与战术属性</div>
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
  }

  // 1. 首页大厅
  renderLobby() {
    const powerEl = document.getElementById('lobby-total-power');
    if (powerEl) powerEl.textContent = saveManager.calcCombatPower().toLocaleString();

    const petImg = document.getElementById('lobby-arena-pet-img');
    const selectedPetId = saveManager.getPetData().selected;
    if (petImg) {
      if (selectedPetId && GAME_CONFIG.pets.types[selectedPetId]) {
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
    if (nameEl) nameEl.textContent = `STAGE ${stage.id} · ${stage.name}`;
    if (descEl) descEl.textContent = stage.endless ? '无尽模式 · 极限生存挑战' : `通关波次 ${stage.clearWaves} · 难度 x${stage.difficulty}`;
  }

  // 2. 枪械管理 (专属零件 + 废料)
  renderWeapons() {
    const container = document.getElementById('weapons-list');
    if (!container) return;
    const weaponData = saveManager.getWeaponData();
    const equippedId = weaponData.equipped;

    container.innerHTML = Object.entries(GAME_CONFIG.weapons).map(([id, cfg]) => {
      const state = weaponData.weapons[id] || { unlocked: false, level: 1 };
      const isEquipped = id === equippedId;
      const partCost = 2 + (state.level - 1) * 2;
      const scrapCost = 60 + (state.level - 1) * 45;
      const unlockCost = state.unlockCost || 150;
      const damage = Math.round(cfg.baseStats.damage + (state.level - 1) * cfg.growth.damagePerLevel);
      const fireInterval = (cfg.baseStats.fireInterval * (cfg.growth.fireRatePerLevel ? Math.pow(0.98, state.level - 1) : 1)).toFixed(2);

      const partItem = GAME_CONFIG.items[cfg.materialId] || { name: '专属零件', icon: '🔩' };
      const heldParts = saveManager.getItemCount(cfg.materialId);
      const canAffordParts = heldParts >= partCost;
      const canAffordScrap = saveManager.getScrap() >= scrapCost;
      const canUpgrade = state.unlocked && canAffordParts && canAffordScrap;

      return `
        <div class="weapon-card ${isEquipped ? 'equipped' : ''}">
          <div class="weapon-card-header">
            <div class="weapon-card-title">
              <div class="weapon-icon-circle">${cfg.icon}</div>
              <div class="weapon-name-wrap">
                <b>${cfg.name}</b>
                <span class="weapon-tag">${cfg.tag}</span>
                <div style="font-size:11px;color:#facc15;font-weight:800;margin-top:2px;">Lv.${state.level}</div>
              </div>
            </div>
            ${isEquipped ? '<span style="color:#38bdf8;font-size:11px;font-weight:800;">✓ 已装备</span>' : ''}
          </div>

          <div class="weapon-desc">${cfg.desc}</div>

          <div class="weapon-stats-grid">
            <div class="weapon-stat-item">
              <span class="weapon-stat-label">基础威力</span>
              <span class="weapon-stat-val">${damage}</span>
            </div>
            <div class="weapon-stat-item">
              <span class="weapon-stat-label">射击间隔</span>
              <span class="weapon-stat-val">${fireInterval}s</span>
            </div>
            <div class="weapon-stat-item">
              <span class="weapon-stat-label">穿透/弹道</span>
              <span class="weapon-stat-val">${cfg.baseStats.pierce}穿 / ${cfg.baseStats.multishot}弹</span>
            </div>
          </div>

          ${state.unlocked ? `
            <div class="mat-req-box">
              <div class="mat-req-left">
                <span>${partItem.icon}</span>
                <span>${partItem.name}</span>
              </div>
              <div class="mat-req-status ${canAffordParts ? 'met' : 'unmet'}">
                ${heldParts}/${partCost} ${canAffordParts ? '✓' : '✕ (缺少)'}
              </div>
            </div>
          ` : ''}

          <div class="weapon-actions">
            ${state.unlocked ? `
              <button class="weapon-btn upgrade" data-action="upgrade-weapon" data-id="${id}" data-scost="${scrapCost}" data-pcost="${partCost}" ${!canUpgrade ? 'disabled' : ''}>
                🪙 ${scrapCost} 强化
              </button>
              <button class="weapon-btn primary" data-action="equip-weapon" data-id="${id}" ${isEquipped ? 'disabled' : ''}>
                ${isEquipped ? '已出战' : '装备此枪'}
              </button>
            ` : `
              <button class="weapon-btn primary" data-action="unlock-weapon" data-id="${id}" data-cost="${unlockCost}" ${saveManager.getGems() < unlockCost ? 'disabled' : ''} style="background:#9333ea;border-color:#c084fc;">
                💎 ${unlockCost} 晶核解锁
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
    container.innerHTML = GAME_CONFIG.skillCatalog.map(sk => {
      const level = skillData.levels[sk.id] || 1;
      const chipCost = 2 + Math.floor((level - 1) / 2);
      const scrapCost = 50 + (level - 1) * 35;
      const chipItem = GAME_CONFIG.items[sk.materialId] || { name: '战术芯片', icon: '💾' };
      const heldChips = saveManager.getItemCount(sk.materialId);
      const canAffordChips = heldChips >= chipCost;
      const canAffordScrap = saveManager.getScrap() >= scrapCost;
      const canUpgrade = canAffordChips && canAffordScrap;

      return `
        <div class="skill-catalog-card">
          <img class="skill-catalog-img" src="${sk.asset}" alt="${sk.name}">
          <div class="skill-catalog-info">
            <div class="skill-catalog-header">
              <span class="skill-catalog-name">${sk.name}</span>
              <span class="skill-catalog-type">${sk.type}</span>
            </div>
            <div class="skill-catalog-desc">${sk.desc}</div>
            <div class="skill-catalog-meta">
              <span>基础冷却: ${sk.cooldown}s</span>
              <span style="color:#facc15;">专精等级: Lv.${level}</span>
            </div>

            <div class="mat-req-box" style="margin-top:6px;">
              <div class="mat-req-left">
                <span>${chipItem.icon}</span>
                <span>${chipItem.name}</span>
              </div>
              <div class="mat-req-status ${canAffordChips ? 'met' : 'unmet'}">
                ${heldChips}/${chipCost} ${canAffordChips ? '✓' : '✕'}
              </div>
            </div>

            <div style="margin-top:6px;">
              <button class="weapon-btn upgrade" data-action="upgrade-skill" data-id="${sk.id}" data-scost="${scrapCost}" data-ccost="${chipCost}" style="padding:6px 12px;font-size:11px;" ${!canUpgrade ? 'disabled' : ''}>
                🪙 ${scrapCost} 专精升级
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

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
          <div class="item-slot-icon">${item.icon}</div>
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
    if (item.targetType === 'weapon') {
      actionButtonHtml = `<button class="weapon-btn primary" id="btn-modal-action">前往改装枪械</button>`;
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
              <span>${item.icon}</span>
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
        if (item.targetType === 'weapon') {
          this.switchTab('weapons');
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
          <div style="font-size:13px;color:#facc15;font-weight:800;">🪙 额外获得废料 +${res.scrap}</div>

          <div class="crate-reward-items-grid">
            ${res.items.map(it => {
              const cfg = GAME_CONFIG.items[it.id] || { name: '物资', icon: '📦' };
              return `
                <div class="crate-reward-item">
                  <span class="crate-reward-item-icon">${cfg.icon}</span>
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

      const shardItem = GAME_CONFIG.items[cfg.materialId] || { name: '基因碎片', icon: '🧬' };
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
                <span>${shardItem.icon}</span>
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
                🪙 ${scrapCost} 升级
              </button>
              <button class="weapon-btn primary" data-action="deploy-pet" data-id="${id}" ${isDeployed ? 'disabled' : ''}>
                ${isDeployed ? '已出战' : '选此出战'}
              </button>
            ` : `
              <button class="weapon-btn primary" data-action="unlock-pet" data-id="${id}" data-cost="${unlockCost}" ${saveManager.getGems() < unlockCost ? 'disabled' : ''} style="background:#9333ea;border-color:#c084fc;">
                💎 ${unlockCost} 晶核召唤
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

  // 6. 符文管理
  renderRunes() {
    const container = document.getElementById('runes-list');
    if (!container) return;
    runeSystem.reload();

    const filtered = RUNE_CATALOG.filter(r => this.runeFilter === 'all' || r.category === this.runeFilter);

    container.innerHTML = filtered.map(rune => {
      const level = runeSystem.getLevel(rune.id);
      const isMax = level >= rune.maxLevel;
      const cost = isMax ? 0 : getRuneUpgradeCost(rune, level);
      const canAfford = saveManager.getScrap() >= cost && !isMax;

      return `
        <div class="rune-item-card">
          <div class="rune-item-left">
            <div class="rune-item-icon">${rune.icon}</div>
            <div>
              <div class="rune-item-name">${rune.name} <span style="font-size:11px;color:#38bdf8;">Lv.${level}/${rune.maxLevel}</span></div>
              <div class="rune-item-desc">${rune.desc}</div>
            </div>
          </div>
          <button class="rune-item-btn" data-action="upgrade-rune" data-id="${rune.id}" ${!canAfford ? 'disabled' : ''}>
            ${isMax ? '已满级' : `🪙 ${cost} 强化`}
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

  // 7. 试炼之路
  renderTrials() {
    const container = document.getElementById('stages-list');
    if (!container) return;
    const unlocked = saveManager.getUnlockedStage();
    const equipped = saveManager.getEquippedStage();

    container.innerHTML = GAME_CONFIG.stages.map(st => {
      const isLocked = st.id > unlocked;
      const isSelected = st.id === equipped;
      const goal = st.endless ? '无尽尸潮模式' : `通关目标 ${st.clearWaves} 波次`;

      return `
        <div class="stage-flow-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}" data-stage-id="${st.id}">
          <div class="stage-flow-left">
            <div class="stage-flow-badge">${st.id}</div>
            <div>
              <div class="stage-flow-title">${st.name} ${isLocked ? '🔒' : ''}</div>
              <div class="stage-flow-sub">${goal} · 难度 x${st.difficulty}</div>
              <div style="font-size:10px;color:#64748b;margin-top:2px;">${st.desc || ''}</div>
            </div>
          </div>
          ${!isLocked ? `
            <button class="stage-flow-btn" data-action="pick-stage" data-id="${st.id}">
              ${isSelected ? '出击此关' : '选定此关'}
            </button>
          ` : '<span style="font-size:11px;color:#64748b;">未解锁</span>'}
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-action="pick-stage"]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        saveManager.setEquippedStage(id);
        this.launchBattle(id);
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

  // 发起战斗
  launchBattle(stageId) {
    if (!saveManager.useEnergy(5)) {
      alert('作战体能不足（需要 5 点能量）！请等待恢复或在背包中使用高能能量剂。');
      return;
    }
    this.hide();

    // 应用装备的枪械与强化等级属性
    const equippedWeaponId = saveManager.getEquippedWeapon();
    const weaponConfig = GAME_CONFIG.weapons[equippedWeaponId] || GAME_CONFIG.weapons.assault;
    const weaponLevel = saveManager.getWeaponData().weapons[equippedWeaponId]?.level || 1;

    this.game.weapon = {
      ...GAME_CONFIG.weapon,
      damage: Math.round(weaponConfig.baseStats.damage + (weaponLevel - 1) * weaponConfig.growth.damagePerLevel),
      bulletSpeed: weaponConfig.baseStats.bulletSpeed,
      pierceCount: weaponConfig.baseStats.pierce,
      multishot: weaponConfig.baseStats.multishot,
      critChance: weaponConfig.baseStats.critChance + (weaponLevel - 1) * (weaponConfig.growth.critPerLevel || 0)
    };
    this.game.hero.baseAttackInterval = weaponConfig.baseStats.fireInterval;

    // 应用关卡与开战
    this.game.startStage(stageId);
    if (this.game.feature?.syncPet) {
      this.game.feature.syncPet();
    }
    this.game.isPaused = false;
  }
}

export const homeLobbyUI = new HomeLobbyUI();
