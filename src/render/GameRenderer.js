import { assets } from '../systems/AssetManager.js';

// ---------------- 视觉渲染系统 (Canvas 2D + 高清图素) ----------------

export class GameRenderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  render(game) {
    const ctx = this.ctx;
    ctx.save();

    // 创伤旋转震屏 (Trauma-based screen shake with rotational kick)
    const shake = game.feedback.getShake();
    if (shake.x !== 0 || shake.y !== 0 || shake.angle !== 0) {
      ctx.translate(game.width / 2, game.height / 2);
      ctx.translate(shake.x, shake.y);
      ctx.rotate(shake.angle);
      ctx.translate(-game.width / 2, -game.height / 2);
    }

    ctx.clearRect(0, 0, game.width, game.height);

    // 1. 废土公路原画背景
    this.renderBattlefield(ctx, game);

    // 2. 全屏冲击波 / EMP 光环
    this.renderShockwaves(ctx, game);

    // 3. 灼烧烈焰区
    this.renderBurnZones(ctx, game);

    // 4. 经验宝石
    this.renderGems(ctx, game);

    // 5. 怪物与突变暴君
    this.renderEnemies(ctx, game);

    // 6. 装甲战车
    this.renderTrucks(ctx, game);

    // 7. 特斯拉高压跳跃电弧
    this.renderTeslaArcs(ctx, game);

    // 8. 冰晶尖刺飞弹
    this.renderIceSpikes(ctx, game);

    // 9. 子弹
    this.renderBullets(ctx, game);

    // 10. 防线基地与指挥官
    this.renderFortressAndHero(ctx, game);

    // 11. 枪口开火火光 (Muzzle Flash)
    if (game.muzzleFlash > 0) {
      this.renderMuzzleFlash(ctx, game);
    }

    // 12. 极寒射线扇形光锥
    if (game.skills.freeze.activeTimer > 0) {
      this.renderFreezeCone(ctx, game);
    }

    // 13. 受击冲击光环与粒子飘字
    this.renderHitRings(ctx, game);
    this.renderParticles(ctx, game);
    this.renderDamageTexts(ctx, game);

    ctx.restore();
  }

  renderBattlefield(ctx, game) {
    const bgImg = assets.get('bg_highway');
    if (bgImg) {
      ctx.save();
      // 保持公路清晰质感与沥青纹理，适度压暗以衬托前景角色
      ctx.filter = 'brightness(0.84) contrast(0.98) saturate(0.88)';
      ctx.drawImage(bgImg, 0, 0, game.width, game.height);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, game.width, game.height);
    }

    // 废土远景灰霾层 (破桥远处纵深空气透视)
    const skyHaze = ctx.createLinearGradient(0, 0, 0, 180);
    skyHaze.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
    skyHaze.addColorStop(0.7, 'rgba(20, 30, 48, 0.15)');
    skyHaze.addColorStop(1, 'transparent');
    ctx.fillStyle = skyHaze;
    ctx.fillRect(0, 0, game.width, 180);

    // 电影级暗角 Vignette (聚焦中央公路与战斗核心区)
    const vig = ctx.createRadialGradient(
      game.width / 2, game.height / 2, game.width * 0.42,
      game.width / 2, game.height / 2, game.width * 0.92
    );
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(4, 7, 14, 0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, game.width, game.height);

    // 防线前沿警戒警戒线
    ctx.fillStyle = 'rgba(255, 42, 95, 0.12)';
    ctx.fillRect(0, game.fortress.y - 20, game.width, 20);
  }

  renderBurnZones(ctx, game) {
    for (let i = 0; i < game.burnZones.length; i++) {
      const bz = game.burnZones[i];
      const grad = ctx.createRadialGradient(bz.x, bz.y, 0, bz.x, bz.y, bz.radius);
      grad.addColorStop(0, 'rgba(255, 120, 0, 0.55)');
      grad.addColorStop(0.6, 'rgba(255, 42, 0, 0.3)');
      grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bz.x, bz.y, bz.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderGems(ctx, game) {
    for (let i = 0; i < game.gems.length; i++) {
      const g = game.gems[i];
      ctx.save();
      ctx.translate(g.x, g.y);

      // 能量光环与高亮晶核
      const pulse = Math.sin((g.timer || 0) * 12 + g.x) * 1.5;
      const r = 5.5 + pulse;
      const gemColor = g.color || '#00f0ff';

      ctx.shadowColor = gemColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = gemColor;

      // 科技感菱形晶核
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.3);
      ctx.lineTo(r * 0.9, 0);
      ctx.lineTo(0, r * 1.3);
      ctx.lineTo(-r * 0.9, 0);
      ctx.closePath();
      ctx.fill();

      // 核心高亮白芒
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  renderEnemies(ctx, game) {
    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      ctx.save();

      // 1. 真实生物下行奔跑动力学 (向下俯冲突击 + 重力踏步沉降)
      const targetY = game.fortress.y - e.radius + 12;
      const isMoving = e.y < targetY;

      let bobY = 0;
      let tiltAngle = 0;
      let scaleX = 1;
      let scaleY = 1;

      if (isMoving) {
        const wt = e.walkTime || 0;
        const stepFreq = e.type === 'charger' ? 14 : (e.type === 'behemoth' ? 6 : 9);
        const phase = wt * stepFreq;

        // 垂直脚掌踏地顿挫：提膝蓄力微升，踏地瞬间下沉并微压扁
        const stepCycle = phase % Math.PI;
        const stepSqueeze = Math.sin(stepCycle);
        bobY = stepSqueeze * (e.isBoss ? 4.2 : (e.type === 'behemoth' ? 3.5 : 2.6));

        // 左右跨步肩部微倾与重心摆动 (真实奔跑躯干微转，绝非平面钟摆平移)
        tiltAngle = Math.sin(phase) * (e.type === 'charger' ? 0.03 : 0.045);

        // 踏地受力横向挤压与蹬地纵向拉伸
        scaleX = 1 + (1 - stepSqueeze) * 0.07;
        scaleY = 1 - (1 - stepSqueeze) * 0.06;
      } else {
        const attackPhase = e.attackTimer / e.attackCooldown;
        const lunge = Math.sin(attackPhase * Math.PI) * 10;
        bobY = lunge;
        scaleY = 1 + Math.sin(attackPhase * Math.PI) * 0.2;
      }

      // 2. 受击顿挫物理震荡
      let knockX = 0;
      let knockY = 0;
      let hitJitterX = 0;
      let hitJitterY = 0;
      let hitSquash = 0;
      let hitAngleTilt = 0;

      if (e.hitStagger > 0) {
        const ratio = e.hitStagger / (e.hitStaggerTotal || 0.22);
        const knockDist = Math.sin(ratio * Math.PI) * (e.type === 'behemoth' ? 4.0 : 7.0);
        const hAngle = e.hitAngle !== undefined ? e.hitAngle : -Math.PI / 2;
        knockX = Math.cos(hAngle) * knockDist;
        knockY = Math.sin(hAngle) * knockDist;

        hitSquash = Math.sin(ratio * Math.PI) * 0.22;
        hitJitterX = (Math.random() - 0.5) * 3.5 * ratio;
        hitJitterY = (Math.random() - 0.5) * 3.5 * ratio;
        hitAngleTilt = Math.sin(ratio * Math.PI * 2) * 0.12;
      }

      ctx.translate(e.x + knockX + hitJitterX, e.y + bobY + knockY + hitJitterY);
      ctx.rotate(tiltAngle + hitAngleTilt);
      ctx.scale(scaleX * (1 + hitSquash), scaleY * (1 - hitSquash));

      // 纵深微弱透视缩放 (0.92x ~ 1.04x)
      const depthProgress = Math.max(0, Math.min(1, (e.y + 40) / (targetY + 40)));
      const depthScale = 0.92 + depthProgress * 0.12;

      // 3. 柏油路面自然接触投影 (随步伐呼吸，无杂乱色块)
      const shadowW = e.radius * 1.15 * depthScale * scaleX;
      const shadowH = e.radius * 0.42 * depthScale;
      const shadowAlpha = 0.45 + (bobY / 5.0) * 0.2;

      ctx.save();
      const shadowGrad = ctx.createRadialGradient(0, e.radius * 0.68 * depthScale, 0, 0, e.radius * 0.68 * depthScale, shadowW);
      shadowGrad.addColorStop(0, `rgba(5, 8, 16, ${shadowAlpha})`);
      shadowGrad.addColorStop(0.65, `rgba(5, 8, 16, ${shadowAlpha * 0.4})`);
      shadowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(0, e.radius * 0.68 * depthScale, shadowW, shadowH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Boss 霸气暗红辐射火圈
      if (e.isBoss) {
        const pulse = Math.sin((e.walkTime || 0) * 5) * 4;
        const auraRadius = (e.radius + 18 + pulse) * depthScale;
        const auraGrad = ctx.createRadialGradient(0, 0, e.radius * 0.3, 0, 0, auraRadius);
        auraGrad.addColorStop(0, 'rgba(255, 42, 95, 0.35)');
        auraGrad.addColorStop(0.7, 'rgba(234, 88, 12, 0.15)');
        auraGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 冰冻特效外框
      if (e.freezeTimer > 0) {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, (e.radius + 8) * depthScale, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. 高精怪兽原画 Sprite 渲染
      const sprite = assets.getFrame(e.type);

      if (sprite) {
        // 尺寸比例适配：各怪兽按体态精准缩放，杜绝遮天蔽日或细小如蚁
        const mult = e.isBoss ? 2.8 : (e.type === 'behemoth' ? 2.4 : (e.type === 'charger' ? 3.0 : 3.2));
        const size = e.radius * mult * depthScale;

        // 受击与状态滤镜
        if (e.hitFlash > 0.05) {
          ctx.filter = 'brightness(1.5) contrast(1.3) saturate(1.3)';
        } else if (e.hitFlash > 0) {
          ctx.filter = 'brightness(1.25) saturate(2.0) hue-rotate(340deg)';
        } else if (e.freezeTimer > 0) {
          ctx.filter = 'hue-rotate(160deg) saturate(1.8) brightness(1.2)';
        } else {
          // 清晰鲜活滤镜：保持暗部清晰与彩色发光部位艳丽
          ctx.filter = 'contrast(1.12) saturate(1.18) brightness(1.04)';
        }

        ctx.globalAlpha = 1.0;
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
        ctx.filter = 'none';
      } else {
        ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : (e.freezeTimer > 0 ? '#38bdf8' : e.color);
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * depthScale, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. 极简科技血条
      const barW = (e.isBoss ? e.radius * 2.5 : e.radius * 1.9) * depthScale;
      const barH = e.isBoss ? 6 : 4;
      const barY = (-e.radius - (e.isBoss ? 16 : 10)) * depthScale;
      const hpRatio = Math.max(0, e.hp / e.maxHp);

      // 血条外底框与黑边
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);

      // 血条鲜明渐变
      const hpColor = e.isBoss ? '#ff0055' : (e.type === 'behemoth' ? '#a855f7' : (e.type === 'charger' ? '#f97316' : '#22c55e'));
      ctx.fillStyle = hpColor;
      ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);

      if (e.isBoss) {
        ctx.font = 'bold 12px Rajdhani, monospace, sans-serif';
        ctx.fillStyle = '#ff2a5f';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 6;
        ctx.fillText('👑 突变暴君-终结者', 0, barY - 6);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }
  }

  renderTrucks(ctx, game) {
    for (let i = 0; i < game.activeTrucks.length; i++) {
      const t = game.activeTrucks[i];
      t.timer = (t.timer || 0) + 0.016;
      ctx.save();
      ctx.translate(t.x, t.y);

      const suspensionY = Math.sin(t.timer * 45) * 2;
      const steerWobble = Math.sin(t.timer * 18) * 0.035;
      ctx.translate(0, suspensionY);
      ctx.rotate(steerWobble);

      // 地面沥青双轮胎抓地拖痕
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.fillRect(-t.width * 0.42, t.height * 0.2, 14, 80);
      ctx.fillRect(t.width * 0.42 - 14, t.height * 0.2, 14, 80);

      // 前照大灯远光透镜光束
      const lightGrad = ctx.createRadialGradient(0, -t.height * 0.45, 20, 0, -t.height * 0.45, 280);
      lightGrad.addColorStop(0, 'rgba(255, 255, 230, 0.85)');
      lightGrad.addColorStop(0.25, 'rgba(0, 240, 255, 0.45)');
      lightGrad.addColorStop(0.7, 'rgba(0, 240, 255, 0.15)');
      lightGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.moveTo(-t.width * 0.35, -t.height * 0.45);
      ctx.lineTo(-t.width * 1.1, -t.height * 0.45 - 260);
      ctx.lineTo(t.width * 1.1, -t.height * 0.45 - 260);
      ctx.lineTo(t.width * 0.35, -t.height * 0.45);
      ctx.closePath();
      ctx.fill();

      // 车身底部柔和物理阴影
      const shadowGrad = ctx.createRadialGradient(0, 10, t.width * 0.2, 0, 10, t.width * 0.65);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      shadowGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
      shadowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(0, 10, t.width * 0.65, t.height * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // 尾部双重火箭喷射烈焰
      const flameH = 40 + Math.sin(t.timer * 50) * 18;
      const flameGrad = ctx.createLinearGradient(0, t.height * 0.42, 0, t.height * 0.42 + flameH);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.15, '#ffea00');
      flameGrad.addColorStop(0.55, '#ff4400');
      flameGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = flameGrad;
      ctx.fillRect(-t.width * 0.34, t.height * 0.42, 16, flameH);
      ctx.fillRect(t.width * 0.34 - 16, t.height * 0.42, 16, flameH);

      // 装甲战车原画动态 Sprite
      const truckSprite = assets.getTruck(t.timer * 12);
      if (truckSprite) {
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        const drawW = t.width * 1.6;
        const drawH = t.height * 1.5;
        ctx.drawImage(truckSprite, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.shadowBlur = 0;
      }

      // 排障巨齿撞角电弧流光
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(-t.width * 0.44, -t.height * 0.48);
      ctx.lineTo(0, -t.height * 0.64);
      ctx.lineTo(t.width * 0.44, -t.height * 0.48);
      ctx.stroke();

      ctx.restore();
    }
  }

  renderBullets(ctx, game) {
    const bulletNormalImg = assets.get('bullet_normal');
    const bulletCritImg = assets.get('bullet_crit');

    for (let i = 0; i < game.bullets.length; i++) {
      const b = game.bullets[i];
      ctx.save();
      ctx.translate(b.x, b.y);

      const angle = Math.atan2(b.vy, b.vx);
      ctx.rotate(angle + Math.PI / 2);

      const img = b.isCrit ? bulletCritImg : bulletNormalImg;
      if (img) {
        const bw = b.isCrit ? 16 : 13;
        const bh = b.isCrit ? 36 : 28;
        ctx.shadowColor = b.isCrit ? '#ffaa00' : '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.drawImage(img, -bw / 2, -bh * 0.35, bw, bh);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = b.isCrit ? '#ffcc00' : '#00f0ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  renderHitRings(ctx, game) {
    for (let i = 0; i < game.hitRings.length; i++) {
      const hr = game.hitRings[i];
      const progress = 1 - (hr.life / hr.maxLife);
      const currentRadius = hr.radius + (hr.maxRadius - hr.radius) * progress;
      const alpha = (1 - progress) * 0.85;

      ctx.save();
      ctx.strokeStyle = hr.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2.5 * (1 - progress);
      ctx.shadowColor = hr.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(hr.x, hr.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderFortressAndHero(ctx, game) {
    const fort = game.fortress;

    // 1. 防御要塞防线
    const wallImg = assets.get('fortress_wall');
    if (wallImg) {
      ctx.drawImage(wallImg, fort.x, fort.y, fort.width, fort.height);
      if (fort.hitFlash > 0) {
        ctx.fillStyle = 'rgba(255, 42, 95, 0.35)';
        ctx.fillRect(fort.x, fort.y, fort.width, fort.height);
      }
    } else {
      ctx.fillStyle = fort.hitFlash > 0 ? '#475569' : '#0f172a';
      ctx.fillRect(fort.x, fort.y, fort.width, fort.height);
    }

    // 顶部能量盾流光与力场护罩
    if (fort.shield > 0) {
      const shieldAlpha = Math.min(0.85, 0.25 + (fort.shield / fort.maxShield) * 0.6);
      const shieldGrad = ctx.createLinearGradient(0, fort.y - 14, 0, fort.y + 8);
      shieldGrad.addColorStop(0, `rgba(0, 240, 255, ${shieldAlpha * 0.5})`);
      shieldGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shieldGrad;
      ctx.fillRect(fort.x, fort.y - 14, fort.width, 18);

      ctx.strokeStyle = `rgba(0, 240, 255, ${shieldAlpha})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(fort.x, fort.y);
      ctx.lineTo(fort.x + fort.width, fort.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 2. 指挥官主角
    ctx.save();
    ctx.translate(game.hero.x, game.hero.y);

    const heroImg = assets.get('hero');
    if (heroImg) {
      ctx.save();
      ctx.rotate(game.hero.angle + Math.PI / 2);
      const hs = 64;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(heroImg, -hs / 2, -hs / 2, hs, hs);
      ctx.restore();
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(game.hero.angle);
      const recoilOffset = -game.hero.recoil;
      ctx.fillStyle = '#475569';
      ctx.fillRect(8 + recoilOffset, -7, 28, 5);
      ctx.fillRect(8 + recoilOffset, 2, 28, 5);
      ctx.restore();
    }

    // 瞄准激光光束 (平滑高科技蓝光渐变，不遮挡战场视线)
    if (game.enemies.length > 0) {
      ctx.save();
      ctx.rotate(game.hero.angle);
      const laserGrad = ctx.createLinearGradient(35, 0, 220, 0);
      laserGrad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
      laserGrad.addColorStop(0.6, 'rgba(0, 240, 255, 0.15)');
      laserGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = laserGrad;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(35, 0);
      ctx.lineTo(220, 0);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  renderMuzzleFlash(ctx, game) {
    ctx.save();
    ctx.translate(game.hero.x, game.hero.y);
    ctx.rotate(game.hero.angle);

    const flashX = 36;
    const flashSize = 14 + Math.random() * 8;

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(flashX, 0, flashSize * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.ellipse(flashX + 6, 0, flashSize * 0.75, flashSize * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderFreezeCone(ctx, game) {
    ctx.save();
    ctx.translate(game.hero.x, game.hero.y);
    ctx.rotate(game.hero.angle);

    const range = game.skills.freeze.range;
    const halfAngle = game.skills.freeze.coneAngle / 2;

    const grad = ctx.createRadialGradient(0, 0, 30, 0, 0, range);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.55)');
    grad.addColorStop(0.8, 'rgba(14, 165, 233, 0.25)');
    grad.addColorStop(1, 'rgba(14, 165, 233, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, -halfAngle, halfAngle);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  renderTeslaArcs(ctx, game) {
    for (let i = 0; i < game.teslaArcs.length; i++) {
      const arc = game.teslaArcs[i];
      const alpha = Math.max(0, arc.life / arc.maxLife);
      ctx.save();
      ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;

      const dx = arc.x2 - arc.x1;
      const dy = arc.y2 - arc.y1;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(3, Math.floor(dist / 22));

      ctx.beginPath();
      ctx.moveTo(arc.x1, arc.y1);
      for (let s = 1; s < steps; s++) {
        const frac = s / steps;
        const nx = -dy / dist;
        const ny = dx / dist;
        const jitter = (Math.random() - 0.5) * 16;
        ctx.lineTo(arc.x1 + dx * frac + nx * jitter, arc.y1 + dy * frac + ny * jitter);
      }
      ctx.lineTo(arc.x2, arc.y2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();
    }
  }

  renderShockwaves(ctx, game) {
    for (let i = 0; i < game.shockwaves.length; i++) {
      const sw = game.shockwaves[i];
      const progress = 1 - (sw.life / sw.maxLife);
      const curR = sw.radius + (sw.maxRadius - sw.radius) * progress;
      const alpha = (1 - progress) * 0.9;

      ctx.save();
      const grad = ctx.createRadialGradient(sw.x, sw.y, Math.max(0, curR - 35), sw.x, sw.y, curR);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
      grad.addColorStop(0.8, `rgba(0, 240, 255, ${alpha * 0.5})`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 6 * (1 - progress);
      ctx.shadowColor = sw.color || '#00f0ff';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(sw.x, sw.y, curR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderIceSpikes(ctx, game) {
    for (let i = 0; i < game.iceSpikes.length; i++) {
      const sp = game.iceSpikes[i];
      ctx.save();
      ctx.translate(sp.x, sp.y);
      const angle = Math.atan2(sp.vy, sp.vx);
      ctx.rotate(angle + Math.PI / 2);

      ctx.fillStyle = '#e0f2fe';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }
  }

  renderParticles(ctx, game) {
    for (let i = 0; i < game.particles.length; i++) {
      const p = game.particles[i];
      ctx.save();
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderDamageTexts(ctx, game) {
    for (let i = 0; i < game.damageTexts.length; i++) {
      const t = game.damageTexts[i];
      ctx.save();
      const alpha = t.life / t.maxLife;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(t.x, t.y);
      const sc = t.scale || 1.0;
      ctx.scale(sc, sc);
      ctx.font = `bold ${t.fontSize || 16}px 'Rajdhani', monospace, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
  }
}
