// ---------------- Roguelike 升级卡池与技能构筑体系 ----------------

export function buildUpgradeCardPool(game) {
  const pool = [
    {
      id: 'rocket',
      name: game.skills.rocket.level === 0 ? '温压火箭 (解锁)' : '温压火箭 (强化)',
      desc: game.skills.rocket.level === 0 ? '部署温压重型火箭，定点引发大范围爆轰核爆与火焰灼烧区。' : '爆炸伤害+35%，爆破范围+20%，冷却-0.5s。',
      img: 'assets/icon_rocket.jpg',
      rarity: game.skills.rocket.level === 0 ? 'legendary' : 'rare',
      synergy: '[重装火力]',
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
      synergy: '[物理碾压]',
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
      synergy: '[控场减速]',
      apply: () => {
        game.skills.freeze.level++;
        game.skills.freeze.duration += 0.4;
      }
    },
    {
      id: 'thermal_engine',
      name: '热力冲击引擎',
      desc: '【化学反应】火箭或烈焰击中冰冻目标时，触发 220% 威力温差热力殉爆与破甲蒸汽震荡！',
      img: 'assets/icon_thermal.jpg',
      rarity: 'legendary',
      synergy: '[元素反应 · 殉爆]',
      apply: () => {
        game.synergies.thermalEngine = true;
      }
    },
    {
      id: 'tesla_coil',
      name: '电磁超导弹头',
      desc: '【弹道协同】武器暴击时释放高压电弧，连锁弹射跳跃至附近 2 个敌方目标！',
      img: 'assets/icon_tesla.jpg',
      rarity: 'epic',
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
