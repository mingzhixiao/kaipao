import { assets } from './systems/AssetManager.js';
import { Game } from './core/Game.js';

// ---------------- 游戏启动引导与测试入口 (Game Bootstrap) ----------------

function initCheatPanel(game) {
  const params = new URLSearchParams(location.search);
  const debug = params.get('debug') === '1' || params.get('cheat') === '1';
  const toggleBtn = document.getElementById('cheat-panel-toggle');
  const panel = document.getElementById('cheat-panel');

  // 正式游玩默认隐藏调试面板，加 ?debug=1 才显示
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
      toggleBtn.textContent = panel.classList.contains('open') ? '✖️ 关闭' : '🛠️ 调试';
    });
  }

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
  const loadingBar = document.getElementById('loading-bar-inner');
  const loadingText = document.getElementById('loading-progress-text');
  const loadingScreen = document.getElementById('loading-screen');

  assets.loadAll((loaded, total, key) => {
    const percent = Math.round((loaded / total) * 100);
    if (loadingBar) loadingBar.style.width = `${percent}%`;
    if (loadingText) loadingText.textContent = `LOADING ASSETS [${loaded}/${total}]: ${key} (${percent}%)`;
  }).then(() => {
    if (loadingBar) loadingBar.style.width = '100%';
    if (loadingText) loadingText.textContent = 'SYSTEM READY · LAUNCHING... 100%';

    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
      }
      const gameInstance = new Game();
      window.gameInstance = gameInstance;
      initCheatPanel(gameInstance);
      console.log('[Kaipao Roguelike] Modular Engine Initialized Successfully!');
    }, 280);
  });
});
