// ---------------- 运行时性能与战斗表现优化 ----------------
// 这一层只做“无业务侵入”的运行时优化：不改变数值配置、不修改资源图片，
// 通过减少重复扫描、Canvas 像素量和 UI 高频刷新降低 H5 长局卡顿。
import { ObjectPool } from './ObjectPool.js';
import { SpatialHash } from './SpatialHash.js';
import { sound } from './SoundEngine.js';
import { GAME_CONFIG } from '../core/Config.js';

const EFFECT_ARRAYS = [
  'burnZones', 'activeTrucks', 'iceSpikes', 'teslaArcs', 'shockwaves', 'particles', 'damageTexts', 'hitRings'
];

const ENEMY_ENTRY_Y = 64;
const TAU = Math.PI * 2;

function normalizeAngleDiff(diff) {
  while (diff < -Math.PI) diff += TAU;
  while (diff > Math.PI) diff -= TAU;
  return diff;
}

export function installGameOptimization(game) {
  if (!game || game.__optimizationInstalled) return;
  game.__optimizationInstalled = true;

  // ---------------------------------------------------------------------------
  // 1. Canvas resize：原逻辑会先按真实 DPR 写一次像素尺寸，再被优化层写第二次。
  //    这里直接接管 resize，避免 3x/4x 手机在 resize 时发生双倍大画布分配。
  // ---------------------------------------------------------------------------
  game.resize = function optimizedResize() {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(this.width * dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * dpr));
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.__renderDpr = dpr;

    const skillHudHeight = 68;
    this.fortress.height = 84;
    this.fortress.x = 0;
    this.fortress.y = this.height - skillHudHeight - this.fortress.height;
    this.fortress.width = this.width;
    this.hero.x = this.width / 2;
    this.hero.y = this.fortress.y + 22;
    this.renderer.invalidateBackground();
  };
  game.resize();

  // ---------------------------------------------------------------------------
  // 2. 空间索引：范围技能不再每次都扫描整个 enemies 数组。
  //    以 96px cell 建立稀疏空间哈希；移动实体每个战斗 tick 重建一次。
  // ---------------------------------------------------------------------------
  const enemyHash = new SpatialHash(96);
  game.enemySpatialHash = enemyHash;
  game.__enemyHashFrame = -1;
  game.__enemyHashDirty = true;
  game.markEnemySpatialHashDirty = () => { game.__enemyHashDirty = true; };

  const rebuildEnemyHash = () => {
    const frame = game.__optimizationFrame || 0;
    if (!game.__enemyHashDirty && game.__enemyHashFrame === frame) return;
    enemyHash.rebuild(game.enemies, frame);
    game.__enemyHashFrame = frame;
    game.__enemyHashDirty = false;
  };

  // ---------------------------------------------------------------------------
  // 3. 自动瞄准：保持原权重算法，但减少无效对象访问，并限制极端长局下
  //    的目标计算频率。30Hz 对自动瞄准已经足够，角度仍保持连续插值。
  // ---------------------------------------------------------------------------
  const originalUpdateAutoTarget = game.combatSystem.updateAutoTarget.bind(game.combatSystem);
  let targetAccumulator = 0;
  const targetStep = 1 / 30;
  game.combatSystem.updateAutoTarget = function optimizedAutoTarget(dt = 1 / 60) {
    targetAccumulator += Math.min(dt, 0.1);
    if (targetAccumulator < targetStep) return;
    targetAccumulator %= targetStep;
    originalUpdateAutoTarget();
  };

  // ---------------------------------------------------------------------------
  // 4. 火箭爆炸：使用空间哈希做 broad-phase，保持原伤害、掉落和特效完全不变。
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

  // ---------------------------------------------------------------------------
  // 5. 冰冻射线：同样改成空间查询。粒子数量、伤害 tick、角度规则保持原值。
  // ---------------------------------------------------------------------------
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

      const angleToEnemy = Math.atan2(dy, dx);
      const diff = Math.abs(normalizeAngleDiff(angleToEnemy - heroAngle));
      if (diff <= cone / 2) {
        e.freezeTimer = 2.2;
        e.freezeFactor = freezeCfg.slowRatio;
        combat.onHit(e, freezeCfg.damagePerTick * dt * 25, false, 'freeze');
      }
    });
  };

  // ---------------------------------------------------------------------------
  // 6. 高频 HUD 更新降频到 15Hz。
  //    战斗数值仍按原 dt 更新，只有 DOM 刷新降频，避免每帧触发 layout/style。
  // ---------------------------------------------------------------------------
  const originalUpdateSkills = game.updateSkills.bind(game);
  let hudAccumulator = 0;
  game.updateSkills = function optimizedUpdateSkills(dt) {
    originalUpdateSkills(dt);
    hudAccumulator += dt;
    if (hudAccumulator >= 1 / 15) {
      hudAccumulator %= 1 / 15;
      this.hud.updateSkillHUD(this);
    }
  };

  // 原 updateSkills 内部仍然会刷新一次 HUD；把真正的 HUD 方法做节流，
  // 这样其他系统主动调用 updateSkillHUD 时也不会破坏体验。
  const originalHudUpdate = game.hud.updateSkillHUD?.bind(game.hud);
  if (originalHudUpdate) {
    let lastHudUpdate = -Infinity;
    game.hud.updateSkillHUD = function optimizedSkillHudUpdate(g) {
      const now = performance.now();
      if (now - lastHudUpdate < 66 && !g.isGameOver && !g.isUpgrading) return;
      lastHudUpdate = now;
      return originalHudUpdate(g);
    };
  }

  // ---------------------------------------------------------------------------
  // 7. 粒子自适应预算：正常设备仍使用原 220；当 FPS 持续下降时逐级降预算，
  //    避免粒子雪崩拖垮主循环。不会修改战斗伤害或敌人数量。
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
  // 8. 统一清理无效效果，避免长局中 inactive 项长期留在数组里。
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
  // 9. 轻量可观测性：不创建 DOM，只提供 window.gamePerformance 给 QA/DevTools。
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
    game.__optimizationFrame = optimizationFrame;
    game.__enemyHashDirty = true;

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

  // 页面切后台时暂停；回来后重置时间基准，避免积累长 dt 导致瞬移/爆发伤害。
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.__wasPausedByVisibility = !game.isPaused;
      game.isPaused = true;
    } else if (game.__wasPausedByVisibility && !game.isGameOver && !game.isUpgrading) {
      game.isPaused = false;
      game.lastTime = performance.now();
    }
  });

  game.effectBudget = {
    particles: 220,
    damageTexts: 28,
    hitRings: 48
  };
}
