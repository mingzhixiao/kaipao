// ---------------- 元素化学反应与流派协同系统 ----------------
import { sound } from '../systems/SoundEngine.js';
import { SpatialHash } from '../systems/SpatialHash.js';

export class SynergySystem {
  constructor(game) {
    this.game = game;
    this.spatialHash = new SpatialHash(96);
    this._hashToken = 0;
    this._lastHashBuildAt = -Infinity;
  }

  static forEachInRadius(game, x, y, radius, fn) {
    const enemies = game.enemies;
    if (enemies.length <= 24) {
      const r2 = radius * radius;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.active) continue;
        const dx = e.x - x;
        const dy = e.y - y;
        if (dx * dx + dy * dy <= r2) fn(e);
      }
      return;
    }

    const system = game.synergySystem;
    if (!system) {
      const r2 = radius * radius;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.active) continue;
        const dx = e.x - x;
        const dy = e.y - y;
        if (dx * dx + dy * dy <= r2) fn(e);
      }
      return;
    }

    const now = performance.now();
    // 33ms 内复用索引：一次技能连锁中的多个范围查询不再反复创建 Map/数组。
    if (now - system._lastHashBuildAt >= 33) {
      system._hashToken++;
      system.spatialHash.rebuild(enemies, system._hashToken);
      system._lastHashBuildAt = now;
    }
    system.spatialHash.forEachInRadius(x, y, radius, fn);
  }

  triggerThermalShock(enemy, x, y) { SynergySystem.triggerThermalShock(this.game, enemy, x, y); }

  static applyDirectDamage(target, dmg) {
    if (target.shield > 0) {
      const abs = Math.min(target.shield, dmg);
      target.shield -= abs;
      dmg -= abs;
    }
    if (dmg > 0) {
      target.hp -= dmg;
    }
  }

  static triggerThermalShock(game, enemy, x, y) {
    const mult = game.synergies.thermalEngine ? 2.2 : 1.5;
    const shockDmg = Math.round(game.skills.rocket.damage * mult);
    enemy.freezeTimer = 0;
    SynergySystem.applyDirectDamage(enemy, shockDmg);
    game.totalDamage += shockDmg;
    sound.playThermalShock();
    game.feedback.addTrauma(0.48);
    game.feedback.triggerHitStop(0.045);
    game.spawnParticles(x, y, '#fed7aa', 24, 'smoke');
    game.spawnParticles(x, y, '#ff7700', 20, 'fire');
    game.spawnHitRing(x, y, '#ff7700', enemy.radius * 2.2);
    game.spawnDamageText(x, y - 25, `💥 热核聚变! ${shockDmg}`, '#ff7700', true, true);
    SynergySystem.forEachInRadius(game, x, y, 90, (other) => {
      if (other === enemy) return;
      SynergySystem.applyDirectDamage(other, Math.round(shockDmg * 0.45));
      other.hitFlash = 0.12;
      if (other.hp <= 0) game.killEnemy(other);
    });
    if (enemy.hp <= 0) game.killEnemy(enemy);
  }

  triggerIceShatter(enemy, x, y) { SynergySystem.triggerIceShatter(this.game, enemy, x, y); }

  static triggerIceShatter(game, enemy, x, y) {
    sound.playShatter();
    game.feedback.addTrauma(0.35);
    game.feedback.triggerHitStop(0.035);
    const spikeCount = 5;
    for (let s = 0; s < spikeCount; s++) {
      const angle = -Math.PI / 2 + (s - (spikeCount - 1) / 2) * 0.26;
      game.iceSpikes.push({
        active: true, x, y: y - 10,
        vx: Math.cos(angle) * 620, vy: Math.sin(angle) * 620,
        damage: Math.round(game.skills.truck.damage * 0.45), pierce: 2, life: 1.1
      });
    }
    game.spawnDamageText(x, y - 20, '❄️ 晶格崩解穿刺!', '#00f0ff', true, true);
    game.spawnParticles(x, y, '#38bdf8', 18, 'spark');
  }

  triggerTeslaChain(sourceEnemy, dmg) { SynergySystem.triggerTeslaChain(this.game, sourceEnemy, dmg); }

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
      game.teslaArcs.push({ active: true, x1: sourceEnemy.x, y1: sourceEnemy.y, x2: target.x, y2: target.y, life: 0.12, maxLife: 0.12 });
      game.spawnDamageText(target.x, target.y - 10, `⚡ ${chainDmg}`, '#38bdf8', false);
      if (target.hp <= 0) game.killEnemy(target);
    });
  }

  triggerShieldBreakEmp() { SynergySystem.triggerShieldBreakEmp(this.game); }

  static triggerShieldBreakEmp(game) {
    sound.playEmp();
    game.feedback.addTrauma(0.65);
    game.feedback.triggerHitStop(0.06);
    game.shockwaves.push({ active: true, x: game.hero.x, y: game.fortress.y, radius: 10, maxRadius: 320, life: 0.45, maxLife: 0.45, color: '#00f0ff' });
    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      if (!e.active) continue;
      const dist = Math.hypot(e.x - game.hero.x, e.y - game.fortress.y);
      if (dist <= 300) {
        e.y -= 45;
        e.freezeTimer = 2.4;
        e.freezeFactor = 0.1;
        game.damageEnemy(e, 140, true, 'emp');
      }
    }
    game.spawnDamageText(game.hero.x, game.fortress.y - 40, '⚡ 基地护盾破裂过载!', '#00f0ff', true, true);
  }

  triggerOverload(enemy, x, y) { SynergySystem.triggerOverload(this.game, enemy, x, y); }

  static triggerOverload(game, enemy, x, y) {
    const overloadDmg = Math.round(game.weapon.damage * 2.4 + 90);
    enemy.burnTimer = 0;
    SynergySystem.applyDirectDamage(enemy, overloadDmg);
    game.totalDamage += overloadDmg;
    sound.playExplosion();
    game.feedback.addTrauma(0.42);
    game.feedback.triggerHitStop(0.04);
    game.spawnParticles(x, y, '#c084fc', 18, 'spark');
    game.spawnParticles(x, y, '#ff4400', 16, 'fire');
    game.spawnHitRing(x, y, '#c084fc', enemy.radius * 2.2);
    game.spawnDamageText(x, y - 24, `⚡ 电离超载 ${overloadDmg}`, '#e879f9', true, true);
    SynergySystem.forEachInRadius(game, x, y, 100, (other) => {
      if (other === enemy) return;
      SynergySystem.applyDirectDamage(other, Math.round(overloadDmg * 0.4));
      other.hitFlash = 0.15;
      other.y -= 15;
      if (other.hp <= 0) game.killEnemy(other);
    });
    if (enemy.hp <= 0) game.killEnemy(enemy);
  }

  triggerWindSwirl(enemy, x, y) { SynergySystem.triggerWindSwirl(this.game, enemy, x, y); }

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
      game.spawnParticles(x, y, '#ff4400', 14, 'fire');
      const now = game.survivalTime || 0;
      if (now - (game._lastSwirlText || 0) > 0.65) {
        game._lastSwirlText = now;
        game.spawnDamageText(x, y - 20, '🌪️ 等离子扩散', '#ff7700', false, true);
      }
    }

    if (hasIce) {
      SynergySystem.forEachInRadius(game, x, y, spreadRadius, (other) => {
        if (other === enemy) return;
        other.freezeTimer = Math.max(other.freezeTimer || 0, 2.4);
        other.freezeFactor = 0.35;
        spreadCount++;
      });
      game.spawnParticles(x, y, '#00f0ff', 14, 'ice');
      const now = game.survivalTime || 0;
      if (now - (game._lastSwirlText || 0) > 0.65) {
        game._lastSwirlText = now;
        game.spawnDamageText(x, y - 20, '🌪️ 低温扩散', '#38bdf8', false, true);
      }
    }
    if (spreadCount > 0) game.feedback.triggerHitStop(0.015);
  }

  registerHit(enemy, element, damage, x = enemy?.x, y = enemy?.y) {
    if (!enemy || !enemy.active || enemy.hp <= 0) return;
    const game = this.game;
    switch (element) {
      case 'fire':
        if (enemy.freezeTimer > 0) {
          SynergySystem.triggerThermalShock(game, enemy, x, y);
          return;
        }
        enemy.burnTimer = Math.max(enemy.burnTimer || 0, 2.5);
        enemy.burnDps = Math.max(enemy.burnDps || 0, Math.max(12, damage * 0.25));
        break;
      case 'thunder':
        if (enemy.burnTimer > 0) {
          SynergySystem.triggerOverload(game, enemy, x, y);
          return;
        }
        if (game.synergies.teslaCoil || Math.random() < 0.3) SynergySystem.triggerTeslaChain(game, enemy, damage);
        break;
      case 'wind':
        SynergySystem.triggerWindSwirl(game, enemy, x, y);
        break;
      case 'ice':
        enemy.freezeTimer = Math.max(enemy.freezeTimer || 0, 2.2);
        enemy.freezeFactor = 0.35;
        break;
      case 'physical':
      default:
        break;
    }
  }
}
