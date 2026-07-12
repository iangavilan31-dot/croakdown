// Wave director data — 15 waves, boss-ish wave 15 (ELDER SLUDGE). Composition
// by enemy kind; the spawner spends budget with pacing, wave ends when budget
// is spent AND the pond is clear. Enemy speed never scales (Design Philosophy).

import type { EnemyKind } from './enemies';

export interface WaveSpec {
  budget: number;                       // total spawn credits
  mix: Partial<Record<EnemyKind, number>>;  // weights
  pace: number;                         // min ticks between telegraphs
  cap: number;                          // max alive at once
  boss?: EnemyKind;                     // spawned once at wave start
}

// costs roughly mirror threat (spent from budget per spawn)
export const SPAWN_COST: Record<EnemyKind, number> = {
  blobbit: 1, spikeblob: 2, gloopa: 4, midge: 2, spitshroom: 3, broodmaw: 5, elder: 40,
};

export const WAVES: WaveSpec[] = [
  { budget: 14, mix: { blobbit: 1 }, pace: 26, cap: 10 },                                        // 1 — learn to swing
  { budget: 20, mix: { blobbit: 5, midge: 1 }, pace: 22, cap: 14 },                              // 2 — first orbiters
  { budget: 26, mix: { blobbit: 4, midge: 2 }, pace: 18, cap: 18 },                              // 3
  { budget: 34, mix: { blobbit: 4, midge: 2, spitshroom: 1 }, pace: 16, cap: 20 },               // 4 — spit arrives
  { budget: 44, mix: { blobbit: 4, midge: 2, spitshroom: 1, gloopa: 1 }, pace: 15, cap: 22 },    // 5 — first tank
  { budget: 52, mix: { blobbit: 4, midge: 3, spitshroom: 2, gloopa: 1 }, pace: 13, cap: 26 },    // 6
  { budget: 62, mix: { blobbit: 4, midge: 3, spitshroom: 2, gloopa: 1, spikeblob: 2 }, pace: 12, cap: 30 },  // 7 — spikes
  { budget: 74, mix: { blobbit: 3, midge: 3, spitshroom: 2, gloopa: 2, spikeblob: 2, broodmaw: 1 }, pace: 12, cap: 34 }, // 8 — broodmaw
  { budget: 86, mix: { blobbit: 3, midge: 3, spitshroom: 3, gloopa: 2, spikeblob: 2, broodmaw: 1 }, pace: 11, cap: 38 },
  { budget: 100, mix: { blobbit: 3, midge: 3, spitshroom: 3, gloopa: 3, spikeblob: 2, broodmaw: 2 }, pace: 10, cap: 42 }, // 10 — midpoint wall
  { budget: 112, mix: { blobbit: 3, midge: 4, spitshroom: 3, gloopa: 3, spikeblob: 3, broodmaw: 2 }, pace: 10, cap: 46 },
  { budget: 126, mix: { blobbit: 2, midge: 4, spitshroom: 3, gloopa: 3, spikeblob: 3, broodmaw: 2 }, pace: 9, cap: 50 },
  { budget: 140, mix: { blobbit: 2, midge: 4, spitshroom: 4, gloopa: 4, spikeblob: 3, broodmaw: 2 }, pace: 9, cap: 54 },
  { budget: 156, mix: { blobbit: 2, midge: 4, spitshroom: 4, gloopa: 4, spikeblob: 4, broodmaw: 3 }, pace: 8, cap: 58 },
  { budget: 60, mix: { blobbit: 2, midge: 1 }, pace: 20, cap: 24, boss: 'elder' },               // 15 — ELDER SLUDGE + trickle
];

export const INTERMISSION_COINS_BASE = 8;   // pity coins per wave clear
export const WAVE_CLEAR_HEAL = 15;
