// ---------------- 本地持久化：战报 + 关卡进度 + 符文 + 宠物 + 枪械 + 背包素材 + 指挥官 ----------------
import { GAME_CONFIG } from '../core/Config.js';

const SAVE_KEY = 'kaipao_roguelike_save_v5';

export class SaveManager {
  constructor() { this.data = this.load(); }

  getDefaultData() {
    return {
      highWave: 1, maxKills: 0, totalKills: 0, totalRuns: 0, maxSurvivalTime: 0,
      unlockedSynergies: [], lastPlayed: Date.now(), scrap: 80, gems: 0,
      energy: 50, maxEnergy: 50,
      commanderLevel: 1, commanderExp: 0,
      highestStageCleared: 0, unlockedStage: 1, equippedStage: 1,
      currentMode: 'normal', // 'normal' | 'elite'
      clearedEliteStages: [],
      runeLevels: {}, totalStagesCleared: 0,
      // 城防加固科技 (通关第1关解锁)
      fortification: {
        hpLevel: 1,
        shieldLevel: 1,
        regenLevel: 1,
        armorLevel: 1
      },
      // 宠物系统 (通关第3关解锁，需收集基因碎片合成)
      petData: {
        selected: null, // 初始无出战宠物
        pets: {
          fluffy: { unlocked: false, level: 1, unlockCost: 10 },
          dragon: { unlocked: false, level: 1, unlockCost: 10 }
        }
      },
      // 枪械体系 (初始仅先锋步枪)
      weaponData: {
        equipped: 'assault',
        weapons: {
          assault: { unlocked: true, level: 1, powerLevel: 1, bulletSpeedLevel: 1, attackSpeedLevel: 1, magazineLevel: 1 },
          gatling: { unlocked: false, level: 1, powerLevel: 1, bulletSpeedLevel: 1, attackSpeedLevel: 1, magazineLevel: 1, unlockCost: 100 },
          gauss: { unlocked: false, level: 1, powerLevel: 1, bulletSpeedLevel: 1, attackSpeedLevel: 1, magazineLevel: 1, unlockCost: 180 },
          plasma: { unlocked: false, level: 1, powerLevel: 1, bulletSpeedLevel: 1, attackSpeedLevel: 1, magazineLevel: 1, unlockCost: 260 }
        }
      },
      // 技能体系 (初始 0 技能！需收集专属芯片碎片合成解锁)
      skillData: {
        equipped: [], // 初始装备栏全空
        unlocked: {}, // { rocket: false, ... }
        levels: {}    // { rocket: 1, ... }
      },
      // 背包素材 (初始干净，随关卡掉落探索积累)
      inventory: {
        // 枪械配件与三维碎片
        assault_part: 0, gatling_part: 0, gauss_part: 0, plasma_part: 0,
        power_shard: 0, bulletspeed_shard: 0, attackspeed_shard: 0, mag_shard: 0,
        rune_shard: 0,
        // 宠物基因碎片
        fluffy_shard: 0, dragon_shard: 0,
        // 技能芯片
        chip_rocket: 0, chip_freeze: 0, chip_truck: 0,
        chip_tornado: 0, chip_boomerang: 0, chip_laser: 0, chip_bomber: 0,
        // 补给
        energy_potion: 1, supply_crate: 0
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        // 升级自旧版本时，保证新机制的纯净体验
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
    merged.fortification = { ...defaults.fortification, ...(data?.fortification || {}) };
    merged.skillData = { ...defaults.skillData, ...(data?.skillData || {}) };
    merged.skillData.unlocked = { ...(data?.skillData?.unlocked || {}) };
    merged.skillData.levels = { ...(data?.skillData?.levels || {}) };
    merged.skillData.equipped = Array.isArray(data?.skillData?.equipped) ? [...data.skillData.equipped] : [];
    merged.clearedEliteStages = Array.isArray(data?.clearedEliteStages) ? [...data.clearedEliteStages] : [];
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

  recordStageClear(stageId, scrapEarned = 0, mode = 'normal') {
    this.data.totalStagesCleared = (this.data.totalStagesCleared || 0) + 1;
    if (mode === 'elite') {
      if (!Array.isArray(this.data.clearedEliteStages)) this.data.clearedEliteStages = [];
      if (!this.data.clearedEliteStages.includes(stageId)) {
        this.data.clearedEliteStages.push(stageId);
      }
    } else {
      if (stageId > (this.data.highestStageCleared || 0)) this.data.highestStageCleared = stageId;
      if (stageId >= (this.data.unlockedStage || 1)) this.data.unlockedStage = Math.min(8, stageId + 1);
    }
    if (scrapEarned > 0) this.addScrap(scrapEarned);
    this.addCommanderExp(mode === 'elite' ? (80 + stageId * 40) : (50 + stageId * 25));
    this.save();
    return {
      scrap: this.data.scrap,
      unlockedStage: this.data.unlockedStage,
      highestStageCleared: this.data.highestStageCleared,
      clearedEliteStages: this.data.clearedEliteStages
    };
  }

  // 模式与系统解锁
  getMode() { return this.data.currentMode || 'normal'; }
  setMode(mode) { this.data.currentMode = mode === 'elite' ? 'elite' : 'normal'; this.save(); }
  isEliteUnlocked(stageId) {
    return (this.data.highestStageCleared || 0) >= stageId;
  }
  isEliteCleared(stageId) {
    return Array.isArray(this.data.clearedEliteStages) && this.data.clearedEliteStages.includes(stageId);
  }

  isSystemUnlocked(systemKey) {
    const unlocks = GAME_CONFIG.systemUnlocks || {};
    const reqStage = unlocks[systemKey]?.stage ?? 1;
    return (this.data.highestStageCleared || 0) >= reqStage;
  }

  // 城防加固科技系统
  getFortification() {
    if (!this.data.fortification) {
      this.data.fortification = { hpLevel: 1, shieldLevel: 1, regenLevel: 1, armorLevel: 1 };
      this.save();
    }
    return this.data.fortification;
  }
  getFortificationLevel(type) {
    return this.getFortification()[`${type}Level`] || 1;
  }
  getFortificationCost(type) {
    const cfg = GAME_CONFIG.fortressUpgrades?.[type];
    if (!cfg) return 999;
    const curLv = this.getFortificationLevel(type);
    return Math.round(cfg.costBase * Math.pow(cfg.costGrowth, curLv - 1));
  }
  upgradeFortification(type) {
    const cfg = GAME_CONFIG.fortressUpgrades?.[type];
    if (!cfg) return { success: false, message: '未知科技' };
    const curLv = this.getFortificationLevel(type);
    if (curLv >= (cfg.maxLevel || 25)) return { success: false, message: '已升至最高等级！' };
    const cost = this.getFortificationCost(type);
    if (!this.spendScrap(cost)) return { success: false, message: `工业废料不足（需要 ${cost} 废料）` };
    this.data.fortification[`${type}Level`] = curLv + 1;
    this.save();
    return { success: true, newLevel: curLv + 1 };
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

    // 随机 1 组弹匣碎片与符文碎片
    const magCnt = 2 + Math.floor(Math.random() * 3);
    this.addItem('mag_shard', magCnt);
    dropped.push({ id: 'mag_shard', count: magCnt });

    const runeCnt = 2 + Math.floor(Math.random() * 3);
    this.addItem('rune_shard', runeCnt);
    dropped.push({ id: 'rune_shard', count: runeCnt });

    // 随机 1 组力量/射速/攻速碎片
    const shardTypes = ['power_shard', 'bulletspeed_shard', 'attackspeed_shard'];
    const sType = shardTypes[Math.floor(Math.random() * shardTypes.length)];
    const sCnt = 2 + Math.floor(Math.random() * 3);
    this.addItem(sType, sCnt);
    dropped.push({ id: sType, count: sCnt });

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
  // 枪械主等级升级（消耗专属零件 + 废料）同时提升攻击力、射速与攻速
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
    w.level = w.level || 1;
    w.powerLevel = w.powerLevel || 1;
    w.bulletSpeedLevel = w.bulletSpeedLevel || 1;
    w.attackSpeedLevel = w.attackSpeedLevel || 1;
    w.magazineLevel = w.magazineLevel || 1;
    this.save();
    return true;
  }

  // 枪械三维强化等级获取
  getWeaponPowerLevel(id) {
    return this.data.weaponData.weapons[id]?.powerLevel || 1;
  }
  getWeaponBulletSpeedLevel(id) {
    return this.data.weaponData.weapons[id]?.bulletSpeedLevel || 1;
  }
  getWeaponAttackSpeedLevel(id) {
    return this.data.weaponData.weapons[id]?.attackSpeedLevel || 1;
  }
  getWeaponMagazineLevel(id) {
    return this.data.weaponData.weapons[id]?.magazineLevel || 1;
  }

  // 枪械最终综合属性计算（融合主等级 + 力量/射速/攻速/弹匣等级）
  getWeaponDamage(id) {
    const cfg = GAME_CONFIG.weapons[id] || GAME_CONFIG.weapons.assault;
    const w = this.data.weaponData.weapons[id] || { level: 1, powerLevel: 1 };
    const levelBonus = ((w.level || 1) - 1) * (cfg.growth.damagePerLevel || 5);
    const powerBonus = ((w.powerLevel || 1) - 1) * (cfg.growth.damagePerPowerLevel || 4);
    return Math.round(cfg.baseStats.damage + levelBonus + powerBonus);
  }

  getWeaponBulletSpeed(id) {
    const cfg = GAME_CONFIG.weapons[id] || GAME_CONFIG.weapons.assault;
    const w = this.data.weaponData.weapons[id] || { level: 1, bulletSpeedLevel: 1 };
    const levelBonus = ((w.level || 1) - 1) * (cfg.growth.bulletSpeedPerLevel || 15);
    const shardBonus = ((w.bulletSpeedLevel || 1) - 1) * (cfg.growth.bulletSpeedPerShardLevel || 25);
    return Math.round(cfg.baseStats.bulletSpeed + levelBonus + shardBonus);
  }

  getWeaponFireInterval(id) {
    const cfg = GAME_CONFIG.weapons[id] || GAME_CONFIG.weapons.assault;
    const w = this.data.weaponData.weapons[id] || { level: 1, attackSpeedLevel: 1 };
    const base = cfg.baseStats.fireInterval;
    // 枪械主等级提升略微压缩开火间隔（攻速提升）
    const levelFactor = Math.max(0.7, 1 - ((w.level || 1) - 1) * (cfg.growth.fireRatePerLevel || 0.002));
    // 攻速碎片强化进一步压缩开火间隔（攻速强化）
    const shardRatio = cfg.growth.attackSpeedPerShardRatio || 0.03;
    const shardFactor = Math.pow(1 - shardRatio, (w.attackSpeedLevel || 1) - 1);
    const finalInterval = Math.max(0.06, base * levelFactor * shardFactor);
    return parseFloat(finalInterval.toFixed(3));
  }

  getWeaponMagazineCapacity(id) {
    const cfg = GAME_CONFIG.weapons[id] || GAME_CONFIG.weapons.assault;
    const magLevel = this.getWeaponMagazineLevel(id);
    const base = cfg.baseStats.magazineCapacity || 30;
    const growth = cfg.growth.magazinePerLevel || 4;
    return base + (magLevel - 1) * growth;
  }

  // 力量碎片升级攻击力
  upgradeWeaponPower(id, scrapCost, shardCost) {
    const w = this.data.weaponData.weapons[id];
    if (!w || !w.unlocked) return false;
    if (!this.hasItem('power_shard', shardCost)) return false;
    if (!this.spendScrap(scrapCost)) return false;
    this.consumeItem('power_shard', shardCost);
    w.powerLevel = (w.powerLevel || 1) + 1;
    this.save();
    return true;
  }

  // 射速碎片升级弹速
  upgradeWeaponBulletSpeed(id, scrapCost, shardCost) {
    const w = this.data.weaponData.weapons[id];
    if (!w || !w.unlocked) return false;
    if (!this.hasItem('bulletspeed_shard', shardCost)) return false;
    if (!this.spendScrap(scrapCost)) return false;
    this.consumeItem('bulletspeed_shard', shardCost);
    w.bulletSpeedLevel = (w.bulletSpeedLevel || 1) + 1;
    this.save();
    return true;
  }

  // 攻速碎片升级攻速（缩短射击间隔）
  upgradeWeaponAttackSpeed(id, scrapCost, shardCost) {
    const w = this.data.weaponData.weapons[id];
    if (!w || !w.unlocked) return false;
    if (!this.hasItem('attackspeed_shard', shardCost)) return false;
    if (!this.spendScrap(scrapCost)) return false;
    this.consumeItem('attackspeed_shard', shardCost);
    w.attackSpeedLevel = (w.attackSpeedLevel || 1) + 1;
    this.save();
    return true;
  }

  // 枪械弹匣容量扩展（消耗扩容弹匣碎片 mag_shard + 废料）
  upgradeWeaponMagazine(id, scrapCost, shardCost) {
    const w = this.data.weaponData.weapons[id];
    if (!w || !w.unlocked) return false;
    if (!this.hasItem('mag_shard', shardCost)) return false;
    if (!this.spendScrap(scrapCost)) return false;
    this.consumeItem('mag_shard', shardCost);
    w.magazineLevel = (w.magazineLevel || 1) + 1;
    this.save();
    return true;
  }

  // 技能体系：碎片收集、合成解锁、装备与专精
  getSkillData() { return this.data.skillData; }

  isSkillUnlocked(id) {
    return !!this.data.skillData?.unlocked?.[id];
  }

  getEquippedSkills() {
    if (!Array.isArray(this.data.skillData?.equipped)) {
      if (!this.data.skillData) this.data.skillData = {};
      this.data.skillData.equipped = [];
      this.save();
    }
    // 过滤掉未解锁的技能，防止脏数据
    return this.data.skillData.equipped.filter(id => this.isSkillUnlocked(id));
  }

  setEquippedSkills(skills) {
    if (Array.isArray(skills)) {
      this.data.skillData.equipped = skills.filter(id => this.isSkillUnlocked(id)).slice(0, 4);
      this.save();
    }
  }

  // 消耗 10 块技能芯片合成解锁新技能
  synthesizeSkill(id) {
    const chipId = `chip_${id}`;
    const cost = GAME_CONFIG.SKILL_SYNTHESIS_COST || 10;
    if (this.isSkillUnlocked(id)) {
      return { success: false, message: '该技能已合成解锁！' };
    }
    if (!this.hasItem(chipId, cost)) {
      const cur = this.getItemCount(chipId);
      return { success: false, message: `技能碎片不足！当前拥有 ${cur}/${cost} 块` };
    }
    this.consumeItem(chipId, cost);
    if (!this.data.skillData.unlocked) this.data.skillData.unlocked = {};
    if (!this.data.skillData.levels) this.data.skillData.levels = {};
    this.data.skillData.unlocked[id] = true;
    this.data.skillData.levels[id] = 1;

    // 若当前装备槽位未满 4 个，自动放入出战槽位
    if (!Array.isArray(this.data.skillData.equipped)) this.data.skillData.equipped = [];
    if (this.data.skillData.equipped.length < 4 && !this.data.skillData.equipped.includes(id)) {
      this.data.skillData.equipped.push(id);
    }
    this.save();
    return { success: true, message: '🎉 技能合成成功！已装配至出战槽位。' };
  }

  toggleEquipSkill(id) {
    if (!this.isSkillUnlocked(id)) {
      return { success: false, message: '该技能尚未合成解锁，请先收集碎片！' };
    }
    if (!Array.isArray(this.data.skillData.equipped)) {
      this.data.skillData.equipped = [];
    }
    const idx = this.data.skillData.equipped.indexOf(id);
    if (idx >= 0) {
      // 允许卸下（即使全部卸下为 0 技能也允许）
      this.data.skillData.equipped.splice(idx, 1);
      this.save();
      return { success: true, equipped: false, message: '已卸下该技能' };
    } else {
      if (this.data.skillData.equipped.length >= 4) {
        return { success: false, message: '出战技能位已满（最多4个）！请先卸下其他技能。' };
      }
      this.data.skillData.equipped.push(id);
      this.save();
      return { success: true, equipped: true, message: '已成功装备出战！' };
    }
  }

  upgradeSkillMastery(id, scrapCost, chipCost = 2) {
    if (!this.isSkillUnlocked(id)) return false;
    const materialId = `chip_${id}`;
    if (!this.hasItem(materialId, chipCost)) return false;
    if (!this.spendScrap(scrapCost)) return false;
    this.consumeItem(materialId, chipCost);
    this.data.skillData.levels[id] = (this.data.skillData.levels[id] || 1) + 1;
    this.save();
    return true;
  }

  // 综合战力评分 (综合计算武器、城防科技、符文、宠物、已解锁技能)
  calcCombatPower() {
    let power = 800 + (this.getCommanderLevel() - 1) * 80;
    const equippedW = this.getEquippedWeapon();
    const wObj = this.data.weaponData.weapons[equippedW] || { level: 1, powerLevel: 1, bulletSpeedLevel: 1, attackSpeedLevel: 1, magazineLevel: 1 };
    power += (wObj.level || 1) * 110;
    power += ((wObj.powerLevel || 1) - 1) * 35;
    power += ((wObj.bulletSpeedLevel || 1) - 1) * 30;
    power += ((wObj.attackSpeedLevel || 1) - 1) * 40;
    power += ((wObj.magazineLevel || 1) - 1) * 25;

    // 城防加固评分
    const fort = this.getFortification();
    power += ((fort.hpLevel || 1) - 1) * 35;
    power += ((fort.shieldLevel || 1) - 1) * 35;
    power += ((fort.regenLevel || 1) - 1) * 30;
    power += ((fort.armorLevel || 1) - 1) * 30;

    // 符文评分
    const runeLevels = this.getRuneLevels();
    for (const lv of Object.values(runeLevels)) power += lv * 40;

    // 宠物评分
    const selectedPet = this.data.petData.selected;
    if (selectedPet && this.data.petData.pets[selectedPet]?.unlocked) {
      const pLevel = this.data.petData.pets[selectedPet]?.level || 1;
      power += pLevel * 85;
    }

    // 技能评分 (仅统计已解锁技能)
    for (const [sId, lv] of Object.entries(this.data.skillData.levels || {})) {
      if (this.isSkillUnlocked(sId)) {
        power += 50 + (lv - 1) * 30;
      }
    }
    return Math.round(power);
  }

  getStats() { return this.data; }
}

export const saveManager = new SaveManager();
