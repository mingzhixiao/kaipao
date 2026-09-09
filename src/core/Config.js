// ---------------- 游戏核心数值与平衡性配置文件 (Game Design & Balance Config) ----------------

export const GAME_CONFIG = {
  viewport: { baseWidth: 450, baseHeight: 800, roadMargin: 24 },
  fortress: { maxHp: 1000, maxShield: 300, shieldRegenDelay: 3.0, shieldRegenRate: 25, height: 100 },
  hero: { baseAttackInterval: 0.36, minAttackInterval: 0.10, expNeededBase: 25, expNeededGrowth: 1.32, expNeededAdd: 8, magnetRange: 130 },
  weapon: { damage: 38, critChance: 0.12, critMult: 2.0, bulletSpeed: 720, bulletRadius: 4, bulletLife: 2.0, pierceCount: 1, multishot: 1, spreadAngle: 0.14 },
  
  // 枪械武器库体系 (平衡初射速与手感)
  weapons: {
    assault: {
      id: 'assault', name: '先锋电磁步枪', tag: '均衡输出', icon: '🔫', materialId: 'assault_part',
      desc: '联邦哨站标配电磁突击步枪，弹道平稳且具有出色的综合战术表现。',
      baseStats: { damage: 40, fireInterval: 0.36, bulletSpeed: 720, pierce: 1, multishot: 1, critChance: 0.14, magazineCapacity: 30, reloadTime: 1.4 },
      growth: { damagePerLevel: 6, critPerLevel: 0.015, magazinePerLevel: 4, bulletSpeedPerLevel: 15, fireRatePerLevel: 0.005, damagePerPowerLevel: 4, bulletSpeedPerShardLevel: 25, attackSpeedPerShardRatio: 0.03 }
    },
    gatling: {
      id: 'gatling', name: '毁灭加特林风暴', tag: '超频暴射', icon: '💥', materialId: 'gatling_part',
      desc: '六管重型转管机枪，以狂暴极速倾泻金属风暴，正前方压制一切尸潮！',
      baseStats: { damage: 24, fireInterval: 0.14, bulletSpeed: 800, pierce: 1, multishot: 1, critChance: 0.10, magazineCapacity: 80, reloadTime: 2.2 },
      growth: { damagePerLevel: 3.5, critPerLevel: 0.01, magazinePerLevel: 12, bulletSpeedPerLevel: 18, fireRatePerLevel: 0.002, damagePerPowerLevel: 2.5, bulletSpeedPerShardLevel: 30, attackSpeedPerShardRatio: 0.025 }
    },
    gauss: {
      id: 'gauss', name: '泰坦高斯穿甲狙', tag: '强力贯穿', icon: '⚡', materialId: 'gauss_part',
      desc: '战术重型轨道炮，发射超音速穿甲合金弹芯，直线贯穿整条道路敌人！',
      baseStats: { damage: 135, fireInterval: 0.65, bulletSpeed: 1050, pierce: 4, multishot: 1, critChance: 0.28, magazineCapacity: 6, reloadTime: 1.8 },
      growth: { damagePerLevel: 20, critPerLevel: 0.02, magazinePerLevel: 1, bulletSpeedPerLevel: 30, fireRatePerLevel: 0.008, damagePerPowerLevel: 14, bulletSpeedPerShardLevel: 45, attackSpeedPerShardRatio: 0.035 }
    },
    plasma: {
      id: 'plasma', name: '离子散射爆能枪', tag: '三路散射', icon: '💠', materialId: 'plasma_part',
      desc: '等离子高能发射器，单次齐射 3 枚离子光束弹，大幅覆盖前方战区。',
      baseStats: { damage: 32, fireInterval: 0.42, bulletSpeed: 680, pierce: 1, multishot: 3, critChance: 0.16, magazineCapacity: 24, reloadTime: 1.6 },
      growth: { damagePerLevel: 4.8, critPerLevel: 0.015, magazinePerLevel: 3, bulletSpeedPerLevel: 16, fireRatePerLevel: 0.005, damagePerPowerLevel: 3.5, bulletSpeedPerShardLevel: 25, attackSpeedPerShardRatio: 0.03 }
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
    shield: { id: 'shield', name: '能量屏障', icon: 'assets/icons/icon_shield.png', baseVal: 300, addPerLvl: 60, maxLevel: 30, costBase: 90, costGrowth: 1.32, unit: '点护盾', desc: '部署高频磁约束偏转能量屏障，为防线提供抵挡尸潮冲击的第一道护盾。' },
    regen: { id: 'regen', name: '纳米自愈', icon: 'assets/icons/icon_stamina.png', baseVal: 25, addPerLvl: 8, maxLevel: 30, costBase: 100, costGrowth: 1.34, unit: '点/秒', desc: '植入智能自修复微型纳米阵列，大幅加快脱战后护盾与屏障的充能恢复效率。' },
    armor: { id: 'armor', name: '反伤尖刺', icon: 'assets/icons/icon_part.png', baseVal: 0, addPerLvl: 6, maxLevel: 30, costBase: 120, costGrowth: 1.36, unit: '点反伤', desc: '在城防外围部署电磁反应荆棘，任何贴身攻击城防的感染者均会受到高额物理反弹震荡！' }
  },

  // 双模式配置 (普通 vs 精英)
  modes: {
    normal: { id: 'normal', name: '普通模式', tag: '标准探索', color: '#38bdf8', hpMult: 1.0, atkMult: 1.0, countMult: 1.0, scrapMult: 1.0, shardMult: 1.0, gemChance: 0.15, desc: '标准的尸潮进攻强度，适合开荒推进与稳步收集素材。' },
    elite: { id: 'elite', name: '精英模式', tag: '极度凶险', color: '#f43f5e', hpMult: 1.6, atkMult: 1.85, countMult: 1.35, scrapMult: 2.2, shardMult: 2.0, gemChance: 0.70, desc: '极度高危作战！感染者数量与破坏力大幅攀升，所有战利品掉落与稀有芯片翻倍！' }
  },

  // 五大递进战区 (5 大主题战区 x 10 关 = 50 关 + 无尽终极深渊)
  chapters: [
    {
      id: 1, name: '第一战区 · 废土边境', shortName: '废土边境', stages: [1, 10], color: '#38bdf8', icon: '🏜️',
      desc: '人类最后防线初建，遭遇普通感染者与初期冲锋尸潮',
      ambience: { filter: 'brightness(0.92) contrast(1.04)', tint: 'rgba(56, 189, 248, 0.08)', haze: 'rgba(15, 23, 42, 0.55)' }
    },
    {
      id: 2, name: '第二战区 · 剧毒废墟', shortName: '剧毒废墟', stages: [11, 20], color: '#10b981', icon: '☣️',
      desc: '被生化腐蚀的废弃工业带，酸液突变体与极速冲锋者集群',
      ambience: { filter: 'brightness(0.86) contrast(1.12) hue-rotate(55deg) saturate(1.25)', tint: 'rgba(16, 185, 129, 0.12)', haze: 'rgba(6, 78, 59, 0.65)' }
    },
    {
      id: 3, name: '第三战区 · 熔岩裂谷', shortName: '熔岩裂谷', stages: [21, 30], color: '#f97316', icon: '🌋',
      desc: '地幔崩裂的熔岩地狱，狂暴重装巨尸与熔核巨兽',
      ambience: { filter: 'brightness(0.88) contrast(1.16) hue-rotate(335deg) saturate(1.4)', tint: 'rgba(249, 115, 22, 0.14)', haze: 'rgba(124, 45, 18, 0.7)' }
    },
    {
      id: 4, name: '第四战区 · 机械遗迹', shortName: '机械遗迹', stages: [31, 40], color: '#06b6d4', icon: '🦾',
      desc: '失控自动化要塞，赛博机甲哨卫与重型电磁风暴',
      ambience: { filter: 'brightness(0.9) contrast(1.22) hue-rotate(185deg) saturate(1.35)', tint: 'rgba(6, 182, 212, 0.12)', haze: 'rgba(22, 78, 99, 0.65)' }
    },
    {
      id: 5, name: '第五战区 · 虚空深渊', shortName: '虚空深渊', stages: [41, 50], color: '#a855f7', icon: '🌌',
      desc: '空间裂隙深处的母体巢穴，决战终极支配者暴君',
      ambience: { filter: 'brightness(0.82) contrast(1.28) hue-rotate(250deg) saturate(1.5)', tint: 'rgba(168, 85, 247, 0.15)', haze: 'rgba(88, 28, 135, 0.75)' }
    },
    {
      id: 6, name: '终极战区 · 无尽深渊', shortName: '无尽深渊', stages: [51, 51], color: '#eab308', icon: '♾️',
      desc: '无极限防御实战模拟，极限检验指挥官终极科技',
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
    { id: 'rocket', name: '温压火箭', element: 'fire', asset: 'assets/cards/icon_rocket.png', rarity: 'legendary', type: '火系 · 范围爆破', desc: '部署温压重型火箭，定点引发大范围爆轰核爆与持续烈火灼烧区。', cooldown: 5.5, materialId: 'chip_rocket', unlockHint: '在第 1 战区收集碎片合成' },
    { id: 'freeze', name: '极寒射线', element: 'ice', asset: 'assets/cards/icon_frost.png', rarity: 'rare', type: '冰系 · 控场霜冻', desc: '向前喷射大范围超低温冰雾，附带霜冻伤害并极速削减敌人移速。', cooldown: 7.0, materialId: 'chip_freeze', unlockHint: '在第 1~2 战区收集碎片合成' },
    { id: 'truck', name: '装甲战车', element: 'physical', asset: 'assets/cards/icon_truck.png', rarity: 'legendary', type: '物理 · 直线碾压', desc: '呼叫突击重型装甲车，自防线冲撞碾压沿途所有敌人并造成高额击退！', cooldown: 8.0, materialId: 'chip_truck', unlockHint: '在第 2~3 战区收集碎片合成' },
    { id: 'tornado', name: '裂风涡流', element: 'wind', asset: 'assets/skills/tornado.png', rarity: 'epic', type: '风系 · 元素扩散', desc: '生成持续 4 秒的风暴漩涡，平滑阻尼牵引敌人并使火与冰状态向外大范围扩散！', cooldown: 8.0, materialId: 'chip_tornado', unlockHint: '在第 3~4 战区收集碎片合成' },
    { id: 'boomerang', name: '回旋刃', element: 'physical', asset: 'assets/skills/boomerang.png', rarity: 'rare', type: '物理 · 往返高暴', desc: '高速发射合金穿透飞刃，往返切割穿透，自带 35% 额外暴击率！', cooldown: 5.0, materialId: 'chip_boomerang', unlockHint: '在第 2~4 战区收集碎片合成' },
    { id: 'laser', name: '湮灭射线', element: 'thunder', asset: 'assets/skills/laser.png', rarity: 'legendary', type: '雷系 · 感电超载', desc: '释放贯穿全屏的高能雷电射线，对直线目标造成感电，并能引燃超载大爆轰！', cooldown: 3.0, materialId: 'chip_laser', unlockHint: '在第 4~5 战区收集碎片合成' },
    { id: 'bomber', name: '轨道轰炸', element: 'fire', asset: 'assets/skills/bomber.png', rarity: 'epic', type: '火系 · 集群轰炸', desc: '战术红圈预瞄战区，呼叫轨道轰炸机连投 3 发烈火集束重弹！', cooldown: 12.0, materialId: 'chip_bomber', unlockHint: '在第 3~5 战区收集碎片合成' }
  ],

  synergyCatalog: [
    { name: '热力冲击引擎', synergy: '元素反应 · 殉爆', desc: '火箭或烈焰击中冰冻目标时，引发 220% 威力温差热力殉爆与破甲蒸汽！', icon: 'assets/cards/icon_thermal.png', rarity: 'legendary' },
    { name: '电磁超导弹头', synergy: '电磁连锁', desc: '主武器暴击时释放高压电弧，自动弹射连锁跳跃至附近 2 个敌方目标！', icon: 'assets/cards/icon_tesla.png', rarity: 'epic' },
    { name: '雷火超载爆轰', synergy: '元素反应 · 超载', desc: '雷电属性攻击击中已灼烧的敌人时，触发剧烈超载大爆炸并击退周围群怪！', icon: 'assets/skills/laser.png', rarity: 'legendary' },
    { name: '裂风元素扩散', synergy: '元素反应 · 扩散', desc: '风暴涡流吸附敌人时，将其身上的燃烧或冰冻状态瞬间向周围所有怪物扩散！', icon: 'assets/skills/tornado.png', rarity: 'epic' },
    { name: '防线 EMP 脉冲环', synergy: '绝对防御', desc: '护盾破裂时爆发超强 EMP 冲击波，眩晕全屏所有普通感染者 1.5 秒！', icon: 'assets/cards/icon_emp.png', rarity: 'epic' },
    { name: '战车热能喷射器', synergy: '火焰战车', desc: '装甲战车行进尾迹遗留持续燃烧的高温火径，持续焚烧踩踏的敌人。', icon: 'assets/cards/icon_inferno.png', rarity: 'legendary' },
    { name: '极低温裂碎', synergy: '冰爆碎冰', desc: '击杀处于霜冻状态的敌人时发生冰爆，造成范围伤害并冻结周围目标。', icon: 'assets/cards/icon_shatter.png', rarity: 'legendary' }
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
          { level: 5, title: '二阶·觉醒爆裂球', bulletCount: 5, desc: '发射 5 连贯穿弹幕，附带减速' },
          { level: 10, title: '三阶·终极机甲神球', bulletCount: 7, desc: '发射 7 连爆轰弹幕，护盾强化' }
        ]
      },
      dragon: {
        id: 'dragon', name: '烈焰幼龙', asset: 'assets/pets/dragon.png',
        tag: '炽烈灼烧', materialId: 'dragon_shard',
        description: '扇形喷吐高热烈焰吐息，造成范围伤害并持续引燃战场',
        baseStats: { hp: 100, attack: 22, attackSpeed: 0.85, moveSpeed: 160, range: 260, shield: 100 },
        skill: 'FIRE_BREATH', skillParams: { duration: 1.0, angle: Math.PI / 3 },
        evolutions: [
          { level: 1, title: '一阶·幼龙烈火', angle: Math.PI / 3, desc: '喷吐 60° 扇形高温龙炎' },
          { level: 5, title: '二阶·狂炎巨龙', angle: Math.PI / 2, desc: '喷吐 90° 超大范围龙炎并留下火地' },
          { level: 10, title: '三阶·灭世熔岩龙', angle: Math.PI * 0.65, desc: '灭世扇面龙炎，附加爆裂熔岩' }
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

    // 宠物专属基因碎片
    fluffy_shard: { id: 'fluffy_shard', name: '小毛球基因碎片', category: 'pet', rarity: 'rare', icon: 'assets/items/item_fluffy_shard.png', targetId: 'fluffy', targetType: 'pet', desc: '蕴含星界虚空浮游生物特异基因，集齐 10 个可解锁小毛球伴飞助战。', usage: '用于伴飞宠物【小毛球】解锁与强化' },
    dragon_shard: { id: 'dragon_shard', name: '幼龙烈焰晶核', category: 'pet', rarity: 'legendary', icon: 'assets/items/item_dragon_shard.png', targetId: 'dragon', targetType: 'pet', desc: '远古火龙蜕鳞凝聚的纯净火核，集齐 10 个可解锁幼龙喷吐烈火龙息。', usage: '用于伴飞宠物【幼龙】解锁与强化' },

    // 技能专属战术芯片 (收集10个合成技能)
    chip_rocket: { id: 'chip_rocket', name: '温压弹火控芯片', category: 'skill', rarity: 'legendary', icon: 'assets/items/item_chip_rocket.png', targetId: 'rocket', targetType: 'skill', desc: '记载重型温压火箭定点爆轰算法的芯片，集齐 10 块可在技能图谱中合成解锁【温压火箭】！', usage: '集齐 10 块合成解锁【温压火箭】' },
    chip_freeze: { id: 'chip_freeze', name: '极寒射线致冷核心', category: 'skill', rarity: 'rare', icon: 'assets/items/item_chip_freeze.png', targetId: 'freeze', targetType: 'skill', desc: '超低温冷凝循环装置，集齐 10 块可在技能图谱中合成解锁【极寒射线】！', usage: '集齐 10 块合成解锁【极寒射线】' },
    chip_truck: { id: 'chip_truck', name: '装甲战车推进模组', category: 'skill', rarity: 'epic', icon: 'assets/items/item_chip_truck.png', targetId: 'truck', targetType: 'skill', desc: '突击装甲车的加固冲撞前锋组件，集齐 10 块可在技能图谱中合成解锁【装甲战车】！', usage: '集齐 10 块合成解锁【装甲战车】' },
    chip_tornado: { id: 'chip_tornado', name: '裂风涡流导流核', category: 'skill', rarity: 'epic', icon: 'assets/items/item_chip_tornado.png', targetId: 'tornado', targetType: 'skill', desc: '人造气旋引力奇点组件，集齐 10 块可在技能图谱中合成解锁【裂风涡流】！', usage: '集齐 10 块合成解锁【裂风涡流】' },
    chip_boomerang: { id: 'chip_boomerang', name: '回旋合金谐振片', category: 'skill', rarity: 'rare', icon: 'assets/items/item_chip_boomerang.png', targetId: 'boomerang', targetType: 'skill', desc: '高周波飞刃的微晶压电晶片，集齐 10 块可在技能图谱中合成解锁【回旋刃】！', usage: '集齐 10 块合成解锁【回旋刃】' },
    chip_laser: { id: 'chip_laser', name: '湮灭偏振聚焦镜', category: 'skill', rarity: 'legendary', icon: 'assets/items/item_chip_laser.png', targetId: 'laser', targetType: 'skill', desc: '轨道歼灭炮的纯石英折射棱镜，集齐 10 块可在技能图谱中合成解锁【湮灭射线】！', usage: '集齐 10 块合成解锁【湮灭射线】' },
    chip_bomber: { id: 'chip_bomber', name: '轨道轰炸定位密钥', category: 'skill', rarity: 'epic', icon: 'assets/items/item_chip_bomber.png', targetId: 'bomber', targetType: 'skill', desc: '近地轨道轰炸网络加密数据密钥，集齐 10 块可在技能图谱中合成解锁【轨道轰炸】！', usage: '集齐 10 块合成解锁【轨道轰炸】' },

    // 枪械三维强化专属碎片
    power_shard: { id: 'power_shard', name: '力量碎片', category: 'weapon', rarity: 'rare', icon: 'assets/icons/icon_level.png', targetType: 'weapon', desc: '蕴含强效动能加速高纯晶体，用于在枪械库中持续强化主武器威力与攻击力。', usage: '用于枪械【力量强化】提升攻击威力' },
    bulletspeed_shard: { id: 'bulletspeed_shard', name: '射速碎片', category: 'weapon', rarity: 'rare', icon: 'assets/cards/icon_pierce.png', targetType: 'weapon', desc: '超导磁流体弹道微粒，用于在枪械库中升级枪械弹药出膛与飞行极速。', usage: '用于枪械【射速强化】提升子弹弹速' },
    attackspeed_shard: { id: 'attackspeed_shard', name: '攻速碎片', category: 'weapon', rarity: 'rare', icon: 'assets/cards/icon_firerate.png', targetType: 'weapon', desc: '高频击发共振合金晶片，用于在枪械库中升级击发机构并降低射击间隔。', usage: '用于枪械【攻速强化】提升开火频率' },

    // 弹匣扩容与符文强化专属碎片
    mag_shard: { id: 'mag_shard', name: '扩容弹匣碎片', category: 'weapon', rarity: 'rare', icon: 'assets/icons/icon_part.png', targetType: 'magazine', desc: '高密聚能微缩供弹匣扩展模组组件，用于在枪械库中不断升级扩充主武器弹匣容量。', usage: '用于枪械【弹匣扩容】升级提升载弹量' },
    rune_shard: { id: 'rune_shard', name: '远古符文碎片', category: 'rune', rarity: 'epic', icon: 'assets/icons/icon_shard.png', targetType: 'rune', desc: '铭刻着古老战术共鸣铭文的高能晶体碎片，是符文工坊中强化永久战斗符文的关键素材。', usage: '用于【符文工坊】中强化各类永久战术符文' },

    // 军备补给与消耗道具
    energy_potion: { id: 'energy_potion', name: '高能战术能量剂', category: 'consumable', rarity: 'rare', icon: 'assets/items/item_energy_potion.png', targetType: 'energy', desc: '军工高纯度神经活性复合营养剂，使用后可立即恢复 25 点前线作战体能。', usage: '直接在背包中使用可恢复 25 点体能' },
    supply_crate: { id: 'supply_crate', name: '前线战略军备箱', category: 'consumable', rarity: 'epic', icon: 'assets/items/item_supply_crate.png', targetType: 'crate', desc: '前线空投的高规格密封物资箱，开启可随机获得多种枪械零件、技能芯片与稀有宠物基因。', usage: '直接在背包中开启抽取战术物资' }
  },

  // 怪物基础数值体系 (平滑初期第 1 关难度)
  enemies: {
    runner: { radius: 20, baseHp: 52, speedMin: 48, speedMax: 68, attackPower: 20, attackCooldown: 1.2, expVal: 6, color: '#10b981', name: '普通感染者' },
    charger: { radius: 18, baseHp: 46, speedMin: 95, speedMax: 125, attackPower: 22, attackCooldown: 0.9, expVal: 9, color: '#f59e0b', name: '疾行冲锋者' },
    behemoth: { radius: 36, baseHp: 320, speedMin: 40, speedMax: 52, attackPower: 65, attackCooldown: 1.5, expVal: 22, color: '#ef4444', name: '重装巨尸' },
    boss_overlord: { radius: 48, baseHp: 950, speed: 40, attackPower: 110, attackCooldown: 1.4, expVal: 65, color: '#ff2a5f', stompInterval: 4.0, name: '哨站行刑官' }
  },

  difficulty: {
    getEnemyWaveScale(wave) { if (wave <= 1) return 0.85; return 0.85 + Math.pow(wave - 1, 0.86) * 0.22; },
    getBossWaveScale(wave) { return 0.9 + (wave - 1) * 0.28; },
    getWaveEnemyCount(wave) { return Math.round(10 + Math.pow(wave, 1.05) * 4); },
    getWaveSpawnInterval(wave) { return Math.max(0.35, 1.5 - Math.log2(wave + 1) * 0.35); }
  },

  // 关卡体系配置 (包含差异化定向掉落、怪物梯度与首通奖励，全量 50 关 + 无尽模式)
  stages: (() => {
    // 50 关详尽关卡名录与特色设定
    const STAGE_NAMES = [
      // 战区 1 (1-10)：废土边境
      '废土前哨', '锈蚀干道', '断裂立交', '黄沙驿站', '哨站死斗',
      '风蚀巨壁', '荒芜工业园', '破败加油站', '铁丝网隘口', '边境处决场',
      // 战区 2 (11-20)：剧毒废墟
      '化工厂外围', '毒沼潜流', '腐蚀排水管', '生化储罐区', '毒核收容所',
      '酸蚀居民区', '菌丝地铁口', '变异苗圃', '重度污染渠', '腐化母体之心',
      // 战区 3 (21-30)：熔岩裂谷
      '黑曜石裂缝', '滚烫火山道', '地热通风塔', '赤红熔岩河', '炎魔前哨',
      '硫磺矿脉', '崩解悬崖', '熔核钻井站', '沸腾熔岩湖', '炎魔领主王座',
      // 战区 4 (31-40)：机械遗迹
      '失控安防闸', '机械装配线', '高压电网廊', '自动化兵工厂', '雷暴中枢塔',
      '伺服阵列群', '超导磁轨桥', '纳米合成车间', '重巡机甲库', '机械歼灭者座驾',
      // 战区 5 (41-50)：虚空深渊
      '裂隙视界', '虚空侵蚀带', '反物质断层', '黯淡星火台', '深渊裂口',
      '暗能共鸣腔', '湮灭漩涡区', '母巢神经节', '终焉倒悬塔', '母巢支配者·终末'
    ];

    const stagesList = [];
    for (let id = 1; id <= 50; id++) {
      const chapterId = Math.min(5, Math.ceil(id / 10));
      const posInCh = ((id - 1) % 10) + 1; // 1 to 10
      const isMiniBoss = posInCh === 5;
      const isChapterBoss = posInCh === 10;
      const name = STAGE_NAMES[id - 1] || `防线关卡 ${id}`;

      // 递增波次设计：前 10 关 5~8 波，中间 8~12 波，末期 12~16 波，第 50 关 18 波
      let clearWaves = 5;
      if (id <= 3) clearWaves = 5 + (id - 1);
      else if (id <= 10) clearWaves = 6 + Math.floor((id - 4) / 2);
      else if (id <= 20) clearWaves = 8 + Math.floor((id - 11) / 3);
      else if (id <= 30) clearWaves = 9 + Math.floor((id - 21) / 3);
      else if (id <= 40) clearWaves = 11 + Math.floor((id - 31) / 3);
      else if (id < 50) clearWaves = 13 + Math.floor((id - 41) / 3);
      else clearWaves = 18; // 终极决战 18 波次

      // 难度系数平滑幂次增长：0.85 -> 4.60
      const difficulty = parseFloat((0.85 + (id - 1) * 0.065 + Math.pow((id - 1) / 10, 1.25) * 0.08).toFixed(2));
      // 废料奖励增长
      const scrapReward = 80 + (id - 1) * 22 + Math.floor(Math.pow(id, 1.15) * 4);

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
        chip_rocket: '温压弹火控芯片', chip_freeze: '极寒致冷核心', chip_truck: '装甲战车推进模组',
        chip_tornado: '裂风涡流导流核', chip_boomerang: '回旋合金谐振片', chip_laser: '湮灭偏振聚焦镜',
        chip_bomber: '轨道轰炸定位密钥'
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
        targetDrops.push({ id: 'fluffy_shard', name: '小毛球基因', icon: 'assets/items/item_fluffy_shard.png' });
      } else if (chapterId === 3) {
        targetDrops.push({ id: 'mag_shard', name: '扩容弹匣碎片', icon: 'assets/icons/icon_part.png' });
        targetDrops.push({ id: 'plasma_part', name: '等离子磁环', icon: 'assets/items/item_plasma_part.png' });
        targetDrops.push({ id: 'dragon_shard', name: '幼龙火核', icon: 'assets/items/item_dragon_shard.png' });
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
      else if (isMiniBoss) bossTitle = '【精英中首领突袭】';

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
        featuredChip,
        chipDropCount,
        allowedEnemies,
        desc: `${bossTitle}抵御 ${clearWaves} 波感染者进攻，肃清战区据点！产出【${chipNames[featuredChip]}】与强化素材。`,
        targetDrops
      });
    }

    // 终极无尽关卡 (Stage 51)
    stagesList.push({
      id: 51,
      chapter: 6,
      posInChapter: 1,
      name: '无尽深渊防线',
      clearWaves: 0,
      scrapReward: 0,
      bossEvery: 5,
      difficulty: 1.50,
      endless: true,
      allowedEnemies: ['runner', 'charger', 'behemoth'],
      desc: '无穷无尽的极限生存考验，尸潮生生不息，检验终极指挥官防线！',
      targetDrops: [
        { id: 'power_shard', name: '终焉力量碎片', icon: 'assets/icons/icon_level.png', highlight: true },
        { id: 'rune_shard', name: '远古符文精华', icon: 'assets/icons/icon_shard.png', highlight: true },
        { id: 'supply_crate', name: '战略军备箱', icon: 'assets/items/item_supply_crate.png' }
      ]
    });

    return stagesList;
  })()
};
