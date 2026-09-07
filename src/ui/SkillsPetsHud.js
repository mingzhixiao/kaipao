// 战术技能 HUD：核心技能与 Roguelike 战术技能分组展示。
const SKILL_META = {
  rocket: { name: '温压火箭', asset: 'assets/icon_rocket.jpg', core: true },
  truck: { name: '装甲战车', asset: 'assets/icon_truck.jpg', core: true },
  freeze: { name: '极寒射线', asset: 'assets/icon_frost.jpg', core: true },
  tornado: { name: '裂风涡流', asset: 'assets/skills/tornado.svg', group: 'tactical' },
  boomerang: { name: '回旋刃', asset: 'assets/skills/boomerang.svg', group: 'tactical' },
  laser: { name: '湮灭射线', asset: 'assets/skills/laser.svg', group: 'tactical' },
  bomber: { name: '轨道轰炸', asset: 'assets/skills/bomber.svg', group: 'tactical' }
};

const CORE_IDS = ['rocket', 'truck', 'freeze'];
const TACTICAL_IDS = ['tornado', 'boomerang', 'laser', 'bomber'];

function ensureStyle() {
  if (document.getElementById('kp-skill-hud-style')) return;
  const style = document.createElement('style');
  style.id = 'kp-skill-hud-style';
  style.textContent = `
    #kp-skill-hud{position:absolute;left:50%;bottom:66px;transform:translateX(-50%);z-index:35;display:flex;align-items:center;gap:7px;pointer-events:none;padding:7px 9px;border:1px solid rgba(130,180,210,.16);border-radius:18px;background:linear-gradient(180deg,rgba(5,11,20,.86),rgba(3,7,14,.96));box-shadow:0 10px 28px rgba(0,0,0,.45),inset 0 1px rgba(255,255,255,.06);backdrop-filter:blur(8px);max-width:calc(100vw - 12px)}
    .kp-skill-group{display:flex;align-items:center;gap:5px}
    .kp-skill-divider{width:1px;height:34px;background:linear-gradient(180deg,transparent,rgba(105,190,220,.35),transparent);margin:0 2px}
    .kp-skill-group-label{position:absolute;top:-11px;font-size:7px;line-height:1;color:rgba(180,210,225,.58);letter-spacing:1.3px;font-weight:900;text-transform:uppercase;white-space:nowrap}
    .kp-skill-slot{position:relative;width:46px;height:46px;border-radius:12px;overflow:hidden;background:#0b1420;border:1px solid rgba(148,163,184,.2);box-shadow:0 5px 14px rgba(0,0,0,.38);transition:transform .15s,border-color .15s,box-shadow .15s;flex:none}
    .kp-skill-slot img{width:100%;height:100%;object-fit:cover;display:block}
    .kp-skill-slot.off{opacity:.3;filter:grayscale(.85) brightness(.7)}
    .kp-skill-slot.on{border-color:rgba(80,220,255,.72);box-shadow:0 0 0 1px rgba(80,220,255,.1),0 0 14px rgba(0,220,255,.2)}
    .kp-skill-slot.ready{border-color:rgba(117,255,188,.95);box-shadow:0 0 0 1px rgba(117,255,188,.2),0 0 17px rgba(70,255,170,.28)}
    .kp-skill-slot.casting{transform:scale(1.05);border-color:rgba(255,214,92,.95);box-shadow:0 0 18px rgba(255,178,45,.35)}
    .kp-skill-cd{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(180deg,rgba(2,6,23,.1),rgba(2,6,23,.86));height:0;transition:height .1s linear}
    .kp-skill-time{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:900;text-shadow:0 1px 5px #000;pointer-events:none}
    .kp-skill-level{position:absolute;left:4px;bottom:3px;color:#f7d66a;font-size:8px;font-weight:900;line-height:1;text-shadow:0 1px 4px #000;pointer-events:none}
    .kp-skill-key{position:absolute;right:4px;top:3px;color:rgba(255,255,255,.72);font-size:7px;font-weight:900;line-height:1;text-shadow:0 1px 3px #000}
    @media(max-width:470px){#kp-skill-hud{gap:4px;padding:6px 6px;bottom:62px}.kp-skill-slot{width:40px;height:40px;border-radius:10px}.kp-skill-divider{height:30px;margin:0 1px}.kp-skill-time{font-size:11px}.kp-skill-level{font-size:7px;left:3px;bottom:2px}.kp-skill-key{display:none}.kp-skill-group{gap:3px}}
    @media(max-width:360px){#kp-skill-hud{gap:3px}.kp-skill-slot{width:35px;height:35px}.kp-skill-divider{display:none}}
  `;
  document.head.appendChild(style);
}

function createSlot(id, meta, index) {
  return `<div id="kp-skill-slot-${id}" class="kp-skill-slot off" title="${meta.name}"><img src="${meta.asset}" alt="${meta.name}" loading="eager"><div class="kp-skill-cd"></div><div class="kp-skill-time"></div><div class="kp-skill-level"></div><div class="kp-skill-key">${index + 1}</div></div>`;
}

function getProgress(state) {
  if (!state || state.level <= 0 || state.cooldown <= 0) return 0;
  return Math.min(1, Math.max(0, state.timer / state.cooldown));
}

export function installSkillsPetsHud(game) {
  if (!game.feature || document.getElementById('kp-skill-hud')) return;
  ensureStyle();

  const hud = document.createElement('div');
  hud.id = 'kp-skill-hud';
  hud.setAttribute('aria-label', 'Tactical skill deck');
  hud.innerHTML = `
    <div class="kp-skill-group kp-core-group">
      <span class="kp-skill-group-label">CORE</span>
      ${CORE_IDS.map((id, i) => createSlot(id, SKILL_META[id], i)).join('')}
    </div>
    <div class="kp-skill-divider" aria-hidden="true"></div>
    <div class="kp-skill-group kp-tactical-group">
      <span class="kp-skill-group-label">TACTICAL</span>
      ${TACTICAL_IDS.map((id, i) => createSlot(id, SKILL_META[id], i + CORE_IDS.length)).join('')}
    </div>`;
  game.container.appendChild(hud);

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);
    for (const [id, meta] of Object.entries(SKILL_META)) {
      const state = meta.core ? this.skills[id] : this.feature.skills[id];
      const slot = document.getElementById(`kp-skill-slot-${id}`);
      if (!state || !slot) continue;

      const unlocked = state.level > 0;
      const progress = getProgress(state);
      const casting = Number(state.activeTimer || 0) > 0;
      const ready = unlocked && !casting && state.timer >= state.cooldown;

      slot.classList.toggle('off', !unlocked);
      slot.classList.toggle('on', unlocked);
      slot.classList.toggle('ready', ready);
      slot.classList.toggle('casting', casting);
      slot.querySelector('.kp-skill-level').textContent = unlocked ? `LV ${state.level}` : '';
      slot.querySelector('.kp-skill-cd').style.height = unlocked && !casting ? `${Math.max(0, 100 - progress * 100)}%` : '0%';
      slot.querySelector('.kp-skill-time').textContent = unlocked && !casting && state.timer < state.cooldown ? `${Math.ceil(state.cooldown - state.timer)}` : '';
    }
  };
}
