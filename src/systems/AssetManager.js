// ---------------- 资源管理系统 ----------------
export class AssetManager {
  constructor() {
    this.images = {};
    this.loaded = false;
    this.loadingPromise = null;
    // 发布版本统一改这里，避免每次请求都使用 Date.now() 造成无法命中浏览器缓存。
    this.assetVersion = '20260908';
    this.manifest = {
      bg_highway: 'assets/environment/bg_highway.png',
      fortress_wall: 'assets/environment/fortress_wall.png',
      hero: 'assets/characters/hero.png',
      runner: 'assets/characters/runner.png', runner_0: 'assets/characters/runner_0.png', runner_1: 'assets/characters/runner_1.png',
      charger: 'assets/characters/charger.png', charger_0: 'assets/characters/charger_0.png', charger_1: 'assets/characters/charger_1.png',
      behemoth: 'assets/characters/behemoth.png', behemoth_0: 'assets/characters/behemoth_0.png', behemoth_1: 'assets/characters/behemoth_1.png',
      boss_overlord: 'assets/characters/boss_overlord.png', boss_overlord_0: 'assets/characters/boss_overlord_0.png', boss_overlord_1: 'assets/characters/boss_overlord_1.png',
      truck_0: 'assets/vehicles/truck_frame_0.png', truck_1: 'assets/vehicles/truck_frame_1.png', truck: 'assets/vehicles/truck.png',
      bullet_normal: 'assets/projectiles/bullet_normal.png', bullet_crit: 'assets/projectiles/bullet_crit.png',
      icon_rocket: 'assets/cards/icon_rocket.png', icon_truck: 'assets/cards/icon_truck.png', icon_frost: 'assets/cards/icon_frost.png', icon_gem: 'assets/cards/icon_gem.png',
      icon_emp: 'assets/cards/icon_emp.png', icon_tesla: 'assets/cards/icon_tesla.png', icon_thermal: 'assets/cards/icon_thermal.png', icon_pierce: 'assets/cards/icon_pierce.png',
      icon_shield: 'assets/cards/icon_shield.png', icon_multishot: 'assets/cards/icon_multishot.png', icon_firerate: 'assets/cards/icon_firerate.png', icon_crit: 'assets/cards/icon_crit.png',
      icon_inferno: 'assets/cards/icon_inferno.png', icon_shatter: 'assets/cards/icon_shatter.png',
      skill_tornado: 'assets/skills/tornado.png', skill_boomerang: 'assets/skills/boomerang.png', skill_laser: 'assets/skills/laser.png', skill_bomber: 'assets/skills/bomber.png',
      pet_fluffy: 'assets/pets/fluffy.png', pet_dragon: 'assets/pets/dragon.png',
      item_assault_part: 'assets/items/item_assault_part.png',
      item_gatling_part: 'assets/items/item_gatling_part.png',
      item_gauss_part: 'assets/items/item_gauss_part.png',
      item_plasma_part: 'assets/items/item_plasma_part.png',
      item_fluffy_shard: 'assets/items/item_fluffy_shard.png',
      item_dragon_shard: 'assets/items/item_dragon_shard.png',
      item_chip_rocket: 'assets/items/item_chip_rocket.png',
      item_chip_truck: 'assets/items/item_chip_truck.png',
      item_chip_freeze: 'assets/items/item_chip_freeze.png',
      item_chip_tornado: 'assets/items/item_chip_tornado.png',
      item_chip_boomerang: 'assets/items/item_chip_boomerang.png',
      item_chip_laser: 'assets/items/item_chip_laser.png',
      item_chip_bomber: 'assets/items/item_chip_bomber.png',
      item_energy_potion: 'assets/items/item_energy_potion.png',
      item_supply_crate: 'assets/items/item_supply_crate.png'
    };
  }

  _withVersion(src) {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}v=${encodeURIComponent(this.assetVersion)}`;
  }

  _loadImage(src, retries = 2, timeoutMs = 12000) {
    return new Promise((resolve) => {
      let attempt = 0;
      const tryLoad = () => {
        attempt++;
        const img = new Image();
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          img.onload = img.onerror = null;
          img.src = '';
          if (attempt <= retries) tryLoad();
          else resolve(null);
        }, timeoutMs);
        img.decoding = 'async';
        img.onload = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(img);
        };
        img.onerror = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (attempt <= retries) setTimeout(tryLoad, 200 * attempt);
          else resolve(null);
        };
        img.src = this._withVersion(src);
      };
      tryLoad();
    });
  }

  async loadJSON(url) {
    try {
      const res = await fetch(this._withVersion(url), { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[AssetManager] loadJSON warning for ${url}:`, err);
      return null;
    }
  }

  loadAll(onProgress = null) {
    if (this.loaded) {
      if (onProgress) onProgress(Object.keys(this.manifest).length, Object.keys(this.manifest).length, 'cached');
      return Promise.resolve();
    }
    if (this.loadingPromise) return this.loadingPromise;

    const entries = Object.entries(this.manifest);
    const total = entries.length;
    let loadedCount = 0;
    this.loadingPromise = Promise.all(entries.map(async ([key, src]) => {
      const img = await this._loadImage(src);
      this.images[key] = img;
      loadedCount++;
      if (onProgress) onProgress(loadedCount, total, key);
      if (!img) console.warn(`[AssetManager] final fail: ${src}, using procedural fallback`);
    })).then(() => {
      this.loaded = true;
      this.loadingPromise = null;
    }).catch(err => {
      this.loadingPromise = null;
      throw err;
    });
    return this.loadingPromise;
  }

  getFrame(type, frameIdx) {
    const baseKey = (type === 'mutant_overlord' || type === 'boss_overlord') ? 'boss_overlord' : type;
    if (frameIdx !== undefined && frameIdx !== null) {
      const idx = Math.abs(Math.floor(frameIdx)) % 2;
      const frameKey = `${baseKey}_${idx}`;
      if (this.images[frameKey]) return this.images[frameKey];
    }
    return this.images[baseKey] || this.images.runner || null;
  }

  getTruck(frameIdx) {
    const idx = Math.abs(Math.floor(frameIdx)) % 2;
    return this.images[`truck_${idx}`] || this.images.truck || null;
  }

  get(key) { return this.images[key] || null; }
}

export const assets = new AssetManager();
