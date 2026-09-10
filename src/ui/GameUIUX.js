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
    #top-hud { gap:2px!important; padding-top:var(--ui-safe-top)!important; padding-right:var(--ui-safe-right)!important; padding-bottom:4px!important; padding-left:var(--ui-safe-left)!important; background:linear-gradient(180deg,rgba(3,7,15,.93),rgba(3,7,15,.58) 74%,transparent)!important; }
    #top-hud .hud-top-bar { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:7px; width:100%; }
    #top-hud .battle-progress-group { min-width:0; gap:4px; }
    #top-hud .prog-badge { min-width:0; min-height:30px; padding:3px 6px; border-radius:6px; }
    #top-hud .core-resource-badge { min-height:30px; padding:3px 8px; border-radius:8px; }
    #top-hud .sys-controls-group { display:flex; align-items:center; gap:5px; }
    .battle-exit-btn { width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; border:1px solid rgba(251,113,133,.55); border-radius:6px; background:rgba(76,14,30,.78); color:#fda4af; font-size:18px; font-weight:900; cursor:pointer; }
    .battle-exit-btn:active { transform:scale(.94); }
    #top-hud .settings-gear-btn { width:30px; height:30px; border-radius:6px; }
    #top-hud .hud-ammo { min-width:54px; min-height:30px; justify-content:center; padding:3px 6px; gap:3px; border-radius:6px; }
    #top-hud .hud-ammo .vital-val { font-size:10px; }
    #top-hud .exp-bar-container { height:3px; margin-top:1px; }
    #defense-status { position:absolute; right:var(--ui-safe-right); bottom:calc(105px + var(--ui-safe-bottom)); left:var(--ui-safe-left); z-index:34; pointer-events:none; }
    #defense-status .top-vitals-row { display:grid; grid-template-columns:minmax(0,2.2fr) minmax(0,1fr); align-items:stretch; gap:5px; width:100%; padding:0; pointer-events:none; }
    #defense-status .vital-capsule { min-width:0; min-height:30px; width:100%; justify-content:center; gap:5px; padding:4px 8px; border-radius:6px; border-width:1px; background:rgba(4,9,18,.88); backdrop-filter:blur(7px); }
    #defense-status .vital-bar-fill { opacity:.68; }
    #defense-status .vital-label { position:relative; z-index:2; color:#e2e8f0; font-size:9px; font-weight:900; white-space:nowrap; }
    #defense-status .vital-val { min-width:0; font-size:10px; white-space:nowrap; }
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
    #upgrade-modal,#gameover-modal,#retreat-confirm-modal,#stage-clear-modal { padding:var(--ui-safe-top) var(--ui-safe-right) var(--ui-safe-bottom) var(--ui-safe-left)!important; overscroll-behavior:contain; }
    #gameover-modal .report-card { max-height:calc(100dvh - var(--ui-safe-top) - var(--ui-safe-bottom) - 24px); overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain; }
    #stage-clear-modal { padding:max(8px,var(--ui-safe-top)) max(8px,var(--ui-safe-right)) max(8px,var(--ui-safe-bottom)) max(8px,var(--ui-safe-left))!important; }
    #stage-clear-modal .stage-clear-card { max-height:calc(100dvh - max(8px,var(--ui-safe-top)) - max(8px,var(--ui-safe-bottom)))!important; overflow-y:auto; overflow-x:hidden; padding:15px 14px 12px; border-radius:8px; scrollbar-width:thin; }
    body.battle-result-open #kp-skill-hud,body.battle-result-open #kp-wave-tactic { display:none!important; }
    .report-card { border-radius:8px!important; gap:11px!important; padding:18px 16px!important; }
    .report-subtitle { margin-top:-7px; color:#94a3b8; font-size:11px; text-align:center; }
    #retreat-confirm-modal { position:absolute; inset:0; z-index:145; display:none; align-items:center; justify-content:center; background:rgba(3,6,12,.82); backdrop-filter:blur(5px); }
    .retreat-confirm-card { width:min(340px,calc(100% - 28px)); padding:20px 18px 16px; border:1px solid rgba(251,113,133,.5); border-radius:8px; background:linear-gradient(180deg,#151c2b,#090e18); box-shadow:0 16px 44px rgba(0,0,0,.65); text-align:center; }
    .retreat-confirm-icon { color:#fb7185; font-size:29px; line-height:1; }
    .retreat-confirm-title { margin-top:7px; color:#fff; font-size:18px; font-weight:900; }
    .retreat-confirm-desc { margin-top:8px; color:#aeb9ca; font-size:12px; line-height:1.55; }
    .retreat-confirm-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:16px; }
    .retreat-cancel-btn,.retreat-confirm-btn { min-height:44px; border-radius:8px; font-size:13px; font-weight:900; cursor:pointer; }
    .retreat-cancel-btn { border:1px solid rgba(148,163,184,.38); background:#1e293b; color:#e2e8f0; }
    .retreat-confirm-btn { border:1px solid #fb7185; background:#881337; color:#fff; }
    .stage-result-summary { margin:0 0 10px; padding:9px 10px; border:1px solid rgba(250,204,21,.28); border-radius:8px; background:rgba(30,41,59,.66); text-align:center; }
    .stage-clear-stars { display:flex; justify-content:center; gap:4px; min-height:27px; }
    .result-star { color:#334155; font-size:25px; line-height:1; text-shadow:none; }
    .result-star.earned { color:#facc15; text-shadow:0 0 10px rgba(250,204,21,.65); }
    .stage-clear-rating { margin-top:3px; color:#fef08a; font-size:12px; font-weight:900; }
    .stage-clear-hp { margin-top:3px; color:#94a3b8; font-size:10px; }
    #stage-clear-modal .stage-clear-title { margin-bottom:7px; font-size:19px; }
    #stage-clear-modal .stage-clear-reward { margin-bottom:9px; }
    #stage-clear-modal .loot-settle-container { padding:8px 9px; margin-bottom:9px!important; border-radius:8px; }
    #stage-clear-modal #stage-rune-choices { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; margin:8px 0 10px; }
    #stage-clear-modal .rune-choice-card { min-width:0; flex-direction:column; gap:5px; padding:8px 5px; border-radius:8px; text-align:center; }
    #stage-clear-modal .rune-icon { width:38px; height:38px; border-radius:8px; }
    #stage-clear-modal .rune-choice-info { min-width:0; width:100%; }
    #stage-clear-modal .rune-choice-name { min-height:34px; display:flex; align-items:center; justify-content:center; font-size:12px; line-height:1.35; }
    #stage-clear-modal .rune-choice-desc { display:-webkit-box; overflow:hidden; -webkit-box-orient:vertical; -webkit-line-clamp:2; font-size:9px; line-height:1.35; }
    #stage-clear-modal .stage-clear-actions { position:sticky; bottom:-12px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; padding:8px 0 0; background:linear-gradient(180deg,transparent,rgba(10,14,24,.99) 22%); }
    #stage-clear-modal .stage-clear-btn { min-width:0; min-height:44px; padding:8px 4px; border-radius:8px; font-size:12px; }
    .primary-btn,.reroll-btn { min-height:44px; }

    /* 波间强化保持战场可辨识，三项并排用于快速横向比较。 */
    #upgrade-modal { justify-content:center!important; gap:13px; padding:calc(var(--ui-safe-top) + 10px) max(8px,var(--ui-safe-right)) calc(var(--ui-safe-bottom) + 10px) max(8px,var(--ui-safe-left))!important; background:rgba(2,6,12,.82)!important; backdrop-filter:blur(2px) brightness(.55); }
    #upgrade-modal .modal-title-box { flex:none; margin:0!important; text-align:center; }
    #upgrade-modal .modal-subtitle { color:#fbbf24; font-size:9px; letter-spacing:1.8px; }
    #upgrade-modal .modal-title { display:inline-block; margin-top:4px; padding:7px 24px; border-right:2px solid #fb923c; border-left:2px solid #fb923c; background:linear-gradient(90deg,transparent,rgba(234,88,12,.86) 18%,rgba(249,115,22,.92) 82%,transparent); color:#fff; font-size:20px; line-height:1.1; text-shadow:0 2px 5px rgba(0,0,0,.75); }
    #upgrade-modal .cards-container { flex:none; width:min(680px,100%); max-width:none; max-height:none; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); align-items:stretch; gap:8px; padding:2px; overflow:visible; }
    #upgrade-modal .upgrade-card { min-width:0; min-height:310px; height:min(42dvh,370px); display:flex; flex-direction:column; justify-content:flex-start; gap:9px; padding:9px 8px 11px; border-radius:5px; text-align:center; background:linear-gradient(180deg,rgba(239,232,208,.98),rgba(214,204,177,.98)); color:#172033; box-shadow:0 12px 28px rgba(0,0,0,.62); }
    #upgrade-modal .upgrade-card:hover { transform:translateY(-3px); }
    #upgrade-modal .upgrade-card:active { transform:scale(.98); }
    #upgrade-modal .card-icon-img { flex:none; width:68px; height:68px; margin:8px auto 2px; border:2px solid rgba(15,23,42,.3); border-radius:50%; }
    #upgrade-modal .card-info { width:100%; display:flex; flex:1; flex-direction:column; align-items:center; min-width:0; }
    #upgrade-modal .card-header-row { width:100%; flex-direction:column; justify-content:flex-start; gap:5px; }
    #upgrade-modal .card-header-row > div:last-child { justify-content:center; flex-wrap:wrap; }
    #upgrade-modal .card-name { width:100%; min-height:36px; display:flex; align-items:center; justify-content:center; color:#172033; font-size:14px; line-height:1.28; }
    #upgrade-modal .card-tag { color:#713f12!important; text-shadow:none!important; }
    #upgrade-modal .card-synergy { min-height:27px; margin-top:4px; color:#9a3412; font-size:10px; line-height:1.35; }
    #upgrade-modal .card-desc { margin-top:8px; color:#263348; font-size:11px; font-weight:700; line-height:1.45; }
    #upgrade-modal .card-synergy-pill { margin-top:auto; align-self:center; max-width:100%; border-color:rgba(71,85,105,.35); background:rgba(255,255,255,.36); color:#475569; white-space:normal; }
    #upgrade-modal .modal-footer { flex:none; margin:0; }
    #upgrade-modal .reroll-btn { min-height:40px; padding:8px 18px; border-color:#22d3ee; background:rgba(8,47,73,.88); color:#cffafe; }
    #upgrade-modal #upgrade-auto-badge { margin-top:6px!important; padding:4px 12px!important; border-radius:6px!important; font-size:10px!important; }

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
      #top-hud .prog-badge .badge-label { display:none; }
      #top-hud .prog-badge { padding-left:5px; padding-right:5px; }
      #top-hud .core-resource-badge { padding-left:6px; padding-right:6px; }
      #top-hud .vital-label { display:none; }
      #top-hud .hud-ammo { min-width:48px; padding-left:4px; padding-right:4px; }
      #defense-status { right:6px; left:6px; }
      #defense-status .vital-label { display:none; }
      #home-lobby .nav-tab-icon { font-size:17px!important; }
      #home-lobby .nav-tab-label { font-size:9px!important; }
      #home-lobby .lobby-pill { padding-left:7px!important; padding-right:7px!important; font-size:10px!important; }
      #home-lobby .lobby-battle-btn { min-height:48px; font-size:14px!important; }
      #upgrade-modal { gap:9px; }
      #upgrade-modal .modal-title { font-size:18px; padding:6px 19px; }
      #upgrade-modal .cards-container { gap:5px; }
      #upgrade-modal .upgrade-card { min-height:285px; height:min(41dvh,340px); padding:7px 5px 9px; gap:6px; }
      #upgrade-modal .card-icon-img { width:58px; height:58px; }
      #upgrade-modal .card-name { min-height:34px; font-size:12px; }
      #upgrade-modal .card-synergy { min-height:26px; font-size:9px; }
      #upgrade-modal .card-desc { font-size:10px; }
      #upgrade-modal .card-synergy-pill { padding:2px 4px; font-size:8px; }
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
        <button class="kp-more-action" data-more-tab="pets"><span>🛸</span><span><strong>僚机</strong><small>伴飞、等级与出战</small></span></button>
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
  nav.setAttribute('aria-label', '主导航');
  nav.querySelectorAll('.nav-tab-btn').forEach(btn => btn.setAttribute('tabindex', '0'));
}

function applySafeAreaInsets() {
  const root = document.documentElement;
  root.style.setProperty('--safe-top', 'max(10px, env(safe-area-inset-top, 10px))');
  root.style.setProperty('--safe-bottom', 'max(10px, env(safe-area-inset-bottom, 10px))');
  root.style.setProperty('--safe-left', 'max(10px, env(safe-area-inset-left, 10px))');
  root.style.setProperty('--safe-right', 'max(10px, env(safe-area-inset-right, 10px))');
}

export function installGameUIUX(game = null) {
  injectStyles();
  applySafeAreaInsets();
  window.addEventListener('resize', applySafeAreaInsets, { passive: true });
  window.addEventListener('orientationchange', applySafeAreaInsets, { passive: true });
  setTouchTargets(document.getElementById('game-container') || document.body);
  if (game) {
    enhanceLobbyNavigation();
  }
}
