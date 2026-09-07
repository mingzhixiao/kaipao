// ---------------- 本地持久化与战报存储系统 (Local Storage & Player Progression) ----------------

const SAVE_KEY = 'kaipao_roguelike_save_v1';

export class SaveManager {
  constructor() {
    this.data = this.load();
  }

  getDefaultData() {
    return {
      highWave: 1,
      maxKills: 0,
      totalKills: 0,
      totalRuns: 0,
      maxSurvivalTime: 0,
      unlockedSynergies: [],
      lastPlayed: Date.now()
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return this.getDefaultData();
      return { ...this.getDefaultData(), ...JSON.parse(raw) };
    } catch (e) {
      console.warn('[SaveManager] Failed to read save data:', e);
      return this.getDefaultData();
    }
  }

  save() {
    try {
      this.data.lastPlayed = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[SaveManager] Failed to write save data:', e);
    }
  }

  recordRun(run) {
    this.data.totalRuns++;
    this.data.totalKills += (run.kills || 0);

    let isNewRecord = false;
    if ((run.wave || 1) > this.data.highWave) {
      this.data.highWave = run.wave;
      isNewRecord = true;
    }
    if ((run.kills || 0) > this.data.maxKills) {
      this.data.maxKills = run.kills;
    }
    if ((run.survivalTime || 0) > this.data.maxSurvivalTime) {
      this.data.maxSurvivalTime = run.survivalTime;
    }

    // 记录解锁的协同反应
    if (run.synergies) {
      Object.entries(run.synergies).forEach(([key, val]) => {
        if (val && !this.data.unlockedSynergies.includes(key)) {
          this.data.unlockedSynergies.push(key);
        }
      });
    }

    this.save();
    return {
      isNewRecord,
      highWave: this.data.highWave,
      maxKills: this.data.maxKills,
      totalRuns: this.data.totalRuns
    };
  }

  getStats() {
    return this.data;
  }
}

export const saveManager = new SaveManager();
