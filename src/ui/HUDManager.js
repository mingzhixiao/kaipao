import { buildUpgradeCardPool } from '../combat/SkillDeck.js';
import { sound } from '../systems/SoundEngine.js';
import * as StageUI from '../systems/StageUI.js';
import { gameEvents } from '../core/GameEventBus.js';
import { uiStack } from './UIStack.js';
import { focusManager } from './FocusManager.js';
import { tr } from '../core/I18n.js';
import { GAME_CONFIG } from '../core/Config.js';

// ---------------- 高性能 事件驱动 HUD 与 UI 管理器 ----------------

export class HUDManager {
  constructor() {
    this.dom = {
      level: document.getElementById('hud-level'),
      wave: document.getElementById('hud-wave'),
      kills: document.getElementById('hud-kills'),
      scrap: document.getElementById('hud-scrap'),
      expFill: document.getElementById('exp-fill'),
      topHpCapsule: document.getElementById('top-hp-capsule'),
      topHpFill: document.getElementById('top-hp-fill'),
      topHpText: document.getElementById('top-hp-text'),
      topShieldCapsule: document.getElementById('top-shield-capsule'),
      topShieldFill: document.getElementById('top-shield-fill'),
      topShieldText: document.getElementById('top-shield-text'),
      topAmmoCapsule: document.getElementById('top-ammo-capsule'),
      topAmmoFill: document.getElementById('top-ammo-fill'),
      topAmmoText: document.getElementById('top-ammo-text'),
      bossEncounter: document.getElementById('boss-encounter-container'),
      bossWarningOverlay: document.getElementById('boss-warning-overlay'),
      bossHpGhost: document.getElementById('boss-hp-ghost'),
      bossHpFill: document.getElementById('boss-hp-fill'),
      bossHpText: document.getElementById('boss-hp-text'),
      emergencyOverlay: document.getElementById('emergency-overlay'),
      upgradeModal: document.getElementById('upgrade-modal'),
      cardsContainer: document.getElementById('cards-container'),
      btnReroll: document.getElementById('btn-reroll'),
      rerollCount: document.getElementById('reroll-count'),
      gameoverModal: document.getElementById('gameover-modal'),
      retreatConfirmModal: document.getElementById('retreat-confirm-modal'),
      btnRetreatCancel: document.getElementById('btn-retreat-cancel'),
      btnRetreatConfirm: document.getElementById('btn-retreat-confirm'),
      reportTitle: document.getElementById('gameover-title'),
      reportSubtitle: document.getElementById('gameover-subtitle'),
      resWave: document.getElementById('res-wave'),
      resKills: document.getElementById('res-kills'),
      resTime: document.getElementById('res-time'),
      resLevel: document.getElementById('res-level'),
      resBest: document.getElementById('res-best'),
      btnRestart: document.getElementById('btn-restart'),
      btnExitBattle: document.getElementById('btn-exit-battle'),
      btnSpeed: document.getElementById('btn-speed'),
      btnSound: document.getElementById('btn-sound'),
      btnPause: document.getElementById('btn-pause'),
      settingsToggle: document.getElementById('btn-settings-toggle'),
      settingsMenu: document.getElementById('settings-dropdown-menu'),
      settingsClose: document.getElementById('btn-settings-close'),
      skills: {
        rocket: { slot: document.getElementById('slot-skill-a'), mask: document.getElementById('mask-skill-a'), lvl: document.getElementById('lvl-skill-a') },
        truck: { slot: document.getElementById('slot-skill-b'), mask: document.getElementById('mask-skill-b'), lvl: document.getElementById('lvl-skill-b') },
        freeze: { slot: document.getElementById('slot-skill-c'), mask: document.getElementById('mask-skill-c'), lvl: document.getElementById('lvl-skill-c') }
      }
    };
    this.cache = {
      level: -1, wave: -1, stageId: -1, kills: -1, scrap: -1, expRatio: -1,
      hpRatio: -1, hpText: '', criticalHp: false, shieldRatio: -1, shieldText: '',
      bossVisible: false, bossHpRatio: -1, emergencyActive: false,
      skills: {
        rocket: { level: -1, cdPercent: -1 },
        truck: { level: -1, cdPercent: -1 },
        freeze: { level: -1, cdPercent: -1 }
      }
    };
    this._animHpRaf = null;
    this._animShieldRaf = null;
    this.isApplyingUpgrade = false;

    // 订阅全局事件总线 (Event-Driven HUD)
    this.initEventSubscriptions();
  }

  initEventSubscriptions() {
    gameEvents.on('health_changed', ({ hp, maxHp }) => {
      const hpPct = Math.max(0, Math.round((hp / maxHp) * 100));
      const formatted = `${Math.ceil(hp)} (${hpPct}%)`;
      if (this.dom.topHpText) this.dom.topHpText.textContent = formatted;
      this.updateHealthBar(hpPct);
      const isCritical = hpPct < 30 && hp > 0;
      if (this.dom.emergencyOverlay) this.dom.emergencyOverlay.classList.toggle('active', isCritical);
    });

    gameEvents.on('shield_changed', ({ shield, maxShield }) => {
      const shPct = Math.max(0, Math.round((shield / maxShield) * 100));
      const formatted = `${Math.ceil(shield)} (${shPct}%)`;
      if (this.dom.topShieldText) this.dom.topShieldText.textContent = formatted;
      this.updateShieldBar(shPct);
    });

    gameEvents.on('exp_changed', ({ exp, expNeeded, level }) => {
      const expRatio = Math.min(100, Math.round((exp / expNeeded) * 100));
      if (this.dom.expFill) this.dom.expFill.style.width = expRatio + '%';
      if (this.dom.level) this.dom.level.textContent = level;
    });

    gameEvents.on('wave_changed', ({ wave, stageId }) => {
      if (this.dom.wave) {
        const st = stageId ? `S${stageId}-` : '';
        this.dom.wave.textContent = `${st}${wave}`;
      }
    });

    gameEvents.on('kill_changed', ({ kills }) => {
      if (this.dom.kills) this.dom.kills.textContent = kills;
    });

    gameEvents.on('scrap_changed', ({ scrap }) => {
      if (this.dom.scrap) this.dom.scrap.textContent = scrap;
    });

    // 监听资源掉落飞入动效
    gameEvents.on('scrap_gained', ({ amount, x, y }) => {
      this.spawnFloatingText(x, y, amount);
    });

    // 监听枪械弹匣与换弹状态 (Event-Driven Ammo HUD)
    gameEvents.on('ammo_changed', ({ ammo, maxAmmo, isReloading, progress, remainingTime }) => {
      if (this.dom.topAmmoText) {
        if (isReloading) {
          const secs = remainingTime > 0 ? `${remainingTime.toFixed(1)}s` : '';
          this.dom.topAmmoText.textContent = `🔄 换弹中 ${secs}`;
        } else {
          this.dom.topAmmoText.textContent = `${ammo}/${maxAmmo}`;
        }
      }
      if (this.dom.topAmmoFill) {
        const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
        this.dom.topAmmoFill.style.width = pct + '%';
        this.dom.topAmmoFill.classList.toggle('reloading', !!isReloading);
      }
    });
  }

  /**
   * 顶部城防核心装甲血条缓动更新与三段色彩驱动
   * >60% 绿色活力，30%-60% 黄色警示，<30% 红色危险并呼吸闪烁
   */
  updateHealthBar(hpPct) {
    const fill = this.dom.topHpFill;
    const capsule = this.dom.topHpCapsule;
    const target = Math.max(0, Math.min(100, hpPct));

    if (fill) {
      if (this._animHpRaf) cancelAnimationFrame(this._animHpRaf);
      let curr = parseFloat(fill.style.width);
      if (isNaN(curr)) curr = target;
      const step = () => {
        const diff = target - curr;
        if (Math.abs(diff) < 0.4) {
          fill.style.width = target + '%';
          return;
        }
        curr += diff * 0.15;
        fill.style.width = curr + '%';
        this._animHpRaf = requestAnimationFrame(step);
      };
      step();
    }

    if (capsule) {
      capsule.classList.remove('hp-high', 'hp-mid', 'hp-low', 'critical');
      if (target > 60) {
        capsule.classList.add('hp-high');
      } else if (target >= 30) {
        capsule.classList.add('hp-mid');
      } else {
        capsule.classList.add('hp-low', 'critical');
      }
    }
  }

  /**
   * 顶部能量护盾进度条缓动更新
   */
  updateShieldBar(shPct) {
    const fill = this.dom.topShieldFill;
    const target = Math.max(0, Math.min(100, shPct));
    if (fill) {
      if (this._animShieldRaf) cancelAnimationFrame(this._animShieldRaf);
      let curr = parseFloat(fill.style.width);
      if (isNaN(curr)) curr = target;
      const step = () => {
        const diff = target - curr;
        if (Math.abs(diff) < 0.4) {
          fill.style.width = target + '%';
          return;
        }
        curr += diff * 0.15;
        fill.style.width = curr + '%';
        this._animShieldRaf = requestAnimationFrame(step);
      };
      step();
    }
  }

  /**
   * 击杀掉落晶核/金币飘字飞入顶部资源栏反馈
   */
  spawnFloatingText(x, y, amount) {
    if (!amount) return;
    const canvas = document.getElementById('gameCanvas');
    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;
    if (canvas && typeof x === 'number' && typeof y === 'number') {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / (canvas.width || rect.width);
      const scaleY = rect.height / (canvas.height || rect.height);
      clientX = rect.left + x * scaleX;
      clientY = rect.top + y * scaleY;
    }

    const el = document.createElement('div');
    el.className = 'floating-scrap-text';
    el.innerHTML = `+${amount} <img class="ui-icon-inline" src="assets/icons/icon_coin.png" style="width:16px;height:16px;vertical-align:-2px;">`;
    el.style.left = `${clientX}px`;
    el.style.top = `${clientY}px`;
    el.style.transform = 'translate(-50%, -50%) scale(0.65)';
    el.style.opacity = '1';
    document.body.appendChild(el);

    // 向上跃起放大
    requestAnimationFrame(() => {
      el.style.transform = 'translate(-50%, -45px) scale(1.22)';
    });

    // 飞向顶部金币图标
    setTimeout(() => {
      const scrapIcon = this.dom.scrap || document.getElementById('hud-scrap');
      if (scrapIcon) {
        const targetRect = scrapIcon.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;
        const dx = tx - clientX;
        const dy = ty - (clientY - 45);
        el.style.transform = `translate(${dx}px, ${dy}px) scale(0.65)`;
        el.style.opacity = '0.25';
      } else {
        el.style.opacity = '0';
      }
    }, 320);

    setTimeout(() => {
      if (el.parentNode) el.remove();
      const scrapBadge = document.querySelector('.core-resource-badge');
      if (scrapBadge) {
        scrapBadge.style.transition = 'transform 0.12s ease';
        scrapBadge.style.transform = 'scale(1.22)';
        setTimeout(() => { scrapBadge.style.transform = ''; }, 140);
      }
    }, 820);
  }

  updateHUD(game) {
    if (this.cache.level !== game.hero.level) {
      this.cache.level = game.hero.level;
      if (this.dom.level) this.dom.level.textContent = game.hero.level;
    }
    if (this.cache.wave !== game.wave || this.cache.stageId !== game.stageId) {
      this.cache.wave = game.wave;
      this.cache.stageId = game.stageId;
      if (this.dom.wave) {
        const st = game.stageId ? `S${game.stageId}-` : '';
        this.dom.wave.textContent = `${st}${game.wave}`;
      }
    }
    if (this.cache.kills !== game.kills) {
      this.cache.kills = game.kills;
      if (this.dom.kills) this.dom.kills.textContent = game.kills;
    }
    const scrapVal = Number(game.scrap ?? game.feature?.account?.scrap ?? 0);
    if (this.cache.scrap !== scrapVal) {
      this.cache.scrap = scrapVal;
      if (this.dom.scrap) this.dom.scrap.textContent = scrapVal;
    }
    const expRatio = Math.min(100, Math.round((game.hero.exp / game.hero.expNeeded) * 100));
    if (this.cache.expRatio !== expRatio) {
      this.cache.expRatio = expRatio;
      if (this.dom.expFill) this.dom.expFill.style.width = expRatio + '%';
    }
    const hpRatio = Math.max(0, game.fortress.hp / game.fortress.maxHp);
    const hpPct = Math.round(hpRatio * 100);
    const hpText = `${Math.ceil(game.fortress.hp)} (${hpPct}%)`;
    if (this.cache.hpText !== hpText) {
      this.cache.hpText = hpText;
      if (this.dom.topHpText) this.dom.topHpText.textContent = hpText;
      this.updateHealthBar(hpPct);
    }
    const isCritical = hpPct < 30 && game.fortress.hp > 0;
    if (this.cache.criticalHp !== isCritical) {
      this.cache.criticalHp = isCritical;
      if (this.dom.emergencyOverlay) this.dom.emergencyOverlay.classList.toggle('active', isCritical);
    }
    const shieldRatio = Math.max(0, game.fortress.shield / game.fortress.maxShield);
    const shPct = Math.round(shieldRatio * 100);
    const shText = `${Math.ceil(game.fortress.shield)} (${shPct}%)`;
    if (this.cache.shieldText !== shText) {
      this.cache.shieldText = shText;
      if (this.dom.topShieldText) this.dom.topShieldText.textContent = shText;
      this.updateShieldBar(shPct);
    }
    const boss = game.activeBoss;
    const bossVisible = !!(boss && boss.active);
    if (this.cache.bossVisible !== bossVisible) {
      this.cache.bossVisible = bossVisible;
      const bContainer = this.dom.bossEncounter || this.dom.bossHud;
      if (bContainer) bContainer.style.display = bossVisible ? 'flex' : 'none';
      if (this.dom.bossWarningOverlay) this.dom.bossWarningOverlay.style.display = bossVisible ? 'block' : 'none';
    }
    if (bossVisible) {
      const bhp = Math.max(0, Math.min(100, Math.round((boss.hp / boss.maxHp) * 100)));
      const bShield = Math.ceil(boss.shield || 0);
      if (this.cache.bossHpRatio !== bhp || this.cache.bossShield !== bShield) {
        this.cache.bossHpRatio = bhp;
        this.cache.bossShield = bShield;
        if (this.dom.bossHpFill) this.dom.bossHpFill.style.width = bhp + '%';
        if (this.dom.bossHpGhost) {
          setTimeout(() => {
            if (this.dom.bossHpGhost) this.dom.bossHpGhost.style.width = bhp + '%';
          }, 240);
        }
        const shieldStr = bShield > 0 ? ` · 🛡️ 护盾 ${bShield}` : '';
        if (this.dom.bossHpText) this.dom.bossHpText.textContent = `${bhp}% (${Math.ceil(boss.hp)}/${boss.maxHp})${shieldStr}`;
      }
    }
  }

  updateSkillHUD(game) {
    const map = { rocket: 'rocket', truck: 'truck', freeze: 'freeze' };
    for (const key of Object.keys(map)) {
      const skill = game.skills[key];
      const slotDom = this.dom.skills[key];
      if (!slotDom || !skill) continue;
      if (this.cache.skills[key].level !== skill.level) {
        this.cache.skills[key].level = skill.level;
        if (slotDom.lvl) slotDom.lvl.textContent = skill.level > 0 ? skill.level : '';
        if (slotDom.slot) {
          if (skill.level > 0) slotDom.slot.classList.add('unlocked');
          else slotDom.slot.classList.remove('unlocked');
        }
      }
      let cdPercent = 0;
      if (skill.level > 0 && skill.cooldown > 0) {
        cdPercent = Math.max(0, Math.min(100, 100 - (skill.timer / skill.cooldown) * 100));
        if (key === 'freeze' && skill.activeTimer > 0) cdPercent = 0;
      }
      cdPercent = Math.round(cdPercent);
      if (this.cache.skills[key].cdPercent !== cdPercent) {
        this.cache.skills[key].cdPercent = cdPercent;
        if (slotDom.mask) slotDom.mask.style.height = (skill.level > 0 ? cdPercent : 100) + '%';
      }
    }
  }

  showLevelUpModal(game, onComplete = null) {
    this.onUpgradeComplete = onComplete;
    game.isUpgrading = true;
    game.rerollAvailable = 1;
    sound.playLevelUp();
    if (this.dom.btnReroll && this.dom.rerollCount) {
      this.dom.rerollCount.textContent = '1';
      this.dom.btnReroll.disabled = false;
    }
    this.renderUpgradeCards(game);
    uiStack.push({
      id: 'upgrade_modal',
      element: this.dom.upgradeModal,
      pauseGame: true,
      onOpen: () => focusManager.setupUpgradeCardFocus(),
      onClose: () => {
        this.clearAutoSelectTimer();
        game.isUpgrading = false;
      }
    });
    this.startAutoSelectCountdown(game);
  }

  startAutoSelectCountdown(game) {
    this.clearAutoSelectTimer();
    this.autoSelectRemaining = 5;
    this.updateAutoSelectBadge();

    this.autoSelectTimer = setInterval(() => {
      this.autoSelectRemaining--;
      this.updateAutoSelectBadge();
      if (this.autoSelectRemaining <= 0) {
        this.clearAutoSelectTimer();
        this.triggerAutoSelect(game);
      }
    }, 1000);
  }

  clearAutoSelectTimer() {
    if (this.autoSelectTimer) {
      clearInterval(this.autoSelectTimer);
      this.autoSelectTimer = null;
    }
    const badge = document.getElementById('upgrade-auto-badge');
    if (badge) badge.style.display = 'none';
  }

  updateAutoSelectBadge() {
    let badge = document.getElementById('upgrade-auto-badge');
    if (!badge && this.dom.upgradeModal) {
      const titleBox = this.dom.upgradeModal.querySelector('.modal-title-box');
      if (titleBox) {
        badge = document.createElement('div');
        badge.id = 'upgrade-auto-badge';
        badge.style.cssText = 'display:inline-flex;flex-direction:column;align-items:center;gap:4px;margin-top:8px;padding:6px 18px;border-radius:12px;background:rgba(239,68,68,0.18);border:1.5px solid rgba(248,113,113,0.75);color:#fca5a5;font-size:12px;font-weight:800;letter-spacing:0.5px;box-shadow:0 0 16px rgba(239,68,68,0.25);';
        titleBox.appendChild(badge);
      }
    }
    if (badge) {
      const pct = Math.max(0, (this.autoSelectRemaining / 5) * 100);
      badge.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;">
          <span>⏱️</span>
          <span><b style="color:#ffffff;font-size:15px;text-shadow:0 0 8px rgba(255,255,255,0.7);">${this.autoSelectRemaining}s</b> 后自动选取首选技能</span>
        </div>
        <div style="width:100%;min-width:140px;height:4px;background:rgba(255,255,255,0.16);border-radius:2px;overflow:hidden;margin-top:3px;">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, #f43f5e, #fbbf24);transition:width 0.95s linear;border-radius:2px;box-shadow:0 0 8px rgba(251,191,36,0.6);"></div>
        </div>
      `;
      badge.style.display = 'inline-flex';
    }
  }

  triggerAutoSelect(game) {
    if (!game.isUpgrading) return;
    if (this.currentUpgradeCards && this.currentUpgradeCards.length > 0) {
      this.applyUpgradeCard(this.currentUpgradeCards[0], game);
    }
  }

  applyUpgradeCard(card, game) {
    if (!card || !game || !game.isUpgrading || this.isApplyingUpgrade) return;
    this.clearAutoSelectTimer();
    this.isApplyingUpgrade = true;
    const cardElements = Array.from(this.dom.cardsContainer?.querySelectorAll('.upgrade-card') || []);
    cardElements.forEach(element => { element.disabled = true; });
    try {
      card.apply();
      uiStack.pop();
      game.isUpgrading = false;
      this.updateSkillHUD(game);
      if (typeof this.onUpgradeComplete === 'function') {
        const cb = this.onUpgradeComplete;
        this.onUpgradeComplete = null;
        cb();
      }
    } catch (error) {
      console.error('[HUDManager] 技能升级应用失败', error);
      cardElements.forEach(element => { element.disabled = false; });
      this.startAutoSelectCountdown(game);
    } finally {
      this.isApplyingUpgrade = false;
    }
  }

  rerollUpgradeCards(game) {
    if (game.rerollAvailable <= 0) return;
    game.rerollAvailable--;
    if (this.dom.btnReroll && this.dom.rerollCount) {
      this.dom.rerollCount.textContent = '0';
      this.dom.btnReroll.disabled = true;
    }
    sound.playGemPickup();
    this.renderUpgradeCards(game);
    this.startAutoSelectCountdown(game);
  }

  renderUpgradeCards(game) {
    game = game || window.gameInstance;
    if (!game) return;
    const pool = buildUpgradeCardPool(game);
    const availablePool = pool.filter(card => {
      if (card.id === 'thermal_engine' && game.synergies.thermalEngine) return false;
      if (card.id === 'tesla_coil' && game.synergies.teslaCoil) return false;
      if (card.id === 'fortress_emp' && game.synergies.fortressEmp) return false;
      if (card.id === 'truck_inferno' && game.synergies.truckInferno) return false;
      if (card.id === 'cryo_shatter' && game.synergies.cryoShatter) return false;
      return true;
    });
    const shuffled = availablePool.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);
    this.currentUpgradeCards = selected;
    const container = this.dom.cardsContainer;
    if (!container) return;
    container.innerHTML = '';
    selected.forEach(card => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `upgrade-card rarity-${card.rarity}`;
      el.setAttribute('aria-label', `${card.name}: ${card.desc}`);
      const elemTag = card.element ? `<span class="card-elem-pill elem-${card.element}">${card.element.toUpperCase()}</span>` : '';
      const synergyInfo = this.getCardSynergyInfo(game, card);
      const synergyPill = synergyInfo ? `<div class="card-synergy-pill ${synergyInfo.active ? 'active' : ''}">${synergyInfo.text}</div>` : '';

      el.innerHTML = `
        <img class="card-icon-img" src="${card.img}" alt="${card.name}">
        <div class="card-info">
          <div class="card-header-row">
            <div class="card-name">${card.name}</div>
            <div style="display:flex;gap:4px;align-items:center;">
              ${elemTag}
              <div class="card-tag">${(card.rarity || 'common').toUpperCase()}</div>
            </div>
          </div>
          <div class="card-synergy">${card.synergy}</div>
          <div class="card-desc">${card.desc}</div>
          ${synergyPill}
        </div>
      `;
      el.addEventListener('click', () => {
        this.applyUpgradeCard(card, game);
      });
      container.appendChild(el);
    });
    focusManager.setupUpgradeCardFocus();
  }

  /**
   * 辅助构筑决策：统计玩家当前流派的构筑数量
   */
  getCardSynergyInfo(game, card) {
    if (!card || !card.element) return null;
    const elem = card.element;
    let count = 0;
    let total = 3;
    let name = '';
    let icon = '🔥';

    if (elem === 'fire') {
      name = '火焰流派';
      icon = '🔥';
      total = 3;
      if (game.skills?.rocket?.level > 0) count++;
      if (game.feature?.skills?.bomber?.level > 0) count++;
      if (game.synergies?.truckInferno || game.synergies?.thermalEngine) count++;
    } else if (elem === 'ice') {
      name = '冰霜流派';
      icon = '❄️';
      total = 3;
      if (game.skills?.freeze?.level > 0) count++;
      if (game.synergies?.cryoShatter) count++;
      if (game.synergies?.thermalEngine) count++;
    } else if (elem === 'thunder') {
      name = '雷电感电';
      icon = '⚡';
      total = 3;
      if (game.feature?.skills?.laser?.level > 0) count++;
      if (game.synergies?.teslaCoil) count++;
      if (game.synergies?.fortressEmp) count++;
    } else if (elem === 'wind') {
      name = '风暴扩散';
      icon = '🌪️';
      total = 2;
      if (game.feature?.skills?.tornado?.level > 0) count++;
      if (game.feature?.skills?.boomerang?.level > 0) count++;
    } else if (elem === 'physical') {
      name = '重装碾压';
      icon = '🚚';
      total = 2;
      if (game.skills?.truck?.level > 0) count++;
      if (game.feature?.skills?.boomerang?.level > 0) count++;
    } else {
      return null;
    }

    return {
      icon,
      text: `${icon} ${name} ${count}/${total}`,
      active: count > 0
    };
  }

  showGameOverModal(game) {
    this.clearAutoSelectTimer();
    const isRetreat = game.battleEndReason === 'retreat';
    if (this.dom.reportTitle) this.dom.reportTitle.textContent = isRetreat ? '已撤离战场' : '防线失守';
    if (this.dom.reportSubtitle) this.dom.reportSubtitle.textContent = isRetreat ? '仅结算击杀异兽获得的废料' : '基地生命归零，本次防守结束';
    if (this.dom.resWave) this.dom.resWave.textContent = game.wave;
    if (this.dom.resKills) this.dom.resKills.textContent = game.kills;
    const mins = Math.floor(game.survivalTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(game.survivalTime % 60).toString().padStart(2, '0');
    if (this.dom.resTime) this.dom.resTime.textContent = `${mins}:${secs}`;
    if (this.dom.resLevel) this.dom.resLevel.textContent = game.hero.level;
    if (this.dom.resBest) {
      const record = game.lastRunRecord || {};
      this.dom.resBest.textContent = `WAVE ${record.highWave || game.wave}（最高 ${record.maxKills || game.kills} 击杀）`;
    }

    // 渲染战利品自动结算清单
    const lootGrid = document.getElementById('gameover-loot-grid');
    if (lootGrid) {
      const loot = game.lastGameOverReward || game.battleLoot || { scrap: 0, gems: 0, items: {} };
      const pills = [];
      pills.push(`
        <div class="loot-item-pill">
          <img src="assets/icons/icon_coin.png" alt="Scrap">
          <span>工业废料</span>
          <span class="loot-cnt">+${loot.scrap || 0}</span>
        </div>
      `);
      if (loot.gems && loot.gems > 0) {
        pills.push(`
          <div class="loot-item-pill">
            <img src="assets/icons/icon_gem.png" alt="Gem">
            <span>高能晶核</span>
            <span class="loot-cnt">+${loot.gems}</span>
          </div>
        `);
      }
      if (loot.items) {
        Object.entries(loot.items).forEach(([id, count]) => {
          if (count <= 0) return;
          const cfg = GAME_CONFIG.items[id] || { name: '物资', icon: 'assets/icons/icon_chip.png' };
          pills.push(`
            <div class="loot-item-pill">
              <img src="${cfg.icon}" alt="${cfg.name}">
              <span>${cfg.name}</span>
              <span class="loot-cnt">+${count}</span>
            </div>
          `);
        });
      }
      lootGrid.innerHTML = pills.join('');
    }

    document.body.classList.add('battle-result-open');
    uiStack.push({
      id: 'gameover_modal',
      element: this.dom.gameoverModal,
      pauseGame: true,
      defaultFocus: this.dom.btnRestart,
      onClose: () => document.body.classList.remove('battle-result-open')
    });
  }

  initHUDListeners(game) {
    if (this.dom.btnReroll) {
      this.dom.btnReroll.addEventListener('click', () => this.rerollUpgradeCards(game));
    }
    if (this.dom.btnRestart) {
      this.dom.btnRestart.addEventListener('click', () => {
        if (uiStack.top()?.id === 'gameover_modal') uiStack.pop();
        import('./HomeLobbyUI.js').then(({ homeLobbyUI }) => {
          homeLobbyUI.show();
        });
      });
    }
    if (this.dom.btnExitBattle) {
      this.dom.btnExitBattle.addEventListener('click', () => {
        if (uiStack.top()?.id === 'settings_menu') uiStack.pop();
        if (!game || game.isGameOver || game.waveSystem?.stageCleared) return;
        uiStack.push({ id: 'retreat_confirm_modal', element: this.dom.retreatConfirmModal, pauseGame: true, defaultFocus: this.dom.btnRetreatCancel });
      });
    }
    if (this.dom.btnRetreatCancel) this.dom.btnRetreatCancel.addEventListener('click', () => { if (uiStack.top()?.id === 'retreat_confirm_modal') uiStack.pop(); });
    if (this.dom.btnRetreatConfirm) this.dom.btnRetreatConfirm.addEventListener('click', () => {
      if (uiStack.top()?.id === 'retreat_confirm_modal') uiStack.pop();
      if (game && !game.isGameOver && !game.waveSystem?.stageCleared) game.exitBattle();
    });
    if (this.dom.topAmmoCapsule) {
      this.dom.topAmmoCapsule.addEventListener('click', () => {
        if (game && typeof game.reloadWeapon === 'function') {
          game.reloadWeapon();
        }
      });
    }
    const btnGoForge = document.getElementById('btn-gameover-forge');
    if (btnGoForge) {
      btnGoForge.addEventListener('click', () => {
        if (uiStack.top()?.id === 'gameover_modal') uiStack.pop();
        import('./HomeLobbyUI.js').then(({ homeLobbyUI }) => {
          homeLobbyUI.switchTab('runes');
          homeLobbyUI.show();
        });
      });
    }
    if (this.dom.settingsToggle && this.dom.settingsMenu) {
      this.dom.settingsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.dom.settingsMenu.classList.contains('open')) {
          uiStack.pop();
        } else {
          this.dom.settingsMenu.classList.add('open');
          uiStack.push({
            id: 'settings_menu',
            element: this.dom.settingsMenu,
            pauseGame: false,
            defaultFocus: () => this.dom.btnSpeed || document.getElementById('btn-speed'),
            onClose: () => this.dom.settingsMenu.classList.remove('open')
          });
        }
      });
      if (this.dom.settingsClose) {
        this.dom.settingsClose.addEventListener('click', (e) => {
          e.stopPropagation();
          uiStack.pop();
        });
      }
      document.addEventListener('click', (e) => {
        if (!this.dom.settingsMenu.contains(e.target) && e.target !== this.dom.settingsToggle) {
          if (this.dom.settingsMenu.classList.contains('open')) {
            uiStack.pop();
          }
        }
      });

      // 设置菜单焦点循环与无障碍键盘导航 (Tab 与上下箭头循环)
      this.dom.settingsMenu.addEventListener('keydown', (e) => {
        const focusables = Array.from(this.dom.settingsMenu.querySelectorAll('button, .setting-btn-pill, .dropdown-close'));
        if (!focusables.length) return;
        const curIdx = focusables.indexOf(document.activeElement);
        if (e.key === 'Tab') {
          e.preventDefault();
          const nextIdx = e.shiftKey
            ? (curIdx - 1 + focusables.length) % focusables.length
            : (curIdx + 1) % focusables.length;
          focusables[nextIdx].focus();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIdx = (curIdx + 1) % focusables.length;
          focusables[nextIdx].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const nextIdx = (curIdx - 1 + focusables.length) % focusables.length;
          focusables[nextIdx].focus();
        }
      });
    }

    const btnFontScale = document.getElementById('btn-font-scale');
    if (btnFontScale) {
      let scaleMode = 0;
      const scales = [
        { label: '标准 100%', val: '1.0' },
        { label: '大号 115%', val: '1.15' },
        { label: '超大 130%', val: '1.3' }
      ];
      btnFontScale.addEventListener('click', () => {
        scaleMode = (scaleMode + 1) % scales.length;
        btnFontScale.textContent = scales[scaleMode].label;
        document.documentElement.style.setProperty('--ui-font-scale', scales[scaleMode].val);
      });
    }

    if (this.dom.btnSpeed) {
      this.dom.btnSpeed.addEventListener('click', () => {
        if (game.timeScale === 1.0) { game.timeScale = 1.5; this.dom.btnSpeed.textContent = '1.5x'; }
        else if (game.timeScale === 1.5) { game.timeScale = 2.0; this.dom.btnSpeed.textContent = '2x'; }
        else { game.timeScale = 1.0; this.dom.btnSpeed.textContent = '1x'; }
      });
    }
    if (this.dom.btnSound) {
      this.dom.btnSound.addEventListener('click', () => {
        const muted = sound.toggleMute();
        this.dom.btnSound.textContent = muted ? '🔇 静音' : '🔊 开启';
      });
    }
    if (this.dom.btnPause) {
      this.dom.btnPause.addEventListener('click', () => {
        game.isPaused = !game.isPaused;
        this.dom.btnPause.textContent = game.isPaused ? '▶️ 继续' : '⏸️ 暂停';
      });
    }
  }

  showWaveBanner(waveNum, isBossWave, stageConfig = null, wavePlan = null) {
    StageUI.showWaveBanner(waveNum, isBossWave, stageConfig, wavePlan);
  }
  showStageClearModal(game) { StageUI.showStageClearModal(game); }
  showStageSelectModal(game) { StageUI.showStageSelectModal(game); }
  showRuneForgeModal(game) { StageUI.showRuneForgeModal(game); }
}
