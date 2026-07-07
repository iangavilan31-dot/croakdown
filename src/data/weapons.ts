// Weapon frame data — numbers from design/4 Weapons/Sword Line.md (tier 1 "stick")
// and design/4 Weapons/Giant Tongue.md. All frames @60fps. Damage class drives hitstop.

export type DamageClass = 'light' | 'medium' | 'heavy';

export interface AttackData {
  id: string;
  windup: number;        // frames
  active: number;
  follow: number;
  recovery: number;
  cancelFrom: number;    // first recovery frame accepting dash/chain cancel
  damage: number;
  impulse: number;       // px/s applied as impulse/mass
  arc: number;           // radians, full width
  reach: number;         // px from frog center
  cls: DamageClass;
  superArmor?: boolean;
}

const deg = (d: number) => (d * Math.PI) / 180;

// Sword ladder tier 1 — THE STICK. Chain: L1 -> L2 -> finisher.
export const STICK_CHAIN: AttackData[] = [
  { id: 'stick_l1', windup: 6, active: 5, follow: 4, recovery: 10, cancelFrom: 4, damage: 10, impulse: 420, arc: deg(120), reach: 150, cls: 'light' },
  { id: 'stick_l2', windup: 5, active: 5, follow: 4, recovery: 10, cancelFrom: 4, damage: 10, impulse: 420, arc: deg(120), reach: 150, cls: 'light' },
  { id: 'stick_fin', windup: 10, active: 6, follow: 6, recovery: 16, cancelFrom: 8, damage: 22, impulse: 900, arc: deg(150), reach: 165, cls: 'medium' },
];
export const STICK_HEAVY: AttackData = {
  id: 'stick_heavy', windup: 18, active: 6, follow: 8, recovery: 18, cancelFrom: 10, damage: 34, impulse: 1200, arc: deg(200), reach: 180, cls: 'heavy', superArmor: true,
};

export const CHAIN_WINDOW_TICKS = 36;  // 0.6 s after recovery starts

// Giant Tongue tier 1 (universal secondary)
export const TONGUE = {
  reach: 320,
  outTime: 0.11,        // out + back = 0.22 s
  backTime: 0.11,
  cooldown: 2.5,
  pullMassMax: 2.5,     // <= pulled to frog; > pulls frog (no such enemy in the pond)
  stun: 0.3,
  pullToRange: 110,     // enemy lands this far from frog — inside stick reach
};
