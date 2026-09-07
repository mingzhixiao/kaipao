// ---------------- 统一视听反馈层 (Feedback Manager: 符合 game-dev-skills 解耦规范) ----------------
export class FeedbackManager {
  constructor(soundEngine) {
    this.sound = soundEngine;
    this.trauma = 0;             // 创伤指数 (0.0 ~ 1.0)
    this.traumaDecay = 1.45;     // 创伤每秒衰减速率
    this.maxShakeOffset = 24;    // 最大震屏位移像素
    this.maxShakeAngle = 0.055;  // 最大旋转晃动弧度
    this.hitStopTimer = 0;       // 微顿帧 (HitStop) 时钟
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  triggerHitStop(duration = 0.035) {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  update(dt) {
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * this.traumaDecay);
    }
  }

  getShake() {
    if (this.trauma <= 0) return { x: 0, y: 0, angle: 0 };
    // 平方衰减创伤模型 (Quadratic Trauma Decay): 震幅 = trauma^2 * maxShake
    const s = this.trauma * this.trauma;
    return {
      x: (Math.random() * 2 - 1) * this.maxShakeOffset * s,
      y: (Math.random() * 2 - 1) * this.maxShakeOffset * s,
      angle: (Math.random() * 2 - 1) * this.maxShakeAngle * s
    };
  }
}
