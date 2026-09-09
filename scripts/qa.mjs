import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import assert from 'node:assert/strict';
import { buildRetreatLoot, buildStageClearReward, getFortressStarRating } from '../src/systems/BattleRewardSystem.js';
import { LevelDesignSystem } from '../src/systems/LevelDesignSystem.js';

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

assert.deepEqual([1000, 899, 749, 549, 299].map(hp => getFortressStarRating(hp, 1000)), [5, 4, 3, 2, 1]);
const rewardSamples = [1, 2, 3, 4, 5].map(stars => buildStageClearReward({ stars, stageConfig: { scrapReward: 100, featuredChip: 'chip_rocket', chipDropCount: [2, 4] }, wave: 5 }, () => 0));
assert.equal(new Set(rewardSamples.map(reward => JSON.stringify(reward))).size, 5, '每个星级必须生成不同的通关奖励');
assert.deepEqual(buildRetreatLoot({ scrap: 27.4, gems: 8, items: { power_shard: 3 } }), { scrap: 27, gems: 0, items: {} });
const levelDesign = new LevelDesignSystem({});
const originalRandom = Math.random;
try {
  const samples = [0, 0.2, 0.45, 0.7, 0.999];
  let index = 0;
  Math.random = () => samples[index++ % samples.length];
  const positions = samples.map(() => levelDesign.chooseLane({}, 0));
  assert.ok(positions.every(position => position >= 0.12 && position <= 0.88), '怪物必须出生在道路安全边界内');
  assert.equal(new Set(positions).size, samples.length, '怪物出生位置应覆盖道路横向空间');
} finally {
  Math.random = originalRandom;
}

console.log(`QA PASS: ${files.length} JavaScript modules parsed; gameplay JSON configs and battle outcome rules are valid.`);
