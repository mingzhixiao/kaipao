// ---------------- 存档模式：local / d1 ----------------
// 通过 URL 参数选择：?storage=local 或 ?storage=d1
// D1 模式仍保留浏览器本地缓存，避免网络抖动导致游戏无法启动或存档丢失。

const MODE_LOCAL = 'local';
const MODE_D1 = 'd1';
const SAVE_KEY = 'starcore_vanguard_save_v6';
const LEGACY_KEYS = ['kaipao_roguelike_save_v5', 'kaipao_roguelike_save_v4'];
const DEVICE_KEY = 'starcore_vanguard_device_id_v1';
const STORAGE_STATUS_KEY = 'starcore_vanguard_storage_status_v1';
const REMOTE_SAVE_DEBOUNCE_MS = 600;
const MAX_RETRY_DELAY_MS = 30000;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_SAVE_BYTES = 256 * 1024;

function getModeFromRuntime() {
  if (typeof window === 'undefined') return MODE_LOCAL;
  const configured = String(window.KAIPAO_STORAGE_MODE || '').toLowerCase();
  const query = new URLSearchParams(window.location.search).get('storage');
  const raw = String(query || configured || MODE_LOCAL).toLowerCase();
  return raw === MODE_D1 || raw === 'cloud' || raw === 'remote' ? MODE_D1 : MODE_LOCAL;
}

function getDeviceId() {
  if (typeof localStorage === 'undefined') return 'serverless-' + Math.random().toString(36).slice(2);
  let id = localStorage.getItem(DEVICE_KEY);
  if (id) return id;
  id = typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  try { localStorage.setItem(DEVICE_KEY, id); } catch (_) { /* 私有模式或存储空间不足时忽略 */ }
  return id;
}

function hasLocalSave() {
  if (typeof localStorage === 'undefined') return false;
  try {
    return Boolean(localStorage.getItem(SAVE_KEY) || LEGACY_KEYS.some((key) => localStorage.getItem(key)));
  } catch (_) {
    return false;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setRuntimeState(state) {
  if (typeof window === 'undefined') return;
  window.kaipaoStorage = {
    ...(window.kaipaoStorage || {}),
    ...state
  };
  try {
    localStorage.setItem(STORAGE_STATUS_KEY, JSON.stringify({
      mode: state.mode,
      status: state.status,
      remoteRevision: state.remoteRevision || 0,
      updatedAt: Date.now()
    }));
  } catch (_) { /* 状态提示写入失败不影响游戏 */ }
}

// 为网络请求增加超时控制，避免 Cloudflare 接口异常时一直阻塞游戏启动或存档流程。
function withTimeout(requestFactory, ms = REQUEST_TIMEOUT_MS) {
  if (typeof AbortController === 'undefined') return requestFactory(undefined);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return requestFactory(controller.signal).finally(() => clearTimeout(timer));
}

// 统一封装所有云端 HTTP API 请求，自动设置 JSON 请求头和超时。
async function fetchJson(url, options = {}) {
  return withTimeout((signal) => fetch(url, {
    ...options,
    ...(signal ? { signal } : {}),
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  }));
}

export function getConfiguredStorageMode() {
  return getModeFromRuntime();
}

export async function installCloudStorage(saveManager) {
  const mode = getModeFromRuntime();
  const deviceId = getDeviceId();

  setRuntimeState({
    mode,
    deviceId,
    status: mode === MODE_D1 ? 'connecting' : 'local',
    remoteRevision: 0
  });

  if (mode !== MODE_D1 || !saveManager) {
    return { mode: MODE_LOCAL, deviceId, remoteRevision: 0, remoteAvailable: false };
  }

  let remoteRevision = 0;
  let remoteAvailable = false;
  let remoteTimer = null;
  let remoteDirty = false;
  let savingRemote = false;
  let queuedAfterSave = false;
  let initialized = false;
  let retryDelayMs = REMOTE_SAVE_DEBOUNCE_MS;

  const saveLocal = saveManager.save.bind(saveManager);

  const backupLocalSnapshot = (reason, data) => {
    try {
      const suffix = `${Date.now()}_${reason}`;
      localStorage.setItem(`starcore_vanguard_backup_${suffix}`, JSON.stringify(data));
    } catch (_) { /* 冲突备份属于尽力而为，不影响主流程 */ }
  };

  // ============================================================
  // 云端写入 API：PUT /api/save
  // 请求头：X-Device-Id
  // 请求体：
  //   deviceId         当前匿名玩家设备 ID
  //   baseRevision     客户端上次读取到的云端版本，用于乐观锁
  //   clientUpdatedAt  客户端存档更新时间
  //   data             完整玩家存档 JSON
  //
  // 成功：返回新的 revision。
  // 409：表示云端版本已变化，执行冲突保护并采用云端版本。
  // 网络异常：保留本地存档，并进入指数退避重试。
  // ============================================================
  const requestSave = async ({ keepalive = false } = {}) => {
    if (!remoteDirty || savingRemote) {
      if (savingRemote) queuedAfterSave = true;
      return null;
    }
    remoteDirty = false;
    savingRemote = true;

    const data = clone(saveManager.data);
    const payload = JSON.stringify({
      deviceId,
      baseRevision: remoteRevision,
      clientUpdatedAt: Number(data.lastPlayed || Date.now()),
      data
    });

    if (new TextEncoder().encode(payload).byteLength > MAX_SAVE_BYTES) {
      savingRemote = false;
      console.warn('[Storage] D1 save skipped: payload too large');
      return null;
    }

    try {
      const response = await fetchJson('/api/save', {
        method: 'PUT',
        keepalive,
        headers: { 'X-Device-Id': deviceId },
        body: payload
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok) {
        remoteRevision = Number(result.revision || remoteRevision + 1);
        remoteAvailable = true;
        retryDelayMs = REMOTE_SAVE_DEBOUNCE_MS;
        setRuntimeState({ mode: MODE_D1, deviceId, status: 'online', remoteRevision });
      } else if (response.status === 409 && result.data) {
        // 冲突时保留本地快照，再以服务器版本为准，避免静默丢失本地数据。
        backupLocalSnapshot('conflict', data);
        saveManager.data = saveManager.mergeDefaults(result.data);
        remoteRevision = Number(result.revision || remoteRevision);
        saveLocal(true);
        remoteAvailable = true;
        retryDelayMs = REMOTE_SAVE_DEBOUNCE_MS;
        setRuntimeState({ mode: MODE_D1, deviceId, status: 'conflict-resolved', remoteRevision });
      } else {
        remoteDirty = true;
        setRuntimeState({ mode: MODE_D1, deviceId, status: 'offline', remoteRevision });
        retryDelayMs = Math.min(MAX_RETRY_DELAY_MS, Math.max(REMOTE_SAVE_DEBOUNCE_MS, retryDelayMs * 2));
      }
      return result;
    } catch (error) {
      remoteDirty = true;
      setRuntimeState({ mode: MODE_D1, deviceId, status: 'offline', remoteRevision });
      retryDelayMs = Math.min(MAX_RETRY_DELAY_MS, Math.max(REMOTE_SAVE_DEBOUNCE_MS, retryDelayMs * 2));
      console.warn('[Storage] D1 save failed, local cache remains active:', error);
      return null;
    } finally {
      savingRemote = false;
      if (queuedAfterSave || remoteDirty) {
        queuedAfterSave = false;
        scheduleRemoteSave();
      }
    }
  };

  const scheduleRemoteSave = (immediate = false) => {
    remoteDirty = true;
    if (remoteTimer !== null) {
      clearTimeout(remoteTimer);
      remoteTimer = null;
    }
    if (immediate) {
      void requestSave();
      return;
    }
    remoteTimer = setTimeout(() => {
      remoteTimer = null;
      void requestSave();
    }, retryDelayMs);
  };

  const originalSave = saveManager.save.bind(saveManager);
  saveManager.save = function cloudAwareSave(options = null) {
    const result = originalSave(options);
    scheduleRemoteSave(options === true || options?.immediate === true);
    return result;
  };

  const originalFlush = saveManager.flushSave?.bind(saveManager);
  saveManager.flushSave = function cloudAwareFlush() {
    if (originalFlush) originalFlush();
    scheduleRemoteSave(true);
  };

  // ============================================================
  // 云端读取 API：GET /api/save?deviceId=<设备ID>
  // 请求头：X-Device-Id
  // 返回：
  //   data             完整玩家存档 JSON
  //   revision         云端存档版本号
  //   clientUpdatedAt  云端存档最后更新时间
  //
  // 启动时先读取云端，再创建 Game 实例，避免旧本地存档覆盖最新云端数据。
  // ============================================================
  const loadRemote = async () => {
    try {
      const localSaveExists = hasLocalSave();
      const response = await fetchJson(`/api/save?deviceId=${encodeURIComponent(deviceId)}`, {
        method: 'GET',
        headers: { 'X-Device-Id': deviceId }
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(result.error || result.code || `HTTP ${response.status}`);

      remoteAvailable = Boolean(result.data);
      remoteRevision = Number(result.revision || 0);
      retryDelayMs = REMOTE_SAVE_DEBOUNCE_MS;
      const localData = clone(saveManager.data);
      const remoteData = result.data ? saveManager.mergeDefaults(result.data) : null;
      const localUpdatedAt = Number(localData.lastPlayed || 0);
      const remoteUpdatedAt = Number(result.clientUpdatedAt || remoteData?.lastPlayed || 0);

      if (remoteData && (!localSaveExists || remoteUpdatedAt >= localUpdatedAt)) {
        if (localSaveExists && remoteUpdatedAt > localUpdatedAt) backupLocalSnapshot('remote-sync', localData);
        saveManager.data = remoteData;
        saveLocal(true);
      } else if (remoteData && localUpdatedAt > remoteUpdatedAt) {
        scheduleRemoteSave(true);
      } else if (!remoteData) {
        scheduleRemoteSave(true);
      }

      initialized = true;
      setRuntimeState({ mode: MODE_D1, deviceId, status: 'online', remoteRevision });
      return { data: saveManager.data, remoteRevision };
    } catch (error) {
      initialized = true;
      retryDelayMs = Math.min(MAX_RETRY_DELAY_MS, REMOTE_SAVE_DEBOUNCE_MS * 2);
      setRuntimeState({ mode: MODE_D1, deviceId, status: 'offline', remoteRevision });
      console.warn('[Storage] D1 unavailable, continuing with local cache:', error);
      return { data: saveManager.data, remoteRevision, remoteAvailable: false, error };
    }
  };

  const initResult = await loadRemote();

  // 页面即将离开时再次尝试保存云端存档；keepalive 用于尽量让请求在页面卸载时继续完成。
  const flushOnExit = () => {
    if (!remoteDirty) return;
    void requestSave({ keepalive: true });
  };

  window.addEventListener('pagehide', flushOnExit, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushOnExit();
  });

  // 网络恢复后立即重试未完成的云端存档请求。
  window.addEventListener('online', () => {
    if (remoteDirty) {
      retryDelayMs = REMOTE_SAVE_DEBOUNCE_MS;
      scheduleRemoteSave(true);
    }
  }, { passive: true });

  // 预留初始化结束后的保险调度；正常情况下 loadRemote 已经处理首次同步。
  if (!initialized) scheduleRemoteSave();

  return {
    mode,
    deviceId,
    remoteRevision,
    remoteAvailable,
    get status() { return window.kaipaoStorage?.status || 'unknown'; },
    flush: () => requestSave(),
    ...initResult
  };
}

export const STORAGE_MODES = Object.freeze({ LOCAL: MODE_LOCAL, D1: MODE_D1 });
