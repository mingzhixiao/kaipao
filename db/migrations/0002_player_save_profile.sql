-- Kaipao / Starcore Vanguard structured player-save projection.
-- Apply after 0001_player_saves.sql.
-- The original data JSON remains the canonical snapshot; these columns make
-- progression, currencies and inventory queryable without parsing the blob.

ALTER TABLE player_saves ADD COLUMN save_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE player_saves ADD COLUMN high_wave INTEGER NOT NULL DEFAULT 1;
ALTER TABLE player_saves ADD COLUMN max_kills INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_saves ADD COLUMN total_kills INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_saves ADD COLUMN total_runs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_saves ADD COLUMN max_survival_time INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_saves ADD COLUMN last_played INTEGER NOT NULL DEFAULT 0;

ALTER TABLE player_saves ADD COLUMN scrap INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_saves ADD COLUMN gems INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_saves ADD COLUMN energy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_saves ADD COLUMN max_energy INTEGER NOT NULL DEFAULT 50;
ALTER TABLE player_saves ADD COLUMN last_energy_refresh INTEGER NOT NULL DEFAULT 0;

ALTER TABLE player_saves ADD COLUMN commander_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE player_saves ADD COLUMN commander_exp INTEGER NOT NULL DEFAULT 0;

ALTER TABLE player_saves ADD COLUMN highest_stage_cleared INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_saves ADD COLUMN unlocked_stage INTEGER NOT NULL DEFAULT 1;
ALTER TABLE player_saves ADD COLUMN equipped_stage INTEGER NOT NULL DEFAULT 1;
ALTER TABLE player_saves ADD COLUMN current_mode TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE player_saves ADD COLUMN total_stages_cleared INTEGER NOT NULL DEFAULT 0;

ALTER TABLE player_saves ADD COLUMN equipped_weapon TEXT NOT NULL DEFAULT 'assault';
ALTER TABLE player_saves ADD COLUMN selected_pet TEXT;

ALTER TABLE player_saves ADD COLUMN unlocked_synergies TEXT NOT NULL DEFAULT '[]';
ALTER TABLE player_saves ADD COLUMN cleared_elite_stages TEXT NOT NULL DEFAULT '[]';
ALTER TABLE player_saves ADD COLUMN rune_levels TEXT NOT NULL DEFAULT '{}';
ALTER TABLE player_saves ADD COLUMN fortification TEXT NOT NULL DEFAULT '{}';
ALTER TABLE player_saves ADD COLUMN pet_data TEXT NOT NULL DEFAULT '{}';
ALTER TABLE player_saves ADD COLUMN weapon_data TEXT NOT NULL DEFAULT '{}';
ALTER TABLE player_saves ADD COLUMN skill_data TEXT NOT NULL DEFAULT '{}';
ALTER TABLE player_saves ADD COLUMN inventory TEXT NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_player_saves_stage
    ON player_saves(highest_stage_cleared);

CREATE INDEX IF NOT EXISTS idx_player_saves_wave
    ON player_saves(high_wave);

CREATE INDEX IF NOT EXISTS idx_player_saves_scrap
    ON player_saves(scrap);

CREATE INDEX IF NOT EXISTS idx_player_saves_gems
    ON player_saves(gems);
