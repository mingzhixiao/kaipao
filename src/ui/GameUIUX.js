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
      --ui-space-1: 4px;
      --ui-space-2: 8px;
      --ui-space-3: 12px;
      --ui-space-4: 16px;
      --ui-space-5: 20px;
      --ui-radius-sm: 8px;
      --ui-radius-md: 12px;
      --ui-radius-lg: 16px;
      --ui-surface: rgba(10, 16, 28, .94);
      --ui-surface-2: rgba(18, 27, 43, .96);
      --ui-line: rgba(148, 163, 184, .18);
      --ui-line-strong: rgba(0, 240, 255, .32);
      --ui-text: #f8fafc;
      --ui-muted: #94a3b8;
      --ui-touch: 44px;
    }

    #game-container {
      isolation: isolate;
      padding: 0;
    }

    button, [role="button"] {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    button:focus-visible, [role="button"]:focus-visible {
      outline: 2px solid var(--neon-cyan, #00f0ff);
      outline-offset: 2px;
    }

    /* 游戏 HUD：信息层级从“堆数据”改成“状态优先”。 */
    #top-hud {
      padding-top: var(--ui-safe-top) !important;
      padding-left: var(--ui-safe-left) !important;
      padding-right: var(--ui-safe-right) !important;
    }

    #bottom-hud {
      padding-left: var(--ui-safe-left) !important;
      padding-right: var(--ui-safe-right) !important;
      padding-bottom: calc(10px + var(--ui-safe-bottom)) !important;
    }

    .hud-badge, .icon-btn {
      min-height: var(--ui-touch);
    }

    .icon-btn {
      min-width: var(--ui-touch);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    /* 首页大厅：手机优先，桌面端保持窄屏游戏舞台感。 */
    #home-lobby {
      position: absolute !important;
      inset: 0 !important;
      z-index: 160 !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      padding: var(--ui-safe-top) var(--ui-safe-right) var(--ui-safe-bottom) var(--ui-safe-left) !important;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background:
        radial-gradient(circle at 50% 15%, rgba(0,240,255,.08), transparent 35%),
        linear-gradient(180deg, #07101b 0%, #050913 52%, #03050a 100%);
    }

    #home-lobby .lobby-header {
      flex: 0 0 auto;
      min-height: 56px;
      padding: 6px 2px 10px !important;
      gap: 8px !important;
    }

    #home-lobby .lobby-commander-box,
    #home-lobby .lobby-currencies {
      min-height: 44px;
    }

    #home-lobby .lobby-currencies {
      gap: 5px !important;
      overflow-x: auto;
      scrollbar-width: none;
    }
    #home-lobby .lobby-currencies::-webkit-scrollbar { display: none; }

    #home-lobby .lobby-pill {
      min-height: 38px;
      padding: 0 9px !important;
      border-radius: 11px !important;
      white-space: nowrap;
    }

    #home-lobby .lobby-content-container {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      overflow: hidden auto !important;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      padding: 0 2px 12px !important;
    }

    #home-lobby .lobby-tab-view {
      min-height: 100%;
      padding-bottom: 12px;
      animation: kpUiPageIn .18s ease-out;
    }

    #home-lobby .lobby-bottom-nav {
      flex: 0 0 auto;
      min-height: 64px;
      padding: 6px 2px calc(5px + var(--ui-safe-bottom)) !important;
      gap: 3px !important;
      background: rgba(5, 9, 17, .96) !important;
      border-top: 1px solid var(--ui-line) !important;
      box-shadow: 0 -10px 30px rgba(0,0,0,.25);
      z-index: 5;
    }

    #home-lobby .nav-tab-btn {
      flex: 1 1 0;
      min-width: 44px;
      min-height: 50px;
      border-radius: 10px !important;
      padding: 5px 2px !important;
      position: relative;
    }

    #home-lobby .nav-tab-btn.active::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 22%;
      right: 22%;
      height: 2px;
      border-radius: 2px;
      background: var(--neon-cyan, #00f0ff);
      box-shadow: 0 0 10px rgba(0,240,255,.65);
    }

    #home-lobby .nav-tab-icon { font-size: 19px !important; line-height: 20px; }
    #home-lobby .nav-tab-label { font-size: 10px !important; margin-top: 2px; }

    /* 首页 CTA 永远保留一个明确的主操作，其余动作降级。 */
    #home-lobby .lobby-battle-cta-wrap {
      position: sticky;
      bottom: 0;
      padding: 10px 0 6px;
      background: linear-gradient(180deg, transparent, rgba(5,9,17,.96) 35%);
    }

    #home-lobby .lobby-battle-btn {
      min-height: 52px;
      border-radius: 14px !important;
      box-shadow: 0 8px 26px rgba(0, 240, 255, .16);
      letter-spacing: .4px;
    }

    /* 列表/卡片：减少视觉噪音，统一点击目标。 */
    #home-lobby .section-header {
      padding: 8px 2px 10px !important;
    }
    #home-lobby .section-title { font-size: 17px !important; }
    #home-lobby .section-subtitle { line-height: 1.45; }

    #home-lobby .filter-bar {
      position: sticky;
      top: 0;
      z-index: 3;
      padding: 6px 0 9px !important;
      margin-bottom: 2px;
      background: linear-gradient(180deg, #07101b 70%, transparent);
      overflow-x: auto;
      scrollbar-width: none;
    }
    #home-lobby .filter-bar::-webkit-scrollbar { display: none; }
    #home-lobby .filter-pill {
      min-height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      padding: 0 13px !important;
    }

    /* 弹窗采用 bottom-sheet，移动端更容易操作；宽屏恢复居中卡片。 */
    #home-lobby #lobby-item-modal,
    #home-lobby #lobby-crate-modal {
      position: fixed !important;
      inset: 0 !important;
      z-index: 20;
      padding: 16px var(--ui-safe-right) calc(16px + var(--ui-safe-bottom)) var(--ui-safe-left);
      display: none;
      align-items: flex-end;
      justify-content: center;
      background: rgba(0,0,0,.62);
      backdrop-filter: blur(7px);
    }

    /* 通用游戏弹窗的安全区与可滚动内容。 */
    #upgrade-modal, #gameover-modal, #stage-select-modal, #stage-clear-modal, #rune-forge-modal {
      padding: var(--ui-safe-top) var(--ui-safe-right) var(--ui-safe-bottom) var(--ui-safe-left) !important;
      overscroll-behavior: contain;
    }

    #upgrade-modal .cards-container,
    #gameover-modal .report-card,
    #stage-select-modal > *, #stage-clear-modal > *, #rune-forge-modal > * {
      max-height: calc(100dvh - var(--ui-safe-top) - var(--ui-safe-bottom) - 24px);
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .primary-btn, .reroll-btn, .cheat-btn {
      min-height: 44px;
    }

    @keyframes kpUiPageIn {
      from { opacity: .65; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (min-width: 700px) {
      #home-lobby { padding-left: 18px !important; padding-right: 18px !important; }
      #home-lobby .lobby-content-container { max-width: 520px; width: 100%; margin: 0 auto; }
      #home-lobby .lobby-header, #home-lobby .lobby-bottom-nav { max-width: 520px; width: 100%; margin-left: auto; margin-right: auto; }
    }

    @media (max-width: 380px) {
      #home-lobby .nav-tab-icon { font-size: 17px !important; }
      #home-lobby .nav-tab-label { font-size: 9px !important; }
      #home-lobby .lobby-pill { padding-left: 7px !important; padding-right: 7px !important; font-size: 10px !important; }
      #home-lobby .lobby-battle-btn { min-height: 48px; font-size: 14px !important; }
    }

    @media (orientation: landscape) and (max-height: 520px) {
      #home-lobby .lobby-header { min-height: 48px; padding-bottom: 5px !important; }
      #home-lobby .lobby-bottom-nav { min-height: 54px; }
      #home-lobby .nav-tab-btn { min-height: 43px; }
      #home-lobby .nav-tab-icon { font-size: 16px !important; }
      #home-lobby .lobby-battle-btn { min-height: 44px; }
    }

    @media (prefers-reduced-motion: reduce) {
      #home-lobby .lobby-tab-view { animation: none; }
      *, *::before, *::after { scroll-behavior: auto !important; }
    }
  `;
  document.head.appendChild(style);
}

function setTouchTargets(root) {
  if (!root) return;
  root.querySelectorAll('button').forEach((button) => {
    button.style.webkitTapHighlightColor = 'transparent';
    if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
      button.setAttribute('aria-label', '操作');
    }
  });
}

function installScreenState(game) {
  if (!game || game.__uiUxInstalled) return;
  game.__uiUxInstalled = true;
  game.uiState = {
    stack: ['game'],
    push(screen) {
      if (!screen) return;
      this.stack.push(screen);
      game.isPaused = true;
    },
    pop() {
      if (this.stack.length > 1) this.stack.pop();
      if (this.stack.length === 1 && !game.isGameOver && !game.isUpgrading) game.isPaused = false;
      return this.stack[this.stack.length - 1];
    },
    current() { return this.stack[this.stack.length - 1]; }
  };
  window.gameUIState = game.uiState;
}

export function installGameUIUX(game = null) {
  injectStyles();
  setTouchTargets(document.getElementById('game-container') || document.body);
  if (game) installScreenState(game);
}
