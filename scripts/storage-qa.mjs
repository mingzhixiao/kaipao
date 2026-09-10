import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const files = [
  'src/systems/CloudStorageBridge.js',
  'functions/api/save.js'
];

for (const relativePath of files) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing storage file: ${relativePath}`);
  }
  execFileSync(process.execPath, ['--check', filePath], { stdio: 'inherit' });
}

const migration1 = fs.readFileSync(path.join(root, 'db/migrations/0001_player_saves.sql'), 'utf8');
for (const required of [
  'CREATE TABLE IF NOT EXISTS player_saves',
  'player_id TEXT PRIMARY KEY',
  'revision INTEGER',
  'client_updated_at INTEGER',
  'data TEXT NOT NULL'
]) {
  if (!migration1.includes(required)) {
    throw new Error(`D1 migration 0001 missing required definition: ${required}`);
  }
}

const migration2Path = path.join(root, 'db/migrations/0002_player_save_profile.sql');
if (!fs.existsSync(migration2Path)) {
  throw new Error('Missing D1 migration 0002_player_save_profile.sql');
}
const migration2 = fs.readFileSync(migration2Path, 'utf8');
for (const required of [
  'ALTER TABLE player_saves ADD COLUMN save_version',
  'ALTER TABLE player_saves ADD COLUMN high_wave',
  'ALTER TABLE player_saves ADD COLUMN scrap',
  'ALTER TABLE player_saves ADD COLUMN gems',
  'ALTER TABLE player_saves ADD COLUMN energy',
  'ALTER TABLE player_saves ADD COLUMN commander_level',
  'ALTER TABLE player_saves ADD COLUMN highest_stage_cleared',
  'ALTER TABLE player_saves ADD COLUMN unlocked_stage',
  'ALTER TABLE player_saves ADD COLUMN inventory',
  'ALTER TABLE player_saves ADD COLUMN skill_data',
  'ALTER TABLE player_saves ADD COLUMN weapon_data',
  'ALTER TABLE player_saves ADD COLUMN pet_data',
  'ALTER TABLE player_saves ADD COLUMN rune_levels',
  'ALTER TABLE player_saves ADD COLUMN fortification'
]) {
  if (!migration2.includes(required)) {
    throw new Error(`D1 migration 0002 missing required definition: ${required}`);
  }
}

const bridge = fs.readFileSync(path.join(root, 'src/systems/CloudStorageBridge.js'), 'utf8');
for (const required of ["get('storage')", 'MODE_LOCAL', 'MODE_D1', '/api/save']) {
  if (!bridge.includes(required)) {
    throw new Error(`Cloud storage bridge missing required marker: ${required}`);
  }
}

const api = fs.readFileSync(path.join(root, 'functions/api/save.js'), 'utf8');
for (const required of [
  'X-Player-Id',
  'highest_stage_cleared',
  'unlocked_stage',
  'scrap',
  'gems',
  'inventory',
  'weapon_data',
  'skill_data',
  'pet_data',
  'rune_levels',
  'fortification'
]) {
  if (!api.includes(required)) {
    throw new Error(`D1 save API missing required projection field: ${required}`);
  }
}

console.log('[Storage QA] Local/D1 mode, full player projection, API syntax and migrations passed.');
