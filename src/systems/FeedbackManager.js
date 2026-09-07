// ---------------- 统一视听反馈层 (Feedback Manager: 符合 game-dev-skills 解耦规范) ----------------
export class FeedbackManager {
  constructor(soundEngine) {
    this.sound = soundEngine;
    this.trauma = 0;             // 创伤指数 (0.0 ~ 1.0)
    this.traumaDecay = 1.45;     // 创伤每秒衰减速率
    this.maxShakeOffset = 0;     // 彻底关闭全屏剧烈晃动，保持画面稳定
    this.maxShakeAngle = 0;      // 关闭画面倾斜旋转
    this.hitStopTimer = 0;       // 微顿帧 (HitStop) 时钟
  }

  addTrauma(amount) {
    // 仅保留适度受击顿挫与音频联动，不再震动整个屏幕
    this.trauma = Math.min(0.5, this.trauma + amount * 0.5);
  }

  triggerHitStop(duration = 0.025) {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  update(dt) {
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 2.5);
    }
  }

  getShake() {
    // 零晃动，防止爆炸时整个视口/界面移位露出黑边
    return { x: 0, y: 0, angle: 0 };
  }
}
