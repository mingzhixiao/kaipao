// ---------------- 资源管理系统 (Asset Manager: RogueGen 8 探针色彩去底与多帧动作管理) ----------------
export class AssetManager {
  constructor() {
    this.images = {};
    this.loaded = false;
    this.manifest = {
      bg_highway: 'assets/bg_highway.jpg',
      fortress_wall: 'assets/fortress_wall.jpg',
      hero: 'assets/hero.png',
      // 废土突变原画高清怪兽图素及双足/四足生物动力学动作帧
      runner: 'assets/runner.png',
      runner_0: 'assets/runner_0.png',
      runner_1: 'assets/runner_1.png',
      charger: 'assets/charger.png',
      charger_0: 'assets/charger_0.png',
      charger_1: 'assets/charger_1.png',
      behemoth: 'assets/behemoth.png',
      behemoth_0: 'assets/behemoth_0.png',
      behemoth_1: 'assets/behemoth_1.png',
      boss_overlord: 'assets/boss_overlord.png',
      boss_overlord_0: 'assets/boss_overlord_0.png',
      boss_overlord_1: 'assets/boss_overlord_1.png',
      // 高清末日重型突击装甲战车动力学帧
      truck_0: 'assets/truck_frame_0.png',
      truck_1: 'assets/truck_frame_1.png',
      truck: 'assets/truck.png',
      // 高清超音速等离子光矛与穿甲曳光弹头图素
      bullet_normal: 'assets/bullet_normal.png',
      bullet_crit: 'assets/bullet_crit.png',
      // 技能与战略强化专属高清徽章 (全 14 种独立分类素材)
      icon_rocket: 'assets/icon_rocket.jpg',
      icon_truck: 'assets/icon_truck.jpg',
      icon_frost: 'assets/icon_frost.jpg',
      icon_gem: 'assets/icon_gem.jpg',
      icon_emp: 'assets/icon_emp.jpg',
      icon_tesla: 'assets/icon_tesla.jpg',
      icon_thermal: 'assets/icon_thermal.jpg',
      icon_pierce: 'assets/icon_pierce.jpg',
      icon_shield: 'assets/icon_shield.jpg',
      icon_multishot: 'assets/icon_multishot.png',
      icon_firerate: 'assets/icon_firerate.png',
      icon_crit: 'assets/icon_crit.png',
      icon_inferno: 'assets/icon_inferno.png',
      icon_shatter: 'assets/icon_shatter.png'
    };
  }

  loadAll(onProgress = null) {
    const entries = Object.entries(this.manifest);
    const total = entries.length;
    let loadedCount = 0;

    const promises = entries.map(([key, src]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.images[key] = img;
          loadedCount++;
          if (onProgress) onProgress(loadedCount, total, key);
          resolve();
        };
        img.onerror = () => {
          console.warn(`[AssetManager] Failed to load image: ${src}, falling back to procedural vector`);
          this.images[key] = null;
          loadedCount++;
          if (onProgress) onProgress(loadedCount, total, key);
          resolve();
        };
        img.src = `${src}?v=7`;
      });
    });

    return Promise.all(promises).then(() => {
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

  // 获取高清重型装甲车运动帧
  getTruck(frameIdx) {
    const idx = Math.abs(Math.floor(frameIdx)) % 2;
    return this.images[`truck_${idx}`] || this.images['truck'] || null;
  }

  get(key) {
    return this.images[key] || null;
  }
}

export const assets = new AssetManager();

