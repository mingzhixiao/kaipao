// ---------------- Roguelike 升级卡池与技能构筑体系 ----------------

export function buildUpgradeCardPool(game) {
  game = game || window.gameInstance || {};
  const skills = game.skills = game.skills || {};
  skills.rocket = skills.rocket || { level: 0, cooldown: 5 };
  skills.truck = skills.truck || { level: 0, cooldown: 8 };
  skills.freeze = skills.freeze || { level: 0, duration: 1.2 };
  game.synergies = game.synergies || {};
  game.weapon = game.weapon || { multishot: 1, damage: 30 };

  const pool = [
    {
      id: 'rocket',
      name: game.skills.rocket.level === 0 ? '温压火箭 (解锁)' : '温压火箭 (强化)',
      desc: game.skills.rocket.level === 0 ? '部署温压重型火箭，定点引发大范围爆轰核爆与火焰灼烧区。' : '爆炸伤害+35%，爆破范围+20%，冷却-0.5s。',
      img: 'assets/icon_rocket.jpg',
      rarity: game.skills.rocket.level === 0 ? 'legendary' : 'rare',
      element: 'fire',
      synergy: '[火系 · 重装火力]',
      apply: () => {
        game.skills.rocket.level++;
        game.skills.rocket.cooldown = Math.max(3.0, game.skills.rocket.cooldown - 0.5);
      }
    },
    {
      id: 'truck',
      name: game.skills.truck.level === 0 ? '装甲战车 (解锁)' : '装甲战车 (强化)',
      desc: game.skills.truck.level === 0 ? '呼叫重型突击装甲车，自防线轰鸣冲撞碾压沿途所有敌人！' : '战车碾压伤害+40%，击退距离+50px，冷却-1.0s。',
      img: 'assets/icon_truck.jpg',
      rarity: game.skills.truck.level === 0 ? 'legendary' : 'rare',
      element: 'physical',
      synergy: '[物理 · 重装碾压]',
      apply: () => {
        game.skills.truck.level++;
        game.skills.truck.cooldown = Math.max(4.0, game.skills.truck.cooldown - 1.0);
      }
    },
    {
      id: 'freeze',
      name: game.skills.freeze.level === 0 ? '极寒射线 (解锁)' : '极寒射线 (强化)',
      desc: game.skills.freeze.level === 0 ? '周期性向前喷射大范围超低温冰雾，极速减速与冰冻敌人。' : '持续时间+0.5s，减速效果更强，每秒附带霜冻伤害+30%。',
      img: 'assets/icon_frost.jpg',
      rarity: game.skills.freeze.level === 0 ? 'rare' : 'rare',
      element: 'ice',
      synergy: '[冰系 · 控场减速]',
      apply: () => {
        game.skills.freeze.level++;
        game.skills.freeze.duration += 0.4;
      }
    },
    {
      id: 'laser',
      name: (game.feature?.skills?.laser?.level || 0) === 0 ? '湮灭射线 (解锁)' : '湮灭射线 (强化)',
      desc: (game.feature?.skills?.laser?.level || 0) === 0 ? '贯穿全屏的高能雷电射线，引发高频感电贯通，引爆火焰超载！' : '射线威力+30%，持续时间增加，感电超载爆轰提升。',
      img: 'assets/skills/laser.png',
      rarity: 'legendary',
      element: 'thunder',
      synergy: '[雷系 · 感电超载]',
      apply: () => {
        if (game.feature?.skills?.laser) {
          game.feature.skills.laser.level++;
          game.feature.skills.laser.timer = 0;
        }
      }
    },
    {
      id: 'tornado',
      name: (game.feature?.skills?.tornado?.level || 0) === 0 ? '裂风涡流 (解锁)' : '裂风涡流 (强化)',
      desc: (game.feature?.skills?.tornado?.level || 0) === 0 ? '持续风暴涡流阻尼牵引敌人，并触发元素扩散机制（大范围传播冰/火）！' : '风暴半径+25px，持续时间+0.8s，阻尼牵引与扩散威能增强。',
      img: 'assets/skills/tornado.png',
      rarity: 'epic',
      element: 'wind',
      synergy: '[风系 · 元素扩散]',
      apply: () => {
        if (game.feature?.skills?.tornado) {
          game.feature.skills.tornado.level++;
          game.feature.skills.tornado.timer = 0;
        }
      }
    },
    {
      id: 'bomber',
      name: (game.feature?.skills?.bomber?.level || 0) === 0 ? '轨道轰炸 (解锁)' : '轨道轰炸 (强化)',
      desc: (game.feature?.skills?.bomber?.level || 0) === 0 ? '战术红圈预瞄战区，呼叫巡航机连续投掷 3 发烈火集束重弹！' : '轰炸伤害+35%，爆炸击退+30px，冷却缩短。',
      img: 'assets/skills/bomber.png',
      rarity: 'epic',
      element: 'fire',
      synergy: '[火系 · 毁灭轰炸]',
      apply: () => {
        if (game.feature?.skills?.bomber) {
          game.feature.skills.bomber.level++;
          game.feature.skills.bomber.timer = 0;
        }
      }
    },
    {
      id: 'boomerang',
      name: (game.feature?.skills?.boomerang?.level || 0) === 0 ? '回旋刃 (解锁)' : '回旋刃 (强化)',
      desc: (game.feature?.skills?.boomerang?.level || 0) === 0 ? '高速往返贯穿飞刃，双程切割穿透，自带 35% 额外暴击率！' : '飞刃伤害+30%，飞行射程+80px，暴击撕裂提升。',
      img: 'assets/skills/boomerang.png',
      rarity: 'rare',
      element: 'physical',
      synergy: '[物理 · 暴击贯穿]',
      apply: () => {
        if (game.feature?.skills?.boomerang) {
          game.feature.skills.boomerang.level++;
          game.feature.skills.boomerang.timer = 0;
        }
      }
    },
    {
      id: 'thermal_engine',
      name: '热力冲击引擎',
      desc: '【化学反应】火箭或烈焰击中冰冻目标时，触发 220% 威力温差热力殉爆与破甲蒸汽震荡！',
      img: 'assets/icon_thermal.jpg',
      rarity: 'legendary',
      element: 'fire',
      synergy: '[元素反应 · 殉爆]',
      apply: () => {
        game.synergies.thermalEngine = true;
      }
    },
    {
      id: 'tesla_coil',
      name: '电磁超导弹头',
      desc: '【弹道协同】武器暴击或雷电命中时释放高压电弧，连锁弹射跳跃至附近 2 个敌方目标！',
      img: 'assets/icon_tesla.jpg',
      rarity: 'epic',
      element: 'thunder',
      synergy: '[电磁连锁]',
      apply: () => {
        game.synergies.teslaCoil = true;
      }
    },
    {
      id: 'fortress_emp',
      name: '紧急防线过载',
      desc: '【战术防御】当防御盾被击碎瞬间，触发全场高能 EMP 电磁冲击波，冻结并击退周围敌群！',
      img: 'assets/icon_emp.jpg',
      rarity: 'epic',
      element: 'thunder',
      synergy: '[防线过载]',
      apply: () => {
        game.synergies.fortressEmp = true;
      }
    },
    {
      id: 'truck_inferno',
      name: '重装喷火战车',
      desc: '【战车改装】重型装甲车加装后置火箭推力喷火器，飞驰沿途留下一整条炽热灼烧带！',
      img: 'assets/icon_inferno.png',
      rarity: 'epic',
      element: 'fire',
      synergy: '[战车协同]',
      apply: () => {
        game.synergies.truckInferno = true;
      }
    },
    {
      id: 'cryo_shatter',
      name: '极寒深冻碎裂',
      desc: '【战车协同】装甲战车碾压冰冻敌人时将其彻底粉碎，并向全场前方爆射 5 枚穿透冰晶刺！',
      img: 'assets/icon_shatter.png',
      rarity: 'rare',
      element: 'ice',
      synergy: '[冰霜碎裂]',
      apply: () => {
        game.synergies.cryoShatter = true;
      }
    },
    {
      id: 'multishot',
      name: '多重弹道模组',
      desc: '主角主武器每次射击额外增加 1 枚散射弹道，火力覆盖倍增。',
      img: 'assets/icon_multishot.png',
      rarity: 'legendary',
      element: 'physical',
      synergy: '[枪械弹道]',
      apply: () => {
        game.weapon.multishot++;
        game.weapon.damage = Math.round(game.weapon.damage * 0.9);
      }
    },
    {
      id: 'firerate',
      name: '超频连发机匣',
      desc: '主武器射速提升 25%，极速倾泻火力压制狂暴尸潮。',
      img: 'assets/icon_firerate.png',
      rarity: 'common',
      element: 'physical',
      synergy: '[射速提升]',
      apply: () => {
        game.hero.baseAttackInterval = Math.max(0.08, game.hero.baseAttackInterval * 0.8);
      }
    },
    {
      id: 'piercing',
      name: '贫铀穿甲弹头',
      desc: '子弹穿透次数 +1，直线射击可洞穿前后多个目标。',
      img: 'assets/icon_pierce.jpg',
      rarity: 'rare',
      element: 'physical',
      synergy: '[穿甲贯通]',
      apply: () => {
        game.weapon.pierceCount++;
      }
    },
    {
      id: 'crit',
      name: '战术弱点瞄准仪',
      desc: '暴击率提升 15%，暴击伤害额外提升 50%。',
      img: 'assets/icon_crit.png',
      rarity: 'rare',
      element: 'physical',
      synergy: '[致命弱点]',
      apply: () => {
        game.weapon.critChance += 0.15;
        game.weapon.critMult += 0.5;
      }
    },
    {
      id: 'shield',
      name: '纳米修复与能量盾',
      desc: '立即修复防线 40% 生命值，并提高护盾上限与自动充能速度。',
      img: 'assets/icon_shield.jpg',
      rarity: 'common',
      element: 'shield',
      synergy: '[防线稳固]',
      apply: () => {
        game.fortress.hp = Math.min(game.fortress.maxHp, game.fortress.hp + game.fortress.maxHp * 0.4);
        game.fortress.maxShield += 100;
        game.fortress.shield = game.fortress.maxShield;
        game.fortress.shieldRegenRate += 12;
      }
    },
    {
      id: 'magnet',
      name: '高能磁吸力场',
      desc: '大幅提升掉落晶核的吸取范围 +80%，拾取更加轻松高效。',
      img: 'assets/icon_gem.jpg',
      rarity: 'common',
      element: 'utility',
      synergy: '[资源效率]',
      apply: () => {
        game.hero.magnetRange += 80;
      }
    }
  ];

  // 过滤已选满的唯一协同被动
  return pool.filter(card => {
    if (card.id === 'thermal_engine' && game.synergies.thermalEngine) return false;
    if (card.id === 'tesla_coil' && game.synergies.teslaCoil) return false;
    if (card.id === 'fortress_emp' && game.synergies.fortressEmp) return false;
    if (card.id === 'truck_inferno' && game.synergies.truckInferno) return false;
    if (card.id === 'cryo_shatter' && game.synergies.cryoShatter) return false;
    if (card.id === 'multishot' && game.weapon.multishot >= 5) return false;
    return true;
  });
}
