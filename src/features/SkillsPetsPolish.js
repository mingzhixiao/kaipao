import { GAME_CONFIG } from '../core/Config.js';
import { Pet, SKILL_CONFIG, PET_TYPES } from './SkillsPetsFeature.js';

let prototypePatched = false;

const EMOJI_REPLACEMENTS = [
  [/🌪️/gu, '[WIND]'],
  [/🛡️/gu, '[SHIELD]'],
  [/✨/gu, '[ONLINE]'],
  [/🔊/gu, 'SFX'],
  [/🔇/gu, 'SFX'],
  [/⏸️/gu, 'PAUSE'],
  [/▶️/gu, 'RESUME'],
  [/💀/gu, 'KILLS']
];

const VECTOR_SKILL_ASSETS = {
  tornado: 'assets/skills/tornado.png',
  boomerang: 'assets/skills/boomerang.png',
  laser: 'assets/skills/laser.png',
  bomber: 'assets/skills/bomber.png'
};

function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return EMOJI_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

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
      game.spawnDamageText(this.x, this.y - 20, '[SHIELD] BREAK', '#38bdf8', true, true);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isCurled = true;
      this.curlTimer = this.curlMaxTime;
      this.shield = 0;
      game.spawnDamageText(this.x, this.y - 20, '[PET] RECOVERING 10s', '#38bdf8', true, true);
    }
  };
}

function syncRuntimeConfig() {
  GAME_CONFIG.pets.statGrowthPerLevel = 0.1;
  if (GAME_CONFIG.pets) GAME_CONFIG.pets.recoveryTime = 10;

  Object.assign(SKILL_CONFIG.tornado, {
    cooldown: 8, duration: 4, radius: 200, damagePerSecond: 0.3, pullStrength: 0.03, maxPullSpeed: 50
  });
  Object.assign(SKILL_CONFIG.boomerang, {
    cooldown: 5, speed: 400, maxRange: 600, damage: 1.0, width: 20, critBonus: 0.35
  });
  Object.assign(SKILL_CONFIG.laser, {
    cooldown: 3, width: 10, damage: 1.5, burnDamage: 0.2, burnDuration: 2, displayDuration: 0.2
  });
  Object.assign(SKILL_CONFIG.bomber, {
    cooldown: 12, radius: 250, bombCount: 3, bombInterval: 0.5, damage: 0.8, knockback: 100, maxAimDistance: 300
  });

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

function installTextSanitizer(game) {
  if (game.__skillsPetsTextSanitized) return;
  game.__skillsPetsTextSanitized = true;
  const original = game.spawnDamageText?.bind(game);
  if (original) {
    game.spawnDamageText = function(x, y, text, ...rest) {
      return original(x, y, sanitizeText(text), ...rest);
    };
  }

  const replaceHudText = () => {
    const soundButton = game.hud?.dom?.btnSound;
    const pauseButton = game.hud?.dom?.btnPause;
    if (soundButton && /[\u{1F300}-\u{1FAFF}]/u.test(soundButton.textContent || '')) soundButton.textContent = 'SFX';
    if (pauseButton && /[\u{1F300}-\u{1FAFF}]/u.test(pauseButton.textContent || '')) pauseButton.textContent = game.isPaused ? 'RESUME' : 'PAUSE';
  };
  replaceHudText();
  if (game.hud?.dom?.btnSound || game.hud?.dom?.btnPause) {
    const observer = new MutationObserver(replaceHudText);
    if (game.hud.dom.btnSound) observer.observe(game.hud.dom.btnSound, { childList: true, characterData: true, subtree: true });
    if (game.hud.dom.btnPause) observer.observe(game.hud.dom.btnPause, { childList: true, characterData: true, subtree: true });
    game.__skillsPetsTextObserver = observer;
  }
}

function injectVisualPolish() {
  if (document.getElementById('kp-skills-pets-polish')) return;
  const style = document.createElement('style');
  style.id = 'kp-skills-pets-polish';
  style.textContent = `
    #top-hud { padding: 8px 10px 0 !important; }
    #top-hud .hud-badge { min-height: 34px; display: inline-flex; flex-direction: column; justify-content: center; gap: 1px; border-radius: 9px !important; padding: 4px 10px !important; background: rgba(7, 12, 22, .88) !important; border-color: rgba(0, 240, 255, .28) !important; box-shadow: 0 5px 18px rgba(0,0,0,.22); }
    #top-hud .hud-buttons { gap: 5px !important; }
    #top-hud .icon-btn { min-width: 42px; min-height: 34px; border-radius: 9px !important; font-size: 9px !important; letter-spacing: .5px; font-weight: 800; }
    #bottom-hud { padding: 8px 10px calc(10px + env(safe-area-inset-bottom)) !important; }
    #bottom-hud .fortress-bars { margin-bottom: 6px !important; }
    #bottom-hud .bar-wrap { gap: 6px !important; font-size: 10px !important; }
    #bottom-hud .bar-outer { height: 9px !important; border-radius: 5px !important; box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); }
    #kp-skill-hud { bottom: 96px !important; }
    @media (max-width: 420px) {
      #kp-skill-hud { bottom: 88px !important; }
    }
  `;
  document.head.appendChild(style);
}

export function installSkillsPetsPolish(game = null) {
  patchPetPrototype();
  syncRuntimeConfig();
  if (game) {
    injectVisualPolish();
    installTextSanitizer(game);
  }
}
