import { assets } from './systems/AssetManager.js';
import { Game } from './core/Game.js';
import { runeSystem } from './systems/RuneSystem.js';
import { installSkillsPetsFeature } from './features/SkillsPetsFeature.js';
import { installSkillsPetsHud } from './ui/SkillsPetsHud.js';
import { installSkillsPetsPolish } from './features/SkillsPetsPolish.js';
import { installGameUIUX } from './ui/GameUIUX.js';
import { homeLobbyUI } from './ui/HomeLobbyUI.js';
import { GAME_CONFIG } from './core/Config.js';
import { PET_TYPES } from './features/SkillsPetsFeature.js';
import { installGameOptimization } from './systems/GameOptimization.js';
import { installRenderOptimization } from './systems/RenderOptimization.js';
import { installFeatureRuntimeOptimization } from './systems/FeatureRuntimeOptimization.js';
import { installBuildIdentity } from './systems/BuildIdentitySystem.js';
import { installCloudStorage } from './systems/CloudStorageBridge.js';
import { saveManager } from './systems/SaveManager.js';
import { gameEvents } from './systems/EventBus.js';

// 注：写盘防抖已经内建在 SaveManager 本体（200ms + 页面隐藏/卸载同步落盘），
// 因此不再需要 PersistenceOptimization 那层 400ms 的 save() 包装——两层叠加会把
// 落盘延迟拉到 600ms，而且它的 flush 调用的仍是被防抖的 save()，页面卸载时
// 最后 400ms 的进度会直接丢掉。saveManager.flushSave() 现由 SaveManager 自己提供。

// 存储模式由 URL 参数决定：?storage=local | ?storage=d1
// local 为兼容现有单机玩法的默认模式；d1 模式连接 Cloudflare Pages Function + D1。
const storageReady = installCloudStorage(saveManager);

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

// 调试面板的按钮：id -> [文案, 点击行为]
const CHEAT_ACTIONS = [
  ['cheat-lvl', '+ 升级', (game) => game.triggerLevelUp()],
  ['cheat-heal', '+ 修复防线', (game) => {
    game.fortress.hp = game.fortress.maxHp;
    game.fortress.shield = game.fortress.maxShield;
    game.spawnDamageText(game.hero.x, game.hero.y - 30, 'REPAIRED!', '#39ff14', true);
    game.hud.updateHUD(game);
  }],
  ['cheat-skills', '+ 解锁全技能', (game) => {
    // 全部技能的运行时状态统一存在 game.skills
    for (const id of ['rocket', 'truck', 'freeze', 'laser', 'tornado', 'boomerang', 'bomber']) {
      const s = game.skills[id];
      if (s) s.level = Math.max(1, s.level + 1);
    }
  }],
  ['cheat-boss', '⚠️ 召唤Boss', (game) => game.spawnBoss(180)],
  ['cheat-fail', '测试失守', (game) => game.damageFortress(game.fortress.hp + game.fortress.shield + 1)],
  ['cheat-clear', '测试通关', (game) => game.waveSystem.onStageClear()]
];

const CHEAT_STYLE = `
  #cheat-panel-toggle {
    position: absolute; top: 70px; right: 8px; z-index: 50; pointer-events: auto;
    background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(148, 163, 184, 0.25);
    color: #94a3b8; border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer;
  }
  #cheat-panel {
    position: absolute; top: 100px; right: 8px; z-index: 50; pointer-events: auto;
    display: none; flex-direction: column; gap: 4px;
  }
  #cheat-panel.open { display: flex; }
  .cheat-btn {
    min-height: 44px; background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.15); color: #e2e8f0;
    border-radius: 6px; padding: 6px 10px; font-size: 11px; cursor: pointer;
  }
`;

// 调试面板只在 ?debug=1（或旧别名 ?cheat=1）时才构建。
// 这套按钮以前写死在 index.html 里、仅靠 display:none 藏起来——也就是说线上页面
// 里始终躺着一份「升级 / 解锁全技能 / 直接通关」的作弊 UI，任何人加个参数就能用。
// 改成按需生成后，正式包体的 DOM 与样式里都不再存在这些节点。
function initCheatPanel(game) {
  const params = new URLSearchParams(location.search);
  if (params.get('debug') !== '1' && params.get('cheat') !== '1') return;

  const style = document.createElement('style');
  style.id = 'cheat-panel-style';
  style.textContent = CHEAT_STYLE;
  document.head.appendChild(style);

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'cheat-panel-toggle';
  toggleBtn.type = 'button';
  toggleBtn.title = '展开/收起调试菜单';
  toggleBtn.textContent = '🛠️ 调试';

  const panel = document.createElement('div');
  panel.id = 'cheat-panel';

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('open');
    toggleBtn.textContent = panel.classList.contains('open') ? '关闭调试' : '调试';
  });

  for (const [id, label, run] of CHEAT_ACTIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cheat-btn';
    btn.id = id;
    btn.textContent = label;
    btn.addEventListener('click', () => run(game));
    panel.appendChild(btn);
  }

  const host = game.container || document.body;
  host.appendChild(toggleBtn);
  host.appendChild(panel);
  console.log('[debug] 调试面板已启用');
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
        // GAME_CONFIG.skills 是技能数值的唯一来源，SKILL_CONFIG 只是它的别名
        Object.assign(GAME_CONFIG.skills, skillsJson.skills);
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

    // 云端存档先完成一次拉取，再创建 Game，避免游戏先读到旧本地档后被云档异步覆盖。
    try {
      await storageReady;
    } catch (storageErr) {
      console.warn('[Storage] storage initialization failed, continue with local save:', storageErr);
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
      installRenderOptimization(gameInstance);
      installFeatureRuntimeOptimization(gameInstance);
      installBuildIdentity(gameInstance);
      bindFeatureTarget(gameInstance);
      window.gameInstance = gameInstance;
      window.gameEvents = gameEvents;
      initCheatPanel(gameInstance);
      gameInstance.isPaused = true;
      homeLobbyUI.init(gameInstance);
      // HomeLobbyUI 在这里才真正创建底部导航，因此 UI/UX 导航增强必须随后执行。
      installGameUIUX(gameInstance);
      console.log('[Starcore] UI/UX + gameplay polish + performance + rendering + persistence + storage + feature runtime optimization + build identity ready');
    }, 280);
  });
});
