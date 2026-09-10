// ============================================================
// 玩家存档 API：Cloudflare Pages Functions + D1
//
// 接口：
//   GET  /api/save?playerId=<玩家ID>
//   PUT  /api/save
//   OPTIONS /api/save
//
// 玩家 ID 支持：
//   1. 请求头 X-Player-Id
//   2. 请求头 X-Device-Id
//   3. URL 参数 playerId
//   4. URL 参数 deviceId
//
// D1 绑定：env.KAIPAO_DB
// ============================================================

const MAX_SAVE_BYTES = 256 * 1024;
const PLAYER_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

// 统一返回 JSON，禁止浏览器/CDN 缓存玩家存档数据。
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

// 从请求头或 URL 参数中读取玩家 ID，兼容旧版 deviceId 参数。
function getPlayerId(request, url) {
  const headerId = request.headers.get('X-Player-Id')?.trim()
    || request.headers.get('X-Device-Id')?.trim();
  const params = new URL(url).searchParams;
  const queryId = params.get('playerId')?.trim() || params.get('deviceId')?.trim();
  const id = headerId || queryId || '';
  return PLAYER_ID_RE.test(id) ? id : null;
}

// 获取 Cloudflare Pages 绑定的 D1 数据库实例。
// Cloudflare 控制台中的 Binding Name 必须为 KAIPAO_DB。
function getDatabase(env) {
  return env?.KAIPAO_DB || null;
}

// 将输入安全地转换为非负整数，避免非法值直接进入存档数据库。
function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

// 将对象/数组序列化成 JSON 文本，供 D1 的 TEXT 字段保存。
function toTextJson(value, fallback) {
  try {
    const jsonText = JSON.stringify(value ?? fallback);
    return typeof jsonText === 'string' ? jsonText : JSON.stringify(fallback);
  } catch (_) {
    return JSON.stringify(fallback);
  }
}

// 将完整 SaveManager 数据投影成 D1 常用字段。
// 这样既保留完整 data，又可以直接 SQL 查询关卡、货币、装备等核心数据。
function extractProjection(data) {
  const petData = data?.petData && typeof data.petData === 'object' ? data.petData : {};
  const weaponData = data?.weaponData && typeof data.weaponData === 'object' ? data.weaponData : {};
  const skillData = data?.skillData && typeof data.skillData === 'object' ? data.skillData : {};

  return {
    saveVersion: toInt(data?.saveVersion, 1),
    highWave: toInt(data?.highWave, 1),
    maxKills: toInt(data?.maxKills),
    totalKills: toInt(data?.totalKills),
    totalRuns: toInt(data?.totalRuns),
    maxSurvivalTime: toInt(data?.maxSurvivalTime),
    lastPlayed: toInt(data?.lastPlayed),
    scrap: toInt(data?.scrap),
    gems: toInt(data?.gems),
    energy: toInt(data?.energy),
    maxEnergy: toInt(data?.maxEnergy, 50),
    lastEnergyRefresh: toInt(data?.lastEnergyRefresh),
    commanderLevel: toInt(data?.commanderLevel, 1),
    commanderExp: toInt(data?.commanderExp),
    highestStageCleared: toInt(data?.highestStageCleared),
    unlockedStage: toInt(data?.unlockedStage, 1),
    equippedStage: toInt(data?.equippedStage, 1),
    currentMode: data?.currentMode === 'elite' ? 'elite' : 'normal',
    totalStagesCleared: toInt(data?.totalStagesCleared),
    equippedWeapon: typeof weaponData.equipped === 'string' ? weaponData.equipped : 'assault',
    selectedPet: typeof petData.selected === 'string' ? petData.selected : null,
    unlockedSynergies: toTextJson(Array.isArray(data?.unlockedSynergies) ? data.unlockedSynergies : [], []),
    clearedEliteStages: toTextJson(Array.isArray(data?.clearedEliteStages) ? data.clearedEliteStages : [], []),
    runeLevels: toTextJson(data?.runeLevels && typeof data.runeLevels === 'object' ? data.runeLevels : {}, {}),
    fortification: toTextJson(data?.fortification && typeof data.fortification === 'object' ? data.fortification : {}, {}),
    petData: toTextJson(petData, {}),
    weaponData: toTextJson(weaponData, {}),
    skillData: toTextJson(skillData, {}),
    inventory: toTextJson(data?.inventory && typeof data.inventory === 'object' ? data.inventory : {}, {})
  };
}

// 解析 D1 中保存的 JSON 字符串；损坏时返回指定默认值。
function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

// 将数据库记录组装成 API 返回对象。
// profile 是结构化数据，data 是完整存档，二者同时返回方便后续扩展。
function rowToResponse(row) {
  return {
    ok: true,
    data: parseJson(row.data, null),
    revision: Number(row.revision || 0),
    clientUpdatedAt: Number(row.client_updated_at || 0),
    profile: {
      saveVersion: Number(row.save_version || 1),
      progression: {
        highWave: Number(row.high_wave || 1),
        maxKills: Number(row.max_kills || 0),
        totalKills: Number(row.total_kills || 0),
        totalRuns: Number(row.total_runs || 0),
        maxSurvivalTime: Number(row.max_survival_time || 0),
        commanderLevel: Number(row.commander_level || 1),
        commanderExp: Number(row.commander_exp || 0),
        highestStageCleared: Number(row.highest_stage_cleared || 0),
        unlockedStage: Number(row.unlocked_stage || 1),
        equippedStage: Number(row.equipped_stage || 1),
        currentMode: row.current_mode === 'elite' ? 'elite' : 'normal',
        totalStagesCleared: Number(row.total_stages_cleared || 0)
      },
      wallet: {
        scrap: Number(row.scrap || 0),
        gems: Number(row.gems || 0),
        energy: Number(row.energy || 0),
        maxEnergy: Number(row.max_energy || 50),
        lastEnergyRefresh: Number(row.last_energy_refresh || 0)
      },
      loadout: {
        equippedWeapon: row.equipped_weapon || 'assault',
        selectedPet: row.selected_pet || null
      },
      inventory: parseJson(row.inventory, {}),
      runeLevels: parseJson(row.rune_levels, {}),
      fortification: parseJson(row.fortification, {}),
      petData: parseJson(row.pet_data, {}),
      weaponData: parseJson(row.weapon_data, {}),
      skillData: parseJson(row.skill_data, {}),
      unlockedSynergies: parseJson(row.unlocked_synergies, []),
      clearedEliteStages: parseJson(row.cleared_elite_stages, [])
    }
  };
}

// ============================================================
// OPTIONS /api/save
// 用于预检请求；当前同源部署通常不需要跨域，但保留此接口方便后续扩展。
// ============================================================
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS' }
  });
}

// ============================================================
// GET /api/save?playerId=<玩家ID>
//
// 用途：读取玩家完整云端存档。
// 请求头：
//   X-Player-Id / X-Device-Id（二选一）
// URL 参数：
//   playerId / deviceId（二选一）
//
// 返回：
//   data             完整玩家存档 JSON
//   revision         当前云端版本号，用于乐观锁
//   clientUpdatedAt  客户端最后一次存档时间
//   profile          结构化玩家进度/货币/装备/背包数据
// ============================================================
export async function onRequestGet({ request, env }) {
  const db = getDatabase(env);
  if (!db) return json({ ok: false, code: 'D1_NOT_CONFIGURED' }, 503);

  const playerId = getPlayerId(request, request.url);
  if (!playerId) return json({ ok: false, code: 'INVALID_PLAYER_ID' }, 400);

  try {
    // 根据玩家 ID 查询单条完整存档和结构化字段。
    const row = await db.prepare(`
      SELECT
        player_id, revision, save_version, client_updated_at, data,
        high_wave, max_kills, total_kills, total_runs, max_survival_time, last_played,
        scrap, gems, energy, max_energy, last_energy_refresh,
        commander_level, commander_exp,
        highest_stage_cleared, unlocked_stage, equipped_stage, current_mode, total_stages_cleared,
        equipped_weapon, selected_pet,
        unlocked_synergies, cleared_elite_stages, rune_levels, fortification,
        pet_data, weapon_data, skill_data, inventory
      FROM player_saves
      WHERE player_id = ?
      LIMIT 1
    `).bind(playerId).first();

    if (!row) {
      // 玩家首次使用云存档时，返回空存档而不是 404，前端会随后创建新存档。
      return json({ ok: true, data: null, revision: 0, clientUpdatedAt: 0, profile: null });
    }

    const response = rowToResponse(row);
    if (!response.data) return json({ ok: false, code: 'CORRUPTED_SAVE' }, 500);
    return json(response);
  } catch (error) {
    console.error('[D1] GET save failed', error);
    return json({ ok: false, code: 'D1_READ_FAILED' }, 500);
  }
}

// ============================================================
// PUT /api/save
//
// 用途：保存玩家完整云端存档。
// 请求头：
//   X-Player-Id / X-Device-Id（二选一）
// 请求体：
//   {
//     deviceId: string,
//     baseRevision: number,
//     clientUpdatedAt: number,
//     data: object
//   }
//
// baseRevision 是客户端读取到的旧版本号，用于乐观并发控制。
// 如果云端已经被其他设备更新，接口返回 409 REVISION_CONFLICT。
// ============================================================
export async function onRequestPut({ request, env }) {
  const db = getDatabase(env);
  if (!db) return json({ ok: false, code: 'D1_NOT_CONFIGURED' }, 503);

  const playerId = getPlayerId(request, request.url);
  if (!playerId) return json({ ok: false, code: 'INVALID_PLAYER_ID' }, 400);

  let rawBody;
  try {
    // 先检查 Content-Length，再读取正文，减少异常大请求占用资源的风险。
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_SAVE_BYTES) return json({ ok: false, code: 'PAYLOAD_TOO_LARGE' }, 413);
    rawBody = await request.text();
  } catch (_) {
    return json({ ok: false, code: 'INVALID_BODY' }, 400);
  }

  // Content-Length 可能缺失，因此读取正文后再检查实际 UTF-8 字节数。
  if (new TextEncoder().encode(rawBody).byteLength > MAX_SAVE_BYTES) {
    return json({ ok: false, code: 'PAYLOAD_TOO_LARGE' }, 413);
  }

  let body;
  try { body = JSON.parse(rawBody); } catch (_) {
    return json({ ok: false, code: 'INVALID_JSON' }, 400);
  }

  const data = body?.data;
  const baseRevision = Number.isInteger(body?.baseRevision) && body.baseRevision >= 0
    ? body.baseRevision
    : 0;
  const clientUpdatedAt = Number.isFinite(body?.clientUpdatedAt)
    ? Math.max(0, Math.floor(body.clientUpdatedAt))
    : Date.now();

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json({ ok: false, code: 'INVALID_SAVE_DATA' }, 400);
  }

  const dataString = JSON.stringify(data);
  if (new TextEncoder().encode(dataString).byteLength > MAX_SAVE_BYTES) {
    return json({ ok: false, code: 'SAVE_DATA_TOO_LARGE' }, 413);
  }

  // 将完整存档提取成数据库中的核心字段，便于后续排行榜、后台查询和统计。
  const projection = extractProjection(data);

  try {
    // 读取当前版本，为下面的乐观锁校验做准备。
    const existing = await db.prepare(`
      SELECT revision, client_updated_at, data
      FROM player_saves
      WHERE player_id = ?
      LIMIT 1
    `).bind(playerId).first();

    const now = Date.now();

    if (!existing) {
      // 新玩家必须从 revision=0 开始创建，避免异常客户端覆盖不存在的存档。
      if (baseRevision !== 0) {
        return json({ ok: false, code: 'REVISION_CONFLICT', revision: 0, data: null }, 409);
      }

      // 首次写入：同时保存完整 JSON 和结构化玩家字段。
      await db.prepare(`
        INSERT INTO player_saves (
          player_id, revision, save_version, client_updated_at, data,
          high_wave, max_kills, total_kills, total_runs, max_survival_time, last_played,
          scrap, gems, energy, max_energy, last_energy_refresh,
          commander_level, commander_exp,
          highest_stage_cleared, unlocked_stage, equipped_stage, current_mode, total_stages_cleared,
          equipped_weapon, selected_pet,
          unlocked_synergies, cleared_elite_stages, rune_levels, fortification,
          pet_data, weapon_data, skill_data, inventory,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
      `).bind(
        playerId, 1, projection.saveVersion, clientUpdatedAt, dataString,
        projection.highWave, projection.maxKills, projection.totalKills, projection.totalRuns,
        projection.maxSurvivalTime, projection.lastPlayed,
        projection.scrap, projection.gems, projection.energy, projection.maxEnergy, projection.lastEnergyRefresh,
        projection.commanderLevel, projection.commanderExp,
        projection.highestStageCleared, projection.unlockedStage, projection.equippedStage,
        projection.currentMode, projection.totalStagesCleared,
        projection.equippedWeapon, projection.selectedPet,
        projection.unlockedSynergies, projection.clearedEliteStages, projection.runeLevels,
        projection.fortification, projection.petData, projection.weaponData, projection.skillData,
        projection.inventory,
        now, now
      ).run();

      return json({ ok: true, revision: 1, clientUpdatedAt, profile: projection });
    }

    const currentRevision = Number(existing.revision || 0);

    // 客户端版本不是服务器当前版本，说明其他设备已经修改过存档。
    // 返回 409 让前端执行冲突处理，而不是静默覆盖云端数据。
    if (baseRevision !== currentRevision) {
      return json({
        ok: false,
        code: 'REVISION_CONFLICT',
        revision: currentRevision,
        clientUpdatedAt: Number(existing.client_updated_at || 0),
        data: parseJson(existing.data, null)
      }, 409);
    }

    const nextRevision = currentRevision + 1;

    // 更新时再次带上 revision 条件，防止两个请求同时修改同一玩家存档。
    const updateResult = await db.prepare(`
      UPDATE player_saves
      SET revision = ?,
          save_version = ?,
          client_updated_at = ?,
          data = ?,
          high_wave = ?,
          max_kills = ?,
          total_kills = ?,
          total_runs = ?,
          max_survival_time = ?,
          last_played = ?,
          scrap = ?,
          gems = ?,
          energy = ?,
          max_energy = ?,
          last_energy_refresh = ?,
          commander_level = ?,
          commander_exp = ?,
          highest_stage_cleared = ?,
          unlocked_stage = ?,
          equipped_stage = ?,
          current_mode = ?,
          total_stages_cleared = ?,
          equipped_weapon = ?,
          selected_pet = ?,
          unlocked_synergies = ?,
          cleared_elite_stages = ?,
          rune_levels = ?,
          fortification = ?,
          pet_data = ?,
          weapon_data = ?,
          skill_data = ?,
          inventory = ?,
          updated_at = ?
      WHERE player_id = ?
        AND revision = ?
    `).bind(
      nextRevision,
      projection.saveVersion,
      clientUpdatedAt,
      dataString,
      projection.highWave,
      projection.maxKills,
      projection.totalKills,
      projection.totalRuns,
      projection.maxSurvivalTime,
      projection.lastPlayed,
      projection.scrap,
      projection.gems,
      projection.energy,
      projection.maxEnergy,
      projection.lastEnergyRefresh,
      projection.commanderLevel,
      projection.commanderExp,
      projection.highestStageCleared,
      projection.unlockedStage,
      projection.equippedStage,
      projection.currentMode,
      projection.totalStagesCleared,
      projection.equippedWeapon,
      projection.selectedPet,
      projection.unlockedSynergies,
      projection.clearedEliteStages,
      projection.runeLevels,
      projection.fortification,
      projection.petData,
      projection.weaponData,
      projection.skillData,
      projection.inventory,
      now,
      playerId,
      currentRevision
    ).run();

    // 理论上 revision 条件保证只有一个请求能更新成功。
    // 如果 changes=0，重新读取服务器数据并返回 409。
    if (!updateResult.meta?.changes) {
      const latest = await db.prepare(`
        SELECT revision, client_updated_at, data
        FROM player_saves
        WHERE player_id = ?
        LIMIT 1
      `).bind(playerId).first();
      return json({
        ok: false,
        code: 'REVISION_CONFLICT',
        revision: Number(latest?.revision || currentRevision),
        clientUpdatedAt: Number(latest?.client_updated_at || 0),
        data: parseJson(latest?.data, null)
      }, 409);
    }

    return json({ ok: true, revision: nextRevision, clientUpdatedAt, profile: projection });
  } catch (error) {
    console.error('[D1] PUT save failed', error);
    return json({ ok: false, code: 'D1_WRITE_FAILED' }, 500);
  }
}
