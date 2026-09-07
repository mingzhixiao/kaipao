// ---------------- 关卡选择 / 通关结算 / 符文工坊 UI ----------------
import { runeSystem, RUNE_CATALOG, getRuneUpgradeCost } from './RuneSystem.js';
import { saveManager } from './SaveManager.js';
import { GAME_CONFIG } from '../core/Config.js';

export function showWaveBanner(waveNum, isBossWave, stageConfig = null) {
  const banner = document.getElementById('wave-banner');
  const text = document.getElementById('banner-wave-text');
  const sub = document.getElementById('banner-wave-sub');
  if (!banner) return;
  const stageName = stageConfig?.name || '';
  if (text) {
    text.textContent = isBossWave ? `⚠ BOSS WAVE ${waveNum}` : `WAVE ${waveNum}`;
    if (stageName) text.textContent = `${stageName} · ${text.textContent}`;
  }
  if (sub) sub.textContent = isBossWave ? '高危目标正在逼近防线！' : '感染者集群接近中';
  banner.style.display = 'block';
  banner.style.animation = 'none';
  void banner.offsetWidth;
  banner.style.animation = '';
  setTimeout(() => { banner.style.display = 'none'; }, 2200);
}

export function showStageClearModal(game) {
  const modal = document.getElementById('stage-clear-modal');
  if (!modal) { game.isPaused = false; return; }
  const reward = game.lastStageReward || {};
  const title = document.getElementById('stage-clear-title');
  const scrapEl = document.getElementById('stage-clear-scrap');
  const totalEl = document.getElementById('stage-clear-total-scrap');
  if (title) title.textContent = `${reward.stageName || '关卡'} · 通关成功`;
  if (scrapEl) scrapEl.textContent = `+${reward.scrap || 0}`;
  if (totalEl) totalEl.textContent = `${reward.totalScrap || saveManager.getScrap()}`;

  const choices = runeSystem.rollRewardChoices(3);
  const box = document.getElementById('stage-rune-choices');
  if (box) {
    box.innerHTML = '';
    choices.forEach(c => {
      const el = document.createElement('div');
      el.className = 'rune-choice-card';
      el.innerHTML = `<div class="rune-icon">${c.icon}</div><div class="rune-choice-info"><div class="rune-choice-name">${c.name}</div><div class="rune-choice-lv">Lv.${c.level} → ${c.nextLevel}</div><div class="rune-choice-desc">${c.desc}</div></div>`;
      el.addEventListener('click', () => {
        runeSystem.grantFreeLevel(c.id);
        box.querySelectorAll('.rune-choice-card').forEach(n => n.classList.add('disabled'));
        el.classList.add('selected');
        el.classList.remove('disabled');
      });
      box.appendChild(el);
    });
    if (!choices.length) box.innerHTML = '<div class="rune-choice-empty">全部符文已满级</div>';
  }
  modal.style.display = 'flex';

  const close = () => { modal.style.display = 'none'; };
  const btnNext = document.getElementById('btn-stage-next');
  const btnForge = document.getElementById('btn-open-forge');
  const btnMenu = document.getElementById('btn-stage-menu');
  if (btnNext) btnNext.onclick = () => { close(); game.startStage(Math.min(8, (reward.stageId || 1) + 1)); game.isPaused = false; };
  if (btnForge) btnForge.onclick = () => {
    close();
    import('../ui/HomeLobbyUI.js').then(({ homeLobbyUI }) => {
      homeLobbyUI.switchTab('runes');
      homeLobbyUI.show();
    });
  };
  if (btnMenu) btnMenu.onclick = () => {
    close();
    import('../ui/HomeLobbyUI.js').then(({ homeLobbyUI }) => {
      homeLobbyUI.show();
    });
  };
}

export function showStageSelectModal(game) {
  const modal = document.getElementById('stage-select-modal');
  if (!modal) return;
  const list = document.getElementById('stage-list');
  const scrapLabel = document.getElementById('hub-scrap');
  if (scrapLabel) scrapLabel.textContent = saveManager.getScrap();
  const unlocked = saveManager.getUnlockedStage();
  if (list) {
    list.innerHTML = '';
    (GAME_CONFIG.stages || []).forEach(st => {
      const locked = st.id > unlocked;
      const el = document.createElement('div');
      el.className = 'stage-item' + (locked ? ' locked' : '');
      const goal = st.endless ? '无尽模式' : `通关波次 ${st.clearWaves}`;
      el.innerHTML = `<div class="stage-item-id">STAGE ${st.id}</div><div class="stage-item-name">${st.name}${locked ? ' 🔒' : ''}</div><div class="stage-item-goal">${goal} · 难度 x${st.difficulty}</div>`;
      if (!locked) el.addEventListener('click', () => { modal.style.display = 'none'; game.isPaused = false; game.startStage(st.id); });
      list.appendChild(el);
    });
  }
  modal.style.display = 'flex';
  game.isPaused = true;
  const btnForge = document.getElementById('btn-hub-forge');
  if (btnForge) btnForge.onclick = () => { modal.style.display = 'none'; showRuneForgeModal(game); };
}

export function showRuneForgeModal(game) {
  const modal = document.getElementById('rune-forge-modal');
  if (!modal) return;
  game.isPaused = true;
  runeSystem.reload();
  renderRuneForgeList();
  modal.style.display = 'flex';
  const btnClose = document.getElementById('btn-forge-close');
  if (btnClose) btnClose.onclick = () => { modal.style.display = 'none'; showStageSelectModal(game); };
}

function renderRuneForgeList() {
  const list = document.getElementById('rune-forge-list');
  const scrapEl = document.getElementById('forge-scrap');
  if (scrapEl) scrapEl.textContent = saveManager.getScrap();
  if (!list) return;
  list.innerHTML = '';
  RUNE_CATALOG.forEach(rune => {
    const lv = runeSystem.getLevel(rune.id);
    const maxed = lv >= rune.maxLevel;
    const cost = maxed ? 0 : getRuneUpgradeCost(rune, lv);
    const el = document.createElement('div');
    el.className = 'rune-forge-row' + (maxed ? ' maxed' : '');
    el.innerHTML = `<div class="rune-forge-icon">${rune.icon}</div><div class="rune-forge-info"><div class="rune-forge-name">${rune.name} <span class="rune-lv">Lv.${lv}/${rune.maxLevel}</span></div><div class="rune-forge-desc">${rune.desc}</div></div><button class="rune-upgrade-btn" ${maxed ? 'disabled' : ''}>${maxed ? 'MAX' : cost + ' 碎片'}</button>`;
    const btn = el.querySelector('button');
    if (!maxed) {
      btn.addEventListener('click', () => {
        if (runeSystem.tryUpgrade(rune.id)) renderRuneForgeList();
        else { btn.textContent = '碎片不足'; setTimeout(() => { btn.textContent = cost + ' 碎片'; }, 800); }
      });
    }
    list.appendChild(el);
  });
}
