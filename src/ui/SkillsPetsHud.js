// 战术技能 HUD：4 格战术技能面板 (最多携带 4 个技能，避开城防城墙与血条)
const SKILL_META = {
  rocket: { id: 'rocket', name: '温压火箭', asset: 'assets/cards/icon_rocket.png', core: true },
  truck: { id: 'truck', name: '装甲战车', asset: 'assets/cards/icon_truck.png', core: true },
  freeze: { id: 'freeze', name: '极寒射线', asset: 'assets/cards/icon_frost.png', core: true },
  tornado: { id: 'tornado', name: '裂风涡流', asset: 'assets/skills/tornado.png', group: 'tactical' },
  boomerang: { id: 'boomerang', name: '回旋刃', asset: 'assets/skills/boomerang.png', group: 'tactical' },
  laser: { id: 'laser', name: '湮灭射线', asset: 'assets/skills/laser.png', group: 'tactical' },
  bomber: { id: 'bomber', name: '轨道轰炸', asset: 'assets/skills/bomber.png', group: 'tactical' }
};

const MAX_SKILL_SLOTS = 4;

function ensureStyle() {
  if (document.getElementById('kp-skill-hud-style')) return;
  const style = document.createElement('style');
  style.id = 'kp-skill-hud-style';
  style.textContent = `
    #kp-skill-hud {
      position: absolute;
      left: 50%;
      bottom: 96px;
      transform: translateX(-50%);
      z-index: 35;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      pointer-events: none;
      padding: 6px 10px 7px;
      border: 1.5px solid rgba(56, 189, 248, 0.28);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(8, 15, 28, 0.88), rgba(3, 7, 18, 0.96));
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      user-select: none;
    }
    .kp-skill-header {
      font-size: 8px;
      line-height: 1;
      color: #38bdf8;
      letter-spacing: 1.2px;
      font-weight: 900;
      text-transform: uppercase;
      opacity: 0.85;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .kp-skill-slots-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .kp-skill-slot {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 11px;
      overflow: hidden;
      background: radial-gradient(circle at 50% 30%, #1e293b, #020617);
      border: 1px solid rgba(148, 163, 184, 0.25);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
      transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .kp-skill-slot img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: none;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
    }
    .kp-skill-slot.equipped img {
      display: block;
    }
    .kp-skill-slot.empty {
      border: 1.5px dashed rgba(148, 163, 184, 0.3);
      background: rgba(15, 23, 42, 0.5);
    }
    .kp-skill-slot.empty .kp-empty-mark {
      color: rgba(148, 163, 184, 0.4);
      font-size: 16px;
      font-weight: 900;
    }
    .kp-skill-slot.equipped {
      border-color: rgba(56, 189, 248, 0.45);
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
    }
    .kp-skill-slot.ready {
      border-color: rgba(74, 222, 128, 0.9);
      box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.3), 0 0 16px rgba(74, 222, 128, 0.35);
    }
    .kp-skill-slot.casting {
      transform: scale(1.06);
      border-color: rgba(250, 204, 21, 0.95);
      box-shadow: 0 0 18px rgba(250, 204, 21, 0.45);
    }
    .kp-skill-cd {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(180deg, rgba(2, 6, 23, 0.2), rgba(2, 6, 23, 0.9));
      height: 0;
      transition: height 0.08s linear;
      pointer-events: none;
    }
    .kp-skill-time {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 13px;
      font-weight: 900;
      text-shadow: 0 1px 5px #000;
      pointer-events: none;
    }
    .kp-skill-level {
      position: absolute;
      left: 3px;
      bottom: 2px;
      color: #facc15;
      font-size: 9px;
      font-weight: 900;
      line-height: 1;
      text-shadow: 0 1px 4px #000;
      pointer-events: none;
    }
    .kp-skill-key {
      position: absolute;
      right: 3px;
      top: 2px;
      color: rgba(255, 255, 255, 0.75);
      font-size: 8px;
      font-weight: 900;
      line-height: 1;
      text-shadow: 0 1px 3px #000;
      pointer-events: none;
    }
    @media (max-width: 470px) {
      #kp-skill-hud { bottom: 88px; padding: 5px 8px; gap: 3px; }
      .kp-skill-slot { width: 38px; height: 38px; border-radius: 9px; }
      .kp-skill-slots-wrap { gap: 6px; }
      .kp-skill-time { font-size: 11px; }
      .kp-skill-level { font-size: 8px; left: 2px; bottom: 2px; }
    }
    @media (max-width: 360px) {
      #kp-skill-hud { bottom: 84px; }
      .kp-skill-slot { width: 34px; height: 34px; }
      .kp-skill-slots-wrap { gap: 4px; }
    }
  `;
  document.head.appendChild(style);
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
    <div class="kp-skill-header">
      <span>TACTICAL SKILLS</span>
      <span id="kp-skill-count-badge" style="color:#94a3b8;font-size:7.5px;">(0/4)</span>
    </div>
    <div class="kp-skill-slots-wrap">
      ${Array.from({ length: MAX_SKILL_SLOTS }).map((_, i) => `
        <div id="kp-slot-${i}" class="kp-skill-slot empty" title="战术槽位 ${i + 1}">
          <span class="kp-empty-mark">＋</span>
          <img src="" alt="" loading="eager">
          <div class="kp-skill-cd"></div>
          <div class="kp-skill-time"></div>
          <div class="kp-skill-level"></div>
          <div class="kp-skill-key">${i + 1}</div>
        </div>
      `).join('')}
    </div>`;
  game.container.appendChild(hud);

  // 稳定记录已分配到槽位的技能顺序 [skillId, ...]
  const slotMapping = [];

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);

    // 1. 扫描当前所有激活的技能（level > 0）
    const allActiveIds = [];
    if (this.skills.rocket?.level > 0) allActiveIds.push('rocket');
    if (this.skills.truck?.level > 0) allActiveIds.push('truck');
    if (this.skills.freeze?.level > 0) allActiveIds.push('freeze');
    if (this.feature?.skills) {
      for (const id of ['laser', 'tornado', 'boomerang', 'bomber']) {
        if (this.feature.skills[id]?.level > 0) allActiveIds.push(id);
      }
    }

    // 2. 依次将新激活技能填入槽位映射表（最多 4 个）
    for (const id of allActiveIds) {
      if (!slotMapping.includes(id) && slotMapping.length < MAX_SKILL_SLOTS) {
        slotMapping.push(id);
      }
    }

    // 3. 更新标题栏数量提示
    const badge = document.getElementById('kp-skill-count-badge');
    if (badge) {
      badge.textContent = `(${slotMapping.length}/${MAX_SKILL_SLOTS})`;
      badge.style.color = slotMapping.length >= MAX_SKILL_SLOTS ? '#facc15' : '#94a3b8';
    }

    // 4. 更新 4 个槽位状态
    for (let i = 0; i < MAX_SKILL_SLOTS; i++) {
      const slotEl = document.getElementById(`kp-slot-${i}`);
      if (!slotEl) continue;

      const skillId = slotMapping[i];
      if (!skillId) {
        // 空槽位
        if (!slotEl.classList.contains('empty')) {
          slotEl.className = 'kp-skill-slot empty';
          slotEl.querySelector('img').src = '';
          slotEl.querySelector('.kp-empty-mark').style.display = 'block';
          slotEl.querySelector('.kp-skill-level').textContent = '';
          slotEl.querySelector('.kp-skill-time').textContent = '';
          slotEl.querySelector('.kp-skill-cd').style.height = '0%';
        }
        continue;
      }

      // 已装备技能
      const meta = SKILL_META[skillId];
      const state = meta.core ? this.skills[skillId] : this.feature.skills[skillId];
      if (!state) continue;

      const imgEl = slotEl.querySelector('img');
      if (imgEl.getAttribute('data-skill') !== skillId) {
        imgEl.src = meta.asset;
        imgEl.alt = meta.name;
        imgEl.setAttribute('data-skill', skillId);
        slotEl.title = `${meta.name} (槽位 ${i + 1})`;
        slotEl.querySelector('.kp-empty-mark').style.display = 'none';
      }

      const unlocked = state.level > 0;
      const progress = getProgress(state);
      const casting = Number(state.activeTimer || 0) > 0;
      const ready = unlocked && !casting && state.timer >= state.cooldown;

      slotEl.className = `kp-skill-slot equipped ${ready ? 'ready' : ''} ${casting ? 'casting' : ''}`;
      slotEl.querySelector('.kp-skill-level').textContent = unlocked ? `Lv.${state.level}` : '';
      slotEl.querySelector('.kp-skill-cd').style.height = unlocked && !casting ? `${Math.max(0, 100 - progress * 100)}%` : '0%';
      slotEl.querySelector('.kp-skill-time').textContent = unlocked && !casting && state.timer < state.cooldown ? `${Math.ceil(state.cooldown - state.timer)}` : '';
    }
  };
}
