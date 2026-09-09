// ---------------- 怪物物理抗性与玩家破甲结算 ----------------

const PHYSICAL_DAMAGE_TYPES = new Set(['normal', 'physical', 'truck', 'boomerang', 'thorns', 'pet']);
const ENEMY_RESISTANCE_MODIFIERS = { runner: 0.72, charger: 1.0, behemoth: 1.25 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function isPhysicalDamageType(type) {
  return PHYSICAL_DAMAGE_TYPES.has(type || 'normal');
}

export function getEnemyPhysicalResistance(stageResistance, enemyType, isBoss = false, modeBonus = 0) {
  const typeModifier = isBoss ? 1.2 : (ENEMY_RESISTANCE_MODIFIERS[enemyType] || 1.0);
  return clamp(clamp(stageResistance, 0, 0.5) * typeModifier + clamp(modeBonus, 0, 0.2), 0, 0.6);
}

/**
 * 物抗采用减法破甲：30% 物抗遇到 12% 破甲后按 18% 结算，元素伤害完全绕过该机制。
 */
export function calculateDamageAfterResistance(rawDamage, type, physicalResistance = 0, armorPenetration = 0) {
  const normalizedDamage = Math.max(0, Number(rawDamage) || 0);
  if (!isPhysicalDamageType(type) || normalizedDamage <= 0) return { damage: normalizedDamage, effectiveResistance: 0, mitigated: 0 };
  const effectiveResistance = clamp(clamp(physicalResistance, 0, 0.6) - clamp(armorPenetration, 0, 0.45), 0, 0.6);
  const damage = Math.max(1, Math.round(normalizedDamage * (1 - effectiveResistance)));
  return { damage, effectiveResistance, mitigated: Math.max(0, Math.round(normalizedDamage - damage)) };
}

export { PHYSICAL_DAMAGE_TYPES };
