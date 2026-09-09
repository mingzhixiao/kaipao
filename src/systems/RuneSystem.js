// ---------------- 永久符文 / 枪械技能强化体系 (类 LoL 符文成长) ----------------
import { saveManager } from './SaveManager.js';

export const RUNE_CATALOG = [
  { id: 'attack', name: '动能增幅', category: 'gun', desc: '主武器伤害 +8% / 级', icon: '⚔️', asset: 'assets/runes/rune_attack.png', maxLevel: 10, costBase: 20,
    apply(game, level) { game.weapon.damage = Math.round(game.weapon.damage * (1 + 0.08 * level)); } },
  { id: 'armorPen', name: '熔甲弹芯', category: 'gun', desc: '物理破甲 +3% / 级，抵消怪物物抗', icon: '🔻', asset: 'assets/runes/rune_pierce.png', maxLevel: 10, costBase: 24,
    apply(game, level) { game.weapon.armorPenetration = Math.min(0.45, (game.weapon.armorPenetration || 0) + 0.03 * level); } },
  { id: 'firerate', name: '超频扳机', category: 'gun', desc: '射击间隔 -2% / 级', icon: '🔫', asset: 'assets/runes/rune_firerate.png', maxLevel: 8, costBase: 25,
    apply(game, level) { game.hero.baseAttackInterval = Math.max(0.28, game.hero.baseAttackInterval * Math.pow(0.98, level)); } },
  { id: 'crit', name: '弱点标定', category: 'gun', desc: '暴击率 +3% / 级', icon: '🎯', asset: 'assets/runes/rune_crit.png', maxLevel: 10, costBase: 22,
    apply(game, level) { game.weapon.critChance = Math.min(0.75, game.weapon.critChance + 0.03 * level); } },
  { id: 'critDmg', name: '致命打击', category: 'gun', desc: '暴击伤害 +15% / 级', icon: '💥', asset: 'assets/runes/rune_critDmg.png', maxLevel: 6, costBase: 30,
    apply(game, level) { game.weapon.critMult += 0.15 * level; } },
  { id: 'range', name: '弹道延程', category: 'gun', desc: '弹速与存续 +5% / 级', icon: '📡', asset: 'assets/runes/rune_range.png', maxLevel: 5, costBase: 18,
    apply(game, level) { game.weapon.bulletSpeed = Math.round(game.weapon.bulletSpeed * (1 + 0.05 * level)); game.weapon.bulletLife = (game.weapon.bulletLife || 2) * (1 + 0.05 * level); } },
  { id: 'pierce', name: '贯穿协议', category: 'gun', desc: '穿透次数 +1 / 2 级', icon: '🔸', asset: 'assets/runes/rune_pierce.png', maxLevel: 6, costBase: 35,
    apply(game, level) { game.weapon.pierceCount += Math.floor(level / 2); } },
  { id: 'multishot', name: '分裂膛线', category: 'gun', desc: '每 3 级额外 +1 弹道', icon: '🌟', asset: 'assets/runes/rune_multishot.png', maxLevel: 6, costBase: 40,
    apply(game, level) { game.weapon.multishot += Math.floor(level / 3); } },
  { id: 'hp', name: '纳米护甲', category: 'defense', desc: '防线生命 +80 / 级', icon: '🛡️', asset: 'assets/runes/rune_hp.png', maxLevel: 10, costBase: 15,
    apply(game, level) { const b = 80 * level; game.fortress.maxHp += b; game.fortress.hp += b; } },
  { id: 'shield', name: '能量屏障', category: 'defense', desc: '护盾上限 +40 / 级', icon: '💠', asset: 'assets/runes/rune_shield.png', maxLevel: 8, costBase: 18,
    apply(game, level) { const b = 40 * level; game.fortress.maxShield += b; game.fortress.shield += b; } },
  { id: 'skillPower', name: '战术增幅', category: 'skill', desc: '三大技能伤害 +8% / 级', icon: '🚀', asset: 'assets/runes/rune_skillPower.png', maxLevel: 8, costBase: 28,
    apply(game, level) { const m = 1 + 0.08 * level; game.skills.rocket.damage = Math.round(game.skills.rocket.damage * m); game.skills.truck.damage = Math.round(game.skills.truck.damage * m); game.skills.freeze.damagePerTick = Math.round(game.skills.freeze.damagePerTick * m); } },
  { id: 'skillCd', name: '冷却压缩', category: 'skill', desc: '技能冷却 -3% / 级', icon: '⏱️', asset: 'assets/runes/rune_skillCd.png', maxLevel: 6, costBase: 32,
    apply(game, level) { const m = Math.pow(0.97, level); game.skills.rocket.cooldown = Math.max(2.5, game.skills.rocket.cooldown * m); game.skills.truck.cooldown = Math.max(3.5, game.skills.truck.cooldown * m); game.skills.freeze.cooldown = Math.max(3.0, game.skills.freeze.cooldown * m); } },
  { id: 'skillRange', name: '覆盖拓展', category: 'skill', desc: '火箭范围 / 冰雾距离 +5% / 级', icon: '🌀', asset: 'assets/runes/rune_skillRange.png', maxLevel: 5, costBase: 24,
    apply(game, level) { const m = 1 + 0.05 * level; game.skills.rocket.radius = Math.round(game.skills.rocket.radius * m); game.skills.freeze.range = Math.round(game.skills.freeze.range * m); } },
  { id: 'magnet', name: '磁吸阵列', category: 'util', desc: '拾取范围 +25 / 级', icon: '🧲', asset: 'assets/runes/rune_magnet.png', maxLevel: 6, costBase: 12,
    apply(game, level) { game.hero.magnetRange += 25 * level; } },
  { id: 'exp', name: '数据窃取', category: 'util', desc: '经验获取 +6% / 级', icon: '📈', asset: 'assets/runes/rune_exp.png', maxLevel: 5, costBase: 20,
    apply(game, level) { game.expMultiplier = 1 + 0.06 * level; } }
];

export function getRuneById(id) {
  return RUNE_CATALOG.find(r => r.id === id) || null;
}

export function getRuneUpgradeShardCost(rune, currentLevel) {
  return 2 + Math.floor(currentLevel * 1.2);
}

export function getRuneUpgradeCost(rune, currentLevel) {
  return Math.round(rune.costBase * (currentLevel + 1) * (1 + currentLevel * 0.12));
}

export class RuneSystem {
  constructor() {
    this.levels = { ...saveManager.getRuneLevels() };
  }
  reload() { this.levels = { ...saveManager.getRuneLevels() }; }
  getLevel(id) { return this.levels[id] || 0; }
  applyAll(game) {
    game.expMultiplier = game.expMultiplier || 1;
    for (const rune of RUNE_CATALOG) {
      const lv = this.getLevel(rune.id);
      if (lv > 0) rune.apply(game, lv);
    }
  }
  tryUpgrade(id) {
    const rune = getRuneById(id);
    if (!rune) return false;
    const lv = this.getLevel(id);
    if (lv >= rune.maxLevel) return false;
    const shardCost = getRuneUpgradeShardCost(rune, lv);
    const scrapCost = getRuneUpgradeCost(rune, lv);
    if (!saveManager.hasItem('rune_shard', shardCost)) return false;
    if (!saveManager.spendScrap(scrapCost)) return false;
    saveManager.consumeItem('rune_shard', shardCost);
    this.levels[id] = lv + 1;
    saveManager.setRuneLevel(id, lv + 1);
    return true;
  }
  rollRewardChoices(count = 3) {
    const pool = RUNE_CATALOG.filter(r => this.getLevel(r.id) < r.maxLevel);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(r => ({
      id: r.id, name: r.name, icon: r.icon, asset: r.asset, desc: r.desc, category: r.category,
      level: this.getLevel(r.id), nextLevel: this.getLevel(r.id) + 1, maxLevel: r.maxLevel
    }));
  }
  grantFreeLevel(id) {
    const rune = getRuneById(id);
    if (!rune) return false;
    const lv = this.getLevel(id);
    if (lv >= rune.maxLevel) return false;
    this.levels[id] = lv + 1;
    saveManager.setRuneLevel(id, lv + 1);
    return true;
  }
}

export const runeSystem = new RuneSystem();
