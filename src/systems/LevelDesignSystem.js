// ---------------- 关卡设计数据与节奏系统 (Level Design) ----------------
// 关卡由教学、压力、混合、休息、Boss 与车道空间模式组成，而不是单纯堆叠敌人数值。

const STAGE_DESIGNS = {
  1: { theme: 'teach', beats: [
    { type: 'teach', intensity: 0.20, rest: 1.8, bias: { runner: 1 }, lane: 'spread' },
    { type: 'test', intensity: 0.34, rest: 1.6, bias: { runner: 0.72, charger: 0.28 }, lane: 'alternating' },
    { type: 'pressure', intensity: 0.48, rest: 1.8, bias: { runner: 0.58, charger: 0.42 }, lane: 'center' },
    { type: 'mixed', intensity: 0.58, rest: 2.2, bias: { runner: 0.50, charger: 0.35, behemoth: 0.15 }, lane: 'flank' },
    { type: 'boss', intensity: 0.90, rest: 0, bias: { runner: 0.45, charger: 0.35, behemoth: 0.20 }, lane: 'center' }
  ] },
  2: { theme: 'rush', beats: [
    { type: 'teach', intensity: 0.34, rest: 1.6, bias: { runner: 0.60, charger: 0.40 }, lane: 'spread' },
    { type: 'rush', intensity: 0.50, rest: 1.4, bias: { runner: 0.45, charger: 0.55 }, lane: 'alternating' },
    { type: 'pressure', intensity: 0.60, rest: 1.6, bias: { runner: 0.42, charger: 0.48, behemoth: 0.10 }, lane: 'flank' },
    { type: 'mixed', intensity: 0.66, rest: 1.8, bias: { runner: 0.40, charger: 0.42, behemoth: 0.18 }, lane: 'center' },
    { type: 'boss', intensity: 0.92, rest: 2.2, bias: { runner: 0.35, charger: 0.40, behemoth: 0.25 }, lane: 'center' },
    { type: 'recovery', intensity: 0.48, rest: 1.6, bias: { runner: 0.55, charger: 0.35, behemoth: 0.10 }, lane: 'spread' },
    { type: 'finale', intensity: 0.82, rest: 0, bias: { runner: 0.35, charger: 0.40, behemoth: 0.25 }, lane: 'flank' }
  ] },
  3: { theme: 'heavy', beats: [
    { type: 'teach', intensity: 0.46, rest: 1.6, bias: { runner: 0.50, charger: 0.40, behemoth: 0.10 }, lane: 'spread' },
    { type: 'pressure', intensity: 0.58, rest: 1.4, bias: { runner: 0.42, charger: 0.42, behemoth: 0.16 }, lane: 'alternating' },
    { type: 'elite', intensity: 0.70, rest: 2.0, bias: { runner: 0.35, charger: 0.35, behemoth: 0.30 }, lane: 'center' },
    { type: 'boss', intensity: 0.95, rest: 2.4, bias: { runner: 0.30, charger: 0.35, behemoth: 0.35 }, lane: 'center' },
    { type: 'recovery', intensity: 0.52, rest: 1.6, bias: { runner: 0.50, charger: 0.35, behemoth: 0.15 }, lane: 'spread' },
    { type: 'mixed', intensity: 0.72, rest: 1.8, bias: { runner: 0.34, charger: 0.36, behemoth: 0.30 }, lane: 'flank' },
    { type: 'elite', intensity: 0.78, rest: 1.8, bias: { runner: 0.30, charger: 0.35, behemoth: 0.35 }, lane: 'alternating' },
    { type: 'finale', intensity: 0.98, rest: 0, bias: { runner: 0.28, charger: 0.34, behemoth: 0.38 }, lane: 'flank' }
  ] }
};

const DEFAULT_BEAT = { type: 'pressure', intensity: 0.55, rest: 1.5, bias: { runner: 0.45, charger: 0.40, behemoth: 0.15 }, lane: 'spread' };

export class LevelDesignSystem {
  constructor(game) {
    this.game = game;
    this.lastPlan = null;
  }

  getPlan(stageId, wave, stageConfig = {}) {
    const design = STAGE_DESIGNS[stageId];
    const clearWaves = stageConfig.clearWaves || 0;
    const beats = design?.beats || [];
    let beat = beats[Math.min(Math.max(wave - 1, 0), beats.length - 1)] || DEFAULT_BEAT;

    if (wave > beats.length && clearWaves > beats.length) {
      const cycle = beats[(wave - 1) % beats.length] || DEFAULT_BEAT;
      beat = {
        ...cycle,
        intensity: Math.min(1, cycle.intensity + Math.min(0.16, (wave - beats.length) * 0.025)),
        rest: Math.max(0.8, cycle.rest - Math.min(0.7, (wave - beats.length) * 0.08))
      };
    }

    const plan = {
      stageId,
      wave,
      type: beat.type,
      intensity: beat.intensity,
      rest: beat.rest,
      bias: { ...beat.bias },
      lane: beat.lane || 'spread',
      boss: !!stageConfig.bossEvery && wave % stageConfig.bossEvery === 0,
      label: this.getLabel(beat.type)
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
    const lanes = [0.18, 0.38, 0.62, 0.82];
    switch (plan?.lane) {
      case 'center': return lanes[Math.random() > 0.5 ? 1 : 2];
      case 'flank': return lanes[spawnIndex % 2 === 0 ? 0 : 3];
      case 'alternating': return lanes[spawnIndex % lanes.length];
      default: return lanes[Math.floor(Math.random() * lanes.length)];
    }
  }

  getCountMultiplier(plan) {
    return 0.88 + plan.intensity * 0.24;
  }

  getIntervalMultiplier(plan) {
    return 1.10 - plan.intensity * 0.20;
  }
}
