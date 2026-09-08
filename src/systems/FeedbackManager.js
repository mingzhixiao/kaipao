// ---------------- 统一视听反馈层 (Feedback Manager: 遵循 game-feel 技能标准) ----------------
export class FeedbackManager {
  constructor(soundEngine) {
    this.sound = soundEngine;
    this.trauma = 0;             // 创伤指数 (0.0 ~ 1.0)
    this.traumaDecay = 2.2;      // 创伤每秒衰减速率 (平滑快速归位)
    this.maxShakeOffset = 6.5;   // Canvas 视口内平滑微震颤最大位移 (保证打击感强烈且平滑)
    this.hitStopTimer = 0;       // 微顿帧 (HitStop) 时钟
    this._t = 0;                 // 连续平滑正弦采样时间戳
  }

  /** 叠加创伤指数 (二次方模型：轻击几乎无感，重磅爆炸打击感十足) */
  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  /**
   * 触发受击定格/顿帧 (Hit-Stop: game-feel 技能经典冲击呈现)
   * @param {number} duration - 顿帧秒数 (常规 0.02s~0.06s，上限 0.08s 防止操作阻滞)
   */
  triggerHitStop(duration = 0.025) {
    const safeDuration = Math.min(0.08, duration);
    this.hitStopTimer = Math.max(this.hitStopTimer, safeDuration);
  }

  update(dt) {
    this._t += dt * 32.0;
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * this.traumaDecay);
    }
  }

  /**
   * 基于 shake = trauma^2 的平滑震动采样 (game-feel Pattern 1)
   * 采用双频正弦连续采样，而非高频白噪声乱抖，保证高级质感
   */
  getShake() {
    if (this.trauma <= 0.001) {
      return { x: 0, y: 0, angle: 0 };
    }
    const shake = this.trauma * this.trauma;
    const x = this.maxShakeOffset * shake * Math.sin(this._t * 1.7);
    const y = this.maxShakeOffset * shake * Math.sin(this._t * 2.3);
    return { x, y, angle: 0 };
  }
}

