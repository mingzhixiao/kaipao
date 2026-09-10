// 战术技能 HUD：4 格战术技能面板 + 波次战术提示
const SKILL_META = {
  rocket: { id: 'rocket', name: '裂变等离子重炮', icon: '🔥', asset: 'assets/cards/icon_rocket.png', desc: '全屏覆盖等离子聚变爆轰', core: true },
  truck: { id: 'truck', name: '磁浮重装扫荡舰', icon: '🛸', asset: 'assets/cards/icon_truck.png', desc: '磁浮重装扫荡巡航前线', core: true },
  freeze: { id: 'freeze', name: '绝对零度射线', icon: '❄️', asset: 'assets/cards/icon_frost.png', desc: '绝对零度持续凝结', core: true },
  tornado: { id: 'tornado', name: '微型引力奇点', icon: '🌪️', asset: 'assets/skills/tornado.png', desc: '强效引力牵引聚怪', group: 'tactical' },
  boomerang: { id: 'boomerang', name: '高周波磁旋刃', icon: '🪃', asset: 'assets/skills/boomerang.png', desc: '高频穿透双程撕裂', group: 'tactical' },
  laser: { id: 'laser', name: '粒子歼灭切割器', icon: '⚡', asset: 'assets/skills/laser.png', desc: '贯穿高能粒子束死光', group: 'tactical' },
  bomber: { id: 'bomber', name: '天基动能天谴打击', icon: '🚀', asset: 'assets/skills/bomber.png', desc: '天基轨道精准打击', group: 'tactical' }
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
      top: calc(46px + var(--ui-safe-top, 0px));
      transform: translate(-50%, -15px) scale(0.95);
      width: min(350px, calc(100% - 24px));
      box-sizing: border-box;
      padding: 12px 16px 13px;
      border: 1.5px solid var(--kp-wave-accent, rgba(56, 189, 248, 0.75));
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(8, 15, 28, 0.98), rgba(15, 23, 42, 0.96));
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8), 0 0 22px color-mix(in srgb, var(--kp-wave-accent, #38bdf8) 35%, transparent);
      opacity: 0;
      pointer-events: none;
      z-index: 55;
      transition: opacity .25s ease, transform .25s cubic-bezier(0.18, 1, 0.3, 1), box-shadow .25s ease;
      user-select: none;
    }
    #kp-wave-tactic.visible {
      opacity: 1;
      transform: translate(-50%, 0) scale(1.0);
      animation: tacticCardPulse 2s infinite alternate ease-in-out;
    }
    @keyframes tacticCardPulse {
      0% { box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8), 0 0 18px color-mix(in srgb, var(--kp-wave-accent, #38bdf8) 25%, transparent); }
      100% { box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8), 0 0 28px color-mix(in srgb, var(--kp-wave-accent, #38bdf8) 45%, transparent); }
    }
    #kp-wave-tactic.boss {
      padding: 13px 16px;
      border-width: 2px;
    }
    #kp-wave-tactic-head { display: flex; align-items: center; gap: 8px; }
    #kp-wave-tactic-icon { color: var(--kp-wave-accent, #38bdf8); font-size: 15px; font-weight: 900; filter: drop-shadow(0 0 8px var(--kp-wave-accent)); }
    #kp-wave-tactic-title { color: #fff; font-size: 14px; font-weight: 900; letter-spacing: .6px; text-shadow: 0 0 8px rgba(255,255,255,0.4); }
    #kp-wave-tactic-wave { margin-left: auto; color: #94a3b8; font-size: 10px; font-weight: 800; background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 10px; }
    #kp-wave-tactic-tip { margin-top: 6px; color: #e2e8f0; font-size: 11px; line-height: 1.5; font-weight: 600; }
    #kp-wave-tactic-line { height: 2.5px; margin-top: 9px; border-radius: 2px; background: var(--kp-wave-accent, #38bdf8); opacity: .8; transform-origin: left; animation: kp-wave-line .7s ease-out; box-shadow: 0 0 10px var(--kp-wave-accent); }
    @keyframes kp-wave-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @media (prefers-reduced-motion: reduce) {
      #kp-wave-tactic { transition: none; }
      #kp-wave-tactic.visible { animation: none; }
      #kp-wave-tactic-line { animation: none; }
    }

    #kp-skill-hud {
      position: absolute;
      left: 50%;
      bottom: 8px;
      transform: translateX(-50%);
      z-index: 35;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      pointer-events: auto;
      padding: 5px 8px;
      border: 1.5px solid rgba(0, 240, 255, 0.35);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(8, 15, 28, 0.94), rgba(3, 7, 18, 0.98));
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.75), 0 0 16px rgba(0, 240, 255, 0.2);
      backdrop-filter: blur(10px);
      user-select: none;
    }
    .kp-skill-slots-wrap {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }
    .kp-skill-slot {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      overflow: hidden;
      background: radial-gradient(circle at 50% 30%, #1e293b, #020617);
      border: 1.5px solid rgba(148, 163, 184, 0.28);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.55);
      transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .kp-skill-slot img {
      width: 100%; height: 100%; object-fit: contain; display: none;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7));
    }
    .kp-skill-slot.equipped img { display: block; }
    .kp-skill-slot.empty {
      border: 1.5px dashed rgba(148, 163, 184, 0.3);
      background: rgba(15, 23, 42, 0.45);
    }
    .kp-skill-slot.empty .kp-empty-mark {
      color: rgba(148, 163, 184, 0.45); font-size: 16px; font-weight: 900;
    }
    .kp-skill-slot.equipped {
      border-color: rgba(0, 240, 255, 0.5);
      box-shadow: 0 0 12px rgba(0, 240, 255, 0.25);
    }
    .kp-skill-slot.ready {
      border-color: rgba(74, 222, 128, 0.95);
      box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.4), 0 0 16px rgba(74, 222, 128, 0.4);
    }
    .kp-skill-slot.casting {
      transform: scale(1.08);
      border-color: rgba(250, 204, 21, 0.95);
      box-shadow: 0 0 18px rgba(250, 204, 21, 0.5);
    }
    .kp-skill-elem {
      position: absolute; left: 2px; top: 1px; font-size: 11px; line-height: 1;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.85)); pointer-events: none; z-index: 5;
    }
    .kp-skill-cd {
      position: absolute; inset: 0;
      pointer-events: none; z-index: 4;
      border-radius: inherit;
      transition: background 0.08s linear;
    }
    .kp-skill-time {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 14px; font-weight: 900;
      text-shadow: 0 1px 6px #000, 0 0 10px rgba(0, 240, 255, 0.6);
      pointer-events: none; z-index: 6;
    }
    .kp-skill-level {
      position: absolute; left: 3px; bottom: 2px; color: #facc15; font-size: 9px;
      font-weight: 900; line-height: 1; text-shadow: 0 1px 4px #000;
      pointer-events: none; z-index: 5;
    }
    .kp-skill-key {
      position: absolute; right: 3px; top: 2px; color: rgba(255, 255, 255, 0.65);
      font-size: 8px; font-weight: 900; line-height: 1; text-shadow: 0 1px 3px #000;
      pointer-events: none; z-index: 5;
    }
    .kp-skill-dots-row {
      display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 1px;
    }
    .kp-skill-dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: rgba(148, 163, 184, 0.35); transition: all 0.2s ease;
    }
    .kp-skill-dot.active {
      background: #00f0ff; box-shadow: 0 0 6px #00f0ff;
    }
    @media (max-width: 470px) {
      #kp-skill-hud { bottom: 6px; padding: 4px 6px; }
      .kp-skill-slot { width: 38px; height: 38px; border-radius: 10px; }
      .kp-skill-slots-wrap { gap: 6px; }
      .kp-skill-time { font-size: 12px; }
      .kp-skill-level { font-size: 8px; left: 2px; bottom: 2px; }
      #kp-wave-tactic { top: calc(44px + var(--ui-safe-top, 0px)); width: min(310px, calc(100% - 16px)); }
    }
    @media (max-width: 360px) {
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
    <div class="kp-skill-slots-wrap">
      ${Array.from({ length: MAX_SKILL_SLOTS }).map((_, i) => `
        <div id="kp-slot-${i}" class="kp-skill-slot empty" tabindex="0" role="button" aria-label="战术技能槽位 ${i + 1}" title="战术槽位 ${i + 1}">
          <span class="kp-empty-mark">＋</span>
          <img src="" alt="" loading="eager">
          <span class="kp-skill-elem"></span>
          <div class="kp-skill-cd"></div>
          <div class="kp-skill-time"></div>
          <div class="kp-skill-level"></div>
          <div class="kp-skill-key">${i + 1}</div>
        </div>
      `).join('')}
    </div>
    <div class="kp-skill-dots-row" id="kp-skill-dots" title="战术技能槽位装配情况">
      ${Array.from({ length: MAX_SKILL_SLOTS }).map((_, i) => `
        <span class="kp-skill-dot" id="kp-skill-dot-${i}"></span>
      `).join('')}
    </div>`;
  game.container.appendChild(hud);

  // 绑定技能槽位的手柄/键盘回车点击响应
  hud.querySelectorAll('.kp-skill-slot').forEach((slotEl, idx) => {
    slotEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        slotEl.click();
      }
    });
  });

  const slotMapping = [];
  let lastWaveBriefingKey = '';
  let briefingTimer = 0;

  // 槽位内的子元素是静态结构，可以在首次挂载时一次性缓存。
  // 原先每帧要做 4 次 getElementById + 约 20 次 querySelector，并且无条件回写
  // className / textContent / conic-gradient，即使值完全没变也会触发样式重算。
  // 现在改为「缓存引用 + 记录上次写入值」，只有真正变化时才碰 DOM。
  const slotCache = [];
  let slotCacheReady = false;

  function buildSlotCache() {
    slotCache.length = 0;
    for (let i = 0; i < MAX_SKILL_SLOTS; i++) {
      const el = document.getElementById(`kp-slot-${i}`);
      if (!el) return false;
      slotCache.push({
        el,
        img: el.querySelector('img'),
        emptyMark: el.querySelector('.kp-empty-mark'),
        elem: el.querySelector('.kp-skill-elem'),
        cd: el.querySelector('.kp-skill-cd'),
        time: el.querySelector('.kp-skill-time'),
        level: el.querySelector('.kp-skill-level'),
        dot: document.getElementById(`kp-skill-dot-${i}`),
        skillId: el.querySelector('img').getAttribute('data-skill'),
        className: el.className,
        levelText: null,
        timeKey: null,
        angle: -1,
        dotActive: null
      });
    }
    slotCacheReady = true;
    return true;
  }

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
    for (const id of ['laser', 'tornado', 'boomerang', 'bomber']) {
      if (this.skills[id]?.level > 0) allActiveIds.push(id);
    }

    for (let i = slotMapping.length - 1; i >= 0; i--) {
      if (!allActiveIds.includes(slotMapping[i])) {
        slotMapping.splice(i, 1);
      }
    }

    for (const id of allActiveIds) {
      if (!slotMapping.includes(id) && slotMapping.length < MAX_SKILL_SLOTS) slotMapping.push(id);
    }

    if (!slotCacheReady || !slotCache[0].el.isConnected) {
      if (!buildSlotCache()) return; // HUD 尚未挂载，下一帧再试
    }

    for (let i = 0; i < MAX_SKILL_SLOTS; i++) {
      const st = slotCache[i];
      const dotActive = i < slotMapping.length;
      if (st.dot && st.dotActive !== dotActive) {
        st.dotActive = dotActive;
        st.dot.classList.toggle('active', dotActive);
      }

      const skillId = slotMapping[i];
      if (!skillId) {
        if (st.skillId !== null) {
          st.skillId = null;
          st.className = 'kp-skill-slot empty';
          st.levelText = null;
          st.timeKey = null;
          st.angle = -1;
          st.el.className = 'kp-skill-slot empty';
          // 用 removeAttribute 而不是 src = ''：后者会被解析成当前页面地址并触发一次多余请求
          st.img.removeAttribute('src');
          st.img.removeAttribute('data-skill');
          st.emptyMark.style.display = 'block';
          if (st.elem) st.elem.textContent = '';
          st.level.textContent = '';
          st.time.textContent = '';
          st.cd.style.background = 'transparent';
          st.el.title = `战术槽位 ${i + 1} (待装配)`;
        }
        continue;
      }

      const meta = SKILL_META[skillId];
      // 核心技能与战术技能的运行时状态现已统一存在 game.skills
      const state = this.skills[skillId];
      if (!state) continue;

      if (st.skillId !== skillId) {
        st.skillId = skillId;
        // 换技能时上一轮的等级/倒计时/扇形角度全部失效，置空以强制重写
        st.levelText = null;
        st.timeKey = null;
        st.angle = -1;
        st.img.src = meta.asset;
        st.img.alt = meta.name;
        st.img.setAttribute('data-skill', skillId);
        st.el.title = `${meta.name}: ${meta.desc || ''}`;
        st.emptyMark.style.display = 'none';
        if (st.elem) st.elem.textContent = meta.icon || '⚡';
      }

      const unlocked = state.level > 0;
      const progress = getProgress(state);
      const casting = Number(state.activeTimer || 0) > 0;
      const ready = unlocked && !casting && state.timer >= state.cooldown;
      const className = `kp-skill-slot equipped ${ready ? 'ready' : ''} ${casting ? 'casting' : ''}`;
      if (st.className !== className) {
        st.className = className;
        st.el.className = className;
      }

      const levelText = unlocked ? `Lv.${state.level}` : '';
      if (st.levelText !== levelText) {
        st.levelText = levelText;
        st.level.textContent = levelText;
      }

      if (unlocked && !casting && state.timer < state.cooldown) {
        const cooledAngle = Math.round(progress * 360);
        if (st.angle !== cooledAngle) {
          st.angle = cooledAngle;
          // 外层：顺时针扫过的半透明黑色扇形，扫过的角度代表已冷却比例
          st.cd.style.background = `conic-gradient(transparent 0deg, transparent ${cooledAngle}deg, rgba(3, 7, 18, 0.78) ${cooledAngle}deg, rgba(3, 7, 18, 0.78) 360deg)`;
        }
        // 内层：中央剩余秒数（仅在剩余冷却 > 0.5s 时显示）
        // 先把显示值量化成 key 再比较，避免每帧都跑一次 toFixed。
        const remaining = state.cooldown - state.timer;
        let timeKey = '';
        let timeText = '';
        if (remaining > 0.5) {
          if (remaining >= 10) {
            timeKey = String(Math.ceil(remaining));
            timeText = timeKey;
          } else {
            const tick = Math.round(remaining * 10);
            timeKey = `t${tick}`;
            timeText = (tick / 10).toFixed(1);
          }
        }
        if (st.timeKey !== timeKey) {
          st.timeKey = timeKey;
          st.time.textContent = timeText;
        }
      } else {
        if (st.angle !== -1) {
          st.angle = -1;
          st.cd.style.background = 'transparent';
        }
        if (st.timeKey !== '') {
          st.timeKey = '';
          st.time.textContent = '';
        }
      }
    }
  };
}
