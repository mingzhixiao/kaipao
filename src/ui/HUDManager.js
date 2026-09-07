import { buildUpgradeCardPool } from '../combat/SkillDeck.js';
import { sound } from '../systems/SoundEngine.js';
import { saveManager } from '../systems/SaveManager.js';

// ---------------- 高性能 Dirty-Checked HUD 与 UI 管理器 ----------------
// 为什么不使用虚拟 DOM (React / Vue)？
// 60FPS 游戏高频更新，若每帧做 VDOM diff 和虚拟节点创建，会产生大量微型垃圾对象诱发 GC 停顿与掉帧。
// 此处采用脏标记 (Dirty-Checked) 差异缓存模式：只有当数值确实变更时才写入实际 DOM，开销微乎其微。

export class HUDManager {
  constructor() {
    this.dom = {
      level: document.getElementById('hud-level'),
      wave: document.getElementById('hud-wave'),
      kills: document.getElementById('hud-kills'),
      expFill: document.getElementById('exp-fill'),
      hpFill: document.getElementById('hp-bar-fill'),
      hpVal: document.getElementById('hp-val'),
      shieldFill: document.getElementById('shield-bar-fill'),
      shieldVal: document.getElementById('shield-val'),
      bossHud: document.getElementById('boss-hud'),
      bossHpFill: document.getElementById('boss-hp-fill'),
      bossHpVal: document.getElementById('boss-hp-val'),
      emergencyOverlay: document.getElementById('emergency-overlay'),
      waveBanner: document.getElementById('wave-banner'),
      bannerWaveText: document.getElementById('banner-wave-text'),
      bannerWaveSub: document.getElementById('banner-wave-sub'),
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
        rocket: {
          slot: document.getElementById('slot-skill-a'),
          mask: document.getElementById('mask-skill-a'),
          lvl: document.getElementById('lvl-skill-a')
        },
        truck: {
          slot: document.getElementById('slot-skill-b'),
          mask: document.getElementById('mask-skill-b'),
          lvl: document.getElementById('lvl-skill-b')
        },
        freeze: {
          slot: document.getElementById('slot-skill-c'),
          mask: document.getElementById('mask-skill-c'),
          lvl: document.getElementById('lvl-skill-c')
        }
      }
    };

    // 脏检查缓存状态
    this.cache = {
      level: -1,
      wave: -1,
      kills: -1,
      expRatio: -1,
      hpRatio: -1,
      hpText: '',
      shieldRatio: -1,
      shieldText: '',
      bossVisible: false,
      bossHpRatio: -1,
      emergencyActive: false,
      skills: {
        rocket: { level: -1, cdPercent: -1 },
        truck: { level: -1, cdPercent: -1 },
        freeze: { level: -1, cdPercent: -1 }
      }
    };
  }

  updateHUD(game) {
    // 1. 等级 / 波次 / 击杀数
    if (this.cache.level !== game.hero.level) {
      this.cache.level = game.hero.level;
      if (this.dom.level) this.dom.level.textContent = game.hero.level;
    }
    if (this.cache.wave !== game.wave) {
      this.cache.wave = game.wave;
      if (this.dom.wave) this.dom.wave.textContent = game.wave;
    }
    if (this.cache.kills !== game.kills) {
      this.cache.kills = game.kills;
      if (this.dom.kills) this.dom.kills.textContent = game.kills;
    }

    // 2. 经验进度条
    const expRatio = Math.min(100, Math.round((game.hero.exp / game.hero.expNeeded) * 100));
    if (this.cache.expRatio !== expRatio) {
      this.cache.expRatio = expRatio;
      if (this.dom.expFill) this.dom.expFill.style.width = `${expRatio}%`;
    }

    // 3. 基地生命值
    const hpRatio = Math.max(0, Math.round((game.fortress.hp / game.fortress.maxHp) * 100));
    const hpText = `${Math.ceil(game.fortress.hp)}/${game.fortress.maxHp}`;
    if (this.cache.hpRatio !== hpRatio) {
      this.cache.hpRatio = hpRatio;
      if (this.dom.hpFill) this.dom.hpFill.style.width = `${hpRatio}%`;
    }
    if (this.cache.hpText !== hpText) {
      this.cache.hpText = hpText;
      if (this.dom.hpVal) this.dom.hpVal.textContent = hpText;
    }

    // 4. 基地护盾
    const shieldRatio = Math.max(0, Math.round((game.fortress.shield / game.fortress.maxShield) * 100));
    const shieldText = `${Math.ceil(game.fortress.shield)}/${game.fortress.maxShield}`;
    if (this.cache.shieldRatio !== shieldRatio) {
      this.cache.shieldRatio = shieldRatio;
      if (this.dom.shieldFill) this.dom.shieldFill.style.width = `${shieldRatio}%`;
    }
    if (this.cache.shieldText !== shieldText) {
      this.cache.shieldText = shieldText;
      if (this.dom.shieldVal) this.dom.shieldVal.textContent = shieldText;
    }

    // 5. 濒死全屏警报暗角
    const isEmergency = game.fortress.hp <= game.fortress.maxHp * 0.35;
    if (this.cache.emergencyActive !== isEmergency) {
      this.cache.emergencyActive = isEmergency;
      if (this.dom.emergencyOverlay) {
        if (isEmergency) {
          this.dom.emergencyOverlay.classList.add('active');
          this.dom.emergencyOverlay.style.opacity = '1';
        } else {
          this.dom.emergencyOverlay.classList.remove('active');
          this.dom.emergencyOverlay.style.opacity = '0';
        }
      }
    }

    // 6. Boss 专属血条 HUD
    if (this.dom.bossHud) {
      const boss = game.enemies.find(e => e.active && e.isBoss);
      if (boss) {
        if (!this.cache.bossVisible) {
          this.cache.bossVisible = true;
          this.dom.bossHud.style.display = 'flex';
        }
        const bossRatio = Math.max(0, Math.round((boss.hp / boss.maxHp) * 100));
        if (this.cache.bossHpRatio !== bossRatio) {
          this.cache.bossHpRatio = bossRatio;
          if (this.dom.bossHpFill) this.dom.bossHpFill.style.width = `${bossRatio}%`;
          if (this.dom.bossHpVal) this.dom.bossHpVal.textContent = `${bossRatio}%`;
        }
      } else {
        if (this.cache.bossVisible) {
          this.cache.bossVisible = false;
          this.dom.bossHud.style.display = 'none';
        }
      }
    }
  }

  updateSkillHUD(game) {
    const updateSlot = (key, skill) => {
      const slotDom = this.dom.skills[key];
      if (!slotDom || !slotDom.slot) return;
      const cached = this.cache.skills[key];

      if (cached.level !== skill.level) {
        cached.level = skill.level;
        slotDom.lvl.textContent = `Lv.${skill.level}`;
        if (skill.level > 0) {
          slotDom.slot.classList.add('unlocked');
        } else {
          slotDom.slot.classList.remove('unlocked');
        }
      }

      if (skill.level > 0) {
        const cdRatio = Math.max(0, skill.timer / skill.cooldown);
        const cdPercent = Math.round(cdRatio * 100);
        if (cached.cdPercent !== cdPercent) {
          cached.cdPercent = cdPercent;
          slotDom.mask.style.height = `${cdPercent}%`;
        }
      } else {
        if (cached.cdPercent !== 100) {
          cached.cdPercent = 100;
          slotDom.mask.style.height = '100%';
        }
      }
    };

    updateSlot('rocket', game.skills.rocket);
    updateSlot('truck', game.skills.truck);
    updateSlot('freeze', game.skills.freeze);
  }

  showWaveBanner(wave, isBoss = false) {
    if (!this.dom.waveBanner) return;
    this.dom.bannerWaveText.textContent = isBoss ? `⚠️ BOSS WAVE ${wave}` : `WAVE ${wave}`;
    this.dom.bannerWaveSub.textContent = isBoss ? '突变暴君终结者已降临战场！' : '大批变异感染者正在蜂拥逼近！';

    this.dom.waveBanner.style.display = 'block';
    this.dom.waveBanner.style.animation = 'none';
    void this.dom.waveBanner.offsetWidth; // 触发重绘回流以重启 CSS 动画
    this.dom.waveBanner.style.animation = 'bannerPop 2s ease-in-out forwards';

    setTimeout(() => {
      if (this.dom.waveBanner) this.dom.waveBanner.style.display = 'none';
    }, 2000);
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

    // 过滤已满级协同词条
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
      el.innerHTML = `
        <img class="card-icon-img" src="${card.img}" alt="${card.name}">
        <div class="card-info">
          <div class="card-header-row">
            <div class="card-name">${card.name}</div>
            <div class="card-tag">${card.rarity}</div>
          </div>
          <div class="card-synergy">${card.synergy}</div>
          <div class="card-desc">${card.desc}</div>
        </div>
      `;
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

    const stats = saveManager.getStats();
    if (this.dom.resBest) {
      this.dom.resBest.textContent = `WAVE ${stats.highWave || 1} (最高 ${stats.maxKills || 0} 击杀 · 局数 ${stats.totalRuns || 1})`;
    }

    if (this.dom.gameoverModal) this.dom.gameoverModal.style.display = 'flex';
  }

  initHUDListeners(game) {
    // 战术重抽按钮
    if (this.dom.btnReroll) {
      this.dom.btnReroll.addEventListener('click', () => this.rerollUpgradeCards(game));
    }

    // 重新构筑防线按钮
    if (this.dom.btnRestart) {
      this.dom.btnRestart.addEventListener('click', () => {
        if (this.dom.gameoverModal) this.dom.gameoverModal.style.display = 'none';
        game.restart();
      });
    }

    // 倍速按钮
    if (this.dom.btnSpeed) {
      this.dom.btnSpeed.addEventListener('click', () => {
        if (game.timeScale === 1.0) {
          game.timeScale = 1.5;
          this.dom.btnSpeed.textContent = '1.5x';
        } else if (game.timeScale === 1.5) {
          game.timeScale = 2.0;
          this.dom.btnSpeed.textContent = '2x';
        } else {
          game.timeScale = 1.0;
          this.dom.btnSpeed.textContent = '1x';
        }
      });
    }

    // 声音静音切换
    if (this.dom.btnSound) {
      this.dom.btnSound.addEventListener('click', () => {
        const muted = sound.toggleMute();
        this.dom.btnSound.textContent = muted ? '🔇' : '🔊';
      });
    }

    // 暂停按钮
    if (this.dom.btnPause) {
      this.dom.btnPause.addEventListener('click', () => {
        game.isPaused = !game.isPaused;
        this.dom.btnPause.textContent = game.isPaused ? '▶️' : '⏸️';
      });
    }
  }
}
