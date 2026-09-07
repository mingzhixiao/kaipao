import { saveManager } from '../systems/SaveManager.js';

const SKILL_CONFIG = {
  tornado: { cooldown: 8, duration: 4, radius: 200, damagePerSecond: 0.3, pullStrength: 0.05 },
  boomerang: { cooldown: 5, speed: 400, maxRange: 600, damage: 1.0, width: 20 },
  laser: { cooldown: 3, width: 10, damage: 1.5, burnDamage: 0.2, burnDuration: 2, displayDuration: 0.2 },
  bomber: { cooldown: 12, radius: 250, bombCount: 3, bombInterval: 0.5, damage: 0.8, knockback: 100 }
};

const PET_TYPES = {
  fluffy: {
    id: 'fluffy', name: '小毛球', asset: 'assets/pets/fluffy.png', description: '发射三连弹幕攻击敌人',
    baseStats: { hp: 50, attack: 10, attackSpeed: 1.0, moveSpeed: 200, range: 300 },
    skill: 'BULLET_SPRAY', skillParams: { bulletCount: 3, spread: Math.PI / 6 }
  },
  dragon: {
    id: 'dragon', name: '幼龙', asset: 'assets/pets/dragon.png', description: '喷吐扇形火焰攻击敌人',
    baseStats: { hp: 80, attack: 15, attackSpeed: 0.8, moveSpeed: 150, range: 250 },
    skill: 'FIRE_BREATH', skillParams: { duration: 1, angle: Math.PI / 3 }
  }
};

const SKILL_CARDS = [
  { id: 'tornado', name: '裂风涡流', desc: '生成持续 4 秒的风暴，牵引并持续伤害范围内敌人。', asset: 'assets/skills/tornado.png', rarity: 'epic' },
  { id: 'boomerang', name: '回旋刃', desc: '高速穿透飞刃，飞出后返回，往返各可命中一次。', asset: 'assets/skills/boomerang.png', rarity: 'rare' },
  { id: 'laser', name: '湮灭射线', desc: '释放贯穿全屏的高能射线，并施加持续灼烧。', asset: 'assets/skills/laser.png', rarity: 'legendary' },
  { id: 'bomber', name: '轨道轰炸', desc: '连续投下 3 枚炸弹，对范围敌人造成伤害并击退。', asset: 'assets/skills/bomber.png', rarity: 'epic' }
];

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function nearestEnemy(game, x, y, range = Infinity) {
  let target = null;
  let best = range * range;
  for (const enemy of game.enemies) {
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

class Pet {
  constructor(type, level = 1) {
    this.type = type; this.level = level; this.x = 0; this.y = 0;
    this.target = null; this.attackCooldown = 0; this.alive = true;
    this.maxHp = this.getStat('hp'); this.hp = this.maxHp;
  }
  get config() { return PET_TYPES[this.type]; }
  getStat(name) { return this.config.baseStats[name] * (1 + (this.level - 1) * 0.1); }
  get attack() { return this.getStat('attack'); }
  get attackSpeed() { return this.getStat('attackSpeed'); }
  get moveSpeed() { return this.getStat('moveSpeed'); }
  get range() { return this.getStat('range'); }
  update(dt, game) {
    if (!this.alive || !game.hero) return;
    const dx = game.hero.x - this.x, dy = game.hero.y - this.y, d = Math.hypot(dx, dy);
    const followDistance = 100;
    if (d > followDistance) {
      const speed = this.moveSpeed * (d > 260 ? 1.8 : 1);
      this.x += dx / Math.max(1, d) * speed * dt;
      this.y += dy / Math.max(1, d) * speed * dt;
    } else {
      const orbit = Math.sin((game.survivalTime || 0) * 1.8) * 18;
      const anchorX = game.hero.x - dx / Math.max(1, d) * followDistance;
      const anchorY = game.hero.y - dy / Math.max(1, d) * followDistance;
      this.x += (anchorX + orbit - this.x) * Math.min(1, dt * 4);
      this.y += (anchorY - orbit - this.y) * Math.min(1, dt * 4);
    }
    this.attackCooldown -= dt;
    this.target = nearestEnemy(game, this.x, this.y, this.range);
    if (!this.target || this.attackCooldown > 0) return;
    this.attackCooldown = 1 / this.attackSpeed;
    if (this.config.skill === 'BULLET_SPRAY') this.bulletSpray(game); else this.fireBreath(game);
  }
  bulletSpray(game) {
    const base = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    const count = this.config.skillParams.bulletCount;
    for (let i = 0; i < count; i++) {
      const angle = base + (i - (count - 1) / 2) * this.config.skillParams.spread;
      game.feature.petBullets.push({ active: true, x: this.x, y: this.y, vx: Math.cos(angle) * 560, vy: Math.sin(angle) * 560, damage: this.attack, life: 1.2, pierce: 1 });
    }
  }
  fireBreath(game) {
    const base = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    const cone = this.config.skillParams.angle;
    for (const enemy of game.enemies) {
      if (!enemy.active || enemy.hp <= 0) continue;
      const dx = enemy.x - this.x, dy = enemy.y - this.y, d = Math.hypot(dx, dy);
      if (d > this.range + enemy.radius) continue;
      let diff = Math.abs(Math.atan2(dy, dx) - base);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      if (diff <= cone / 2) game.combatSystem.onHit(enemy, this.attack, false, 'pet-fire');
    }
    game.feature.petEffects.push({ type: 'breath', x: this.x, y: this.y, angle: base, life: 0.18, maxLife: 0.18, range: this.range, cone });
  }
}

function getPetData() {
  if (!saveManager.data.petData) saveManager.data.petData = { selected: null, pets: {} };
  if (!saveManager.data.petData.pets) saveManager.data.petData.pets = {};
  for (const id of Object.keys(PET_TYPES)) {
    if (!saveManager.data.petData.pets[id]) saveManager.data.petData.pets[id] = { unlocked: id === 'fluffy', level: 1 };
  }
  return saveManager.data.petData;
}
function petUpgradeCost(level) { return 50 + (level - 1) * 35; }

function ensureUi(game) {
  if (document.getElementById('kp-pet-select')) return;
  const style = document.createElement('style');
  style.id = 'kaipao-skills-pets-style';
  style.textContent = `.kp-modal{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.82);backdrop-filter:blur(7px);font-family:system-ui,sans-serif;color:#e5e7eb}.kp-panel{width:min(92vw,620px);max-height:88vh;overflow:auto;background:linear-gradient(145deg,#111827,#020617);border:1px solid rgba(148,163,184,.28);border-radius:18px;box-shadow:0 25px 80px rgba(0,0,0,.55);padding:22px}.kp-title{font-size:24px;font-weight:800;margin-bottom:5px}.kp-sub{font-size:13px;color:#94a3b8;margin-bottom:18px}.kp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.kp-card{position:relative;padding:15px;border:1px solid rgba(148,163,184,.2);border-radius:14px;background:rgba(15,23,42,.75);cursor:pointer;transition:.18s}.kp-card:hover{transform:translateY(-2px);border-color:#38bdf8}.kp-card.selected{border-color:#22d3ee;box-shadow:0 0 0 2px rgba(34,211,238,.16)}.kp-card.locked{opacity:.48;cursor:not-allowed}.kp-icon{width:56px;height:56px;display:block;margin-bottom:8px}.kp-name{font-weight:800;font-size:17px}.kp-desc{font-size:12px;color:#94a3b8;margin:5px 0 9px}.kp-stats{font-size:11px;line-height:1.7;color:#cbd5e1}.kp-actions{display:flex;gap:10px;margin-top:18px}.kp-btn{flex:1;border:1px solid rgba(148,163,184,.3);background:#1e293b;color:#e2e8f0;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer}.kp-btn.primary{background:#0891b2;border-color:#22d3ee}.kp-btn:disabled{opacity:.45;cursor:not-allowed}.kp-pill{position:absolute;right:10px;top:10px;font-size:10px;padding:3px 7px;border-radius:99px;background:rgba(34,211,238,.14);color:#67e8f9}.kp-upgrade{margin-top:12px;padding:12px;border-radius:12px;background:rgba(15,23,42,.8);border:1px solid rgba(148,163,184,.16)}.kp-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.kp-small{font-size:11px;color:#94a3b8}.kp-hud{position:absolute;z-index:40;right:10px;bottom:112px;width:112px;display:none;pointer-events:none;padding:7px;border-radius:10px;background:rgba(2,6,23,.72);border:1px solid rgba(148,163,184,.18);color:#e2e8f0;font-size:10px}.kp-hp{height:5px;background:#334155;border-radius:99px;overflow:hidden;margin-top:4px}.kp-hp>i{display:block;height:100%;background:#22c55e;width:100%}`;
  document.head.appendChild(style);

  const select = document.createElement('div'); select.id = 'kp-pet-select'; select.className = 'kp-modal';
  select.innerHTML = '<div class="kp-panel"><div class="kp-title">战前伙伴</div><div class="kp-sub">最多携带 1 只宠物。宠物等级为永久成长。</div><div id="kp-pet-grid" class="kp-grid"></div><div class="kp-actions"><button id="kp-pet-none" class="kp-btn">本局不携带</button><button id="kp-pet-confirm" class="kp-btn primary">确认出战</button></div></div>';
  document.body.appendChild(select);
  const upgrade = document.createElement('div'); upgrade.id = 'kp-pet-upgrade'; upgrade.className = 'kp-modal';
  upgrade.innerHTML = '<div class="kp-panel"><div class="kp-title">宠物培养</div><div class="kp-sub">消耗废料永久提升等级，每级全属性 +10%。</div><div id="kp-pet-upgrade-list"></div><div class="kp-actions"><button id="kp-pet-upgrade-close" class="kp-btn">返回</button></div></div>';
  document.body.appendChild(upgrade);
  const hud = document.createElement('div'); hud.id = 'kp-pet-hud'; hud.className = 'kp-hud';
  hud.innerHTML = '<b id="kp-pet-name">宠物</b><div class="kp-hp"><i id="kp-pet-hp"></i></div><span id="kp-pet-hp-text"></span>';
  game.container.appendChild(hud);
  document.getElementById('kp-pet-upgrade-close').onclick = () => { upgrade.style.display = 'none'; game.isPaused = false; };
}

function renderPetSelect(game) {
  const data = getPetData(), grid = document.getElementById('kp-pet-grid');
  if (!grid) return;
  let selected = data.selected; grid.innerHTML = '';
  for (const pet of Object.values(PET_TYPES)) {
    const saved = data.pets[pet.id]; const locked = !saved.unlocked;
    const el = document.createElement('div'); el.className = `kp-card ${locked ? 'locked' : ''} ${selected === pet.id ? 'selected' : ''}`;
    el.innerHTML = `<span class="kp-pill">Lv.${saved.level}</span><img class="kp-icon" src="${pet.asset}" alt="${pet.name}"><div class="kp-name">${pet.name}</div><div class="kp-desc">${pet.description}</div><div class="kp-stats">生命 ${Math.round(pet.baseStats.hp * (1 + (saved.level - 1) * .1))} · 攻击 ${Math.round(pet.baseStats.attack * (1 + (saved.level - 1) * .1))}<br>射程 ${pet.baseStats.range} · ${pet.skill === 'BULLET_SPRAY' ? '三连弹幕' : '扇形火焰'}</div>`;
    if (!locked) el.onclick = () => { selected = pet.id; grid.querySelectorAll('.kp-card').forEach(n => n.classList.remove('selected')); el.classList.add('selected'); };
    grid.appendChild(el);
  }
  document.getElementById('kp-pet-none').onclick = () => { data.selected = null; saveManager.save(); closePetSelect(); startAfterPet(game); };
  document.getElementById('kp-pet-confirm').onclick = () => { data.selected = selected; saveManager.save(); closePetSelect(); startAfterPet(game); };
}
function closePetSelect() { const modal = document.getElementById('kp-pet-select'); if (modal) modal.style.display = 'none'; }
function startAfterPet(game) { game.isPaused = false; game.feature.syncPet(game); }

function renderPetUpgrade(game) {
  const data = getPetData(), box = document.getElementById('kp-pet-upgrade-list');
  if (!box) return; box.innerHTML = '';
  for (const pet of Object.values(PET_TYPES)) {
    const saved = data.pets[pet.id]; const cost = petUpgradeCost(saved.level);
    const el = document.createElement('div'); el.className = 'kp-upgrade';
    el.innerHTML = `<div class="kp-row"><div><b>${pet.name}</b><div class="kp-small">Lv.${saved.level} · ${pet.description}</div></div><button class="kp-btn" style="flex:0 0 auto" ${!saved.unlocked || saveManager.getScrap() < cost ? 'disabled' : ''}>${saved.unlocked ? `${cost} 废料 · 升级` : '未解锁'}</button></div>`;
    el.querySelector('button').onclick = () => { if (!saved.unlocked || !saveManager.spendScrap(cost)) return; saved.level += 1; saveManager.save(); renderPetUpgrade(game); };
    box.appendChild(el);
  }
}
function openPetUpgrade(game) { renderPetUpgrade(game); document.getElementById('kp-pet-upgrade').style.display = 'flex'; game.isPaused = true; }
function addPetHubButton(game) {
  if (document.getElementById('kp-pet-hub-btn')) return;
  const btn = document.createElement('button'); btn.id = 'kp-pet-hub-btn'; btn.className = 'kp-btn'; btn.textContent = '宠物培养';
  btn.style.cssText = 'position:fixed;z-index:999;left:12px;bottom:12px;width:auto;padding:8px 12px;font-size:12px;';
  btn.onclick = () => openPetUpgrade(game); document.body.appendChild(btn);
}

function installSkillCards(game) {
  const original = game.hud.renderUpgradeCards?.bind(game.hud);
  if (!original) return;
  game.hud.renderUpgradeCards = function() {
    original();
    const container = this.dom?.cardsContainer || document.querySelector('.cards-container');
    if (!container || Math.random() >= 0.65) return;
    const card = SKILL_CARDS[Math.floor(Math.random() * SKILL_CARDS.length)];
    const element = document.createElement('div'); element.className = `upgrade-card rarity-${card.rarity}`;
    element.innerHTML = `<img class="card-icon-img" src="${card.asset}" alt="${card.name}"><div class="card-info"><div class="card-header-row"><div class="card-name">${card.name}</div><div class="card-tag">新技能</div></div><div class="card-desc">${card.desc}</div><div class="card-desc">当前等级：Lv.${game.feature.skills[card.id].level}</div></div>`;
    element.onclick = () => { game.feature.skills[card.id].level += 1; game.feature.skills[card.id].timer = 0; game.isUpgrading = false; if (this.dom?.upgradeModal) this.dom.upgradeModal.style.display = 'none'; this.updateSkillHUD(game); };
    const index = Math.floor(Math.random() * Math.max(1, container.children.length));
    if (container.children[index]) container.children[index].replaceWith(element); else container.appendChild(element);
  };
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
    if (id === 'tornado') f.tornadoes.push({ x: target.x, y: target.y, life: SKILL_CONFIG.tornado.duration, maxLife: SKILL_CONFIG.tornado.duration, tick: 0 });
    if (id === 'boomerang') { const angle = Math.atan2(target.y - game.hero.y, target.x - game.hero.x); f.boomerangs.push({ x: game.hero.x, y: game.hero.y, sx: game.hero.x, sy: game.hero.y, vx: Math.cos(angle) * SKILL_CONFIG.boomerang.speed, vy: Math.sin(angle) * SKILL_CONFIG.boomerang.speed, outbound: true, hitOut: new Set(), hitBack: new Set() }); }
    if (id === 'laser') {
      const angle = target ? Math.atan2(target.y - game.hero.y, target.x - game.hero.x) : -Math.PI / 2;
      f.lasers.push({ x: game.hero.x, y: game.hero.y, angle, life: SKILL_CONFIG.laser.displayDuration, maxLife: SKILL_CONFIG.laser.displayDuration });
      const x2 = game.hero.x + Math.cos(angle) * Math.max(game.width, game.height) * 2;
      const y2 = game.hero.y + Math.sin(angle) * Math.max(game.width, game.height) * 2;
      for (const enemy of game.enemies) {
        if (!enemy.active) continue;
        if (pointSegmentDistance(enemy.x, enemy.y, game.hero.x, game.hero.y, x2, y2) <= SKILL_CONFIG.laser.width / 2 + enemy.radius) {
          game.combatSystem.onHit(enemy, game.weapon.damage * SKILL_CONFIG.laser.damage, false, 'laser');
          enemy.burnTimer = Math.max(enemy.burnTimer || 0, SKILL_CONFIG.laser.burnDuration);
          enemy.burnDps = Math.max(enemy.burnDps || 0, game.weapon.damage * SKILL_CONFIG.laser.burnDamage);
        }
      }
    }
    if (id === 'bomber') f.bomber = { x: target.x, y: target.y, timer: 0, dropped: 0 };
  }
}

function updateCombat(game, dt) {
  const f = game.feature;
  for (let i = f.boomerangs.length - 1; i >= 0; i--) {
    const b = f.boomerangs[i];
    if (b.outbound && distance(b, { x: b.sx, y: b.sy }) >= SKILL_CONFIG.boomerang.maxRange) b.outbound = false;
    if (!b.outbound) { const dx = game.hero.x - b.x, dy = game.hero.y - b.y, d = Math.hypot(dx, dy); if (d < 28) { f.boomerangs.splice(i, 1); continue; } b.vx = dx / Math.max(1, d) * SKILL_CONFIG.boomerang.speed; b.vy = dy / Math.max(1, d) * SKILL_CONFIG.boomerang.speed; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    const hits = b.outbound ? b.hitOut : b.hitBack;
    for (const enemy of game.enemies) {
      if (!enemy.active || hits.has(enemy)) continue;
      const r = enemy.radius + SKILL_CONFIG.boomerang.width / 2;
      if ((enemy.x - b.x) ** 2 + (enemy.y - b.y) ** 2 <= r * r) { hits.add(enemy); game.combatSystem.onHit(enemy, game.weapon.damage * SKILL_CONFIG.boomerang.damage, false, 'boomerang'); }
    }
  }
  for (let i = f.tornadoes.length - 1; i >= 0; i--) {
    const t = f.tornadoes[i]; t.life -= dt; t.tick += dt;
    if (t.life <= 0) { f.tornadoes.splice(i, 1); continue; }
    if (t.tick < 0.5) continue;
    t.tick = 0;
    for (const enemy of game.enemies) {
      if (!enemy.active) continue;
      const dx = t.x - enemy.x, dy = t.y - enemy.y, d = Math.hypot(dx, dy);
      if (d > SKILL_CONFIG.tornado.radius + enemy.radius) continue;
      const strength = (1 - d / SKILL_CONFIG.tornado.radius) * SKILL_CONFIG.tornado.pullStrength * 900;
      enemy.x += dx / Math.max(1, d) * strength * 0.5; enemy.y += dy / Math.max(1, d) * strength * 0.5;
      game.combatSystem.onHit(enemy, game.weapon.damage * SKILL_CONFIG.tornado.damagePerSecond * 0.5, false, 'tornado');
    }
  }
  if (f.bomber) {
    f.bomber.timer += dt;
    if (f.bomber.dropped < SKILL_CONFIG.bomber.bombCount && f.bomber.timer >= SKILL_CONFIG.bomber.bombInterval) { f.bomber.timer = 0; f.bomber.dropped++; const angle = Math.random() * Math.PI * 2, radius = Math.random() * 60; f.bombs.push({ x: f.bomber.x + Math.cos(angle) * radius, y: f.bomber.y + Math.sin(angle) * radius, life: 0.45 }); }
    if (f.bomber.dropped >= SKILL_CONFIG.bomber.bombCount) f.bomber = null;
  }
  for (let i = f.bombs.length - 1; i >= 0; i--) {
    const bomb = f.bombs[i]; bomb.life -= dt;
    if (bomb.life > 0) continue;
    for (const enemy of game.enemies) {
      if (!enemy.active) continue;
      const dx = enemy.x - bomb.x, dy = enemy.y - bomb.y, d = Math.hypot(dx, dy);
      if (d > SKILL_CONFIG.bomber.radius) continue;
      const falloff = 1 - Math.min(1, d / SKILL_CONFIG.bomber.radius) * 0.45;
      game.combatSystem.onHit(enemy, game.weapon.damage * SKILL_CONFIG.bomber.damage * falloff, false, 'bomber');
      const k = SKILL_CONFIG.bomber.knockback / Math.max(1, d); enemy.x += dx * k; enemy.y += dy * k;
    }
    f.bombs.splice(i, 1);
  }
  for (let i = f.lasers.length - 1; i >= 0; i--) { f.lasers[i].life -= dt; if (f.lasers[i].life <= 0) f.lasers.splice(i, 1); }
  for (let i = f.petBullets.length - 1; i >= 0; i--) {
    const bullet = f.petBullets[i]; bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
    if (bullet.life <= 0 || bullet.x < 0 || bullet.x > game.width || bullet.y < 0 || bullet.y > game.height) { f.petBullets.splice(i, 1); continue; }
    for (const enemy of game.enemies) {
      if (!enemy.active || bullet.pierce <= 0) continue;
      const r = enemy.radius + 5;
      if ((enemy.x - bullet.x) ** 2 + (enemy.y - bullet.y) ** 2 <= r * r) { game.combatSystem.onHit(enemy, bullet.damage, false, 'pet'); bullet.pierce -= 1; }
    }
  }
}

function renderFeature(game) {
  const ctx = game.ctx, f = game.feature;
  for (const tornado of f.tornadoes) { ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(tornado.x, tornado.y, SKILL_CONFIG.tornado.radius, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  for (const b of f.boomerangs) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate((game.survivalTime || 0) * 10); ctx.drawImage(f.boomerangImage, -14, -14, 28, 28); ctx.restore(); }
  for (const laser of f.lasers) { const x2 = laser.x + Math.cos(laser.angle) * Math.max(game.width, game.height) * 2, y2 = laser.y + Math.sin(laser.angle) * Math.max(game.width, game.height) * 2; ctx.save(); ctx.globalAlpha = laser.life / laser.maxLife; ctx.shadowBlur = 18; ctx.shadowColor = '#ff334d'; ctx.strokeStyle = '#ff334d'; ctx.lineWidth = SKILL_CONFIG.laser.width; ctx.beginPath(); ctx.moveTo(laser.x, laser.y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
  for (const bomb of f.bombs) ctx.drawImage(f.bombImage, bomb.x - 12, bomb.y - 12, 24, 24);
  if (game.pet?.alive && game.pet.image) { ctx.save(); ctx.drawImage(game.pet.image, game.pet.x - 24, game.pet.y - 24, 48, 48); ctx.restore(); }
  for (const bullet of f.petBullets) ctx.drawImage(f.petBulletImage, bullet.x - 4, bullet.y - 4, 8, 8);
  for (const effect of f.petEffects) { if (effect.type !== 'breath') continue; ctx.save(); ctx.globalAlpha = effect.life / effect.maxLife; ctx.translate(effect.x, effect.y); ctx.rotate(effect.angle); ctx.drawImage(f.breathImage, 0, -28, effect.range, 56); ctx.restore(); }
}
function asset(src) { const image = new Image(); image.src = src; return image; }

export function installSkillsPetsFeature(game) {
  if (game.feature) return;
  game.feature = { skills: Object.fromEntries(Object.entries(SKILL_CONFIG).map(([id, cfg]) => [id, { level: 0, cooldown: cfg.cooldown, timer: cfg.cooldown }])), tornadoes: [], boomerangs: [], lasers: [], bombs: [], bomber: null, petBullets: [], petEffects: [], target: { x: game.hero.x, y: game.hero.y - 250 }, boomerangImage: asset('assets/skills/boomerang.png'), bombImage: asset('assets/skills/bomber.png'), petBulletImage: asset('assets/skills/pet-bullet.png'), breathImage: asset('assets/skills/breath.png') };
  game.pet = null;
  game.feature.syncPet = () => { const id = getPetData().selected; if (!id) { game.pet = null; return; } const saved = getPetData().pets[id]; if (!saved?.unlocked) { game.pet = null; return; } game.pet = new Pet(id, saved.level); game.pet.x = game.hero.x - 70; game.pet.y = game.hero.y + 35; game.pet.image = asset(PET_TYPES[id].asset); };
  const originalReset = game.resetGame.bind(game);
  game.resetGame = function() { originalReset(); for (const [id, cfg] of Object.entries(SKILL_CONFIG)) this.feature.skills[id] = { level: 0, cooldown: cfg.cooldown, timer: cfg.cooldown }; this.feature.tornadoes = []; this.feature.boomerangs = []; this.feature.lasers = []; this.feature.bombs = []; this.feature.bomber = null; this.feature.petBullets = []; this.feature.petEffects = []; this.pet = null; };
  const originalUpdate = game.update.bind(game);
  game.update = function(dt) { originalUpdate(dt); updateSkills(this, dt); updateCombat(this, dt); if (this.pet) this.pet.update(dt, this); for (const effect of this.feature.petEffects) effect.life -= dt; this.feature.petEffects = this.feature.petEffects.filter(effect => effect.life > 0); const hud = document.getElementById('kp-pet-hud'); if (hud && this.pet) { hud.style.display = 'block'; document.getElementById('kp-pet-name').textContent = `${PET_TYPES[this.pet.type].name} Lv.${this.pet.level}`; document.getElementById('kp-pet-hp').style.width = `${clamp(this.pet.hp / this.pet.maxHp, 0, 1) * 100}%`; document.getElementById('kp-pet-hp-text').textContent = `${Math.ceil(this.pet.hp)} / ${Math.ceil(this.pet.maxHp)}`; } else if (hud) hud.style.display = 'none'; };
  const originalRender = game.renderer.render.bind(game.renderer);
  game.renderer.render = function(g) { originalRender(g); renderFeature(g); };
  ensureUi(game); addPetHubButton(game); installSkillCards(game);
  game.feature.showPetSelect = () => { renderPetSelect(game); document.getElementById('kp-pet-select').style.display = 'flex'; game.isPaused = true; };
  const originalStartStage = game.startStage?.bind(game);
  if (originalStartStage) game.startStage = function(stageId) { originalStartStage(stageId); this.feature.showPetSelect(); };
  game.feature.showPetSelect();
  window.PET_TYPES = PET_TYPES; window.SKILL_CONFIG = SKILL_CONFIG;
}
