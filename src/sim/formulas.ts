// Run-structure formulas (Phase 2 consumers: Waves and Pacing / Shop and Economy pages).
// Kept headless-tested now so the numbers never drift from the bible.

export const WAVE_COUNT = 20;

/** Spawn-budget duration seconds for wave n: 25 + 5/wave, cap 70, finale 100. */
export function waveDuration(wave: number): number {
  if (wave >= WAVE_COUNT) return 100;
  return Math.min(70, 25 + (wave - 1) * 5);
}

/** Reroll cost: first = floor(W*0.75) (min 1), each further +floor(0.4*W) (min 1). */
export function rerollCost(wave: number, rerollsThisShop: number): number {
  const first = Math.max(1, Math.floor(wave * 0.75));
  const inc = Math.max(1, Math.floor(0.4 * wave));
  return first + inc * rerollsThisShop;
}

/** Essence drop probability multiplier: decays 1.5%/wave from wave 2, floor 0.5. */
export function dropRate(wave: number): number {
  return Math.max(0.5, 1 - (wave - 1) * 0.015);
}

/** Shop item price (Brotato formula). */
export function itemPrice(base: number, wave: number): number {
  return Math.round(base + wave + base * 0.1 * wave);
}

/** Highest shop tier at a wave: 2/4/8 gates. */
export function maxTier(wave: number): 1 | 2 | 3 | 4 {
  if (wave >= 8) return 4;
  if (wave >= 4) return 3;
  if (wave >= 2) return 2;
  return 1;
}

/** Enemy HP scaling: linear per wave, danger pips, 2P baseline, solo -27%. Speed NEVER scales. */
export function scaleHp(base: number, perWave: number, wave: number, danger: number, players: number, downed = 0): number {
  const dangerMul = [1, 1.12, 1.26, 1.4][Math.min(3, danger)] ?? 1;
  const alive = Math.max(1, players - downed);
  const coopMul = alive >= 2 ? 1 : 0.73;
  return Math.round((base + perWave * (wave - 1)) * dangerMul * coopMul);
}

/** XP curve (essence doubles as XP — single-currency law). */
export function xpForLevel(level: number): number {
  if (level < 2) return 8;
  if (level < 10) return 8 + level * 4;
  if (level < 20) return 8 + level * 6;
  return 8 + level * 8;
}
