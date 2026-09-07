// ---------------- 元素化学反应与流派协同系统 (符合 game-design-review 协同机制) ----------------
import { sound } from '../systems/SoundEngine.js';

export class SynergySystem {
  constructor(game) {
    this.game = game;
  }

  /** 简易网格邻域查询：只检查附近敌人，避免 O(n) 全表扫 */
  static forEachInRadius(game, x, y, radius, fn) {
    const enemies = game.enemies;
    const r2 = radius * radius;
    // 敌人数量少时直接线性扫更便宜
    if (enemies.length <= 24) {
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.active) continue;
        const dx = e.x - x, dy = e.y - y;
        if (dx * dx + dy * dy <= r2) fn(e);
      }
      return;
    }
    const cell = Math.max(40, radius * 0.55);
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const span = Math.ceil(radius / cell);
    // 建临时桶（每帧范围查询时只建一次很小的 map）
    const buckets = new Map();
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const key = ((Math.floor(e.x / cell) & 0xffff) << 16) | (Math.floor(e.y / cell) & 0xffff);
      let arr = buckets.get(key);
      if (!arr) { arr = []; buckets.set(key, arr); }
      arr.push(e);
    }
    for (let gx = cx - span; gx <= cx + span; gx++) {
      for (let gy = cy - span; gy <= cy + span; gy++) {
        const key = ((gx & 0xffff) << 16) | (gy & 0xffff);
        const arr = buckets.get(key);
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const e = arr[i];
          const dx = e.x - x, dy = e.y - y;
          if (dx * dx + dy * dy <= r2) fn(e);
        }
      }
    }
  }


  // 1. 元素化学反应：温差热力殉爆 (Thermal Shock: 冰雾冻结 + 火箭核爆/烈焰)
  triggerThermalShock(enemy, x, y) {
    SynergySystem.triggerThermalShock(this.game, enemy, x, y);
  }

  static triggerThermalShock(game, enemy, x, y) {
    const mult = game.synergies.thermalEngine ? 2.2 : 1.5;
    const shockDmg = Math.round(game.skills.rocket.damage * mult);
    enemy.freezeTimer = 0;
    enemy.hp -= shockDmg;
    game.totalDamage += shockDmg;

    sound.playThermalShock();
    game.feedback.addTrauma(0.48);
    game.feedback.triggerHitStop(0.045);

    // 产生巨量白色与橙色温差蒸汽爆发粒子
    game.spawnParticles(x, y, '#fed7aa', 24, 'smoke');
    game.spawnParticles(x, y, '#ff7700', 20, 'fire');
    game.spawnHitRing(x, y, '#ff7700', enemy.radius * 2.2);

    game.spawnDamageText(x, y - 25, `💥 殉爆! ${shockDmg}`, '#ff7700', true, true);

    // 蒸汽冲击波波及周围小怪（网格邻域查询）
    SynergySystem.forEachInRadius(game, x, y, 90, (other) => {
      if (other === enemy) return;
      other.hp -= Math.round(shockDmg * 0.45);
      other.hitFlash = 0.12;
      if (other.hp <= 0) game.killEnemy(other);
    });

    if (enemy.hp <= 0) game.killEnemy(enemy);
  }

  // 2. 协同反应：战车极寒碎冰穿刺 (Shatter Spikes: 装甲战车 + 冰冻敌人)
  triggerIceShatter(enemy, x, y) {
    SynergySystem.triggerIceShatter(this.game, enemy, x, y);
  }

  static triggerIceShatter(game, enemy, x, y) {
    sound.playShatter();
    game.feedback.addTrauma(0.35);
    game.feedback.triggerHitStop(0.035);

    // 生成 5 枚前射冰晶尖刺穿透后方追兵
    const spikeCount = 5;
    for (let s = 0; s < spikeCount; s++) {
      const angle = -Math.PI / 2 + (s - (spikeCount - 1) / 2) * 0.26;
      game.iceSpikes.push({
        x: x,
        y: y - 10,
        vx: Math.cos(angle) * 620,
        vy: Math.sin(angle) * 620,
        damage: Math.round(game.skills.truck.damage * 0.45),
        pierce: 2,
        life: 1.1
      });
    }

    game.spawnDamageText(x, y - 20, '❄️ 碎冰穿刺!', '#00f0ff', true, true);
    game.spawnParticles(x, y, '#38bdf8', 18, 'spark');
  }

  // 3. 协同反应：暴击高压电弧连锁 (Tesla Chain: 暴击 + 电磁弹头)
  triggerTeslaChain(sourceEnemy, dmg) {
    SynergySystem.triggerTeslaChain(this.game, sourceEnemy, dmg);
  }

  static triggerTeslaChain(game, sourceEnemy, dmg) {
    let chainCount = 0;
    const chainTargets = [];

    SynergySystem.forEachInRadius(game, sourceEnemy.x, sourceEnemy.y, 140, (other) => {
      if (other === sourceEnemy || chainCount >= 2) return;
      chainTargets.push(other);
      chainCount++;
    });

    chainTargets.forEach(target => {
      const chainDmg = Math.round(dmg * 0.6);
      target.hp -= chainDmg;
      target.hitFlash = 0.14;

      game.teslaArcs.push({
        x1: sourceEnemy.x,
        y1: sourceEnemy.y,
        x2: target.x,
        y2: target.y,
        life: 0.12,
        maxLife: 0.12
      });

      game.spawnDamageText(target.x, target.y - 10, `⚡ ${chainDmg}`, '#38bdf8', false);
      if (target.hp <= 0) game.killEnemy(target);
    });
  }

  // 4. 协同反应：护盾碎裂全屏 EMP 冲击波 (Shield EMP: 护盾击碎 + 防线过载)
  triggerShieldBreakEmp() {
    SynergySystem.triggerShieldBreakEmp(this.game);
  }

  static triggerShieldBreakEmp(game) {
    sound.playEmp();
    game.feedback.addTrauma(0.65);
    game.feedback.triggerHitStop(0.06);

    game.shockwaves.push({
      x: game.hero.x,
      y: game.fortress.y,
      radius: 10,
      maxRadius: 320,
      life: 0.45,
      maxLife: 0.45,
      color: '#00f0ff'
    });

    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      if (!e.active) continue;
      const dist = Math.hypot(e.x - game.hero.x, e.y - game.fortress.y);
      if (dist <= 300) {
        e.y -= 45; // 击退
        e.freezeTimer = 2.4;
        e.freezeFactor = 0.1;
        game.damageEnemy(e, 140, true, 'emp');
      }
    }

    game.spawnDamageText(game.hero.x, game.fortress.y - 40, '⚡ EMP 防线过载冲击!', '#00f0ff', true, true);
  }

  // 5. 元素化学反应：雷火超载大爆轰 (Overload Blast: 雷属性激光/电弧 + 火焰灼烧)
  triggerOverload(enemy, x, y) {
    SynergySystem.triggerOverload(this.game, enemy, x, y);
  }

  static triggerOverload(game, enemy, x, y) {
    const overloadDmg = Math.round(game.weapon.damage * 2.4 + 90);
    enemy.burnTimer = 0;
    enemy.hp -= overloadDmg;
    game.totalDamage += overloadDmg;

    sound.playExplosion();
    game.feedback.addTrauma(0.42);
    game.feedback.triggerHitStop(0.04);

    // 爆发紫色与橙红色雷火超载冲击波
    game.spawnParticles(x, y, '#c084fc', 22, 'spark');
    game.spawnParticles(x, y, '#ff4400', 20, 'fire');
    game.spawnHitRing(x, y, '#c084fc', enemy.radius * 2.4);

    game.spawnDamageText(x, y - 28, `💥 超载爆轰! ${overloadDmg}`, '#e879f9', true, true);

    // 超载余波波及周围怪并击退
    SynergySystem.forEachInRadius(game, x, y, 100, (other) => {
      if (other === enemy) return;
      other.hp -= Math.round(overloadDmg * 0.4);
      other.hitFlash = 0.15;
      other.y -= 15; // 轻微击退
      if (other.hp <= 0) game.killEnemy(other);
    });

    if (enemy.hp <= 0) game.killEnemy(enemy);
  }

  // 6. 元素扩散机制：风属性旋风扩散 (Wind Swirl / Diffusion: 龙卷风将火/冰状态向四周大范围扩散)
  triggerWindSwirl(enemy, x, y) {
    SynergySystem.triggerWindSwirl(this.game, enemy, x, y);
  }

  static triggerWindSwirl(game, enemy, x, y) {
    const hasFire = enemy.burnTimer > 0;
    const hasIce = enemy.freezeTimer > 0;
    if (!hasFire && !hasIce) return;

    const spreadRadius = 170;
    let spreadCount = 0;

    if (hasFire) {
      const spreadDps = enemy.burnDps || (game.weapon.damage * 0.25);
      SynergySystem.forEachInRadius(game, x, y, spreadRadius, (other) => {
        if (other === enemy) return;
        other.burnTimer = Math.max(other.burnTimer || 0, 3.2);
        other.burnDps = Math.max(other.burnDps || 0, spreadDps);
        spreadCount++;
      });
      game.spawnParticles(x, y, '#ff4400', 16, 'fire');
      game.spawnDamageText(x, y - 22, '🌪️ 烈焰风暴扩散!', '#ff7700', true, false);
    }

    if (hasIce) {
      SynergySystem.forEachInRadius(game, x, y, spreadRadius, (other) => {
        if (other === enemy) return;
        other.freezeTimer = Math.max(other.freezeTimer || 0, 2.4);
        other.freezeFactor = 0.35;
        spreadCount++;
      });
      game.spawnParticles(x, y, '#00f0ff', 16, 'ice');
      game.spawnDamageText(x, y - 22, '🌪️ 极寒涡流扩散!', '#38bdf8', true, false);
    }

    if (spreadCount > 0) {
      game.feedback.addTrauma(0.18);
    }
  }

  /**
   * 统一元素命中与协同判定入口 (统一对接火、雷、风、物理、冰)
   * @param {object} enemy 目标敌人
   * @param {'fire'|'thunder'|'wind'|'physical'|'ice'} element 元素属性
   * @param {number} damage 基础命中伤害
   * @param {number} x 命中位置 X
   * @param {number} y 命中位置 Y
   */
  registerHit(enemy, element, damage, x = enemy?.x, y = enemy?.y) {
    if (!enemy || !enemy.active || enemy.hp <= 0) return;
    const game = this.game;

    switch (element) {
      case 'fire':
        // 火击中冰冻单位 ➜ 触发热力殉爆融化
        if (enemy.freezeTimer > 0) {
          SynergySystem.triggerThermalShock(game, enemy, x, y);
          return;
        }
        // 施加或刷新灼烧
        enemy.burnTimer = Math.max(enemy.burnTimer || 0, 2.5);
        enemy.burnDps = Math.max(enemy.burnDps || 0, Math.max(12, damage * 0.25));
        break;

      case 'thunder':
        // 雷击中灼烧单位 ➜ 触发雷火超载大爆轰
        if (enemy.burnTimer > 0) {
          SynergySystem.triggerOverload(game, enemy, x, y);
          return;
        }
        // 特斯拉电弧判定
        if (game.synergies.teslaCoil || Math.random() < 0.3) {
          SynergySystem.triggerTeslaChain(game, enemy, damage);
        }
        break;

      case 'wind':
        // 风击中带火/冰单位 ➜ 触发大范围元素扩散机制！
        SynergySystem.triggerWindSwirl(game, enemy, x, y);
        break;

      case 'ice':
        // 冰冻减速
        enemy.freezeTimer = Math.max(enemy.freezeTimer || 0, 2.2);
        enemy.freezeFactor = 0.35;
        break;

      case 'physical':
      default:
        // 物理纯粹高额撕裂
        break;
    }
  }
}

