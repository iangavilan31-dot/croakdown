// World state + tick orchestration. Fixed 60Hz, deterministic, DOM-free.
// Enemy/drop storage: dense arrays with swap-remove, entities pooled.

import { makeRng } from '../engine/rng';
import { SpatialHash } from '../engine/spatial';
import { Pool } from '../engine/pool';
import {
  ARENA_W, ARENA_H, FROG_HP, DASH_CHARGES, MAGNET_RADIUS, ESSENCE_FLY_SPEED, DT, FLOATER_CAP,
} from '../data/constants';
import { ENEMIES, type EnemyKind } from '../data/enemies';
import type { Enemy, EssenceDrop, Frog, SimInput, World } from './types';
import { emit } from './events';
import { updateFrog } from './frog';
import { updateEnemies } from './enemies';
import { updateSpawner } from './spawner';

const enemyPool = new Pool<Enemy>(() => ({
  alive: false, kind: 'blobbit', x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
  hp: 1, maxHp: 1, facing: 0, state: 'spawning', stateF: 0, freeze: 0,
  flashT: 0, armorFlashT: 0, stunT: 0, atkX: 0, atkY: 0,
  spikeT: 0, spikesOut: false, tumbleT: 0, tumbleSrcDmg: 0, spin: 0, rot: 0,
  lastSwingHit: -1, pullT: 0, seed: 0,
}), 80);

const dropPool = new Pool<EssenceDrop>(() => ({
  alive: false, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, magnet: false,
}), 128);

export function createFrog(): Frog {
  return {
    x: ARENA_W / 2, y: ARENA_H / 2, px: ARENA_W / 2, py: ARENA_H / 2,
    vx: 0, vy: 0, aim: 0, hp: FROG_HP, maxHp: FROG_HP, alive: true,
    iframesT: 0, hurtFlashT: 0, freeze: 0,
    dashT: 0, dashDirX: 1, dashDirY: 0, dashCharges: DASH_CHARGES, dashRegenT: 0,
    attackBufT: 0, dashBufT: 0, attackHeldTicks: 0, chainWindowT: 0,
    attack: { phase: 'none', frame: 0, chainIdx: 0, data: null, angle: 0, baseAngle: 0, swingId: 0, victims: 0, didRecoil: false },
    tState: 'idle', tT: 0, tAngle: 0, tCd: 0, tTarget: null, tTipX: 0, tTipY: 0,
    hopPhase: 0, essence: 0,
  };
}

export function createWorld(seed = 1): World {
  return {
    tick: 0, elapsed: 0, rng: makeRng(seed),
    frog: createFrog(),
    enemies: [], drops: [], telegraphs: [], events: [],
    hash: new SpatialHash<Enemy>(128),
    swingCounter: 0, kills: 0, gameOver: false, spawnAccum: 0,
  };
}

export function spawnEnemy(w: World, x: number, y: number, kind: EnemyKind): Enemy {
  const data = ENEMIES[kind];
  const e = enemyPool.get();
  e.alive = true; e.kind = kind;
  e.x = x; e.y = y; e.px = x; e.py = y; e.vx = 0; e.vy = 0;
  e.hp = data.hp; e.maxHp = data.hp;
  e.facing = 0; e.state = 'spawning'; e.stateF = 0; e.freeze = 0;
  e.flashT = 0; e.armorFlashT = 0; e.stunT = 0;
  e.spikeT = w.rng() * 1.5; e.spikesOut = false;
  e.tumbleT = 0; e.tumbleSrcDmg = 0; e.spin = 0; e.rot = 0;
  e.lastSwingHit = -1; e.pullT = 0; e.seed = w.rng();
  w.enemies.push(e);
  return e;
}

export function dropEssence(w: World, x: number, y: number, count: number, dirX: number, dirY: number): void {
  for (let i = 0; i < count; i++) {
    if (w.drops.length >= FLOATER_CAP) break;
    const d = dropPool.get();
    d.alive = true;
    d.x = x; d.y = y; d.px = x; d.py = y;
    const a = Math.atan2(dirY, dirX) + (w.rng() - 0.5) * 2.4;
    const s = 120 + w.rng() * 220;
    d.vx = Math.cos(a) * s; d.vy = Math.sin(a) * s;
    d.magnet = false;
    w.drops.push(d);
  }
  emit(w, 'essenceDrop', x, y, { a: count });
}

function updateDrops(w: World): void {
  const f = w.frog;
  for (let i = w.drops.length - 1; i >= 0; i--) {
    const d = w.drops[i];
    d.px = d.x; d.py = d.y;
    const dx = f.x - d.x, dy = f.y - d.y;
    const dist = Math.hypot(dx, dy);
    if (f.alive && (d.magnet || dist < MAGNET_RADIUS)) {
      d.magnet = true;
      const sp = ESSENCE_FLY_SPEED;
      d.vx = (dx / Math.max(1, dist)) * sp;
      d.vy = (dy / Math.max(1, dist)) * sp;
    } else {
      const decel = Math.max(0, 1 - 5 * DT);
      d.vx *= decel; d.vy *= decel;
    }
    d.x += d.vx * DT; d.y += d.vy * DT;
    if (f.alive && dist < 40) {
      f.essence++;
      emit(w, 'pip', d.x, d.y);
      d.alive = false;
      w.drops[i] = w.drops[w.drops.length - 1];
      w.drops.pop();
      dropPool.put(d);
    }
  }
}

/** One fixed 60Hz tick. Deterministic: (seed, input stream) -> identical worlds. */
export function tickWorld(w: World, inp: SimInput): void {
  w.tick++;
  w.elapsed += DT;

  // interpolation bookkeeping
  const f = w.frog;
  f.px = f.x; f.py = f.y;
  for (let i = 0; i < w.enemies.length; i++) { const e = w.enemies[i]; e.px = e.x; e.py = e.y; }

  // rebuild spatial hash
  w.hash.clear();
  for (let i = 0; i < w.enemies.length; i++) if (w.enemies[i].alive) w.hash.insert(w.enemies[i]);

  updateFrog(w, inp);
  updateEnemies(w);
  updateDrops(w);
  updateSpawner(w);

  // compact dead enemies (swap-remove, return to pool)
  for (let i = w.enemies.length - 1; i >= 0; i--) {
    const e = w.enemies[i];
    if (!e.alive) {
      if (w.frog.tTarget === e) w.frog.tTarget = null;
      w.enemies[i] = w.enemies[w.enemies.length - 1];
      w.enemies.pop();
      enemyPool.put(e);
    }
  }
}

export const pools = { enemyPool, dropPool };
