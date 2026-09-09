// ---------------- 波次控制与关卡推进系统 (Wave & Stage System) ----------------
import { GAME_CONFIG } from '../core/Config.js';
import { sound } from './SoundEngine.js';
import { saveManager } from './SaveManager.js';
import { LevelDesignSystem } from './LevelDesignSystem.js';
import { gameEvents } from '../core/GameEventBus.js';

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
    this.levelDesign = new LevelDesignSystem(game);
    this.wavePlan = null;
    this.waveTransitionTimer = 0;
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
    this.waveTransitionTimer = 0;
    this.waveUpgradeTriggered = false;
    this.game.waveIntermission = false;
    this.waveStuckTimer = 0;
    this.isBossWave = false;
    this.bossSpawned = false;
    this.bossSpawnTimer = 0;
    this.wavePlan = this.levelDesign.getPlan(this.stageId, 1, this.stageConfig);
    this.waveTotalToSpawn = this.calcEnemyCount(1);
    this.waveEnemySpawnInterval = this.calcSpawnInterval(1);
  }

  calcEnemyCount(wave) {
    const base = GAME_CONFIG.difficulty.getWaveEnemyCount(wave);
    const plan = this.levelDesign.getPlan(this.stageId, wave, this.stageConfig);
    return Math.max(8, Math.round(base * (0.85 + this.difficultyMult * 0.15) * this.levelDesign.getCountMultiplier(plan)));
  }

  calcSpawnInterval(wave) {
    const base = GAME_CONFIG.difficulty.getWaveSpawnInterval(wave);
    const plan = this.levelDesign.getPlan(this.stageId, wave, this.stageConfig);
    return Math.max(0.24, base * this.levelDesign.getIntervalMultiplier(plan) / (0.9 + this.difficultyMult * 0.1));
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.game.wave = waveNum;
    this.waveTimer = 0;
    this.waveSpawnTimer = 0;
    this.waveSpawnedCount = 0;
    this.waveTransitionTimer = 0;
    this.waveUpgradeTriggered = false;
    this.game.waveIntermission = false;
    this.waveStuckTimer = 0;
    this.wavePlan = this.levelDesign.getPlan(this.stageId, waveNum, this.stageConfig);
    this.waveTotalToSpawn = this.calcEnemyCount(waveNum);
    this.waveEnemySpawnInterval = this.calcSpawnInterval(waveNum);
    this.isBossWave = !!this.wavePlan.boss;
    this.bossSpawned = false;
    this.bossSpawnTimer = 0;
    gameEvents.emit('wave_changed', { wave: waveNum, stageId: this.stageId, wavePlan: this.wavePlan });
    this.game.hud.showWaveBanner(waveNum, this.isBossWave, this.stageConfig, this.wavePlan);
    if (this.isBossWave) {
      sound.playBossAlert();
      this.game.feedback.addTrauma(0.5);
    } else {
      sound.playAlarm();
    }
  }

  update(dt) {
    if (this.stageCleared || this.game.isGameOver) return;
    this.waveTimer += dt;
    this.waveSpawnTimer += dt;

    // 首领波次平滑召唤计时（受暂停与时间缩放约束，彻底根除 setTimeout 异步漂移）
    if (this.isBossWave && !this.bossSpawned) {
      this.bossSpawnTimer += dt;
      if (this.bossSpawnTimer >= 1.2) {
        this.bossSpawned = true;
        this.spawnBoss();
      }
    }

    if (this.waveSpawnedCount < this.waveTotalToSpawn) {
      if (this.waveSpawnTimer >= this.waveEnemySpawnInterval) {
        this.waveSpawnTimer = 0;
        this.spawnEnemy();
      }
    } else {
      // 判定是否所有怪物（含 Boss）均已消灭
      const bossPendingOrAlive = this.isBossWave && (!this.bossSpawned || (this.game.activeBoss && this.game.activeBoss.active));
      const allDefeated = this.game.enemies.length === 0 && !bossPendingOrAlive;

      if (allDefeated) {
        const clearWaves = this.stageConfig?.clearWaves || 0;
        const isEndless = !!this.stageConfig?.endless;
        if (!isEndless && clearWaves > 0 && this.wave >= clearWaves) {
          this.onStageClear();
          return;
        }

        // 每通过一波怪物时触发技能抽取 (5秒不选自动选取并开启下一波)
        if (!this.waveUpgradeTriggered) {
          this.waveUpgradeTriggered = true;
          this.game.waveIntermission = true;
          if (typeof sound.playWaveClearFanfare === 'function') {
            sound.playWaveClearFanfare();
          }
          const nextWave = this.wave + 1;
          this.game.hud.showLevelUpModal(this.game, () => {
            this.game.waveIntermission = false;
            this.startWave(nextWave);
          });
          return;
        }
      }
    }

    // ---------------- 防卡死自愈看门狗 (Anti-Softlock Watchdog) ----------------
    // 当怪物已全部清空，且已标记波次结算，但游戏不在升级状态/弹窗未展示超过 0.8 秒时，自动推进波次或通关
    if (this.waveUpgradeTriggered && !this.game.isUpgrading && !this.stageCleared && !this.game.isGameOver) {
      this.waveStuckTimer = (this.waveStuckTimer || 0) + dt;
      if (this.waveStuckTimer >= 0.8) {
        this.waveStuckTimer = 0;
        this.waveUpgradeTriggered = false;
        this.game.waveIntermission = false;
        const clearWaves = this.stageConfig?.clearWaves || 0;
        const isEndless = !!this.stageConfig?.endless;
        if (!isEndless && clearWaves > 0 && this.wave >= clearWaves) {
          this.onStageClear();
        } else {
          this.startWave(this.wave + 1);
        }
      }
    } else {
      this.waveStuckTimer = 0;
    }
  }

  onStageClear() {
    if (this.stageCleared) return;
    this.stageCleared = true;
    this.game.isPaused = true;
    const base = this.stageConfig?.scrapReward || 50;
    const killBonus = Math.floor(this.game.kills * 0.4);
    const waveBonus = this.wave * 5;
    const stageClearScrap = base + killBonus + waveBonus;

    // 将通关奖励与本局战利品统一结算
    if (!this.game.battleLoot) this.game.battleLoot = { scrap: 0, gems: 0, items: {} };
    this.game.battleLoot.scrap = (this.game.battleLoot.scrap || 0) + stageClearScrap;
    // 通关保底奖励：获得 2~3 个强化碎片（力量/射速/攻速/弹匣）
    const clearShards = ['power_shard', 'bulletspeed_shard', 'attackspeed_shard', 'mag_shard'];
    const drop1 = clearShards[Math.floor(Math.random() * clearShards.length)];
    const drop2 = clearShards[Math.floor(Math.random() * clearShards.length)];
    this.game.battleLoot.items[drop1] = (this.game.battleLoot.items[drop1] || 0) + 2;
    this.game.battleLoot.items[drop2] = (this.game.battleLoot.items[drop2] || 0) + 2;

    if (Math.random() < 0.75) {
      this.game.battleLoot.items['supply_crate'] = (this.game.battleLoot.items['supply_crate'] || 0) + 1;
    }

    const settled = saveManager.settleBattleLoot(this.game.battleLoot, true, this.stageId);
    const result = saveManager.recordStageClear(this.stageId, 0);

    this.game.lastStageReward = {
      stageId: this.stageId,
      stageName: this.stageConfig?.name || '',
      scrap: settled.scrap,
      gems: settled.gems,
      items: settled.items,
      totalScrap: saveManager.getScrap(),
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
    enemy.type = this.levelDesign.chooseEnemyType(this.wavePlan || DEFAULT_PLAN, this.wave);
    const waveScale = GAME_CONFIG.difficulty.getEnemyWaveScale(this.wave) * this.difficultyMult;
    const cfg = GAME_CONFIG.enemies[enemy.type] || GAME_CONFIG.enemies.runner;
    enemy.radius = cfg.radius;
    enemy.maxHp = enemy.hp = Math.round(cfg.baseHp * waveScale);
    enemy.speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    enemy.attackPower = Math.round(cfg.attackPower * (0.9 + this.difficultyMult * 0.1));
    enemy.attackCooldown = cfg.attackCooldown;
    enemy.color = cfg.color;
    enemy.expVal = cfg.expVal;
    const road = this.game.getRoadBounds(0);
    const spawnIndex = this.waveSpawnedCount;
    enemy.laneRatio = this.levelDesign.chooseLane(this.wavePlan, spawnIndex);
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

const DEFAULT_PLAN = {
  intensity: 0.5,
  bias: { runner: 0.5, charger: 0.35, behemoth: 0.15 },
  lane: 'spread'
};
