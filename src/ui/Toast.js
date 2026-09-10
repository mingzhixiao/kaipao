// ---------------- 轻量浮层提示 (Toast) ----------------
// 大厅原本用 window.alert() 做提示：阻塞主线程、无法套用游戏内视觉风格，
// 在 WebView / 小游戏容器里还会弹出原生对话框、打断操作节奏。
// 这里用底部自动消失的浮层替代，多行文本用 pre-line 保留换行。

const STYLE_ID = 'kp-toast-style';
const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 2200;

let host = null;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #kp-toast-host {
      position: fixed;
      left: 50%;
      bottom: calc(76px + var(--ui-safe-bottom, 0px));
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column-reverse;
      align-items: center;
      gap: 8px;
      width: min(340px, calc(100vw - 32px));
      pointer-events: none;
    }
    .kp-toast {
      max-width: 100%;
      box-sizing: border-box;
      padding: 10px 16px;
      border: 1px solid rgba(56, 189, 248, 0.5);
      border-radius: 10px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.97), rgba(3, 7, 18, 0.97));
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 14px rgba(0, 240, 255, 0.14);
      color: #e2e8f0;
      font-size: 12.5px;
      font-weight: 700;
      line-height: 1.5;
      text-align: center;
      white-space: pre-line;
      animation: kpToastIn .22s ease-out;
    }
    .kp-toast.leaving { animation: kpToastOut .2s ease-in forwards; }
    .kp-toast.warn { border-color: rgba(251, 113, 133, 0.62); }
    .kp-toast.success { border-color: rgba(74, 222, 128, 0.62); }
    @keyframes kpToastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes kpToastOut { to { opacity: 0; transform: translateY(-6px); } }
    @media (prefers-reduced-motion: reduce) {
      .kp-toast, .kp-toast.leaving { animation: none; }
    }
  `;
  document.head.appendChild(style);
}

function ensureHost() {
  if (host && host.isConnected) return host;
  host = document.getElementById('kp-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'kp-toast-host';
    document.body.appendChild(host);
  }
  return host;
}

/**
 * 弹出一条浮层提示。
 * @param {string} message 文本，支持 \n 换行
 * @param {{tone?: 'info'|'warn'|'success', duration?: number}} [options]
 */
export function showToast(message, options = {}) {
  if (message === undefined || message === null || message === '') return;
  if (typeof document === 'undefined') return;

  ensureStyle();
  const el = ensureHost();

  // 连续提示（例如连点按钮）最多保留 MAX_VISIBLE 条，超出时挤掉最旧的一条
  while (el.children.length >= MAX_VISIBLE) el.removeChild(el.firstChild);

  const node = document.createElement('div');
  node.className = options.tone ? `kp-toast ${options.tone}` : 'kp-toast';
  node.setAttribute('role', 'status');
  node.textContent = String(message);
  el.appendChild(node);

  const duration = Number.isFinite(options.duration) ? options.duration : DEFAULT_DURATION;
  setTimeout(() => {
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 220);
  }, Math.max(0, duration));
}
