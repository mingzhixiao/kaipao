// ---------------- 本地化字典与语言系统 (I18n) ----------------
// 遵循 game-ui-ux 技能原则：文本外部化，不硬编码，容器自适应内容宽度

const DICTIONARY = {
  'zh-CN': {
    'sys_controls': '系统控制',
    'battle_speed': '战斗倍速',
    'sound_settings': '音效设置',
    'sound_on': '🔊 开启',
    'sound_off': '🔇 静音',
    'battle_pause': '战斗暂停',
    'pause': '⏸️ 暂停',
    'resume': '▶️ 继续',
    'font_size': '界面文字',
    'font_size_std': '标准',
    'font_size_large': '大号',
    'font_size_xl': '超大',
    'upgrade_title': '战略强化选择',
    'upgrade_subtitle': 'TACTICAL UPGRADE',
    'reroll': '🎲 战术重抽',
    'reroll_left': '剩余 {n} 次',
    'defend_fail': '防线失守',
    'wave_survived': '抵御波次',
    'kill_count': '击灭敌人',
    'survival_time': '坚守时长',
    'return_base': '返回指挥基地',
    'enter_battle': '立即出战',
    'stage_prefix': '第 {n} 波',
    'hp_label': '生命',
    'shd_label': '护盾'
  },
  'en-US': {
    'sys_controls': 'System Settings',
    'battle_speed': 'Battle Speed',
    'sound_settings': 'Audio Sound',
    'sound_on': '🔊 ON',
    'sound_off': '🔇 MUTE',
    'battle_pause': 'Pause Combat',
    'pause': '⏸️ PAUSE',
    'resume': '▶️ RESUME',
    'font_size': 'UI Font Size',
    'font_size_std': 'Standard',
    'font_size_large': 'Large',
    'font_size_xl': 'X-Large',
    'upgrade_title': 'Tactical Upgrade',
    'upgrade_subtitle': 'TACTICAL UPGRADE',
    'reroll': '🎲 Reroll',
    'reroll_left': '{n} left',
    'defend_fail': 'Defenses Breached',
    'wave_survived': 'Waves Survived',
    'kill_count': 'Hostiles Slain',
    'survival_time': 'Time Survived',
    'return_base': 'Return to Base',
    'enter_battle': 'Deploy Combat',
    'stage_prefix': 'Wave {n}',
    'hp_label': 'HP',
    'shd_label': 'SHD'
  }
};

let currentLang = 'zh-CN';

export function setLanguage(lang) {
  if (DICTIONARY[lang]) currentLang = lang;
}

export function getLanguage() {
  return currentLang;
}

export function tr(key, params = null) {
  const dict = DICTIONARY[currentLang] || DICTIONARY['zh-CN'];
  let text = dict[key] || key;
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(k => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
    });
  }
  return text;
}
