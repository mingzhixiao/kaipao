// ---------------- 本地持久化：战报 + 关卡进度 + 符文碎片 + 宠物 ----------------

const SAVE_KEY = 'kaipao_roguelike_save_v2';

export class SaveManager {
  constructor() { this.data = this.load(); }

  getDefaultData() {
    return {
      highWave: 1, maxKills: 0, totalKills: 0, totalRuns: 0, maxSurvivalTime: 0,
      unlockedSynergies: [], lastPlayed: Date.now(), scrap: 0,
      highestStageCleared: 0, unlockedStage: 1, runeLevels: {}, totalStagesCleared: 0,
      petData: {
        selected: null,
        pets: {
          fluffy: { unlocked: true, level: 1 },
          dragon: { unlocked: false, level: 1 }
        }
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        const legacy = localStorage.getItem('kaipao_roguelike_save_v1');
        if (legacy) return this.mergeDefaults(JSON.parse(legacy));
        return this.getDefaultData();
      }
      return this.mergeDefaults(JSON.parse(raw));
    } catch (e) {
      console.warn('[SaveManager] Failed to read save data:', e);
      return this.getDefaultData();
    }
  }

  mergeDefaults(data) {
    const defaults = this.getDefaultData();
    const merged = { ...defaults, ...data };
    merged.petData = { ...defaults.petData, ...(data?.petData || {}) };
    merged.petData.pets = { ...defaults.petData.pets, ...(data?.petData?.pets || {}) };
    return merged;
  }

  save() {
    try { this.data.lastPlayed = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); }
    catch (e) { console.warn('[SaveManager] Failed to write save data:', e); }
  }

  recordRun(run) {
    this.data.totalRuns++; this.data.totalKills += (run.kills || 0);
    let isNewRecord = false;
    if ((run.wave || 1) > this.data.highWave) { this.data.highWave = run.wave; isNewRecord = true; }
    if ((run.kills || 0) > this.data.maxKills) this.data.maxKills = run.kills;
    if ((run.survivalTime || 0) > this.data.maxSurvivalTime) this.data.maxSurvivalTime = run.survivalTime;
    if (run.synergies) Object.entries(run.synergies).forEach(([key, val]) => { if (val && !this.data.unlockedSynergies.includes(key)) this.data.unlockedSynergies.push(key); });
    this.save();
    return { isNewRecord, highWave: this.data.highWave, maxKills: this.data.maxKills, totalRuns: this.data.totalRuns };
  }

  recordStageClear(stageId, scrapEarned) {
    this.data.totalStagesCleared = (this.data.totalStagesCleared || 0) + 1;
    if (stageId > (this.data.highestStageCleared || 0)) this.data.highestStageCleared = stageId;
    if (stageId >= (this.data.unlockedStage || 1)) this.data.unlockedStage = Math.min(8, stageId + 1);
    this.addScrap(scrapEarned); this.save();
    return { scrap: this.data.scrap, unlockedStage: this.data.unlockedStage, highestStageCleared: this.data.highestStageCleared };
  }

  addScrap(amount) { this.data.scrap = (this.data.scrap || 0) + Math.max(0, Math.round(amount)); this.save(); return this.data.scrap; }
  spendScrap(amount) { amount = Math.round(amount); if ((this.data.scrap || 0) < amount) return false; this.data.scrap -= amount; this.save(); return true; }
  getScrap() { return this.data.scrap || 0; }
  getRuneLevels() { return this.data.runeLevels || {}; }
  setRuneLevel(id, level) { if (!this.data.runeLevels) this.data.runeLevels = {}; this.data.runeLevels[id] = level; this.save(); }
  getUnlockedStage() { return this.data.unlockedStage || 1; }
  getPetData() { return this.data.petData; }
  setSelectedPet(id) { this.data.petData.selected = id || null; this.save(); }
  getStats() { return this.data; }
}

export const saveManager = new SaveManager();
