// ---------------- 运行时性能与战斗表现优化 ----------------
import { ObjectPool } from './ObjectPool.js';

const EFFECT_ARRAYS = [
  'burnZones', 'activeTrucks', 'iceSpikes', 'teslaArcs', 'shockwaves', 'particles', 'damageTexts', 'hitRings'
];

export function installGameOptimization(game) {
  if (!game || game.__optimizationInstalled) return;
  game.__optimizationInstalled = true;

  // DPR 封顶（2x）已下沉到 Game.resize() 本体，这里不再包一层：
  // 原来的包装会先按原始 DPR 分配一次再按 2x 重新分配，等于每次 resize 白分配一整块缓冲。

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

}
