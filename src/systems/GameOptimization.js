// ---------------- 运行时性能与战斗表现优化 ----------------
import { ObjectPool } from './ObjectPool.js';

const EFFECT_ARRAYS = [
  'burnZones', 'activeTrucks', 'iceSpikes', 'teslaArcs', 'shockwaves', 'particles', 'damageTexts', 'hitRings'
];

export function installGameOptimization(game) {
  if (!game || game.__optimizationInstalled) return;
  game.__optimizationInstalled = true;

  // 高 DPR 手机上 Canvas 像素量会按 DPR² 增长。游戏是移动 H5，2x 已足够清晰，
  // 避免 3x/4x 屏幕导致 fill/drawImage 成本暴涨。
  const originalResize = game.resize.bind(game);
  game.resize = function optimizedResize() {
    originalResize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(this.width * dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * dpr));
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.__renderDpr = dpr;
  };
  game.resize();

  // 统一清理无效效果，避免长期运行后短命对象堆积。
  game.compactTransientObjects = () => {
    for (const name of EFFECT_ARRAYS) {
      const list = game[name];
      if (!Array.isArray(list) || list.length < 32) continue;
      ObjectPool.compact(list);
    }
  };

  // 轻量级可观测性：不渲染调试 UI，只提供 window.gamePerformance 供 QA / DevTools 使用。
  const perf = {
    fps: 60,
    frameMs: 16.7,
    enemyCount: 0,
    bulletCount: 0,
    particleCount: 0,
    effectCount: 0,
    samples: 0
  };
  game.performanceStats = perf;
  window.gamePerformance = perf;

  let lastSample = performance.now();
  let frames = 0;
  let lastCompact = lastSample;
  const sample = () => {
    const now = performance.now();
    frames++;
    const elapsed = now - lastSample;
    if (elapsed >= 500) {
      perf.fps = Math.round((frames * 1000) / elapsed);
      perf.frameMs = Number((elapsed / frames).toFixed(2));
      perf.enemyCount = game.enemies?.length || 0;
      perf.bulletCount = game.bullets?.length || 0;
      perf.particleCount = game.particles?.length || 0;
      perf.effectCount = EFFECT_ARRAYS.reduce((sum, key) => sum + (game[key]?.length || 0), 0);
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

  // 页面切后台时暂停，回来后不让游戏积累超长 dt 造成瞬移/爆发伤害。
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.__wasPausedByVisibility = !game.isPaused;
      game.isPaused = true;
    } else if (game.__wasPausedByVisibility && !game.isGameOver && !game.isUpgrading) {
      game.isPaused = false;
      game.lastTime = performance.now();
    }
  });

  // 提供统一的低成本效果预算接口，后续技能/宠物可以直接复用。
  game.effectBudget = {
    particles: 220,
    damageTexts: 28,
    hitRings: 48
  };
}
