import { assets } from './systems/AssetManager.js';
import { Game } from './core/Game.js';
import { runeSystem } from './systems/RuneSystem.js';
import { installSkillsPetsFeature } from './features/SkillsPetsFeature.js';
import { installSkillsPetsHud } from './ui/SkillsPetsHud.js';
import { installSkillsPetsPolish } from './features/SkillsPetsPolish.js';
import { installGameUIUX } from './ui/GameUIUX.js';
import { homeLobbyUI } from './ui/HomeLobbyUI.js';
import { GAME_CONFIG } from './core/Config.js';
import { SKILL_CONFIG, PET_TYPES } from './features/SkillsPetsFeature.js';
import { installGameOptimization } from './systems/GameOptimization.js';
import { installBuildIdentity } from './systems/BuildIdentitySystem.js';
import { gameEvents } from './systems/EventBus.js';

function wireStageAndRunes(game) {
  game.startStage = function(stageId) {
    this.waveSystem.setStage(stageId);
    this.resetGame();
    gameEvents.emit('stage:start', { game: this, stageId });
  };

  const origReset = game.resetGame.bind(game);
  game.resetGame = function() {
    origReset();
    this.expMultiplier = 1;
    runeSystem.reload();
    runeSystem.applyAll(this);
    this.fortress.hp = this.fortress.maxHp;
    this.fortress.shield = this.fortress.maxShield;
    this.hud.updateHUD(this);
    gameEvents.emit('game:reset', { game: this });
  };

  const origGain = game.gainExp.bind(game);
  game.gainExp = function(amount) {
    amount = Math.round(amount * (this.expMultiplier || 1));
    origGain(amount);
    gameEvents.emit('exp:gain', { game: this, amount });
  };

  game.stageId = 1;
  game.stageName = '';
  game.expMultiplier = 1;
  game.lastStageReward = null;
  game.waveSystem.setStage(1);
}

function bindFeatureTarget(game) {
  if (!game.feature || game.feature.targetBound) return;
  game.feature.targetBound = true;
  const updateTarget = (e) => {
    const rect = game.canvas.getBoundingClientRect();
    const touch = e.touches && e.touches.length ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return;
    game.feature.target.x = clientX - rect.left;
    game.feature.target.y = clientY - rect.top;
  };
  game.canvas.addEventListener('mousemove', updateTarget, { passive: true });
  game.canvas.addEventListener('touchmove', updateTarget, { passive: true });
  game.canvas.addEventListener('touchstart', updateTarget, { passive: true });
}

function initCheatPanel(game) {
  const params = new URLSearchParams(location.search);
  const debug = params.get('debug') === '1' || params.get('cheat') === '1';
  const toggleBtn = document.getElementById('cheat-panel-toggle');
  const panel = document.getElementById('cheat-panel');
  if (!debug) {
    if (toggleBtn) toggleBtn.style.display = 'none';
    if (panel) panel.style.display = 'none';
    return;
  }
  if (toggleBtn) toggleBtn.style.display = '';
  if (panel) panel.style.display = '';
  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('open');
      toggleBtn.textContent = panel.classList.contains('open') ? '关闭调试' : '调试';
    });
  }
  const btnCheatLvl = document.getElementById('cheat-lvl');
  if (btnCheatLvl) btnCheatLvl.addEventListener('click', () => game.triggerLevelUp());
  const btnCheatHeal = document.getElementById('cheat-heal');
  if (btnCheatHeal) btnCheatHeal.addEventListener('click', () => {
    game.fortress.hp = game.fortress.maxHp;
    game.fortress.shield = game.fortress.maxShield;
    game.spawnDamageText(game.hero.x, game.hero.y - 30, 'REPAIRED!', '#39ff14', true);
    game.hud.updateHUD(game);
  });
  const btnCheatSkills = document.getElementById('cheat-skills');
  if (btnCheatSkills) btnCheatSkills.addEventListener('click', () => {
    game.skills.rocket.level = Math.max(1, game.skills.rocket.level + 1);
    game.skills.truck.level = Math.max(1, game.skills.truck.level + 1);
    game.skills.freeze.level = Math.max(1, game.skills.freeze.level + 1);
    if (game.feature) Object.keys(game.feature.skills).forEach(k => { game.feature.skills[k].level = Math.max(1, game.feature.skills[k].level); });
    game.hud.updateSkillHUD(game);
  });
  const btnCheatBoss = document.getElementById('cheat-boss');
  if (btnCheatBoss) btnCheatBoss.addEventListener('click', () => game.spawnBoss(180));
  const btnCheatFail = document.getElementById('cheat-fail');
  if (btnCheatFail) btnCheatFail.addEventListener('click', () => game.damageFortress(game.fortress.hp + game.fortress.shield + 1));
  const btnCheatClear = document.getElementById('cheat-clear');
  if (btnCheatClear) btnCheatClear.addEventListener('click', () => game.waveSystem.onStageClear());
}

window.addEventListener('DOMContentLoaded', () => {
  installGameUIUX();
  const loadingBar = document.getElementById('loading-bar-inner');
  const loadingText = document.getElementById('loading-progress-text');
  const loadingScreen = document.getElementById('loading-screen');

  assets.loadAll((loaded, total, key) => {
    const percent = Math.round((loaded / total) * 100);
    if (loadingBar) loadingBar.style.width = `${percent}%`;
    if (loadingText) loadingText.textContent = `LOADING ASSETS [${loaded}/${total}]: ${key} (${percent}%)`;
  }).then(async () => {
    if (loadingBar) loadingBar.style.width = '100%';
    if (loadingText) loadingText.textContent = 'SYSTEM READY · LAUNCHING... 100%';

    try {
      const [skillsJson, petsJson] = await Promise.all([
        assets.loadJSON('config/skills.json'),
        assets.loadJSON('config/pets.json')
      ]);

      if (skillsJson?.skills) {
        Object.assign(GAME_CONFIG.skills, skillsJson.skills);
        Object.assign(SKILL_CONFIG, skillsJson.skills);
        console.log('[Config] Hot-reloaded skills.json successfully');
      }
      if (petsJson?.types) {
        Object.assign(GAME_CONFIG.pets.types, petsJson.types);
        Object.assign(PET_TYPES, petsJson.types);
        if (petsJson.growthRate) GAME_CONFIG.pets.statGrowthPerLevel = petsJson.growthRate;
        if (petsJson.recoveryTime) GAME_CONFIG.pets.recoveryTime = petsJson.recoveryTime;
        if (petsJson.teleportThreshold) GAME_CONFIG.pets.teleportThreshold = petsJson.teleportThreshold;
        console.log('[Config] Hot-reloaded pets.json successfully');
      }

      installSkillsPetsPolish();
    } catch (cfgErr) {
      console.warn('[Config] JSON hot-reload skipped, using default config:', cfgErr);
      installSkillsPetsPolish();
    }

    setTimeout(() => {
      if (loadingScreen) loadingScreen.classList.add('fade-out');
      const gameInstance = new Game();
      wireStageAndRunes(gameInstance);
      installSkillsPetsFeature(gameInstance);
      installSkillsPetsPolish(gameInstance);
      installSkillsPetsHud(gameInstance);
      installGameUIUX(gameInstance);
      installGameOptimization(gameInstance);
      installBuildIdentity(gameInstance);
      bindFeatureTarget(gameInstance);
      window.gameInstance = gameInstance;
      window.gameEvents = gameEvents;
      initCheatPanel(gameInstance);
      gameInstance.isPaused = true;
      homeLobbyUI.init(gameInstance);
      // HomeLobbyUI 在这里才真正创建底部导航，因此 UI/UX 导航增强必须随后执行。
      installGameUIUX(gameInstance);
      console.log('[Starcore] UI/UX + gameplay polish + performance optimization + build identity ready');
    }, 280);
  });
});
