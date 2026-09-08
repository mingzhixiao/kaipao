// ---------------- 屏幕与弹窗状态栈 (UIStack) ----------------
// 遵循 game-ui-ux 技能原则：用堆栈管理屏幕状态 (Game -> Modal -> Settings)，告别布尔混乱

export class UIStackManager {
  constructor() {
    this.stack = [];
    this.baseScreenId = 'combat';
    this.gameRef = null;
    this.initKeyboardListener();
  }

  setGame(game) {
    this.gameRef = game;
  }

  push(entry) {
    if (!entry || !entry.id) return;

    // 若栈顶已有同 ID，直接返回
    if (this.top()?.id === entry.id) return;

    const previousTop = this.top();
    if (previousTop && previousTop.element) {
      previousTop.element.setAttribute('aria-hidden', 'true');
    }

    const item = {
      id: entry.id,
      element: entry.element || null,
      pauseGame: entry.pauseGame ?? true,
      onOpen: entry.onOpen || null,
      onClose: entry.onClose || null,
      defaultFocus: entry.defaultFocus || null,
      previousFocus: document.activeElement || null
    };

    this.stack.push(item);

    // 打开展示并暂停游戏（若需要）
    if (item.element) {
      item.element.removeAttribute('aria-hidden');
      item.element.style.display = entry.displayType || 'flex';
    }

    if (item.pauseGame && this.gameRef) {
      this.gameRef.isPaused = true;
    }

    if (typeof item.onOpen === 'function') {
      try { item.onOpen(item); } catch (e) { console.error(e); }
    }

    // 焦点引导
    if (item.defaultFocus) {
      requestAnimationFrame(() => {
        if (typeof item.defaultFocus === 'function') {
          const el = item.defaultFocus();
          if (el && typeof el.focus === 'function') el.focus();
        } else if (item.defaultFocus.focus) {
          item.defaultFocus.focus();
        }
      });
    }

    return item;
  }

  pop() {
    if (this.stack.length === 0) return null;

    const currentTop = this.stack.pop();
    if (currentTop) {
      if (typeof currentTop.onClose === 'function') {
        try { currentTop.onClose(currentTop); } catch (e) { console.error(e); }
      }
      if (currentTop.element) {
        currentTop.element.style.display = 'none';
        currentTop.element.setAttribute('aria-hidden', 'true');
      }
      // 归还焦点
      if (currentTop.previousFocus && typeof currentTop.previousFocus.focus === 'function') {
        try { currentTop.previousFocus.focus(); } catch (_) {}
      }
    }

    const newTop = this.top();
    if (newTop && newTop.element) {
      newTop.element.removeAttribute('aria-hidden');
    }

    // 若堆栈已清空，且非GameOver/非升级，恢复游戏
    if (this.stack.length === 0 && this.gameRef) {
      if (!this.gameRef.isGameOver && !this.gameRef.isUpgrading) {
        this.gameRef.isPaused = false;
      }
    }

    return currentTop;
  }

  top() {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  has(id) {
    return this.stack.some(item => item.id === id);
  }

  clear() {
    while (this.stack.length > 0) {
      this.pop();
    }
  }

  initKeyboardListener() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (this.stack.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          this.pop();
        }
      }
    }, true);
  }
}

export const uiStack = new UIStackManager();
window.uiStack = uiStack;
