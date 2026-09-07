// ---------------- Game UI/UX: responsive layout, safe area, focus and screen-state helpers ----------------

const STYLE_ID = 'kp-game-ui-ux';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --ui-safe-top: max(10px, env(safe-area-inset-top));
      --ui-safe-right: max(10px, env(safe-area-inset-right));
      --ui-safe-bottom: max(10px, env(safe-area-inset-bottom));
      --ui-safe-left: max(10px, env(safe-area-inset-left));
      --ui-space-1: 4px; --ui-space-2: 8px; --ui-space-3: 12px; --ui-space-4: 16px; --ui-space-5: 20px;
      --ui-radius-sm: 8px; --ui-radius-md: 12px; --ui-radius-lg: 16px;
      --ui-surface: rgba(10,16,28,.94); --ui-surface-2: rgba(18,27,43,.96);
      --ui-line: rgba(148,163,184,.18); --ui-line-strong: rgba(0,240,255,.32);
      --ui-text: #f8fafc; --ui-muted: #94a3b8; --ui-touch: 44px;
    }
    #game-container { isolation: isolate; padding: 0; }
    button,[role="button"] { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
    button:focus-visible,[role="button"]:focus-visible { outline:2px solid var(--neon-cyan,#00f0ff); outline-offset:2px; }
    #top-hud { padding-top:var(--ui-safe-top)!important; padding-left:var(--ui-safe-left)!important; padding-right:var(--ui-safe-right)!important; }
    #bottom-hud { padding-left:var(--ui-safe-left)!important; padding-right:var(--ui-safe-right)!important; padding-bottom:calc(10px + var(--ui-safe-bottom))!important; }
    .hud-badge,.icon-btn { min-height:var(--ui-touch); }
    .icon-btn { min-width:var(--ui-touch); display:inline-flex; align-items:center; justify-content:center; }

    #home-lobby {
      position:absolute!important; inset:0!important; z-index:160!important; width:100%!important; height:100%!important;
      min-height:0!important; padding:var(--ui-safe-top) var(--ui-safe-right) var(--ui-safe-bottom) var(--ui-safe-left)!important;
      display:flex; flex-direction:column; overflow:hidden;
      background:radial-gradient(circle at 50% 15%,rgba(0,240,255,.08),transparent 35%),linear-gradient(180deg,#07101b 0%,#050913 52%,#03050a 100%);
    }
    #home-lobby .lobby-header { flex:0 0 auto; min-height:56px; padding:6px 2px 10px!important; gap:8px!important; }
    #home-lobby .lobby-commander-box,#home-lobby .lobby-currencies { min-height:44px; }
    #home-lobby .lobby-currencies { gap:5px!important; overflow-x:auto; scrollbar-width:none; }
    #home-lobby .lobby-currencies::-webkit-scrollbar { display:none; }
    #home-lobby .lobby-pill { min-height:38px; padding:0 9px!important; border-radius:11px!important; white-space:nowrap; }
    #home-lobby .lobby-content-container { flex:1 1 auto!important; min-height:0!important; overflow:hidden auto!important; overscroll-behavior:contain; scrollbar-width:thin; padding:0 2px 12px!important; }
    #home-lobby .lobby-tab-view { min-height:100%; padding-bottom:12px; animation:kpUiPageIn .18s ease-out; }
    #home-lobby .lobby-bottom-nav { flex:0 0 auto; min-height:64px; padding:6px 2px calc(5px + var(--ui-safe-bottom))!important; gap:3px!important; background:rgba(5,9,17,.96)!important; border-top:1px solid var(--ui-line)!important; box-shadow:0 -10px 30px rgba(0,0,0,.25); z-index:5; }
    #home-lobby .nav-tab-btn { flex:1 1 0; min-width:44px; min-height:50px; border-radius:10px!important; padding:5px 2px!important; position:relative; }
    #home-lobby .nav-tab-btn.active::before { content:''; position:absolute; top:2px; left:22%; right:22%; height:2px; border-radius:2px; background:var(--neon-cyan,#00f0ff); box-shadow:0 0 10px rgba(0,240,255,.65); }
    #home-lobby .nav-tab-icon { font-size:19px!important; line-height:20px; }
    #home-lobby .nav-tab-label { font-size:10px!important; margin-top:2px; }
    #home-lobby .lobby-battle-cta-wrap { position:sticky; bottom:0; padding:10px 0 6px; background:linear-gradient(180deg,transparent,rgba(5,9,17,.96) 35%); }
    #home-lobby .lobby-battle-btn { min-height:52px; border-radius:14px!important; box-shadow:0 8px 26px rgba(0,240,255,.16); letter-spacing:.4px; }
    #home-lobby .section-header { padding:8px 2px 10px!important; }
    #home-lobby .section-title { font-size:17px!important; }
    #home-lobby .section-subtitle { line-height:1.45; }
    #home-lobby .filter-bar { position:sticky; top:0; z-index:3; padding:6px 0 9px!important; margin-bottom:2px; background:linear-gradient(180deg,#07101b 70%,transparent); overflow-x:auto; scrollbar-width:none; }
    #home-lobby .filter-bar::-webkit-scrollbar { display:none; }
    #home-lobby .filter-pill { min-height:38px; display:inline-flex; align-items:center; justify-content:center; white-space:nowrap; padding:0 13px!important; }
    #home-lobby #lobby-item-modal,#home-lobby #lobby-crate-modal { position:fixed!important; inset:0!important; z-index:20; padding:16px var(--ui-safe-right) calc(16px + var(--ui-safe-bottom)) var(--ui-safe-left); display:none; align-items:flex-end; justify-content:center; background:rgba(0,0,0,.62); backdrop-filter:blur(7px); }
    #upgrade-modal,#gameover-modal,#stage-select-modal,#stage-clear-modal,#rune-forge-modal { padding:var(--ui-safe-top) var(--ui-safe-right) var(--ui-safe-bottom) var(--ui-safe-left)!important; overscroll-behavior:contain; }
    #upgrade-modal .cards-container,#gameover-modal .report-card,#stage-select-modal > *,#stage-clear-modal > *,#rune-forge-modal > * { max-height:calc(100dvh - var(--ui-safe-top) - var(--ui-safe-bottom) - 24px); overflow-y:auto; overscroll-behavior:contain; }
    .primary-btn,.reroll-btn,.cheat-btn { min-height:44px; }

    /* 信息架构：七个并列入口收敛为“基地 / 构筑 / 养成 / 试炼 / 更多”。 */
    #kp-lobby-more-panel { position:fixed; inset:0; z-index:190; display:none; align-items:flex-end; justify-content:center; padding:16px var(--ui-safe-right) calc(12px + var(--ui-safe-bottom)) var(--ui-safe-left); background:rgba(0,0,0,.62); backdrop-filter:blur(8px); }
    #kp-lobby-more-panel.open { display:flex; }
    .kp-more-sheet { width:min(520px,100%); max-height:min(72dvh,560px); overflow:auto; padding:16px; border:1px solid var(--ui-line-strong); border-radius:20px; background:linear-gradient(180deg,rgba(14,24,39,.99),rgba(5,10,19,.99)); box-shadow:0 -20px 50px rgba(0,0,0,.5); }
    .kp-more-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
    .kp-more-title { font-size:16px; font-weight:900; color:#fff; }
    .kp-more-close { width:44px; height:44px; border:1px solid var(--ui-line); border-radius:12px; background:rgba(255,255,255,.06); color:#fff; font-size:20px; }
    .kp-more-group { margin-top:12px; }
    .kp-more-group-title { margin-bottom:7px; color:#64748b; font-size:10px; font-weight:900; letter-spacing:1.2px; }
    .kp-more-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
    .kp-more-action { min-height:58px; display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--ui-line); border-radius:13px; background:rgba(255,255,255,.045); color:#e2e8f0; text-align:left; }
    .kp-more-action strong { display:block; font-size:13px; }
    .kp-more-action small { display:block; margin-top:2px; color:#94a3b8; font-size:10px; }

    @media (min-width:700px) {
      #home-lobby { padding-left:18px!important; padding-right:18px!important; }
      #home-lobby .lobby-content-container { max-width:520px; width:100%; margin:0 auto; }
      #home-lobby .lobby-header,#home-lobby .lobby-bottom-nav { max-width:520px; width:100%; margin-left:auto; margin-right:auto; }
    }
    @media (max-width:380px) {
      #home-lobby .nav-tab-icon { font-size:17px!important; }
      #home-lobby .nav-tab-label { font-size:9px!important; }
      #home-lobby .lobby-pill { padding-left:7px!important; padding-right:7px!important; font-size:10px!important; }
      #home-lobby .lobby-battle-btn { min-height:48px; font-size:14px!important; }
    }
    @media (orientation:landscape) and (max-height:520px) {
      #home-lobby .lobby-header { min-height:48px; padding-bottom:5px!important; }
      #home-lobby .lobby-bottom-nav { min-height:54px; }
      #home-lobby .nav-tab-btn { min-height:43px; }
      #home-lobby .nav-tab-icon { font-size:16px!important; }
      #home-lobby .lobby-battle-btn { min-height:44px; }
    }
    @media (prefers-reduced-motion:reduce) { #home-lobby .lobby-tab-view { animation:none; } *,*::before,*::after { scroll-behavior:auto!important; } }
    @keyframes kpUiPageIn { from { opacity:.65; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
  `;
  document.head.appendChild(style);
}

function setTouchTargets(root) {
  if (!root) return;
  root.querySelectorAll('button').forEach((button) => {
    button.style.webkitTapHighlightColor = 'transparent';
    if (!button.getAttribute('aria-label') && !button.textContent.trim()) button.setAttribute('aria-label','操作');
  });
}

function installScreenState(game) {
  if (!game || game.__uiUxInstalled) return;
  game.__uiUxInstalled = true;
  game.uiState = {
    stack:['game'],
    push(screen) { if (!screen) return; this.stack.push(screen); game.isPaused=true; },
    pop() { if (this.stack.length>1) this.stack.pop(); if (this.stack.length===1 && !game.isGameOver && !game.isUpgrading) game.isPaused=false; return this.stack[this.stack.length-1]; },
    current() { return this.stack[this.stack.length-1]; }
  };
  window.gameUIState = game.uiState;
}

function openLobbyTab(tab) {
  const ui = window.homeLobbyUI;
  if (ui && typeof ui.switchTab === 'function') ui.switchTab(tab);
}

function createLobbyMorePanel() {
  if (document.getElementById('kp-lobby-more-panel')) return document.getElementById('kp-lobby-more-panel');
  const panel = document.createElement('div');
  panel.id = 'kp-lobby-more-panel';
  panel.innerHTML = `
    <div class="kp-more-sheet" role="dialog" aria-modal="true" aria-label="更多管理">
      <div class="kp-more-head"><div class="kp-more-title">更多管理</div><button class="kp-more-close" type="button" aria-label="关闭">×</button></div>
      <div class="kp-more-group"><div class="kp-more-group-title">养成与资源</div><div class="kp-more-grid">
        <button class="kp-more-action" data-more-tab="pets"><span>🐾</span><span><strong>宠物</strong><small>伙伴、等级与出战</small></span></button>
        <button class="kp-more-action" data-more-tab="backpack"><span>🎒</span><span><strong>背包</strong><small>材料与军备物资</small></span></button>
      </div></div>
      <div class="kp-more-group"><div class="kp-more-group-title">构筑管理</div><div class="kp-more-grid">
        <button class="kp-more-action" data-more-tab="weapons"><span>🔫</span><span><strong>枪械</strong><small>主武器与强化</small></span></button>
        <button class="kp-more-action" data-more-tab="skills"><span>📖</span><span><strong>技能</strong><small>技能库与协同</small></span></button>
        <button class="kp-more-action" data-more-tab="runes"><span>💠</span><span><strong>符文</strong><small>永久属性强化</small></span></button>
      </div></div>
    </div>`;
  document.getElementById('game-container')?.appendChild(panel);
  const close = () => panel.classList.remove('open');
  panel.querySelector('.kp-more-close')?.addEventListener('click', close);
  panel.addEventListener('click', e => { if (e.target === panel) close(); });
  panel.querySelectorAll('[data-more-tab]').forEach(btn => btn.addEventListener('click', () => { openLobbyTab(btn.dataset.moreTab); close(); }));
  return panel;
}

function enhanceLobbyNavigation() {
  const lobby = document.getElementById('home-lobby');
  if (!lobby || lobby.dataset.uiNavEnhanced === '1') return;
  const nav = lobby.querySelector('.lobby-bottom-nav');
  if (!nav) return;
  lobby.dataset.uiNavEnhanced = '1';
  const buttons = [...nav.querySelectorAll('.nav-tab-btn')];
  const byTab = tab => buttons.find(b => b.dataset.tab === tab);
  const weapons = byTab('weapons');
  const skills = byTab('skills');
  const backpack = byTab('backpack');
  const pets = byTab('pets');
  const runes = byTab('runes');
  const trials = byTab('trials');

  // 保留原 data-tab，避免破坏 HomeLobbyUI 的既有路由；这里只改变入口文案与层级。
  if (weapons) { weapons.querySelector('.nav-tab-icon').textContent='🧩'; weapons.querySelector('.nav-tab-label').textContent='构筑'; }
  if (skills) skills.style.display='none';
  if (runes) runes.style.display='none';
  if (backpack) { backpack.querySelector('.nav-tab-icon').textContent='📈'; backpack.querySelector('.nav-tab-label').textContent='养成'; }
  if (pets) pets.style.display='none';
  if (trials) trials.querySelector('.nav-tab-label').textContent='试炼';

  const moreBtn = document.createElement('button');
  moreBtn.type='button'; moreBtn.className='nav-tab-btn';
  moreBtn.innerHTML='<span class="nav-tab-icon">☰</span><span class="nav-tab-label">更多</span>';
  moreBtn.setAttribute('aria-label','更多管理');
  nav.appendChild(moreBtn);
  const panel = createLobbyMorePanel();
  moreBtn.addEventListener('click', () => panel.classList.add('open'));
  nav.setAttribute('aria-label','主导航');
  nav.querySelectorAll('.nav-tab-btn').forEach(btn => btn.setAttribute('tabindex','0'));
}

export function installGameUIUX(game = null) {
  injectStyles();
  setTouchTargets(document.getElementById('game-container') || document.body);
  if (game) {
    installScreenState(game);
    enhanceLobbyNavigation();
  }
}
