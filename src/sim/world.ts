// World state + tick orchestration. Fixed 60Hz, deterministic, DOM-free.
// Run structure: title -> wave <-> shop -> gameover/victory. Enemy/drop storage:
// dense arrays with swap-remove, entities pooled. Co-op: frogs[] (drop-in P2),
// ONE shared wallet (argue-about-spending law), lily-pad heartbeat revive (S4).

import { makeRng } from '../engine/rng';
import { SpatialHash } from '../engine/spatial';
import { Pool } from '../engine/pool';
import {
  ARENA_W, ARENA_H, ARENA_MARGIN, DASH_CHARGES, DASH_RECHARGE, MAGNET_RADIUS,
  ESSENCE_FLY_SPEED, DT, FLOATER_CAP, HEAVY_HOLD_TICKS,
} from '../data/constants';
import { ENEMIES, type EnemyKind } from '../data/enemies';
import { KITS, POISON_DPS, type KitId } from '../data/kits';
import { ITEMS, RARITY_WEIGHTS, REROLL_BASE, SHOP_SLOTS, type ItemId, type Rarity } from '../data/items';
import { WAVES, SPAWN_COST, INTERMISSION_COINS_BASE, WAVE_CLEAR_HEAL } from '../data/waves';
import { TONGUE } from '../data/weapons';
import type { Decoy, Enemy, EssenceDrop, Frog, Glob, SimInput, World, Zone } from './types';
import { emit } from './events';
import { hurtFrog, updateFrog } from './frog';
import { updateEnemies } from './enemies';
import { updateSpawner } from './spawner';

const enemyPool = new Pool<Enemy>(() => ({
  alive: false, kind: 'blobbit', x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
  hp: 1, maxHp: 1, facing: 0, state: 'spawning', stateF: 0, freeze: 0,
  flashT: 0, armorFlashT: 0, stunT: 0, atkX: 0, atkY: 0, atkCd: 0, orbitDir: 1, bossMove: 0,
  spikeT: 0, spikesOut: false, tumbleT: 0, tumbleSrcDmg: 0, spin: 0, rot: 0,
  launchedBy: -1, yeeted: false, lastSwingHit: -1,
  poisonT: 0, poisonFrom: -1, slowT: 0, bornOf: false, pullT: 0, seed: 0,
}), 80);

const dropPool = new Pool<EssenceDrop>(() => ({
  alive: false, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, magnet: false,
}), 128);

export function createFrog(kit: KitId = 'warden', index = 0): Frog {
  const k = KITS[kit];
  const f: Frog = {
    index, kit,
    x: ARENA_W / 2 + (index === 1 ? 80 : 0), y: ARENA_H / 2, px: ARENA_W / 2, py: ARENA_H / 2,
    vx: 0, vy: 0, aim: 0, hp: k.hp, maxHp: k.hp, alive: true,
    downed: false, reviveT: 0, pulseT: 0,
    iframesT: 0, hurtFlashT: 0, freeze: 0,
    dashT: 0, dashDirX: 1, dashDirY: 0, dashCharges: DASH_CHARGES, dashRegenT: 0,
    attackBufT: 0, dashBufT: 0, attackHeldTicks: 0, chainWindowT: 0,
    attack: { phase: 'none', frame: 0, chainIdx: 0, data: null, angle: 0, baseAngle: 0, swingId: 0, victims: 0, didRecoil: false },
    tState: 'idle', tT: 0, tAngle: 0, tCd: 0, tTarget: null, tTipX: 0, tTipY: 0, tPartner: false,
    sigCd: 0, sigT: 0, grabbed: null, grabT: 0, trailAcc: 0, dashId: 0, slingT: 0,
    items: {},
    stat: { dmg: 1, arc: 1, reach: 1, impulse: 1, maxDash: DASH_CHARGES, dashRegen: DASH_RECHARGE, heavyHold: HEAVY_HOLD_TICKS, tongueReach: 1, magnet: 1, resist: 1 },
    hopPhase: 0, essence: 0,
  };
  f.px = f.x; f.py = f.y;
  return f;
}

/** Recompute a frog's derived stats from its item stacks (called on purchase). */
export function recomputeStats(f: Frog): void {
  const n = (id: ItemId) => f.items[id] ?? 0;
  const s = f.stat;
  s.dmg = 1 + 0.25 * n('whetstone') + (n('tandembell') ? 0 : 0);
  s.arc = 1 + 0.2 * n('widerjaw');
  s.reach = 1 + 0.25 * n('longhilt');
  s.impulse = 1 + 0.3 * n('bogpiston');
  s.maxDash = DASH_CHARGES + n('thirdlung');
  s.dashRegen = DASH_RECHARGE * Math.pow(0.75, n('oiledhips'));
  s.heavyHold = Math.round(HEAVY_HOLD_TICKS * (n('heavysap') ? 0.7 : 1));
  s.tongueReach = 1 + 0.4 * n('elasticgland');
  s.magnet = 1 + 1.2 * n('fireflyjar');
  s.resist = Math.pow(0.85, n('mudarmor'));
}

export function itemCount(w: World, id: ItemId): number {
  let c = 0;
  for (const f of w.frogs) c += f.items[id] ?? 0;
  return c;
}

// default startPhase 'wave' keeps the headless tests + old QA scripts alive;
// main.ts passes 'title' explicitly for the real boot.
export function createWorld(seed = 1, kit: KitId = 'warden', startPhase: 'title' | 'wave' = 'wave'): World {
  const f = createFrog(kit, 0);
  const w: World = {
    tick: 0, elapsed: 0, rng: makeRng(seed),
    frog: f, frogs: [f],
    enemies: [], drops: [], telegraphs: [], events: [],
    hash: new SpatialHash<Enemy>(128),
    swingCounter: 0, kills: 0, gameOver: false,
    phase: startPhase, wave: 0, waveBudget: 0, waveBannerT: 0,
    coins: 0,
    shop: { slots: [], rerollCost: REROLL_BASE, cursor: [0, 0], ready: [false, false] },
    globs: [], zones: [], decoys: [], broodChildren: 0, boss: null,
    spawnAccum: 0,
  };
  if (startPhase === 'wave') startWave(w);
  return w;
}

export function addPlayer2(w: World, kit?: KitId): Frog {
  const taken = w.frogs[0].kit;
  const pick: KitId = kit ?? (taken === 'snapper' ? 'warden' : 'snapper');
  const f2 = createFrog(pick, 1);
  f2.x = w.frogs[0].x + 80; f2.y = w.frogs[0].y;
  f2.px = f2.x; f2.py = f2.y;
  w.frogs.push(f2);
  emit(w, 'join', f2.x, f2.y);
  return f2;
}

export function startWave(w: World): void {
  w.wave++;
  const spec = WAVES[Math.min(w.wave, WAVES.length) - 1];
  w.waveBudget = spec.budget;
  w.waveBannerT = 2.2;
  w.phase = 'wave';
  w.spawnAccum = 0;
  w.shop.ready = [false, false];
  if (spec.boss) {
    const b = spawnEnemy(w, ARENA_W / 2, ARENA_MARGIN + 160, spec.boss);
    w.boss = b;
    emit(w, 'spawn', b.x, b.y, { kind: spec.boss });
  }
  emit(w, 'waveStart', ARENA_W / 2, ARENA_H / 2, { a: w.wave });
}

// ---------------------------------------------------------------- shop
function rollRarity(w: World): Rarity {
  const wave = w.wave;
  const wc = RARITY_WEIGHTS.common(wave), wr = RARITY_WEIGHTS.rare(wave), we = RARITY_WEIGHTS.epic(wave);
  let r = w.rng() * (wc + wr + we);
  if ((r -= wc) < 0) return 'common';
  return r - wr < 0 ? 'rare' : 'epic';
}

export function rollShop(w: World): void {
  const kitsInPlay = new Set(w.frogs.map((f) => f.kit));
  const pool = Object.values(ITEMS).filter((it) => {
    if (it.kit && !kitsInPlay.has(it.kit)) return false;
    // stacks: hide items every frog has maxed
    const cap = it.max ?? 1;
    return w.frogs.some((f) => (f.items[it.id] ?? 0) < cap || (it.kit && f.kit !== it.kit));
  });
  w.shop.slots = [];
  for (let i = 0; i < SHOP_SLOTS && pool.length; i++) {
    const rar = rollRarity(w);
    let cands = pool.filter((it) => it.rarity === rar && !w.shop.slots.some((s) => s.item === it.id));
    if (!cands.length) cands = pool.filter((it) => !w.shop.slots.some((s) => s.item === it.id));
    if (!cands.length) break;
    const pick = cands[(w.rng() * cands.length) | 0];
    w.shop.slots.push({ item: pick.id, sold: false });
  }
  w.shop.cursor = [0, 0];
}

export function shopCost(w: World, id: ItemId): number {
  return Math.round(ITEMS[id].cost * (1 + w.wave * 0.08));
}

export function buyItem(w: World, f: Frog, slotIdx: number): boolean {
  const slot = w.shop.slots[slotIdx];
  if (!slot || slot.sold) return false;
  const it = ITEMS[slot.item];
  const cost = shopCost(w, it.id);
  if (w.coins < cost) return false;
  // kit items land on the matching frog no matter who buys (shared wallet anyway)
  const target = it.kit ? w.frogs.find((fr) => fr.kit === it.kit) ?? f : f;
  const cap = it.max ?? 1;
  if ((target.items[it.id] ?? 0) >= cap) return false;
  w.coins -= cost;
  target.items[it.id] = (target.items[it.id] ?? 0) + 1;
  if (it.id === 'lilyheart') { target.maxHp += 25; target.hp = Math.min(target.maxHp, target.hp + 25); }
  if (it.id === 'bloodpact') for (const fr of w.frogs) { fr.maxHp += 30; fr.hp = Math.min(fr.maxHp, fr.hp + 30); }
  recomputeStats(target);
  slot.sold = true;
  emit(w, 'buy', f.x, f.y, { a: cost });
  return true;
}

export function rerollShop(w: World): boolean {
  if (w.coins < w.shop.rerollCost) return false;
  w.coins -= w.shop.rerollCost;
  w.shop.rerollCost += 2;
  rollShop(w);
  emit(w, 'reroll', ARENA_W / 2, ARENA_H / 2);
  return true;
}

// ---------------------------------------------------------------- spawning / drops
export function spawnEnemy(w: World, x: number, y: number, kind: EnemyKind): Enemy {
  const data = ENEMIES[kind];
  const e = enemyPool.get();
  e.alive = true; e.kind = kind;
  e.x = x; e.y = y; e.px = x; e.py = y; e.vx = 0; e.vy = 0;
  e.hp = data.hp; e.maxHp = data.hp;
  e.facing = 0; e.state = 'spawning'; e.stateF = 0; e.freeze = 0;
  e.flashT = 0; e.armorFlashT = 0; e.stunT = 0;
  e.atkCd = 1 + w.rng() * 2; e.orbitDir = w.rng() < 0.5 ? -1 : 1; e.bossMove = 0;
  e.spikeT = w.rng() * 1.5; e.spikesOut = false;
  e.tumbleT = 0; e.tumbleSrcDmg = 0; e.spin = 0; e.rot = 0;
  e.launchedBy = -1; e.yeeted = false; e.lastSwingHit = -1;
  e.poisonT = 0; e.poisonFrom = -1; e.slowT = 0; e.bornOf = false;
  e.pullT = 0; e.seed = w.rng();
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
  for (let i = w.drops.length - 1; i >= 0; i--) {
    const d = w.drops[i];
    d.px = d.x; d.py = d.y;
    // magnet to the nearest LIVING frog
    let best: Frog | null = null, bd = 1e9;
    for (const f of w.frogs) {
      if (!f.alive || f.downed) continue;
      const dist = Math.hypot(f.x - d.x, f.y - d.y);
      if (dist < bd) { bd = dist; best = f; }
    }
    if (best && (d.magnet || bd < MAGNET_RADIUS * best.stat.magnet)) {
      d.magnet = true;
      d.vx = ((best.x - d.x) / Math.max(1, bd)) * ESSENCE_FLY_SPEED;
      d.vy = ((best.y - d.y) / Math.max(1, bd)) * ESSENCE_FLY_SPEED;
    } else {
      const decel = Math.max(0, 1 - 5 * DT);
      d.vx *= decel; d.vy *= decel;
    }
    d.x += d.vx * DT; d.y += d.vy * DT;
    if (best && bd < 40) {
      w.coins++;
      best.essence++;
      emit(w, 'pip', d.x, d.y);
      d.alive = false;
      w.drops[i] = w.drops[w.drops.length - 1];
      w.drops.pop();
      dropPool.put(d);
    }
  }
}

// ---------------------------------------------------------------- globs / zones / decoys
export function spawnGlob(w: World, owner: number, x0: number, y0: number, x1: number, y1: number, dmg: number, splash: number, speed: number, pierce = 0): void {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  w.globs.push({
    alive: true, owner, x0, y0, x1, y1, t: 0, tof: Math.max(0.25, dist / speed),
    x: x0, y: y0, dmg, splash, pierce, lastHit: -1,
  });
  emit(w, owner < 0 ? 'spit' : 'swing', x0, y0);
}

const globScratch: Enemy[] = [];
function updateGlobs(w: World): void {
  for (let i = w.globs.length - 1; i >= 0; i--) {
    const g = w.globs[i];
    g.t += DT;
    const p = Math.min(1, g.t / g.tof);
    g.x = g.x0 + (g.x1 - g.x0) * p;
    g.y = g.y0 + (g.y1 - g.y0) * p;
    if (g.owner >= 0) {
      // frog crescent: straight flight, pierces
      w.hash.query(g.x, g.y, 60, globScratch);
      for (const e of globScratch) {
        if (!e.alive || e.lastSwingHit === g.lastHit) continue;
        if (Math.hypot(e.x - g.x, e.y - g.y) < ENEMIES[e.kind].radius + 18) {
          e.lastSwingHit = g.lastHit;
          const dl = Math.max(1, Math.hypot(g.x1 - g.x0, g.y1 - g.y0));
          applyGlobHit(w, e, g, (g.x1 - g.x0) / dl, (g.y1 - g.y0) / dl);
          if (--g.pierce < 0) { g.alive = false; break; }
        }
      }
    }
    if (p >= 1) {
      if (g.owner < 0) {
        // enemy spit lands: splash vs frogs
        for (const f of w.frogs) {
          if (!f.alive || f.downed) continue;
          const d = Math.hypot(f.x - g.x1, f.y - g.y1);
          if (d < g.splash + 20) {
            const dl = Math.max(1, d);
            hurtFrog(w, f, g.dmg, (f.x - g.x1) / dl, (f.y - g.y1) / dl);
          }
        }
      }
      emit(w, 'globLand', g.x1, g.y1, { a: g.splash });
      g.alive = false;
    }
    if (!g.alive) { w.globs[i] = w.globs[w.globs.length - 1]; w.globs.pop(); }
  }
}

function applyGlobHit(w: World, e: Enemy, g: Glob, dirX: number, dirY: number): void {
  // lightweight projectile hit — reuses the physics-damage path + a knock
  e.vx += dirX * 260; e.vy += dirY * 260;
  e.flashT = 0.14; e.freeze = Math.max(e.freeze, 3);
  emit(w, 'hit', e.x, e.y, { dirX, dirY, a: g.dmg, cls: 'light', kind: e.kind, killed: e.hp - g.dmg <= 0 });
  e.hp -= g.dmg;
  if (e.hp <= 0) {
    e.alive = false;
    w.kills++;
    emit(w, 'kill', e.x, e.y, { dirX, dirY, kind: e.kind });
    dropEssence(w, e.x, e.y, ENEMIES[e.kind].essence, dirX, dirY);
  }
}

export function spawnZone(w: World, kind: Zone['kind'], owner: number, x: number, y: number, r: number, life: number): void {
  if (w.zones.length > 48) w.zones.shift();
  w.zones.push({ alive: true, kind, owner, x, y, r, t: 0, life });
}

function updateZones(w: World): void {
  for (let i = w.zones.length - 1; i >= 0; i--) {
    const z = w.zones[i];
    z.t += DT;
    if (z.t >= z.life) { w.zones[i] = w.zones[w.zones.length - 1]; w.zones.pop(); continue; }
    w.hash.query(z.x, z.y, z.r + 40, globScratch);
    for (const e of globScratch) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + ENEMIES[e.kind].radius * 0.5) {
        if (z.kind === 'poison') {
          e.poisonT = Math.max(e.poisonT, 1.2);
          e.poisonFrom = z.owner;
          e.slowT = Math.max(e.slowT, 0.4);
        } else {
          e.slowT = Math.max(e.slowT, 0.3);
        }
      }
    }
  }
}

/** A frog's hit landed at (x,y): detonate the OTHER frog's poison zones there (S3). */
export function tryDetonateZones(w: World, attackerIdx: number, x: number, y: number): void {
  for (let i = w.zones.length - 1; i >= 0; i--) {
    const z = w.zones[i];
    if (z.kind !== 'poison' || z.owner === attackerIdx || z.owner < 0) continue;
    if (Math.hypot(x - z.x, y - z.y) > z.r + 30) continue;
    // BOOM — cross-player combustion
    w.hash.query(z.x, z.y, z.r + 80, globScratch);
    for (const e of globScratch) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - z.x, e.y - z.y);
      if (d < z.r + 60) {
        const dl = Math.max(1, d);
        e.vx += ((e.x - z.x) / dl) * 420;
        e.vy += ((e.y - z.y) / dl) * 420;
        e.flashT = 0.16; e.freeze = Math.max(e.freeze, 4);
        e.hp -= 25;
        if (e.hp <= 0) {
          e.alive = false; w.kills++;
          emit(w, 'kill', e.x, e.y, { kind: e.kind });
          dropEssence(w, e.x, e.y, ENEMIES[e.kind].essence, (e.x - z.x) / dl, (e.y - z.y) / dl);
        }
      }
    }
    emit(w, 'detonate', z.x, z.y, { a: z.r });
    w.zones[i] = w.zones[w.zones.length - 1];
    w.zones.pop();
  }
}

export function spawnDecoy(w: World, owner: number, x: number, y: number, tauntR: number, life: number): void {
  w.decoys.push({ alive: true, owner, x, y, t: 0, life, tauntR });
  emit(w, 'decoy', x, y);
}

function updateDecoys(w: World): void {
  for (let i = w.decoys.length - 1; i >= 0; i--) {
    const d = w.decoys[i];
    d.t += DT;
    if (d.t >= d.life) {
      // pop: poison burst (owner's poison — partner hits detonate it, S3-compatible)
      const owner = w.frogs[d.owner];
      const boost = owner && owner.items.nightcap ? 1.5 : 1;
      spawnZone(w, 'poison', d.owner, d.x, d.y, 90 * boost, 2.5);
      w.hash.query(d.x, d.y, 150 * boost, globScratch);
      for (const e of globScratch) {
        if (!e.alive) continue;
        const dist = Math.hypot(e.x - d.x, e.y - d.y);
        if (dist < 130 * boost) {
          const dl = Math.max(1, dist);
          e.hp -= 30 * boost;
          e.vx += ((e.x - d.x) / dl) * 380;
          e.vy += ((e.y - d.y) / dl) * 380;
          e.flashT = 0.15; e.freeze = Math.max(e.freeze, 4);
          if (e.hp <= 0) {
            e.alive = false; w.kills++;
            emit(w, 'kill', e.x, e.y, { kind: e.kind });
            dropEssence(w, e.x, e.y, ENEMIES[e.kind].essence, (e.x - d.x) / dl, (e.y - d.y) / dl);
          }
        }
      }
      emit(w, 'decoyPop', d.x, d.y);
      w.decoys[i] = w.decoys[w.decoys.length - 1];
      w.decoys.pop();
    }
  }
}

// poison damage-over-time on enemies
function updatePoison(w: World): void {
  for (const e of w.enemies) {
    if (!e.alive || e.poisonT <= 0) continue;
    e.poisonT -= DT;
    e.hp -= POISON_DPS * DT;
    if (e.hp <= 0) {
      e.alive = false;
      w.kills++;
      emit(w, 'kill', e.x, e.y, { kind: e.kind });
      dropEssence(w, e.x, e.y, ENEMIES[e.kind].essence, 0, -1);
    }
  }
}

// ---------------------------------------------------------------- revive (S4 heartbeat)
function updateRevive(w: World): void {
  if (w.frogs.length < 2) return;
  for (const f of w.frogs) {
    if (!f.downed) continue;
    const partner = w.frogs.find((o) => o !== f && o.alive && !o.downed);
    if (!partner) continue;
    const near = Math.hypot(partner.x - f.x, partner.y - f.y) < 85;
    if (near) {
      f.reviveT += DT;
      f.pulseT -= DT;
      if (f.pulseT <= 0) {
        f.pulseT = Math.max(0.25, 0.75 - f.reviveT * 0.15);   // heartbeat accelerates
        emit(w, 'revivePulse', f.x, f.y, { a: f.reviveT / 3 });
      }
      if (f.reviveT >= 3) {
        f.downed = false;
        f.alive = true;
        f.hp = Math.round(f.maxHp * 0.5);
        f.iframesT = 1.2;
        f.reviveT = 0;
        emit(w, 'revived', f.x, f.y);
      }
    } else {
      f.reviveT = Math.max(0, f.reviveT - DT * 0.6);
    }
  }
}

/** One fixed 60Hz tick. Deterministic: (seed, input stream) -> identical worlds. */
export function tickWorld(w: World, inputs: SimInput | SimInput[]): void {
  const inps = Array.isArray(inputs) ? inputs : [inputs];
  w.tick++;
  if (w.phase === 'title' || w.phase === 'gameover' || w.phase === 'victory') return;

  w.elapsed += DT;
  if (w.waveBannerT > 0) w.waveBannerT -= DT;

  // interpolation bookkeeping
  for (const f of w.frogs) { f.px = f.x; f.py = f.y; }
  for (let i = 0; i < w.enemies.length; i++) { const e = w.enemies[i]; e.px = e.x; e.py = e.y; }

  // rebuild spatial hash
  w.hash.clear();
  for (let i = 0; i < w.enemies.length; i++) if (w.enemies[i].alive) w.hash.insert(w.enemies[i]);

  if (w.phase === 'shop') {
    updateShopPhase(w, inps);
    updateDrops(w);
    return;
  }

  for (let i = 0; i < w.frogs.length; i++) {
    const f = w.frogs[i];
    if (f.downed) continue;
    updateFrog(w, f, inps[i] ?? inps[0]);
  }
  updateEnemies(w);
  updateGlobs(w);
  updateZones(w);
  updateDecoys(w);
  updatePoison(w);
  updateDrops(w);
  updateRevive(w);
  updateSpawner(w);

  // compact dead enemies (swap-remove, return to pool)
  for (let i = w.enemies.length - 1; i >= 0; i--) {
    const e = w.enemies[i];
    if (!e.alive) {
      if (e.bornOf) w.broodChildren = Math.max(0, w.broodChildren - 1);
      for (const f of w.frogs) {
        if (f.tTarget === e) f.tTarget = null;
        if (f.grabbed === e) f.grabbed = null;
      }
      if (w.boss === e) w.boss = null;
      w.enemies[i] = w.enemies[w.enemies.length - 1];
      w.enemies.pop();
      enemyPool.put(e);
    }
  }

  // fail state: every frog down/dead
  if (!w.gameOver && w.frogs.every((f) => !f.alive || f.downed)) {
    w.gameOver = true;
    w.phase = 'gameover';
  }

  // wave complete -> shop (or victory after the last wave)
  if (w.phase === 'wave' && w.waveBudget <= 0 && w.enemies.length === 0 && w.telegraphs.length === 0) {
    if (w.wave >= WAVES.length) {
      w.phase = 'victory';
      emit(w, 'victory', ARENA_W / 2, ARENA_H / 2);
      return;
    }
    w.phase = 'shop';
    w.coins += INTERMISSION_COINS_BASE + w.wave * 2;
    for (const f of w.frogs) {
      if (f.downed) { f.downed = false; f.alive = true; f.hp = Math.round(f.maxHp * 0.4); }
      f.hp = Math.min(f.maxHp, f.hp + WAVE_CLEAR_HEAL);
    }
    w.shop.rerollCost = REROLL_BASE + w.wave;
    rollShop(w);
    emit(w, 'waveClear', ARENA_W / 2, ARENA_H / 2, { a: w.wave });
  }
}

// shop input: move left/right = cursor, attack = buy, dash = ready/GO, sig = reroll
const shopMoveLatch: number[] = [0, 0];
function updateShopPhase(w: World, inps: SimInput[]): void {
  const nOptions = w.shop.slots.length + 2;   // slots + REROLL + GO
  for (let i = 0; i < w.frogs.length; i++) {
    const f = w.frogs[i];
    const inp = inps[i] ?? inps[0];
    // frogs stroll in the pond during the break (shop is an overlay, world stays alive)
    updateFrog(w, f, { ...inp, attackEdge: false, tongueEdge: false, sigEdge: false, attackHeld: false });
    const dir = inp.mx > 0.5 ? 1 : inp.mx < -0.5 ? -1 : 0;
    if (dir !== 0 && shopMoveLatch[i] !== dir) {
      w.shop.cursor[i] = ((w.shop.cursor[i] + dir) % nOptions + nOptions) % nOptions;
    }
    shopMoveLatch[i] = dir;
    if (inp.attackEdge) {
      const c = w.shop.cursor[i];
      if (c < w.shop.slots.length) buyItem(w, f, c);
      else if (c === w.shop.slots.length) rerollShop(w);
      else { w.shop.ready[i] = !w.shop.ready[i]; }
    }
    if (inp.dashEdge) w.shop.ready[i] = true;
    if (inp.tongueEdge || inp.sigEdge) rerollShop(w);
  }
  if (w.frogs.every((f, i) => w.shop.ready[i])) startWave(w);
}

export const pools = { enemyPool, dropPool };
