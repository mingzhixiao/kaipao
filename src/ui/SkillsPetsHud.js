const SKILL_META = {
  tornado: { name: '裂风涡流', asset: 'assets/skills/tornado.png' },
  boomerang: { name: '回旋刃', asset: 'assets/skills/boomerang.png' },
  laser: { name: '湮灭射线', asset: 'assets/skills/laser.png' },
  bomber: { name: '轨道轰炸', asset: 'assets/skills/bomber.png' }
};

function ensureStyle() {
  if (document.getElementById('kp-skill-hud-style')) return;
  const style = document.createElement('style');
  style.id = 'kp-skill-hud-style';
  style.textContent = `
    #kp-skill-hud{position:absolute;left:50%;bottom:78px;transform:translateX(-50%);z-index:35;display:flex;gap:7px;pointer-events:none}
    .kp-skill-slot{position:relative;width:46px;height:46px;border-radius:10px;overflow:hidden;background:rgba(2,6,23,.86);border:1px solid rgba(148,163,184,.28);box-shadow:0 5px 16px rgba(0,0,0,.28)}
    .kp-skill-slot img{width:100%;height:100%;object-fit:cover;display:block}.kp-skill-slot.off{opacity:.38;filter:grayscale(.7)}
    .kp-skill-cd{position:absolute;inset:auto 0 0;background:rgba(2,6,23,.72);height:0}.kp-skill-time{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;text-shadow:0 1px 3px #000}.kp-skill-level{position:absolute;right:3px;top:2px;color:#facc15;font-size:9px;font-weight:800;text-shadow:0 1px 3px #000}
    @media(max-width:420px){#kp-skill-hud{bottom:72px}.kp-skill-slot{width:40px;height:40px}}
  `;
  document.head.appendChild(style);
}

export function installSkillsPetsHud(game) {
  if (!game.feature || document.getElementById('kp-skill-hud')) return;
  ensureStyle();
  const hud = document.createElement('div');
  hud.id = 'kp-skill-hud';
  hud.innerHTML = Object.entries(SKILL_META).map(([id, meta]) => `<div id="kp-skill-slot-${id}" class="kp-skill-slot off" title="${meta.name}"><img src="${meta.asset}" alt="${meta.name}"><div class="kp-skill-cd"></div><div class="kp-skill-time"></div><div class="kp-skill-level"></div></div>`).join('');
  game.container.appendChild(hud);

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);
    for (const [id] of Object.entries(SKILL_META)) {
      const state = this.feature.skills[id];
      const slot = document.getElementById(`kp-skill-slot-${id}`);
      if (!state || !slot) continue;
      const unlocked = state.level > 0;
      slot.classList.toggle('off', !unlocked);
      slot.querySelector('.kp-skill-level').textContent = unlocked ? `Lv.${state.level}` : '';
      const progress = unlocked ? Math.min(1, state.timer / state.cooldown) : 0;
      slot.querySelector('.kp-skill-cd').style.height = `${Math.max(0, 100 - progress * 100)}%`;
      slot.querySelector('.kp-skill-time').textContent = unlocked && state.timer < state.cooldown ? `${Math.ceil(state.cooldown - state.timer)}` : '';
    }
  };
}
