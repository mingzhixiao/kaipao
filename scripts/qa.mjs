import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import assert from 'node:assert/strict';
import { buildRetreatLoot, buildStageClearReward, getFortressStarRating } from '../src/systems/BattleRewardSystem.js';
import { LevelDesignSystem } from '../src/systems/LevelDesignSystem.js';
import { GAME_CONFIG } from '../src/core/Config.js';
import { calculateDamageAfterResistance, getEnemyPhysicalResistance } from '../src/systems/PhysicalResistanceSystem.js';
import { SpatialHash } from '../src/systems/SpatialHash.js';

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
const resistanceStages = [1, 25, 50].map(id => GAME_CONFIG.stages.find(stage => stage.id === id)?.physicalResistance || 0);
assert.ok(resistanceStages[0] < resistanceStages[1] && resistanceStages[1] < resistanceStages[2], '怪物基础物抗必须随关卡递增');
assert.ok(resistanceStages[2] <= 0.45, '普通关卡基础物抗不得超过 45%');
assert.equal(calculateDamageAfterResistance(100, 'normal', 0.3, 0.12).damage, 82, '12% 破甲应把 30% 物抗降至 18%');
assert.equal(calculateDamageAfterResistance(100, 'fire', 0.6, 0).damage, 100, '元素伤害不应受到物抗影响');
assert.ok(getEnemyPhysicalResistance(0.3, 'behemoth') > getEnemyPhysicalResistance(0.3, 'runner'), '重装怪物的物抗应高于疾行怪物');
const weaponBalance = Object.fromEntries(Object.entries(GAME_CONFIG.weapons).map(([id, weapon]) => [id, [weapon.baseStats.fireInterval, weapon.baseStats.bulletSpeed]]));
assert.deepEqual(weaponBalance, { assault: [0.70, 560], gatling: [0.34, 620], gauss: [1.20, 820], plasma: [0.84, 520] }, '枪械基础射击间隔与弹速必须保持在平衡目标');
assert.equal(GAME_CONFIG.hero.minAttackInterval, 0.28, '任何强化后的射击间隔不得低于 0.28 秒');
const slowestBulletSpeed = Math.min(...Object.values(GAME_CONFIG.weapons).map(weapon => weapon.baseStats.bulletSpeed));
const fastestEnemySpeed = Math.max(...Object.values(GAME_CONFIG.enemies).map(enemy => enemy.speedMax || enemy.speed));
assert.ok(slowestBulletSpeed / fastestEnemySpeed >= 4.5, '最慢子弹速度至少应达到最快怪物速度的 4.5 倍');
const beginnerAssists = [1, 2, 3].map(id => GAME_CONFIG.stages.find(stage => stage.id === id)?.normalAssist);
assert.ok(beginnerAssists.every(Boolean), '普通模式前 3 关必须配置新手保护参数');
assert.ok(beginnerAssists[0].hpMult < beginnerAssists[1].hpMult && beginnerAssists[1].hpMult < beginnerAssists[2].hpMult, '前 3 关怪物生命压力必须逐关平滑增加');
assert.ok(beginnerAssists.every(assist => assist.countMult <= 0.8 && assist.atkMult <= 0.5 && assist.bossHpMult <= 0.22), '前 3 关普通模式必须保持低数量、低攻击和低首领生命');
assert.equal(GAME_CONFIG.stages.find(stage => stage.id === 4)?.normalAssist, null, '第 4 关起必须恢复标准难度曲线');

// SpatialHash regression：同一 cell、邻近 cell 可查到；远距离和 inactive 对象不可查到。
const hash = new SpatialHash(100);
const spatialItems = [
  { active: true, x: 50, y: 50, id: 'center' },
  { active: true, x: 149, y: 50, id: 'edge' },
  { active: true, x: 251, y: 50, id: 'near' },
  { active: true, x: 1200, y: 1200, id: 'far' },
  { active: false, x: 55, y: 55, id: 'inactive' }
];
hash.rebuild(spatialItems, 1);
const found = [];
hash.forEachInRadius(50, 50, 110, item => found.push(item.id));
assert.ok(found.includes('center'), 'SpatialHash 应命中同格对象');
assert.ok(found.includes('edge'), 'SpatialHash 应命中邻近 cell 对象');
assert.ok(!found.includes('far'), 'SpatialHash 不应命中远距离对象');
assert.ok(!found.includes('inactive'), 'SpatialHash 不应返回 inactive 对象');

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

console.log(`QA PASS: ${files.length} JavaScript modules parsed; gameplay rules and SpatialHash collision pruning are valid.`);
