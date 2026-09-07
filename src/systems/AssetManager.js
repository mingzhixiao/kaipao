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

  loadAll() {
    const promises = Object.entries(this.manifest).map(([key, src]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.images[key] = img;
          resolve();
        };
        img.onerror = () => {
          console.warn(`[AssetManager] Failed to load image: ${src}, falling back to procedural vector`);
          this.images[key] = null;
          resolve();
        };
        img.src = `${src}?v=5`;
      });
    });

    return Promise.all(promises).then(() => {
      this.loaded = true;
      console.log('[AssetManager] All multi-frame sprites & HD RogueGen assets loaded successfully!');
    });
  }

  // RogueGen 算法：8 探针自适应边缘色彩采样与透明化
  removeBackground(img, tolerance = 42) {
    try {
      if (!img || img.width < 8 || img.height < 8) return img;
      const w = img.width, h = img.height;
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;

      const sampleAt = (px, py) => {
        const idx = (py * w + px) * 4;
        return [d[idx], d[idx + 1], d[idx + 2], d[idx + 3]];
      };

      // 采样 8 个边缘探针点
      const probes = [
        sampleAt(2, 2), sampleAt(w - 3, 2), sampleAt(2, h - 3), sampleAt(w - 3, h - 3),
        sampleAt(Math.floor(w / 2), 2), sampleAt(2, Math.floor(h / 2)),
        sampleAt(w - 3, Math.floor(h / 2)), sampleAt(Math.floor(w / 2), h - 3)
      ].filter(c => c[3] > 200);

      if (probes.length === 0) return img;

      // 背景色彩聚类
      const bgColors = [probes[0].slice(0, 3)];
      for (const c of probes.slice(1)) {
        const rgb = c.slice(0, 3);
        const similar = bgColors.some(b =>
          Math.abs(rgb[0] - b[0]) < 25 && Math.abs(rgb[1] - b[1]) < 25 && Math.abs(rgb[2] - b[2]) < 25
        );
        if (!similar) bgColors.push(rgb);
      }

      const tol2 = tolerance * tolerance;
      const featherTol = (tolerance + 20) * (tolerance + 20);

      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 10) continue;
        for (const bg of bgColors) {
          const dr = d[i] - bg[0];
          const dg = d[i + 1] - bg[1];
          const db = d[i + 2] - bg[2];
          const dist2 = dr * dr + dg * dg + db * db;
          if (dist2 <= tol2) {
            d[i + 3] = 0;
            break;
          } else if (dist2 < featherTol) {
            const dist = Math.sqrt(dist2);
            const a = ((dist - tolerance) / 20) * 255;
            d[i + 3] = Math.min(d[i + 3], Math.max(0, Math.floor(a)));
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return cv;
    } catch (e) {
      return img;
    }
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
