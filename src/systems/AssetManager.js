// ---------------- 资源管理系统 (Asset Manager: RogueGen 8 探针色彩去底与多帧动作管理) ----------------
export class AssetManager {
  constructor() {
    this.images = {};
    this.loaded = false;
    this.manifest = {
      bg_highway: 'assets/bg_highway.jpg',
      fortress_wall: 'assets/fortress_wall.jpg',
      hero: 'assets/hero.png',
      // 废土突变原画高清怪兽图素 (2.5D 俯视统一视角，精细透明无噪点)
      runner: 'assets/runner.png',
      charger: 'assets/charger.png',
      behemoth: 'assets/behemoth.png',
      boss_overlord: 'assets/boss_overlord.png',
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
        img.src = `${src}?v=6`;
      });
    });

    return Promise.all(promises).then(() => {
      this.loaded = true;
      console.log('[AssetManager] All HD RogueGen assets loaded successfully!');
    });
  }

  // 获取角色对应步频动作图片
  getFrame(type, frameIdx) {
    if (type === 'mutant_overlord' || type === 'boss_overlord') {
      return this.images['boss_overlord'] || null;
    }
    return this.images[type] || this.images['runner'] || null;
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

