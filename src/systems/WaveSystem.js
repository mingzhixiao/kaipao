// ---------------- 波次控制与关卡推进系统 (Wave & Stage System) ----------------
import { GAME_CONFIG } from '../core/Config.js';
import { sound } from './SoundEngine.js';
import { saveManager } from './SaveManager.js';
import { LevelDesignSystem } from './LevelDesignSystem.js';
import { gameEvents } from '../core/GameEventBus.js';
import { buildStageClearReward, getFortressStarRating } from './BattleRewardSystem.js';

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
    this.mode = saveManager.getMode() || 'normal';
    this.modeConfig = GAME_CONFIG.modes?.[this.mode] || GAME_CONFIG.modes.normal;
    this.difficultyMult = (this.stageConfig?.difficulty || 1.0) * (this.modeConfig.hpMult || 1.0);
    this.game.stageId = stageId;
    this.game.stageMode = this.mode;
    const modeTag = this.mode === 'elite' ? ' [精英]' : '';
    this.game.stageName = (this.stageConfig?.name || `关卡 ${stageId}`) + modeTag;
  }

  reset() {
    this.setStage(this.stageId || 1);
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
    const countMult = this.modeConfig?.countMult || 1.0;
    return Math.max(6, Math.round(base * (0.85 + this.difficultyMult * 0.15) * this.levelDesign.getCountMultiplier(plan) * countMult));
  }

  calcSpawnInterval(wave) {
    const base = GAME_CONFIG.difficulty.getWaveSpawnInterval(wave);
    const plan = this.levelDesign.getPlan(this.stageId, wave, this.stageConfig);
    const intervalDiv = (this.mode === 'elite' ? 1.25 : 1.0);
    return Math.max(0.24, (base * this.levelDesign.getIntervalMultiplier(plan) / (0.9 + this.difficultyMult * 0.1)) / intervalDiv);
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
      const bossPendingOrAlive = this.isBossWave && (!this.bossSpawned || (this.game.activeBoss && this.game.activeBoss.active));
      const allDefeated = this.game.enemies.length === 0 && !bossPendingOrAlive;

      if (allDefeated) {
        const clearWaves = this.stageConfig?.clearWaves || 0;
        const isEndless = !!this.stageConfig?.endless;
        if (!isEndless && clearWaves > 0 && this.wave >= clearWaves) {
          this.onStageClear();
          return;
        }

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
    if (this.stageCleared || this.game.battleSettled) return;
    this.stageCleared = true;
    this.game.battleSettled = true;
    this.game.isPaused = true;
    const hpRatio = Math.max(0, Math.min(1, this.game.fortress.hp / this.game.fortress.maxHp));
    const stars = getFortressStarRating(this.game.fortress.hp, this.game.fortress.maxHp);
    const clearReward = buildStageClearReward({ stars, stageConfig: this.stageConfig, mode: this.mode, modeConfig: this.modeConfig || GAME_CONFIG.modes.normal, wave: this.wave });

    // 击杀掉落和星级通关奖励分别累计，保证撤离逻辑不会误发通关物资。
    if (!this.game.battleLoot) this.game.battleLoot = { scrap: 0, gems: 0, items: {} };
    this.game.battleLoot.scrap = (this.game.battleLoot.scrap || 0) + clearReward.scrap;
    this.game.battleLoot.gems = (this.game.battleLoot.gems || 0) + clearReward.gems;
    Object.entries(clearReward.items).forEach(([itemId, count]) => { this.game.battleLoot.items[itemId] = (this.game.battleLoot.items[itemId] || 0) + count; });

    const settled = saveManager.settleBattleLoot(this.game.battleLoot, true, this.stageId);
    const result = saveManager.recordStageClear(this.stageId, 0, this.mode);

    this.game.lastStageReward = {
      stageId: this.stageId,
      stageName: this.stageConfig?.name || '',
      mode: this.mode,
      stars,
      ratingLabel: clearReward.ratingLabel,
      fortressHp: Math.ceil(this.game.fortress.hp),
      fortressMaxHp: this.game.fortress.maxHp,
      fortressHpPercent: Math.round(hpRatio * 100),
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

    let rawType = this.levelDesign.chooseEnemyType(this.wavePlan || DEFAULT_PLAN, this.wave);
    // 关卡怪物门禁：检查本关允许出现的怪物
    const allowed = this.stageConfig?.allowedEnemies || ['runner'];
    if (!allowed.includes(rawType)) {
      rawType = allowed[allowed.length - 1] || 'runner';
    }
    enemy.type = rawType;

    const waveScale = GAME_CONFIG.difficulty.getEnemyWaveScale(this.wave) * (this.stageConfig?.difficulty || 1.0) * (this.modeConfig?.hpMult || 1.0);
    const cfg = GAME_CONFIG.enemies[enemy.type] || GAME_CONFIG.enemies.runner;
    enemy.radius = cfg.radius;
    enemy.maxHp = enemy.hp = Math.max(25, Math.round(cfg.baseHp * waveScale));

    // 怪物装甲护盾系统：由关卡 shieldRatio、怪物 shieldMod 以及模式 shieldMult 联合决定
    const baseShieldRatio = this.stageConfig?.shieldRatio ?? 0;
    const modeShieldMult = this.modeConfig?.shieldMult || 1.0;
    const monsterShieldMod = cfg.shieldMod || 1.0;
    let rawShield = 0;
    if (baseShieldRatio > 0) {
      rawShield = Math.round(enemy.maxHp * baseShieldRatio * monsterShieldMod * modeShieldMult);
    }
    enemy.maxShield = enemy.shield = rawShield;

    enemy.speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    const atkMult = (this.modeConfig?.atkMult || 1.0) * (0.9 + (this.stageConfig?.difficulty || 1.0) * 0.1);
    enemy.attackPower = Math.round(cfg.attackPower * atkMult);
    enemy.attackCooldown = cfg.attackCooldown;
    enemy.color = cfg.color;
    enemy.expVal = cfg.expVal;
    const road = this.game.getRoadBounds(0);
    enemy.laneRatio = this.levelDesign.chooseLane(this.wavePlan, this.waveSpawnedCount);
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
    boss.active = true; boss.isBoss = true; boss.type = 'boss_overlord';

    const chId = this.stageConfig?.chapter || Math.min(5, Math.ceil((this.stageConfig?.id || 1) / 10));
    const isChapterBoss = !!this.stageConfig?.isChapterBoss;
    const isMiniBoss = !!this.stageConfig?.isMiniBoss;

    // 战区首领专属名称与主题色
    const BOSS_THEMES = {
      1: { name: isChapterBoss ? '废土处决霸主' : '哨站行刑官', color: '#ff2a5f', auraColor: '#ff2a5f' },
      2: { name: isChapterBoss ? '剧毒腐化母体' : '酸蚀突变先锋', color: '#10b981', auraColor: '#059669' },
      3: { name: isChapterBoss ? '熔核炎魔统领' : '炽热爆裂巨兽', color: '#f97316', auraColor: '#ea580c' },
      4: { name: isChapterBoss ? '机械歼灭神机' : '赛博要塞哨兵', color: '#06b6d4', auraColor: '#0891b2' },
      5: { name: isChapterBoss ? '母巢支配者·终末' : '深渊虚空行者', color: '#a855f7', auraColor: '#9333ea' },
      6: { name: '无尽终焉守望者', color: '#eab308', auraColor: '#ca8a04' }
    };
    const theme = BOSS_THEMES[chId] || BOSS_THEMES[1];
    boss.bossTitle = theme.name;
    boss.bossColor = theme.color;

    // 首领倍率调整：中首领 1.25x，大首领 1.6x
    const bossTierMult = isChapterBoss ? 1.6 : (isMiniBoss ? 1.25 : 1.0);
    const bossScale = GAME_CONFIG.difficulty.getBossWaveScale(this.wave) * (this.stageConfig?.difficulty || 1.0) * (this.modeConfig?.hpMult || 1.0) * bossTierMult;
    const cfg = GAME_CONFIG.enemies.boss_overlord;

    boss.radius = isChapterBoss ? Math.round(cfg.radius * 1.15) : cfg.radius;
    boss.maxHp = boss.hp = Math.round(cfg.baseHp * bossScale);

    // 首领专属高能偏转力场护盾：保底不低于生命值 45%，随战区递增可达 100%~200%
    const bossShieldRatio = Math.max(0.45, (this.stageConfig?.shieldRatio || 0.35) * (cfg.shieldMod || 1.6));
    boss.maxShield = boss.shield = Math.round(boss.maxHp * bossShieldRatio * (this.modeConfig?.shieldMult || 1.0));

    boss.speed = cfg.speed;
    boss.attackPower = Math.round(cfg.attackPower * (this.modeConfig?.atkMult || 1.0) * (this.stageConfig?.difficulty || 1.0) * (isChapterBoss ? 1.25 : 1.0));
    boss.attackCooldown = cfg.attackCooldown;
    boss.color = theme.color;
    boss.expVal = Math.round(cfg.expVal * bossTierMult);

    const road = this.game.getRoadBounds(0);
    boss.laneRatio = this.levelDesign.chooseLane(this.wavePlan, this.waveSpawnedCount); boss.x = road.left + road.roadWidth * boss.laneRatio;
    boss.y = spawnY !== null ? spawnY : (-boss.radius - 15);
    boss.vx = 0; boss.vy = boss.speed;
    boss.hitFlash = 0; boss.hitStagger = 0; boss.burnTimer = 0;
    boss.freezeTimer = 0; boss.freezeFactor = 1.0; boss.attackTimer = 0;
    boss.walkTime = 0; boss.stepTimer = 0; boss.stompTimer = cfg.stompInterval; boss.walkPhase = 0;
    this.game.enemies.push(boss);
    this.game.activeBoss = boss;
    sound.playBossAlert();
    this.game.feedback.addTrauma(isChapterBoss ? 0.85 : 0.65);
    this.game.spawnParticles(boss.x, 80, theme.auraColor, 36, 'fire');
  }
}

const DEFAULT_PLAN = {
  intensity: 0.5,
  bias: { runner: 0.5, charger: 0.35, behemoth: 0.15 },
  lane: 'spread'
};
