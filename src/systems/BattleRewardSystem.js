const STAR_REWARD_TIERS = {
  1: { label: '险守成功', scrapMultiplier: 0.65, chipMultiplier: 0.5, shardDraws: 1, shardCount: 1, gems: 0, crates: 0 },
  2: { label: '防线受损', scrapMultiplier: 0.8, chipMultiplier: 0.75, shardDraws: 1, shardCount: 2, gems: 0, crates: 0 },
  3: { label: '稳住阵线', scrapMultiplier: 1.0, chipMultiplier: 1.0, shardDraws: 2, shardCount: 2, gems: 1, crates: 0 },
  4: { label: '坚固防守', scrapMultiplier: 1.25, chipMultiplier: 1.25, shardDraws: 3, shardCount: 2, gems: 3, crates: 1 },
  5: { label: '完美守卫', scrapMultiplier: 1.55, chipMultiplier: 1.5, shardDraws: 4, shardCount: 3, gems: 5, crates: 2 }
};

const CLEAR_SHARDS = ['power_shard', 'bulletspeed_shard', 'attackspeed_shard', 'mag_shard'];

export function getFortressStarRating(hp, maxHp) {
  if (!Number.isFinite(maxHp) || maxHp <= 0) return 1;
  const ratio = Math.max(0, Math.min(1, Number(hp) / maxHp));
  if (ratio >= 0.9) return 5;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.55) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
}

export function getStarRewardTier(stars) {
  return STAR_REWARD_TIERS[Math.max(1, Math.min(5, Math.round(stars || 1)))];
}

export function buildStageClearReward({ stars, stageConfig = {}, mode = 'normal', modeConfig = {}, wave = 1 }, random = Math.random) {
  const normalizedStars = Math.max(1, Math.min(5, Math.round(stars || 1)));
  const tier = getStarRewardTier(normalizedStars);
  const scrapModeMultiplier = modeConfig.scrapMult || 1;
  const shardModeMultiplier = modeConfig.shardMult || 1;
  const baseScrap = (stageConfig.scrapReward || 60) + Math.max(1, wave) * 5;
  const items = {};

  // 星级只控制通关奖励，击杀掉落仍保留在 battleLoot 中，主动撤离时因此可以单独剥离非金币物资。
  const featuredChip = stageConfig.featuredChip;
  if (featuredChip) {
    const minChip = stageConfig.chipDropCount?.[0] || 2;
    const maxChip = stageConfig.chipDropCount?.[1] || 4;
    const rolledChipCount = minChip + Math.floor(random() * (maxChip - minChip + 1));
    items[featuredChip] = Math.max(1, Math.round(rolledChipCount * tier.chipMultiplier * shardModeMultiplier));
  }

  for (let i = 0; i < tier.shardDraws; i++) {
    const shardId = CLEAR_SHARDS[Math.min(CLEAR_SHARDS.length - 1, Math.floor(random() * CLEAR_SHARDS.length))];
    const count = Math.max(1, Math.round(tier.shardCount * shardModeMultiplier));
    items[shardId] = (items[shardId] || 0) + count;
  }

  if (tier.crates > 0) items.supply_crate = tier.crates;
  if (mode === 'elite') {
    const chapter = stageConfig.chapter || 1;
    const bossBonus = stageConfig.isChapterBoss || stageConfig.isMiniBoss ? 2 : 0;
    items.rare_weapon_shard = Math.max(1, Math.round(normalizedStars * 0.6 + chapter * 0.7 + bossBonus));
  }

  return {
    stars: normalizedStars,
    ratingLabel: tier.label,
    scrap: Math.max(0, Math.round(baseScrap * scrapModeMultiplier * tier.scrapMultiplier)),
    gems: tier.gems * (mode === 'elite' ? 2 : 1),
    items
  };
}

export function buildRetreatLoot(loot = {}) {
  return { scrap: Math.max(0, Math.round(loot.scrap || 0)), gems: 0, items: {} };
}

export { STAR_REWARD_TIERS };
