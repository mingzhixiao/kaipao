// ---------------- 战斗与弹道判定系统 (Combat, Projectiles & Spatial Pruning) ----------------
import { sound } from '../systems/SoundEngine.js';
import { ObjectPool } from '../systems/ObjectPool.js';
import { GAME_CONFIG } from '../core/Config.js';
import { gameEvents } from '../core/GameEventBus.js';
import { saveManager } from '../systems/SaveManager.js';

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.activeRockets = [];
  }

  reset() {
    this.activeRockets = [];
  }

  // 自动瞄准最近或威胁最大的敌人 (结合 tower-defense 技能防漏怪原则：纵深越靠近城防，威胁权重呈指数激增)
  updateAutoTarget() {
    const hero = this.game.hero;
    let closestEnemy = null;
    let bestScore = Infinity;
    const h = this.game.height || 800;
    const fortressY = this.game.fortress ? this.game.fortress.y : (h - 100);

    for (let i = 0; i < this.game.enemies.length; i++) {
      const e = this.game.enemies[i];
      if (!e.active) continue;

      const dx = e.x - hero.x;
      const dy = e.y - hero.y;
      const distToWall = Math.max(0, fortressY - e.y);
      // 距城防越近威胁权重越高 (防止漏怪爆墙)，首领与疾冲怪获得额外锁定权重
      const proximityThreat = distToWall < 150 ? (150 - distToWall) * 2.6 : 0;
      const threatScore = (Math.abs(dx) * 0.75 + Math.abs(dy)) - (e.y / h) * 160 - proximityThreat - (e.isBoss ? 220 : 0) - (e.type === 'charger' ? 60 : 0);
      if (threatScore < bestScore) {
        bestScore = threatScore;
        closestEnemy = e;
      }
    }

    if (closestEnemy) {
      const targetAngle = Math.atan2(closestEnemy.y - hero.y, closestEnemy.x - hero.x);
      let diff = targetAngle - hero.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      hero.angle += diff * 0.24;
    } else {
      // 无怪时缓慢回正向上，避免枪口僵硬斜向空处
      let diff = (-Math.PI / 2) - hero.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      hero.angle += diff * 0.08;
    }
  }

  shootWeapon() {
    const game = this.game;
    const hero = game.hero;
    const weapon = game.weapon;

    sound.playShoot();
    game.muzzleFlash = 0.06;
    hero.recoil = 5;

    const count = weapon.multishot;
    const spread = weapon.spreadAngle;
    const baseAngle = hero.angle;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i - (count - 1) / 2) * spread;
      const b = game.bulletPool.get();
      b.active = true;

      const muzzleOffset = 26;
      b.x = hero.x + Math.cos(baseAngle) * muzzleOffset;
      b.y = hero.y + Math.sin(baseAngle) * muzzleOffset;
      b.vx = Math.cos(angle) * weapon.bulletSpeed;
      b.vy = Math.sin(angle) * weapon.bulletSpeed;

      const isCrit = Math.random() < weapon.critChance;
      b.damage = Math.round(weapon.damage * (isCrit ? weapon.critMult : 1.0));
      b.isCrit = isCrit;
      b.pierceLeft = weapon.pierceCount;
      b.radius = weapon.bulletRadius || 4;
      b.life = weapon.bulletLife || 2.0;

      game.bullets.push(b);
    }
  }

  launchRocket(targetX, targetY) {
    const game = this.game;
    const startX = game.hero.x + (Math.random() * 40 - 20);
    const startY = game.hero.y;

    this.activeRockets.push({
      active: true,
      sx: startX,
      sy: startY,
      tx: targetX,
      ty: targetY,
      progress: 0,
      duration: GAME_CONFIG.skills.rocket.flightDuration
    });
  }

  detonateRocket(x, y) {
    const game = this.game;
    const rocketCfg = game.skills.rocket;
    const rad = rocketCfg.radius * (1 + (rocketCfg.level - 1) * 0.2);
    const dmg = rocketCfg.damage * (1 + (rocketCfg.level - 1) * 0.35);

    game.feedback.addTrauma(0.55);
    game.feedback.triggerHitStop(0.04);
    sound.playExplosion();

    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      if (!e.active) continue;
      if (Math.abs(e.y - y) > rad + e.radius) continue;

      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= rad) {
        const falloff = 1 - (d / rad) * 0.4;
        const finalDmg = Math.round(dmg * falloff);
        this.onHit(e, finalDmg, true, 'rocket', e.x - x, e.y - y);
      }
    }

    game.spawnParticles(x, y, '#ff4400', 45, 'fire');
    game.spawnParticles(x, y, '#ffcc00', 35, 'spark');

    game.burnZones.push({
      active: true,
      x: x,
      y: y,
      radius: rad * 0.85,
      life: rocketCfg.burnDuration,
      maxLife: rocketCfg.burnDuration,
      tickTimer: 0
    });
  }

  launchArmoredTruck() {
    const game = this.game;
    sound.playTruckRumble();
    game.feedback.addTrauma(0.38);

    const road = game.getRoadBounds(game.fortress.y);
    const laneRatio = 0.15 + Math.random() * 0.70;
    const startX = road.left + road.roadWidth * laneRatio;
    const truckCfg = game.skills.truck;

    game.activeTrucks.push({
      active: true,
      x: startX,
      laneRatio: laneRatio,
      y: game.fortress.y + 20,
      width: truckCfg.width,
      height: truckCfg.height,
      speed: truckCfg.speed,
      damage: truckCfg.damage * (1 + (truckCfg.level - 1) * 0.4),
      hitEnemies: new Set(),
      infernoTimer: 0
    });
  }

  applyFreezeRay(dt) {
    const game = this.game;
    const freezeCfg = game.skills.freeze;
    const cone = freezeCfg.coneAngle;
    const range = freezeCfg.range;
    const heroAngle = game.hero.angle;

    for (let i = 0; i < 3; i++) {
      const randAngle = heroAngle + (Math.random() - 0.5) * cone;
      const dist = Math.random() * range;
      const px = game.hero.x + Math.cos(randAngle) * dist;
      const py = game.hero.y + Math.sin(randAngle) * dist;
      game.spawnParticles(px, py, '#00f0ff', 1, 'ice');
    }

    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      if (!e.active) continue;

      if (Math.abs(e.y - game.hero.y) > range + e.radius) continue;
      const dist = Math.hypot(e.x - game.hero.x, e.y - game.hero.y);
      if (dist <= range) {
        const angleToEnemy = Math.atan2(e.y - game.hero.y, e.x - game.hero.x);
        let diff = Math.abs(angleToEnemy - heroAngle);
        while (diff > Math.PI) diff = Math.PI * 2 - diff;

        if (diff <= cone / 2) {
          e.freezeTimer = 2.2;
          e.freezeFactor = freezeCfg.slowRatio;
          this.onHit(e, freezeCfg.damagePerTick * dt * 25, false, 'freeze');
        }
      }
    }
  }

  onHit(enemy, dmg, isCrit = false, type = 'normal', knockVx = 0, knockVy = 0) {
    if (!enemy.active || enemy.hp <= 0) return;
    const game = this.game;
    // 统一元素协同与反应调用
    let elem = null;
    if (type === 'laser' || type === 'thunder') elem = 'thunder';
    else if (type === 'tornado' || type === 'wind') elem = 'wind';
    else if (type === 'bomber' || type === 'fire' || type === 'rocket' || type === 'pet-fire') elem = 'fire';
    else if (type === 'freeze' || type === 'ice') elem = 'ice';
    else if (type === 'boomerang' || type === 'truck') elem = 'physical';

    if (elem) {
      game.synergySystem.registerHit(enemy, elem, dmg, enemy.x, enemy.y);
    }

    if (enemy.freezeTimer > 0) {
      if ((type === 'rocket' || type === 'fire' || type === 'bomber' || game.synergies.thermalEngine) && elem !== 'ice') {
        game.synergySystem.triggerThermalShock(enemy, enemy.x, enemy.y);
        return;
      }
      if (type === 'truck' && game.synergies.cryoShatter) {
        game.synergySystem.triggerIceShatter(enemy, enemy.x, enemy.y);
      }
    }

    if (isCrit) {
      sound.playCritHit();
      game.feedback.addTrauma(0.32); // 暴击强劲震颤
      game.feedback.triggerHitStop(0.035);
      if (game.synergies.teslaCoil) {
        game.synergySystem.triggerTeslaChain(enemy, dmg);
      }
    }

    enemy.hitFlash = 0.16;
    enemy.hitStagger = 0.22;
    enemy.hitStaggerTotal = 0.22;
    if (knockVx !== 0 || knockVy !== 0) {
      enemy.hitAngle = Math.atan2(knockVy, knockVx);
    }

    let textColor = '#ffffff';
    if (isCrit) textColor = '#ffaa00';
    else if (type === 'fire' || type === 'rocket' || type === 'bomber' || type === 'pet-fire') textColor = '#ff7700';
    else if (type === 'freeze' || type === 'ice') textColor = '#38bdf8';
    else if (type === 'laser' || type === 'thunder') textColor = '#c084fc';
    else if (type === 'tornado' || type === 'wind') textColor = '#34d399';
    else if (type === 'boomerang') textColor = '#facc15';
    else if (type === 'truck') textColor = '#e11d48';
    else if (type === 'emp') textColor = '#00f0ff';

    game.spawnDamageText(enemy.x, enemy.y - enemy.radius - 8, dmg, textColor, isCrit);

    enemy.hp -= dmg;
    game.totalDamage += dmg;

    if (enemy.hp <= 0) {
      this.onKill(enemy);
    }
  }

  onKill(enemy) {
    if (!enemy.active) return;
    enemy.active = false;
    const game = this.game;
    game.kills++;
    gameEvents.emit('kill_changed', { kills: game.kills });

    let dropScrap = 0;

    if (enemy.isBoss) {
      sound.playExplosion();
      game.feedback.addTrauma(0.85);
      game.feedback.triggerHitStop(0.08);
      dropScrap = 25 + Math.floor(Math.random() * 15);

      for (let i = 0; i < 8; i++) {
        const g = game.gemPool.get();
        g.active = true;
        g.x = enemy.x;
        g.y = enemy.y;
        const angle = Math.random() * Math.PI * 2;
        const speed = 120 + Math.random() * 160;
        g.vx = Math.cos(angle) * speed;
        g.vy = Math.sin(angle) * speed;
        g.val = Math.round(enemy.expVal / 8);
        g.timer = 0;
        g.color = '#ffaa00';
        game.gems.push(g);
      }

      game.spawnParticles(enemy.x, enemy.y, '#ff0055', 45, 'fire');
      game.spawnParticles(enemy.x, enemy.y, '#ffaa00', 35, 'spark');
      game.spawnDamageText(enemy.x, enemy.y - 30, '👑 首领击破!!', '#ffaa00', true, true);
      game.activeBoss = null;
    } else {
      if (enemy.type === 'behemoth') {
        game.feedback.addTrauma(0.32);
        game.feedback.triggerHitStop(0.03);
        dropScrap = 5 + Math.floor(Math.random() * 4);
      } else if (enemy.type === 'charger') {
        game.feedback.addTrauma(0.18);
        dropScrap = 2 + Math.floor(Math.random() * 3);
      } else {
        game.feedback.addTrauma(0.12);
        dropScrap = Math.random() < 0.65 ? (1 + Math.floor(Math.random() * 2)) : 0;
      }

      const g = game.gemPool.get();
      g.active = true;
      g.x = enemy.x;
      g.y = enemy.y;
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 60 + Math.random() * 80;
      g.vx = Math.cos(angle) * speed;
      g.vy = Math.sin(angle) * speed;
      g.val = enemy.expVal || 5;
      g.timer = 0;
      g.color = enemy.type === 'behemoth' ? '#ffaa00' : (enemy.type === 'charger' ? '#f59e0b' : '#00f0ff');
      game.gems.push(g);

      game.spawnParticles(enemy.x, enemy.y, enemy.color || '#ff2a5f', 8, 'spark');
    }

    // 触发金币/碎片掉落与飘字飞入
    if (dropScrap > 0) {
      game.scrap = (game.scrap || 0) + dropScrap;
      saveManager.addScrap(dropScrap);
      gameEvents.emit('scrap_gained', { amount: dropScrap, x: enemy.x, y: enemy.y });
      gameEvents.emit('scrap_changed', { scrap: game.scrap });
    }
  }

  update(dt) {
    const game = this.game;

    for (let i = 0; i < this.activeRockets.length; i++) {
      const r = this.activeRockets[i];
      if (!r.active) continue;

      r.progress += dt / r.duration;
      const t = Math.min(1, r.progress);
      const cx = r.sx + (r.tx - r.sx) * t;
      const cy = r.sy + (r.ty - r.sy) * t - Math.sin(t * Math.PI) * 80;

      game.spawnParticles(cx, cy, '#ff7700', 2, 'fire');

      if (t >= 1) {
        r.active = false;
        this.detonateRocket(r.tx, r.ty);
      }
    }
    ObjectPool.compact(this.activeRockets);

    for (let i = 0; i < game.bullets.length; i++) {
      const b = game.bullets[i];
      if (!b.active) continue;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (b.x < 0 || b.x > game.width || b.y < 0 || b.y > game.height || b.life <= 0) {
        b.active = false;
        game.bulletPool.release(b);
        continue;
      }

      for (let j = 0; j < game.enemies.length; j++) {
        const e = game.enemies[j];
        if (!e.active) continue;

        const hitR = b.radius + e.radius;
        if (Math.abs(b.y - e.y) > hitR || Math.abs(b.x - e.x) > hitR) continue;

        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (dx * dx + dy * dy < hitR * hitR) {
          this.onHit(e, b.damage, b.isCrit, 'normal', b.vx, b.vy);
          game.spawnParticles(b.x, b.y, b.isCrit ? '#ffcc00' : '#00f0ff', 4, 'spark');

          b.pierceLeft--;
          if (b.pierceLeft <= 0) {
            b.active = false;
            game.bulletPool.release(b);
            break;
          }
        }
      }
    }
    ObjectPool.compact(game.bullets);

    for (let i = 0; i < game.iceSpikes.length; i++) {
      const spike = game.iceSpikes[i];
      if (!spike.active) continue;

      spike.x += spike.vx * dt;
      spike.y += spike.vy * dt;
      spike.life -= dt;

      if (spike.life <= 0 || spike.y < -50 || spike.x < 0 || spike.x > game.width) {
        spike.active = false;
        continue;
      }

      for (let j = 0; j < game.enemies.length; j++) {
        const e = game.enemies[j];
        if (!e.active) continue;
        const hitR = e.radius + 8;
        if (Math.abs(spike.y - e.y) > hitR + 4 || Math.abs(spike.x - e.x) > hitR + 4) continue;

        const dx = e.x - spike.x;
        const dy = e.y - spike.y;
        if (dx * dx + dy * dy < hitR * hitR) {
          this.onHit(e, spike.damage, false, 'freeze', spike.vx, spike.vy);
          game.spawnParticles(spike.x, spike.y, '#00f0ff', 3, 'spark');
          spike.pierce--;
          if (spike.pierce <= 0) {
            spike.active = false;
            break;
          }
        }
      }
    }
    ObjectPool.compact(game.iceSpikes);

    for (let i = 0; i < game.burnZones.length; i++) {
      const bz = game.burnZones[i];
      if (!bz.active) continue;

      bz.life -= dt;
      bz.tickTimer += dt;

      if (Math.random() < 0.35) {
        const pAngle = Math.random() * Math.PI * 2;
        const pDist = Math.random() * bz.radius;
        game.spawnParticles(bz.x + Math.cos(pAngle) * pDist, bz.y + Math.sin(pAngle) * pDist, '#ff5722', 1, 'fire');
      }

      if (bz.tickTimer >= 0.3) {
        bz.tickTimer = 0;
        const dpsTick = game.skills.rocket.burnDps * 0.3;
        for (let j = 0; j < game.enemies.length; j++) {
          const e = game.enemies[j];
          if (!e.active) continue;
          const hitR = bz.radius + e.radius;
          if (Math.abs(e.y - bz.y) > hitR || Math.abs(e.x - bz.x) > hitR) continue;

          const dx = e.x - bz.x;
          const dy = e.y - bz.y;
          if (dx * dx + dy * dy <= bz.radius * bz.radius) {
            this.onHit(e, dpsTick, false, 'fire');
          }
        }
      }

      if (bz.life <= 0) {
        bz.active = false;
      }
    }
    ObjectPool.compact(game.burnZones);

    for (let i = 0; i < game.activeTrucks.length; i++) {
      const truck = game.activeTrucks[i];
      if (!truck.active) continue;

      truck.y -= truck.speed * dt;

      if (game.synergies.truckInferno) {
        truck.infernoTimer = (truck.infernoTimer || 0) + dt;
        if (truck.infernoTimer >= 0.16) {
          truck.infernoTimer = 0;
          game.burnZones.push({
            active: true,
            x: truck.x + (Math.random() * 20 - 10),
            y: truck.y + 45,
            radius: 40,
            life: 2.8,
            maxLife: 2.8,
            tickTimer: 0
          });
        }
      }

      const tRoad = game.getRoadBounds(truck.y);
      const targetTruckX = tRoad.left + tRoad.roadWidth * (truck.laneRatio || 0.5);
      truck.x += (targetTruckX - truck.x) * Math.min(1, dt * 4.5);

      game.spawnParticles(truck.x + (Math.random() * 30 - 15), truck.y + 40, '#94a3b8', 2, 'smoke');

      for (let j = 0; j < game.enemies.length; j++) {
        const e = game.enemies[j];
        if (!e.active || truck.hitEnemies.has(e)) continue;

        if (Math.abs(e.y - truck.y) < (truck.height / 2 + e.radius) &&
            Math.abs(e.x - truck.x) < (truck.width / 2 + e.radius)) {
          truck.hitEnemies.add(e);
          e.y -= game.skills.truck.knockback;
          this.onHit(e, truck.damage, true, 'truck');
          game.spawnParticles(e.x, e.y, '#e11d48', 10, 'spark');
        }
      }

      if (truck.y < -150) {
        truck.active = false;
      }
    }
    ObjectPool.compact(game.activeTrucks);
  }
}
