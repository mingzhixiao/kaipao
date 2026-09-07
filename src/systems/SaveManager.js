// ---------------- 本地持久化：战报 + 关卡进度 + 符文 + 宠物 + 枪械 + 指挥官 ----------------

const SAVE_KEY = 'kaipao_roguelike_save_v3';

export class SaveManager {
  constructor() { this.data = this.load(); }

  getDefaultData() {
    return {
      highWave: 1, maxKills: 0, totalKills: 0, totalRuns: 0, maxSurvivalTime: 0,
      unlockedSynergies: [], lastPlayed: Date.now(), scrap: 150, gems: 120,
      energy: 50, maxEnergy: 50,
      commanderLevel: 1, commanderExp: 0,
      highestStageCleared: 0, unlockedStage: 1, equippedStage: 1,
      runeLevels: {}, totalStagesCleared: 0,
      petData: {
        selected: 'fluffy',
        pets: {
          fluffy: { unlocked: true, level: 1 },
          dragon: { unlocked: false, level: 1, unlockCost: 200 }
        }
      },
      weaponData: {
        equipped: 'assault',
        weapons: {
          assault: { unlocked: true, level: 1 },
          gatling: { unlocked: true, level: 1 },
          gauss: { unlocked: false, level: 1, unlockCost: 160 },
          plasma: { unlocked: false, level: 1, unlockCost: 260 }
        }
      },
      skillData: {
        levels: {
          rocket: 1, truck: 1, freeze: 1,
          tornado: 1, boomerang: 1, laser: 1, bomber: 1
        }
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        const legacyV2 = localStorage.getItem('kaipao_roguelike_save_v2');
        if (legacyV2) return this.mergeDefaults(JSON.parse(legacyV2));
        const legacyV1 = localStorage.getItem('kaipao_roguelike_save_v1');
        if (legacyV1) return this.mergeDefaults(JSON.parse(legacyV1));
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
    merged.weaponData = { ...defaults.weaponData, ...(data?.weaponData || {}) };
    merged.weaponData.weapons = { ...defaults.weaponData.weapons, ...(data?.weaponData?.weapons || {}) };
    merged.skillData = { ...defaults.skillData, ...(data?.skillData || {}) };
    merged.skillData.levels = { ...defaults.skillData.levels, ...(data?.skillData?.levels || {}) };
    return merged;
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
    if ((run.wave || 1) > this.data.highWave) { this.data.highWave = run.wave; isNewRecord = true; }
    if ((run.kills || 0) > this.data.maxKills) this.data.maxKills = run.kills;
    if ((run.survivalTime || 0) > this.data.maxSurvivalTime) this.data.maxSurvivalTime = run.survivalTime;
    if (run.synergies) {
      Object.entries(run.synergies).forEach(([key, val]) => {
        if (val && !this.data.unlockedSynergies.includes(key)) this.data.unlockedSynergies.push(key);
      });
    }
    this.addCommanderExp(Math.round((run.kills || 0) * 1.5 + (run.wave || 1) * 8));
    this.save();
    return { isNewRecord, highWave: this.data.highWave, maxKills: this.data.maxKills, totalRuns: this.data.totalRuns };
  }

  recordStageClear(stageId, scrapEarned) {
    this.data.totalStagesCleared = (this.data.totalStagesCleared || 0) + 1;
    if (stageId > (this.data.highestStageCleared || 0)) this.data.highestStageCleared = stageId;
    if (stageId >= (this.data.unlockedStage || 1)) this.data.unlockedStage = Math.min(8, stageId + 1);
    this.addScrap(scrapEarned);
    this.addGems(15 + stageId * 5);
    this.addCommanderExp(50 + stageId * 25);
    this.save();
    return { scrap: this.data.scrap, unlockedStage: this.data.unlockedStage, highestStageCleared: this.data.highestStageCleared };
  }

  // 货币与能量
  addScrap(amount) { this.data.scrap = (this.data.scrap || 0) + Math.max(0, Math.round(amount)); this.save(); return this.data.scrap; }
  spendScrap(amount) { amount = Math.round(amount); if ((this.data.scrap || 0) < amount) return false; this.data.scrap -= amount; this.save(); return true; }
  getScrap() { return this.data.scrap || 0; }

  addGems(amount) { this.data.gems = (this.data.gems || 0) + Math.max(0, Math.round(amount)); this.save(); return this.data.gems; }
  spendGems(amount) { amount = Math.round(amount); if ((this.data.gems || 0) < amount) return false; this.data.gems -= amount; this.save(); return true; }
  getGems() { return this.data.gems || 0; }

  getEnergy() { return this.data.energy ?? 50; }
  getMaxEnergy() { return this.data.maxEnergy || 50; }
  useEnergy(amount = 5) {
    if ((this.data.energy || 0) < amount) return false;
    this.data.energy -= amount;
    this.save();
    return true;
  }
  refillEnergy() {
    this.data.energy = this.data.maxEnergy || 50;
    this.save();
  }

  // 指挥官等级与经验
  getCommanderLevel() { return this.data.commanderLevel || 1; }
  getCommanderExp() { return this.data.commanderExp || 0; }
  getExpForNextLevel() { return (this.data.commanderLevel || 1) * 80 + 40; }
  addCommanderExp(amount) {
    this.data.commanderExp = (this.data.commanderExp || 0) + amount;
    let needed = this.getExpForNextLevel();
    while (this.data.commanderExp >= needed && this.data.commanderLevel < 60) {
      this.data.commanderExp -= needed;
      this.data.commanderLevel++;
      this.addGems(20);
      needed = this.getExpForNextLevel();
    }
    this.save();
  }

  // 符文
  getRuneLevels() { return this.data.runeLevels || {}; }
  setRuneLevel(id, level) { if (!this.data.runeLevels) this.data.runeLevels = {}; this.data.runeLevels[id] = level; this.save(); }

  // 关卡
  getUnlockedStage() { return this.data.unlockedStage || 1; }
  getEquippedStage() { return this.data.equippedStage || 1; }
  setEquippedStage(stageId) { this.data.equippedStage = Math.max(1, stageId); this.save(); }

  // 宠物
  getPetData() { return this.data.petData; }
  setSelectedPet(id) { this.data.petData.selected = id || null; this.save(); }
  upgradePet(id, cost) {
    const pet = this.data.petData.pets[id];
    if (!pet || !pet.unlocked) return false;
    if (!this.spendScrap(cost)) return false;
    pet.level = (pet.level || 1) + 1;
    this.save();
    return true;
  }
  unlockPet(id, cost) {
    const pet = this.data.petData.pets[id];
    if (!pet || pet.unlocked) return false;
    if (!this.spendGems(cost)) return false;
    pet.unlocked = true;
    this.save();
    return true;
  }

  // 枪械
  getWeaponData() { return this.data.weaponData; }
  getEquippedWeapon() { return this.data.weaponData.equipped || 'assault'; }
  equipWeapon(id) {
    if (!this.data.weaponData.weapons[id]?.unlocked) return false;
    this.data.weaponData.equipped = id;
    this.save();
    return true;
  }
  upgradeWeapon(id, cost) {
    const w = this.data.weaponData.weapons[id];
    if (!w || !w.unlocked) return false;
    if (!this.spendScrap(cost)) return false;
    w.level = (w.level || 1) + 1;
    this.save();
    return true;
  }
  unlockWeapon(id, cost) {
    const w = this.data.weaponData.weapons[id];
    if (!w || w.unlocked) return false;
    if (!this.spendGems(cost)) return false;
    w.unlocked = true;
    this.save();
    return true;
  }

  // 技能专精
  getSkillData() { return this.data.skillData; }
  upgradeSkillMastery(id, cost) {
    if (!this.spendScrap(cost)) return false;
    this.data.skillData.levels[id] = (this.data.skillData.levels[id] || 1) + 1;
    this.save();
    return true;
  }

  // 综合战力评分
  calcCombatPower() {
    let power = 1000 + (this.getCommanderLevel() - 1) * 85;
    // 武器战力
    const equippedW = this.getEquippedWeapon();
    const wLevel = this.data.weaponData.weapons[equippedW]?.level || 1;
    power += wLevel * 120;
    // 符文战力
    const runeLevels = this.getRuneLevels();
    for (const lv of Object.values(runeLevels)) power += lv * 45;
    // 宠物战力
    const selectedPet = this.data.petData.selected;
    if (selectedPet) {
      const pLevel = this.data.petData.pets[selectedPet]?.level || 1;
      power += pLevel * 90;
    }
    // 技能专精
    for (const lv of Object.values(this.data.skillData.levels)) power += (lv - 1) * 35;
    return Math.round(power);
  }

  getStats() { return this.data; }
}

export const saveManager = new SaveManager();
