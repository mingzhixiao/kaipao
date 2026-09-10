const MAX_SAVE_BYTES = 256 * 1024;
const PLAYER_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function getPlayerId(request, url) {
  const headerId = request.headers.get('X-Player-Id')?.trim()
    || request.headers.get('X-Device-Id')?.trim();
  const params = new URL(url).searchParams;
  const queryId = params.get('playerId')?.trim() || params.get('deviceId')?.trim();
  const id = headerId || queryId || '';
  return PLAYER_ID_RE.test(id) ? id : null;
}

function getDatabase(env) {
  // Cloudflare Pages -> Settings -> Functions -> D1 database binding.
  // Binding name intentionally matches this project's documented setup.
  return env?.KAIPAO_DB || null;
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function toTextJson(value, fallback) {
  try {
    const jsonText = JSON.stringify(value ?? fallback);
    return typeof jsonText === 'string' ? jsonText : JSON.stringify(fallback);
  } catch (_) {
    return JSON.stringify(fallback);
  }
}

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

function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

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

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS' }
  });
}

export async function onRequestGet({ request, env }) {
  const db = getDatabase(env);
  if (!db) return json({ ok: false, code: 'D1_NOT_CONFIGURED' }, 503);

  const playerId = getPlayerId(request, request.url);
  if (!playerId) return json({ ok: false, code: 'INVALID_PLAYER_ID' }, 400);

  try {
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

export async function onRequestPut({ request, env }) {
  const db = getDatabase(env);
  if (!db) return json({ ok: false, code: 'D1_NOT_CONFIGURED' }, 503);

  const playerId = getPlayerId(request, request.url);
  if (!playerId) return json({ ok: false, code: 'INVALID_PLAYER_ID' }, 400);

  let rawBody;
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_SAVE_BYTES) return json({ ok: false, code: 'PAYLOAD_TOO_LARGE' }, 413);
    rawBody = await request.text();
  } catch (_) {
    return json({ ok: false, code: 'INVALID_BODY' }, 400);
  }

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

  const projection = extractProjection(data);

  try {
    const existing = await db.prepare(`
      SELECT revision, client_updated_at, data
      FROM player_saves
      WHERE player_id = ?
      LIMIT 1
    `).bind(playerId).first();

    const now = Date.now();

    if (!existing) {
      if (baseRevision !== 0) {
        return json({ ok: false, code: 'REVISION_CONFLICT', revision: 0, data: null }, 409);
      }

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
