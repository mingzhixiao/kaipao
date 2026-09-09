// ---------------- 战斗与弹道判定系统 (Combat, Projectiles & Spatial Pruning) ----------------
import { sound } from '../systems/SoundEngine.js';
import { ObjectPool } from '../systems/ObjectPool.js';
import { GAME_CONFIG } from '../core/Config.js';
import { gameEvents } from '../core/GameEventBus.js';
import { saveManager } from '../systems/SaveManager.js';

const ENEMY_COMBAT_ENTRY_Y = 64;

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
      if (!e.active || e.y - e.radius < ENEMY_COMBAT_ENTRY_Y) continue;

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
    if (!enemy.active || enemy.hp <= 0 || enemy.y - enemy.radius < ENEMY_COMBAT_ENTRY_Y) return;
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

    // 装甲护盾吸收与破盾机制
    let dealtToShield = 0;
    let dealtToHp = dmg;
    const hadShield = (enemy.shield || 0) > 0;

    if (hadShield) {
      dealtToShield = Math.min(enemy.shield, dmg);
      enemy.shield -= dealtToShield;
      dealtToHp = dmg - dealtToShield;

      // 护盾青蓝电弧离子粒子反馈
      game.spawnParticles(enemy.x, enemy.y, '#38bdf8', Math.min(8, 3 + Math.floor(dealtToShield / 25)), 'spark');

      // 破盾击碎提示与强力正向反馈
      if (enemy.shield <= 0) {
        enemy.shield = 0;
        if (typeof sound.playShieldBreak === 'function') sound.playShieldBreak();
        game.spawnParticles(enemy.x, enemy.y, '#00f0ff', 15, 'spark');
        game.spawnDamageText(enemy.x, enemy.y - enemy.radius - 20, '🛡️ 护盾击碎!', '#38bdf8', true, true);
        game.feedback.addTrauma(0.15);
      }
    }

    if (dealtToHp > 0) {
      enemy.hp -= dealtToHp;
    }
    game.totalDamage += dmg;

    // 伤害飘字颜色适配 (若完全被护盾吸收显示高科技青蓝色)
    if (hadShield && dealtToHp <= 0) {
      textColor = '#38bdf8';
    }
    game.spawnDamageText(enemy.x, enemy.y - enemy.radius - 8, dmg, textColor, isCrit);

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
    if (!game.battleLoot) {
      game.battleLoot = { scrap: 0, gems: 0, items: {} };
    }

    // 怪物击杀经验直接注入指挥官战术升级，无需在地面生成掉落晶核
    const expGained = enemy.expVal || (enemy.isBoss ? 80 : 6);
    game.gainExp(expGained);

    let dropScrap = 0;

    if (enemy.isBoss) {
      sound.playExplosion();
      game.feedback.addTrauma(0.85);
      game.feedback.triggerHitStop(0.08);
      dropScrap = 30 + Math.floor(Math.random() * 20);

      // Boss 额外掉落晶核、军备箱、枪械零件与力量/射速/攻速碎片
      const bossGems = 6 + Math.floor(Math.random() * 6);
      game.battleLoot.gems = (game.battleLoot.gems || 0) + bossGems;
      game.battleLoot.items['supply_crate'] = (game.battleLoot.items['supply_crate'] || 0) + 1;
      const rarePool = ['assault_part', 'gatling_part', 'gauss_part', 'plasma_part', 'fluffy_shard', 'dragon_shard', 'chip_rocket', 'chip_laser'];
      const droppedItem = rarePool[Math.floor(Math.random() * rarePool.length)];
      game.battleLoot.items[droppedItem] = (game.battleLoot.items[droppedItem] || 0) + 1;

      // Boss 必额外掉落 1~2 组强化碎片
      const shardPool = ['power_shard', 'bulletspeed_shard', 'attackspeed_shard', 'mag_shard'];
      const shard1 = shardPool[Math.floor(Math.random() * shardPool.length)];
      const sCnt1 = 2 + Math.floor(Math.random() * 2);
      game.battleLoot.items[shard1] = (game.battleLoot.items[shard1] || 0) + sCnt1;

      game.spawnParticles(enemy.x, enemy.y, '#ff0055', 45, 'fire');
      game.spawnParticles(enemy.x, enemy.y, '#ffaa00', 35, 'spark');
      game.spawnDamageText(enemy.x, enemy.y - 30, '👑 首领击破! 战利品与强化碎片已入库', '#ffaa00', true, true);
      game.activeBoss = null;
    } else {
      if (enemy.type === 'behemoth') {
        game.feedback.addTrauma(0.32);
        game.feedback.triggerHitStop(0.03);
        dropScrap = 6 + Math.floor(Math.random() * 5);
        if (Math.random() < 0.55) {
          const matPool = ['power_shard', 'bulletspeed_shard', 'attackspeed_shard', 'mag_shard', 'assault_part', 'gatling_part', 'chip_truck'];
          const droppedItem = matPool[Math.floor(Math.random() * matPool.length)];
          game.battleLoot.items[droppedItem] = (game.battleLoot.items[droppedItem] || 0) + 1;
        }
      } else if (enemy.type === 'charger') {
        game.feedback.addTrauma(0.18);
        dropScrap = 3 + Math.floor(Math.random() * 3);
        if (Math.random() < 0.25) {
          const fastShards = ['bulletspeed_shard', 'attackspeed_shard'];
          const droppedShard = fastShards[Math.floor(Math.random() * fastShards.length)];
          game.battleLoot.items[droppedShard] = (game.battleLoot.items[droppedShard] || 0) + 1;
        }
      } else {
        game.feedback.addTrauma(0.12);
        dropScrap = Math.random() < 0.65 ? (1 + Math.floor(Math.random() * 2)) : 0;
        if (Math.random() < 0.12) {
          const basicShards = ['power_shard', 'bulletspeed_shard', 'attackspeed_shard'];
          const droppedShard = basicShards[Math.floor(Math.random() * basicShards.length)];
          game.battleLoot.items[droppedShard] = (game.battleLoot.items[droppedShard] || 0) + 1;
        }
      }

      game.spawnParticles(enemy.x, enemy.y, enemy.color || '#ff2a5f', 8, 'spark');
    }

    // 战利品累计到游戏战利品仓库中（游戏结束后自动统一结算）
    if (dropScrap > 0) {
      game.battleLoot.scrap = (game.battleLoot.scrap || 0) + dropScrap;
      game.scrap = (game.scrap || 0) + dropScrap;
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
        if (!e.active || e.y - e.radius < ENEMY_COMBAT_ENTRY_Y) continue;

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
