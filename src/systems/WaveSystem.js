// ---------------- 波次控制与关卡推进系统 (Wave & Stage System) ----------------
import { GAME_CONFIG } from '../core/Config.js';
import { sound } from './SoundEngine.js';
import { saveManager } from './SaveManager.js';

export class WaveSystem {
  constructor(game) {
    this.game = game;
    this.wave = 1;
    this.waveTimer = 0;
    this.waveSpawnTimer = 0;
    this.waveEnemySpawnInterval = 1.2;
    this.waveTotalToSpawn = 15;
    this.waveSpawnedCount = 0;
    this.stageId = saveManager.getUnlockedStage() || 1;
    this.stageConfig = null;
    this.stageCleared = false;
    this.difficultyMult = 1.0;
  }

  getStageConfig(stageId) {
    const stages = GAME_CONFIG.stages || [];
    return stages.find(s => s.id === stageId) || stages[0];
  }

  setStage(stageId) {
    const unlocked = saveManager.getUnlockedStage();
    if (stageId > unlocked) stageId = unlocked;
    this.stageId = stageId;
    this.stageConfig = this.getStageConfig(stageId);
    this.difficultyMult = this.stageConfig?.difficulty || 1.0;
    this.game.stageId = stageId;
    this.game.stageName = this.stageConfig?.name || `关卡 ${stageId}`;
  }

  reset() {
    if (!this.stageConfig) this.setStage(this.stageId || 1);
    this.wave = 1;
    this.waveTimer = 0;
    this.waveSpawnTimer = 0;
    this.waveSpawnedCount = 0;
    this.stageCleared = false;
    this.waveTotalToSpawn = this.calcEnemyCount(1);
    this.waveEnemySpawnInterval = this.calcSpawnInterval(1);
  }

  calcEnemyCount(wave) {
    const base = GAME_CONFIG.difficulty.getWaveEnemyCount(wave);
    return Math.round(base * (0.85 + this.difficultyMult * 0.15));
  }

  calcSpawnInterval(wave) {
    const base = GAME_CONFIG.difficulty.getWaveSpawnInterval(wave);
    return Math.max(0.22, base / (0.9 + this.difficultyMult * 0.1));
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.game.wave = waveNum;
    this.waveTimer = 0;
    this.waveSpawnTimer = 0;
    this.waveSpawnedCount = 0;
    this.waveTotalToSpawn = this.calcEnemyCount(waveNum);
    this.waveEnemySpawnInterval = this.calcSpawnInterval(waveNum);
    const bossEvery = this.stageConfig?.bossEvery || 5;
    const isBossWave = waveNum % bossEvery === 0;
    this.game.hud.showWaveBanner(waveNum, isBossWave, this.stageConfig);
    if (isBossWave) {
      sound.playBossAlert();
      this.game.feedback.addTrauma(0.5);
      setTimeout(() => {
        if (!this.game.isGameOver && !this.stageCleared) this.spawnBoss();
      }, 1200);
    } else {
      sound.playAlarm();
    }
  }

  update(dt) {
    if (this.stageCleared || this.game.isGameOver) return;
    this.waveTimer += dt;
    this.waveSpawnTimer += dt;
    if (this.waveSpawnedCount < this.waveTotalToSpawn) {
      if (this.waveSpawnTimer >= this.waveEnemySpawnInterval) {
        this.waveSpawnTimer = 0;
        this.spawnEnemy();
      }
    } else if (this.game.enemies.length === 0 && (!this.game.activeBoss || !this.game.activeBoss.active)) {
      const clearWaves = this.stageConfig?.clearWaves || 0;
      const isEndless = !!this.stageConfig?.endless;
      if (!isEndless && clearWaves > 0 && this.wave >= clearWaves) {
        this.onStageClear();
        return;
      }
      this.startWave(this.wave + 1);
    }
  }

  onStageClear() {
    if (this.stageCleared) return;
    this.stageCleared = true;
    this.game.isPaused = true;
    const base = this.stageConfig?.scrapReward || 50;
    const killBonus = Math.floor(this.game.kills * 0.4);
    const waveBonus = this.wave * 5;
    const scrap = base + killBonus + waveBonus;
    const result = saveManager.recordStageClear(this.stageId, scrap);
    this.game.lastStageReward = {
      stageId: this.stageId,
      stageName: this.stageConfig?.name || '',
      scrap,
      totalScrap: result.scrap,
      unlockedStage: result.unlockedStage
    };
    if (typeof sound.playLevelUp === 'function') sound.playLevelUp();
    this.game.feedback.addTrauma(0.4);
    this.game.hud.showStageClearModal(this.game);
  }

  spawnEnemy() {
    const enemy = this.game.enemyPool.get();
    enemy.active = true;
    enemy.isBoss = false;
    const rand = Math.random();
    let type = 'runner';
    if (this.wave >= 2 && rand > 0.65) type = 'charger';
    if (this.wave >= 3 && (rand > 0.88 || (this.waveSpawnedCount === this.waveTotalToSpawn && this.wave % 3 === 0))) type = 'behemoth';
    enemy.type = type;
    const waveScale = GAME_CONFIG.difficulty.getEnemyWaveScale(this.wave) * this.difficultyMult;
    const cfg = GAME_CONFIG.enemies[type];
    enemy.radius = cfg.radius;
    enemy.maxHp = enemy.hp = Math.round(cfg.baseHp * waveScale);
    enemy.speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    enemy.attackPower = Math.round(cfg.attackPower * (0.9 + this.difficultyMult * 0.1));
    enemy.attackCooldown = cfg.attackCooldown;
    enemy.color = cfg.color;
    enemy.expVal = cfg.expVal;
    const road = this.game.getRoadBounds(0);
    const lanes = [0.18, 0.38, 0.62, 0.82];
    enemy.laneRatio = lanes[Math.floor(Math.random() * lanes.length)];
    enemy.x = road.left + road.roadWidth * enemy.laneRatio;
    enemy.y = -enemy.radius - Math.random() * 20;
    enemy.vx = 0; enemy.vy = enemy.speed;
    enemy.hitFlash = 0; enemy.hitStagger = 0;
    enemy.burnTimer = 0; enemy.burnDps = 0;
    enemy.freezeTimer = 0; enemy.freezeFactor = 1.0;
    enemy.attackTimer = 0; enemy.walkTime = Math.random() * 5;
    enemy.stepTimer = 0; enemy.leftFoot = Math.random() > 0.5; enemy.walkPhase = 0;
    this.game.enemies.push(enemy);
    this.waveSpawnedCount++;
  }

  spawnBoss(spawnY = null) {
    if (this.game.activeBoss && this.game.activeBoss.active) return;
    const boss = this.game.enemyPool.get();
    boss.active = true; boss.isBoss = true; boss.type = 'mutant_overlord';
    const bossScale = GAME_CONFIG.difficulty.getBossWaveScale(this.wave) * this.difficultyMult;
    const cfg = GAME_CONFIG.enemies.boss_overlord;
    boss.radius = cfg.radius;
    boss.maxHp = boss.hp = Math.round(cfg.baseHp * bossScale);
    boss.speed = cfg.speed;
    boss.attackPower = Math.round(cfg.attackPower * this.difficultyMult);
    boss.attackCooldown = cfg.attackCooldown;
    boss.color = cfg.color; boss.expVal = cfg.expVal;
    const road = this.game.getRoadBounds(0);
    boss.laneRatio = 0.5; boss.x = road.center;
    boss.y = spawnY !== null ? spawnY : (-boss.radius - 15);
    boss.vx = 0; boss.vy = boss.speed;
    boss.hitFlash = 0; boss.hitStagger = 0; boss.burnTimer = 0;
    boss.freezeTimer = 0; boss.freezeFactor = 1.0; boss.attackTimer = 0;
    boss.walkTime = 0; boss.stepTimer = 0; boss.stompTimer = cfg.stompInterval; boss.walkPhase = 0;
    this.game.enemies.push(boss);
    this.game.activeBoss = boss;
    sound.playBossAlert();
    this.game.feedback.addTrauma(0.65);
    this.game.spawnParticles(boss.x, 80, '#ff2a5f', 30, 'fire');
  }
}
