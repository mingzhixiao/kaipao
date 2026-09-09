// ---------------- 游戏核心数值与平衡性配置文件 (Game Design & Balance Config) ----------------

export const GAME_CONFIG = {
  viewport: { baseWidth: 450, baseHeight: 800, roadMargin: 24 },
  fortress: { maxHp: 1000, maxShield: 300, shieldRegenDelay: 3.0, shieldRegenRate: 25, height: 100 },
  hero: { baseAttackInterval: 0.70, minAttackInterval: 0.28, expNeededBase: 25, expNeededGrowth: 1.32, expNeededAdd: 8, magnetRange: 130 },
  weapon: { damage: 38, critChance: 0.12, critMult: 2.0, bulletSpeed: 560, bulletRadius: 4, bulletLife: 2.0, pierceCount: 1, multishot: 1, spreadAngle: 0.14, armorPenetration: 0 },
  
  // 枪械武器库体系 (平衡射速节奏，提供更扎实的射击后坐与打击质感)
  weapons: {
    assault: {
      id: 'assault', name: '先锋电磁步枪', tag: '均衡输出', icon: '🔫', materialId: 'assault_part',
      desc: '联邦哨站标配电磁突击步枪，弹道平稳且具有出色的综合战术表现。',
      baseStats: { damage: 42, fireInterval: 0.70, bulletSpeed: 560, pierce: 1, multishot: 1, critChance: 0.14, magazineCapacity: 30, reloadTime: 1.4 },
      growth: { damagePerLevel: 6, critPerLevel: 0.015, magazinePerLevel: 4, bulletSpeedPerLevel: 8, fireRatePerLevel: 0.003, damagePerPowerLevel: 4, bulletSpeedPerShardLevel: 25, attackSpeedPerShardRatio: 0.02 }
    },
    gatling: {
      id: 'gatling', name: '毁灭加特林风暴', tag: '超频暴射', icon: '💥', materialId: 'gatling_part',
      desc: '六管重型转管机枪，以狂暴极速倾泻金属风暴，正前方压制一切异星狂潮！',
      baseStats: { damage: 26, fireInterval: 0.34, bulletSpeed: 620, pierce: 1, multishot: 1, critChance: 0.10, magazineCapacity: 80, reloadTime: 2.2 },
      growth: { damagePerLevel: 3.5, critPerLevel: 0.01, magazinePerLevel: 12, bulletSpeedPerLevel: 10, fireRatePerLevel: 0.0015, damagePerPowerLevel: 2.5, bulletSpeedPerShardLevel: 30, attackSpeedPerShardRatio: 0.018 }
    },
    gauss: {
      id: 'gauss', name: '泰坦高斯穿甲狙', tag: '强力贯穿', icon: '⚡', materialId: 'gauss_part',
      desc: '战术重型轨道炮，发射超音速穿甲合金弹芯，直线贯穿整条道路敌人！',
      baseStats: { damage: 145, fireInterval: 1.20, bulletSpeed: 820, pierce: 4, multishot: 1, critChance: 0.28, magazineCapacity: 6, reloadTime: 1.8 },
      growth: { damagePerLevel: 20, critPerLevel: 0.02, magazinePerLevel: 1, bulletSpeedPerLevel: 14, fireRatePerLevel: 0.005, damagePerPowerLevel: 14, bulletSpeedPerShardLevel: 45, attackSpeedPerShardRatio: 0.025 }
    },
    plasma: {
      id: 'plasma', name: '离子散射爆能枪', tag: '三路散射', icon: '💠', materialId: 'plasma_part',
      desc: '等离子高能发射器，单次齐射 3 枚离子光束弹，大幅覆盖前方战区。',
      baseStats: { damage: 35, fireInterval: 0.84, bulletSpeed: 520, pierce: 1, multishot: 3, critChance: 0.16, magazineCapacity: 24, reloadTime: 1.6 },
      growth: { damagePerLevel: 4.8, critPerLevel: 0.015, magazinePerLevel: 3, bulletSpeedPerLevel: 8, fireRatePerLevel: 0.003, damagePerPowerLevel: 3.5, bulletSpeedPerShardLevel: 25, attackSpeedPerShardRatio: 0.02 }
    }
  },

  // 技能合成需求碎片数
  SKILL_SYNTHESIS_COST: 10,

  // 系统阶梯解锁关卡
  systemUnlocks: {
    fortification: { stage: 1, name: '城防加固', icon: '🛡️', desc: '通关第 1 关解锁：强化城防生命、能量护盾与自愈系统' },
    runes: { stage: 3, name: '符文矩阵', icon: '💠', desc: '通关第 3 关解锁：镶嵌永久战术符文，大幅拓展全维属性' },
    pets: { stage: 6, name: '战术宠物', icon: '🐾', desc: '通关第 6 关解锁：伴飞战术宠物助战与强力弹幕支援' },
    advancedWeapons: { stage: 10, name: '进阶军械', icon: '⚡', desc: '通关第 10 关解锁：解锁毁灭加特林、高斯狙击与等离子爆能枪研发' }
  },

  // 城防加固科技树配置
  fortressUpgrades: {
    hp: { id: 'hp', name: '复合装甲壁', icon: 'assets/icons/icon_hp.png', baseVal: 1000, addPerLvl: 160, maxLevel: 30, costBase: 80, costGrowth: 1.30, unit: '点生命', desc: '加装重型高密度复合防护钢板，显著提升基地城墙最大承伤生命值。' },
    shield: { id: 'shield', name: '能量屏障', icon: 'assets/icons/icon_shield.png', baseVal: 300, addPerLvl: 60, maxLevel: 30, costBase: 90, costGrowth: 1.32, unit: '点护盾', desc: '部署高频磁约束偏转能量屏障，为防线提供抵挡异兽敌潮冲击的第一道护盾。' },
    regen: { id: 'regen', name: '纳米自愈', icon: 'assets/icons/icon_stamina.png', baseVal: 25, addPerLvl: 8, maxLevel: 30, costBase: 100, costGrowth: 1.34, unit: '点/秒', desc: '植入智能自修复微型纳米阵列，大幅加快脱战后护盾与屏障的充能恢复效率。' },
    armor: { id: 'armor', name: '反伤尖刺', icon: 'assets/icons/icon_part.png', baseVal: 0, addPerLvl: 6, maxLevel: 30, costBase: 120, costGrowth: 1.36, unit: '点反伤', desc: '在城防外围部署电磁反应荆棘，任何贴身攻击城防的敌对异兽均会受到高额物理反弹震荡！' }
  },

  // 双模式配置 (常规探索 vs 极限精英战区)
  modes: {
    normal: { id: 'normal', name: '常规防线', tag: '标准探索', color: '#38bdf8', hpMult: 1.0, shieldMult: 1.0, physicalResistanceBonus: 0, atkMult: 1.0, countMult: 1.0, scrapMult: 1.0, shardMult: 1.0, gemChance: 0.15, desc: '标准的异星异兽突袭强度，适合开荒推进与稳步收集科技素材。' },
    elite: { id: 'elite', name: '极限精英战区', tag: '极度凶险', color: '#f43f5e', hpMult: 1.85, shieldMult: 1.6, physicalResistanceBonus: 0.08, atkMult: 1.85, countMult: 1.35, scrapMult: 2.2, shardMult: 2.0, gemChance: 0.70, desc: '极度高危作战！硅基异形生命、物抗与能量护盾大幅强化，所有前沿图纸与芯片超高爆率！' }
  },

  // 五大深空递进战区 (5 大主题战区 x 10 关 = 50 关 + 无尽终极深渊)
  chapters: [
    {
      id: 1, name: '第一战区 · 星尘边缘', shortName: '星尘边缘', stages: [1, 10], color: '#38bdf8', icon: '🌌',
      desc: '星际开拓采掘基地初建，遭遇先遣硅基异形幼体与裂空突刺兽群',
      ambience: { filter: 'brightness(0.92) contrast(1.04)', tint: 'rgba(56, 189, 248, 0.08)', haze: 'rgba(15, 23, 42, 0.55)' }
    },
    {
      id: 2, name: '第二战区 · 强酸星环', shortName: '强酸星环', stages: [11, 20], color: '#10b981', icon: '☣️',
      desc: '被高浓度腐蚀酸液笼罩的废弃工业带，酸蚀突变生物与极速掠食者群',
      ambience: { filter: 'brightness(0.86) contrast(1.12) hue-rotate(55deg) saturate(1.25)', tint: 'rgba(16, 185, 129, 0.12)', haze: 'rgba(6, 78, 59, 0.65)' }
    },
    {
      id: 3, name: '第三战区 · 熔核裂隙', shortName: '熔核裂隙', stages: [21, 30], color: '#f97316', icon: '🌋',
      desc: '地核崩裂的高温熔岩矿脉，晶岩重装巨兽与高温聚变泰坦群',
      ambience: { filter: 'brightness(0.88) contrast(1.16) hue-rotate(335deg) saturate(1.4)', tint: 'rgba(249, 115, 22, 0.14)', haze: 'rgba(124, 45, 18, 0.7)' }
    },
    {
      id: 4, name: '第四战区 · 智械废都', shortName: '智械废都', stages: [31, 40], color: '#06b6d4', icon: '🦾',
      desc: '失控自动化重型机械要塞，赛博机甲哨卫巡逻与高压电磁风暴',
      ambience: { filter: 'brightness(0.9) contrast(1.22) hue-rotate(185deg) saturate(1.35)', tint: 'rgba(6, 182, 212, 0.12)', haze: 'rgba(22, 78, 99, 0.65)' }
    },
    {
      id: 5, name: '第五战区 · 虚空母巢', shortName: '虚空母巢', stages: [41, 50], color: '#a855f7', icon: '🛸',
      desc: '空间断裂带深处的异星母巢核心，决战终末支配者霸主巨神',
      ambience: { filter: 'brightness(0.82) contrast(1.28) hue-rotate(250deg) saturate(1.5)', tint: 'rgba(168, 85, 247, 0.15)', haze: 'rgba(88, 28, 135, 0.75)' }
    },
    {
      id: 6, name: '终极战区 · 无尽深渊', shortName: '无尽深渊', stages: [51, 51], color: '#eab308', icon: '♾️',
      desc: '无极限防御实战模拟，极限检验指挥官终极星际防御科技',
      ambience: { filter: 'brightness(0.95) contrast(1.15)', tint: 'rgba(234, 179, 8, 0.12)', haze: 'rgba(30, 41, 59, 0.6)' }
    }
  ],

  skills: {
    rocket: { element: 'fire', cooldown: 5.5, minCooldown: 2.8, damage: 280, radius: 120, burnDuration: 4.5, burnDps: 45, flightDuration: 0.52 },
    truck: { element: 'physical', cooldown: 8.0, minCooldown: 3.8, damage: 350, knockback: 180, speed: 480, width: 75, height: 105 },
    freeze: { element: 'ice', cooldown: 7.0, minCooldown: 3.5, duration: 1.2, damagePerTick: 18, slowRatio: 0.2, range: 350, coneAngle: Math.PI * 0.45 },
    tornado: { element: 'wind', cooldown: 8, duration: 4, radius: 200, damagePerSecond: 0.3, pullStrength: 0.03, particleCount: 30, maxPullSpeed: 50 },
    boomerang: { element: 'physical', cooldown: 5, speed: 400, maxRange: 600, damage: 1.0, width: 20, height: 20, critBonus: 0.35 },
    laser: { element: 'thunder', cooldown: 3, width: 10, damage: 1.5, burnDamage: 0.2, burnDuration: 2, displayDuration: 0.2 },
    bomber: { element: 'fire', cooldown: 12, radius: 250, bombCount: 3, bombInterval: 0.5, damage: 0.8, knockback: 100, maxAimDistance: 300 }
  },

  skillCatalog: [
    { id: 'rocket', name: '裂变等离子重炮', element: 'fire', asset: 'assets/cards/icon_rocket.png', rarity: 'legendary', type: '能量 · 裂变聚变', desc: '聚能并发射高纯度热核裂变等离子重炮，定点轰击引发持续灼热电浆区。', cooldown: 5.5, materialId: 'chip_rocket', unlockHint: '在第 1 战区收集芯片合成' },
    { id: 'freeze', name: '绝对零度射线', element: 'ice', asset: 'assets/cards/icon_frost.png', rarity: 'rare', type: '低温 · 晶格冷凝', desc: '向前激发超低温强相干粒子冷凝光束，附带致冷微晶并极速限制目标机能。', cooldown: 7.0, materialId: 'chip_freeze', unlockHint: '在第 1~2 战区收集芯片合成' },
    { id: 'truck', name: '磁浮重装扫荡舰', element: 'physical', asset: 'assets/cards/icon_truck.png', rarity: 'legendary', type: '动能 · 全道破阵', desc: '基地前沿突进超导磁浮扫荡舰，全战区反重力冲撞碾碎沿线所有敌对目标！', cooldown: 8.0, materialId: 'chip_truck', unlockHint: '在第 2~3 战区收集芯片合成' },
    { id: 'tornado', name: '微型引力奇点', element: 'wind', asset: 'assets/skills/tornado.png', rarity: 'epic', type: '场能 · 元素扩散', desc: '激发持续人造引力漩涡吸积盘，平滑牵引阻尼敌群并使离子与冷凝状态大范围扩散！', cooldown: 8.0, materialId: 'chip_tornado', unlockHint: '在第 3~4 战区收集芯片合成' },
    { id: 'boomerang', name: '高周波磁旋刃', element: 'physical', asset: 'assets/skills/boomerang.png', rarity: 'rare', type: '动能 · 双程贯穿', desc: '发射高频振动合金磁旋割刃，往返双程贯穿切割，自带 35% 额外暴击率！', cooldown: 5.0, materialId: 'chip_boomerang', unlockHint: '在第 2~4 战区收集芯片合成' },
    { id: 'laser', name: '粒子歼灭切割器', element: 'thunder', asset: 'assets/skills/laser.png', rarity: 'legendary', type: '脉冲 · 电离贯通', desc: '激发贯穿全屏的超导粒子湮灭束，对直线目标造成高频电离并引爆聚变超载！', cooldown: 3.0, materialId: 'chip_laser', unlockHint: '在第 4~5 战区收集芯片合成' },
    { id: 'bomber', name: '天基动能天谴打击', element: 'fire', asset: 'assets/skills/bomber.png', rarity: 'epic', type: '天基 · 集群轰炸', desc: '采掘基地连接近地天基卫星网，连续投射 3 组重型钨合金热核动能弹！', cooldown: 12.0, materialId: 'chip_bomber', unlockHint: '在第 3~5 战区收集芯片合成' }
  ],

  synergyCatalog: [
    { name: '等离子热核聚变', synergy: '元素反应 · 聚变', desc: '等离子重炮击中结晶冷凝的硅基生物时，温差引发剧烈晶格热核爆缩与破甲震荡！', icon: 'assets/cards/icon_thermal.png', rarity: 'legendary' },
    { name: '超导电弧连锁', synergy: '超导共振', desc: '主武器暴击时释放高压相干电弧，自动弹射跳跃连锁附近 2 个敌对目标！', icon: 'assets/cards/icon_tesla.png', rarity: 'epic' },
    { name: '等离子电离超载', synergy: '元素反应 · 超载', desc: '粒子光线命中处于灼热电浆的目标时，引发电离过载剧烈大爆炸并击退周围敌群！', icon: 'assets/skills/laser.png', rarity: 'legendary' },
    { name: '引力吸积扩散', synergy: '元素反应 · 扩散', desc: '引力漩涡捕获敌人时，将其身上的电浆或冷凝状态瞬间向周围所有怪物扩散！', icon: 'assets/skills/tornado.png', rarity: 'epic' },
    { name: '基地护盾过载破裂环', synergy: '要塞反制', desc: '偏振护盾破裂瞬间爆发广谱高能 EMP 冲击波，眩晕全屏所有普通敌对目标！', icon: 'assets/cards/icon_emp.png', rarity: 'epic' },
    { name: '热核离子推进舰', synergy: '炽热扫荡', desc: '磁浮扫荡舰加装后置聚变推进喷口，沿途留下一整条持久炽热的电浆灼烧焦土。', icon: 'assets/cards/icon_inferno.png', rarity: 'legendary' },
    { name: '极低温晶格崩解', synergy: '晶爆破片', desc: '击破处于绝对冷凝状态的目标时发生晶格崩裂，造成大范围破甲并冻结周围敌群。', icon: 'assets/cards/icon_shatter.png', rarity: 'legendary' }
  ],

  pets: {
    statGrowthPerLevel: 0.25,
    followDistance: 100,
    recoveryTime: 10.0,
    teleportThreshold: 300,
    types: {
      fluffy: {
        id: 'fluffy', name: '小毛球', asset: 'assets/pets/fluffy.png',
        tag: '速射护盾', materialId: 'fluffy_shard',
        description: '发射高能量连发弹幕打击敌方，并用护盾抵挡怪群冲击',
        baseStats: { hp: 70, attack: 14, attackSpeed: 1.1, moveSpeed: 210, range: 320, shield: 70 },
        skill: 'BULLET_SPRAY', skillParams: { bulletCount: 3, spread: 0.32 },
        evolutions: [
          { level: 1, title: '一阶·幼生毛球', bulletCount: 3, desc: '发射 3 连速射高能弹幕' },
          { level: 5, title: '二阶·脉冲突击僚机', bulletCount: 5, desc: '发射 5 连贯穿弹幕，附带减速' },
          { level: 10, title: '三阶·星界矩阵重装机', bulletCount: 7, desc: '发射 7 连爆轰弹幕，护盾强化' }
        ]
      },
      dragon: {
        id: 'dragon', name: '突击先锋机·炽焰', asset: 'assets/pets/dragon.png',
        tag: '离子聚能', materialId: 'dragon_shard',
        description: '重型近距伴飞突击机，喷射高热等离子射流歼灭密集敌群',
        baseStats: { hp: 100, attack: 22, attackSpeed: 0.85, moveSpeed: 160, range: 260, shield: 100 },
        skill: 'FIRE_BREATH', skillParams: { duration: 1.0, angle: Math.PI / 3 },
        evolutions: [
          { level: 1, title: '一阶·离子喷射', angle: Math.PI / 3, desc: '喷吐 60° 扇形高温等离子射流' },
          { level: 5, title: '二阶·等离子聚能狂涌', angle: Math.PI / 2, desc: '喷吐 90° 超大范围等离子射流并留下能量灼烧带' },
          { level: 10, title: '三阶·天启熔核风暴', angle: Math.PI * 0.65, desc: '全屏覆盖灭世熔核射流，附加爆裂能量场' }
        ]
      }
    }
  },

  // 专属素材与背包道具总库 (Item Catalog)
  items: {
    // 枪械专属配件
    assault_part: { id: 'assault_part', name: '先锋电磁枪机', category: 'weapon', rarity: 'rare', icon: 'assets/items/item_assault_part.png', targetId: 'assault', targetType: 'weapon', desc: '先锋电磁步枪的核心高密闭锁机件，能显著改善连续射击弹道与基础威力。', usage: '用于【先锋电磁步枪】强化升级' },
    gatling_part: { id: 'gatling_part', name: '加特林超频转子', category: 'weapon', rarity: 'epic', icon: 'assets/items/item_gatling_part.png', targetId: 'gatling', targetType: 'weapon', desc: '六管加特林的高速超导驱动电机，极大压缩射击间隔并降低过热损耗。', usage: '用于【毁灭加特林风暴】强化升级' },
    gauss_part: { id: 'gauss_part', name: '高斯强磁导轨', category: 'weapon', rarity: 'legendary', icon: 'assets/items/item_gauss_part.png', targetId: 'gauss', targetType: 'weapon', desc: '重型轨道狙击炮的超导加速磁轨，赋予弹丸超音速穿甲毁伤与极限暴击。', usage: '用于【泰坦高斯穿甲狙】强化升级' },
    plasma_part: { id: 'plasma_part', name: '等离子约束磁环', category: 'weapon', rarity: 'epic', icon: 'assets/items/item_plasma_part.png', targetId: 'plasma', targetType: 'weapon', desc: '离子散射炮的能量聚焦约束组件，使三路等离子散射弹丸覆盖更密集。', usage: '用于【离子散射爆能枪】强化升级' },

    // 僚机专属智能核心与能源晶体
    fluffy_shard: { id: 'fluffy_shard', name: '光球智能核心', category: 'pet', rarity: 'rare', icon: 'assets/items/item_fluffy_shard.png', targetId: 'fluffy', targetType: 'pet', desc: '蕴含高阶浮游僚机飞行控制算法，集齐 10 个可解锁伴飞僚机助战。', usage: '用于伴飞僚机【智械侦察机·光球】解锁与强化' },
    dragon_shard: { id: 'dragon_shard', name: '炽焰等离子核', category: 'pet', rarity: 'legendary', icon: 'assets/items/item_dragon_shard.png', targetId: 'dragon', targetType: 'pet', desc: '高能量密度聚合等离子发生器，集齐 10 个可解锁重型突击僚机。', usage: '用于伴飞突击机【突击先锋机·炽焰】解锁与强化' },

    // 技能专属战术芯片 (收集10个合成技能)
    chip_rocket: { id: 'chip_rocket', name: '等离子火控芯片', category: 'skill', rarity: 'legendary', icon: 'assets/items/item_chip_rocket.png', targetId: 'rocket', targetType: 'skill', desc: '记载重型裂变等离子重炮聚焦算法的芯片，集齐 10 块可在技能图谱中合成解锁【裂变等离子重炮】！', usage: '集齐 10 块合成解锁【裂变等离子重炮】' },
    chip_freeze: { id: 'chip_freeze', name: '绝对零度致冷核心', category: 'skill', rarity: 'rare', icon: 'assets/items/item_chip_freeze.png', targetId: 'freeze', targetType: 'skill', desc: '超低温粒子减速与冷凝循环模组，集齐 10 块可在技能图谱中合成解锁【绝对零度射线】！', usage: '集齐 10 块合成解锁【绝对零度射线】' },
    chip_truck: { id: 'chip_truck', name: '磁浮重装推进模组', category: 'skill', rarity: 'epic', icon: 'assets/items/item_chip_truck.png', targetId: 'truck', targetType: 'skill', desc: '磁浮重装扫荡舰的高功率反重力推进组件，集齐 10 块可在技能图谱中合成解锁【磁浮重装扫荡舰】！', usage: '集齐 10 块合成解锁【磁浮重装扫荡舰】' },
    chip_tornado: { id: 'chip_tornado', name: '引力奇点发生核', category: 'skill', rarity: 'epic', icon: 'assets/items/item_chip_tornado.png', targetId: 'tornado', targetType: 'skill', desc: '微型微引力奇点约束装置，集齐 10 块可在技能图谱中合成解锁【微型引力奇点】！', usage: '集齐 10 块合成解锁【微型引力奇点】' },
    chip_boomerang: { id: 'chip_boomerang', name: '高周波磁旋谐振片', category: 'skill', rarity: 'rare', icon: 'assets/items/item_chip_boomerang.png', targetId: 'boomerang', targetType: 'skill', desc: '高频旋转切割飞刃的高频压电晶片，集齐 10 块可在技能图谱中合成解锁【高周波磁旋刃】！', usage: '集齐 10 块合成解锁【高周波磁旋刃】' },
    chip_laser: { id: 'chip_laser', name: '粒子歼灭聚焦镜', category: 'skill', rarity: 'legendary', icon: 'assets/items/item_chip_laser.png', targetId: 'laser', targetType: 'skill', desc: '粒子束连续切割聚焦镜组，集齐 10 块可在技能图谱中合成解锁【粒子歼灭切割器】！', usage: '集齐 10 块合成解锁【粒子歼灭切割器】' },
    chip_bomber: { id: 'chip_bomber', name: '天基动能信标密钥', category: 'skill', rarity: 'epic', icon: 'assets/items/item_chip_bomber.png', targetId: 'bomber', targetType: 'skill', desc: '天基动能轨道投送定位加密密钥，集齐 10 块可在技能图谱中合成解锁【天基动能天谴打击】！', usage: '集齐 10 块合成解锁【天基动能天谴打击】' },

    // 枪械三维强化专属碎片
    power_shard: { id: 'power_shard', name: '力量碎片', category: 'weapon', rarity: 'rare', icon: 'assets/icons/icon_level.png', targetType: 'weapon', desc: '蕴含强效动能加速高纯晶体，用于在枪械库中持续强化主武器威力与攻击力。', usage: '用于枪械【力量强化】提升攻击威力' },
    bulletspeed_shard: { id: 'bulletspeed_shard', name: '射速碎片', category: 'weapon', rarity: 'rare', icon: 'assets/cards/icon_pierce.png', targetType: 'weapon', desc: '超导磁流体弹道微粒，用于在枪械库中升级枪械弹药出膛与飞行极速。', usage: '用于枪械【射速强化】提升子弹弹速' },
    attackspeed_shard: { id: 'attackspeed_shard', name: '攻速碎片', category: 'weapon', rarity: 'rare', icon: 'assets/cards/icon_firerate.png', targetType: 'weapon', desc: '高频击发共振合金晶片，用于在枪械库中升级击发机构并降低射击间隔。', usage: '用于枪械【攻速强化】提升开火频率' },

    // 弹匣扩容与符文强化专属碎片
    mag_shard: { id: 'mag_shard', name: '扩容弹匣碎片', category: 'weapon', rarity: 'rare', icon: 'assets/icons/icon_part.png', targetType: 'magazine', desc: '高密聚能微缩供弹匣扩展模组组件，用于在枪械库中不断升级扩充主武器弹匣容量。', usage: '用于枪械【弹匣扩容】升级提升载弹量' },
    rune_shard: { id: 'rune_shard', name: '远古符文碎片', category: 'rune', rarity: 'epic', icon: 'assets/icons/icon_shard.png', targetType: 'rune', desc: '铭刻着古老战术共鸣铭文的高能晶体碎片，是符文工坊中强化永久战斗符文的关键素材。', usage: '用于【符文工坊】中强化各类永久战术符文' },

    // 精英模式专属稀有枪械核心 (用于 6 级以上千级突破强化)
    rare_weapon_shard: { id: 'rare_weapon_shard', name: '稀有军工枪械核心', category: 'weapon', rarity: 'epic', icon: 'assets/items/item_assault_part.png', targetType: 'weapon', desc: '军工级精密稀土超导合金核心，仅在【极限精英战区】击破狂暴异兽或扫荡精英战区产出。用于枪械 6 级以上千级强化突破！', usage: '用于枪械 Lv.6 后的千级强化突破' },

    // 军备补给与消耗道具
    energy_potion: { id: 'energy_potion', name: '高能战术能量剂', category: 'consumable', rarity: 'rare', icon: 'assets/items/item_energy_potion.png', targetType: 'energy', desc: '军工高纯度神经活性复合营养剂，使用后可立即恢复 25 点前线作战体能。', usage: '直接在背包中使用可恢复 25 点体能' },
    supply_crate: { id: 'supply_crate', name: '前线战略军备箱', category: 'consumable', rarity: 'epic', icon: 'assets/items/item_supply_crate.png', targetType: 'crate', desc: '要塞空投的高规格密封物资箱，开启可随机获得多种枪械零件、技能芯片与僚机核心。', usage: '直接在背包中开启抽取战术物资' }
  },

  // 枪械千级强化体系配置与消耗曲线 (理论上限 1000 级)
  MAX_WEAPON_STAT_LEVEL: 1000,
  getWeaponUpgradeRequirements(curLevel = 1) {
    if (curLevel >= 1000) return null;
    let scrapCost = 30;
    let basicShardCost = 1;
    let rareShardCost = 0;

    if (curLevel <= 5) {
      scrapCost = 30 + (curLevel - 1) * 25;
      basicShardCost = 1 + Math.floor((curLevel - 1) * 0.5);
      rareShardCost = 0; // 前 5 级无需稀有核心，轻松快速升级
    } else if (curLevel <= 15) {
      scrapCost = 150 + Math.floor(Math.pow(curLevel, 1.25) * 16);
      basicShardCost = 2 + Math.floor(curLevel * 0.35);
      rareShardCost = 1; // 6~15 级每次需要 1 个稀有核心
    } else if (curLevel <= 50) {
      scrapCost = 450 + Math.floor(Math.pow(curLevel, 1.35) * 20);
      basicShardCost = 3 + Math.floor(curLevel * 0.45);
      rareShardCost = 2 + Math.floor((curLevel - 15) / 12);
    } else if (curLevel <= 200) {
      scrapCost = 1600 + Math.floor(Math.pow(curLevel, 1.45) * 24);
      basicShardCost = 8 + Math.floor(curLevel * 0.55);
      rareShardCost = Math.min(25, 5 + Math.floor(curLevel / 20));
    } else {
      scrapCost = Math.min(500000, 8000 + Math.floor(Math.pow(curLevel, 1.5) * 28));
      basicShardCost = Math.min(200, 15 + Math.floor(curLevel * 0.6));
      rareShardCost = Math.min(50, 12 + Math.floor(curLevel / 35));
    }

    return { scrapCost, basicShardCost, rareShardCost };
  },

  // 怪物基础数值体系 (强化生命基数与护盾装甲偏振系数)
  enemies: {
    runner: { radius: 20, baseHp: 75, speedMin: 44, speedMax: 62, attackPower: 22, attackCooldown: 1.2, expVal: 6, color: '#10b981', name: '硅基噬矿兽', shieldMod: 0.6 },
    charger: { radius: 18, baseHp: 68, speedMin: 84, speedMax: 112, attackPower: 24, attackCooldown: 0.9, expVal: 9, color: '#f59e0b', name: '裂空突进掠食体', shieldMod: 0.8 },
    behemoth: { radius: 36, baseHp: 580, speedMin: 36, speedMax: 47, attackPower: 70, attackCooldown: 1.5, expVal: 24, color: '#ef4444', name: '重装晶岩泰坦', shieldMod: 1.35 },
    boss_overlord: { radius: 48, baseHp: 2400, speed: 36, attackPower: 120, attackCooldown: 1.4, expVal: 70, color: '#ff2a5f', stompInterval: 4.0, name: '深空轨道执行者', shieldMod: 1.6 }
  },

  difficulty: {
    getEnemyWaveScale(wave) { if (wave <= 1) return 0.95; return 0.95 + Math.pow(wave - 1, 0.92) * 0.28; },
    getBossWaveScale(wave) { return 1.0 + (wave - 1) * 0.35; },
    getWaveEnemyCount(wave) { return Math.round(10 + Math.pow(wave, 1.05) * 4); },
    getWaveSpawnInterval(wave) { return Math.max(0.35, 1.5 - Math.log2(wave + 1) * 0.35); }
  },

  // 关卡体系配置 (包含差异化定向掉落、怪物梯度与首通奖励，全量 50 关 + 无尽模式)
  stages: (() => {
    // 50 关详尽关卡名录与特色设定
    const STAGE_NAMES = [
      // 战区 1 (1-10)：星尘边缘
      '小行星前哨', '星际遗迹干道', '环形山断层', '采矿基地驿站', '深空防线死斗',
      '陨石风蚀巨壁', '废弃矿业枢纽', '能源补给站', '裂谷封锁隘口', '第一战区处决场',
      // 战区 2 (11-20)：强酸星环
      '酸雾卫星外围', '强酸星环潜流', '腐蚀冷却管线', '化学原料储罐区', '酸蚀星核收容所',
      '酸化居住模块', '异星结晶管道', '生化突变温室', '强酸重流渠', '强酸晶核矩阵',
      // 战区 3 (21-30)：熔核裂隙
      '熔核外围断层', '高温地热管道', '等离子通风塔', '赤红熔流河', '熔火能量前哨',
      '超重高能矿脉', '地壳崩解悬崖', '熔核钻探枢纽', '炽热等离子湖', '熔火执行领主王座',
      // 战区 4 (31-40)：智械废都
      '失控安防闸门', '无人装配流水线', '高能磁网廊道', '智械母舰兵工厂', '雷暴矩阵中枢塔',
      '超算伺服阵列', '超导磁轨星桥', '纳米合成实验场', '失控机甲停机坪', '智械终结者座驾',
      // 战区 5 (41-50)：虚空母巢
      '星门裂隙视界', '虚空坍缩带', '反物质折叠断层', '黯淡星火灯塔', '母巢核心裂口',
      '暗能共鸣空腔', '湮灭超重力区', '异星网络突触', '终焉倒悬要塞', '虚空支配者·终末'
    ];

    const stagesList = [];
    for (let id = 1; id <= 50; id++) {
      const chapterId = Math.min(5, Math.ceil(id / 10));
      const posInCh = ((id - 1) % 10) + 1; // 1 to 10
      const isMiniBoss = posInCh === 5;
      const isChapterBoss = posInCh === 10;
      const name = STAGE_NAMES[id - 1] || `战区要塞 ${id}`;

      // 递增波次设计：前 10 关 5~8 波，中间 8~12 波，末期 12~16 波，第 50 关 18 波
      let clearWaves = 5;
      if (id <= 3) clearWaves = 5 + (id - 1);
      else if (id <= 10) clearWaves = 6 + Math.floor((id - 4) / 2);
      else if (id <= 20) clearWaves = 8 + Math.floor((id - 11) / 3);
      else if (id <= 30) clearWaves = 9 + Math.floor((id - 21) / 3);
      else if (id <= 40) clearWaves = 11 + Math.floor((id - 31) / 3);
      else if (id < 50) clearWaves = 13 + Math.floor((id - 41) / 3);
      else clearWaves = 18; // 终极决战 18 波次

      // 难度系数平滑幂次增长：Stage 1 为 1.0，第 50 关可达 8.5+，确保高关卡怪物血量坚韧有策略感
      const difficulty = parseFloat((1.0 + (id - 1) * 0.10 + Math.pow((id - 1) / 7.5, 1.35) * 0.18).toFixed(2));
      
      // 护盾比例系数 (前3关零护盾上手，随后逐步装配能量装甲护盾)
      let baseShieldRatio = 0;
      if (id <= 3) {
        baseShieldRatio = 0; // 新手前3关零护盾
      } else if (id <= 10) {
        baseShieldRatio = 0.20 + (id - 4) * 0.03; // 20% ~ 38% 护盾
      } else if (id <= 20) {
        baseShieldRatio = 0.40 + (id - 11) * 0.035; // 40% ~ 71% 护盾
      } else if (id <= 30) {
        baseShieldRatio = 0.75 + (id - 21) * 0.04; // 75% ~ 111% 护盾
      } else if (id <= 40) {
        baseShieldRatio = 1.15 + (id - 31) * 0.045; // 115% ~ 155% 护盾
      } else {
        baseShieldRatio = 1.60 + (id - 41) * 0.05; // 160% ~ 205% 终极装甲护盾
      }
      const shieldRatio = parseFloat(baseShieldRatio.toFixed(2));

      // 废料奖励增长
      const scrapReward = 80 + (id - 1) * 22 + Math.floor(Math.pow(id, 1.15) * 4);

      // 基础物抗随关卡平滑提升：第 1 关 2.5%，第 50 关约 44%，再由怪物类型与模式修正。
      const physicalResistance = parseFloat(Math.min(0.45, 0.025 + (id - 1) * 0.0085).toFixed(3));

      // 关卡准入怪物门禁
      let allowedEnemies = ['runner'];
      if (id >= 2 && id < 5) allowedEnemies = ['runner', 'charger'];
      else if (id >= 5) allowedEnemies = ['runner', 'charger', 'behemoth'];

      // 特色战术芯片与战利品定向掉落轮转
      let featuredChip = 'chip_rocket';
      let chipDropCount = [2, 4];
      if (chapterId === 1) {
        featuredChip = id <= 5 ? 'chip_rocket' : 'chip_freeze';
      } else if (chapterId === 2) {
        featuredChip = id <= 15 ? 'chip_freeze' : 'chip_boomerang';
      } else if (chapterId === 3) {
        featuredChip = id <= 25 ? 'chip_truck' : 'chip_bomber';
      } else if (chapterId === 4) {
        featuredChip = id <= 35 ? 'chip_tornado' : 'chip_laser';
      } else {
        const cChips = ['chip_laser', 'chip_bomber', 'chip_tornado', 'chip_truck', 'chip_rocket'];
        featuredChip = cChips[(id - 41) % cChips.length];
        chipDropCount = [3, 5];
      }

      // 定向掉落池
      const targetDrops = [];
      const chipNames = {
        chip_rocket: '等离子火控芯片', chip_freeze: '绝对零度致冷核心', chip_truck: '磁浮重装推进模组',
        chip_tornado: '引力奇点发生核', chip_boomerang: '高周波磁旋谐振片', chip_laser: '粒子歼灭聚焦镜',
        chip_bomber: '天基动能信标密钥'
      };
      targetDrops.push({
        id: featuredChip,
        name: chipNames[featuredChip] || '战术芯片',
        icon: `assets/items/item_${featuredChip}.png`,
        highlight: true
      });

      // 搭配武器配件与三维碎片
      if (chapterId === 1) {
        targetDrops.push({ id: 'power_shard', name: '力量碎片', icon: 'assets/icons/icon_level.png' });
        targetDrops.push({ id: 'attackspeed_shard', name: '攻速碎片', icon: 'assets/cards/icon_firerate.png' });
        if (id >= 3) targetDrops.push({ id: 'gatling_part', name: '加特林配件', icon: 'assets/items/item_gatling_part.png' });
      } else if (chapterId === 2) {
        targetDrops.push({ id: 'bulletspeed_shard', name: '射速碎片', icon: 'assets/cards/icon_pierce.png' });
        targetDrops.push({ id: 'rune_shard', name: '远古符文碎片', icon: 'assets/icons/icon_shard.png' });
        targetDrops.push({ id: 'fluffy_shard', name: '光球智能核心', icon: 'assets/items/item_fluffy_shard.png' });
      } else if (chapterId === 3) {
        targetDrops.push({ id: 'mag_shard', name: '扩容弹匣碎片', icon: 'assets/icons/icon_part.png' });
        targetDrops.push({ id: 'plasma_part', name: '等离子磁环', icon: 'assets/items/item_plasma_part.png' });
        targetDrops.push({ id: 'dragon_shard', name: '炽焰等离子核', icon: 'assets/items/item_dragon_shard.png' });
      } else if (chapterId === 4) {
        targetDrops.push({ id: 'gauss_part', name: '高斯强磁导轨', icon: 'assets/items/item_gauss_part.png' });
        targetDrops.push({ id: 'power_shard', name: '高阶力量晶体', icon: 'assets/icons/icon_level.png' });
        targetDrops.push({ id: 'supply_crate', name: '战略军备箱', icon: 'assets/items/item_supply_crate.png' });
      } else {
        targetDrops.push({ id: 'supply_crate', name: '前线战略军备箱', icon: 'assets/items/item_supply_crate.png', highlight: true });
        targetDrops.push({ id: 'rune_shard', name: '高级符文精华', icon: 'assets/icons/icon_shard.png' });
        targetDrops.push({ id: 'mag_shard', name: '聚能弹匣超模组', icon: 'assets/icons/icon_part.png' });
      }

      let bossTitle = '';
      if (isChapterBoss) bossTitle = `【战区第${chapterId}霸主守关】`;
      else if (isMiniBoss) bossTitle = '【精英领主突袭】';

      // 前三关普通模式是教学缓冲区，初始步枪且未装备技能时也应能稳定通关；精英模式不读取该保护参数。
      let normalAssist = null;
      if (id === 1) normalAssist = { hpMult: 0.55, atkMult: 0.30, speedMult: 0.78, countMult: 0.58, spawnIntervalMult: 1.28, bossHpMult: 0.16, bossAtkMult: 0.20, bossSpeedMult: 0.72, bossShieldRatio: 0.08 };
      else if (id === 2) normalAssist = { hpMult: 0.65, atkMult: 0.38, speedMult: 0.82, countMult: 0.68, spawnIntervalMult: 1.20, bossHpMult: 0.19, bossAtkMult: 0.26, bossSpeedMult: 0.78, bossShieldRatio: 0.12 };
      else if (id === 3) normalAssist = { hpMult: 0.75, atkMult: 0.48, speedMult: 0.88, countMult: 0.78, spawnIntervalMult: 1.12, bossHpMult: 0.22, bossAtkMult: 0.32, bossSpeedMult: 0.84, bossShieldRatio: 0.18 };

      stagesList.push({
        id,
        chapter: chapterId,
        posInChapter: posInCh,
        name,
        clearWaves,
        scrapReward,
        bossEvery: isChapterBoss ? 4 : (isMiniBoss ? 4 : 5),
        isMiniBoss,
        isChapterBoss,
        difficulty,
        shieldRatio,
        physicalResistance,
        normalAssist,
        featuredChip,
        chipDropCount,
        allowedEnemies,
        desc: `${bossTitle}抵御 ${clearWaves} 波异星狂潮进攻，肃清战区据点！产出【${chipNames[featuredChip]}】与强化素材。`,
        targetDrops
      });
    }

    // 终极无尽关卡 (Stage 51)
    stagesList.push({
      id: 51,
      chapter: 6,
      posInChapter: 1,
      name: '无尽深空防线',
      clearWaves: 0,
      scrapReward: 200,
      bossEvery: 5,
      difficulty: 9.99,
      shieldRatio: 2.0,
      physicalResistance: 0.45,
      endless: true,
      allowedEnemies: ['runner', 'charger', 'behemoth'],
      desc: '无穷无尽的极限生存考验，异星敌潮源源不断，检验要塞指挥官终极防线！',
      targetDrops: [
        { id: 'power_shard', name: '终焉力量碎片', icon: 'assets/icons/icon_level.png', highlight: true },
        { id: 'rune_shard', name: '远古符文精华', icon: 'assets/icons/icon_shard.png', highlight: true },
        { id: 'supply_crate', name: '战略军备箱', icon: 'assets/items/item_supply_crate.png' }
      ]
    });

    return stagesList;
  })()
};
