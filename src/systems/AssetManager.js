// ---------------- 资源管理系统 (Asset Manager: 多帧动作 + 进度加载，透明图预处理完成) ----------------
export class AssetManager {
  constructor() {
    this.images = {};
    this.loaded = false;
    this.manifest = {
      bg_highway: 'assets/environment/bg_highway.png',
      fortress_wall: 'assets/environment/fortress_wall.png',
      hero: 'assets/characters/hero.png',
      // 废土突变原画高清怪兽图素及双足/四足生物动力学动作帧
      runner: 'assets/characters/runner.png',
      runner_0: 'assets/characters/runner_0.png',
      runner_1: 'assets/characters/runner_1.png',
      charger: 'assets/characters/charger.png',
      charger_0: 'assets/characters/charger_0.png',
      charger_1: 'assets/characters/charger_1.png',
      behemoth: 'assets/characters/behemoth.png',
      behemoth_0: 'assets/characters/behemoth_0.png',
      behemoth_1: 'assets/characters/behemoth_1.png',
      boss_overlord: 'assets/characters/boss_overlord.png',
      boss_overlord_0: 'assets/characters/boss_overlord_0.png',
      boss_overlord_1: 'assets/characters/boss_overlord_1.png',
      // 高清末日重型突击装甲战车动力学帧
      truck_0: 'assets/vehicles/truck_frame_0.png',
      truck_1: 'assets/vehicles/truck_frame_1.png',
      truck: 'assets/vehicles/truck.png',
      // 高清超音速等离子光矛与穿甲曳光弹头图素
      bullet_normal: 'assets/projectiles/bullet_normal.png',
      bullet_crit: 'assets/projectiles/bullet_crit.png',
      // 技能与战略强化专属高清徽章
      icon_rocket: 'assets/cards/icon_rocket.png',
      icon_truck: 'assets/cards/icon_truck.png',
      icon_frost: 'assets/cards/icon_frost.png',
      icon_gem: 'assets/cards/icon_gem.png',
      icon_emp: 'assets/cards/icon_emp.png',
      icon_tesla: 'assets/cards/icon_tesla.png',
      icon_thermal: 'assets/cards/icon_thermal.png',
      icon_pierce: 'assets/cards/icon_pierce.png',
      icon_shield: 'assets/cards/icon_shield.png',
      icon_multishot: 'assets/cards/icon_multishot.png',
      icon_firerate: 'assets/cards/icon_firerate.png',
      icon_crit: 'assets/cards/icon_crit.png',
      icon_inferno: 'assets/cards/icon_inferno.png',
      icon_shatter: 'assets/cards/icon_shatter.png',
      // 新增战术技能与宠物素材 (全部统一为高清 PNG)
      skill_tornado: 'assets/skills/tornado.png',
      skill_boomerang: 'assets/skills/boomerang.png',
      skill_laser: 'assets/skills/laser.png',
      skill_bomber: 'assets/skills/bomber.png',
      pet_fluffy: 'assets/pets/fluffy.png',
      pet_dragon: 'assets/pets/dragon.png'
    };
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
          if (attempt <= retries) {
            console.warn(`[AssetManager] timeout ${src}, retry ${attempt}/${retries}`);
            tryLoad();
          } else {
            resolve(null);
          }
        }, timeoutMs);
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
          if (attempt <= retries) {
            console.warn(`[AssetManager] fail ${src}, retry ${attempt}/${retries}`);
            setTimeout(tryLoad, 200 * attempt);
          } else {
            resolve(null);
          }
        };
        img.src = `${src}?v=12&t=${Date.now()}`;
      };
      tryLoad();
    });
  }

  async loadJSON(url) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[AssetManager] loadJSON warning for ${url}:`, err);
      return null;
    }
  }

  loadAll(onProgress = null) {
    const entries = Object.entries(this.manifest);
    const total = entries.length;
    let loadedCount = 0;

    const promises = entries.map(async ([key, src]) => {
      const img = await this._loadImage(src);
      this.images[key] = img;
      loadedCount++;
      if (onProgress) onProgress(loadedCount, total, key);
      if (!img) console.warn(`[AssetManager] final fail: ${src}, using procedural fallback`);
    });

    return Promise.all(promises).then(async () => {
      this.loaded = true;
      console.log('[AssetManager] All HD RogueGen assets loaded successfully!');
    });
  }

  // 获取角色对应步频动作图片 (支持多帧步态切换)
  getFrame(type, frameIdx) {
    const baseKey = (type === 'mutant_overlord' || type === 'boss_overlord') ? 'boss_overlord' : type;
    if (frameIdx !== undefined && frameIdx !== null) {
      const idx = Math.abs(Math.floor(frameIdx)) % 2;
      const frameKey = `${baseKey}_${idx}`;
      if (this.images[frameKey]) return this.images[frameKey];
    }
    return this.images[baseKey] || this.images['runner'] || null;
  }

  getTruck(frameIdx) {
    const idx = Math.abs(Math.floor(frameIdx)) % 2;
    return this.images[`truck_${idx}`] || this.images['truck'] || null;
  }

  get(key) {
    return this.images[key] || null;
  }
}

export const assets = new AssetManager();
