import { saveManager } from '../systems/SaveManager.js';

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
      name: game.skills.rocket.level === 0 ? '裂变等离子重炮 (解锁)' : '裂变等离子重炮 (强化)',
      desc: game.skills.rocket.level === 0 ? '部署重型等离子裂变重炮，定点引发超大范围高能等离子聚变与炽热灼烧带。' : '爆轰威力+35%，聚变范围+20%，冷却-0.5s。',
      img: 'assets/cards/icon_rocket.png',
      rarity: game.skills.rocket.level === 0 ? 'legendary' : 'rare',
      element: 'fire',
      synergy: '[等离子 · 聚变重炮]',
      apply: () => {
        game.skills.rocket.level++;
        game.skills.rocket.cooldown = Math.max(3.0, game.skills.rocket.cooldown - 0.5);
      }
    },
    {
      id: 'truck',
      name: game.skills.truck.level === 0 ? '磁浮重装扫荡舰 (解锁)' : '磁浮重装扫荡舰 (强化)',
      desc: game.skills.truck.level === 0 ? '呼叫高速重装磁浮扫荡舰，沿地面极速巡航扫荡碾压沿途所有敌对目标！' : '扫荡舰冲击伤害+40%，击退距离+50px，冷却-1.0s。',
      img: 'assets/cards/icon_truck.png',
      rarity: game.skills.truck.level === 0 ? 'legendary' : 'rare',
      element: 'physical',
      synergy: '[磁浮 · 重装扫荡]',
      apply: () => {
        game.skills.truck.level++;
        game.skills.truck.cooldown = Math.max(4.0, game.skills.truck.cooldown - 1.0);
      }
    },
    {
      id: 'freeze',
      name: game.skills.freeze.level === 0 ? '绝对零度射线 (解锁)' : '绝对零度射线 (强化)',
      desc: game.skills.freeze.level === 0 ? '周期性向前喷射大范围超低温绝对零度冷凝粒子，极速减速并冰冻敌群。' : '持续时间+0.5s，减速效果更强，每秒霜冻伤害+30%。',
      img: 'assets/cards/icon_frost.png',
      rarity: game.skills.freeze.level === 0 ? 'rare' : 'rare',
      element: 'ice',
      synergy: '[冰霜 · 绝对零度]',
      apply: () => {
        game.skills.freeze.level++;
        game.skills.freeze.duration += 0.4;
      }
    },
    {
      id: 'laser',
      name: (game.skills.laser?.level || 0) === 0 ? '粒子歼灭切割器 (解锁)' : '粒子歼灭切割器 (强化)',
      desc: (game.skills.laser?.level || 0) === 0 ? '贯穿全屏的高能聚焦粒子束，引发高频感电贯通与等离子超载！' : '粒子束威力+30%，持续时间增加，感电超载爆轰提升。',
      img: 'assets/skills/laser.png',
      rarity: 'legendary',
      element: 'thunder',
      synergy: '[粒子 · 感电超载]',
      apply: () => {
        const s = game.skills.laser;
        if (s) { s.level++; s.timer = 0; }
      }
    },
    {
      id: 'tornado',
      name: (game.skills.tornado?.level || 0) === 0 ? '微型引力奇点 (解锁)' : '微型引力奇点 (强化)',
      desc: (game.skills.tornado?.level || 0) === 0 ? '持续微型引力奇点牵引约束敌群，并引发广域能量扩散！' : '奇点引力半径+25px，持续时间+0.8s，引力牵引威能增强。',
      img: 'assets/skills/tornado.png',
      rarity: 'epic',
      element: 'wind',
      synergy: '[引力 · 空间扩散]',
      apply: () => {
        const s = game.skills.tornado;
        if (s) { s.level++; s.timer = 0; }
      }
    },
    {
      id: 'bomber',
      name: (game.skills.bomber?.level || 0) === 0 ? '天基动能天谴打击 (解锁)' : '天基动能天谴打击 (强化)',
      desc: (game.skills.bomber?.level || 0) === 0 ? '高空轨道战术信标定位，呼叫天基卫星投掷连续 3 发动能集束熔核弹！' : '打击伤害+35%，冲击击退+30px，冷却缩短。',
      img: 'assets/skills/bomber.png',
      rarity: 'epic',
      element: 'fire',
      synergy: '[天基 · 动能天谴]',
      apply: () => {
        const s = game.skills.bomber;
        if (s) { s.level++; s.timer = 0; }
      }
    },
    {
      id: 'boomerang',
      name: (game.skills.boomerang?.level || 0) === 0 ? '高周波磁旋刃 (解锁)' : '高周波磁旋刃 (强化)',
      desc: (game.skills.boomerang?.level || 0) === 0 ? '高频往返贯穿磁旋飞刃，双程撕裂切割，自带 35% 额外暴击率！' : '磁旋刃伤害+30%，飞行射程+80px，撕裂暴击提升。',
      img: 'assets/skills/boomerang.png',
      rarity: 'rare',
      element: 'physical',
      synergy: '[磁旋 · 高周波撕裂]',
      apply: () => {
        const s = game.skills.boomerang;
        if (s) { s.level++; s.timer = 0; }
      }
    },
    {
      id: 'thermal_engine',
      name: '等离子热核聚变',
      desc: '【化学反应】重炮或等离子击中冰冻目标时，触发 220% 威力温差裂变聚变与破甲能量震荡！',
      img: 'assets/cards/icon_thermal.png',
      rarity: 'legendary',
      element: 'fire',
      synergy: '[能量反应 · 聚变]',
      apply: () => {
        game.synergies.thermalEngine = true;
      }
    },
    {
      id: 'tesla_coil',
      name: '超导电弧连锁',
      desc: '【能量协同】武器暴击或高能打击命中时释放高压电弧，连锁弹射跳跃至附近 2 个敌方目标！',
      img: 'assets/cards/icon_tesla.png',
      rarity: 'epic',
      element: 'thunder',
      synergy: '[电磁连锁]',
      apply: () => {
        game.synergies.teslaCoil = true;
      }
    },
    {
      id: 'fortress_emp',
      name: '基地护盾过载破裂环',
      desc: '【战术防御】当基地护盾被击碎瞬间，触发全场高能 EMP 电磁冲击波，震退并冻结周围敌群！',
      img: 'assets/cards/icon_emp.png',
      rarity: 'epic',
      element: 'thunder',
      synergy: '[基地过载]',
      apply: () => {
        game.synergies.fortressEmp = true;
      }
    },
    {
      id: 'truck_inferno',
      name: '热核离子推进舰',
      desc: '【舰体改装】磁浮扫荡舰加装后置热核推进喷口，巡航沿途留下一整条炽热等离子灼烧带！',
      img: 'assets/cards/icon_inferno.png',
      rarity: 'epic',
      element: 'fire',
      synergy: '[扫荡舰协同]',
      apply: () => {
        game.synergies.truckInferno = true;
      }
    },
    {
      id: 'cryo_shatter',
      name: '极低温晶格崩解',
      desc: '【扫荡舰协同】扫荡舰冲击冰冻目标时造成晶格崩解，并向前方爆射 5 枚穿透冰晶粒子刺！',
      img: 'assets/cards/icon_shatter.png',
      rarity: 'rare',
      element: 'ice',
      synergy: '[晶格崩解]',
      apply: () => {
        game.synergies.cryoShatter = true;
      }
    },
    {
      id: 'multishot',
      name: '多重弹道模组',
      desc: '主角主武器每次射击额外增加 1 枚散射弹道，火力覆盖倍增。',
      img: 'assets/cards/icon_multishot.png',
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
      desc: '主武器射击间隔缩短 10%，提升持续射击压制力。',
      img: 'assets/cards/icon_firerate.png',
      rarity: 'common',
      element: 'physical',
      synergy: '[射速提升]',
      apply: () => {
        game.hero.baseAttackInterval = Math.max(0.28, parseFloat((game.hero.baseAttackInterval * 0.90).toFixed(3)));
      }
    },
    {
      id: 'piercing',
      name: '贫铀穿甲弹头',
      desc: '子弹穿透次数 +1，直线射击可洞穿前后多个目标。',
      img: 'assets/cards/icon_pierce.png',
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
      img: 'assets/cards/icon_crit.png',
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
      img: 'assets/cards/icon_shield.png',
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
      img: 'assets/cards/icon_gem.png',
      rarity: 'common',
      element: 'utility',
      synergy: '[资源效率]',
      apply: () => {
        game.hero.magnetRange += 80;
      }
    },
    {
      id: 'gun_power',
      name: '重装高能火药',
      desc: '主武器所有子弹杀伤力直接提升 25%，大幅增强单发点杀与清怪爆发！',
      img: 'assets/icons/icon_level.png',
      rarity: 'common',
      element: 'physical',
      synergy: '[枪械威力]',
      apply: () => {
        game.weapon.damage = Math.round(game.weapon.damage * 1.25);
      }
    },
    {
      id: 'mag_capacity',
      name: '复合快速扩容弹匣',
      desc: '主武器弹匣载弹量直接 +15 发，显著降低换弹频率，维持持续金属风暴！',
      img: 'assets/icons/icon_part.png',
      rarity: 'common',
      element: 'physical',
      synergy: '[弹药压制]',
      apply: () => {
        game.hero.magazineCapacity += 15;
        game.hero.currentAmmo = Math.min(game.hero.magazineCapacity, game.hero.currentAmmo + 15);
      }
    }
  ];

  // 当前出战携带的主动战术技能列表（上限最多 4 个）
  const activeSkillIds = ['rocket', 'truck', 'freeze', 'laser', 'tornado', 'boomerang', 'bomber'];
  let equippedSkills = [];
  try {
    if (saveManager?.getEquippedSkills) {
      equippedSkills = saveManager.getEquippedSkills() || [];
    }
  } catch (e) {}

  // 过滤卡池：
  // 1. 未携带/未合成的主动技能绝不出现在升级抽卡中！
  // 2. 依赖特定技能的协同反应卡，在没有对应技能时不出现！
  // 3. 过滤已激活的唯一协同反应卡及上限属性卡
  return pool.filter(card => {
    if (activeSkillIds.includes(card.id)) {
      if (!equippedSkills.includes(card.id)) {
        return false; // 未携带的技能绝不出现！
      }
    }
    // 协同卡的前置技能依赖检查
    if (card.id === 'thermal_engine') {
      if (!equippedSkills.includes('rocket') && !equippedSkills.includes('freeze')) return false;
      if (game.synergies.thermalEngine) return false;
    }
    if (card.id === 'truck_inferno') {
      if (!equippedSkills.includes('truck')) return false;
      if (game.synergies.truckInferno) return false;
    }
    if (card.id === 'cryo_shatter') {
      if (!equippedSkills.includes('freeze') && !equippedSkills.includes('truck')) return false;
      if (game.synergies.cryoShatter) return false;
    }
    if (card.id === 'tesla_coil' && game.synergies.teslaCoil) return false;
    if (card.id === 'fortress_emp' && game.synergies.fortressEmp) return false;
    if (card.id === 'multishot' && game.weapon.multishot >= 5) return false;
    return true;
  });
}
