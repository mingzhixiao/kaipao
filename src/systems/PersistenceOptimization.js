// ---------------- 本地存档写入优化 ----------------
// 战斗期间击杀、掉落等事件会频繁触发 SaveManager.save()。
// 将短时间内的多次写入合并，避免 localStorage 高频 JSON.stringify / I/O。
export function installPersistenceOptimization(saveManager) {
  if (!saveManager || saveManager.__persistenceOptimizationInstalled) return;
  saveManager.__persistenceOptimizationInstalled = true;

  const originalSave = saveManager.save.bind(saveManager);
  let timer = null;
  let dirty = false;

  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (!dirty) return;
    dirty = false;
    originalSave();
  };

  saveManager.save = function optimizedSave(options = null) {
    dirty = true;
    const immediate = options === true || options?.immediate === true;
    if (immediate) {
      flush();
      return;
    }

    if (timer !== null) return;
    timer = setTimeout(flush, 400);
  };

  saveManager.flushSave = flush;

  window.addEventListener('pagehide', flush, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
  });
}
