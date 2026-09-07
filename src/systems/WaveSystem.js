// ---------------- 波次控制与刷怪推进系统 (Wave & Spawn System) ----------------
import { GAME_CONFIG } from '../core/Config.js';
import { sound } from './SoundEngine.js';

export class WaveSystem {
  constructor(game) {
    this.game = game;
    this.wave = 1;
    this.waveTimer = 0;
    this.waveDuration = 30;
    this.waveSpawnTimer = 0;
    this.waveEnemySpawnInterval = 1.2;
    this.waveTotalToSpawn = 15;
    this.waveSpawnedCount = 0;
  }

  reset() {
    this.wave = 1;
    this.waveTimer = 0;
    this.waveSpawnTimer = 0;
    this.waveSpawnedCount = 0;
    this.waveTotalToSpawn = GAME_CONFIG.difficulty.getWaveEnemyCount(1);
    this.waveEnemySpawnInterval = GAME_CONFIG.difficulty.getWaveSpawnInterval(1);
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.game.wave = waveNum;
    this.waveTimer = 0;
    this.waveSpawnTimer = 0;
    this.waveSpawnedCount = 0;
    this.waveTotalToSpawn = GAME_CONFIG.difficulty.getWaveEnemyCount(waveNum);
    this.waveEnemySpawnInterval = GAME_CONFIG.difficulty.getWaveSpawnInterval(waveNum);

    const isBossWave = waveNum % 5 === 0;
    this.game.hud.showWaveBanner(waveNum, isBossWave);

    if (isBossWave) {
      sound.playBossAlert();
      this.game.feedback.addTrauma(0.5);
      setTimeout(() => {
        if (!this.game.isGameOver) this.spawnBoss();
      }, 1200);
    } else {
      sound.playAlarm();
    }
  }

  update(dt) {
    this.waveTimer += dt;
    this.waveSpawnTimer += dt;

    if (this.waveSpawnedCount < this.waveTotalToSpawn) {
      if (this.waveSpawnTimer >= this.waveEnemySpawnInterval) {
        this.waveSpawnTimer = 0;
        this.spawnEnemy();
      }
    } else if (this.game.enemies.length === 0 && (!this.game.activeBoss || !this.game.activeBoss.active)) {
      this.startWave(this.wave + 1);
    }
  }

  spawnEnemy() {
    const enemy = this.game.enemyPool.get();
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
    const waveScale = GAME_CONFIG.difficulty.getEnemyWaveScale(this.wave);
    const cfg = GAME_CONFIG.enemies[type];

    enemy.radius = cfg.radius;
    enemy.maxHp = enemy.hp = Math.round(cfg.baseHp * waveScale);
    enemy.speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    enemy.attackPower = cfg.attackPower;
    enemy.attackCooldown = cfg.attackCooldown;
    enemy.color = cfg.color;
    enemy.expVal = cfg.expVal;

    const road = this.game.getRoadBounds(0);
    const lanes = [0.18, 0.38, 0.62, 0.82];
    enemy.laneRatio = lanes[Math.floor(Math.random() * lanes.length)];
    enemy.x = road.left + road.roadWidth * enemy.laneRatio;
    enemy.y = -enemy.radius - Math.random() * 20;
    enemy.vx = 0;
    enemy.vy = enemy.speed;
    enemy.hitFlash = 0;
    enemy.hitStagger = 0;
    enemy.burnTimer = 0;
    enemy.burnDps = 0;
    enemy.freezeTimer = 0;
    enemy.freezeFactor = 1.0;
    enemy.attackTimer = 0;
    enemy.walkTime = Math.random() * 5;
    enemy.stepTimer = 0;
    enemy.leftFoot = Math.random() > 0.5;

    this.game.enemies.push(enemy);
    this.waveSpawnedCount++;
  }

  spawnBoss(spawnY = null) {
    if (this.game.activeBoss && this.game.activeBoss.active) return;

    const boss = this.game.enemyPool.get();
    boss.active = true;
    boss.isBoss = true;
    boss.type = 'mutant_overlord';

    const bossScale = GAME_CONFIG.difficulty.getBossWaveScale(this.wave);
    const cfg = GAME_CONFIG.enemies.boss_overlord;

    boss.radius = cfg.radius;
    boss.maxHp = boss.hp = Math.round(cfg.baseHp * bossScale);
    boss.speed = cfg.speed;
    boss.attackPower = cfg.attackPower;
    boss.attackCooldown = cfg.attackCooldown;
    boss.color = cfg.color;
    boss.expVal = cfg.expVal;

    const road = this.game.getRoadBounds(0);
    boss.laneRatio = 0.5;
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
    boss.stompTimer = cfg.stompInterval;

    this.game.enemies.push(boss);
    this.game.activeBoss = boss;

    sound.playBossAlert();
    this.game.feedback.addTrauma(0.65);
    this.game.spawnParticles(boss.x, 80, '#ff2a5f', 30, 'fire');
  }
}
