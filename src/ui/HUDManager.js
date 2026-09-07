import { buildUpgradeCardPool } from '../combat/SkillDeck.js';
import { sound } from '../systems/SoundEngine.js';
import * as StageUI from '../systems/StageUI.js';

// ---------------- 高性能 Dirty-Checked HUD 与 UI 管理器 ----------------

export class HUDManager {
  constructor() {
    this.dom = {
      level: document.getElementById('hud-level'),
      wave: document.getElementById('hud-wave'),
      kills: document.getElementById('hud-kills'),
      expFill: document.getElementById('exp-fill'),
      hpFill: document.getElementById('hp-bar-fill'),
      hpText: document.getElementById('hp-text'),
      shieldFill: document.getElementById('shield-bar-fill'),
      shieldText: document.getElementById('shield-text'),
      bossHud: document.getElementById('boss-hud'),
      bossHpFill: document.getElementById('boss-hp-fill'),
      bossHpText: document.getElementById('boss-hp-text'),
      emergencyOverlay: document.getElementById('emergency-overlay'),
      upgradeModal: document.getElementById('upgrade-modal'),
      cardsContainer: document.getElementById('cards-container'),
      btnReroll: document.getElementById('btn-reroll'),
      rerollCount: document.getElementById('reroll-count'),
      gameoverModal: document.getElementById('gameover-modal'),
      resWave: document.getElementById('res-wave'),
      resKills: document.getElementById('res-kills'),
      resTime: document.getElementById('res-time'),
      resLevel: document.getElementById('res-level'),
      resBest: document.getElementById('res-best'),
      btnRestart: document.getElementById('btn-restart'),
      btnSpeed: document.getElementById('btn-speed'),
      btnSound: document.getElementById('btn-sound'),
      btnPause: document.getElementById('btn-pause'),
      skills: {
        rocket: { slot: document.getElementById('slot-skill-a'), mask: document.getElementById('mask-skill-a'), lvl: document.getElementById('lvl-skill-a') },
        truck: { slot: document.getElementById('slot-skill-b'), mask: document.getElementById('mask-skill-b'), lvl: document.getElementById('lvl-skill-b') },
        freeze: { slot: document.getElementById('slot-skill-c'), mask: document.getElementById('mask-skill-c'), lvl: document.getElementById('lvl-skill-c') }
      }
    };
    this.cache = {
      level: -1, wave: -1, stageId: -1, kills: -1, expRatio: -1,
      hpRatio: -1, hpText: '', shieldRatio: -1, shieldText: '',
      bossVisible: false, bossHpRatio: -1, emergencyActive: false,
      skills: {
        rocket: { level: -1, cdPercent: -1 },
        truck: { level: -1, cdPercent: -1 },
        freeze: { level: -1, cdPercent: -1 }
      }
    };
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
    const expRatio = Math.min(100, Math.round((game.hero.exp / game.hero.expNeeded) * 100));
    if (this.cache.expRatio !== expRatio) {
      this.cache.expRatio = expRatio;
      if (this.dom.expFill) this.dom.expFill.style.width = expRatio + '%';
    }
    const hpRatio = Math.max(0, game.fortress.hp / game.fortress.maxHp);
    const hpPct = Math.round(hpRatio * 100);
    if (this.cache.hpRatio !== hpPct) {
      this.cache.hpRatio = hpPct;
      if (this.dom.hpFill) this.dom.hpFill.style.width = hpPct + '%';
    }
    const hpText = `${Math.ceil(game.fortress.hp)}/${game.fortress.maxHp}`;
    if (this.cache.hpText !== hpText) {
      this.cache.hpText = hpText;
      if (this.dom.hpText) this.dom.hpText.textContent = hpText;
    }
    const shieldRatio = Math.max(0, game.fortress.shield / game.fortress.maxShield);
    const shPct = Math.round(shieldRatio * 100);
    if (this.cache.shieldRatio !== shPct) {
      this.cache.shieldRatio = shPct;
      if (this.dom.shieldFill) this.dom.shieldFill.style.width = shPct + '%';
    }
    const shText = `${Math.ceil(game.fortress.shield)}/${game.fortress.maxShield}`;
    if (this.cache.shieldText !== shText) {
      this.cache.shieldText = shText;
      if (this.dom.shieldText) this.dom.shieldText.textContent = shText;
    }
    const boss = game.activeBoss;
    const bossVisible = !!(boss && boss.active);
    if (this.cache.bossVisible !== bossVisible) {
      this.cache.bossVisible = bossVisible;
      if (this.dom.bossHud) this.dom.bossHud.style.display = bossVisible ? 'flex' : 'none';
    }
    if (bossVisible) {
      const bhp = Math.round((boss.hp / boss.maxHp) * 100);
      if (this.cache.bossHpRatio !== bhp) {
        this.cache.bossHpRatio = bhp;
        if (this.dom.bossHpFill) this.dom.bossHpFill.style.width = bhp + '%';
        if (this.dom.bossHpText) this.dom.bossHpText.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
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

  showLevelUpModal(game) {
    game.isUpgrading = true;
    game.rerollAvailable = 1;
    sound.playLevelUp();
    if (this.dom.btnReroll && this.dom.rerollCount) {
      this.dom.rerollCount.textContent = '1';
      this.dom.btnReroll.disabled = false;
    }
    this.renderUpgradeCards(game);
    if (this.dom.upgradeModal) this.dom.upgradeModal.style.display = 'flex';
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
  }

  renderUpgradeCards(game) {
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
    const container = this.dom.cardsContainer;
    if (!container) return;
    container.innerHTML = '';
    selected.forEach(card => {
      const el = document.createElement('div');
      el.className = `upgrade-card rarity-${card.rarity}`;
      el.innerHTML = `<img class="card-icon-img" src="${card.img}" alt="${card.name}"><div class="card-info"><div class="card-header-row"><div class="card-name">${card.name}</div><div class="card-tag">${card.rarity}</div></div><div class="card-synergy">${card.synergy}</div><div class="card-desc">${card.desc}</div></div>`;
      el.addEventListener('click', () => {
        card.apply();
        if (this.dom.upgradeModal) this.dom.upgradeModal.style.display = 'none';
        game.isUpgrading = false;
        this.updateSkillHUD(game);
        this.updateHUD(game);
      });
      container.appendChild(el);
    });
  }

  showGameOverModal(game) {
    if (this.dom.resWave) this.dom.resWave.textContent = game.wave;
    if (this.dom.resKills) this.dom.resKills.textContent = game.kills;
    const mins = Math.floor(game.survivalTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(game.survivalTime % 60).toString().padStart(2, '0');
    if (this.dom.resTime) this.dom.resTime.textContent = `${mins}:${secs}`;
    if (this.dom.resLevel) this.dom.resLevel.textContent = game.hero.level;
    if (this.dom.gameoverModal) this.dom.gameoverModal.style.display = 'flex';
  }

  initHUDListeners(game) {
    if (this.dom.btnReroll) {
      this.dom.btnReroll.addEventListener('click', () => this.rerollUpgradeCards(game));
    }
    if (this.dom.btnRestart) {
      this.dom.btnRestart.addEventListener('click', () => {
        if (this.dom.gameoverModal) this.dom.gameoverModal.style.display = 'none';
        this.showStageSelectModal(game);
      });
    }
    const btnGoForge = document.getElementById('btn-gameover-forge');
    if (btnGoForge) {
      btnGoForge.addEventListener('click', () => {
        if (this.dom.gameoverModal) this.dom.gameoverModal.style.display = 'none';
        this.showRuneForgeModal(game);
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
        this.dom.btnSound.textContent = muted ? '🔇' : '🔊';
      });
    }
    if (this.dom.btnPause) {
      this.dom.btnPause.addEventListener('click', () => {
        game.isPaused = !game.isPaused;
        this.dom.btnPause.textContent = game.isPaused ? '▶️' : '⏸️';
      });
    }
  }

  showWaveBanner(waveNum, isBossWave, stageConfig = null) {
    StageUI.showWaveBanner(waveNum, isBossWave, stageConfig);
  }
  showStageClearModal(game) { StageUI.showStageClearModal(game); }
  showStageSelectModal(game) { StageUI.showStageSelectModal(game); }
  showRuneForgeModal(game) { StageUI.showRuneForgeModal(game); }
}
