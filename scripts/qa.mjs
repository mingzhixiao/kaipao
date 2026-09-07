import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.cwd();
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (extname(entry.name) === '.js') files.push(path);
  }
}

walk(join(root, 'src'));
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

for (const jsonPath of ['config/skills.json', 'config/pets.json']) {
  JSON.parse(readFileSync(join(root, jsonPath), 'utf8'));
}

console.log(`QA PASS: ${files.length} JavaScript modules parsed; gameplay JSON configs are valid.`);
