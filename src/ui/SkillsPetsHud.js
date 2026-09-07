// 统一战术技能栏：核心三技能(game.skills) + 元素扩展技能(game.feature.skills) 合并为一条风格一致的图标条
const SKILL_META = {
  rocket: { name: '温压火箭', asset: 'assets/icon_rocket.jpg', core: true },
  truck: { name: '装甲战车', asset: 'assets/icon_truck.jpg', core: true },
  freeze: { name: '极寒射线', asset: 'assets/icon_frost.jpg', core: true },
  tornado: { name: '裂风涡流', asset: 'assets/skills/tornado.png' },
  laser: { name: '湮灭射线', asset: 'assets/skills/laser.png' },
  boomerang: { name: '回旋刃', asset: 'assets/skills/boomerang.png' },
  bomber: { name: '轨道轰炸', asset: 'assets/skills/bomber.png' }
};

function ensureStyle() {
  if (document.getElementById('kp-skill-hud-style')) return;
  const style = document.createElement('style');
  style.id = 'kp-skill-hud-style';
  style.textContent = `
    #kp-skill-hud{position:absolute;left:50%;bottom:62px;transform:translateX(-50%);z-index:35;display:flex;gap:6px;pointer-events:none;padding:6px 9px;border-radius:16px;background:linear-gradient(to top,rgba(5,8,16,.6),rgba(5,8,16,.12));backdrop-filter:blur(4px)}
    .kp-skill-slot{position:relative;width:44px;height:44px;border-radius:11px;overflow:hidden;background:rgba(15,23,42,.92);border:1.5px solid rgba(148,163,184,.22);box-shadow:0 4px 12px rgba(0,0,0,.4);transition:border-color .2s,box-shadow .2s}
    .kp-skill-slot img{width:100%;height:100%;object-fit:cover;display:block}
    .kp-skill-slot.off{opacity:.42;filter:grayscale(.75)}
    .kp-skill-slot.on{border-color:rgba(0,240,255,.7);box-shadow:0 0 12px rgba(0,240,255,.35)}
    .kp-skill-cd{position:absolute;inset:auto 0 0;left:0;right:0;background:rgba(2,6,23,.66);height:0;transition:height .12s linear}
    .kp-skill-time{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:900;text-shadow:0 1px 4px #000}
    .kp-skill-level{position:absolute;right:2px;bottom:1px;color:#ffcc00;font-size:9px;font-weight:900;line-height:1;text-shadow:0 1px 3px #000}
    @media(max-width:420px){#kp-skill-hud{bottom:56px;gap:4px;padding:5px 7px}.kp-skill-slot{width:38px;height:38px}}
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
    for (const [id, meta] of Object.entries(SKILL_META)) {
      const state = meta.core ? this.skills[id] : this.feature.skills[id];
      const slot = document.getElementById(`kp-skill-slot-${id}`);
      if (!state || !slot) continue;
      const unlocked = state.level > 0;
      slot.classList.toggle('off', !unlocked);
      slot.classList.toggle('on', unlocked);
      slot.querySelector('.kp-skill-level').textContent = unlocked ? `Lv.${state.level}` : '';
      const casting = state.activeTimer > 0;
      const progress = unlocked ? Math.min(1, state.timer / state.cooldown) : 0;
      slot.querySelector('.kp-skill-cd').style.height = unlocked && !casting ? `${Math.max(0, 100 - progress * 100)}%` : '0%';
      slot.querySelector('.kp-skill-time').textContent = unlocked && !casting && state.timer < state.cooldown ? `${Math.ceil(state.cooldown - state.timer)}` : '';
    }
  };
}
