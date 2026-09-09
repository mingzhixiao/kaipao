// ---------------- 关卡选择 / 通关结算 / 符文工坊 UI ----------------
import { runeSystem, RUNE_CATALOG, getRuneUpgradeCost } from './RuneSystem.js';
import { saveManager } from './SaveManager.js';
import { GAME_CONFIG } from '../core/Config.js';

export function showWaveBanner(waveNum, isBossWave, stageConfig = null, wavePlan = null) {
  const banner = document.getElementById('wave-banner');
  const text = document.getElementById('banner-wave-text');
  const sub = document.getElementById('banner-wave-sub');
  if (!banner) return;
  if (text) {
    text.textContent = isBossWave ? `BOSS WAVE ${waveNum}` : `WAVE ${waveNum}`;
  }
  if (sub) {
    if (isBossWave) {
      sub.textContent = '👑 极度危险！变异暴君领主正在逼近防线！';
    } else if (wavePlan?.intensity > 0.75) {
      sub.textContent = '⚡ 狂暴红潮！高密度集群疯狂扑击！';
    } else if (wavePlan?.bias?.charger > 0.35) {
      sub.textContent = '⚠️ 极速裂变者高速冲锋！当心防线穿透！';
    } else if (wavePlan?.bias?.behemoth > 0.25) {
      sub.textContent = '🛡️ 巨型重甲突变体推进！建议重火能集火！';
    } else {
      sub.textContent = '感染者集群接近中 · 坚守废土防线';
    }
  }
  banner.style.display = 'block';
  banner.classList.remove('active-banner');
  void banner.offsetWidth;
  banner.classList.add('active-banner');
  if (banner._timer) clearTimeout(banner._timer);
  banner._timer = setTimeout(() => {
    banner.style.display = 'none';
    banner.classList.remove('active-banner');
  }, 950);
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

  // 渲染关卡结算物资列表
  const lootGrid = document.getElementById('stage-clear-loot-grid');
  if (lootGrid) {
    const pills = [];
    pills.push(`
      <div class="loot-item-pill">
        <img src="assets/icons/icon_coin.png" alt="Scrap">
        <span>废料总计</span>
        <span class="loot-cnt">+${reward.scrap || 0}</span>
      </div>
    `);
    if (reward.gems && reward.gems > 0) {
      pills.push(`
        <div class="loot-item-pill">
          <img src="assets/icons/icon_gem.png" alt="Gem">
          <span>高能晶核</span>
          <span class="loot-cnt">+${reward.gems}</span>
        </div>
      `);
    }
    if (reward.items) {
      Object.entries(reward.items).forEach(([id, count]) => {
        if (count <= 0) return;
        const cfg = GAME_CONFIG.items[id] || { name: '物资', icon: 'assets/icons/icon_chip.png' };
        pills.push(`
          <div class="loot-item-pill">
            <img src="${cfg.icon}" alt="${cfg.name}">
            <span>${cfg.name}</span>
            <span class="loot-cnt">+${count}</span>
          </div>
        `);
      });
    }
    lootGrid.innerHTML = pills.join('');
  }

  const choices = runeSystem.rollRewardChoices(3);
  const box = document.getElementById('stage-rune-choices');
  if (box) {
    box.innerHTML = '';
    choices.forEach(c => {
      const el = document.createElement('div');
      el.className = 'rune-choice-card';
      el.innerHTML = `
        <div class="rune-icon cat-${c.category}">
          <img class="rune-icon-img" src="${c.asset || `assets/runes/rune_${c.id}.png`}" alt="${c.name}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';">
          <span class="rune-icon-fallback" style="display:none;">${c.icon}</span>
        </div>
        <div class="rune-choice-info">
          <div class="rune-choice-name">${c.name}</div>
          <div class="rune-choice-lv">Lv.${c.level} → ${c.nextLevel}</div>
          <div class="rune-choice-desc">${c.desc}</div>
        </div>`;
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
  if (btnForge) {
    btnForge.onclick = async () => {
      modal.style.display = 'none';
      const { homeLobbyUI } = await import('../ui/HomeLobbyUI.js');
      homeLobbyUI.switchTab('runes');
      homeLobbyUI.show();
    };
  }
}

export function showRuneForgeModal(game) {
  import('../ui/HomeLobbyUI.js').then(({ homeLobbyUI }) => {
    homeLobbyUI.switchTab('runes');
    homeLobbyUI.show();
  });
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
    el.innerHTML = `
      <div class="rune-forge-icon cat-${rune.category}">
        <img class="rune-icon-img" src="${rune.asset || `assets/runes/rune_${rune.id}.png`}" alt="${rune.name}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';">
        <span class="rune-icon-fallback" style="display:none;">${rune.icon}</span>
      </div>
      <div class="rune-forge-info">
        <div class="rune-forge-name">${rune.name} <span class="rune-lv">Lv.${lv}/${rune.maxLevel}</span></div>
        <div class="rune-forge-desc">${rune.desc}</div>
      </div>
      <button class="rune-upgrade-btn" ${maxed ? 'disabled' : ''}>${maxed ? 'MAX' : cost + ' 碎片'}</button>`;
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
