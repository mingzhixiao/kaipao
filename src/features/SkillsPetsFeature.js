import { saveManager } from '../systems/SaveManager.js';

const SKILL_CONFIG = {
  tornado: { cooldown: 8, duration: 4, radius: 200, damagePerSecond: 0.3, pullStrength: 0.05, particleCount: 30 },
  boomerang: { cooldown: 5, speed: 400, maxRange: 600, damage: 1.0, width: 20, height: 20 },
  laser: { cooldown: 3, width: 10, damage: 1.5, burnDamage: 0.2, burnDuration: 2, displayDuration: 0.2 },
  bomber: { cooldown: 12, radius: 250, bombCount: 3, bombInterval: 0.5, damage: 0.8, knockback: 100 }
};

const PET_TYPES = {
  fluffy: {
    id: 'fluffy', name: '小毛球', description: '发射三连弹幕攻击敌人',
    baseStats: { hp: 50, attack: 10, attackSpeed: 1.0, moveSpeed: 200, range: 300 },
    skill: 'BULLET_SPRAY', skillParams: { bulletCount: 3, spread: 0.30 }, icon: '🐾'
  },
  dragon: {
    id: 'dragon', name: '幼龙', description: '喷吐扇形火焰并持续灼烧敌人',
    baseStats: { hp: 80, attack: 15, attackSpeed: 0.8, moveSpeed: 150, range: 250 },
    skill: 'FIRE_BREATH', skillParams: { duration: 1, angle: Math.PI / 3 }, icon: '🐲'
  }
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function distSq(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
function nearestEnemy(game, x, y, range = Infinity) {
  let target = null, best = range * range;
  for (const e of game.enemies) {
    if (!e.active || e.hp <= 0) continue;
    const d = distSq(e, { x, y });
    if (d < best) { best = d; target = e; }
  }
  return target;
}
function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

class Pet {
  constructor(type, level = 1) {
    this.type = type; this.level = level; this.x = 0; this.y = 0;
    this.target = null; this.attackCooldown = 0; this.alive = true;
    this.hp = this.getStat('hp'); this.maxHp = this.hp;
  }
  get config() { return PET_TYPES[this.type]; }
  getStat(name) { return this.config.baseStats[name] * (1 + (this.level - 1) * 0.1); }
  get attack() { return this.getStat('attack'); }
  get attackSpeed() { return this.getStat('attackSpeed'); }
  get moveSpeed() { return this.getStat('moveSpeed'); }
  get range() { return this.getStat('range'); }
  levelUp() { this.level++; this.maxHp = this.getStat('hp'); this.hp = this.maxHp; }
  update(dt, game) {
    if (!this.alive) return;
    const dx = game.hero.x - this.x, dy = game.hero.y - this.y;
    const followDist = 100;
    const d = Math.hypot(dx, dy);
    if (d > followDist) {
      const speed = this.moveSpeed * (d > 260 ? 1.8 : 1);
      this.x += dx / Math.max(1, d) * speed * dt;
      this.y += dy / Math.max(1, d) * speed * dt;
    } else {
      const orbit = Math.sin(game.survivalTime * 1.8) * 18;
      this.x += ((game.hero.x - dx / Math.max(1, d || 1) * followDist) + orbit - this.x) * Math.min(1, dt * 4);
      this.y += ((game.hero.y - dy / Math.max(1, d || 1) * followDist) - orbit - this.y) * Math.min(1, dt * 4);
    }
    this.attackCooldown -= dt;
    this.target = nearestEnemy(game, this.x, this.y, this.range);
    if (this.target && this.attackCooldown <= 0) {
      this.attackCooldown = 1 / this.attackSpeed;
      if (this.config.skill === 'BULLET_SPRAY') this.bulletSpray(game);
      else this.fireBreath(game);
    }
  }
  bulletSpray(game) {
    const t = this.target;
    const base = Math.atan2(t.y - this.y, t.x - this.x);
    for (let i = 0; i < this.config.skillParams.bulletCount; i++) {
      const angle = base + (i - 1) * this.config.skillParams.spread;
      const b = { active: true, x: this.x, y: this.y, vx: Math.cos(angle) * 560, vy: Math.sin(angle) * 560, damage: this.attack, life: 1.2, pet: true, pierce: 1 };
      game.feature.petBullets.push(b);
    }
    game.spawnParticles(this.x, this.y, '#a78bfa', 4, 'spark');
  }
  fireBreath(game) {
    const t = this.target, base = Math.atan2(t.y - this.y, t.x - this.x), cone = this.config.skillParams.angle;
    for (const e of game.enemies) {
      if (!e.active) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > this.range + e.radius) continue;
      let diff = Math.abs(Math.atan2(dy, dx) - base);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      if (diff <= cone / 2) game.combatSystem.onHit(e, this.attack * 1.15, false, 'fire');
    }
    game.feature.petEffects.push({ type: 'breath', x: this.x, y: this.y, angle: base, life: 0.18, maxLife: 0.18, range: this.range, cone });
    game.spawnParticles(this.x + Math.cos(base) * 35, this.y + Math.sin(base) * 35, '#ff7a18', 6, 'fire');
  }
}

function getPetData() {
  if (!saveManager.data.petData) saveManager.data.petData = { selected: null, pets: {} };
  for (const id of Object.keys(PET_TYPES)) {
    if (!saveManager.data.petData.pets[id]) saveManager.data.petData.pets[id] = { unlocked: id === 'fluffy', level: 1 };
  }
  return saveManager.data.petData;
}

function petUpgradeCost(level) { return 50 + (level - 1) * 35; }

function ensureStyle() {
  if (document.getElementById('kaipao-skills-pets-style')) return;
  const style = document.createElement('style');
  style.id = 'kaipao-skills-pets-style';
  style.textContent = `
    .kp-modal{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.78);backdrop-filter:blur(7px);font-family:system-ui,sans-serif;color:#e5e7eb}
    .kp-panel{width:min(92vw,620px);max-height:88vh;overflow:auto;background:linear-gradient(145deg,#111827,#020617);border:1px solid rgba(148,163,184,.28);border-radius:18px;box-shadow:0 25px 80px rgba(0,0,0,.55);padding:22px}
    .kp-title{font-size:24px;font-weight:800;letter-spacing:.04em;margin-bottom:5px}.kp-sub{font-size:13px;color:#94a3b8;margin-bottom:18px}
    .kp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.kp-card{position:relative;padding:15px;border:1px solid rgba(148,163,184,.2);border-radius:14px;background:rgba(15,23,42,.75);cursor:pointer;transition:.18s}.kp-card:hover{transform:translateY(-2px);border-color:#38bdf8}.kp-card.selected{border-color:#22d3ee;box-shadow:0 0 0 2px rgba(34,211,238,.16)}.kp-card.locked{opacity:.48;cursor:not-allowed}.kp-icon{font-size:42px}.kp-name{font-weight:800;font-size:17px}.kp-desc{font-size:12px;color:#94a3b8;margin:5px 0 9px}.kp-stats{font-size:11px;line-height:1.7;color:#cbd5e1}.kp-actions{display:flex;gap:10px;margin-top:18px}.kp-btn{flex:1;border:1px solid rgba(148,163,184,.3);background:#1e293b;color:#e2e8f0;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer}.kp-btn.primary{background:#0891b2;border-color:#22d3ee}.kp-btn:disabled{opacity:.45;cursor:not-allowed}.kp-pill{position:absolute;right:10px;top:10px;font-size:10px;padding:3px 7px;border-radius:99px;background:rgba(34,211,238,.14);color:#67e8f9}
    .kp-upgrade{margin-top:12px;padding:12px;border-radius:12px;background:rgba(15,23,42,.8);border:1px solid rgba(148,163,184,.16)}.kp-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.kp-small{font-size:11px;color:#94a3b8}.kp-skill{display:flex;align-items:center;gap:8px;font-size:11px;color:#cbd5e1}
    .kp-skill-slot{position:relative;width:48px;height:48px;border-radius:10px;border:1px solid rgba(148,163,184,.25);background:rgba(2,6,23,.8);overflow:hidden}.kp-cd{position:absolute;inset:auto 0 0;height:0;background:rgba(2,6,23,.68)}
    .kp-hud{position:absolute;z-index:40;right:10px;bottom:112px;width:112px;display:none;pointer-events:none;padding:7px;border-radius:10px;background:rgba(2,6,23,.72);border:1px solid rgba(148,163,184,.18);color:#e2e8f0;font-size:10px}.kp-hp{height:5px;background:#334155;border-radius:99px;overflow:hidden;margin-top:4px}.kp-hp>i{display:block;height:100%;background:#22c55e;width:100%}
  `;
  document.head.appendChild(style);
}

function createModals(game) {
  ensureStyle();
  if (!document.getElementById('kp-pet-select')) {
    const modal = document.createElement('div'); modal.id = 'kp-pet-select'; modal.className = 'kp-modal';
    modal.innerHTML = `<div class="kp-panel"><div class="kp-title">🐾 战前伙伴</div><div class="kp-sub">最多携带 1 只宠物。宠物等级为永久成长，不影响本局英雄等级。</div><div id="kp-pet-grid" class="kp-grid"></div><div class="kp-actions"><button id="kp-pet-none" class="kp-btn">本局不携带</button><button id="kp-pet-confirm" class="kp-btn primary">确认出战</button></div></div>`;
    document.body.appendChild(modal);
  }
  if (!document.getElementById('kp-pet-upgrade')) {
    const modal = document.createElement('div'); modal.id = 'kp-pet-upgrade'; modal.className = 'kp-modal';
    modal.innerHTML = `<div class="kp-panel"><div class="kp-title">🐾 宠物培养</div><div class="kp-sub">消耗废料永久提升宠物等级，每级全属性 +10%。</div><div id="kp-pet-upgrade-list"></div><div class="kp-actions"><button id="kp-pet-upgrade-close" class="kp-btn">返回</button></div></div>`;
    document.body.appendChild(modal);
  }
  if (!document.getElementById('kp-pet-hud')) {
    const hud = document.createElement('div'); hud.id = 'kp-pet-hud'; hud.className = 'kp-hud';
    hud.innerHTML = `<b id="kp-pet-name">宠物</b><div class="kp-hp"><i id="kp-pet-hp"></i></div><span id="kp-pet-hp-text"></span>`;
    game.container.appendChild(hud);
  }
}

function renderPetSelect(game) {
  const data = getPetData(), grid = document.getElementById('kp-pet-grid');
  if (!grid) return;
  let selected = data.selected;
  grid.innerHTML = '';
  for (const pet of Object.values(PET_TYPES)) {
    const saved = data.pets[pet.id]; const locked = !saved.unlocked;
    const el = document.createElement('div'); el.className = `kp-card ${locked ? 'locked' : ''} ${selected === pet.id ? 'selected' : ''}`;
    el.innerHTML = `<span class="kp-pill">Lv.${saved.level}</span><div class="kp-icon">${pet.icon}</div><div class="kp-name">${pet.name}</div><div class="kp-desc">${pet.description}</div><div class="kp-stats">生命 ${Math.round(pet.baseStats.hp * (1 + (saved.level - 1) * .1))} · 攻击 ${Math.round(pet.baseStats.attack * (1 + (saved.level - 1) * .1))}<br>射程 ${pet.baseStats.range} · ${pet.skill === 'BULLET_SPRAY' ? '三连弹幕' : '扇形火焰'}</div>`;
    if (!locked) el.onclick = () => { selected = pet.id; grid.querySelectorAll('.kp-card').forEach(n => n.classList.remove('selected')); el.classList.add('selected'); };
    grid.appendChild(el);
  }
  document.getElementById('kp-pet-none').onclick = () => { data.selected = null; closePetSelect(game); startAfterPet(game); };
  document.getElementById('kp-pet-confirm').onclick = () => { data.selected = selected; saveManager.save(); closePetSelect(game); startAfterPet(game); };
}
function closePetSelect() { const m = document.getElementById('kp-pet-select'); if (m) m.style.display = 'none'; }
function startAfterPet(game) { game.isPaused = false; game.feature.syncPet(game); }

function renderPetUpgrade(game) {
  const data = getPetData(), box = document.getElementById('kp-pet-upgrade-list');
  if (!box) return; box.innerHTML = '';
  for (const pet of Object.values(PET_TYPES)) {
    const saved = data.pets[pet.id]; const cost = petUpgradeCost(saved.level);
    const el = document.createElement('div'); el.className = 'kp-upgrade';
    el.innerHTML = `<div class="kp-row"><div><b>${pet.icon} ${pet.name}</b><div class="kp-small">Lv.${saved.level} · ${pet.description}</div></div><button class="kp-btn" style="flex:0 0 auto" ${!saved.unlocked || saveManager.getScrap() < cost ? 'disabled' : ''}>${saved.unlocked ? `${cost} 碎片 · 升级` : '未解锁'}</button></div>`;
    const btn = el.querySelector('button'); btn.onclick = () => { if (saveManager.spendScrap(cost)) { saved.level++; saveManager.save(); renderPetUpgrade(game); } };
    box.appendChild(el);
  }
}
function openPetUpgrade(game) { renderPetUpgrade(game); document.getElementById('kp-pet-upgrade').style.display = 'flex'; game.isPaused = true; }

function addPetHubButton(game) {
  if (document.getElementById('kp-pet-hub-btn')) return;
  const btn = document.createElement('button'); btn.id = 'kp-pet-hub-btn'; btn.className = 'kp-btn'; btn.textContent = '🐾 宠物培养';
  btn.style.cssText = 'position:fixed;z-index:999;left:12px;bottom:12px;width:auto;padding:8px 12px;font-size:12px;';
  btn.onclick = () => openPetUpgrade(game); document.body.appendChild(btn);
}

function addSkillCards(game, originalRender) {
  const extra = [
    { id:'tornado', name:'龙卷风', desc:'召唤持续 4 秒的旋风，缓慢牵引范围敌人并持续造成伤害。', img:'assets/icon_inferno.png', rarity:'epic', synergy:'[范围控场]', apply:()=>game.feature.skills.tornado.level++ },
    { id:'boomerang', name:'回旋镖', desc:'向瞄准方向飞出并自动返回，去程与回程均可穿透造成伤害。', img:'assets/icon_pierce.jpg', rarity:'rare', synergy:'[往返穿透]', apply:()=>game.feature.skills.boomerang.level++ },
    { id:'laser', name:'激光', desc:'沿瞄准方向瞬间贯穿全屏敌人，并附带 2 秒灼烧。', img:'assets/icon_thermal.jpg', rarity:'legendary', synergy:'[高能贯穿]', apply:()=>game.feature.skills.laser.level++ },
    { id:'bomber', name:'轰炸机', desc:'向目标区域连续投放 3 枚炸弹，每枚爆炸造成范围伤害与击退。', img:'assets/icon_rocket.jpg', rarity:'epic', synergy:'[区域轰炸]', apply:()=>game.feature.skills.bomber.level++ }
  ];
  return () => {
    const base = (typeof originalRender === 'function' ? null : null);
    const all = [];
    const pool = [
      ...extra.map(c => ({ ...c, name: game.feature.skills[c.id].level === 0 ? `${c.name} (解锁)` : `${c.name} (强化)`, apply: c.apply })),
    ];
    // Keep existing card pool by asking the original renderer to build its cards, then replace only when needed is too invasive.
    // Instead, use the original renderer for the normal pool and expose a dedicated new-skill roll slot below.
    originalRender.call(game.hud, game);
    const container = game.hud.dom.cardsContainer;
    if (!container) return;
    const chance = Math.random() < 0.65;
    if (chance) {
      const card = pool[Math.floor(Math.random() * pool.length)];
      if (card) {
        const el = document.createElement('div'); el.className = `upgrade-card rarity-${card.rarity}`;
        el.innerHTML = `<img class="card-icon-img" src="${card.img}" alt="${card.name}"><div class="card-info"><div class="card-header-row"><div class="card-name">${card.name}</div><div class="card-tag">${card.rarity}</div></div><div class="card-synergy">${card.synergy}</div><div class="card-desc">${card.desc}</div></div>`;
        el.onclick = () => { card.apply(); game.hud.dom.upgradeModal.style.display='none'; game.isUpgrading=false; game.hud.updateSkillHUD(game); };
        container.children[Math.floor(Math.random() * Math.max(1, container.children.length))]?.replaceWith(el) || container.appendChild(el);
      }
    }
  };
}

function updateSkills(game, dt) {
  const f = game.feature;
  for (const [id, s] of Object.entries(f.skills)) {
    if (s.level <= 0) continue;
    s.timer += dt;
    if (s.timer < s.cooldown) continue;
    s.timer = 0;
    const target = f.target;
    if (id === 'tornado') {
      f.tornadoes.push({ active:true, x:target.x, y:target.y, life:SKILL_CONFIG.tornado.duration, maxLife:SKILL_CONFIG.tornado.duration, tick:0 });
    } else if (id === 'boomerang') {
      const angle = Math.atan2(target.y-game.hero.y, target.x-game.hero.x);
      f.boomerangs.push({ active:true, x:game.hero.x, y:game.hero.y, vx:Math.cos(angle)*SKILL_CONFIG.boomerang.speed, vy:Math.sin(angle)*SKILL_CONFIG.boomerang.speed, sx:game.hero.x, sy:game.hero.y, outbound:true, hitOut:new Set(), hitBack:new Set() });
    } else if (id === 'laser') {
      const angle = Math.atan2(target.y-game.hero.y, target.x-game.hero.x);
      f.lasers.push({ active:true, x:game.hero.x, y:game.hero.y, angle, life:SKILL_CONFIG.laser.displayDuration, maxLife:SKILL_CONFIG.laser.displayDuration });
      const x2=game.hero.x+Math.cos(angle)*Math.max(game.width,game.height)*2, y2=game.hero.y+Math.sin(angle)*Math.max(game.width,game.height)*2;
      for (const e of game.enemies) {
        if (!e.active) continue;
        if (pointSegmentDistance(e.x,e.y,game.hero.x,game.hero.y,x2,y2)<=SKILL_CONFIG.laser.width/2+e.radius) {
          game.combatSystem.onHit(e,game.weapon.damage*SKILL_CONFIG.laser.damage,false,'laser');
          e.burnTimer=Math.max(e.burnTimer||0,SKILL_CONFIG.laser.burnDuration); e.burnDps=Math.max(e.burnDps||0,game.weapon.damage*SKILL_CONFIG.laser.burnDamage);
        }
      }
    } else if (id === 'bomber') {
      f.bomber={active:true,x:target.x,y:target.y,timer:0,dropped:0};
    }
  }
}

function updateFeatureCombat(game, dt) {
  const f=game.feature;
  for (let i=f.boomerangs.length-1;i>=0;i--) {
    const b=f.boomerangs[i]; if (!b.active) { f.boomerangs.splice(i,1); continue; }
    const dx=b.x-b.sx,dy=b.y-b.sy;
    if (b.outbound && Math.hypot(dx,dy)>=SKILL_CONFIG.boomerang.maxRange) b.outbound=false;
    if (!b.outbound) { const tx=game.hero.x-b.x,ty=game.hero.y-b.y,d=Math.hypot(tx,ty); if(d<28){b.active=false;continue;} b.vx=tx/Math.max(1,d)*SKILL_CONFIG.boomerang.speed; b.vy=ty/Math.max(1,d)*SKILL_CONFIG.boomerang.speed; }
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    const set=b.outbound?b.hitOut:b.hitBack;
    for(const e of game.enemies){if(!e.active||set.has(e))continue;const hitR=e.radius+SKILL_CONFIG.boomerang.width/2;if((e.x-b.x)**2+(e.y-b.y)**2<=hitR*hitR){set.add(e);game.combatSystem.onHit(e,game.weapon.damage*SKILL_CONFIG.boomerang.damage,false,'boomerang');game.spawnParticles(b.x,b.y,'#a78bfa',3,'spark');}}
  }
  for(let i=f.tornadoes.length-1;i>=0;i--){const t=f.tornadoes[i];t.life-=dt;t.tick+=dt;if(t.life<=0){f.tornadoes.splice(i,1);continue;}for(const e of game.enemies){if(!e.active)continue;const dx=t.x-e.x,dy=t.y-e.y,d=Math.hypot(dx,dy);if(d<=SKILL_CONFIG.tornado.radius+e.radius){const k=(1-d/SKILL_CONFIG.tornado.radius)*SKILL_CONFIG.tornado.pullStrength*900;e.x+=dx/Math.max(1,d)*k*dt;e.y+=dy/Math.max(1,d)*k*dt;if(t.tick>=0.5){game.combatSystem.onHit(e,game.weapon.damage*SKILL_CONFIG.tornado.damagePerSecond*0.5,false,'tornado');}}}if(t.tick>=0.5)t.tick=0; if(Math.random()<dt*12)game.spawnParticles(t.x+(Math.random()-.5)*300,t.y+(Math.random()-.5)*300,'#c084fc',1,'spark');}
  if(f.bomber?.active){const b=f.bomber;b.timer+=dt;if(b.dropped<SKILL_CONFIG.bomber.bombCount&&b.timer>=SKILL_CONFIG.bomber.bombInterval){b.timer=0;b.dropped++;f.bombs.push({x:b.x+(Math.random()-.5)*100,y:b.y+(Math.random()-.5)*100,life:.45,active:true});}if(b.dropped>=SKILL_CONFIG.bomber.bombCount&&f.bombs.length===0)f.bomber=null;}
  for(let i=f.bombs.length-1;i>=0;i--){const bomb=f.bombs[i];bomb.life-=dt;if(bomb.life<=0){for(const e of game.enemies){if(!e.active)continue;const d=Math.hypot(e.x-bomb.x,e.y-bomb.y);if(d<=SKILL_CONFIG.bomber.radius){const fall=1-Math.min(1,d/SKILL_CONFIG.bomber.radius)*.45;game.combatSystem.onHit(e,game.weapon.damage*SKILL_CONFIG.bomber.damage*fall,false,'bomber',(e.x-bomb.x)*SKILL_CONFIG.bomber.knockback/Math.max(1,d),(e.y-bomb.y)*SKILL_CONFIG.bomber.knockback/Math.max(1,d));}}game.spawnParticles(bomb.x,bomb.y,'#ff7a18',28,'fire');game.spawnParticles(bomb.x,bomb.y,'#ffd166',18,'spark');f.bombs.splice(i,1);}}
  for(let i=f.lasers.length-1;i>=0;i--){f.lasers[i].life-=dt;if(f.lasers[i].life<=0)f.lasers.splice(i,1);}
  for(let i=f.petBullets.length-1;i>=0;i--){const b=f.petBullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let remove=b.life<=0||b.x<0||b.x>game.width||b.y<0||b.y>game.height;for(const e of game.enemies){if(remove||!e.active||b.pierce<=0)continue;const r=e.radius+5;if((e.x-b.x)**2+(e.y-b.y)**2<=r*r){game.combatSystem.onHit(e,b.damage,false,'pet');b.pierce--;if(b.pierce<=0)remove=true;}}if(remove)f.petBullets.splice(i,1);}
}

function renderFeature(game) {
  const ctx=game.ctx,f=game.feature;
  for(const t of f.tornadoes){ctx.save();ctx.globalAlpha=.32;for(let r=40;r<=SKILL_CONFIG.tornado.radius;r+=35){ctx.beginPath();ctx.arc(t.x,t.y,r,0,Math.PI*2);ctx.strokeStyle='#c084fc';ctx.lineWidth=5;ctx.rotate(game.survivalTime*3+r*.002);ctx.stroke();}ctx.restore();}
  for(const b of f.boomerangs){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(game.survivalTime*10);ctx.strokeStyle='#e9d5ff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,10,0.3,Math.PI*1.6);ctx.stroke();ctx.restore();}
  for(const l of f.lasers){const x2=l.x+Math.cos(l.angle)*Math.max(game.width,game.height)*2,y2=l.y+Math.sin(l.angle)*Math.max(game.width,game.height)*2;ctx.save();ctx.globalAlpha=l.life/l.maxLife;ctx.strokeStyle='#ff334d';ctx.shadowBlur=18;ctx.shadowColor='#ff334d';ctx.lineWidth=SKILL_CONFIG.laser.width;ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();}
  for(const bomb of f.bombs){ctx.save();ctx.globalAlpha=.7;ctx.strokeStyle='#f59e0b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(bomb.x,bomb.y,SKILL_CONFIG.bomber.radius,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#111827';ctx.beginPath();ctx.arc(bomb.x,bomb.y,10,0,Math.PI*2);ctx.fill();ctx.restore();}
  if(f.bomber?.active){ctx.save();ctx.globalAlpha=.25;ctx.fillStyle='#f59e0b';ctx.beginPath();ctx.arc(f.bomber.x,f.bomber.y,SKILL_CONFIG.bomber.radius,0,Math.PI*2);ctx.fill();ctx.restore();}
  if(game.pet?.alive){const p=game.pet;ctx.save();ctx.translate(p.x,p.y);ctx.shadowBlur=12;ctx.shadowColor=p.type==='dragon'?'#ff7a18':'#a78bfa';ctx.font='30px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(PET_TYPES[p.type].icon,0,0);ctx.restore();}
  for(const b of f.petBullets){ctx.fillStyle='#c4b5fd';ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill();}
  for(const e of f.petEffects){if(e.type!=='breath')continue;ctx.save();ctx.globalAlpha=e.life/e.maxLife*.35;ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.fillStyle='#ff7a18';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,e.range,-e.cone/2,e.cone/2);ctx.closePath();ctx.fill();ctx.restore();}
}

export function installSkillsPetsFeature(game) {
  if (game.feature) return;
  game.feature = { skills:{}, tornadoes:[], boomerangs:[], lasers:[], bombs:[], bomber:null, petBullets:[], petEffects:[], target:{x:game.hero.x,y:game.hero.y-250}, selectedPet:null, syncPet:null };
  for(const [id,cfg] of Object.entries(SKILL_CONFIG)) game.feature.skills[id]={level:0,cooldown:cfg.cooldown,timer:cfg.cooldown};
  game.skills = game.skills || {};
  const originalReset=game.resetGame.bind(game);
  game.resetGame=function(){originalReset();for(const [id,cfg] of Object.entries(SKILL_CONFIG))this.feature.skills[id]={level:0,cooldown:cfg.cooldown,timer:cfg.cooldown};this.feature.tornadoes=[];this.feature.boomerangs=[];this.feature.lasers=[];this.feature.bombs=[];this.feature.bomber=null;this.feature.petBullets=[];this.feature.petEffects=[];this.pet=null;this.feature.selectedPet=getPetData().selected||null;};
  const originalUpdate=game.update.bind(game);
  game.update=function(dt){originalUpdate(dt);updateSkills(this,dt);updateFeatureCombat(this,dt);if(this.pet)this.pet.update(dt,this);this.feature.petEffects.forEach(e=>e.life-=dt);this.feature.petEffects=this.feature.petEffects.filter(e=>e.life>0);if(this.pet){const hud=document.getElementById('kp-pet-hud');if(hud){hud.style.display='block';document.getElementById('kp-pet-name').textContent=`${PET_TYPES[this.pet.type].icon} ${PET_TYPES[this.pet.type].name} Lv.${this.pet.level}`;document.getElementById('kp-pet-hp').style.width=`${clamp(this.pet.hp/this.pet.maxHp,0,1)*100}%`;document.getElementById('kp-pet-hp-text').textContent=`${Math.ceil(this.pet.hp)}/${this.pet.maxHp}`;}}};
  const originalRender=game.renderer.render.bind(game.renderer);
  game.renderer.render=function(g){originalRender(g);renderFeature(g);};
  const originalSkillHUD=game.hud.updateSkillHUD.bind(game.hud);
  game.hud.updateSkillHUD=function(g){originalSkillHUD(g);const ids=Object.keys(SKILL_CONFIG);for(let i=0;i<ids.length;i++){const id=ids[i],s=g.feature.skills[id];let el=document.getElementById(`kp-skill-${id}`);if(!el){el=document.createElement('div');el.id=`kp-skill-${id}`;el.className='kp-skill-slot';el.title=id;el.style.display='none';}el.querySelector('.kp-cd')?.remove();if(s.level>0){el.style.display='block';const cd=document.createElement('i');cd.className='kp-cd';cd.style.height=`${Math.max(0,100-s.timer/s.cooldown*100)}%`;el.appendChild(cd);}}};
  const originalRenderCards=game.hud.renderUpgradeCards.bind(game.hud); game.hud.renderUpgradeCards=addSkillCards(game,originalRenderCards);
  game.feature.syncPet=function(g){const id=getPetData().selected;if(!id){g.pet=null;return;}const saved=getPetData().pets[id];if(!saved?.unlocked){g.pet=null;return;}g.pet=new Pet(id,saved.level);g.pet.x=g.hero.x-70;g.pet.y=g.hero.y+35;};
  game.feature.showPetSelect=function(){createModals(game);renderPetSelect(game);document.getElementById('kp-pet-select').style.display='flex';game.isPaused=true;};
  const originalStartStage=game.startStage?game.startStage.bind(game):null;
  if(originalStartStage){game.startStage=function(stageId){originalStartStage(stageId);this.feature.showPetSelect();};}
  else game.startStage=function(stageId){this.waveSystem.setStage(stageId);this.resetGame();this.feature.showPetSelect();};
  createModals(game); addPetHubButton(game);
  document.getElementById('kp-pet-upgrade-close').onclick=()=>{document.getElementById('kp-pet-upgrade').style.display='none';game.isPaused=false;};
  window.PET_TYPES=PET_TYPES; window.PET_SKILL_CONFIG=SKILL_CONFIG;
}
