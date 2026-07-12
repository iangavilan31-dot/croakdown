// Character KITS — each frog is a toolkit (swing + dash flavor + signature +
// passive) expressing ONE identity, and the pieces combo with each other.
// Tonight's brief law: kits, not weapons; identity is a mechanic, not a stat sheet.

import { type AttackData } from './weapons';

const deg = (d: number) => (d * Math.PI) / 180;

export type KitId = 'warden' | 'snapper' | 'morel';

export interface KitData {
  id: KitId;
  title: string;           // one-line identity
  // swing chain + heavy (frame data @60)
  chain: AttackData[];
  heavy: AttackData;
  // dash flavor
  dashKind: 'bull' | 'zip' | 'sporetrail';
  // signature (K / R1) — implemented per-kit in sim/kits.ts
  sigKind: 'slam' | 'grab' | 'decoy';
  sigCooldown: number;     // seconds
  // passive knob (read where relevant)
  passive: 'wallbreaker' | 'sticky' | 'nightstalker';
  // motion personality (rig params)
  motion: { hopFreq: number; hopHeight: number; leanGain: number; idleSlump: number };
  hp: number;
  speed: number;
}

// WARDEN — the machete is a door. Slow, huge, launches everything.
const WARDEN_CHAIN: AttackData[] = [
  { id: 'war_l1', windup: 6, active: 5, follow: 4, recovery: 10, cancelFrom: 4, damage: 12, impulse: 460, arc: deg(120), reach: 155, cls: 'light' },
  { id: 'war_l2', windup: 5, active: 5, follow: 4, recovery: 10, cancelFrom: 4, damage: 12, impulse: 460, arc: deg(120), reach: 155, cls: 'light' },
  { id: 'war_fin', windup: 10, active: 6, follow: 6, recovery: 16, cancelFrom: 8, damage: 26, impulse: 950, arc: deg(150), reach: 170, cls: 'medium' },
];
const WARDEN_HEAVY: AttackData = { id: 'war_heavy', windup: 18, active: 6, follow: 8, recovery: 18, cancelFrom: 10, damage: 38, impulse: 1300, arc: deg(200), reach: 185, cls: 'heavy', superArmor: true };

// SNAPPER — everything is in reach. Fast paddle, the tongue is the weapon.
const SNAPPER_CHAIN: AttackData[] = [
  { id: 'snp_l1', windup: 4, active: 4, follow: 3, recovery: 8, cancelFrom: 3, damage: 7, impulse: 300, arc: deg(100), reach: 130, cls: 'light' },
  { id: 'snp_l2', windup: 4, active: 4, follow: 3, recovery: 8, cancelFrom: 3, damage: 7, impulse: 300, arc: deg(100), reach: 130, cls: 'light' },
  { id: 'snp_fin', windup: 8, active: 5, follow: 5, recovery: 12, cancelFrom: 6, damage: 16, impulse: 700, arc: deg(130), reach: 145, cls: 'medium' },
];
const SNAPPER_HEAVY: AttackData = { id: 'snp_heavy', windup: 14, active: 5, follow: 7, recovery: 15, cancelFrom: 8, damage: 26, impulse: 900, arc: deg(160), reach: 160, cls: 'heavy' };

// MOREL — you never hit what you're looking at. Cane, poison, betrayal.
const MOREL_CHAIN: AttackData[] = [
  { id: 'mor_l1', windup: 5, active: 5, follow: 4, recovery: 9, cancelFrom: 4, damage: 9, impulse: 360, arc: deg(110), reach: 145, cls: 'light' },
  { id: 'mor_l2', windup: 5, active: 5, follow: 4, recovery: 9, cancelFrom: 4, damage: 9, impulse: 360, arc: deg(110), reach: 145, cls: 'light' },
  { id: 'mor_fin', windup: 9, active: 6, follow: 5, recovery: 14, cancelFrom: 7, damage: 20, impulse: 800, arc: deg(140), reach: 160, cls: 'medium' },
];
const MOREL_HEAVY: AttackData = { id: 'mor_heavy', windup: 16, active: 6, follow: 8, recovery: 16, cancelFrom: 9, damage: 30, impulse: 1050, arc: deg(180), reach: 170, cls: 'heavy' };

export const KITS: Record<KitId, KitData> = {
  warden: {
    id: 'warden', title: 'THE MACHETE IS A DOOR',
    chain: WARDEN_CHAIN, heavy: WARDEN_HEAVY,
    dashKind: 'bull', sigKind: 'slam', sigCooldown: 6, passive: 'wallbreaker',
    motion: { hopFreq: 4.6, hopHeight: 30, leanGain: 1.0, idleSlump: 1.2 },
    hp: 120, speed: 310,
  },
  snapper: {
    id: 'snapper', title: 'EVERYTHING IS IN REACH',
    chain: SNAPPER_CHAIN, heavy: SNAPPER_HEAVY,
    dashKind: 'zip', sigKind: 'grab', sigCooldown: 1.0, passive: 'sticky',
    motion: { hopFreq: 6.4, hopHeight: 22, leanGain: 1.3, idleSlump: 0.6 },
    hp: 90, speed: 360,
  },
  morel: {
    id: 'morel', title: 'NEVER WHERE YOU LOOK',
    chain: MOREL_CHAIN, heavy: MOREL_HEAVY,
    dashKind: 'sporetrail', sigKind: 'decoy', sigCooldown: 8, passive: 'nightstalker',
    motion: { hopFreq: 5.6, hopHeight: 24, leanGain: 1.1, idleSlump: 0.9 },
    hp: 100, speed: 335,
  },
};

// Kit combo laws (implemented in sim):
// - dash-cancel keeps a heavy charge (all kits): release after the dash still heavies.
// - snapper: grabbed enemy + attackEdge = YEET (enemy becomes a tumble projectile).
// - snapper: K aimed at partner = partner yank (i-frames); partner holding attack = slingshot.
// - morel: backstab (behind victim facing) x1.8 damage; poison slows 30%.
// - warden: bull dash shoves (no damage, 300 impulse); wall-splats +50% dmg, +1 coin on wall kill.
export const BACKSTAB_MULT = 1.8;
export const POISON_DPS = 6;
export const POISON_SLOW = 0.7;
export const POISON_TRAIL_LIFE = 3.0;
export const DECOY_LIFE = 1.2;
export const DECOY_BURST_DMG = 30;
export const DECOY_BURST_R = 150;
export const SLAM_DMG = 30;
export const SLAM_R = 190;
export const SLAM_IMPULSE = 900;
export const YEET_SPEED = 1150;
export const YEET_DMG = 18;
export const SPIKE_BONUS_COINS = 3;    // volley-spike loot bonus (S1)
