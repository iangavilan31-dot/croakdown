// Sim state types. The sim is DOM-free and deterministic: seeded RNG + inputs only.
// Per-entity hitstop (freeze) — the world never freezes, entities do (Game Feel Standards).

import type { AttackData } from '../data/weapons';
import type { EnemyKind } from '../data/enemies';
import type { Rng } from '../engine/rng';
import type { SpatialHash } from '../engine/spatial';

export interface SimInput {
  mx: number; my: number;
  aimX: number; aimY: number;     // world-space point
  attackEdge: boolean; attackHeld: boolean;
  tongueEdge: boolean; dashEdge: boolean;
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
  x: number; y: number; px: number; py: number;
  vx: number; vy: number;
  aim: number;            // radians
  hp: number; maxHp: number; alive: boolean;
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
  // feel
  hopPhase: number;
  essence: number;
}

export type EnemyState = 'spawning' | 'seek' | 'windup' | 'active' | 'recover' | 'tumble' | 'pulled';

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
  // spikeblob
  spikeT: number; spikesOut: boolean;
  // tumble
  tumbleT: number; tumbleSrcDmg: number; spin: number; rot: number;
  lastSwingHit: number;
  // pulled by tongue
  pullT: number;
  // render help
  seed: number;           // stable per-entity visual variation
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
  | 'tongueOut' | 'tongueSnap' | 'pip' | 'essenceDrop';

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
  frog: Frog;
  enemies: Enemy[];       // dense array; swap-remove, pooled
  drops: EssenceDrop[];
  telegraphs: SpawnTelegraph[];
  events: SimEvent[];
  hash: SpatialHash<Enemy>;
  swingCounter: number;
  kills: number;
  gameOver: boolean;
  // spawner
  spawnAccum: number;
}
