// ---------------- 游戏核心数值与平衡性配置文件 (Game Design & Balance Config) ----------------

export const GAME_CONFIG = {
  viewport: { baseWidth: 450, baseHeight: 800, roadMargin: 24 },
  fortress: { maxHp: 1000, maxShield: 300, shieldRegenDelay: 3.0, shieldRegenRate: 25, height: 100 },
  hero: { baseAttackInterval: 0.22, minAttackInterval: 0.07, expNeededBase: 25, expNeededGrowth: 1.32, expNeededAdd: 8, magnetRange: 130 },
  weapon: { damage: 35, critChance: 0.12, critMult: 2.0, bulletSpeed: 750, bulletRadius: 4, bulletLife: 2.0, pierceCount: 1, multishot: 1, spreadAngle: 0.14 },
  
  // 枪械武器库体系
  weapons: {
    assault: {
      id: 'assault', name: '先锋电磁步枪', tag: '均衡输出', icon: '🔫', materialId: 'assault_part',
      desc: '联邦哨站标配电磁突击步枪，弹道平稳且具有出色的综合战术表现。',
      baseStats: { damage: 36, fireInterval: 0.20, bulletSpeed: 760, pierce: 1, multishot: 1, critChance: 0.14 },
      growth: { damagePerLevel: 5, critPerLevel: 0.015 }
    },
    gatling: {
      id: 'gatling', name: '毁灭加特林风暴', tag: '超频暴射', icon: '💥', materialId: 'gatling_part',
      desc: '六管重型转管机枪，以狂暴极速倾泻金属风暴，正前方压制一切尸潮！',
      baseStats: { damage: 22, fireInterval: 0.09, bulletSpeed: 820, pierce: 1, multishot: 1, critChance: 0.10 },
      growth: { damagePerLevel: 3.2, fireRatePerLevel: 0.001 }
    },
    gauss: {
      id: 'gauss', name: '泰坦高斯穿甲狙', tag: '强力贯穿', icon: '⚡', materialId: 'gauss_part',
      desc: '战术重型轨道炮，发射超音速穿甲合金弹芯，直线贯穿整条道路敌人！',
      baseStats: { damage: 125, fireInterval: 0.55, bulletSpeed: 1050, pierce: 4, multishot: 1, critChance: 0.28 },
      growth: { damagePerLevel: 18, critPerLevel: 0.02 }
    },
    plasma: {
      id: 'plasma', name: '离子散射爆能枪', tag: '三路散射', icon: '💠', materialId: 'plasma_part',
      desc: '等离子高能发射器，单次齐射 3 枚离子光束弹，大幅覆盖前方战区。',
      baseStats: { damage: 28, fireInterval: 0.32, bulletSpeed: 720, pierce: 1, multishot: 3, critChance: 0.16 },
      growth: { damagePerLevel: 4.2, critPerLevel: 0.015 }
    }
  },

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
    { id: 'rocket', name: '温压火箭', element: 'fire', asset: 'assets/cards/icon_rocket.png', rarity: 'legendary', type: '火系 · 范围爆破', desc: '部署温压重型火箭，定点引发大范围爆轰核爆与持续烈火灼烧区。', cooldown: 5.5, materialId: 'chip_rocket' },
    { id: 'truck', name: '装甲战车', element: 'physical', asset: 'assets/cards/icon_truck.png', rarity: 'legendary', type: '物理 · 直线碾压', desc: '呼叫突击重型装甲车，自防线冲撞碾压沿途所有敌人并造成高额击退！', cooldown: 8.0, materialId: 'chip_truck' },
    { id: 'freeze', name: '极寒射线', element: 'ice', asset: 'assets/cards/icon_frost.png', rarity: 'rare', type: '冰系 · 控场霜冻', desc: '向前喷射大范围超低温冰雾，附带霜冻伤害并极速削减敌人移速。', cooldown: 7.0, materialId: 'chip_freeze' },
    { id: 'tornado', name: '裂风涡流', element: 'wind', asset: 'assets/skills/tornado.png', rarity: 'epic', type: '风系 · 元素扩散', desc: '生成持续 4 秒的风暴漩涡，平滑阻尼牵引敌人并使火与冰状态向外大范围扩散！', cooldown: 8.0, materialId: 'chip_tornado' },
    { id: 'boomerang', name: '回旋刃', element: 'physical', asset: 'assets/skills/boomerang.png', rarity: 'rare', type: '物理 · 往返高暴', desc: '高速发射合金穿透飞刃，往返切割穿透，自带 35% 额外暴击率！', cooldown: 5.0, materialId: 'chip_boomerang' },
    { id: 'laser', name: '湮灭射线', element: 'thunder', asset: 'assets/skills/laser.png', rarity: 'legendary', type: '雷系 · 感电超载', desc: '释放贯穿全屏的高能雷电射线，对直线目标造成感电，并能引燃超载大爆轰！', cooldown: 3.0, materialId: 'chip_laser' },
    { id: 'bomber', name: '轨道轰炸', element: 'fire', asset: 'assets/skills/bomber.png', rarity: 'epic', type: '火系 · 集群轰炸', desc: '战术红圈预瞄战区，呼叫轨道轰炸机连投 3 发烈火集束重弹！', cooldown: 12.0, materialId: 'chip_bomber' }
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
    fluffy_shard: { id: 'fluffy_shard', name: '小毛球基因碎片', category: 'pet', rarity: 'rare', icon: 'assets/items/item_fluffy_shard.png', targetId: 'fluffy', targetType: 'pet', desc: '蕴含星界虚空浮游生物特异基因，用于突破小毛球等级上限并提升弹幕威力。', usage: '用于伴飞宠物【小毛球】强化升级' },
    dragon_shard: { id: 'dragon_shard', name: '幼龙烈焰晶核', category: 'pet', rarity: 'legendary', icon: 'assets/items/item_dragon_shard.png', targetId: 'dragon', targetType: 'pet', desc: '远古火龙蜕鳞凝聚的纯净火核，用于滋养幼龙并大幅拓展龙息扇面与持续灼烧。', usage: '用于伴飞宠物【幼龙】强化升级' },

    // 技能专属战术芯片
    chip_rocket: { id: 'chip_rocket', name: '温压弹火控芯片', category: 'skill', rarity: 'legendary', icon: 'assets/items/item_chip_rocket.png', targetId: 'rocket', targetType: 'skill', desc: '记载重型温压火箭定点爆轰算法的芯片，极大提升爆破杀伤半径与轰击伤害。', usage: '用于战术技能【温压火箭】专精强化' },
    chip_truck: { id: 'chip_truck', name: '装甲战车推进模组', category: 'skill', rarity: 'epic', icon: 'assets/items/item_chip_truck.png', targetId: 'truck', targetType: 'skill', desc: '突击装甲车的加固冲撞前锋与动力增压器，增强战车碾压威力和推退距离。', usage: '用于战术技能【装甲战车】专精强化' },
    chip_freeze: { id: 'chip_freeze', name: '极寒射线致冷核心', category: 'skill', rarity: 'rare', icon: 'assets/items/item_chip_freeze.png', targetId: 'freeze', targetType: 'skill', desc: '超低温冷凝循环装置，扩大极寒射线的冰雾范围并延长霜冻控场持续时间。', usage: '用于战术技能【极寒射线】专精强化' },
    chip_tornado: { id: 'chip_tornado', name: '裂风涡流导流核', category: 'skill', rarity: 'epic', icon: 'assets/items/item_chip_tornado.png', targetId: 'tornado', targetType: 'skill', desc: '人造气旋引力奇点组件，大幅提升风暴涡流对怪群的牵引力度与撕裂频次。', usage: '用于战术技能【裂风涡流】专精强化' },
    chip_boomerang: { id: 'chip_boomerang', name: '回旋合金谐振片', category: 'skill', rarity: 'rare', icon: 'assets/items/item_chip_boomerang.png', targetId: 'boomerang', targetType: 'skill', desc: '高周波飞刃的微晶压电晶片，赋予穿透回旋刃更高的往返飞行速度与切割伤害。', usage: '用于战术技能【回旋刃】专精强化' },
    chip_laser: { id: 'chip_laser', name: '湮灭偏振聚焦镜', category: 'skill', rarity: 'legendary', icon: 'assets/items/item_chip_laser.png', targetId: 'laser', targetType: 'skill', desc: '轨道歼灭炮的纯石英折射棱镜，使贯穿全屏的湮灭激光造成毁灭性光热灼烧。', usage: '用于战术技能【湮灭射线】专精强化' },
    chip_bomber: { id: 'chip_bomber', name: '轨道轰炸定位密钥', category: 'skill', rarity: 'epic', icon: 'assets/items/item_chip_bomber.png', targetId: 'bomber', targetType: 'skill', desc: '近地轨道轰炸网络加密数据密钥，加快集束航弹投下频率并强化范围震荡。', usage: '用于战术技能【轨道轰炸】专精强化' },

    // 军备补给与消耗道具
    energy_potion: { id: 'energy_potion', name: '高能战术能量剂', category: 'consumable', rarity: 'rare', icon: 'assets/items/item_energy_potion.png', targetType: 'energy', desc: '军工高纯度神经活性复合营养剂，使用后可立即恢复 25 点前线作战体能。', usage: '直接在背包中使用可恢复 25 点体能' },
    supply_crate: { id: 'supply_crate', name: '前线战略军备箱', category: 'consumable', rarity: 'epic', icon: 'assets/items/item_supply_crate.png', targetType: 'crate', desc: '前线空投的高规格密封物资箱，开启可随机获得多种枪械零件、技能芯片与稀有宠物基因。', usage: '直接在背包中开启抽取战术物资' }
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
