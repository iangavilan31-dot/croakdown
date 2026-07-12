// Enemy data — the Sludge trio for the Phase 1 pond.
// Numbers from design/5 Enemies/Sludge Family.md. Speed as fraction of FROG_SPEED;
// enemy speed NEVER scales with time (Design Philosophy law).

export type EnemyKind = 'blobbit' | 'gloopa' | 'spikeblob' | 'midge' | 'spitshroom' | 'broodmaw' | 'elder';

// The five brief behaviors: rusher / orbiter / tank / spitter / swarm-spawner
// (+ spikeblob as reflect-elite spice, + elder as the wave-15 boss).
export type EnemyBehavior = 'rusher' | 'orbiter' | 'tank' | 'spitter' | 'spawner' | 'boss';

export interface EnemyData {
  kind: EnemyKind;
  behavior: EnemyBehavior;
  hp: number;
  speedFrac: number;      // x FROG_SPEED
  mass: number;           // Combat System mass class
  radius: number;         // body radius px (Sprite and Scale: fodder 64px tall -> r~30)
  poiseLightImmune: boolean; // ignores flinch from light hits (Gloopa)
  essence: number;
  // attack
  atkRange: number;       // start attack when frog within this
  atkWindup: number;      // frames (warm flash + coil)
  atkActive: number;
  atkRecovery: number;    // punish window frames
  atkDamage: number;
  atkRadius: number;      // hit circle around strike point
}

export const ENEMIES: Record<EnemyKind, EnemyData> = {
  blobbit: {
    kind: 'blobbit', behavior: 'rusher', hp: 20, speedFrac: 0.6, mass: 1.0, radius: 28,
    poiseLightImmune: false, essence: 1,
    atkRange: 52, atkWindup: 24, atkActive: 6, atkRecovery: 30, atkDamage: 4, atkRadius: 46,
  },
  gloopa: {
    kind: 'gloopa', behavior: 'tank', hp: 90, speedFrac: 0.35, mass: 2.5, radius: 46,
    poiseLightImmune: true, essence: 4,
    atkRange: 95, atkWindup: 30, atkActive: 8, atkRecovery: 40, atkDamage: 8, atkRadius: 78, // belly-flop ring; 40f grounded
  },
  spikeblob: {
    kind: 'spikeblob', behavior: 'rusher', hp: 45, speedFrac: 0.5, mass: 1.5, radius: 32,
    poiseLightImmune: false, essence: 3,
    atkRange: 54, atkWindup: 22, atkActive: 6, atkRecovery: 28, atkDamage: 5, atkRadius: 48,
  },
  midge: {
    kind: 'midge', behavior: 'orbiter', hp: 26, speedFrac: 0.78, mass: 0.8, radius: 24,
    poiseLightImmune: false, essence: 2,
    // "attack" = the dart: windup coil, then a 700px/s lunge through the frog
    atkRange: 300, atkWindup: 22, atkActive: 18, atkRecovery: 34, atkDamage: 6, atkRadius: 40,
  },
  spitshroom: {
    kind: 'spitshroom', behavior: 'spitter', hp: 40, speedFrac: 0.28, mass: 1.6, radius: 30,
    poiseLightImmune: false, essence: 3,
    // "attack" = the lob: telegraphed glob, splash on landing
    atkRange: 560, atkWindup: 32, atkActive: 4, atkRecovery: 44, atkDamage: 9, atkRadius: 74,
  },
  broodmaw: {
    kind: 'broodmaw', behavior: 'spawner', hp: 130, speedFrac: 0.22, mass: 3.0, radius: 44,
    poiseLightImmune: true, essence: 6,
    // "attack" = the birthing: pops out blobbits, defenseless while recovering
    atkRange: 700, atkWindup: 44, atkActive: 6, atkRecovery: 60, atkDamage: 0, atkRadius: 0,
  },
  elder: {
    kind: 'elder', behavior: 'boss', hp: 2200, speedFrac: 0.3, mass: 6.0, radius: 80,
    poiseLightImmune: true, essence: 40,
    atkRange: 150, atkWindup: 38, atkActive: 10, atkRecovery: 50, atkDamage: 14, atkRadius: 150,
  },
};

// orbiter / spitter / spawner behavior knobs
export const MIDGE_ORBIT_R = 250;
export const MIDGE_DART_SPEED = 700;
export const MIDGE_DART_CD = 3.4;         // seconds between darts
export const SPIT_GLOB_SPEED = 430;
export const SPIT_CD = 3.4;
export const SPIT_KEEP_MIN = 330;         // shuffles to stay in this band
export const SPIT_KEEP_MAX = 540;
export const BROOD_CD = 6.0;
export const BROOD_COUNT = 3;
export const BROOD_MAX_CHILDREN = 8;
// elder (the wave-15 legend): rotates flop -> spit volley -> summon
export const ELDER_FLOP_RING = 210;
export const ELDER_SPIT_COUNT = 3;
export const ELDER_SUMMON = 4;

// Spikeblob cycle (design: OUT 1.2s reflect / IN 1.8s vulnerable)
export const SPIKE_OUT_TIME = 1.2;
export const SPIKE_IN_TIME = 1.8;
export const SPIKE_REFLECT_DMG = 5;
export const SPIKE_OUT_DMG_MULT = 0.25;

// Overkill: damage >= 2x remaining HP -> gib burst
export const OVERKILL_MULT = 2;
