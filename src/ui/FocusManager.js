// ---------------- 焦点导航系统 (FocusManager) ----------------
// 遵循 game-ui-ux 技能原则：让手柄与键盘也能流畅操作，支持三卡选择、技能释放与焦点捕获

export class FocusManager {
  constructor() {
    this.currentUpgradeIndex = 1; // 默认聚焦中间卡片 (0, 1, 2)
    this.gamepadConnected = false;
    this.lastGamepadPoll = 0;
    this.initKeyboardNavigation();
    this.initGamepadSupport();
  }

  initKeyboardNavigation() {
    window.addEventListener('keydown', (e) => {
      // 1. 战略升级卡片弹窗聚焦导航
      const upgradeModal = document.getElementById('upgrade-modal');
      const isUpgrading = upgradeModal && upgradeModal.style.display === 'flex';

      if (isUpgrading) {
        const cards = Array.from(upgradeModal.querySelectorAll('.upgrade-card'));
        if (cards.length > 0) {
          if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            this.currentUpgradeIndex = (this.currentUpgradeIndex - 1 + cards.length) % cards.length;
            this.highlightUpgradeCard(cards);
            return;
          }
          if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            e.preventDefault();
            this.currentUpgradeIndex = (this.currentUpgradeIndex + 1) % cards.length;
            this.highlightUpgradeCard(cards);
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const targetCard = cards[this.currentUpgradeIndex];
            if (targetCard) targetCard.click();
            return;
          }
          if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            const btnReroll = document.getElementById('btn-reroll');
            if (btnReroll && !btnReroll.disabled) btnReroll.click();
            return;
          }
        }
      }

      // 2. 战斗中快捷键释放技能 (1, 2, 3, 4)
      if (['1', '2', '3', '4'].includes(e.key) && !isUpgrading) {
        const slotIdx = parseInt(e.key, 10) - 1;
        const slot = document.getElementById(`kp-slot-${slotIdx}`);
        if (slot && !slot.classList.contains('empty')) {
          slot.click();
          slot.classList.add('key-activated');
          setTimeout(() => slot.classList.remove('key-activated'), 150);
        }
      }
    });
  }

  setupUpgradeCardFocus() {
    const upgradeModal = document.getElementById('upgrade-modal');
    if (!upgradeModal) return;
    this.currentUpgradeIndex = 1; // 默认聚焦在中间卡片
    const apply = () => {
      const cards = Array.from(upgradeModal.querySelectorAll('.upgrade-card'));
      if (cards.length > 0) {
        this.highlightUpgradeCard(cards);
      }
    };
    apply();
    requestAnimationFrame(apply);
  }

  highlightUpgradeCard(cards) {
    cards.forEach((card, idx) => {
      const isFocused = idx === this.currentUpgradeIndex;
      card.classList.toggle('ui-focus-active', isFocused);
      card.setAttribute('aria-selected', isFocused ? 'true' : 'false');
      if (isFocused) {
        card.focus();
      }
    });
  }

  initGamepadSupport() {
    this._gamepadRaf = 0;

    window.addEventListener('gamepadconnected', (e) => {
      console.log('[FocusManager] Gamepad connected:', e.gamepad.id);
      this.gamepadConnected = true;
      this._startGamepadPoll();
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadConnected = false;
      // 没有手柄时不该再占着一帧一次的回调：绝大多数玩家全程都用不到它
      this._stopGamepadPoll();
    });
  }

  _startGamepadPoll() {
    if (this._gamepadRaf) return;
    const pollGamepad = () => {
      this._gamepadRaf = 0;
      if (!this.gamepadConnected) return;
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      if (gp) {
        const now = performance.now();
        if (now - this.lastGamepadPoll > 200) { // 200ms 防抖
          // D-Pad Left or Stick Left
          if (gp.buttons[14]?.pressed || gp.axes[0] < -0.5) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
            this.lastGamepadPoll = now;
          }
          // D-Pad Right or Stick Right
          else if (gp.buttons[15]?.pressed || gp.axes[0] > 0.5) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
            this.lastGamepadPoll = now;
          }
          // Button A (Cross / Select)
          else if (gp.buttons[0]?.pressed) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            this.lastGamepadPoll = now;
          }
          // Button B (Circle / Cancel)
          else if (gp.buttons[1]?.pressed) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            this.lastGamepadPoll = now;
          }
          // Button X (Square / Reroll)
          else if (gp.buttons[2]?.pressed) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
            this.lastGamepadPoll = now;
          }
        }
      }
      this._gamepadRaf = requestAnimationFrame(pollGamepad);
    };
    this._gamepadRaf = requestAnimationFrame(pollGamepad);
  }

  _stopGamepadPoll() {
    if (this._gamepadRaf) {
      cancelAnimationFrame(this._gamepadRaf);
      this._gamepadRaf = 0;
    }
  }
}

export const focusManager = new FocusManager();
window.focusManager = focusManager;
