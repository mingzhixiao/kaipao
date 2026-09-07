// ---------------- 游戏核心数值与平衡性配置文件 (Game Design & Balance Config) ----------------

export const GAME_CONFIG = {
  viewport: { baseWidth: 450, baseHeight: 800, roadMargin: 24 },
  fortress: { maxHp: 1000, maxShield: 300, shieldRegenDelay: 3.0, shieldRegenRate: 25, height: 100 },
  hero: { baseAttackInterval: 0.22, minAttackInterval: 0.07, expNeededBase: 25, expNeededGrowth: 1.32, expNeededAdd: 8, magnetRange: 130 },
  weapon: { damage: 35, critChance: 0.12, critMult: 2.0, bulletSpeed: 750, bulletRadius: 4, bulletLife: 2.0, pierceCount: 1, multishot: 1, spreadAngle: 0.14 },
  
  // 枪械武器库体系
  weapons: {
    assault: {
      id: 'assault', name: '先锋电磁步枪', tag: '均衡输出', icon: '🔫',
      desc: '联邦哨站标配电磁突击步枪，弹道平稳且具有出色的综合战术表现。',
      baseStats: { damage: 36, fireInterval: 0.20, bulletSpeed: 760, pierce: 1, multishot: 1, critChance: 0.14 },
      growth: { damagePerLevel: 5, critPerLevel: 0.015 }
    },
    gatling: {
      id: 'gatling', name: '毁灭加特林风暴', tag: '超频暴射', icon: '💥',
      desc: '六管重型转管机枪，以狂暴极速倾泻金属风暴，正前方压制一切尸潮！',
      baseStats: { damage: 22, fireInterval: 0.09, bulletSpeed: 820, pierce: 1, multishot: 1, critChance: 0.10 },
      growth: { damagePerLevel: 3.2, fireRatePerLevel: 0.001 }
    },
    gauss: {
      id: 'gauss', name: '泰坦高斯穿甲狙', tag: '强力贯穿', icon: '⚡',
      desc: '战术重型轨道炮，发射超音速穿甲合金弹芯，直线贯穿整条道路敌人！',
      baseStats: { damage: 125, fireInterval: 0.55, bulletSpeed: 1050, pierce: 4, multishot: 1, critChance: 0.28 },
      growth: { damagePerLevel: 18, critPerLevel: 0.02 }
    },
    plasma: {
      id: 'plasma', name: '离子散射爆能枪', tag: '三路散射', icon: '💠',
      desc: '等离子高能发射器，单次齐射 3 枚离子光束弹，大幅覆盖前方战区。',
      baseStats: { damage: 28, fireInterval: 0.32, bulletSpeed: 720, pierce: 1, multishot: 3, critChance: 0.16 },
      growth: { damagePerLevel: 4.2, critPerLevel: 0.015 }
    }
  },

  skills: {
    rocket: { cooldown: 5.5, minCooldown: 2.8, damage: 280, radius: 120, burnDuration: 4.5, burnDps: 45, flightDuration: 0.52 },
    truck: { cooldown: 8.0, minCooldown: 3.8, damage: 350, knockback: 180, speed: 480, width: 75, height: 105 },
    freeze: { cooldown: 7.0, minCooldown: 3.5, duration: 1.2, damagePerTick: 18, slowRatio: 0.2, range: 350, coneAngle: Math.PI * 0.45 },
    tornado: { cooldown: 8, duration: 4, radius: 200, damagePerSecond: 0.3, pullStrength: 0.05, particleCount: 30 },
    boomerang: { cooldown: 5, speed: 400, maxRange: 600, damage: 1.0, width: 20, height: 20 },
    laser: { cooldown: 3, width: 10, damage: 1.5, burnDamage: 0.2, burnDuration: 2, displayDuration: 0.2 },
    bomber: { cooldown: 12, radius: 250, bombCount: 3, bombInterval: 0.5, damage: 0.8, knockback: 100 }
  },

  skillCatalog: [
    { id: 'rocket', name: '温压火箭', asset: 'assets/icon_rocket.jpg', rarity: 'legendary', type: '范围爆破', desc: '部署温压重型火箭，定点引发大范围爆轰核爆与持续烈火灼烧区。', cooldown: 5.5 },
    { id: 'truck', name: '装甲战车', asset: 'assets/icon_truck.jpg', rarity: 'legendary', type: '直线碾压', desc: '呼叫突击重型装甲车，自防线冲撞碾压沿途所有敌人并造成高额击退！', cooldown: 8.0 },
    { id: 'freeze', name: '极寒射线', asset: 'assets/icon_frost.jpg', rarity: 'rare', type: '控场霜冻', desc: '向前喷射大范围超低温冰雾，附带霜冻伤害并极速削减敌人移速。', cooldown: 7.0 },
    { id: 'tornado', name: '裂风涡流', asset: 'assets/skills/tornado.png', rarity: 'epic', type: '牵引聚怪', desc: '生成持续 4 秒的风暴漩涡，强力牵引并持续绞杀范围内所有敌人。', cooldown: 8.0 },
    { id: 'boomerang', name: '回旋刃', asset: 'assets/skills/boomerang.png', rarity: 'rare', type: '往返贯穿', desc: '高速发射高周波穿透飞刃，飞出后盘旋返回，往返各可命中一次。', cooldown: 5.0 },
    { id: 'laser', name: '湮灭射线', asset: 'assets/skills/laser.png', rarity: 'legendary', type: '全屏贯通', desc: '释放贯穿全屏的高能射线，并在命中轨迹上施加致命灼烧。', cooldown: 3.0 },
    { id: 'bomber', name: '轨道轰炸', asset: 'assets/skills/bomber.png', rarity: 'epic', type: '集群轰炸', desc: '呼叫轨道连续投下 3 枚重磅航弹，对范围敌人造成巨额伤害并震退。', cooldown: 12.0 }
  ],

  synergyCatalog: [
    { name: '热力冲击引擎', synergy: '元素反应 · 殉爆', desc: '火箭或烈焰击中冰冻目标时，引发 220% 威力温差热力殉爆与破甲蒸汽！', icon: 'assets/icon_thermal.jpg', rarity: 'legendary' },
    { name: '电磁超导弹头', synergy: '电磁连锁', desc: '主武器暴击时释放高压电弧，自动弹射连锁跳跃至附近 2 个敌方目标！', icon: 'assets/icon_tesla.jpg', rarity: 'epic' },
    { name: '防线 EMP 脉冲环', synergy: '绝对防御', desc: '护盾破裂时爆发超强 EMP 冲击波，眩晕全屏所有普通感染者 1.5 秒！', icon: 'assets/icon_emp.jpg', rarity: 'epic' },
    { name: '战车热能喷射器', synergy: '火焰战车', desc: '装甲战车行进尾迹遗留持续燃烧的高温火径，持续焚烧踩踏的敌人。', icon: 'assets/icon_inferno.png', rarity: 'legendary' },
    { name: '极低温裂碎', synergy: '冰爆碎冰', desc: '击杀处于霜冻状态的敌人时发生冰爆，造成范围伤害并冻结周围目标。', icon: 'assets/icon_shatter.png', rarity: 'legendary' }
  ],

  pets: {
    statGrowthPerLevel: 0.1,
    followDistance: 100,
    types: {
      fluffy: {
        id: 'fluffy', name: '小毛球', asset: 'assets/pets/fluffy.png',
        tag: '弹幕伙伴',
        description: '发射高能量三连弹幕打击敌方集群',
        baseStats: { hp: 50, attack: 10, attackSpeed: 1.0, moveSpeed: 200, range: 300 },
        skill: 'BULLET_SPRAY', skillParams: { bulletCount: 3, spread: 0.30 }
      },
      dragon: {
        id: 'dragon', name: '幼龙', asset: 'assets/pets/dragon.png',
        tag: '灼烧伙伴',
        description: '扇形范围喷吐高热烈焰并持续灼烧敌人',
        baseStats: { hp: 80, attack: 15, attackSpeed: 0.8, moveSpeed: 150, range: 250 },
        skill: 'FIRE_BREATH', skillParams: { duration: 1, angle: Math.PI / 3 }
      }
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
    { id: 1, name: '废土前哨', clearWaves: 5, scrapReward: 60, bossEvery: 5, difficulty: 1.0, desc: '防线初建之地，抵御轻型感染者试探性进攻。' },
    { id: 2, name: '锈蚀公路', clearWaves: 7, scrapReward: 90, bossEvery: 5, difficulty: 1.15, desc: '纵深废弃干线，遭遇变异疾行者与冲锋者夹击。' },
    { id: 3, name: '断裂立交', clearWaves: 8, scrapReward: 120, bossEvery: 4, difficulty: 1.3, desc: '多层立体废墟，重装巨怪首次现身压境。' },
    { id: 4, name: '黑雾峡谷', clearWaves: 10, scrapReward: 160, bossEvery: 5, difficulty: 1.45, desc: '毒雾弥漫的地带，感染者集群狂暴化冲锋。' },
    { id: 5, name: '尸潮大坝', clearWaves: 12, scrapReward: 200, bossEvery: 4, difficulty: 1.6, desc: '决口大坝之战，无休止尸潮冲击核心防御壁。' },
    { id: 6, name: '暴君领地', clearWaves: 14, scrapReward: 260, bossEvery: 5, difficulty: 1.8, desc: '变异霸主驻扎巢穴，多重 Boss 频繁震荡地面。' },
    { id: 7, name: '末日核心', clearWaves: 16, scrapReward: 320, bossEvery: 4, difficulty: 2.0, desc: '决战母体巢穴，高烈度生化重装突击防线。' },
    { id: 8, name: '无尽防线', clearWaves: 0, scrapReward: 0, bossEvery: 5, difficulty: 1.25, endless: true, desc: '挑战极限生存，抵御无穷尽的感染者狂潮！' }
  ]
};
