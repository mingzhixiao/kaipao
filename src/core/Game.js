import { sound } from '../systems/SoundEngine.js';
import { FeedbackManager } from '../systems/FeedbackManager.js';
import { ObjectPool } from '../systems/ObjectPool.js';
import { assets } from '../systems/AssetManager.js';
import { GameRenderer } from '../render/GameRenderer.js';
import { HUDManager } from '../ui/HUDManager.js';
import { SynergySystem } from '../combat/SynergySystem.js';
import { GAME_CONFIG } from './Config.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { saveManager } from '../systems/SaveManager.js';

// ---------------- 游戏核心主控类 (Game Core Controller - 模块解耦与高性能架构) ----------------

export class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById('game-container');
    this.emergencyOverlay = document.getElementById('emergency-overlay');

    this.width = GAME_CONFIG.viewport.baseWidth;
    this.height = GAME_CONFIG.viewport.baseHeight;
    this.scale = 1;

    this.isPaused = false;
    this.isGameOver = false;
    this.isUpgrading = false;
    this.timeScale = 1.0;
    this.lastTime = performance.now();
    this.survivalTime = 0;
    this.heartbeatTimer = 0;

    this.feedback = new FeedbackManager(sound);
    this.renderer = new GameRenderer(this.ctx);
    this.hud = new HUDManager();
    this.synergySystem = new SynergySystem(this);
    this.waveSystem = new WaveSystem(this);
    this.combatSystem = new CombatSystem(this);

    this.rerollAvailable = 1;
    this.kills = 0;
    this.totalDamage = 0;

    this.fortress = {
      x: 0, y: 0, width: 0,
      height: GAME_CONFIG.fortress.height,
      hp: GAME_CONFIG.fortress.maxHp,
      maxHp: GAME_CONFIG.fortress.maxHp,
      shield: GAME_CONFIG.fortress.maxShield,
      maxShield: GAME_CONFIG.fortress.maxShield,
      shieldRegenTimer: 0,
      shieldRegenDelay: GAME_CONFIG.fortress.shieldRegenDelay,
      shieldRegenRate: GAME_CONFIG.fortress.shieldRegenRate,
      hitFlash: 0
    };

    this.hero = {
      x: 0, y: 0,
      angle: -Math.PI / 2,
      targetAngle: -Math.PI / 2,
      attackTimer: 0,
      baseAttackInterval: GAME_CONFIG.hero.baseAttackInterval,
      recoil: 0, level: 1, exp: 0,
      expNeeded: GAME_CONFIG.hero.expNeededBase,
      magnetRange: GAME_CONFIG.hero.magnetRange
    };

    this.weapon = { ...GAME_CONFIG.weapon };

    this.skills = {
      rocket: {
        level: 0,
        cooldown: GAME_CONFIG.skills.rocket.cooldown,
        timer: 3.0,
        damage: GAME_CONFIG.skills.rocket.damage,
        radius: GAME_CONFIG.skills.rocket.radius,
        burnDuration: GAME_CONFIG.skills.rocket.burnDuration,
        burnDps: GAME_CONFIG.skills.rocket.burnDps
      },
      truck: {
        level: 0,
        cooldown: GAME_CONFIG.skills.truck.cooldown,
        timer: 4.0,
        damage: GAME_CONFIG.skills.truck.damage,
        knockback: GAME_CONFIG.skills.truck.knockback,
        speed: GAME_CONFIG.skills.truck.speed,
        width: GAME_CONFIG.skills.truck.width,
        height: GAME_CONFIG.skills.truck.height
      },
      freeze: {
        level: 0,
        cooldown: GAME_CONFIG.skills.freeze.cooldown,
        timer: 5.0,
        duration: GAME_CONFIG.skills.freeze.duration,
        activeTimer: 0,
        damagePerTick: GAME_CONFIG.skills.freeze.damagePerTick,
        slowRatio: GAME_CONFIG.skills.freeze.slowRatio,
        range: GAME_CONFIG.skills.freeze.range,
        coneAngle: GAME_CONFIG.skills.freeze.coneAngle
      }
    };

    this.synergies = {
      thermalEngine: false,
      teslaCoil: false,
      fortressEmp: false,
      truckInferno: false,
      cryoShatter: false
    };

    this.bullets = [];
    this.enemies = [];
    this.gems = [];
    this.particles = [];
    this.damageTexts = [];
    this.burnZones = [];
    this.activeTrucks = [];
    this.hitRings = [];
    this.iceSpikes = [];
    this.teslaArcs = [];
    this.shockwaves = [];
    this.muzzleFlash = 0;
    this.activeBoss = null;
    this.wave = 1;

    this.initPools();
    this.hud.initHUDListeners(this);
    this.bindInputEvents();
    this.resize();
    this.resetGame();
    requestAnimationFrame(this.loop.bind(this));
  }

  initPools() {
    this.bulletPool = new ObjectPool(() => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0,
      damage: 0, isCrit: false, pierceLeft: 1, radius: 4, life: 2.0
    }), (b) => {
      b.x = 0; b.y = 0; b.vx = 0; b.vy = 0;
      b.damage = 0; b.isCrit = false; b.pierceLeft = 1;
    }, 80, 200);

    this.enemyPool = new ObjectPool(() => ({
      active: false, type: 'runner', isBoss: false,
      x: 0, y: 0, vx: 0, vy: 0, hp: 100, maxHp: 100,
      speed: 80, radius: 18, color: '#38ef7d', expVal: 8,
      attackPower: 30, attackCooldown: 1.0, attackTimer: 0,
      hitFlash: 0, hitStagger: 0, hitStaggerTotal: 0.22, hitAngle: 0,
      burnTimer: 0, burnDps: 0, freezeTimer: 0, freezeFactor: 1.0,
      walkTime: 0, stepTimer: 0, stompTimer: 0
    }), (e) => {
      e.burnTimer = 0; e.burnDps = 0;
      e.freezeTimer = 0; e.freezeFactor = 1.0;
      e.hitFlash = 0; e.hitStagger = 0;
    }, 60, 150);

    this.particlePool = new ObjectPool(() => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0,
      color: '#fff', size: 3, life: 1.0, maxLife: 1.0, type: 'spark'
    }), null, 150, 400);

    this.gemPool = new ObjectPool(() => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0,
      val: 5, radius: 5, timer: 0, color: '#00f0ff'
    }), (g) => { g.timer = 0; g.vx = 0; g.vy = 0; }, 60, 150);

    this.textPool = new ObjectPool(() => ({
      active: false, text: '', x: 0, y: 0, vy: -45,
      color: '#fff', fontSize: 14, scale: 1.4, targetScale: 1.0,
      life: 0.7, maxLife: 0.7, isSpecial: false, isCrit: false
    }), null, 50, 120);

    this.hitRingPool = new ObjectPool(() => ({
      active: false, x: 0, y: 0, radius: 10, maxRadius: 28,
      life: 0.22, maxLife: 0.22, color: '#00f0ff'
    }), null, 30, 80);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.fortress.x = 0;
    this.fortress.y = this.height - this.fortress.height;
    this.fortress.width = this.width;
    this.hero.x = this.width / 2;
    this.hero.y = this.fortress.y + 25;
    this.renderer.invalidateBackground();
  }

  bindInputEvents() {
    window.addEventListener('resize', () => this.resize());
    const onPointer = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      if (py < this.fortress.y) {
        this.hero.targetAngle = Math.atan2(py - this.hero.y, px - this.hero.x);
      }
    };
    this.canvas.addEventListener('mousedown', onPointer);
    this.canvas.addEventListener('mousemove', (e) => { if (e.buttons === 1) onPointer(e); });
    this.canvas.addEventListener('touchstart', onPointer, { passive: true });
    this.canvas.addEventListener('touchmove', onPointer, { passive: true });
  }

  resetGame() {
    this.fortress.hp = this.fortress.maxHp = GAME_CONFIG.fortress.maxHp;
    this.fortress.shield = this.fortress.maxShield = GAME_CONFIG.fortress.maxShield;
    this.fortress.hitFlash = 0;
    this.hero.level = 1;
    this.hero.exp = 0;
    this.hero.expNeeded = GAME_CONFIG.hero.expNeededBase;
    this.hero.magnetRange = GAME_CONFIG.hero.magnetRange;
    this.hero.baseAttackInterval = GAME_CONFIG.hero.baseAttackInterval;
    this.weapon = { ...GAME_CONFIG.weapon };
    // 完整重置技能基础数值（局内升级卡 + 符文会在之后重新叠加）
    const sk = GAME_CONFIG.skills;
    this.skills.rocket = {
      level: 0, cooldown: sk.rocket.cooldown, timer: 3.0,
      damage: sk.rocket.damage, radius: sk.rocket.radius,
      burnDuration: sk.rocket.burnDuration, burnDps: sk.rocket.burnDps
    };
    this.skills.truck = {
      level: 0, cooldown: sk.truck.cooldown, timer: 4.0,
      damage: sk.truck.damage, knockback: sk.truck.knockback,
      speed: sk.truck.speed, width: sk.truck.width, height: sk.truck.height
    };
    this.skills.freeze = {
      level: 0, cooldown: sk.freeze.cooldown, timer: 5.0,
      duration: sk.freeze.duration, activeTimer: 0,
      damagePerTick: sk.freeze.damagePerTick, slowRatio: sk.freeze.slowRatio,
      range: sk.freeze.range, coneAngle: sk.freeze.coneAngle
    };
    this.synergies = {
      thermalEngine: false, teslaCoil: false, fortressEmp: false,
      truckInferno: false, cryoShatter: false
    };
    this.kills = 0;
    this.totalDamage = 0;
    this.survivalTime = 0;
    this.rerollAvailable = 1;
    this.activeBoss = null;
    this.bulletPool.releaseAll(this.bullets);
    this.enemyPool.releaseAll(this.enemies);
    this.gemPool.releaseAll(this.gems);
    this.particlePool.releaseAll(this.particles);
    this.textPool.releaseAll(this.damageTexts);
    this.hitRingPool.releaseAll(this.hitRings);
    this.burnZones.length = 0;
    this.activeTrucks.length = 0;
    this.iceSpikes.length = 0;
    this.teslaArcs.length = 0;
    this.shockwaves.length = 0;
    this.muzzleFlash = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.isUpgrading = false;
    if (this.emergencyOverlay) this.emergencyOverlay.classList.remove('active');
    this.combatSystem.reset();
    this.waveSystem.reset();
    this.waveSystem.startWave(1);
    this.hud.updateHUD(this);
    this.hud.updateSkillHUD(this);
  }

  restart() { this.resetGame(); }

  getRoadBounds(y) {
    const left = GAME_CONFIG.viewport.roadMargin;
    const right = this.width - GAME_CONFIG.viewport.roadMargin;
    const roadWidth = right - left;
    const center = this.width / 2;
    return {
      left, right, center, roadWidth,
      leftLane: left + roadWidth * 0.25,
      centerLane: center,
      rightLane: left + roadWidth * 0.75
    };
  }

  spawnEnemy() { this.waveSystem.spawnEnemy(); }
  spawnBoss(spawnY) { this.waveSystem.spawnBoss(spawnY); }
  shootWeapon() { this.combatSystem.shootWeapon(); }
  damageEnemy(e, dmg, isCrit, type, kx, ky) { this.combatSystem.onHit(e, dmg, isCrit, type, kx, ky); }
  killEnemy(e) { this.combatSystem.onKill(e); }

  spawnParticles(x, y, color, count, type = 'spark') {
    for (let i = 0; i < count; i++) {
      const p = this.particlePool.get();
      p.active = true;
      p.x = x; p.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'smoke' ? (20 + Math.random() * 35) : (50 + Math.random() * 140);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - (type === 'smoke' || type === 'fire' ? 25 : 0);
      p.size = type === 'smoke' ? (4 + Math.random() * 6) : (2 + Math.random() * 3.5);
      p.color = color;
      p.life = p.maxLife = type === 'smoke' ? (0.4 + Math.random() * 0.4) : (0.2 + Math.random() * 0.25);
      p.type = type;
      this.particles.push(p);
    }
  }

  spawnHitRing(x, y, color = '#ff0055', radius = 25) {
    const hr = this.hitRingPool.get();
    hr.active = true;
    hr.x = x; hr.y = y;
    hr.radius = 8; hr.maxRadius = radius;
    hr.life = hr.maxLife = 0.24;
    hr.color = color;
    this.hitRings.push(hr);
  }

  spawnDamageText(x, y, text, color = '#ffffff', isCrit = false, isSpecial = false) {
    const t = this.textPool.get();
    t.active = true;
    t.x = x + (Math.random() * 16 - 8);
    t.y = y; t.vy = -55;
    t.text = typeof text === 'number' ? Math.round(text).toString() : text;
    t.color = color; t.isCrit = isCrit; t.isSpecial = isSpecial;
    t.fontSize = isSpecial ? 20 : (isCrit ? 18 : 14);
    t.scale = isSpecial ? 1.5 : (isCrit ? 1.35 : 1.15);
    t.targetScale = 1.0;
    t.life = t.maxLife = isSpecial ? 0.9 : 0.65;
    this.damageTexts.push(t);
  }

  gainExp(amount) {
    this.hero.exp += amount;
    if (this.hero.exp >= this.hero.expNeeded) {
      this.hero.exp -= this.hero.expNeeded;
      this.hero.level++;
      this.hero.expNeeded = Math.round(
        this.hero.expNeeded * GAME_CONFIG.hero.expNeededGrowth + GAME_CONFIG.hero.expNeededAdd
      );
      this.triggerLevelUp();
    }
    this.hud.updateHUD(this);
  }

  triggerLevelUp() { this.hud.showLevelUpModal(this); }
  rerollUpgradeCards() { this.hud.rerollUpgradeCards(this); }

  loop(timestamp) {
    const dtRaw = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    if (this.feedback.hitStopTimer > 0) {
      this.feedback.hitStopTimer -= dtRaw;
      this.renderer.render(this);
      requestAnimationFrame(this.loop.bind(this));
      return;
    }
    const dt = Math.min(0.1, dtRaw) * this.timeScale;
    if (!this.isPaused && !this.isGameOver && !this.isUpgrading) this.update(dt);
    this.renderer.render(this);
    requestAnimationFrame(this.loop.bind(this));
  }

  updateSkills(dt) {
    const skills = this.skills;
    if (skills.rocket.level > 0) {
      skills.rocket.timer += dt;
      if (skills.rocket.timer >= skills.rocket.cooldown) {
        skills.rocket.timer = 0;
        let targetX = this.width / 2, targetY = this.height * 0.38;
        if (this.enemies.length > 0) {
          const valid = this.enemies.filter(e => e.active);
          if (valid.length > 0) {
            const t = valid[Math.floor(Math.random() * valid.length)];
            targetX = t.x; targetY = t.y;
          }
        }
        this.combatSystem.launchRocket(targetX, targetY);
      }
    }
    if (skills.truck.level > 0) {
      skills.truck.timer += dt;
      if (skills.truck.timer >= skills.truck.cooldown) {
        skills.truck.timer = 0;
        this.combatSystem.launchArmoredTruck();
      }
    }
    if (skills.freeze.level > 0) {
      skills.freeze.timer += dt;
      if (skills.freeze.timer >= skills.freeze.cooldown) {
        skills.freeze.timer = 0;
        skills.freeze.activeTimer = skills.freeze.duration;
        if (typeof sound.playFreezeSpray === 'function') sound.playFreezeSpray();
      }
      if (skills.freeze.activeTimer > 0) {
        skills.freeze.activeTimer -= dt;
        this.combatSystem.applyFreezeRay(dt);
      }
    }
    this.hud.updateSkillHUD(this);
  }

  update(dt) {
    this.survivalTime += dt;
    this.feedback.update(dt);
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt;

    if (this.fortress.shield < this.fortress.maxShield) {
      this.fortress.shieldRegenTimer += dt;
      if (this.fortress.shieldRegenTimer >= this.fortress.shieldRegenDelay) {
        this.fortress.shield = Math.min(
          this.fortress.maxShield,
          this.fortress.shield + this.fortress.shieldRegenRate * dt
        );
      }
    }

    const hpRatio = this.fortress.hp / this.fortress.maxHp;
    if (this.emergencyOverlay) {
      if (hpRatio <= 0.3) {
        this.emergencyOverlay.classList.add('active');
        this.heartbeatTimer += dt;
        if (this.heartbeatTimer >= 1.0) {
          this.heartbeatTimer = 0;
          sound.playHeartbeat();
        }
      } else {
        this.emergencyOverlay.classList.remove('active');
        this.heartbeatTimer = 0;
      }
    }

    this.waveSystem.update(dt);
    this.combatSystem.updateAutoTarget();
    this.hero.attackTimer += dt;
    if (this.hero.attackTimer >= this.hero.baseAttackInterval) {
      this.hero.attackTimer = 0;
      this.combatSystem.shootWeapon();
    }
    if (this.hero.recoil > 0) this.hero.recoil = Math.max(0, this.hero.recoil - dt * 35);

    this.updateSkills(dt);
    this.combatSystem.update(dt);

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.active) continue;

      if (e.freezeTimer > 0) {
        e.freezeTimer -= dt;
        e.freezeFactor = this.skills.freeze.slowRatio;
      } else e.freezeFactor = 1.0;

      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.hitStagger > 0) e.hitStagger -= dt;

      if (e.isBoss) {
        e.stompTimer -= dt;
        if (e.stompTimer <= 0) {
          e.stompTimer = GAME_CONFIG.enemies.boss_overlord.stompInterval;
          this.feedback.addTrauma(0.42);
          sound.playExplosion();
          this.shockwaves.push({
            active: true, x: e.x, y: e.y + e.radius * 0.5,
            radius: 10, maxRadius: 240, life: 0.5, maxLife: 0.5, color: '#ff2a5f'
          });
        }
      }

      const speed = e.speed * e.freezeFactor;
      const targetY = this.fortress.y - e.radius + 12;

      if (e.y < targetY) {
        const stepRate = e.isBoss ? 3.8 : (e.type === 'charger' ? 9.6 : (e.type === 'behemoth' ? 4.4 : 7.2));
        const speedRatio = speed / Math.max(1, e.speed);
        const prevPhase = e.walkPhase || 0;
        e.walkPhase = prevPhase + dt * stepRate * Math.max(0.2, speedRatio);
        e.walkTime = (e.walkTime || 0) + dt;
        const surgeIntensity = e.type === 'charger' ? 0.65 : (e.isBoss ? 0.38 : 0.48);
        const stridePulse = 1.0 + Math.sin(e.walkPhase) * surgeIntensity;
        e.y += speed * dt * Math.max(0.12, stridePulse);

        const prevStepIdx = Math.floor(prevPhase / Math.PI);
        const curStepIdx = Math.floor(e.walkPhase / Math.PI);
        if (curStepIdx > prevStepIdx) {
          e.leftFoot = (curStepIdx % 2 === 1);
          const footOffsetX = (e.leftFoot ? -1 : 1) * (e.radius * 0.45);
          const footY = e.y + e.radius * 0.75;
          if (e.isBoss) {
            this.spawnParticles(e.x + footOffsetX, footY, 'rgba(249, 115, 22, 0.6)', 3, 'smoke');
            this.spawnParticles(e.x + footOffsetX, footY, 'rgba(15, 23, 42, 0.75)', 2, 'smoke');
            this.feedback.addTrauma(0.035);
          } else if (e.type === 'behemoth') {
            this.spawnParticles(e.x + footOffsetX, footY, 'rgba(148, 163, 184, 0.55)', 2, 'smoke');
          } else if (e.type === 'charger') {
            this.spawnParticles(e.x + footOffsetX, footY, 'rgba(251, 146, 60, 0.5)', 2, 'spark');
          } else {
            this.spawnParticles(e.x + footOffsetX, footY, 'rgba(148, 163, 184, 0.38)', 1, 'smoke');
          }
        }

        const road = this.getRoadBounds(e.y);
        const targetX = road.left + road.roadWidth * (e.laneRatio || 0.5);
        e.x += (targetX - e.x) * Math.min(1, dt * 4.0);
        const margin = e.radius * 0.75 + 4;
        if (e.x < road.left + margin) e.x = road.left + margin;
        if (e.x > road.right - margin) e.x = road.right - margin;
      } else {
        e.y = targetY;
        e.attackTimer += dt;
        if (e.attackTimer >= e.attackCooldown) {
          e.attackTimer = 0;
          this.damageFortress(e.attackPower);
        }
      }
    }

    for (let i = 0; i < this.enemies.length; i++) {
      if (!this.enemies[i].active) this.enemyPool.release(this.enemies[i]);
    }
    ObjectPool.compact(this.enemies);

    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i];
      if (!g.active) continue;
      g.timer = (g.timer || 0) + dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vx *= 0.92;
      g.vy *= 0.92;
      const dx = this.hero.x - g.x;
      const dy = this.hero.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist < this.hero.magnetRange) {
        const pull = Math.min(1, (this.hero.magnetRange - dist) / this.hero.magnetRange) * 480 * dt;
        g.x += (dx / dist) * pull;
        g.y += (dy / dist) * pull;
      }
      if (dist < 28) {
        g.active = false;
        this.gemPool.release(g);
        this.gainExp(g.val || 5);
        sound.playPickup && sound.playPickup();
      }
    }
    ObjectPool.compact(this.gems);

    for (let i = 0; i < this.teslaArcs.length; i++) {
      const arc = this.teslaArcs[i];
      if (!arc.active) continue;
      arc.life -= dt;
      if (arc.life <= 0) arc.active = false;
    }
    ObjectPool.compact(this.teslaArcs);

    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;
      sw.life -= dt;
      const t = 1 - sw.life / sw.maxLife;
      sw.radius = sw.maxRadius * t;
      if (sw.life <= 0) sw.active = false;
    }
    ObjectPool.compact(this.shockwaves);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'smoke') p.vy -= 20 * dt;
      if (p.life <= 0) {
        p.active = false;
        this.particlePool.release(p);
      }
    }
    ObjectPool.compact(this.particles);

    for (let i = 0; i < this.damageTexts.length; i++) {
      const t = this.damageTexts[i];
      if (!t.active) continue;
      t.life -= dt;
      t.y += t.vy * dt;
      t.scale += (t.targetScale - t.scale) * Math.min(1, dt * 12);
      if (t.life <= 0) {
        t.active = false;
        this.textPool.release(t);
      }
    }
    ObjectPool.compact(this.damageTexts);

    for (let i = 0; i < this.hitRings.length; i++) {
      const hr = this.hitRings[i];
      if (!hr.active) continue;
      hr.life -= dt;
      const t = 1 - hr.life / hr.maxLife;
      hr.radius = hr.maxRadius * t;
      if (hr.life <= 0) {
        hr.active = false;
        this.hitRingPool.release(hr);
      }
    }
    ObjectPool.compact(this.hitRings);

    this.hud.updateHUD(this);
  }

  damageFortress(dmg) {
    this.fortress.shieldRegenTimer = 0;
    this.fortress.hitFlash = 0.2;
    this.feedback.addTrauma(0.25);

    if (this.fortress.shield > 0) {
      this.fortress.shield -= dmg;
      if (this.fortress.shield < 0) {
        const overflow = -this.fortress.shield;
        this.fortress.shield = 0;
        this.fortress.hp -= overflow;
        if (this.synergies.fortressEmp) {
          this.synergySystem.triggerShieldBreakEmp();
        }
      }
    } else {
      this.fortress.hp -= dmg;
    }

    if (this.fortress.hp <= 0) {
      this.fortress.hp = 0;
      this.isGameOver = true;
      const result = saveManager.recordRun({
        wave: this.waveSystem.wave,
        kills: this.kills,
        survivalTime: this.survivalTime,
        synergies: this.synergies
      });
      this.hud.showGameOverModal(this);
    }
  }
}
