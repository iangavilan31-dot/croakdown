// Enemy data — the Sludge trio for the Phase 1 pond.
// Numbers from design/5 Enemies/Sludge Family.md. Speed as fraction of FROG_SPEED;
// enemy speed NEVER scales with time (Design Philosophy law).

export type EnemyKind = 'blobbit' | 'gloopa' | 'spikeblob';

export interface EnemyData {
  kind: EnemyKind;
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
    kind: 'blobbit', hp: 20, speedFrac: 0.6, mass: 1.0, radius: 28,
    poiseLightImmune: false, essence: 1,
    atkRange: 52, atkWindup: 24, atkActive: 6, atkRecovery: 30, atkDamage: 4, atkRadius: 46,
  },
  gloopa: {
    kind: 'gloopa', hp: 90, speedFrac: 0.35, mass: 2.5, radius: 46,
    poiseLightImmune: true, essence: 4,
    atkRange: 95, atkWindup: 30, atkActive: 8, atkRecovery: 40, atkDamage: 8, atkRadius: 78, // belly-flop ring; 40f grounded
  },
  spikeblob: {
    kind: 'spikeblob', hp: 45, speedFrac: 0.5, mass: 1.5, radius: 32,
    poiseLightImmune: false, essence: 3,
    atkRange: 54, atkWindup: 22, atkActive: 6, atkRecovery: 28, atkDamage: 5, atkRadius: 48,
  },
};

// Spikeblob cycle (design: OUT 1.2s reflect / IN 1.8s vulnerable)
export const SPIKE_OUT_TIME = 1.2;
export const SPIKE_IN_TIME = 1.8;
export const SPIKE_REFLECT_DMG = 5;
export const SPIKE_OUT_DMG_MULT = 0.25;

// Overkill: damage >= 2x remaining HP -> gib burst
export const OVERKILL_MULT = 2;
