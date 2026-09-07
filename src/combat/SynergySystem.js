// ---------------- 元素化学反应与流派协同系统 (符合 game-design-review 协同机制) ----------------
import { sound } from '../systems/SoundEngine.js';

export class SynergySystem {
  constructor(game) {
    this.game = game;
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

    // 蒸汽冲击波波及周围小怪
    for (let i = 0; i < game.enemies.length; i++) {
      const other = game.enemies[i];
      if (!other.active || other === enemy) continue;
      const dist = Math.hypot(other.x - x, other.y - y);
      if (dist < 90) {
        other.hp -= Math.round(shockDmg * 0.45);
        other.hitFlash = 0.12;
        if (other.hp <= 0) game.killEnemy(other);
      }
    }

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

    for (let i = 0; i < game.enemies.length; i++) {
      const other = game.enemies[i];
      if (!other.active || other === sourceEnemy) continue;
      const dist = Math.hypot(other.x - sourceEnemy.x, other.y - sourceEnemy.y);
      if (dist < 140) {
        chainTargets.push(other);
        chainCount++;
        if (chainCount >= 2) break;
      }
    }

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
}
