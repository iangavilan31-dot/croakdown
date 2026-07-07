// CROAKDOWN — pure simulation math. No canvas, no DOM: everything here is headless-testable.
// Formulas locked in BRIEF.md §7.2/§7.4 (research-verified numbers).

// ---------- deterministic RNG (mulberry32) ----------
export function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- wave pacing (Brotato-derived, BRIEF §7.2) ----------
export const WAVE_COUNT = 20;

/** Spawn-budget duration in seconds for wave n (1-based): 25 + 5/wave, cap 70, finale 100. */
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

/** Shop item price (Brotato formula): (base + wave + base*0.1*wave). */
export function itemPrice(base: number, wave: number): number {
  return Math.round(base + wave + base * 0.1 * wave);
}

/** Highest shop tier available at a given shop index (after wave W): 2/4/8 gates. */
export function maxTier(wave: number): 1 | 2 | 3 | 4 {
  if (wave >= 8) return 4;
  if (wave >= 4) return 3;
  if (wave >= 2) return 2;
  return 1;
}

/** Tier weights at a wave (loosely Brotato-shaped), normalized by caller. */
export function tierWeights(wave: number): [number, number, number, number] {
  const t2 = wave >= 2 ? Math.min(40, 8 + wave * 3) : 0;
  const t3 = wave >= 4 ? Math.min(25, wave * 1.8 - 4) : 0;
  const t4 = wave >= 8 ? Math.min(12, (wave - 7) * 1.4) : 0;
  return [Math.max(20, 100 - t2 - t3 - t4), t2, t3, t4];
}

// ---------- enemy scaling (linear per wave; speed NEVER scales) ----------
export function scaleHp(base: number, perWave: number, wave: number, danger: number, players: number, downed = 0): number {
  const dangerMul = [1, 1.12, 1.26, 1.4][Math.min(3, danger)] ?? 1;
  // 2P is the baseline; solo (or one frog down) gets ~-27% (Robot Entertainment law).
  const alive = Math.max(1, players - downed);
  const coopMul = alive >= 2 ? 1 : 0.73;
  return Math.round((base + perWave * (wave - 1)) * dangerMul * coopMul);
}

export function scaleCount(base: number, perWave: number, wave: number, danger: number, players: number): number {
  const dangerAdd = danger >= 2 ? 1.15 : 1;
  const coopMul = players >= 2 ? 1 : 0.75;
  return Math.max(1, Math.round((base + perWave * (wave - 1)) * dangerAdd * coopMul));
}

// ---------- XP / level curve (VS-shaped piecewise-linear, scaled down) ----------
export function xpForLevel(level: number): number {
  // essence needed to go from `level` to `level+1`
  if (level < 2) return 8;
  if (level < 10) return 8 + level * 4;
  if (level < 20) return 8 + level * 6;
  return 8 + level * 8;
}

// ---------- juice numbers (BRIEF §7.4, Smash-derived) ----------
/** Hitstop frames for a hit of `dmg` damage. Normal hits 3-4f, heavies 8-12f, kill bonus. */
export function hitstopFrames(dmg: number, isKill: boolean): number {
  const f = Math.floor(dmg * 0.35 + 2.5);
  const capped = Math.min(isKill ? 12 : 6, f);
  return isKill ? Math.max(6, capped) : Math.max(2, capped);
}

// ---------- spatial hash ----------
export class SpatialHash<T extends { x: number; y: number }> {
  private cells = new Map<number, T[]>();
  constructor(private cellSize: number) {}
  private key(cx: number, cy: number) { return cy * 8192 + cx; }
  clear() { this.cells.clear(); }
  insert(e: T) {
    const cx = Math.floor(e.x / this.cellSize), cy = Math.floor(e.y / this.cellSize);
    const k = this.key(cx, cy);
    let arr = this.cells.get(k);
    if (!arr) { arr = []; this.cells.set(k, arr); }
    arr.push(e);
  }
  /** Visit entities in cells overlapping the circle; may include extras — caller distance-checks. */
  query(x: number, y: number, r: number, out: T[]): T[] {
    out.length = 0;
    const x0 = Math.floor((x - r) / this.cellSize), x1 = Math.floor((x + r) / this.cellSize);
    const y0 = Math.floor((y - r) / this.cellSize), y1 = Math.floor((y + r) / this.cellSize);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const arr = this.cells.get(this.key(cx, cy));
      if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
    }
    return out;
  }
}

// ---------- object pool ----------
export class Pool<T> {
  private free: T[] = [];
  constructor(private factory: () => T, prealloc = 0) {
    for (let i = 0; i < prealloc; i++) this.free.push(factory());
  }
  get(): T { return this.free.pop() ?? this.factory(); }
  put(o: T) { this.free.push(o); }
}

// ---------- co-op run-state (pure, testable) ----------
export type FrogState = 'alive' | 'downed' | 'dead';
export interface RunFrog { state: FrogState; hp: number; maxHp: number; reviveProgress: number; }

export const REVIVE_SECONDS = 2.5;
export const WAVE_RETURN_HP_FRAC = 0.5;

/** Wave-end safety net: downed/dead frogs come back at 50% HP if anyone survived. */
export function applyWaveEndRespawn(frogs: RunFrog[]): void {
  if (!frogs.some(f => f.state === 'alive')) return;
  for (const f of frogs) {
    if (f.state !== 'alive') {
      f.state = 'alive';
      f.hp = Math.max(1, Math.round(f.maxHp * WAVE_RETURN_HP_FRAC));
      f.reviveProgress = 0;
    }
  }
}

export function isRunLost(frogs: RunFrog[], heartbloomHp: number): boolean {
  return heartbloomHp <= 0 || frogs.every(f => f.state !== 'alive');
}

// ---------- live-enemy cap (Brotato trick: invisible overflow despawn) ----------
export const ENEMY_CAP = 120;
