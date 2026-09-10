import { GAME_CONFIG } from '../core/Config.js';
import { Pet, PET_TYPES } from './SkillsPetsFeature.js';

let prototypePatched = false;

const VECTOR_SKILL_ASSETS = {
  tornado: 'assets/skills/tornado.png',
  boomerang: 'assets/skills/boomerang.png',
  laser: 'assets/skills/laser.png',
  bomber: 'assets/skills/bomber.png'
};

function patchPetPrototype() {
  if (prototypePatched) return;
  prototypePatched = true;

  const originalGetStat = Pet.prototype.getStat;
  Pet.prototype.getStat = function(name) {
    const base = this.config?.baseStats?.[name];
    if (typeof base !== 'number') return originalGetStat.call(this, name);
    const growth = Number(GAME_CONFIG.pets?.statGrowthPerLevel ?? 0.1);
    return Math.round(base * (1 + Math.max(0, this.level - 1) * growth));
  };

  Object.defineProperties(Pet.prototype, {
    attackSpeed: {
      configurable: true,
      get() {
        const base = this.config.baseStats.attackSpeed;
        const growth = Number(GAME_CONFIG.pets?.statGrowthPerLevel ?? 0.1);
        return base * (1 + Math.max(0, this.level - 1) * growth);
      }
    },
    moveSpeed: {
      configurable: true,
      get() {
        return this.getStat('moveSpeed');
      }
    },
    range: {
      configurable: true,
      get() {
        return this.getStat('range');
      }
    }
  });

  Pet.prototype.takeDamage = function(amount, game) {
    if (this.isCurled || !this.alive || amount <= 0) return;
    const shieldBefore = this.shield;
    let remaining = amount;

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
      game.spawnParticles(this.x, this.y, '#38bdf8', 7, 'spark');
    }

    if (remaining > 0) {
      this.hp = Math.max(0, this.hp - remaining);
      game.spawnParticles(this.x, this.y, '#f97316', 5, 'spark');
    }

    if (shieldBefore > 0 && this.shield <= 0 && !this.isCurled) {
      this.shield = 0;
      game.spawnDamageText(this.x, this.y - 20, '🛡️ 护盾破裂', '#38bdf8', true, true);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isCurled = true;
      this.curlTimer = this.curlMaxTime;
      this.shield = 0;
      game.spawnDamageText(this.x, this.y - 20, '🐾 宠物恢复中 10s', '#38bdf8', true, true);
    }
  };
}

function syncRuntimeConfig() {
  GAME_CONFIG.pets.statGrowthPerLevel = 0.1;
  if (GAME_CONFIG.pets) GAME_CONFIG.pets.recoveryTime = 10;

  // 技能数值已统一由 GAME_CONFIG.skills 提供，此处不再需要把 SKILL_CONFIG 对齐回主配置。

  for (const id of Object.keys(PET_TYPES)) {
    const cfg = GAME_CONFIG.pets.types?.[id];
    if (!cfg) continue;
    Object.assign(PET_TYPES[id], cfg);
  }

  if (PET_TYPES.fluffy) PET_TYPES.fluffy.asset = 'assets/pets/fluffy.png';
  if (PET_TYPES.dragon) PET_TYPES.dragon.asset = 'assets/pets/dragon.png';

  for (const card of GAME_CONFIG.skillCatalog || []) {
    if (VECTOR_SKILL_ASSETS[card.id]) card.asset = VECTOR_SKILL_ASSETS[card.id];
  }
}

export function installSkillsPetsPolish(game = null) {
  patchPetPrototype();
  syncRuntimeConfig();
}
