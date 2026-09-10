const MAX_SAVE_BYTES = 256 * 1024;
const DEVICE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function getDeviceId(request, url) {
  const headerId = request.headers.get('X-Device-Id')?.trim();
  const queryId = new URL(url).searchParams.get('deviceId')?.trim();
  const id = headerId || queryId || '';
  return DEVICE_ID_RE.test(id) ? id : null;
}

function getDatabase(env) {
  // 在 Cloudflare Pages 项目中，将 D1 binding 命名为 KAIPAO_DB。
  return env?.KAIPAO_DB || null;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}

export async function onRequestGet({ request, env }) {
  const db = getDatabase(env);
  if (!db) return json({ ok: false, code: 'D1_NOT_CONFIGURED' }, 503);

  const deviceId = getDeviceId(request, request.url);
  if (!deviceId) return json({ ok: false, code: 'INVALID_DEVICE_ID' }, 400);

  try {
    const row = await db.prepare(`
      SELECT player_id, revision, client_updated_at, data
      FROM player_saves
      WHERE player_id = ?
      LIMIT 1
    `).bind(deviceId).first();

    if (!row) {
      return json({ ok: true, data: null, revision: 0, clientUpdatedAt: 0 });
    }

    let data;
    try {
      data = JSON.parse(row.data);
    } catch (_) {
      return json({ ok: false, code: 'CORRUPTED_SAVE' }, 500);
    }

    return json({
      ok: true,
      data,
      revision: Number(row.revision || 0),
      clientUpdatedAt: Number(row.client_updated_at || 0)
    });
  } catch (error) {
    console.error('[D1] GET save failed', error);
    return json({ ok: false, code: 'D1_READ_FAILED' }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const db = getDatabase(env);
  if (!db) return json({ ok: false, code: 'D1_NOT_CONFIGURED' }, 503);

  const deviceId = getDeviceId(request, request.url);
  if (!deviceId) return json({ ok: false, code: 'INVALID_DEVICE_ID' }, 400);

  let rawBody;
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_SAVE_BYTES) {
      return json({ ok: false, code: 'PAYLOAD_TOO_LARGE' }, 413);
    }
    rawBody = await request.text();
  } catch (_) {
    return json({ ok: false, code: 'INVALID_BODY' }, 400);
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_SAVE_BYTES) {
    return json({ ok: false, code: 'PAYLOAD_TOO_LARGE' }, 413);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (_) {
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

  try {
    const existing = await db.prepare(`
      SELECT revision, client_updated_at, data
      FROM player_saves
      WHERE player_id = ?
      LIMIT 1
    `).bind(deviceId).first();

    const now = Date.now();

    if (!existing) {
      if (baseRevision !== 0) {
        return json({ ok: false, code: 'REVISION_CONFLICT', revision: 0, data: null }, 409);
      }

      await db.prepare(`
        INSERT INTO player_saves
          (player_id, revision, client_updated_at, data, created_at, updated_at)
        VALUES (?, 1, ?, ?, ?, ?)
      `).bind(deviceId, clientUpdatedAt, dataString, now, now).run();

      return json({ ok: true, revision: 1, clientUpdatedAt });
    }

    const currentRevision = Number(existing.revision || 0);
    if (baseRevision !== currentRevision) {
      let remoteData = null;
      try { remoteData = JSON.parse(existing.data); } catch (_) { /* handled by caller */ }
      return json({
        ok: false,
        code: 'REVISION_CONFLICT',
        revision: currentRevision,
        clientUpdatedAt: Number(existing.client_updated_at || 0),
        data: remoteData
      }, 409);
    }

    const nextRevision = currentRevision + 1;
    const updateResult = await db.prepare(`
      UPDATE player_saves
      SET revision = ?,
          client_updated_at = ?,
          data = ?,
          updated_at = ?
      WHERE player_id = ?
        AND revision = ?
    `).bind(
      nextRevision,
      clientUpdatedAt,
      dataString,
      now,
      deviceId,
      currentRevision
    ).run();

    if (!Number(updateResult?.meta?.changes || 0)) {
      const latest = await db.prepare(`
        SELECT revision, client_updated_at, data
        FROM player_saves
        WHERE player_id = ?
        LIMIT 1
      `).bind(deviceId).first();
      let remoteData = null;
      try { remoteData = latest?.data ? JSON.parse(latest.data) : null; } catch (_) { /* ignore */ }
      return json({
        ok: false,
        code: 'REVISION_CONFLICT',
        revision: Number(latest?.revision || currentRevision),
        clientUpdatedAt: Number(latest?.client_updated_at || 0),
        data: remoteData
      }, 409);
    }

    return json({ ok: true, revision: nextRevision, clientUpdatedAt });
  } catch (error) {
    console.error('[D1] PUT save failed', error);
    return json({ ok: false, code: 'D1_WRITE_FAILED' }, 500);
  }
}
