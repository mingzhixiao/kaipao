-- Kaipao / Starcore Vanguard player save storage.
-- Apply this migration to the Cloudflare D1 database before using ?storage=d1.

CREATE TABLE IF NOT EXISTS player_saves (
    player_id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL DEFAULT 0,
    client_updated_at INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK (length(data) <= 262144)
);

CREATE INDEX IF NOT EXISTS idx_player_saves_updated_at
    ON player_saves(updated_at);
