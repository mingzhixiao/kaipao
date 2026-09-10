// ---------------- 运行时性能与战斗表现优化 ----------------
// 这一层负责“无业务侵入”的运行时优化：不修改图片资源，不主动改变战斗数值，
// 优先减少 O(bullets * enemies) 等热路径、重复 DOM 更新和高 DPR 像素成本。
import { ObjectPool } from './ObjectPool.js';
import { SpatialHash } from './SpatialHash.js';
import { sound } from './SoundEngine.js';

const EFFECT_ARRAYS = [
  'burnZones', 'activeTrucks', 'iceSpikes', 'teslaArcs', 'shockwaves', 'particles', 'damageTexts', 'hitRings'
];

const ENEMY_ENTRY_Y = 64;
const TAU = Math.PI * 2;
const TARGET_STEP = 1 / 30;

function normalizeAngleDiff(diff) {
  while (diff < -Math.PI) diff += TAU;
  while (diff > Math.PI) diff -= TAU;
  return diff;
}

function chooseAnyActiveEnemy(game) {
  const enemies = game.enemies;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.active && enemy.hp > 0 && enemy.y - enemy.radius >= ENEMY_ENTRY_Y) return enemy;
  }
  return null;
}

function chooseRandomActiveEnemy(game) {
  const enemies = game.enemies;
  let activeCount = 0;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.active && enemy.hp > 0 && enemy.y - enemy.radius >= ENEMY_ENTRY_Y) activeCount++;
  }
  if (activeCount === 0) return null;

  let pick = Math.floor(Math.random() * activeCount);
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy.active || enemy.hp <= 0 || enemy.y - enemy.radius < ENEMY_ENTRY_Y) continue;
    if (pick-- === 0) return enemy;
  }
  return null;
}

export function installGameOptimization(game) {
  if (!game || game.__optimizationInstalled) return;
  game.__optimizationInstalled = true;

  // ---------------------------------------------------------------------------
  // 1. Canvas resize：DPR 封顶（2x）与同尺寸短路已下沉到 Game.resize() 本体，
  //    这里不再包一层。原来的包装既不跳过同尺寸 resize，也不调用
  //    renderer.setPixelRatio()，反而会先按原始 DPR 分配一次再被覆盖，
  //    等于每次 resize 白分配一整块缓冲。
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // 2. 敌人空间索引：token 跟战斗 update tick 绑定。
  // ---------------------------------------------------------------------------
  const enemyHash = new SpatialHash(96);
  game.enemySpatialHash = enemyHash;
  let enemyHashToken = 0;
  const rebuildEnemyHash = () => {
    enemyHashToken++;
    enemyHash.rebuild(game.enemies, enemyHashToken);
  };

  // ---------------------------------------------------------------------------
  // 3. 自动瞄准降频：30Hz 足够保持连续跟枪效果。
  // ---------------------------------------------------------------------------
  const originalUpdateAutoTarget = game.combatSystem.updateAutoTarget.bind(game.combatSystem);
  let targetAccumulator = 0;
  game.combatSystem.updateAutoTarget = function optimizedAutoTarget(dt = 1 / 60) {
    targetAccumulator += Math.min(dt, 0.1);
    if (targetAccumulator < TARGET_STEP) return;
    targetAccumulator %= TARGET_STEP;
    originalUpdateAutoTarget();
  };

  // ---------------------------------------------------------------------------
  // 4. 范围技能使用空间哈希 broad-phase。
  // ---------------------------------------------------------------------------
  game.combatSystem.detonateRocket = function optimizedDetonateRocket(x, y) {
    const combat = this;
    const rocketCfg = game.skills.rocket;
    const rad = rocketCfg.radius * (1 + (rocketCfg.level - 1) * 0.2);
    const dmg = rocketCfg.damage * (1 + (rocketCfg.level - 1) * 0.35);

    game.feedback.addTrauma(0.55);
    game.feedback.triggerHitStop(0.04);
    sound.playExplosion();

    rebuildEnemyHash();
    enemyHash.forEachInRadius(x, y, rad + 32, (e) => {
      if (!e.active || e.y - e.radius < ENEMY_ENTRY_Y) return;
      const dx = e.x - x;
      const dy = e.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 > rad * rad) return;
      const d = Math.sqrt(d2);
      const falloff = 1 - (d / rad) * 0.4;
      combat.onHit(e, Math.round(dmg * falloff), true, 'rocket', dx, dy);
    });

    game.spawnParticles(x, y, '#ff4400', 45, 'fire');
    game.spawnParticles(x, y, '#ffcc00', 35, 'spark');
    game.burnZones.push({
      active: true,
      x,
      y,
      radius: rad * 0.85,
      life: rocketCfg.burnDuration,
      maxLife: rocketCfg.burnDuration,
      tickTimer: 0
    });
  };

  game.combatSystem.applyFreezeRay = function optimizedFreezeRay(dt) {
    const combat = this;
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

    rebuildEnemyHash();
    enemyHash.forEachInRadius(game.hero.x, game.hero.y, range + 32, (e) => {
      if (!e.active) return;
      const dx = e.x - game.hero.x;
      const dy = e.y - game.hero.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 > range * range) return;

      const diff = Math.abs(normalizeAngleDiff(Math.atan2(dy, dx) - heroAngle));
      if (diff <= cone / 2) {
        e.freezeTimer = 2.2;
        e.freezeFactor = freezeCfg.slowRatio;
        combat.onHit(e, freezeCfg.damagePerTick * dt * 25, false, 'freeze');
      }
    });
  };

  // ---------------------------------------------------------------------------
  // 5. 核心战斗 update：统一使用 enemySpatialHash 做 broad-phase。
  // ---------------------------------------------------------------------------
  game.combatSystem.update = function optimizedCombatUpdate(dt) {
    const combat = this;
    rebuildEnemyHash();

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
        combat.detonateRocket(r.tx, r.ty);
      }
    }
    ObjectPool.compact(this.activeRockets);

    // 子弹使用当前位置附近 cell 查询，替代全量 bullets × enemies 双循环。
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

      enemyHash.forEachInRadius(b.x, b.y, b.radius + 32, (e) => {
        if (!b.active || !e.active || e.y - e.radius < ENEMY_ENTRY_Y) return;
        const hitR = b.radius + e.radius;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (Math.abs(dy) > hitR || Math.abs(dx) > hitR) return;
        if (dx * dx + dy * dy >= hitR * hitR) return;

        combat.onHit(e, b.damage, b.isCrit, 'normal', b.vx, b.vy);
        game.spawnParticles(b.x, b.y, b.isCrit ? '#ffcc00' : '#00f0ff', 4, 'spark');
        b.pierceLeft--;
        if (b.pierceLeft <= 0) {
          b.active = false;
          game.bulletPool.release(b);
        }
      });
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

      enemyHash.forEachInRadius(spike.x, spike.y, 40, (e) => {
        if (!spike.active || !e.active) return;
        const hitR = e.radius + 8;
        const dx = e.x - spike.x;
        const dy = e.y - spike.y;
        if (Math.abs(dy) > hitR + 4 || Math.abs(dx) > hitR + 4) return;
        if (dx * dx + dy * dy >= hitR * hitR) return;
        combat.onHit(e, spike.damage, false, 'freeze', spike.vx, spike.vy);
        game.spawnParticles(spike.x, spike.y, '#00f0ff', 3, 'spark');
        spike.pierce--;
        if (spike.pierce <= 0) spike.active = false;
      });
    }
    ObjectPool.compact(game.iceSpikes);

    for (let i = 0; i < game.burnZones.length; i++) {
      const bz = game.burnZones[i];
      if (!bz.active) continue;
      bz.life -= dt;
      bz.tickTimer += dt;

      if (Math.random() < 0.35) {
        const pAngle = Math.random() * TAU;
        const pDist = Math.random() * bz.radius;
        game.spawnParticles(
          bz.x + Math.cos(pAngle) * pDist,
          bz.y + Math.sin(pAngle) * pDist,
          '#ff5722',
          1,
          'fire'
        );
      }

      if (bz.tickTimer >= 0.3) {
        bz.tickTimer = 0;
        const dpsTick = game.skills.rocket.burnDps * 0.3;
        enemyHash.forEachInRadius(bz.x, bz.y, bz.radius + 32, (e) => {
          if (!e.active) return;
          const hitR = bz.radius + e.radius;
          const dx = e.x - bz.x;
          const dy = e.y - bz.y;
          if (Math.abs(dy) > hitR || Math.abs(dx) > hitR) return;
          if (dx * dx + dy * dy <= bz.radius * bz.radius) {
            combat.onHit(e, dpsTick, false, 'fire');
          }
        });
      }
      if (bz.life <= 0) bz.active = false;
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

      const halfW = truck.width / 2;
      const halfH = truck.height / 2;
      enemyHash.forEachInRadius(truck.x, truck.y, Math.max(halfW, halfH) + 40, (e) => {
        if (!e.active || truck.hitEnemies.has(e)) return;
        if (
          Math.abs(e.y - truck.y) < halfH + e.radius &&
          Math.abs(e.x - truck.x) < halfW + e.radius
        ) {
          truck.hitEnemies.add(e);
          e.y -= game.skills.truck.knockback;
          combat.onHit(e, truck.damage, true, 'truck');
          game.spawnParticles(e.x, e.y, '#e11d48', 10, 'spark');
        }
      });

      if (truck.y < -150) truck.active = false;
    }
    ObjectPool.compact(game.activeTrucks);
  };

  // ---------------------------------------------------------------------------
  // 6. remove a hot-path Array.filter allocation in Game.updateSkills.
  //    Original behavior is preserved: pick one uniformly from currently active enemies.
  // ---------------------------------------------------------------------------
  game.updateSkills = function optimizedUpdateSkills(dt) {
    const skills = this.skills;

    if (skills.rocket.level > 0) {
      skills.rocket.timer += dt;
      if (skills.rocket.timer >= skills.rocket.cooldown) {
        skills.rocket.timer = 0;
        let targetX = this.width / 2;
        let targetY = this.height * 0.38;
        if (this.enemies.length > 0) {
          const target = chooseRandomActiveEnemy(this);
          if (target) {
            targetX = target.x;
            targetY = target.y;
          }
        }
        this.combatSystem.launchRocket(targetX, targetY);
      }
    }

    if (skills.truck.level > 0) {
      skills.truck.timer += dt;
      if (skills.truck.timer >= skills.truck.cooldown) {
        skills.truck.timer = 0;
        this.combatSystem.launchArmoredTruck();
      }
    }

    if (skills.freeze.level > 0) {
      skills.freeze.timer += dt;
      if (skills.freeze.timer >= skills.freeze.cooldown) {
        skills.freeze.timer = 0;
        skills.freeze.activeTimer = skills.freeze.duration;
        if (typeof sound.playFreezeSpray === 'function') sound.playFreezeSpray();
      }
      if (skills.freeze.activeTimer > 0) {
        skills.freeze.activeTimer -= dt;
        this.combatSystem.applyFreezeRay(dt);
      }
    }

    // 技能 HUD 的 DOM 刷新由 SkillsPetsHud 的 game.update 包装统一负责
    //（元素缓存 + 值比对，只在数值变化时写 DOM），此处不再调用
    // 已随 HUDManager 精简一并删除的 hud.updateSkillHUD()。
  };

  // ---------------------------------------------------------------------------
  // 7. 粒子自适应预算：优先削减视觉对象，不改变敌人数和伤害。
  // ---------------------------------------------------------------------------
  const originalSpawnParticles = game.spawnParticles.bind(game);
  game.spawnParticles = function optimizedSpawnParticles(x, y, color, count, type = 'spark') {
    const fps = this.performanceStats?.fps || 60;
    let budget = 220;
    if (fps < 42) budget = 140;
    else if (fps < 50) budget = 180;

    const active = this.particles?.length || 0;
    if (active >= budget) return;
    const allowed = Math.min(count, budget - active);
    if (allowed <= 0) return;
    return originalSpawnParticles(x, y, color, allowed, type);
  };

  // ---------------------------------------------------------------------------
  // 8. 长局临时对象整理。
  // ---------------------------------------------------------------------------
  game.compactTransientObjects = () => {
    for (const name of EFFECT_ARRAYS) {
      const list = game[name];
      if (!Array.isArray(list) || list.length < 32) continue;
      ObjectPool.compact(list);
    }
    if (Array.isArray(game.combatSystem.activeRockets) && game.combatSystem.activeRockets.length >= 16) {
      ObjectPool.compact(game.combatSystem.activeRockets);
    }
  };

  // ---------------------------------------------------------------------------
  // 9. 轻量性能指标，不创建 DOM。
  // ---------------------------------------------------------------------------
  const perf = {
    fps: 60,
    frameMs: 16.7,
    enemyCount: 0,
    bulletCount: 0,
    particleCount: 0,
    effectCount: 0,
    spatialCells: 0,
    samples: 0
  };
  game.performanceStats = perf;
  window.gamePerformance = perf;

  let lastSample = performance.now();
  let frames = 0;
  let lastCompact = lastSample;
  let optimizationFrame = 0;
  const sample = () => {
    const now = performance.now();
    frames++;
    optimizationFrame++;

    const elapsed = now - lastSample;
    if (elapsed >= 500) {
      perf.fps = Math.round((frames * 1000) / elapsed);
      perf.frameMs = Number((elapsed / frames).toFixed(2));
      perf.enemyCount = game.enemies?.length || 0;
      perf.bulletCount = game.bullets?.length || 0;
      perf.particleCount = game.particles?.length || 0;
      perf.effectCount = EFFECT_ARRAYS.reduce((sum, key) => sum + (game[key]?.length || 0), 0);
      perf.spatialCells = enemyHash.cells.size;
      perf.samples++;
      frames = 0;
      lastSample = now;
    }

    if (now - lastCompact >= 1000) {
      game.compactTransientObjects();
      lastCompact = now;
    }
    if (!document.hidden) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);

  // 页面切后台自动暂停并重置时间基准，避免回来瞬移。
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.__wasPausedByVisibility = !game.isPaused;
      game.isPaused = true;
    } else if (game.__wasPausedByVisibility && !game.isGameOver && !game.isUpgrading) {
      game.isPaused = false;
      game.lastTime = performance.now();
    }
  });

  // 暴露一个轻量辅助供未来技能/宠物模块复用，不改变现有 API。
  game.findAnyActiveEnemy = () => chooseAnyActiveEnemy(game);
  game.effectBudget = {
    particles: 220,
    damageTexts: 28,
    hitRings: 48
  };
}
