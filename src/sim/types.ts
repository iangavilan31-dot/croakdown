// Sim state types. The sim is DOM-free and deterministic: seeded RNG + inputs only.
// Per-entity hitstop (freeze) — the world never freezes, entities do (Game Feel Standards).

import type { AttackData } from '../data/weapons';
import type { EnemyKind } from '../data/enemies';
import type { ItemId } from '../data/items';
import type { KitId } from '../data/kits';
import type { Rng } from '../engine/rng';
import type { SpatialHash } from '../engine/spatial';

export interface SimInput {
  mx: number; my: number;
  aimX: number; aimY: number;     // world-space point
  attackEdge: boolean; attackHeld: boolean;
  tongueEdge: boolean;            // universal tongue (bible law — every frog has it)
  dashEdge: boolean;
  sigEdge?: boolean;              // kit signature (slam / super-tongue / decoy)
}

export type AttackPhase = 'none' | 'windup' | 'active' | 'follow' | 'recovery' | 'heavywindup' | 'heavyhold';

export interface FrogAttack {
  phase: AttackPhase;
  frame: number;          // frames into current phase
  chainIdx: number;       // 0,1,2 into STICK_CHAIN
  data: AttackData | null;
  angle: number;          // swing center angle (steered, then magnetized)
  baseAngle: number;      // locked at windup start (steering clamps to ±30°)
  swingId: number;
  victims: number;        // hit count this swing (multi-hit hitstop cap)
  didRecoil: boolean;
}

export type TongueState = 'idle' | 'out' | 'back';

export interface Frog {
  index: number;          // 0 = P1, 1 = P2
  kit: KitId;
  x: number; y: number; px: number; py: number;
  vx: number; vy: number;
  aim: number;            // radians
  hp: number; maxHp: number; alive: boolean;
  downed: boolean;        // duo: waiting on the lily pad for a revive
  reviveT: number;        // partner-on-pad heartbeat progress (s)
  pulseT: number;         // heartbeat pulse timer
  iframesT: number; hurtFlashT: number;
  freeze: number;         // attacker hitstop frames
  // dash
  dashT: number; dashDirX: number; dashDirY: number;
  dashCharges: number; dashRegenT: number;
  // buffers (ticks remaining)
  attackBufT: number; dashBufT: number;
  attackHeldTicks: number;
  chainWindowT: number;
  attack: FrogAttack;
  // tongue
  tState: TongueState; tT: number; tAngle: number; tCd: number;
  tTarget: Enemy | null;  // stable reference (enemy array swap-removes)
  tTipX: number; tTipY: number;
  tPartner: boolean;      // this tongue flight is a partner yank
  // kit state
  sigCd: number;
  sigT: number;           // active signature timer (warden slam crouch etc.)
  grabbed: Enemy | null;  // snapper: enemy held, next attack = YEET
  grabT: number;
  trailAcc: number;       // morel: distance accumulator for spore trail
  dashId: number;         // wake-ripper hit guard
  slingT: number;         // partner slingshot boost timer
  // items (stacks) + derived stats (recomputed on purchase)
  items: Partial<Record<ItemId, number>>;
  stat: {
    dmg: number; arc: number; reach: number; impulse: number;
    maxDash: number; dashRegen: number; heavyHold: number;
    tongueReach: number; magnet: number; resist: number;
  };
  // feel
  hopPhase: number;
  essence: number;        // lifetime pickup count (stats)
}

export type EnemyState = 'spawning' | 'seek' | 'windup' | 'active' | 'recover' | 'tumble' | 'pulled' | 'grabbed';

export interface Enemy {
  alive: boolean;
  kind: EnemyKind;
  x: number; y: number; px: number; py: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  facing: number;
  state: EnemyState;
  stateF: number;         // frames in state
  freeze: number;         // victim hitstop frames
  flashT: number;         // white hit flash (s)
  armorFlashT: number;    // gray absorbed flash (s)
  stunT: number;
  // attack
  atkX: number; atkY: number;
  atkCd: number;          // orbiter dart / spitter lob / spawner birth / boss move timer
  orbitDir: number;       // orbiter strafe chirality
  bossMove: number;       // elder move-cycle index
  // spikeblob
  spikeT: number; spikesOut: boolean;
  // tumble
  tumbleT: number; tumbleSrcDmg: number; spin: number; rot: number;
  launchedBy: number;     // frog index that launched it (-1 = physics) — volley-spike (S1)
  yeeted: boolean;        // snapper projectile (trophy-line explodes on impact)
  lastSwingHit: number;
  // status
  poisonT: number; poisonFrom: number; slowT: number;
  bornOf: boolean;        // counted against the broodmaw child cap
  // pulled by tongue
  pullT: number;
  // render help
  seed: number;           // stable per-entity visual variation
}

// ---------------------------------------------------------------- run structure
export type GamePhase = 'title' | 'wave' | 'shop' | 'gameover' | 'victory';

export interface Glob {
  alive: boolean;
  owner: number;          // -1 enemy spit; >=0 frog projectile (echo edge)
  x0: number; y0: number; x1: number; y1: number;
  t: number; tof: number; // flight progress / time-of-flight (s)
  x: number; y: number;   // current (render + frog-glob hit tests)
  dmg: number; splash: number;
  pierce: number;         // frog crescents pierce
  lastHit: number;        // swingId-style guard for piercing crescents
}

export interface Zone {
  alive: boolean;
  kind: 'poison' | 'crater';
  owner: number;          // frog index (poison detonation needs the owner)
  x: number; y: number; r: number;
  t: number; life: number;
}

export interface Decoy {
  alive: boolean;
  owner: number;
  x: number; y: number;
  t: number; life: number;
  tauntR: number;
}

export interface ShopSlot { item: ItemId; sold: boolean }
export interface ShopState {
  slots: ShopSlot[];
  rerollCost: number;
  cursor: number[];       // per-frog cursor (0..slots, slots=reroll, slots+1=GO)
  ready: boolean[];
}

export interface EssenceDrop {
  alive: boolean;
  x: number; y: number; px: number; py: number;
  vx: number; vy: number;
  magnet: boolean;
}

export interface SpawnTelegraph { x: number; y: number; kind: EnemyKind; framesLeft: number }

// Pooled sim events — feel/audio consume and recycle each frame.
export type SimEventType =
  | 'swing' | 'swingHeavy' | 'hit' | 'armored' | 'reflect' | 'kill' | 'launch'
  | 'tumbleImpact' | 'wallSplat' | 'spawn' | 'spawnTelegraph' | 'enemyWindup'
  | 'flop' | 'nibbleHit' | 'frogHurt' | 'frogDown' | 'dash' | 'hop'
  | 'tongueOut' | 'tongueSnap' | 'pip' | 'essenceDrop'
  | 'slam' | 'decoy' | 'decoyPop' | 'yeet' | 'spike' | 'detonate' | 'zap'
  | 'spit' | 'globLand' | 'birth' | 'dart' | 'revivePulse' | 'revived'
  | 'waveStart' | 'waveClear' | 'buy' | 'reroll' | 'victory' | 'join' | 'slingshot';

export interface SimEvent {
  type: SimEventType;
  x: number; y: number;
  dirX: number; dirY: number;
  a: number;              // generic: damage, count…
  cls: 'light' | 'medium' | 'heavy' | 'none';
  kind: EnemyKind | 'frog' | 'none';
  killed: boolean; overkill: boolean;
}

export interface World {
  tick: number;
  elapsed: number;
  rng: Rng;
  frog: Frog;             // === frogs[0] (P1) — kept for QA hooks + old scripts
  frogs: Frog[];          // 1-2 players, drop-in
  enemies: Enemy[];       // dense array; swap-remove, pooled
  drops: EssenceDrop[];
  telegraphs: SpawnTelegraph[];
  events: SimEvent[];
  hash: SpatialHash<Enemy>;
  swingCounter: number;
  kills: number;
  gameOver: boolean;
  // run structure
  phase: GamePhase;
  wave: number;           // 1-based; 0 before the first wave
  waveBudget: number;
  waveBannerT: number;    // wave banner display timer (render reads)
  coins: number;          // SHARED wallet (argue-about-spending law)
  shop: ShopState;
  globs: Glob[];
  zones: Zone[];
  decoys: Decoy[];
  broodChildren: number;
  boss: Enemy | null;
  // spawner
  spawnAccum: number;
}
