// 战术技能 HUD：4 格战术技能面板 + 波次战术提示
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

const WAVE_TACTICS = {
  teach: {
    title: '教学波',
    icon: '◈',
    tip: '观察敌人的行进路线，熟悉车道与技能释放时机。',
    accent: '#38bdf8'
  },
  rush: {
    title: '疾袭波',
    icon: '»',
    tip: '高速敌人来袭！优先处理前排，保留控制技能应对突破。',
    accent: '#f97316'
  },
  elite: {
    title: '重装波',
    icon: '◆',
    tip: '重装单位出现！集中火力，不要让高耐久敌人贴近防线。',
    accent: '#facc15'
  },
  boss: {
    title: 'BOSS 战',
    icon: '★',
    tip: '首领即将入场！先清理小怪，再把爆发技能留给首领。',
    accent: '#fb7185'
  }
};

function ensureStyle() {
  if (document.getElementById('kp-skill-hud-style')) return;
  const style = document.createElement('style');
  style.id = 'kp-skill-hud-style';
  style.textContent = `
    #kp-wave-tactic {
      position: absolute;
      left: 50%;
      top: 50px;
      transform: translate(-50%, -10px);
      width: min(340px, calc(100% - 24px));
      box-sizing: border-box;
      padding: 10px 14px 11px;
      border: 1px solid var(--kp-wave-accent, rgba(56, 189, 248, 0.65));
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(8, 15, 28, 0.96), rgba(15, 23, 42, 0.94));
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.6), 0 0 18px color-mix(in srgb, var(--kp-wave-accent, #38bdf8) 22%, transparent);
      opacity: 0;
      pointer-events: none;
      z-index: 50;
      transition: opacity .22s ease, transform .22s ease;
      user-select: none;
    }
    #kp-wave-tactic.visible { opacity: 1; transform: translate(-50%, 0); }
    #kp-wave-tactic.boss { padding: 12px 14px; }
    #kp-wave-tactic-head { display: flex; align-items: center; gap: 7px; }
    #kp-wave-tactic-icon { color: var(--kp-wave-accent, #38bdf8); font-size: 14px; font-weight: 900; }
    #kp-wave-tactic-title { color: #fff; font-size: 13px; font-weight: 900; letter-spacing: .5px; }
    #kp-wave-tactic-wave { margin-left: auto; color: #94a3b8; font-size: 9px; font-weight: 800; }
    #kp-wave-tactic-tip { margin-top: 5px; color: #cbd5e1; font-size: 10px; line-height: 1.45; }
    #kp-wave-tactic-line { height: 2px; margin-top: 8px; border-radius: 2px; background: var(--kp-wave-accent, #38bdf8); opacity: .65; transform-origin: left; animation: kp-wave-line .7s ease-out; }
    @keyframes kp-wave-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @media (prefers-reduced-motion: reduce) {
      #kp-wave-tactic { transition: none; }
      #kp-wave-tactic-line { animation: none; }
    }

    #kp-skill-hud {
      position: absolute;
      right: 8px;
      bottom: 148px;
      z-index: 35;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      pointer-events: none;
      padding: 6px 5px 7px;
      border: 1.5px solid rgba(56, 189, 248, 0.28);
      border-radius: 14px;
      background: linear-gradient(180deg, rgba(8, 15, 28, 0.9), rgba(3, 7, 18, 0.96));
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      user-select: none;
    }
    .kp-skill-header {
      font-size: 7px;
      line-height: 1.1;
      color: #38bdf8;
      letter-spacing: 0.6px;
      font-weight: 900;
      text-transform: uppercase;
      opacity: 0.85;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      margin-bottom: 1px;
    }
    .kp-skill-slots-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .kp-skill-slot {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 10px;
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
    .kp-skill-slot img { width: 100%; height: 100%; object-fit: contain; display: none; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }
    .kp-skill-slot.equipped img { display: block; }
    .kp-skill-slot.empty { border: 1.5px dashed rgba(148, 163, 184, 0.3); background: rgba(15, 23, 42, 0.5); }
    .kp-skill-slot.empty .kp-empty-mark { color: rgba(148, 163, 184, 0.4); font-size: 16px; font-weight: 900; }
    .kp-skill-slot.equipped { border-color: rgba(56, 189, 248, 0.45); box-shadow: 0 0 10px rgba(56, 189, 248, 0.2); }
    .kp-skill-slot.ready { border-color: rgba(74, 222, 128, 0.9); box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.3), 0 0 16px rgba(74, 222, 128, 0.35); }
    .kp-skill-slot.casting { transform: scale(1.06); border-color: rgba(250, 204, 21, 0.95); box-shadow: 0 0 18px rgba(250, 204, 21, 0.45); }
    .kp-skill-cd { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(2, 6, 23, 0.2), rgba(2, 6, 23, 0.9)); height: 0; transition: height 0.08s linear; pointer-events: none; }
    .kp-skill-time { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px; font-weight: 900; text-shadow: 0 1px 5px #000; pointer-events: none; }
    .kp-skill-level { position: absolute; left: 3px; bottom: 2px; color: #facc15; font-size: 9px; font-weight: 900; line-height: 1; text-shadow: 0 1px 4px #000; pointer-events: none; }
    .kp-skill-key { position: absolute; right: 3px; top: 2px; color: rgba(255, 255, 255, 0.75); font-size: 8px; font-weight: 900; line-height: 1; text-shadow: 0 1px 3px #000; pointer-events: none; }
    @media (max-width: 470px) {
      #kp-skill-hud { right: 6px; bottom: 135px; padding: 5px 4px 6px; gap: 4px; }
      .kp-skill-slot { width: 36px; height: 36px; border-radius: 8px; }
      .kp-skill-slots-wrap { gap: 5px; }
      .kp-skill-time { font-size: 11px; }
      .kp-skill-level { font-size: 8px; left: 2px; bottom: 2px; }
      #kp-wave-tactic { top: 48px; width: min(310px, calc(100% - 16px)); }
    }
    @media (max-width: 360px) {
      #kp-skill-hud { right: 4px; bottom: 125px; }
      .kp-skill-slot { width: 32px; height: 32px; }
      .kp-skill-slots-wrap { gap: 4px; }
      #kp-wave-tactic-tip { font-size: 9px; }
    }
  `;
  document.head.appendChild(style);
}

function getProgress(state) {
  if (!state || state.level <= 0 || state.cooldown <= 0) return 0;
  return Math.min(1, Math.max(0, state.timer / state.cooldown));
}

function getWaveTactic(plan) {
  if (!plan) return null;
  if (plan.boss || plan.type === 'boss') return WAVE_TACTICS.boss;
  return WAVE_TACTICS[plan.type] || null;
}

export function installSkillsPetsHud(game) {
  if (!game.feature || document.getElementById('kp-skill-hud')) return;
  ensureStyle();

  const tacticPanel = document.createElement('div');
  tacticPanel.className = 'kp-wave-tactic';
  tacticPanel.id = 'kp-wave-tactic';
  tacticPanel.setAttribute('role', 'status');
  tacticPanel.setAttribute('aria-live', 'polite');
  tacticPanel.innerHTML = `
    <div class="kp-wave-tactic-head">
      <span class="kp-wave-tactic-icon" id="kp-wave-tactic-icon">◈</span>
      <span class="kp-wave-tactic-title" id="kp-wave-tactic-title">战术提示</span>
      <span class="kp-wave-tactic-wave" id="kp-wave-tactic-wave"></span>
    </div>
    <div class="kp-wave-tactic-tip" id="kp-wave-tactic-tip"></div>
    <div class="kp-wave-tactic-line"></div>
  `;
  game.container.appendChild(tacticPanel);

  const hud = document.createElement('div');
  hud.id = 'kp-skill-hud';
  hud.setAttribute('aria-label', 'Tactical skill deck');
  hud.innerHTML = `
    <div class="kp-skill-header">
      <span>SKILL</span>
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

  const slotMapping = [];
  let lastWaveBriefingKey = '';
  let briefingTimer = 0;

  const showWaveBriefing = (plan) => {
    const tactic = getWaveTactic(plan);
    if (!tactic) return;
    const wave = Number(plan.wave || game.wave || 0);
    const key = `${plan.stageId || game.stageId || 0}:${wave}:${plan.type}:${plan.boss ? 1 : 0}`;
    if (key === lastWaveBriefingKey) return;
    lastWaveBriefingKey = key;

    const panel = document.getElementById('kp-wave-tactic');
    if (!panel) return;
    panel.style.setProperty('--kp-wave-accent', tactic.accent);
    panel.classList.toggle('boss', tactic === WAVE_TACTICS.boss);
    document.getElementById('kp-wave-tactic-icon').textContent = tactic.icon;
    document.getElementById('kp-wave-tactic-title').textContent = tactic.title;
    document.getElementById('kp-wave-tactic-wave').textContent = `第 ${wave} 波`;
    document.getElementById('kp-wave-tactic-tip').textContent = tactic.tip;
    panel.classList.remove('visible');
    requestAnimationFrame(() => panel.classList.add('visible'));
    briefingTimer = tactic === WAVE_TACTICS.boss ? 5.5 : 4.0;
  };

  const originalReset = game.resetGame.bind(game);
  game.resetGame = function() {
    originalReset();
    slotMapping.length = 0;
  };

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);

    // 波次进入时只触发一次战术简报，不参与每帧 DOM 重建。
    if (this.wavePlan) showWaveBriefing(this.wavePlan);
    if (briefingTimer > 0) {
      briefingTimer -= dt;
      if (briefingTimer <= 0) document.getElementById('kp-wave-tactic')?.classList.remove('visible');
    }

    const allActiveIds = [];
    if (this.skills.rocket?.level > 0) allActiveIds.push('rocket');
    if (this.skills.truck?.level > 0) allActiveIds.push('truck');
    if (this.skills.freeze?.level > 0) allActiveIds.push('freeze');
    if (this.feature?.skills) {
      for (const id of ['laser', 'tornado', 'boomerang', 'bomber']) {
        if (this.feature.skills[id]?.level > 0) allActiveIds.push(id);
      }
    }

    for (let i = slotMapping.length - 1; i >= 0; i--) {
      if (!allActiveIds.includes(slotMapping[i])) {
        slotMapping.splice(i, 1);
      }
    }

    for (const id of allActiveIds) {
      if (!slotMapping.includes(id) && slotMapping.length < MAX_SKILL_SLOTS) slotMapping.push(id);
    }

    const badge = document.getElementById('kp-skill-count-badge');
    if (badge) {
      badge.textContent = `(${slotMapping.length}/${MAX_SKILL_SLOTS})`;
      badge.style.color = slotMapping.length >= MAX_SKILL_SLOTS ? '#facc15' : '#94a3b8';
    }

    for (let i = 0; i < MAX_SKILL_SLOTS; i++) {
      const slotEl = document.getElementById(`kp-slot-${i}`);
      if (!slotEl) continue;
      const skillId = slotMapping[i];
      if (!skillId) {
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
