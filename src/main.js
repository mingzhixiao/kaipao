import { assets } from './systems/AssetManager.js';
import { Game } from './core/Game.js';

// ---------------- 游戏启动引导与测试入口 (Game Bootstrap) ----------------

function initCheatPanel(game) {
  const btnCheatLvl = document.getElementById('cheat-lvl');
  if (btnCheatLvl) {
    btnCheatLvl.addEventListener('click', () => game.triggerLevelUp());
  }

  const btnCheatHeal = document.getElementById('cheat-heal');
  if (btnCheatHeal) {
    btnCheatHeal.addEventListener('click', () => {
      game.fortress.hp = game.fortress.maxHp;
      game.fortress.shield = game.fortress.maxShield;
      game.spawnDamageText(game.hero.x, game.hero.y - 30, 'REPAIRED!', '#39ff14', true);
      game.hud.updateHUD(game);
    });
  }

  const btnCheatSkills = document.getElementById('cheat-skills');
  if (btnCheatSkills) {
    btnCheatSkills.addEventListener('click', () => {
      game.skills.rocket.level = Math.max(1, game.skills.rocket.level + 1);
      game.skills.truck.level = Math.max(1, game.skills.truck.level + 1);
      game.skills.freeze.level = Math.max(1, game.skills.freeze.level + 1);
      game.hud.updateSkillHUD(game);
      game.spawnDamageText(game.hero.x, game.hero.y - 50, 'SKILLS UPGRADE!', '#ffcc00', true);
    });
  }

  const btnCheatBoss = document.getElementById('cheat-boss');
  if (btnCheatBoss) {
    btnCheatBoss.addEventListener('click', () => {
      game.spawnBoss(180);
    });
  }
}

// 页面与图片预加载完成后启动
window.addEventListener('DOMContentLoaded', () => {
  assets.loadAll().then(() => {
    const gameInstance = new Game();
    window.gameInstance = gameInstance;
    initCheatPanel(gameInstance);
    console.log('[Kaipao Roguelike] Modular Engine Initialized Successfully!');
  });
});
