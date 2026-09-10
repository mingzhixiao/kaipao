// ---------------- Canvas 瞬时渲染优化 ----------------
// 不修改图片资源，也不改变战斗数值；只减少 Canvas 状态切换、渐变创建和随机数开销。

const TAU = Math.PI * 2;

export function installRenderOptimization(game) {
  if (!game?.renderer || game.__renderOptimizationInstalled) return;
  game.__renderOptimizationInstalled = true;

  const renderer = game.renderer;
  const ctx = renderer.ctx;

  // 烧伤区域：每帧 createRadialGradient 的成本较高。
  // 这里使用分层半透明圆，视觉语义一致但不创建 Gradient 对象。
  renderer.renderBurnZones = function optimizedRenderBurnZones(renderCtx, g) {
    const list = g.burnZones;
    for (let i = 0; i < list.length; i++) {
      const bz = list[i];
      if (!bz.active) continue;
      const r = bz.radius;

      renderCtx.globalAlpha = 0.20;
      renderCtx.fillStyle = '#ff2a00';
      renderCtx.beginPath();
      renderCtx.arc(bz.x, bz.y, r, 0, TAU);
      renderCtx.fill();

      renderCtx.globalAlpha = 0.28;
      renderCtx.fillStyle = '#ff7800';
      renderCtx.beginPath();
      renderCtx.arc(bz.x, bz.y, r * 0.62, 0, TAU);
      renderCtx.fill();

      renderCtx.globalAlpha = 0.35;
      renderCtx.fillStyle = '#ffcc00';
      renderCtx.beginPath();
      renderCtx.arc(bz.x, bz.y, r * 0.22, 0, TAU);
      renderCtx.fill();
    }
    renderCtx.globalAlpha = 1;
  };

  // 宝石：完全不需要 transform/save/restore，可直接以世界坐标绘制。
  renderer.renderGems = function optimizedRenderGems(renderCtx, g) {
    const list = g.gems;
    for (let i = 0; i < list.length; i++) {
      const gem = list[i];
      if (!gem.active) continue;
      const pulse = Math.sin((gem.timer || 0) * 12 + gem.x) * 1.5;
      const r = 5.5 + pulse;
      const c = gem.color || '#00f0ff';

      renderCtx.globalAlpha = 0.32;
      renderCtx.fillStyle = c;
      renderCtx.beginPath();
      renderCtx.moveTo(gem.x, gem.y - r * 1.8);
      renderCtx.lineTo(gem.x + r * 1.4, gem.y);
      renderCtx.lineTo(gem.x, gem.y + r * 1.8);
      renderCtx.lineTo(gem.x - r * 1.4, gem.y);
      renderCtx.closePath();
      renderCtx.fill();

      renderCtx.globalAlpha = 1;
      renderCtx.beginPath();
      renderCtx.moveTo(gem.x, gem.y - r * 1.3);
      renderCtx.lineTo(gem.x + r * 0.9, gem.y);
      renderCtx.lineTo(gem.x, gem.y + r * 1.3);
      renderCtx.lineTo(gem.x - r * 0.9, gem.y);
      renderCtx.closePath();
      renderCtx.fill();

      renderCtx.fillStyle = '#ffffff';
      renderCtx.beginPath();
      renderCtx.arc(gem.x, gem.y, r * 0.45, 0, TAU);
      renderCtx.fill();
    }
    renderCtx.globalAlpha = 1;
  };

  // 粒子：没有旋转/缩放需求，直接使用世界坐标绘制，避免每粒子 save/restore。
  renderer.renderParticles = function optimizedRenderParticles(renderCtx, g) {
    const list = g.particles;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p.active) continue;
      renderCtx.globalAlpha = Math.max(0, p.life / p.maxLife);
      renderCtx.fillStyle = p.color;
      renderCtx.beginPath();
      renderCtx.arc(p.x, p.y, p.size, 0, TAU);
      renderCtx.fill();
    }
    renderCtx.globalAlpha = 1;
  };

  // 受击环：减少 save/restore，避免逐对象切换 shadow 状态。
  renderer.renderHitRings = function optimizedRenderHitRings(renderCtx, g) {
    const list = g.hitRings;
    renderCtx.shadowBlur = 8;
    for (let i = 0; i < list.length; i++) {
      const hr = list[i];
      if (!hr.active) continue;
      const progress = 1 - (hr.life / hr.maxLife);
      const radius = hr.radius + (hr.maxRadius - hr.radius) * progress;
      renderCtx.globalAlpha = Math.max(0, (1 - progress) * 0.85);
      renderCtx.strokeStyle = hr.color;
      renderCtx.lineWidth = 2.5 * (1 - progress);
      renderCtx.shadowColor = hr.color;
      renderCtx.beginPath();
      renderCtx.arc(hr.x, hr.y, radius, 0, TAU);
      renderCtx.stroke();
    }
    renderCtx.globalAlpha = 1;
    renderCtx.shadowBlur = 0;
  };

  // 冲击波：采用双圈描边替代每帧径向渐变。
  renderer.renderShockwaves = function optimizedRenderShockwaves(renderCtx, g) {
    const list = g.shockwaves;
    for (let i = 0; i < list.length; i++) {
      const sw = list[i];
      if (!sw.active) continue;
      const progress = 1 - (sw.life / sw.maxLife);
      const radius = sw.radius + (sw.maxRadius - sw.radius) * progress;
      const alpha = Math.max(0, (1 - progress) * 0.9);
      renderCtx.globalAlpha = alpha;
      renderCtx.strokeStyle = sw.color || '#00f0ff';
      renderCtx.shadowColor = sw.color || '#00f0ff';
      renderCtx.shadowBlur = 8;
      renderCtx.lineWidth = Math.max(1, 6 * (1 - progress));
      renderCtx.beginPath();
      renderCtx.arc(sw.x, sw.y, radius, 0, TAU);
      renderCtx.stroke();
      renderCtx.shadowBlur = 0;
    }
    renderCtx.globalAlpha = 1;
  };

  // 枪口火光：用确定性脉冲替代渲染阶段 Math.random()，避免同一帧无谓随机调用。
  renderer.renderMuzzleFlash = function optimizedRenderMuzzleFlash(renderCtx, g) {
    const progress = Math.max(0, Math.min(1, g.muzzleFlash / 0.06));
    const flashSize = 14 + progress * 8;
    renderCtx.save();
    renderCtx.translate(g.hero.x, g.hero.y);
    renderCtx.rotate(g.hero.angle);

    renderCtx.fillStyle = '#ffffff';
    renderCtx.shadowColor = '#00f0ff';
    renderCtx.shadowBlur = 10 + progress * 6;
    renderCtx.beginPath();
    renderCtx.arc(36, 0, flashSize * 0.45, 0, TAU);
    renderCtx.fill();

    renderCtx.fillStyle = '#00f0ff';
    renderCtx.beginPath();
    renderCtx.ellipse(42, 0, flashSize * 0.75, flashSize * 0.28, 0, 0, TAU);
    renderCtx.fill();
    renderCtx.restore();
  };

  // 防止优化后的 renderer 留下脏状态。
  game.resetRenderState = () => {
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
  };
}
