// ---------------- 本地持久化：战报 + 关卡进度 + 符文 + 宠物 + 枪械 + 背包素材 + 指挥官 ----------------
import { GAME_CONFIG } from '../core/Config.js';

const SAVE_KEY = 'kaipao_roguelike_save_v4';

export class SaveManager {
  constructor() { this.data = this.load(); }

  getDefaultData() {
    return {
      highWave: 1, maxKills: 0, totalKills: 0, totalRuns: 0, maxSurvivalTime: 0,
      unlockedSynergies: [], lastPlayed: Date.now(), scrap: 200, gems: 150,
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
        equipped: ['rocket', 'truck', 'freeze', 'tornado'],
        levels: {
          rocket: 1, truck: 1, freeze: 1,
          tornado: 1, boomerang: 1, laser: 1, bomber: 1
        }
      },
      inventory: {
        // 枪械专属配件
        assault_part: 18,
        gatling_part: 12,
        gauss_part: 8,
        plasma_part: 6,
        // 宠物专属基因
        fluffy_shard: 15,
        dragon_shard: 6,
        // 技能专属芯片
        chip_rocket: 10,
        chip_truck: 8,
        chip_freeze: 12,
        chip_tornado: 6,
        chip_boomerang: 9,
        chip_laser: 5,
        chip_bomber: 6,
        // 补给物资
        energy_potion: 3,
        supply_crate: 2
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        const legacyV3 = localStorage.getItem('kaipao_roguelike_save_v3');
        if (legacyV3) return this.mergeDefaults(JSON.parse(legacyV3));
        const legacyV2 = localStorage.getItem('kaipao_roguelike_save_v2');
        if (legacyV2) return this.mergeDefaults(JSON.parse(legacyV2));
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
    if (!Array.isArray(merged.skillData.equipped) || merged.skillData.equipped.length === 0) {
      merged.skillData.equipped = [...defaults.skillData.equipped];
    }
    merged.inventory = { ...defaults.inventory, ...(data?.inventory || {}) };
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

  // 战斗结束后自动统一结算战利品与物资 (无场内掉落物)
  settleBattleLoot(loot, isVictory = false, stageId = 1) {
    if (!loot) loot = { scrap: 0, gems: 0, items: {} };
    const scrapEarned = Math.max(0, Math.round(loot.scrap || 0));
    const gemsEarned = Math.max(0, Math.round(loot.gems || 0));
    const itemsEarned = { ...(loot.items || {}) };

    if (scrapEarned > 0) this.addScrap(scrapEarned);
    if (gemsEarned > 0) this.addGems(gemsEarned);
    Object.entries(itemsEarned).forEach(([itemId, count]) => {
      if (count > 0) this.addItem(itemId, count);
    });

    this.save();
    return {
      scrap: scrapEarned,
      gems: gemsEarned,
      items: itemsEarned,
      totalScrap: this.getScrap(),
      totalGems: this.getGems()
    };
  }

  recordStageClear(stageId, scrapEarned = 0) {
    this.data.totalStagesCleared = (this.data.totalStagesCleared || 0) + 1;
    if (stageId > (this.data.highestStageCleared || 0)) this.data.highestStageCleared = stageId;
    if (stageId >= (this.data.unlockedStage || 1)) this.data.unlockedStage = Math.min(8, stageId + 1);
    if (scrapEarned > 0) this.addScrap(scrapEarned);
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

  getEnergy() {
    const now = Date.now();
    const last = this.data.lastEnergyRefresh || now;
    const diffSec = Math.floor((now - last) / 1000);
    if (diffSec >= 60) {
      const regen = Math.floor(diffSec / 60) * 2; // 每分钟恢复 2 点
      this.data.energy = Math.min(this.data.maxEnergy || 50, (this.data.energy || 0) + regen);
      this.data.lastEnergyRefresh = now;
      this.save();
    }
    // 保底：若体能低于 15，自动恢复到 35，保障顺畅体验
    if ((this.data.energy || 0) < 15) {
      this.data.energy = 35;
      this.save();
    }
    return this.data.energy;
  }
  getMaxEnergy() { return this.data.maxEnergy || 50; }
  useEnergy(amount = 5) {
    this.getEnergy();
    if ((this.data.energy || 0) < amount) return false;
    this.data.energy -= amount;
    this.save();
    return true;
  }
  refillEnergy(amount = 25) {
    this.data.energy = Math.min((this.data.maxEnergy || 50) + 50, (this.data.energy || 0) + amount);
    this.save();
    return this.data.energy;
  }

  // 背包物品与专属素材体系
  getInventory() { return this.data.inventory; }
  getItemCount(id) { return this.data.inventory[id] || 0; }
  addItem(id, amount = 1) {
    this.data.inventory[id] = (this.data.inventory[id] || 0) + amount;
    this.save();
    return this.data.inventory[id];
  }
  consumeItem(id, amount = 1) {
    if ((this.data.inventory[id] || 0) < amount) return false;
    this.data.inventory[id] -= amount;
    this.save();
    return true;
  }
  hasItem(id, amount = 1) {
    return (this.data.inventory[id] || 0) >= amount;
  }

  // 开箱军备箱
  openSupplyCrate() {
    if (!this.consumeItem('supply_crate', 1)) return null;

    const droppedScrap = 60 + Math.floor(Math.random() * 60);
    this.addScrap(droppedScrap);

    const weaponPartKeys = ['assault_part', 'gatling_part', 'gauss_part', 'plasma_part'];
    const petShardKeys = ['fluffy_shard', 'dragon_shard'];
    const skillChipKeys = ['chip_rocket', 'chip_truck', 'chip_freeze', 'chip_tornado', 'chip_boomerang', 'chip_laser', 'chip_bomber'];

    const dropped = [];

    // 随机 2 个枪械零件
    const wp1 = weaponPartKeys[Math.floor(Math.random() * weaponPartKeys.length)];
    const cnt1 = 2 + Math.floor(Math.random() * 3);
    this.addItem(wp1, cnt1);
    dropped.push({ id: wp1, count: cnt1 });

    // 随机 1 个宠物碎片
    const p1 = petShardKeys[Math.floor(Math.random() * petShardKeys.length)];
    const cnt2 = 1 + Math.floor(Math.random() * 3);
    this.addItem(p1, cnt2);
    dropped.push({ id: p1, count: cnt2 });

    // 随机 2 个技能芯片
    const sc1 = skillChipKeys[Math.floor(Math.random() * skillChipKeys.length)];
    const cnt3 = 2 + Math.floor(Math.random() * 3);
    this.addItem(sc1, cnt3);
    dropped.push({ id: sc1, count: cnt3 });

    this.save();
    return { scrap: droppedScrap, items: dropped };
  }

  // 使用高能体能药剂
  useEnergyPotion() {
    if (!this.consumeItem('energy_potion', 1)) return false;
    this.refillEnergy(25);
    this.save();
    return true;
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
      this.addGems(25);
      this.addItem('supply_crate', 1);
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

  // 宠物 (消耗专属基因碎片 + 废料)
  getPetData() { return this.data.petData; }
  setSelectedPet(id) { this.data.petData.selected = id || null; this.save(); }
  upgradePet(id, scrapCost, shardCost = 2) {
    const pet = this.data.petData.pets[id];
    if (!pet || !pet.unlocked) return false;
    const materialId = GAME_CONFIG.pets.types[id]?.materialId || `${id}_shard`;
    if (!this.hasItem(materialId, shardCost)) return false;
    if (!this.spendScrap(scrapCost)) return false;
    this.consumeItem(materialId, shardCost);
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

  // 枪械 (消耗专属零件 + 废料)
  getWeaponData() { return this.data.weaponData; }
  getEquippedWeapon() { return this.data.weaponData.equipped || 'assault'; }
  equipWeapon(id) {
    if (!this.data.weaponData.weapons[id]?.unlocked) return false;
    this.data.weaponData.equipped = id;
    this.save();
    return true;
  }
  upgradeWeapon(id, scrapCost, partCost = 3) {
    const w = this.data.weaponData.weapons[id];
    if (!w || !w.unlocked) return false;
    const materialId = GAME_CONFIG.weapons[id]?.materialId || `${id}_part`;
    if (!this.hasItem(materialId, partCost)) return false;
    if (!this.spendScrap(scrapCost)) return false;
    this.consumeItem(materialId, partCost);
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

  // 技能专精 (消耗专属芯片 + 废料)
  getSkillData() { return this.data.skillData; }
  getEquippedSkills() {
    if (!Array.isArray(this.data.skillData?.equipped) || this.data.skillData.equipped.length === 0) {
      if (!this.data.skillData) this.data.skillData = {};
      this.data.skillData.equipped = ['rocket', 'truck', 'freeze', 'tornado'];
      this.save();
    }
    return this.data.skillData.equipped;
  }
  setEquippedSkills(skills) {
    if (Array.isArray(skills) && skills.length > 0) {
      this.data.skillData.equipped = skills.slice(0, 4);
      this.save();
    }
  }
  toggleEquipSkill(id) {
    if (!this.data.skillData.equipped) {
      this.data.skillData.equipped = ['rocket', 'truck', 'freeze', 'tornado'];
    }
    const idx = this.data.skillData.equipped.indexOf(id);
    if (idx >= 0) {
      if (this.data.skillData.equipped.length <= 1) {
        return { success: false, message: '至少需要携带1个技能出战！' };
      }
      this.data.skillData.equipped.splice(idx, 1);
      this.save();
      return { success: true, equipped: false };
    } else {
      if (this.data.skillData.equipped.length >= 4) {
        return { success: false, message: '出战技能位已满（最多4个）！请先卸下其他技能。' };
      }
      this.data.skillData.equipped.push(id);
      this.save();
      return { success: true, equipped: true };
    }
  }
  upgradeSkillMastery(id, scrapCost, chipCost = 2) {
    const materialId = `chip_${id}`;
    if (!this.hasItem(materialId, chipCost)) return false;
    if (!this.spendScrap(scrapCost)) return false;
    this.consumeItem(materialId, chipCost);
    this.data.skillData.levels[id] = (this.data.skillData.levels[id] || 1) + 1;
    this.save();
    return true;
  }

  // 综合战力评分
  calcCombatPower() {
    let power = 1000 + (this.getCommanderLevel() - 1) * 85;
    const equippedW = this.getEquippedWeapon();
    const wLevel = this.data.weaponData.weapons[equippedW]?.level || 1;
    power += wLevel * 120;
    const runeLevels = this.getRuneLevels();
    for (const lv of Object.values(runeLevels)) power += lv * 45;
    const selectedPet = this.data.petData.selected;
    if (selectedPet) {
      const pLevel = this.data.petData.pets[selectedPet]?.level || 1;
      power += pLevel * 90;
    }
    for (const lv of Object.values(this.data.skillData.levels)) power += (lv - 1) * 35;
    return Math.round(power);
  }

  getStats() { return this.data; }
}

export const saveManager = new SaveManager();
