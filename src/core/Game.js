import { sound } from '../systems/SoundEngine.js?v=2';
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

    // 视口尺寸与缩放
    this.width = GAME_CONFIG.viewport.baseWidth;
    this.height = GAME_CONFIG.viewport.baseHeight;
    this.scale = 1;

    // 运行与时间状态
    this.isPaused = false;
    this.isGameOver = false;
    this.isUpgrading = false;
    this.timeScale = 1.0;
    this.lastTime = performance.now();
    this.survivalTime = 0;
    this.heartbeatTimer = 0;

    // 子系统初始化
    this.feedback = new FeedbackManager(sound);
    this.renderer = new GameRenderer(this.ctx);
    this.hud = new HUDManager();
    this.synergySystem = new SynergySystem(this);
    this.waveSystem = new WaveSystem(this);
    this.combatSystem = new CombatSystem(this);

    this.rerollAvailable = 1;
    this.kills = 0;
    this.totalDamage = 0;

    // 防线基地数据结构
    this.fortress = {
      x: 0,
      y: 0,
      width: 0,
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

    // 指挥官主角
    this.hero = {
      x: 0,
      y: 0,
      angle: -Math.PI / 2,
      targetAngle: -Math.PI / 2,
      attackTimer: 0,
      baseAttackInterval: GAME_CONFIG.hero.baseAttackInterval,
      recoil: 0,
      level: 1,
      exp: 0,
      expNeeded: GAME_CONFIG.hero.expNeededBase,
      magnetRange: GAME_CONFIG.hero.magnetRange
    };

    // 主武器属性
    this.weapon = { ...GAME_CONFIG.weapon };

    // 三大战术技能
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

    // 元素反应与构筑词条
    this.synergies = {
      thermalEngine: false,
      teslaCoil: false,
      fortressEmp: false,
      truckInferno: false,
      cryoShatter: false
    };

    // 活动实体列表 (全量使用 In-Place 紧凑算法，0 splice 开销)
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

    // 初始化高性能对象池
    this.initPools();

    // 绑定事件与初始化
    this.hud.initHUDListeners(this);
    this.bindInputEvents();
    this.resize();
    this.resetGame();

    // 启动游戏主循环
    requestAnimationFrame(this.loop.bind(this));
  }

  initPools() {
    // 子弹池
    this.bulletPool = new ObjectPool(() => ({
      active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      damage: 0, isCrit: false, pierceLeft: 1,
      radius: 4, life: 2.0
    }), (b) => {
      b.x = 0; b.y = 0; b.vx = 0; b.vy = 0;
      b.damage = 0; b.isCrit = false; b.pierceLeft = 1;
    }, 80, 200);

    // 敌人怪物池
    this.enemyPool = new ObjectPool(() => ({
      active: false,
      type: 'runner',
      isBoss: false,
      x: 0, y: 0, vx: 0, vy: 0,
      hp: 100, maxHp: 100,
      speed: 80, radius: 18,
      color: '#38ef7d',
      expVal: 8,
      attackPower: 30, attackCooldown: 1.0, attackTimer: 0,
      hitFlash: 0, hitStagger: 0, hitStaggerTotal: 0.22, hitAngle: 0,
      burnTimer: 0, burnDps: 0,
      freezeTimer: 0, freezeFactor: 1.0,
      walkTime: 0, stepTimer: 0, stompTimer: 0
    }), (e) => {
      e.burnTimer = 0; e.burnDps = 0;
      e.freezeTimer = 0; e.freezeFactor = 1.0;
      e.hitFlash = 0; e.hitStagger = 0;
    }, 60, 150);

    // 粒子池
    this.particlePool = new ObjectPool(() => ({
      active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      color: '#fff', size: 3, life: 1.0, maxLife: 1.0,
      type: 'spark'
    }), null, 150, 400);

    // 经验晶核池
    this.gemPool = new ObjectPool(() => ({
      active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      val: 5, radius: 5, timer: 0,
      color: '#00f0ff'
    }), (g) => {
      g.timer = 0; g.vx = 0; g.vy = 0;
    }, 60, 150);

    // 浮动伤害文本池
    this.textPool = new ObjectPool(() => ({
      active: false,
      text: '', x: 0, y: 0, vy: -45,
      color: '#fff', fontSize: 14,
      scale: 1.4, targetScale: 1.0,
      life: 0.7, maxLife: 0.7,
      isSpecial: false, isCrit: false
    }), null, 50, 120);

    // 命中扩散光环池
    this.hitRingPool = new ObjectPool(() => ({
      active: false,
      x: 0, y: 0,
      radius: 10, maxRadius: 28,
      life: 0.22, maxLife: 0.22,
      color: '#00f0ff'
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

    // 通知渲染系统离屏背景需要根据新尺寸重塑
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
    this.canvas.addEventListener('mousemove', (e) => {
      if (e.buttons === 1) onPointer(e);
    });
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

    this.skills.rocket.level = 0;
    this.skills.truck.level = 0;
    this.skills.freeze.level = 0;

    this.synergies = {
      thermalEngine: false,
      teslaCoil: false,
      fortressEmp: false,
      truckInferno: false,
      cryoShatter: false
    };

    this.kills = 0;
    this.totalDamage = 0;
    this.survivalTime = 0;
    this.rerollAvailable = 1;
    this.activeBoss = null;

    // 清空活动实体与对象池回收
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

    if (this.emergencyOverlay) {
      this.emergencyOverlay.classList.remove('active');
    }

    this.combatSystem.reset();
    this.waveSystem.reset();
    this.waveSystem.startWave(1);

    this.hud.updateHUD(this);
    this.hud.updateSkillHUD(this);
  }

  restart() {
    this.resetGame();
  }

  getRoadBounds(y) {
    const left = GAME_CONFIG.viewport.roadMargin;
    const right = this.width - GAME_CONFIG.viewport.roadMargin;
    const roadWidth = right - left;
    const center = this.width / 2;

    return {
      left,
      right,
      center,
      roadWidth,
      leftLane: left + roadWidth * 0.25,
      centerLane: center,
      rightLane: left + roadWidth * 0.75
    };
  }

  // 快捷委托方法
  spawnEnemy() { this.waveSystem.spawnEnemy(); }
  spawnBoss(spawnY) { this.waveSystem.spawnBoss(spawnY); }
  shootWeapon() { this.combatSystem.shootWeapon(); }
  damageEnemy(e, dmg, isCrit, type, kx, ky) { this.combatSystem.onHit(e, dmg, isCrit, type, kx, ky); }
  killEnemy(e) { this.combatSystem.onKill(e); }

  spawnParticles(x, y, color, count, type = 'spark') {
    for (let i = 0; i < count; i++) {
      const p = this.particlePool.get();
      p.active = true;
      p.x = x;
      p.y = y;
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
    hr.x = x;
    hr.y = y;
    hr.radius = 8;
    hr.maxRadius = radius;
    hr.life = hr.maxLife = 0.24;
    hr.color = color;
    this.hitRings.push(hr);
  }

  spawnDamageText(x, y, text, color = '#ffffff', isCrit = false, isSpecial = false) {
    const t = this.textPool.get();
    t.active = true;
    t.x = x + (Math.random() * 16 - 8);
    t.y = y;
    t.vy = -55;
    t.text = typeof text === 'number' ? Math.round(text).toString() : text;
    t.color = color;
    t.isCrit = isCrit;
    t.isSpecial = isSpecial;
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

  triggerLevelUp() {
    this.hud.showLevelUpModal(this);
  }

  rerollUpgradeCards() {
    this.hud.rerollUpgradeCards(this);
  }

  // 主循环
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

    if (!this.isPaused && !this.isGameOver && !this.isUpgrading) {
      this.update(dt);
    }

    this.renderer.render(this);
    requestAnimationFrame(this.loop.bind(this));
  }

  updateSkills(dt) {
    const skills = this.skills;

    // 1. 温压火箭
    if (skills.rocket.level > 0) {
      skills.rocket.timer += dt;
      if (skills.rocket.timer >= skills.rocket.cooldown) {
        skills.rocket.timer = 0;
        let targetX = this.width / 2;
        let targetY = this.height * 0.38;

        if (this.enemies.length > 0) {
          const validEnemies = this.enemies.filter(e => e.active);
          if (validEnemies.length > 0) {
            const target = validEnemies[Math.floor(Math.random() * validEnemies.length)];
            targetX = target.x;
            targetY = target.y;
          }
        }
        this.combatSystem.launchRocket(targetX, targetY);
      }
    }

    // 2. 装甲战车
    if (skills.truck.level > 0) {
      skills.truck.timer += dt;
      if (skills.truck.timer >= skills.truck.cooldown) {
        skills.truck.timer = 0;
        this.combatSystem.launchArmoredTruck();
      }
    }

    // 3. 极寒射线
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

    if (this.muzzleFlash > 0) {
      this.muzzleFlash -= dt;
    }

    // 基地护盾自充能
    if (this.fortress.shield < this.fortress.maxShield) {
      this.fortress.shieldRegenTimer += dt;
      if (this.fortress.shieldRegenTimer >= this.fortress.shieldRegenDelay) {
        this.fortress.shield = Math.min(
          this.fortress.maxShield,
          this.fortress.shield + this.fortress.shieldRegenRate * dt
        );
      }
    }

    // 低血量红边闪烁与心跳音效反馈
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

    // 更新波次推进
    this.waveSystem.update(dt);

    // 自动瞄准与射击
    this.combatSystem.updateAutoTarget();
    this.hero.attackTimer += dt;
    if (this.hero.attackTimer >= this.hero.baseAttackInterval) {
      this.hero.attackTimer = 0;
      this.combatSystem.shootWeapon();
    }
    if (this.hero.recoil > 0) {
      this.hero.recoil = Math.max(0, this.hero.recoil - dt * 35);
    }

    // 更新三大主动技能
    this.updateSkills(dt);

    // 更新弹道、飞弹、战车与灼烧区 (CombatSystem 驱动)
    this.combatSystem.update(dt);

    // 更新怪物逻辑
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.active) continue;

      if (e.freezeTimer > 0) {
        e.freezeTimer -= dt;
        e.freezeFactor = this.skills.freeze.slowRatio;
      } else {
        e.freezeFactor = 1.0;
      }

      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.hitStagger > 0) e.hitStagger -= dt;

      // Boss 践踏冲击波
      if (e.isBoss) {
        e.stompTimer -= dt;
        if (e.stompTimer <= 0) {
          e.stompTimer = GAME_CONFIG.enemies.boss_overlord.stompInterval;
          this.feedback.addTrauma(0.42);
          sound.playExplosion();
          this.shockwaves.push({
            active: true,
            x: e.x,
            y: e.y + e.radius * 0.5,
            radius: 10,
            maxRadius: 240,
            life: 0.5,
            maxLife: 0.5,
            color: '#ff2a5f'
          });
        }
      }

      const speed = e.speed * e.freezeFactor;
      const targetY = this.fortress.y - e.radius + 12;

      if (e.y < targetY) {
        const stepRate = e.type === 'charger' ? 12 : (e.type === 'behemoth' ? 5 : 8);
        const stridePulse = 1.0 + Math.sin((e.walkTime || 0) * stepRate) * (e.type === 'charger' ? 0.38 : 0.26);
        e.y += speed * dt * Math.max(0.15, stridePulse);
        e.walkTime = (e.walkTime || 0) + dt * (speed / 14);
        e.stepTimer = (e.stepTimer || 0) + dt;

        const road = this.getRoadBounds(e.y);
        const targetX = road.left + road.roadWidth * (e.laneRatio || 0.5);
        e.x += (targetX - e.x) * Math.min(1, dt * 4.0);

        const margin = e.radius * 0.75 + 4;
        if (e.x < road.left + margin) e.x = road.left + margin;
        if (e.x > road.right - margin) e.x = road.right - margin;

        const stepInterval = e.type === 'charger' ? 0.18 : (e.type === 'behemoth' ? 0.38 : 0.24);
        if (e.stepTimer >= stepInterval) {
          e.stepTimer = 0;
          e.leftFoot = !e.leftFoot;
          const footOffsetX = (e.leftFoot ? -1 : 1) * (e.radius * 0.45);
          this.spawnParticles(e.x + footOffsetX, e.y + e.radius * 0.8, 'rgba(148, 163, 184, 0.4)', 1, 'smoke');
        }
      } else {
        e.y = targetY;
        e.attackTimer += dt;
        if (e.attackTimer >= e.attackCooldown) {
          e.attackTimer = 0;
          this.damageFortress(e.attackPower);
        }
      }
    }
    // 回收非活跃怪物并紧凑化
    for (let i = 0; i < this.enemies.length; i++) {
      if (!this.enemies[i].active) this.enemyPool.release(this.enemies[i]);
    }
    ObjectPool.compact(this.enemies);

    // 更新掉落晶核
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i];
      if (!g.active) continue;

      g.timer = (g.timer || 0) + dt;
      if (g.timer < 0.25) {
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.vx *= 0.92;
        g.vy *= 0.92;
      } else {
        const dx = this.hero.x - g.x;
        const dy = this.hero.y - g.y;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const flySpeed = Math.min(1200, 320 + (g.timer - 0.25) * 550);
        g.x += Math.cos(angle) * flySpeed * dt;
        g.y += Math.sin(angle) * flySpeed * dt;

        if (dist < 32 || g.y >= this.fortress.y + 15) {
          sound.playGemPickup();
          this.gainExp(g.val);
          this.spawnParticles(this.hero.x, this.hero.y, g.color || '#00f0ff', 2, 'spark');
          g.active = false;
          this.gemPool.release(g);
        }
      }
    }
    ObjectPool.compact(this.gems);

    // 更新特斯拉电弧
    for (let i = 0; i < this.teslaArcs.length; i++) {
      const arc = this.teslaArcs[i];
      arc.life -= dt;
      if (arc.life <= 0) arc.active = false;
    }
    ObjectPool.compact(this.teslaArcs);

    // 更新全屏冲击波
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) sw.active = false;
    }
    ObjectPool.compact(this.shockwaves);

    // 更新粒子
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.particlePool.release(p);
      }
    }
    ObjectPool.compact(this.particles);

    // 更新飘字
    for (let i = 0; i < this.damageTexts.length; i++) {
      const t = this.damageTexts[i];
      if (!t.active) continue;
      t.y += t.vy * dt;
      t.life -= dt;
      if (t.scale && t.scale > t.targetScale) {
        t.scale = Math.max(t.targetScale, t.scale - dt * 3.5);
      }
      if (t.life <= 0) {
        t.active = false;
        this.textPool.release(t);
      }
    }
    ObjectPool.compact(this.damageTexts);

    // 更新扩散光环
    for (let i = 0; i < this.hitRings.length; i++) {
      const r = this.hitRings[i];
      if (!r.active) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.active = false;
        this.hitRingPool.release(r);
      }
    }
    ObjectPool.compact(this.hitRings);

    this.hud.updateHUD(this);
  }

  damageFortress(dmg) {
    sound.playHit();
    this.feedback.addTrauma(0.35);
    this.fortress.hitFlash = 0.22;
    this.fortress.shieldRegenTimer = 0;

    let remainingDmg = dmg;
    const initialShield = this.fortress.shield;

    if (this.fortress.shield > 0) {
      if (this.fortress.shield >= remainingDmg) {
        this.fortress.shield -= remainingDmg;
        remainingDmg = 0;
      } else {
        remainingDmg -= this.fortress.shield;
        this.fortress.shield = 0;
      }
    }

    // 护盾过载击破触发 EMP
    if (initialShield > 0 && this.fortress.shield === 0 && this.synergies.fortressEmp) {
      this.synergySystem.triggerShieldBreakEmp();
    }

    if (remainingDmg > 0) {
      this.fortress.hp -= remainingDmg;
      if (this.fortress.hp <= 0) {
        this.fortress.hp = 0;
        this.gameOver();
      }
    }

    this.hud.updateHUD(this);
  }

  gameOver() {
    this.isGameOver = true;
    this.feedback.addTrauma(0.85);
    sound.playExplosion();

    // 记录战绩存档
    saveManager.recordRun({
      wave: this.wave,
      kills: this.kills,
      survivalTime: this.survivalTime,
      synergies: this.synergies
    });

    this.hud.showGameOverModal(this);
  }
}
