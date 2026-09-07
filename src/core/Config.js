// ---------------- 游戏核心数值与平衡性配置文件 (Game Design & Balance Config) ----------------

export const GAME_CONFIG = {
  // 视口与画布默认尺寸
  viewport: {
    baseWidth: 450,
    baseHeight: 800,
    roadMargin: 24
  },

  // 防线与基地
  fortress: {
    maxHp: 1000,
    maxShield: 300,
    shieldRegenDelay: 3.0,
    shieldRegenRate: 25,
    height: 100
  },

  // 指挥官主角基准
  hero: {
    baseAttackInterval: 0.22,
    minAttackInterval: 0.07,
    expNeededBase: 25,
    expNeededGrowth: 1.32,
    expNeededAdd: 8,
    magnetRange: 130
  },

  // 主武器与弹道属性
  weapon: {
    damage: 35,
    critChance: 0.12,
    critMult: 2.0,
    bulletSpeed: 750,
    bulletRadius: 4,
    bulletLife: 2.0,
    pierceCount: 1,
    multishot: 1,
    spreadAngle: 0.14
  },

  // 三大战略技能基准
  skills: {
    rocket: {
      cooldown: 5.5,
      minCooldown: 2.8,
      damage: 280,
      radius: 120,
      burnDuration: 4.5,
      burnDps: 45,
      flightDuration: 0.52
    },
    truck: {
      cooldown: 8.0,
      minCooldown: 3.8,
      damage: 350,
      knockback: 180,
      speed: 480,
      width: 75,
      height: 105
    },
    freeze: {
      cooldown: 7.0,
      minCooldown: 3.5,
      duration: 1.2,
      damagePerTick: 18,
      slowRatio: 0.2,
      range: 350,
      coneAngle: Math.PI * 0.45
    }
  },

  // 敌人类型与属性字典
  enemies: {
    runner: {
      radius: 20,
      baseHp: 80,
      speedMin: 70,
      speedMax: 95,
      attackPower: 35,
      attackCooldown: 1.0,
      expVal: 6,
      color: '#10b981'
    },
    charger: {
      radius: 18,
      baseHp: 55,
      speedMin: 135,
      speedMax: 165,
      attackPower: 25,
      attackCooldown: 0.8,
      expVal: 9,
      color: '#f59e0b'
    },
    behemoth: {
      radius: 36,
      baseHp: 380,
      speedMin: 45,
      speedMax: 60,
      attackPower: 80,
      attackCooldown: 1.4,
      expVal: 22,
      color: '#ef4444'
    },
    boss_overlord: {
      radius: 48,
      baseHp: 1400,
      speed: 48,
      attackPower: 180,
      attackCooldown: 1.2,
      expVal: 65,
      color: '#ff2a5f',
      stompInterval: 3.6
    }
  },

  // 难度曲线计算函数 (非线性平滑增长，避免后期难度断崖或过平)
  difficulty: {
    // 小怪生命缩放：前5波缓步提升，之后呈平滑二次方根曲线，兼顾爽感与压迫
    getEnemyWaveScale(wave) {
      if (wave <= 1) return 1.0;
      return 1.0 + Math.pow(wave - 1, 0.88) * 0.26;
    },
    // Boss 专属血量缩放
    getBossWaveScale(wave) {
      return 1.0 + (wave - 1) * 0.32;
    },
    // 每波敌人总数
    getWaveEnemyCount(wave) {
      return Math.round(12 + Math.pow(wave, 1.1) * 5);
    },
    // 刷怪间隔 (秒)
    getWaveSpawnInterval(wave) {
      return Math.max(0.28, 1.3 - Math.log2(wave + 1) * 0.32);
    }
  }
};
