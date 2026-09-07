// ---------------- Build 流派识别与局内遥测 ----------------
// 不改变现有技能数值，只把已有技能/宠物/协同组合转化为可读的流派标签。
export class BuildIdentitySystem {
  constructor(game) {
    this.game = game;
    this.profile = {
      primary: '均衡火力',
      tags: [],
      score: 0,
      kills: 0,
      damage: 0,
      survivalTime: 0
    };
    this._lastSignature = '';
  }

  update() {
    const game = this.game;
    const activeSkills = Object.entries(game.feature?.skills || {})
      .filter(([, skill]) => (skill?.level || 0) > 0)
      .map(([id]) => id);
    const activeSynergies = Object.entries(game.synergies || {})
      .filter(([, enabled]) => enabled)
      .map(([id]) => id);

    const fire = activeSkills.filter(id => id === 'rocket' || id === 'bomber' || id === 'dragon').length;
    const ice = activeSkills.includes('freeze') || activeSynergies.includes('cryoShatter') ? 1 : 0;
    const thunder = activeSkills.includes('laser') || activeSynergies.includes('teslaCoil') ? 1 : 0;
    const wind = activeSkills.includes('tornado') ? 1 : 0;
    const physical = activeSkills.includes('truck') || activeSkills.includes('boomerang') ? 1 : 0;

    const tags = [];
    if (fire) tags.push('🔥 灼烧');
    if (ice) tags.push('❄️ 控场');
    if (thunder) tags.push('⚡ 感电');
    if (wind) tags.push('🌪️ 扩散');
    if (physical) tags.push('🛡️ 碾压');
    if (activeSynergies.length >= 2) tags.push('🔗 协同构筑');

    const scores = {
      '火焰爆破': fire * 3 + (activeSynergies.includes('thermalEngine') ? 4 : 0),
      '雷火超载': thunder * 3 + (activeSynergies.includes('fortressEmp') ? 1 : 0) + (activeSynergies.includes('teslaCoil') ? 3 : 0),
      '冰火反应': ice * 3 + fire * 2 + (activeSynergies.includes('cryoShatter') ? 3 : 0),
      '元素扩散': wind * 4 + (fire + ice) * 2,
      '重装碾压': physical * 4 + (activeSynergies.includes('truckInferno') ? 3 : 0),
      '均衡火力': 1
    };

    let primary = '均衡火力';
    let score = 0;
    for (const [name, value] of Object.entries(scores)) {
      if (value > score) {
        score = value;
        primary = name;
      }
    }

    const signature = `${primary}|${tags.join(',')}`;
    if (signature !== this._lastSignature) {
      this._lastSignature = signature;
      this.profile.primary = primary;
      this.profile.tags = tags;
      this.profile.score = score;
      game.buildProfile = this.profile;
    }

    this.profile.kills = game.kills || 0;
    this.profile.damage = Math.round(game.totalDamage || 0);
    this.profile.survivalTime = Number((game.survivalTime || 0).toFixed(1));
  }
}

export function installBuildIdentity(game) {
  if (!game || game.buildIdentity) return;
  game.buildIdentity = new BuildIdentitySystem(game);
  game.buildProfile = game.buildIdentity.profile;
  const timer = window.setInterval(() => {
    if (!game.isGameOver) game.buildIdentity.update();
  }, 500);
  game.__buildIdentityTimer = timer;
}
