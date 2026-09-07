// ---------------- 游戏核心数值与平衡性配置文件 (Game Design & Balance Config) ----------------

export const GAME_CONFIG = {
  viewport: { baseWidth: 450, baseHeight: 800, roadMargin: 24 },
  fortress: { maxHp: 1000, maxShield: 300, shieldRegenDelay: 3.0, shieldRegenRate: 25, height: 100 },
  hero: { baseAttackInterval: 0.22, minAttackInterval: 0.07, expNeededBase: 25, expNeededGrowth: 1.32, expNeededAdd: 8, magnetRange: 130 },
  weapon: { damage: 35, critChance: 0.12, critMult: 2.0, bulletSpeed: 750, bulletRadius: 4, bulletLife: 2.0, pierceCount: 1, multishot: 1, spreadAngle: 0.14 },
  skills: {
    rocket: { cooldown: 5.5, minCooldown: 2.8, damage: 280, radius: 120, burnDuration: 4.5, burnDps: 45, flightDuration: 0.52 },
    truck: { cooldown: 8.0, minCooldown: 3.8, damage: 350, knockback: 180, speed: 480, width: 75, height: 105 },
    freeze: { cooldown: 7.0, minCooldown: 3.5, duration: 1.2, damagePerTick: 18, slowRatio: 0.2, range: 350, coneAngle: Math.PI * 0.45 },
    tornado: { cooldown: 8, duration: 4, radius: 200, damagePerSecond: 0.3, pullStrength: 0.05, particleCount: 30 },
    boomerang: { cooldown: 5, speed: 400, maxRange: 600, damage: 1.0, width: 20, height: 20 },
    laser: { cooldown: 3, width: 10, damage: 1.5, burnDamage: 0.2, burnDuration: 2, displayDuration: 0.2 },
    bomber: { cooldown: 12, radius: 250, bombCount: 3, bombInterval: 0.5, damage: 0.8, knockback: 100 }
  },
  pets: {
    statGrowthPerLevel: 0.1,
    followDistance: 100,
    types: {
      fluffy: { id: 'fluffy', name: '小毛球', description: '发射三连弹幕攻击敌人', baseStats: { hp: 50, attack: 10, attackSpeed: 1.0, moveSpeed: 200, range: 300 }, skill: 'BULLET_SPRAY', skillParams: { bulletCount: 3, spread: 0.30 } },
      dragon: { id: 'dragon', name: '幼龙', description: '喷吐扇形火焰并持续灼烧敌人', baseStats: { hp: 80, attack: 15, attackSpeed: 0.8, moveSpeed: 150, range: 250 }, skill: 'FIRE_BREATH', skillParams: { duration: 1, angle: Math.PI / 3 } }
    }
  },
  enemies: {
    runner: { radius: 20, baseHp: 80, speedMin: 70, speedMax: 95, attackPower: 35, attackCooldown: 1.0, expVal: 6, color: '#10b981' },
    charger: { radius: 18, baseHp: 55, speedMin: 135, speedMax: 165, attackPower: 25, attackCooldown: 0.8, expVal: 9, color: '#f59e0b' },
    behemoth: { radius: 36, baseHp: 380, speedMin: 45, speedMax: 60, attackPower: 80, attackCooldown: 1.4, expVal: 22, color: '#ef4444' },
    boss_overlord: { radius: 48, baseHp: 1400, speed: 48, attackPower: 180, attackCooldown: 1.2, expVal: 65, color: '#ff2a5f', stompInterval: 3.6 }
  },
  difficulty: {
    getEnemyWaveScale(wave) { if (wave <= 1) return 1.0; return 1.0 + Math.pow(wave - 1, 0.88) * 0.26; },
    getBossWaveScale(wave) { return 1.0 + (wave - 1) * 0.32; },
    getWaveEnemyCount(wave) { return Math.round(12 + Math.pow(wave, 1.1) * 5); },
    getWaveSpawnInterval(wave) { return Math.max(0.28, 1.3 - Math.log2(wave + 1) * 0.32); }
  },
  stages: [
    { id: 1, name: '废土前哨', clearWaves: 5, scrapReward: 60, bossEvery: 5, difficulty: 1.0 },
    { id: 2, name: '锈蚀公路', clearWaves: 7, scrapReward: 90, bossEvery: 5, difficulty: 1.15 },
    { id: 3, name: '断裂立交', clearWaves: 8, scrapReward: 120, bossEvery: 4, difficulty: 1.3 },
    { id: 4, name: '黑雾峡谷', clearWaves: 10, scrapReward: 160, bossEvery: 5, difficulty: 1.45 },
    { id: 5, name: '尸潮大坝', clearWaves: 12, scrapReward: 200, bossEvery: 4, difficulty: 1.6 },
    { id: 6, name: '暴君领地', clearWaves: 14, scrapReward: 260, bossEvery: 5, difficulty: 1.8 },
    { id: 7, name: '末日核心', clearWaves: 16, scrapReward: 320, bossEvery: 4, difficulty: 2.0 },
    { id: 8, name: '无尽防线', clearWaves: 0, scrapReward: 0, bossEvery: 5, difficulty: 1.25, endless: true }
  ]
};
