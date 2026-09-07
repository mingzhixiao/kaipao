import { sound } from '../systems/SoundEngine.js';
import { FeedbackManager } from '../systems/FeedbackManager.js';
import { ObjectPool } from '../systems/ObjectPool.js';
import { assets } from '../systems/AssetManager.js';
import { GameRenderer } from '../render/GameRenderer.js';
import { HUDManager } from '../ui/HUDManager.js';
import { SynergySystem } from '../combat/SynergySystem.js';

// ---------------- 游戏核心主控类 (Game Core Controller) ----------------

export class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById('game-container');

    // 视口尺寸
    this.width = 450;
    this.height = 800;
    this.scale = 1;

    // 运行状态
    this.isPaused = false;
    this.isGameOver = false;
    this.isUpgrading = false;
    this.timeScale = 1.0;
    this.lastTime = performance.now();
    this.survivalTime = 0;

    // 子系统初始化
    this.feedback = new FeedbackManager(sound);
    this.renderer = new GameRenderer(this.ctx);
    this.hud = new HUDManager();
    this.synergySystem = new SynergySystem(this);

    this.rerollAvailable = 1;

    // 战绩统计
    this.kills = 0;
    this.totalDamage = 0;

    // 玩家与防线数值
    this.fortress = {
      x: 0,
      y: 0,
      width: 0,
      height: 100,
      hp: 1000,
      maxHp: 1000,
      shield: 300,
      maxShield: 300,
      shieldRegenTimer: 0,
      shieldRegenDelay: 3.0,
      shieldRegenRate: 25,
      hitFlash: 0
    };

    this.hero = {
      x: 0,
      y: 0,
      angle: -Math.PI / 2,
      targetAngle: -Math.PI / 2,
      attackTimer: 0,
      baseAttackInterval: 0.22,
      recoil: 0,
      level: 1,
      exp: 0,
      expNeeded: 25,
      magnetRange: 130
    };

    // 武器属性与加成
    this.weapon = {
      damage: 35,
      critChance: 0.12,
      critMult: 2.0,
      bulletSpeed: 750,
      pierceCount: 1,
      multishot: 1,
      spreadAngle: 0.14
    };

    // 核心三大技能体系
    this.skills = {
      rocket: {
        level: 0,
        cooldown: 5.5,
        timer: 3.0,
        damage: 280,
        radius: 120,
        burnDuration: 4.5,
        burnDps: 45
      },
      truck: {
        level: 0,
        cooldown: 8.0,
        timer: 4.0,
        damage: 350,
        knockback: 180,
        speed: 480,
        width: 75,
        height: 105
      },
      freeze: {
        level: 0,
        cooldown: 7.0,
        timer: 5.0,
        duration: 1.2,
        activeTimer: 0,
        damagePerTick: 18,
        slowRatio: 0.2,
        range: 350,
        coneAngle: Math.PI * 0.45
      }
    };

    // 元素反应与战斗构筑词条
    this.synergies = {
      thermalEngine: false,
      teslaCoil: false,
      fortressEmp: false,
      truckInferno: false,
      cryoShatter: false
    };

    // 活动实体列表
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

    // 波次系统
    this.wave = 1;
    this.waveTimer = 0;
    this.waveDuration = 30;
    this.waveSpawnTimer = 0;
    this.waveEnemySpawnInterval = 1.2;
    this.waveTotalToSpawn = 15;
    this.waveSpawnedCount = 0;

    // 对象池管理
    this.initPools();

    // 绑定事件与初始化
    this.hud.initHUDListeners(this);
    this.bindInputEvents();
    this.resize();
    this.resetGame();

    // 启动主循环
    requestAnimationFrame(this.loop.bind(this));
  }

  initPools() {
    this.bulletPool = new ObjectPool(() => ({
      active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      damage: 0, isCrit: false, pierceLeft: 1,
      radius: 4, life: 2.0
    }), 80);

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
      hitFlash: 0,
      hitStagger: 0,
      hitStaggerTotal: 0.22,
      hitAngle: 0,
      burnTimer: 0, burnDps: 0,
      freezeTimer: 0, freezeFactor: 1.0,
      walkTime: 0,
      stepTimer: 0,
      stompTimer: 0
    }), 70);

    this.particlePool = new ObjectPool(() => ({
      active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      color: '#fff', size: 3, life: 1.0, maxLife: 1.0,
      type: 'spark'
    }), 180);

    this.gemPool = new ObjectPool(() => ({
      active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      val: 5, radius: 5,
      timer: 0,
      color: '#00f0ff'
    }), 80);

    this.textPool = new ObjectPool(() => ({
      active: false,
      text: '', x: 0, y: 0, vy: -45,
      color: '#fff', fontSize: 14,
      scale: 1.4, targetScale: 1.0,
      life: 0.7, maxLife: 0.7,
      isSpecial: false
    }), 60);

    this.hitRingPool = new ObjectPool(() => ({
      active: false,
      x: 0, y: 0,
      radius: 10, maxRadius: 28,
      life: 0.22, maxLife: 0.22,
      color: '#00f0ff'
    }), 40);
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
    this.fortress.hp = this.fortress.maxHp = 1000;
    this.fortress.shield = this.fortress.maxShield = 300;
    this.fortress.hitFlash = 0;

    this.hero.level = 1;
    this.hero.exp = 0;
    this.hero.expNeeded = 25;
    this.hero.magnetRange = 130;

    this.weapon.damage = 35;
    this.weapon.critChance = 0.12;
    this.weapon.critMult = 2.0;
    this.weapon.bulletSpeed = 750;
    this.weapon.pierceCount = 1;
    this.weapon.multishot = 1;
    this.hero.baseAttackInterval = 0.22;

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
    this.iceSpikes = [];
    this.teslaArcs = [];
    this.shockwaves = [];
    this.muzzleFlash = 0;

    this.wave = 1;
    this.startWave(1);

    this.bullets.forEach(b => this.bulletPool.release(b));
    this.bullets = [];
    this.enemies.forEach(e => this.enemyPool.release(e));
    this.enemies = [];
    this.gems.forEach(g => this.gemPool.release(g));
    this.gems = [];
    this.particles.forEach(p => this.particlePool.release(p));
    this.particles = [];
    this.damageTexts.forEach(t => this.textPool.release(t));
    this.damageTexts = [];
    this.burnZones = [];
    this.activeTrucks = [];
    this.hitRings.forEach(r => this.hitRingPool.release(r));
    this.hitRings = [];

    this.isGameOver = false;
    this.isPaused = false;
    this.isUpgrading = false;

    this.hud.updateHUD(this);
    this.hud.updateSkillHUD(this);
  }

  restart() {
    this.resetGame();
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.waveTimer = 0;
    this.waveSpawnTimer = 0;
    this.waveSpawnedCount = 0;
    this.waveTotalToSpawn = 12 + waveNum * 6;
    this.waveEnemySpawnInterval = Math.max(0.32, 1.3 - waveNum * 0.08);

    const isBossWave = waveNum % 5 === 0;
    this.hud.showWaveBanner(waveNum, isBossWave);

    if (isBossWave) {
      sound.playBossAlert();
      this.feedback.addTrauma(0.5);
      setTimeout(() => {
        if (!this.isGameOver) this.spawnBoss();
      }, 1200);
    } else {
      sound.playAlarm();
    }
  }

  spawnBoss(spawnY = null) {
    if (this.activeBoss && this.activeBoss.active) return;

    const boss = this.enemyPool.get();
    boss.active = true;
    boss.isBoss = true;
    boss.type = 'mutant_overlord';

    const waveScale = 1 + (this.wave - 1) * 0.35;
    boss.radius = 48;
    boss.maxHp = boss.hp = Math.round(1400 * waveScale);
    boss.speed = 48;
    boss.attackPower = 180;
    boss.color = '#ff2a5f';
    boss.expVal = 65;

    const road = this.getRoadBounds(0);
    boss.laneRatio = 0.5;
    boss.wanderFreq = 0.3;
    boss.wanderAmp = 0.02;
    boss.x = road.center;
    boss.y = spawnY !== null ? spawnY : (-boss.radius - 15);
    boss.vx = 0;
    boss.vy = boss.speed;
    boss.hitFlash = 0;
    boss.hitStagger = 0;
    boss.burnTimer = 0;
    boss.freezeTimer = 0;
    boss.freezeFactor = 1.0;
    boss.attackTimer = 0;
    boss.walkTime = 0;
    boss.stepTimer = 0;
    boss.stompTimer = 2.0;

    this.enemies.push(boss);
    this.activeBoss = boss;

    sound.playBossAlert();
    this.feedback.addTrauma(0.65);
    this.spawnParticles(boss.x, 80, '#ff2a5f', 30, 'fire');
  }

  getRoadBounds(y) {
    const left = 24;
    const right = this.width - 24;
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

  spawnEnemy() {
    const enemy = this.enemyPool.get();
    enemy.active = true;
    enemy.isBoss = false;

    const rand = Math.random();
    let type = 'runner';
    if (this.wave >= 2 && rand > 0.65) {
      type = 'charger';
    }
    if (this.wave >= 3 && (rand > 0.88 || (this.waveSpawnedCount === this.waveTotalToSpawn && this.wave % 3 === 0))) {
      type = 'behemoth';
    }

    enemy.type = type;
    const waveScale = 1 + (this.wave - 1) * 0.28;

    if (type === 'runner') {
      enemy.radius = 20;
      enemy.maxHp = enemy.hp = 80 * waveScale;
      enemy.speed = 70 + Math.random() * 25;
      enemy.attackPower = 35;
      enemy.color = '#10b981';
      enemy.expVal = 6;
    } else if (type === 'charger') {
      enemy.radius = 18;
      enemy.maxHp = enemy.hp = 55 * waveScale;
      enemy.speed = 135 + Math.random() * 30;
      enemy.attackPower = 25;
      enemy.color = '#f59e0b';
      enemy.expVal = 9;
    } else if (type === 'behemoth') {
      enemy.radius = 36;
      enemy.maxHp = enemy.hp = 380 * waveScale;
      enemy.speed = 40 + Math.random() * 15;
      enemy.attackPower = 95;
      enemy.color = '#ef4444';
      enemy.expVal = 32;
    }

    const road = this.getRoadBounds(0);
    const laneRatio = 0.05 + Math.random() * 0.90;

    enemy.laneRatio = laneRatio;
    enemy.wanderFreq = 0.5 + Math.random() * 1.0;
    enemy.wanderAmp = 0.03 + Math.random() * 0.04;

    enemy.x = road.left + road.roadWidth * laneRatio;
    enemy.y = -enemy.radius - Math.random() * 40;
    enemy.vx = 0;
    enemy.vy = enemy.speed;
    enemy.hitFlash = 0;
    enemy.hitStagger = 0;
    enemy.burnTimer = 0;
    enemy.freezeTimer = 0;
    enemy.freezeFactor = 1.0;
    enemy.attackTimer = 0;
    enemy.walkTime = Math.random() * 10;
    enemy.stepTimer = 0;
    enemy.stompTimer = 0;

    this.enemies.push(enemy);
    this.waveSpawnedCount++;
  }

  updateAutoTarget() {
    if (this.enemies.length === 0) return;

    let bestEnemy = null;
    let highestThreat = -9999;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.active) continue;
      const distToFortress = this.fortress.y - e.y;
      const bossBonus = e.isBoss ? 300 : (e.type === 'behemoth' ? 120 : 0);
      const threat = (800 - distToFortress) * 1.5 + bossBonus;
      if (threat > highestThreat) {
        highestThreat = threat;
        bestEnemy = e;
      }
    }

    if (bestEnemy) {
      const targetAngle = Math.atan2(bestEnemy.y - this.hero.y, bestEnemy.x - this.hero.x);
      let diff = targetAngle - this.hero.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.hero.angle += diff * 0.18;
    }
  }

  shootWeapon() {
    const count = this.weapon.multishot;
    const baseAngle = this.hero.angle;
    const spread = this.weapon.spreadAngle;

    for (let i = 0; i < count; i++) {
      let angle = baseAngle;
      if (count > 1) {
        angle = baseAngle - ((count - 1) * spread) / 2 + i * spread;
      }

      const bullet = this.bulletPool.get();
      bullet.active = true;
      bullet.x = this.hero.x + Math.cos(angle) * 34;
      bullet.y = this.hero.y + Math.sin(angle) * 34;
      bullet.vx = Math.cos(angle) * this.weapon.bulletSpeed;
      bullet.vy = Math.sin(angle) * this.weapon.bulletSpeed;

      const isCrit = Math.random() < this.weapon.critChance;
      const dmg = this.weapon.damage * (isCrit ? this.weapon.critMult : 1.0);

      bullet.damage = Math.round(dmg);
      bullet.isCrit = isCrit;
      bullet.pierceLeft = this.weapon.pierceCount;
      bullet.life = 2.0;

      this.bullets.push(bullet);
    }

    this.hero.recoil = 6;
    this.muzzleFlash = 0.06;
    this.feedback.addTrauma(0.04);
    sound.playShoot();

    this.spawnParticles(this.hero.x + Math.cos(baseAngle) * 38, this.hero.y + Math.sin(baseAngle) * 38, '#00f0ff', 6, 'spark');
  }

  updateSkills(dt) {
    if (this.skills.rocket.level > 0) {
      this.skills.rocket.timer -= dt;
      if (this.skills.rocket.timer <= 0) {
        this.skills.rocket.timer = this.skills.rocket.cooldown;
        this.fireRocket();
      }
    }

    if (this.skills.truck.level > 0) {
      this.skills.truck.timer -= dt;
      if (this.skills.truck.timer <= 0) {
        this.skills.truck.timer = this.skills.truck.cooldown;
        this.launchArmoredTruck();
      }
    }

    if (this.skills.freeze.level > 0) {
      if (this.skills.freeze.activeTimer > 0) {
        this.skills.freeze.activeTimer -= dt;
        this.applyFreezeRay(dt);
      } else {
        this.skills.freeze.timer -= dt;
        if (this.skills.freeze.timer <= 0) {
          this.skills.freeze.timer = this.skills.freeze.cooldown;
          this.skills.freeze.activeTimer = this.skills.freeze.duration;
          sound.playFreeze();
        }
      }
    }

    this.hud.updateSkillHUD(this);
  }

  fireRocket() {
    if (this.enemies.length === 0) return;
    let targetX = this.width / 2;
    let targetY = 250;
    let maxCluster = -1;

    for (let i = 0; i < this.enemies.length; i++) {
      const e1 = this.enemies[i];
      if (!e1.active) continue;
      let count = 0;
      for (let j = 0; j < this.enemies.length; j++) {
        const e2 = this.enemies[j];
        if (!e2.active) continue;
        const dist = Math.hypot(e1.x - e2.x, e1.y - e2.y);
        if (dist < 100) count++;
      }
      if (count > maxCluster) {
        maxCluster = count;
        targetX = e1.x;
        targetY = e1.y;
      }
    }

    const startX = this.hero.x + (Math.random() * 40 - 20);
    const startY = this.hero.y;
    this.spawnRocketProjectile(startX, startY, targetX, targetY);
  }

  spawnRocketProjectile(sx, sy, tx, ty) {
    let progress = 0;
    const dur = 0.55;
    const rocketAnim = () => {
      if (this.isPaused || this.isGameOver) return;
      progress += 0.016 * this.timeScale;
      const t = Math.min(1, progress / dur);
      const cx = sx + (tx - sx) * t;
      const cy = sy + (ty - sy) * t - Math.sin(t * Math.PI) * 80;

      this.spawnParticles(cx, cy, '#ff7700', 3, 'fire');

      if (t < 1) {
        requestAnimationFrame(rocketAnim);
      } else {
        this.detonateRocket(tx, ty);
      }
    };
    requestAnimationFrame(rocketAnim);
  }

  detonateRocket(x, y) {
    const rad = this.skills.rocket.radius * (1 + (this.skills.rocket.level - 1) * 0.2);
    const dmg = this.skills.rocket.damage * (1 + (this.skills.rocket.level - 1) * 0.35);

    this.feedback.addTrauma(0.55);
    this.feedback.triggerHitStop(0.04);
    sound.playExplosion();

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.active) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= rad) {
        const falloff = 1 - (d / rad) * 0.4;
        const finalDmg = Math.round(dmg * falloff);
        this.damageEnemy(e, finalDmg, true, 'rocket', e.x - x, e.y - y);
      }
    }

    this.spawnParticles(x, y, '#ff4400', 45, 'fire');
    this.spawnParticles(x, y, '#ffcc00', 35, 'spark');

    this.burnZones.push({
      x: x,
      y: y,
      radius: rad * 0.85,
      life: this.skills.rocket.burnDuration,
      maxLife: this.skills.rocket.burnDuration,
      tickTimer: 0
    });
  }

  launchArmoredTruck() {
    sound.playTruckRumble();
    this.feedback.addTrauma(0.38);

    const road = this.getRoadBounds(this.fortress.y);
    const laneRatio = 0.15 + Math.random() * 0.70;
    const startX = road.left + road.roadWidth * laneRatio;

    this.activeTrucks.push({
      x: startX,
      laneRatio: laneRatio,
      y: this.fortress.y + 20,
      width: this.skills.truck.width,
      height: this.skills.truck.height,
      speed: this.skills.truck.speed,
      damage: this.skills.truck.damage * (1 + (this.skills.truck.level - 1) * 0.4),
      hitEnemies: new Set(),
      infernoTimer: 0
    });
  }

  applyFreezeRay(dt) {
    const cone = this.skills.freeze.coneAngle;
    const range = this.skills.freeze.range;
    const heroAngle = this.hero.angle;

    for (let i = 0; i < 4; i++) {
      const randAngle = heroAngle + (Math.random() - 0.5) * cone;
      const dist = Math.random() * range;
      const px = this.hero.x + Math.cos(randAngle) * dist;
      const py = this.hero.y + Math.sin(randAngle) * dist;
      this.spawnParticles(px, py, '#00f0ff', 1, 'ice');
    }

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.active) continue;
      const dist = Math.hypot(e.x - this.hero.x, e.y - this.hero.y);
      if (dist <= range) {
        const angleToEnemy = Math.atan2(e.y - this.hero.y, e.x - this.hero.x);
        let diff = Math.abs(angleToEnemy - heroAngle);
        while (diff > Math.PI) diff = Math.PI * 2 - diff;

        if (diff <= cone / 2) {
          e.freezeTimer = 2.2;
          e.freezeFactor = this.skills.freeze.slowRatio;
          this.damageEnemy(e, this.skills.freeze.damagePerTick * dt * 25, false, 'freeze');
        }
      }
    }
  }

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

  damageEnemy(enemy, dmg, isCrit = false, type = 'normal', knockVx = 0, knockVy = 0) {
    if (!enemy.active || enemy.hp <= 0) return;

    // 1. 元素化学反应监测 (Thermal Shock / Cryo Shatter)
    if (enemy.freezeTimer > 0) {
      if (type === 'rocket' || type === 'fire' || this.synergies.thermalEngine) {
        this.synergySystem.triggerThermalShock(enemy, enemy.x, enemy.y);
        return;
      }
      if (type === 'truck' && this.synergies.cryoShatter) {
        this.synergySystem.triggerIceShatter(enemy, enemy.x, enemy.y);
      }
    }

    // 2. 暴击反馈与连锁电弧
    if (isCrit) {
      sound.playCritHit();
      this.feedback.addTrauma(0.12);
      this.feedback.triggerHitStop(0.025);
      if (this.synergies.teslaCoil) {
        this.synergySystem.triggerTeslaChain(enemy, dmg);
      }
    }

    // 3. 受击形变与顿挫 (Hit Reaction Stagger)
    enemy.hitFlash = 0.16;
    enemy.hitStagger = 0.22;
    enemy.hitStaggerTotal = 0.22;
    if (knockVx !== 0 || knockVy !== 0) {
      enemy.hitAngle = Math.atan2(knockVy, knockVx);
    }

    // 4. 浮动伤害数字
    let textColor = '#ffffff';
    if (isCrit) textColor = '#ffaa00';
    else if (type === 'fire' || type === 'rocket') textColor = '#ff7700';
    else if (type === 'freeze') textColor = '#38bdf8';
    else if (type === 'truck') textColor = '#e11d48';
    else if (type === 'emp') textColor = '#00f0ff';

    this.spawnDamageText(enemy.x, enemy.y - enemy.radius - 8, dmg, textColor, isCrit);

    enemy.hp -= dmg;
    this.totalDamage += dmg;

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    if (!enemy.active) return;
    enemy.active = false;
    this.kills++;

    if (enemy.isBoss) {
      sound.playExplosion();
      this.feedback.addTrauma(0.8);
      this.feedback.triggerHitStop(0.08);

      // 掉落 8 枚高能金色核心宝石
      for (let i = 0; i < 8; i++) {
        const g = this.gemPool.get();
        g.active = true;
        g.x = enemy.x;
        g.y = enemy.y;
        const angle = Math.random() * Math.PI * 2;
        const speed = 120 + Math.random() * 160;
        g.vx = Math.cos(angle) * speed;
        g.vy = Math.sin(angle) * speed;
        g.val = Math.round(enemy.expVal / 8);
        g.timer = 0;
        g.color = '#ffaa00';
        this.gems.push(g);
      }

      this.spawnParticles(enemy.x, enemy.y, '#ff0055', 45, 'fire');
      this.spawnParticles(enemy.x, enemy.y, '#ffaa00', 35, 'spark');
      this.spawnDamageText(enemy.x, enemy.y - 30, '👑 首领击破!!', '#ffaa00', true, true);
      this.activeBoss = null;
    } else {
      const g = this.gemPool.get();
      g.active = true;
      g.x = enemy.x;
      g.y = enemy.y;
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 60 + Math.random() * 80;
      g.vx = Math.cos(angle) * speed;
      g.vy = Math.sin(angle) * speed;
      g.val = enemy.expVal || 5;
      g.timer = 0;
      g.color = enemy.type === 'behemoth' ? '#ffaa00' : (enemy.type === 'charger' ? '#f59e0b' : '#00f0ff');
      this.gems.push(g);

      this.spawnParticles(enemy.x, enemy.y, enemy.color || '#ff2a5f', 8, 'spark');
    }
  }

  gainExp(amount) {
    this.hero.exp += amount;
    if (this.hero.exp >= this.hero.expNeeded) {
      this.hero.exp -= this.hero.expNeeded;
      this.hero.level++;
      this.hero.expNeeded = Math.round(this.hero.expNeeded * 1.35 + 10);
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
        this.fortress.shield = Math.min(this.fortress.maxShield, this.fortress.shield + this.fortress.shieldRegenRate * dt);
      }
    }

    this.waveTimer += dt;
    this.waveSpawnTimer += dt;

    if (this.waveSpawnedCount < this.waveTotalToSpawn) {
      if (this.waveSpawnTimer >= this.waveEnemySpawnInterval) {
        this.waveSpawnTimer = 0;
        this.spawnEnemy();
      }
    } else if (this.enemies.length === 0 && (!this.activeBoss || !this.activeBoss.active)) {
      this.startWave(this.wave + 1);
    }

    this.updateAutoTarget();
    this.hero.attackTimer += dt;
    if (this.hero.attackTimer >= this.hero.baseAttackInterval) {
      this.hero.attackTimer = 0;
      this.shootWeapon();
    }
    if (this.hero.recoil > 0) {
      this.hero.recoil = Math.max(0, this.hero.recoil - dt * 35);
    }

    this.updateSkills(dt);

    // 更新子弹
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height || b.life <= 0) {
        b.active = false;
        this.bulletPool.release(b);
        this.bullets.splice(i, 1);
        continue;
      }

      for (let j = 0; j < this.enemies.length; j++) {
        const e = this.enemies[j];
        if (!e.active) continue;

        const dist = Math.hypot(b.x - e.x, b.y - e.y);
        if (dist < b.radius + e.radius) {
          this.damageEnemy(e, b.damage, b.isCrit, 'normal', b.vx, b.vy);
          this.spawnParticles(b.x, b.y, b.isCrit ? '#ffcc00' : '#00f0ff', 4, 'spark');

          b.pierceLeft--;
          if (b.pierceLeft <= 0) {
            b.active = false;
            this.bulletPool.release(b);
            this.bullets.splice(i, 1);
            break;
          }
        }
      }
    }

    // 更新碎冰穿刺飞弹 (Ice Spikes)
    for (let i = this.iceSpikes.length - 1; i >= 0; i--) {
      const spike = this.iceSpikes[i];
      spike.x += spike.vx * dt;
      spike.y += spike.vy * dt;
      spike.life -= dt;

      if (spike.life <= 0 || spike.y < -50 || spike.x < 0 || spike.x > this.width) {
        this.iceSpikes.splice(i, 1);
        continue;
      }

      for (let j = 0; j < this.enemies.length; j++) {
        const e = this.enemies[j];
        if (!e.active) continue;
        if (Math.hypot(e.x - spike.x, e.y - spike.y) < e.radius + 8) {
          this.damageEnemy(e, spike.damage, false, 'freeze', spike.vx, spike.vy);
          this.spawnParticles(spike.x, spike.y, '#00f0ff', 3, 'spark');
          spike.pierce--;
          if (spike.pierce <= 0) {
            this.iceSpikes.splice(i, 1);
            break;
          }
        }
      }
    }

    // 更新怪物
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.active) {
        this.enemyPool.release(e);
        this.enemies.splice(i, 1);
        continue;
      }

      if (e.freezeTimer > 0) {
        e.freezeTimer -= dt;
        e.freezeFactor = this.skills.freeze.slowRatio;
      } else {
        e.freezeFactor = 1.0;
      }

      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.hitStagger > 0) e.hitStagger -= dt;

      // Boss 霸气重践踏
      if (e.isBoss && e.active) {
        e.stompTimer -= dt;
        if (e.stompTimer <= 0) {
          e.stompTimer = 3.6;
          this.feedback.addTrauma(0.42);
          sound.playExplosion();
          this.shockwaves.push({
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
        // 真实下行迈步推力动态学：脚踏地时发力前冲，悬空迈步时惯性微收，彻底告别平移滑冰感
        const stepRate = e.type === 'charger' ? 12 : (e.type === 'behemoth' ? 5 : 8);
        const stridePulse = 1.0 + Math.sin((e.walkTime || 0) * stepRate) * (e.type === 'charger' ? 0.38 : 0.26);
        e.y += speed * dt * Math.max(0.15, stridePulse);
        e.walkTime = (e.walkTime || 0) + dt * (speed / 14);
        e.stepTimer = (e.stepTimer || 0) + dt;

        const road = this.getRoadBounds(e.y);
        // 坚定沿所属车道笔直向防线突击，杜绝左右蛇形平移晃动
        const targetX = road.left + road.roadWidth * (e.laneRatio || 0.5);
        e.x += (targetX - e.x) * Math.min(1, dt * 4.0);

        const margin = e.radius * 0.75 + 4;
        if (e.x < road.left + margin) e.x = road.left + margin;
        if (e.x > road.right - margin) e.x = road.right - margin;

        // 踏地触地粒子：在左脚与右脚交替触地时喷射微小沥青尘埃
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

    // 更新灼烧区域
    for (let i = this.burnZones.length - 1; i >= 0; i--) {
      const bz = this.burnZones[i];
      bz.life -= dt;
      bz.tickTimer += dt;

      if (Math.random() < 0.4) {
        const pAngle = Math.random() * Math.PI * 2;
        const pDist = Math.random() * bz.radius;
        this.spawnParticles(bz.x + Math.cos(pAngle) * pDist, bz.y + Math.sin(pAngle) * pDist, '#ff5722', 1, 'fire');
      }

      if (bz.tickTimer >= 0.3) {
        bz.tickTimer = 0;
        const dpsTick = this.skills.rocket.burnDps * 0.3;
        for (let j = 0; j < this.enemies.length; j++) {
          const e = this.enemies[j];
          if (!e.active) continue;
          if (Math.hypot(e.x - bz.x, e.y - bz.y) <= bz.radius) {
            this.damageEnemy(e, dpsTick, false, 'fire');
          }
        }
      }

      if (bz.life <= 0) {
        this.burnZones.splice(i, 1);
      }
    }

    // 更新装甲战车
    for (let i = this.activeTrucks.length - 1; i >= 0; i--) {
      const truck = this.activeTrucks[i];
      truck.y -= truck.speed * dt;

      if (this.synergies.truckInferno) {
        truck.infernoTimer = (truck.infernoTimer || 0) + dt;
        if (truck.infernoTimer >= 0.16) {
          truck.infernoTimer = 0;
          this.burnZones.push({
            x: truck.x + (Math.random() * 20 - 10),
            y: truck.y + 45,
            radius: 40,
            life: 2.8,
            maxLife: 2.8,
            tickTimer: 0
          });
        }
      }

      const tRoad = this.getRoadBounds(truck.y);
      const targetTruckX = tRoad.left + tRoad.roadWidth * (truck.laneRatio || 0.5);
      truck.x += (targetTruckX - truck.x) * Math.min(1, dt * 4.5);

      this.spawnParticles(truck.x + (Math.random() * 30 - 15), truck.y + 40, '#94a3b8', 2, 'smoke');

      for (let j = 0; j < this.enemies.length; j++) {
        const e = this.enemies[j];
        if (!e.active || truck.hitEnemies.has(e)) continue;

        if (Math.abs(e.x - truck.x) < (truck.width / 2 + e.radius) &&
            Math.abs(e.y - truck.y) < (truck.height / 2 + e.radius)) {
          truck.hitEnemies.add(e);
          e.y -= this.skills.truck.knockback;
          this.damageEnemy(e, truck.damage, true, 'truck');
          this.spawnParticles(e.x, e.y, '#e11d48', 10, 'spark');
        }
      }

      if (truck.y < -150) {
        this.activeTrucks.splice(i, 1);
      }
    }

    // 更新经验晶核
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
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
          this.gems.splice(i, 1);
          continue;
        }
      }
    }

    // 更新电弧闪烁
    for (let i = this.teslaArcs.length - 1; i >= 0; i--) {
      const arc = this.teslaArcs[i];
      arc.life -= dt;
      if (arc.life <= 0) this.teslaArcs.splice(i, 1);
    }

    // 更新全屏冲击波
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) this.shockwaves.splice(i, 1);
    }

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.particlePool.release(p);
        this.particles.splice(i, 1);
      }
    }

    // 更新伤害飘字
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const t = this.damageTexts[i];
      t.y += t.vy * dt;
      t.life -= dt;
      if (t.scale && t.scale > t.targetScale) {
        t.scale = Math.max(t.targetScale, t.scale - dt * 3.5);
      }
      if (t.life <= 0) {
        t.active = false;
        this.textPool.release(t);
        this.damageTexts.splice(i, 1);
      }
    }

    // 更新受击冲击波光环
    for (let i = this.hitRings.length - 1; i >= 0; i--) {
      const r = this.hitRings[i];
      r.life -= dt;
      if (r.life <= 0) {
        r.active = false;
        this.hitRingPool.release(r);
        this.hitRings.splice(i, 1);
      }
    }

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

    // 护盾击碎过载触发 EMP
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
    this.hud.showGameOverModal(this);
  }
}
