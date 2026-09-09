import { saveManager } from '../systems/SaveManager.js';
import { sound } from '../systems/SoundEngine.js';

export const SKILL_CONFIG = {
  tornado: { cooldown: 7.5, duration: 4.2, radius: 190, damagePerSecond: 0.35, pullStrength: 0.025, maxPullSpeed: 50 },
  boomerang: { cooldown: 4.8, speed: 420, maxRange: 560, damage: 1.15, width: 26, critBonus: 0.35 },
  laser: { cooldown: 3.2, width: 14, damage: 1.6, burnDamage: 0.25, burnDuration: 2.2, displayDuration: 0.25 },
  bomber: { cooldown: 11.0, radius: 240, bombCount: 3, bombInterval: 0.45, damage: 0.95, knockback: 90, maxAimDistance: 300 }
};

export const PET_TYPES = {
  fluffy: {
    id: 'fluffy', name: '智械侦察机·光球', asset: 'assets/pets/fluffy.png', description: '发射多重连发高能弹幕，并用偏振护盾抵挡前线敌对目标冲击',
    baseStats: { hp: 70, attack: 14, attackSpeed: 1.1, moveSpeed: 210, range: 320, shield: 70 },
    skill: 'BULLET_SPRAY', skillParams: { bulletCount: 3, spread: 0.32 }
  },
  dragon: {
    id: 'dragon', name: '突击先锋机·炽焰', asset: 'assets/pets/dragon.png', description: '喷射扇形炽烈等离子射流，造成持续等离子灼烧并覆盖战场',
    baseStats: { hp: 100, attack: 22, attackSpeed: 0.85, moveSpeed: 160, range: 260, shield: 100 },
    skill: 'FIRE_BREATH', skillParams: { duration: 1.0, angle: Math.PI / 3 }
  }
};

let boomerangGlobalId = 0;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function nearestEnemy(game, x, y, range = Infinity) {
  let target = null;
  let best = range * range;
  for (let i = 0; i < game.enemies.length; i++) {
    const enemy = game.enemies[i];
    if (!enemy.active || enemy.hp <= 0) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= best) { best = d2; target = enemy; }
  }
  return target;
}

function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export class Pet {
  constructor(type, level = 1) {
    this.type = type;
    this.level = level;
    this.x = 0;
    this.y = 0;
    this.target = null;
    this.attackCooldown = 0;
    this.alive = true;
    this.contactTimer = 0;

    // 护盾与生命值系统 (护盾破碎进入 10 秒蜷缩状态)
    this.maxHp = this.getStat('hp');
    this.hp = this.maxHp;
    this.maxShield = this.maxHp;
    this.shield = this.maxShield;
    this.isCurled = false;
    this.curlTimer = 0;
    this.curlMaxTime = 10.0;
  }

  get config() { return PET_TYPES[this.type] || PET_TYPES.fluffy; }

  // 属性成长公式：base * (1 + (level - 1) * 0.25)
  getStat(name) {
    const base = this.config.baseStats[name] || 10;
    return Math.round(base * (1 + (this.level - 1) * 0.25));
  }

  get attack() { return this.getStat('attack'); }
  get attackSpeed() { return this.config.baseStats.attackSpeed; }
  get moveSpeed() { return this.config.baseStats.moveSpeed; }
  get range() { return this.config.baseStats.range; }

  // 5级阶段进化阶级
  get evolutionTier() {
    if (this.level >= 10) return 3;
    if (this.level >= 5) return 2;
    return 1;
  }

  get evolutionTitle() {
    const tier = this.evolutionTier;
    if (this.type === 'fluffy') {
      return tier === 3 ? '三阶·机甲神球' : (tier === 2 ? '二阶·觉醒爆裂球' : '一阶·幼生毛球');
    }
    return tier === 3 ? '三阶·灭世熔岩龙' : (tier === 2 ? '二阶·狂炎巨龙' : '一阶·幼龙烈火');
  }

  takeDamage(amount, game) {
    if (this.isCurled || !this.alive) return;
    this.hp -= amount;
    game.spawnParticles(this.x, this.y, '#38bdf8', 6, 'spark');

    if (this.hp <= 0) {
      this.hp = 0;
      this.isCurled = true;
      this.curlTimer = this.curlMaxTime;
      sound.playEmp();
      game.feedback.addTrauma(0.3);
      game.spawnDamageText(this.x, this.y - 20, '🛡️ 护盾过载！蜷缩休眠中...', '#38bdf8', true, true);
    }
  }

  update(dt, game) {
    if (!this.alive || !game.hero) return;

    // 1. 蜷缩/恢复状态处理 (10秒倒计时)
    if (this.isCurled) {
      this.curlTimer -= dt;
      if (this.curlTimer <= 0) {
        this.isCurled = false;
        this.curlTimer = 0;
        this.hp = this.maxHp;
        this.shield = this.maxShield;
        sound.playLevelUp();
        game.spawnParticles(this.x, this.y, '#22c55e', 20, 'spark');
        game.spawnDamageText(this.x, this.y - 24, '✨ 护盾重启！重返战线！', '#22c55e', true, true);
      }
    }

    // 2. 软跟随 + 超过 300px 瞬移归位机制
    const distToHero = distance(this, game.hero);
    if (distToHero > 300) {
      // 距离超过 300px，残影闪现到英雄身旁，防止被地形与怪群卡死
      this.x = game.hero.x - 55;
      this.y = game.hero.y + 15;
      game.spawnParticles(this.x, this.y, '#38bdf8', 12, 'spark');
      game.spawnParticles(this.x, this.y, '#c084fc', 8, 'smoke');
    } else {
      const followDistance = 90;
      const dx = game.hero.x - this.x;
      const dy = game.hero.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > followDistance) {
        const speed = this.moveSpeed * (d > 220 ? 1.6 : 1);
        this.x += (dx / Math.max(1, d)) * speed * dt;
        this.y += (dy / Math.max(1, d)) * speed * dt;
      } else {
        const orbit = Math.sin((game.survivalTime || 0) * 1.8) * 16;
        const anchorX = game.hero.x - (dx / Math.max(1, d)) * followDistance;
        const anchorY = game.hero.y - (dy / Math.max(1, d)) * followDistance;
        this.x += (anchorX + orbit - this.x) * Math.min(1, dt * 4);
        this.y += (anchorY - orbit - this.y) * Math.min(1, dt * 4);
      }
    }

    // 3. 近战小怪碰撞阻截分担伤害 (护盾实战受击判定)
    if (!this.isCurled) {
      this.contactTimer -= dt;
      if (this.contactTimer <= 0) {
        for (let i = 0; i < game.enemies.length; i++) {
          const e = game.enemies[i];
          if (!e.active || e.hp <= 0) continue;
          const hitDist = e.radius + 22;
          if ((e.x - this.x) ** 2 + (e.y - this.y) ** 2 <= hitDist * hitDist) {
            this.contactTimer = 0.45;
            this.takeDamage(e.attackPower * 0.4, game);
            e.y -= 10; // 护盾阻挡微击退
            break;
          }
        }
      }
    }

    // 蜷缩期间停止输出
    if (this.isCurled) return;

    // 4. 自动索敌与攻击循环
    this.attackCooldown -= dt;
    this.target = nearestEnemy(game, this.x, this.y, this.range);
    if (!this.target || this.attackCooldown > 0) return;

    this.attackCooldown = 1 / this.attackSpeed;
    if (this.config.skill === 'BULLET_SPRAY') {
      this.bulletSpray(game);
    } else {
      this.fireBreath(game);
    }
  }

  bulletSpray(game) {
    const base = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    const tier = this.evolutionTier;
    // 进化提升弹幕发数
    const count = tier === 3 ? 7 : (tier === 2 ? 5 : 3);
    const spread = tier === 3 ? 0.45 : (tier === 2 ? 0.38 : 0.28);
    const frostSlow = tier >= 2 ? 0.2 : 0;

    for (let i = 0; i < count; i++) {
      const angle = base + (i - (count - 1) / 2) * spread;
      game.feature.petBullets.push({
        active: true,
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * 580,
        vy: Math.sin(angle) * 580,
        damage: this.attack,
        life: 1.2,
        pierce: tier === 3 ? 2 : 1,
        frostSlow
      });
    }
  }

  fireBreath(game) {
    const base = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    const tier = this.evolutionTier;
    // 进化提升龙炎角度与射程
    const cone = tier === 3 ? Math.PI * 0.65 : (tier === 2 ? Math.PI / 2 : Math.PI / 3);
    const effectiveRange = this.range * (tier === 3 ? 1.4 : (tier === 2 ? 1.2 : 1.0));

    for (let i = 0; i < game.enemies.length; i++) {
      const enemy = game.enemies[i];
      if (!enemy.active || enemy.hp <= 0) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > effectiveRange + enemy.radius) continue;

      let diff = Math.abs(Math.atan2(dy, dx) - base);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      if (diff <= cone / 2) {
        game.combatSystem.onHit(enemy, this.attack, false, 'pet-fire');
      }
    }

    game.feature.petEffects.push({
      type: 'breath',
      x: this.x,
      y: this.y,
      angle: base,
      life: 0.22,
      maxLife: 0.22,
      range: effectiveRange,
      cone
    });
  }
}

function getPetData() {
  if (!saveManager.data.petData) saveManager.data.petData = { selected: null, pets: {} };
  if (!saveManager.data.petData.pets) saveManager.data.petData.pets = {};
  for (const id of Object.keys(PET_TYPES)) {
    if (!saveManager.data.petData.pets[id]) {
      saveManager.data.petData.pets[id] = { unlocked: id === 'fluffy', level: 1 };
    }
  }
  return saveManager.data.petData;
}

function updateSkills(game, dt) {
  const f = game.feature;
  for (const [id, skill] of Object.entries(f.skills)) {
    if (skill.level <= 0) continue;
    skill.timer += dt;
    if (skill.timer < skill.cooldown) continue;
    skill.timer = 0;

    const target = f.target || nearestEnemy(game, game.hero.x, game.hero.y);
    if (!target && id !== 'laser') continue;

    // 1. 微型引力奇点 (场能引力 · 触发元素扩散)
    if (id === 'tornado') {
      f.tornadoes.push({
        x: target.x,
        y: target.y,
        life: SKILL_CONFIG.tornado.duration,
        maxLife: SKILL_CONFIG.tornado.duration,
        tick: 0
      });
      game.spawnDamageText(target.x, target.y - 15, '🌀 微型引力奇点!', '#34d399', true, false);
    }

    // 2. 高周波磁旋刃 (动能物理 · 高额暴击 · 无锁阶段去重)
    if (id === 'boomerang') {
      const angle = Math.atan2(target.y - game.hero.y, target.x - game.hero.x);
      f.boomerangs.push({
        id: ++boomerangGlobalId,
        phase: 'out',
        x: game.hero.x,
        y: game.hero.y,
        sx: game.hero.x,
        sy: game.hero.y,
        vx: Math.cos(angle) * SKILL_CONFIG.boomerang.speed,
        vy: Math.sin(angle) * SKILL_CONFIG.boomerang.speed,
        outbound: true
      });
    }

    // 3. 粒子歼灭切割器 (脉冲雷系 · 触发感电与超载爆轰)
    if (id === 'laser') {
      const angle = target ? Math.atan2(target.y - game.hero.y, target.x - game.hero.x) : -Math.PI / 2;
      f.lasers.push({
        x: game.hero.x,
        y: game.hero.y,
        angle,
        life: SKILL_CONFIG.laser.displayDuration,
        maxLife: SKILL_CONFIG.laser.displayDuration
      });
      const x2 = game.hero.x + Math.cos(angle) * Math.max(game.width, game.height) * 2;
      const y2 = game.hero.y + Math.sin(angle) * Math.max(game.width, game.height) * 2;

      for (let i = 0; i < game.enemies.length; i++) {
        const enemy = game.enemies[i];
        if (!enemy.active) continue;
        if (pointSegmentDistance(enemy.x, enemy.y, game.hero.x, game.hero.y, x2, y2) <= SKILL_CONFIG.laser.width / 2 + enemy.radius) {
          game.combatSystem.onHit(enemy, Math.round(game.weapon.damage * SKILL_CONFIG.laser.damage), false, 'laser');
        }
      }
    }

    // 4. 天基动能天谴打击 (天基高爆 · 预瞄红圈指示器 + 连续连投)
    if (id === 'bomber') {
      // 钳制落点在玩家防线 300px 内
      let aimX = target.x;
      let aimY = target.y;
      const maxDistance = SKILL_CONFIG.bomber.maxAimDistance || 300;
      const distHero = Math.hypot(aimX - game.hero.x, aimY - game.hero.y);
      if (distHero > maxDistance) {
        const ang = Math.atan2(aimY - game.hero.y, aimX - game.hero.x);
        aimX = game.hero.x + Math.cos(ang) * maxDistance;
        aimY = game.hero.y + Math.sin(ang) * maxDistance;
      }

      // 生成半透明红色战术预瞄光圈指示器
      f.bomberReticle = {
        x: aimX,
        y: aimY,
        radius: 120,
        life: 0.9,
        maxLife: 0.9
      };

      f.bomber = {
        x: aimX,
        y: aimY,
        timer: 0.15,
        dropped: 0
      };
    }
  }
}

function updateCombat(game, dt) {
  const f = game.feature;

  // 1. 高周波磁旋刃：无锁时间/阶段戳去重 (杜绝 Set 野指针 Bug)
  for (let i = f.boomerangs.length - 1; i >= 0; i--) {
    const b = f.boomerangs[i];
    if (b.outbound && distance(b, { x: b.sx, y: b.sy }) >= SKILL_CONFIG.boomerang.maxRange) {
      b.outbound = false;
      b.phase = 'back';
    }
    if (!b.outbound) {
      const dx = game.hero.x - b.x;
      const dy = game.hero.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d < 28) {
        f.boomerangs.splice(i, 1);
        continue;
      }
      b.vx = (dx / Math.max(1, d)) * SKILL_CONFIG.boomerang.speed;
      b.vy = (dy / Math.max(1, d)) * SKILL_CONFIG.boomerang.speed;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    for (let j = 0; j < game.enemies.length; j++) {
      const enemy = game.enemies[j];
      if (!enemy.active || enemy.hp <= 0) continue;

      // 阶段戳判定：如果本高周波磁旋刃在当前阶段已命中过该怪，则跳过
      if (enemy._lastBoomerangId === b.id && enemy._lastBoomerangPhase === b.phase) continue;

      const r = enemy.radius + SKILL_CONFIG.boomerang.width / 2;
      if ((enemy.x - b.x) ** 2 + (enemy.y - b.y) ** 2 <= r * r) {
        enemy._lastBoomerangId = b.id;
        enemy._lastBoomerangPhase = b.phase;

        // 自带 35% 额外暴击加成
        const isCrit = Math.random() < (game.weapon.critChance + 0.35);
        const dmg = Math.round(game.weapon.damage * SKILL_CONFIG.boomerang.damage * (isCrit ? game.weapon.critMult : 1.0));
        game.combatSystem.onHit(enemy, dmg, isCrit, 'boomerang', b.vx * 0.15, b.vy * 0.15);
      }
    }
  }

  // 2. 微型引力奇点：阻尼平滑牵引 + 击退状态互斥
  for (let i = f.tornadoes.length - 1; i >= 0; i--) {
    const t = f.tornadoes[i];
    t.life -= dt;
    t.tick += dt;
    if (t.life <= 0) {
      f.tornadoes.splice(i, 1);
      continue;
    }

    // 周期性造成风刃伤害并触发元素扩散
    if (t.tick >= 0.4) {
      t.tick = 0;
      for (let j = 0; j < game.enemies.length; j++) {
        const enemy = game.enemies[j];
        if (!enemy.active || enemy.hp <= 0) continue;
        const dx = t.x - enemy.x;
        const dy = t.y - enemy.y;
        const d = Math.hypot(dx, dy);
        if (d <= SKILL_CONFIG.tornado.radius + enemy.radius) {
          game.combatSystem.onHit(enemy, Math.round(game.weapon.damage * SKILL_CONFIG.tornado.damagePerSecond * 0.4), false, 'tornado');
        }
      }
    }

    // 平滑阻尼物理牵引（与击退互斥）
    for (let j = 0; j < game.enemies.length; j++) {
      const enemy = game.enemies[j];
      if (!enemy.active || enemy.hp <= 0) continue;

      // 击退状态互斥：处于被击退硬直状态时不牵引，杜绝瞬移抽搐！
      if (enemy.hitStagger > 0) continue;

      const dx = t.x - enemy.x;
      const dy = t.y - enemy.y;
      const d = Math.hypot(dx, dy);
      if (d > SKILL_CONFIG.tornado.radius + enemy.radius) continue;

      // 阻尼加速度模型
      const ax = dx * 0.022;
      const ay = dy * 0.022;
      enemy.vx = (enemy.vx || 0) + ax;
      enemy.vy = (enemy.vy || 0) + ay;

      // 限制最大牵引速度 50px/s
      const curSpeed = Math.hypot(enemy.vx, enemy.vy);
      if (curSpeed > 50) {
        enemy.vx = (enemy.vx / curSpeed) * 50;
        enemy.vy = (enemy.vy / curSpeed) * 50;
      }
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
    }
  }

  // 3. 预瞄指示器倒计时
  if (f.bomberReticle) {
    f.bomberReticle.life -= dt;
    if (f.bomberReticle.life <= 0) f.bomberReticle = null;
  }

  // 4. 天基动能打击投掷循环
  if (f.bomber) {
    f.bomber.timer += dt;
    if (f.bomber.dropped < SKILL_CONFIG.bomber.bombCount && f.bomber.timer >= SKILL_CONFIG.bomber.bombInterval) {
      f.bomber.timer = 0;
      f.bomber.dropped++;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 55;
      f.bombs.push({
        x: f.bomber.x + Math.cos(angle) * radius,
        y: f.bomber.y + Math.sin(angle) * radius,
        life: 0.42
      });
    }
    if (f.bomber.dropped >= SKILL_CONFIG.bomber.bombCount) f.bomber = null;
  }

  // 5. 航弹落地爆轰
  for (let i = f.bombs.length - 1; i >= 0; i--) {
    const bomb = f.bombs[i];
    bomb.life -= dt;
    if (bomb.life > 0) continue;

    sound.playExplosion();
    game.feedback.addTrauma(0.45);
    game.spawnParticles(bomb.x, bomb.y, '#ff4400', 32, 'fire');
    game.spawnParticles(bomb.x, bomb.y, '#facc15', 20, 'spark');

    for (let j = 0; j < game.enemies.length; j++) {
      const enemy = game.enemies[j];
      if (!enemy.active || enemy.hp <= 0) continue;
      const dx = enemy.x - bomb.x;
      const dy = enemy.y - bomb.y;
      const d = Math.hypot(dx, dy);
      if (d > SKILL_CONFIG.bomber.radius) continue;

      const falloff = 1 - Math.min(1, d / SKILL_CONFIG.bomber.radius) * 0.45;
      game.combatSystem.onHit(enemy, Math.round(game.weapon.damage * SKILL_CONFIG.bomber.damage * falloff), true, 'bomber');
      const k = SKILL_CONFIG.bomber.knockback / Math.max(1, d);
      enemy.x += dx * k;
      enemy.y += dy * k;
    }
    f.bombs.splice(i, 1);
  }

  // 6. 激光清理
  for (let i = f.lasers.length - 1; i >= 0; i--) {
    f.lasers[i].life -= dt;
    if (f.lasers[i].life <= 0) f.lasers.splice(i, 1);
  }

  // 7. 宠物子弹更新
  for (let i = f.petBullets.length - 1; i >= 0; i--) {
    const bullet = f.petBullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.life <= 0 || bullet.x < 0 || bullet.x > game.width || bullet.y < 0 || bullet.y > game.height) {
      f.petBullets.splice(i, 1);
      continue;
    }
    for (let j = 0; j < game.enemies.length; j++) {
      const enemy = game.enemies[j];
      if (!enemy.active || bullet.pierce <= 0) continue;
      const r = enemy.radius + 6;
      if ((enemy.x - bullet.x) ** 2 + (enemy.y - bullet.y) ** 2 <= r * r) {
        game.combatSystem.onHit(enemy, bullet.damage, false, 'pet');
        if (bullet.frostSlow) {
          enemy.freezeTimer = Math.max(enemy.freezeTimer || 0, 1.2);
          enemy.freezeFactor = 1.0 - bullet.frostSlow;
        }
        bullet.pierce -= 1;
      }
    }
  }
}

function renderFeature(game) {
  const ctx = game.ctx;
  const f = game.feature;

  // 1. 轰炸机战术预瞄红圈指示器 (Aim Reticle)
  if (f.bomberReticle) {
    const r = f.bomberReticle;
    const alpha = Math.min(1, r.life / r.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha * 0.7;

    // 半透明红色落地范围
    ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.fill();

    // 呼吸发光红色边框
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 十字锁定准星
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r.x - 22, r.y); ctx.lineTo(r.x + 22, r.y);
    ctx.moveTo(r.x, r.y - 22); ctx.lineTo(r.x, r.y + 22);
    ctx.stroke();

    // 锁定文字标识
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ 战术空投锁定中...', r.x, r.y - r.radius - 8);

    ctx.restore();
  }

  // 2. 龙卷风渲染 (高清风暴漩涡图素 + 逆时针双层涡流粒子)
  for (const tornado of f.tornadoes) {
    const r = SKILL_CONFIG.tornado.radius;
    ctx.save();
    ctx.translate(tornado.x, tornado.y);

    // 外层青翠风压气浪圈
    const windGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, r);
    windGrad.addColorStop(0, 'rgba(52, 211, 153, 0.45)');
    windGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.25)');
    windGrad.addColorStop(0.9, 'rgba(5, 150, 105, 0.1)');
    windGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = windGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 高清暴风之眼：直立涡流 (尖端扎地 + 横向呼吸模拟高速自转 + 轻微摇曳，杜绝整体翻转导致的歪斜)
    if (f.tornadoImage && f.tornadoImage.complete) {
      const t = (game.survivalTime || 0) + tornado.x * 0.01;
      const appear = Math.min(1, (tornado.maxLife - tornado.life) * 5);
      const vanish = Math.min(1, tornado.life * 2.2);
      const sway = Math.sin(t * 2.6) * 0.045;
      const spin = 0.82 + 0.18 * Math.abs(Math.cos(t * 7));
      const bob = Math.sin(t * 4) * 3;
      ctx.rotate(sway);
      ctx.globalAlpha = 0.9 * appear * vanish;
      const w = r * 1.9 * spin;
      const h = r * 2.05;
      ctx.drawImage(f.tornadoImage, -w / 2, -h * 0.86 + bob, w, h);
    }
    ctx.restore();
  }

  // 3. 高周波磁旋刃渲染 (高清合金等离子飞刃 + 高速旋转流光拖尾)
  for (const b of f.boomerangs) {
    ctx.save();
    ctx.translate(b.x, b.y);

    // 旋转风刃能量光环
    const auraGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 26);
    auraGrad.addColorStop(0, 'rgba(34, 211, 238, 0.8)');
    auraGrad.addColorStop(0.6, 'rgba(250, 204, 21, 0.4)');
    auraGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();

    // 高速旋转飞刃原画
    ctx.rotate((game.survivalTime || 0) * 18);
    if (f.boomerangImage) {
      ctx.drawImage(f.boomerangImage, -20, -20, 40, 40);
    }
    ctx.restore();
  }

  // 4. 激光渲染 (三层高能贯通电磁等离子光束：紫色外晕 + 亮粉聚焦 + 纯白激光核心)
  for (const laser of f.lasers) {
    const x2 = laser.x + Math.cos(laser.angle) * Math.max(game.width, game.height) * 2;
    const y2 = laser.y + Math.sin(laser.angle) * Math.max(game.width, game.height) * 2;
    const alpha = laser.life / laser.maxLife;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 1. 宽幅超导外晕
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
    ctx.lineWidth = SKILL_CONFIG.laser.width * 2.6;
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 2. 高压电离中层光束
    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = SKILL_CONFIG.laser.width * 1.2;
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 3. 极亮纯白贯穿激光核心
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, SKILL_CONFIG.laser.width * 0.4);
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.restore();
  }

  // 5. 天基动能天谴打击战术卫星与动能弹
  if (f.bomber) {
    // 掠过战场的隐身轰炸巡航机
    ctx.save();
    ctx.translate(f.bomber.x, f.bomber.y - 120 + f.bomber.timer * 60);
    if (f.bombImage) {
      ctx.drawImage(f.bombImage, -32, -32, 64, 64);
    }
    // 尾部喷气橙光
    ctx.fillStyle = '#ff7700';
    ctx.beginPath();
    ctx.arc(0, 24, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const bomb of f.bombs) {
    ctx.save();
    ctx.translate(bomb.x, bomb.y);
    // 航弹下落尾焰
    ctx.fillStyle = 'rgba(255, 120, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(0, -8, 6, 0, Math.PI * 2);
    ctx.fill();

    if (f.bombImage) {
      ctx.drawImage(f.bombImage, -16, -16, 32, 32);
    }
    ctx.restore();
  }

  // 6. 宠物本体与蜷缩/护盾渲染
  if (game.pet?.alive && game.pet.image) {
    const pet = game.pet;
    ctx.save();
    if (pet.isCurled) {
      // 蜷缩休眠状态：半透明淡蓝护盾球 + 旋转恢复环
      ctx.globalAlpha = 0.65;
      ctx.drawImage(pet.image, pet.x - 20, pet.y - 20, 40, 40);

      // 旋转恢复护盾球
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pet.x, pet.y, 28, 0, Math.PI * 2);
      ctx.stroke();

      // 休眠恢复倒计时文字
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`恢复中 ${pet.curlTimer.toFixed(1)}s`, pet.x, pet.y - 32);
    } else {
      ctx.drawImage(pet.image, pet.x - 24, pet.y - 24, 48, 48);

      // 头顶微缩护盾生命条
      const barW = 36;
      const barH = 4;
      const barX = pet.x - barW / 2;
      const barY = pet.y - 30;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(barX, barY, barW, barH);
      const ratio = clamp(pet.hp / pet.maxHp, 0, 1);
      ctx.fillStyle = ratio > 0.35 ? '#22c55e' : '#ef4444';
      ctx.fillRect(barX, barY, barW * ratio, barH);
    }
    ctx.restore();
  }

  // 7. 宠物子弹与龙息渲染
  for (const bullet of f.petBullets) {
    ctx.drawImage(f.petBulletImage, bullet.x - 4, bullet.y - 4, 8, 8);
  }
  for (const effect of f.petEffects) {
    if (effect.type !== 'breath') continue;
    ctx.save();
    ctx.globalAlpha = effect.life / effect.maxLife;
    ctx.translate(effect.x, effect.y);
    ctx.rotate(effect.angle);
    ctx.drawImage(f.breathImage, 0, -28, effect.range, 56);
    ctx.restore();
  }
}

function asset(src) {
  const image = new Image();
  image.src = src;
  return image;
}

export function installSkillsPetsFeature(game) {
  if (game.feature) return;

  const getEquipped = () => {
    try {
      return saveManager.getEquippedSkills() || [];
    } catch (e) {
      return [];
    }
  };

  game.feature = {
    skills: Object.fromEntries(Object.entries(SKILL_CONFIG).map(([id, cfg]) => {
      const isEq = getEquipped().includes(id);
      return [id, { level: isEq ? 1 : 0, cooldown: cfg.cooldown, timer: cfg.cooldown }];
    })),
    tornadoes: [],
    boomerangs: [],
    lasers: [],
    bombs: [],
    bomber: null,
    bomberReticle: null,
    petBullets: [],
    petEffects: [],
    target: { x: game.hero.x, y: game.hero.y - 250 },
    tornadoImage: asset('assets/skills/tornado.png'),
    boomerangImage: asset('assets/skills/boomerang.png'),
    bombImage: asset('assets/skills/bomber.png'),
    petBulletImage: asset('assets/skills/pet-bullet.png'),
    breathImage: asset('assets/skills/breath.png')
  };

  game.pet = null;

  game.feature.syncPet = () => {
    if (saveManager?.isSystemUnlocked && !saveManager.isSystemUnlocked('pets')) {
      game.pet = null;
      return;
    }
    const petData = getPetData();
    const id = petData?.selected;
    if (!id) { game.pet = null; return; }
    const saved = petData?.pets?.[id];
    if (!saved?.unlocked) { game.pet = null; return; }
    game.pet = new Pet(id, saved.level);
    game.pet.x = game.hero.x - 65;
    game.pet.y = game.hero.y + 25;
    game.pet.image = asset(PET_TYPES[id]?.asset || 'assets/pets/fluffy.png');
  };

  const originalReset = game.resetGame.bind(game);
  game.resetGame = function() {
    originalReset();
    const equipped = getEquipped();
    for (const [id, cfg] of Object.entries(SKILL_CONFIG)) {
      const isEq = equipped.includes(id);
      this.feature.skills[id] = { level: isEq ? 1 : 0, cooldown: cfg.cooldown, timer: cfg.cooldown };
    }
    this.feature.tornadoes = [];
    this.feature.boomerangs = [];
    this.feature.lasers = [];
    this.feature.bombs = [];
    this.feature.bomber = null;
    this.feature.bomberReticle = null;
    this.feature.petBullets = [];
    this.feature.petEffects = [];
    this.feature.syncPet();
  };

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);
    updateSkills(this, dt);
    updateCombat(this, dt);
    if (this.pet) this.pet.update(dt, this);
    for (const effect of this.feature.petEffects) effect.life -= dt;
    this.feature.petEffects = this.feature.petEffects.filter(effect => effect.life > 0);

    const hud = document.getElementById('kp-pet-hud');
    if (hud && this.pet) {
      hud.style.display = 'block';
      const statusText = this.pet.isCurled ? `[休眠恢复 ${this.pet.curlTimer.toFixed(1)}s]` : `HP: ${Math.ceil(this.pet.hp)} / ${Math.ceil(this.pet.maxHp)}`;
      document.getElementById('kp-pet-name').textContent = `${PET_TYPES[this.pet.type]?.name || '宠物'} Lv.${this.pet.level} (${this.pet.evolutionTitle})`;
      document.getElementById('kp-pet-hp').style.width = `${clamp(this.pet.hp / this.pet.maxHp, 0, 1) * 100}%`;
      document.getElementById('kp-pet-hp-text').textContent = statusText;
    } else if (hud) {
      hud.style.display = 'none';
    }
  };

  const originalRender = game.renderer.render.bind(game.renderer);
  game.renderer.render = function(g) {
    originalRender(g);
    renderFeature(g);
  };

  const originalStartStage = game.startStage?.bind(game);
  if (originalStartStage) {
    game.startStage = function(stageId) {
      originalStartStage(stageId);
      this.feature.syncPet();
    };
  }

  window.PET_TYPES = PET_TYPES;
  window.SKILL_CONFIG = SKILL_CONFIG;
}
