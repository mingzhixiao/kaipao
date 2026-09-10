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

const migration = fs.readFileSync(path.join(root, 'db/migrations/0001_player_saves.sql'), 'utf8');
for (const required of ['CREATE TABLE IF NOT EXISTS player_saves', 'player_id TEXT PRIMARY KEY', 'revision INTEGER', 'client_updated_at INTEGER', 'data TEXT NOT NULL']) {
  if (!migration.includes(required)) {
    throw new Error(`D1 migration missing required definition: ${required}`);
  }
}

const bridge = fs.readFileSync(path.join(root, 'src/systems/CloudStorageBridge.js'), 'utf8');
for (const required of ["'?storage=local'", "'?storage=d1'", "'/api/save'"]) {
  const normalized = required.replaceAll("'", '');
  if (!bridge.includes(normalized)) {
    throw new Error(`Cloud storage bridge missing required marker: ${normalized}`);
  }
}

console.log('[Storage QA] Cloudflare D1 bridge, API syntax and migration checks passed.');
