// ---------------- 轻量游戏事件总线 ----------------
// 用于减少 main.js / Game.js 对具体系统的直接耦合，同时保持现有架构兼容。
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (typeof handler !== 'function') return () => {};
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const off = this.on(event, (...args) => {
      off();
      handler(...args);
    });
    return off;
  }

  off(event, handler) {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] ${event} listener failed`, err);
      }
    }
  }

  clear(event = null) {
    if (event === null) this.listeners.clear();
    else this.listeners.delete(event);
  }
}

export const gameEvents = new EventBus();
