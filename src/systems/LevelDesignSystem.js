// ---------------- 关卡设计数据与节奏系统 (Level Design) ----------------
// 关卡由教学、压力、混合、休息、Boss 与车道空间模式组成，而不是单纯堆叠敌人数值。

const STAGE_DESIGNS = {
  1: { theme: 'teach', beats: [
    { type: 'teach', intensity: 0.15, rest: 2.0, bias: { runner: 1.0 }, lane: 'spread' },
    { type: 'test', intensity: 0.22, rest: 1.8, bias: { runner: 1.0 }, lane: 'alternating' },
    { type: 'pressure', intensity: 0.30, rest: 1.8, bias: { runner: 1.0 }, lane: 'center' },
    { type: 'mixed', intensity: 0.38, rest: 2.0, bias: { runner: 1.0 }, lane: 'flank' },
    { type: 'boss', intensity: 0.65, rest: 0, bias: { runner: 1.0 }, lane: 'center' }
  ] },
  2: { theme: 'rush', beats: [
    { type: 'teach', intensity: 0.28, rest: 1.8, bias: { runner: 0.75, charger: 0.25 }, lane: 'spread' },
    { type: 'rush', intensity: 0.42, rest: 1.6, bias: { runner: 0.60, charger: 0.40 }, lane: 'alternating' },
    { type: 'pressure', intensity: 0.52, rest: 1.6, bias: { runner: 0.50, charger: 0.50 }, lane: 'flank' },
    { type: 'mixed', intensity: 0.58, rest: 1.8, bias: { runner: 0.45, charger: 0.55 }, lane: 'center' },
    { type: 'boss', intensity: 0.85, rest: 2.2, bias: { runner: 0.50, charger: 0.50 }, lane: 'center' },
    { type: 'recovery', intensity: 0.40, rest: 1.6, bias: { runner: 0.65, charger: 0.35 }, lane: 'spread' },
    { type: 'finale', intensity: 0.75, rest: 0, bias: { runner: 0.45, charger: 0.55 }, lane: 'flank' }
  ] },
  3: { theme: 'heavy', beats: [
    { type: 'teach', intensity: 0.40, rest: 1.6, bias: { runner: 0.55, charger: 0.35, behemoth: 0.10 }, lane: 'spread' },
    { type: 'pressure', intensity: 0.52, rest: 1.5, bias: { runner: 0.45, charger: 0.40, behemoth: 0.15 }, lane: 'alternating' },
    { type: 'elite', intensity: 0.64, rest: 1.8, bias: { runner: 0.35, charger: 0.40, behemoth: 0.25 }, lane: 'center' },
    { type: 'boss', intensity: 0.90, rest: 2.2, bias: { runner: 0.30, charger: 0.40, behemoth: 0.30 }, lane: 'center' },
    { type: 'recovery', intensity: 0.46, rest: 1.6, bias: { runner: 0.50, charger: 0.35, behemoth: 0.15 }, lane: 'spread' },
    { type: 'mixed', intensity: 0.68, rest: 1.8, bias: { runner: 0.35, charger: 0.35, behemoth: 0.30 }, lane: 'flank' },
    { type: 'elite', intensity: 0.74, rest: 1.8, bias: { runner: 0.30, charger: 0.35, behemoth: 0.35 }, lane: 'alternating' },
    { type: 'finale', intensity: 0.92, rest: 0, bias: { runner: 0.25, charger: 0.35, behemoth: 0.40 }, lane: 'flank' }
  ] }
};

const DEFAULT_BEAT = { type: 'pressure', intensity: 0.55, rest: 1.5, bias: { runner: 0.45, charger: 0.40, behemoth: 0.15 }, lane: 'spread' };

export class LevelDesignSystem {
  constructor(game) {
    this.game = game;
    this.lastPlan = null;
  }

  getPlan(stageId, wave, stageConfig = {}) {
    const clearWaves = stageConfig.clearWaves || 0;
    const isEndless = !!stageConfig.endless;
    const isBossWave = (stageConfig.bossEvery && wave % stageConfig.bossEvery === 0) || (!isEndless && clearWaves > 0 && wave === clearWaves);

    // 确定所属战区 (1..6)
    const chapterId = stageConfig.chapter || Math.min(5, Math.ceil(stageId / 10));

    // 根据战区与波次动态生成节奏 Beat
    let type = 'pressure';
    let intensity = Math.min(1.0, 0.2 + (stageId / 50) * 0.5 + (wave / 15) * 0.25);
    let rest = Math.max(1.0, 2.0 - (stageId / 50) * 0.8);
    let lane = 'spread';
    let bias = { runner: 0.7, charger: 0.3 };

    if (wave === 1) {
      type = stageId === 1 ? 'teach' : 'recovery';
      intensity = 0.25;
      rest = 2.0;
      lane = 'spread';
    } else if (isBossWave) {
      type = (!isEndless && wave === clearWaves) ? 'finale' : 'boss';
      intensity = 0.9 + Math.min(0.1, stageId * 0.002);
      rest = 2.2;
      lane = 'center';
    } else if (wave % 3 === 0) {
      type = 'rush';
      lane = 'alternating';
    } else if (wave % 4 === 0) {
      type = 'elite';
      lane = 'flank';
    } else {
      type = 'mixed';
      lane = 'spread';
    }

    // 怪物比重根据战区与怪物门禁动态分配
    const allowed = stageConfig.allowedEnemies || ['runner', 'charger', 'behemoth'];
    if (!allowed.includes('charger')) {
      bias = { runner: 1.0 };
    } else if (!allowed.includes('behemoth')) {
      bias = { runner: Math.max(0.3, 0.8 - wave * 0.05), charger: Math.min(0.7, 0.2 + wave * 0.05) };
    } else {
      if (chapterId === 1) {
        bias = { runner: 0.55, charger: 0.35, behemoth: 0.10 };
      } else if (chapterId === 2) {
        // 剧毒废墟：高疾行冲锋怪
        bias = { runner: 0.35, charger: 0.50, behemoth: 0.15 };
      } else if (chapterId === 3) {
        // 熔岩裂谷：重装高血量巨兽
        bias = { runner: 0.30, charger: 0.30, behemoth: 0.40 };
      } else if (chapterId === 4) {
        // 机械遗迹：攻守兼备
        bias = { runner: 0.35, charger: 0.35, behemoth: 0.30 };
      } else {
        // 虚空深渊：凶猛混合狂潮
        bias = { runner: 0.25, charger: 0.40, behemoth: 0.35 };
      }
    }

    const plan = {
      stageId,
      wave,
      type,
      intensity,
      rest,
      bias,
      lane,
      boss: isBossWave,
      label: this.getLabel(type)
    };
    this.lastPlan = plan;
    return plan;
  }

  getLabel(type) {
    return ({ teach: '教学波', test: '验证波', pressure: '压力波', rush: '疾袭波', mixed: '混合波', elite: '重装波', recovery: '整备波', boss: '首领战', finale: '决战波' })[type] || '战斗波';
  }

  chooseEnemyType(plan, wave) {
    const candidates = Object.entries(plan.bias || {});
    const total = candidates.reduce((sum, [, weight]) => sum + weight, 0) || 1;
    let roll = Math.random() * total;
    for (const [type, weight] of candidates) {
      roll -= weight;
      if (roll <= 0) {
        if (type === 'behemoth' && wave < 3) return 'charger';
        return type;
      }
    }
    return 'runner';
  }

  chooseLane(plan, spawnIndex = 0) {
    // 每只怪物独立随机选择道路横向位置，预留 12% 边缘空间避免大体型单位被裁切。
    return 0.12 + Math.random() * 0.76;
  }

  getCountMultiplier(plan) {
    return 0.88 + plan.intensity * 0.24;
  }

  getIntervalMultiplier(plan) {
    return 1.10 - plan.intensity * 0.20;
  }
}
