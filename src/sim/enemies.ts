// Enemy update — the five behaviors (rusher / orbiter / tank / spitter / spawner)
// + the ELDER boss + spikeblob spice. Readable anticipation, crowd separation,
// tumble physics (enemies as projectiles), decoy taunts, poison slow.
// Contracts: design/5 Enemies + Combat System physics + tonight's brief.

import {
  DT, FROG_SPEED, FROG_RADIUS, ARENA_W, ARENA_H, ARENA_MARGIN,
  MUD_FRICTION, TUMBLE_MIN_SPEED, TUMBLE_COLLIDE_DMG, WALL_SPLAT_FRAC,
} from '../data/constants';
import {
  ENEMIES, SPIKE_IN_TIME, SPIKE_OUT_TIME,
  MIDGE_ORBIT_R, MIDGE_DART_SPEED, MIDGE_DART_CD,
  SPIT_GLOB_SPEED, SPIT_CD, SPIT_KEEP_MIN, SPIT_KEEP_MAX,
  BROOD_CD, BROOD_COUNT, BROOD_MAX_CHILDREN,
  ELDER_FLOP_RING, ELDER_SPIT_COUNT, ELDER_SUMMON,
} from '../data/enemies';
import { POISON_SLOW } from '../data/kits';
import type { Enemy, Frog, World } from './types';
import { emit } from './events';
import { applyPhysicsDamage } from './combat';
import { hurtFrog } from './frog';
import { spawnEnemy, spawnGlob } from './world';

const scratch: Enemy[] = [];

/** Target point for an enemy: nearest living frog — unless a decoy taunts it, or a
 *  downed partner's heartbeat draws the swarm to the pad (S4 risk/reward). */
function pickTarget(w: World, e: Enemy): { x: number; y: number; frog: Frog | null } {
  for (const d of w.decoys) {
    if (d.alive && Math.hypot(d.x - e.x, d.y - e.y) < d.tauntR) return { x: d.x, y: d.y, frog: null };
  }
  let bx = e.x + 100, by = e.y, bf: Frog | null = null, bd = 1e9;
  for (const f of w.frogs) {
    if (!f.alive) continue;
    // downed frogs SWARM-BAIT: enemies nearby converge on the pad
    const d = Math.hypot(f.x - e.x, f.y - e.y) * (f.downed ? 0.7 : 1);
    if (d < bd) { bd = d; bx = f.x; by = f.y; bf = f; }
  }
  return { x: bx, y: by, frog: bf && !bf.downed ? bf : null };
}

export function updateEnemies(w: World): void {
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies[i];
    if (!e.alive) continue;

    if (e.kind === 'spikeblob') {
      e.spikeT += DT;
      const period = e.spikesOut ? SPIKE_OUT_TIME : SPIKE_IN_TIME;
      if (e.spikeT >= period) { e.spikeT = 0; e.spikesOut = !e.spikesOut; }
    }
    if (e.flashT > 0) e.flashT -= DT;
    if (e.armorFlashT > 0) e.armorFlashT -= DT;
    if (e.slowT > 0) e.slowT -= DT;
    if (e.atkCd > 0 && e.state === 'seek') e.atkCd -= DT;

    if (e.freeze > 0) { e.freeze--; continue; }
    if (e.state === 'pulled' || e.state === 'grabbed') continue; // a tongue owns this body
    if (e.state === 'tumble') { updateTumble(w, e); continue; }
    if (e.stunT > 0) { e.stunT -= DT; applyFriction(e); moveClamped(e); continue; }

    const data = ENEMIES[e.kind];
    const t = pickTarget(w, e);
    const dx = t.x - e.x, dy = t.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) e.facing = Math.atan2(dy, dx);
    const slowMul = e.slowT > 0 ? POISON_SLOW : 1;

    switch (e.state) {
      case 'spawning': {
        e.stateF++;
        if (e.stateF >= 18) { e.state = 'seek'; e.stateF = 0; }
        break;
      }
      case 'seek': {
        e.stateF++;
        switch (data.behavior) {
          case 'rusher':
          case 'tank': {
            if (t.frog && dist < data.atkRange) { enterWindup(w, e, t.x, t.y, dist); break; }
            seekMove(w, e, dx, dy, dist, data.speedFrac * slowMul);
            break;
          }
          case 'orbiter': {
            // strafe the ring; dart when the timer says so
            if (t.frog && e.atkCd <= 0 && dist < data.atkRange + 160) {
              e.atkX = t.x; e.atkY = t.y;    // honest telegraph: dart line locked NOW
              e.state = 'windup'; e.stateF = 0;
              emit(w, 'enemyWindup', e.x, e.y, { kind: e.kind });
              break;
            }
            const speed = FROG_SPEED * data.speedFrac * slowMul;
            if (dist > MIDGE_ORBIT_R + 60) seekMove(w, e, dx, dy, dist, data.speedFrac * slowMul);
            else {
              // tangential strafe with a soft radial spring toward the ring
              const nx = dx / Math.max(1, dist), ny = dy / Math.max(1, dist);
              const radial = (dist - MIDGE_ORBIT_R) * 1.4;
              e.vx = (-ny * e.orbitDir) * speed + nx * radial;
              e.vy = (nx * e.orbitDir) * speed + ny * radial;
              moveClamped(e);
            }
            break;
          }
          case 'spitter': {
            const speed = FROG_SPEED * data.speedFrac * slowMul;
            if (t.frog && e.atkCd <= 0 && dist < data.atkRange) {
              e.atkX = t.x; e.atkY = t.y;
              e.state = 'windup'; e.stateF = 0;
              emit(w, 'enemyWindup', e.x, e.y, { kind: e.kind });
              break;
            }
            // shuffle to the keep-away band
            if (dist < SPIT_KEEP_MIN) { e.vx = -(dx / Math.max(1, dist)) * speed; e.vy = -(dy / Math.max(1, dist)) * speed; }
            else if (dist > SPIT_KEEP_MAX) { e.vx = (dx / Math.max(1, dist)) * speed; e.vy = (dy / Math.max(1, dist)) * speed; }
            else { e.vx *= 0.8; e.vy *= 0.8; }
            moveClamped(e);
            break;
          }
          case 'spawner': {
            if (e.atkCd <= 0 && w.broodChildren < BROOD_MAX_CHILDREN) {
              e.state = 'windup'; e.stateF = 0;
              emit(w, 'enemyWindup', e.x, e.y, { kind: e.kind });
              break;
            }
            if (dist > 420) seekMove(w, e, dx, dy, dist, data.speedFrac * slowMul);
            else { e.vx *= 0.85; e.vy *= 0.85; moveClamped(e); }
            break;
          }
          case 'boss': {
            if (e.atkCd <= 0) {
              e.bossMove = (e.bossMove + 1) % 3;
              e.state = 'windup'; e.stateF = 0;
              if (e.bossMove === 0) {         // flop: leap onto the target
                const lead = Math.min(dist, 240);
                e.atkX = e.x + (dx / Math.max(1, dist)) * lead;
                e.atkY = e.y + (dy / Math.max(1, dist)) * lead;
              } else { e.atkX = t.x; e.atkY = t.y; }
              emit(w, 'enemyWindup', e.x, e.y, { kind: e.kind });
              break;
            }
            seekMove(w, e, dx, dy, dist, data.speedFrac * slowMul);
            break;
          }
        }
        break;
      }
      case 'windup': {
        e.stateF++;
        e.vx = 0; e.vy = 0;
        if (e.stateF >= data.atkWindup) {
          e.state = 'active';
          e.stateF = 0;
          fireAttack(w, e, data.behavior);
        }
        break;
      }
      case 'active': {
        e.stateF++;
        activeHit(w, e, data.behavior);
        if (e.stateF >= data.atkActive) {
          e.state = 'recover'; e.stateF = 0;
          e.atkCd = behaviorCooldown(w, e);
        }
        break;
      }
      case 'recover': {
        e.stateF++;
        if (e.stateF >= data.atkRecovery) { e.state = 'seek'; e.stateF = 0; }
        break;
      }
    }
    applyFriction(e);
  }
}

function behaviorCooldown(w: World, e: Enemy): number {
  const b = ENEMIES[e.kind].behavior;
  if (b === 'orbiter') return MIDGE_DART_CD * (0.75 + w.rng() * 0.5);
  if (b === 'spitter') return SPIT_CD * (0.8 + w.rng() * 0.4);
  if (b === 'spawner') return BROOD_CD * (0.85 + w.rng() * 0.3);
  if (b === 'boss') return (e.hp < e.maxHp * 0.5 ? 1.3 : 2.1);
  return 0.4 + w.rng() * 0.4;
}

function fireAttack(w: World, e: Enemy, behavior: string): void {
  const data = ENEMIES[e.kind];
  if (behavior === 'tank' || (behavior === 'boss' && e.bossMove === 0)) {
    e.x = e.atkX; e.y = e.atkY;
    emit(w, 'flop', e.x, e.y, { a: behavior === 'boss' ? ELDER_FLOP_RING : data.atkRadius });
  } else if (behavior === 'orbiter') {
    const d = Math.max(1, Math.hypot(e.atkX - e.x, e.atkY - e.y));
    e.vx = ((e.atkX - e.x) / d) * MIDGE_DART_SPEED;
    e.vy = ((e.atkY - e.y) / d) * MIDGE_DART_SPEED;
    emit(w, 'dart', e.x, e.y, { kind: e.kind });
  } else if (behavior === 'spitter') {
    spawnGlob(w, -1, e.x, e.y - 20, e.atkX, e.atkY, data.atkDamage, data.atkRadius, SPIT_GLOB_SPEED);
  } else if (behavior === 'spawner') {
    for (let i = 0; i < BROOD_COUNT && w.broodChildren < BROOD_MAX_CHILDREN; i++) {
      const a = (i / BROOD_COUNT) * Math.PI * 2 + e.seed * 6;
      const c = spawnEnemy(w, e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 50, 'blobbit');
      c.bornOf = true;
      w.broodChildren++;
    }
    emit(w, 'birth', e.x, e.y, { a: BROOD_COUNT });
  } else if (behavior === 'boss') {
    if (e.bossMove === 1) {
      // spit volley: a fan of globs
      for (let i = 0; i < ELDER_SPIT_COUNT; i++) {
        const spread = (i - (ELDER_SPIT_COUNT - 1) / 2) * 0.5;
        const a = Math.atan2(e.atkY - e.y, e.atkX - e.x) + spread;
        const d = Math.hypot(e.atkX - e.x, e.atkY - e.y);
        spawnGlob(w, -1, e.x, e.y - 30, e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 10, 80, SPIT_GLOB_SPEED);
      }
    } else if (e.bossMove === 2) {
      for (let i = 0; i < ELDER_SUMMON; i++) {
        const a = (i / ELDER_SUMMON) * Math.PI * 2;
        spawnEnemy(w, e.x + Math.cos(a) * 120, e.y + Math.sin(a) * 100, 'blobbit');
      }
      emit(w, 'birth', e.x, e.y, { a: ELDER_SUMMON });
    }
  }
}

function activeHit(w: World, e: Enemy, behavior: string): void {
  const data = ENEMIES[e.kind];
  // where's the hurtbox this frame?
  let hx = e.atkX, hy = e.atkY, radius = data.atkRadius;
  if (behavior === 'tank' || behavior === 'boss') { hx = e.x; hy = e.y; radius = behavior === 'boss' && e.bossMove === 0 ? ELDER_FLOP_RING : data.atkRadius; }
  if (behavior === 'orbiter') {
    // the dart's body is the hitbox; keep flying
    hx = e.x; hy = e.y; radius = ENEMIES[e.kind].radius + 12;
    e.x += e.vx * DT; e.y += e.vy * DT;
    moveClamped(e);
  }
  if (behavior === 'spitter' || behavior === 'spawner') return; // ranged/birth: no contact hit
  if (behavior === 'boss' && e.bossMove !== 0) return;
  for (const f of w.frogs) {
    if (!f.alive || f.downed) continue;
    const d = Math.hypot(f.x - hx, f.y - hy);
    if (d < radius + FROG_RADIUS * 0.6) {
      const ddx = f.x - hx, ddy = f.y - hy;
      const dl = Math.max(1, Math.hypot(ddx, ddy));
      hurtFrog(w, f, data.atkDamage, ddx / dl, ddy / dl);
      if (behavior === 'rusher') emit(w, 'nibbleHit', hx, hy, { kind: e.kind });
    }
  }
}

function seekMove(w: World, e: Enemy, dx: number, dy: number, dist: number, speedFrac: number): void {
  const data = ENEMIES[e.kind];
  const speed = FROG_SPEED * speedFrac;
  let sx = 0, sy = 0;
  w.hash.query(e.x, e.y, data.radius * 2.2, scratch);
  let checks = 0;
  for (let j = 0; j < scratch.length && checks < 3; j++) {
    const o = scratch[j];
    if (o === e || !o.alive) continue;
    const ox = e.x - o.x, oy = e.y - o.y;
    const od = Math.hypot(ox, oy);
    const want = data.radius + ENEMIES[o.kind].radius;
    if (od > 0.01 && od < want) {
      const push = (want - od) / want;
      sx += (ox / od) * push; sy += (oy / od) * push;
      checks++;
    }
  }
  if (dist > 1) {
    e.vx = (dx / dist) * speed + sx * speed * 0.9;
    e.vy = (dy / dist) * speed + sy * speed * 0.9;
  } else { e.vx = sx * speed; e.vy = sy * speed; }
  moveClamped(e);
}

function enterWindup(w: World, e: Enemy, tx: number, ty: number, dist: number): void {
  e.state = 'windup';
  e.stateF = 0;
  if (ENEMIES[e.kind].behavior === 'tank') {
    const lead = Math.min(dist, 70);
    e.atkX = e.x + ((tx - e.x) / Math.max(1, dist)) * lead;
    e.atkY = e.y + ((ty - e.y) / Math.max(1, dist)) * lead;
  } else { e.atkX = tx; e.atkY = ty; }
  emit(w, 'enemyWindup', e.x, e.y, { kind: e.kind });
}

function applyFriction(e: Enemy): void {
  const d = Math.max(0, 1 - MUD_FRICTION * DT);
  e.vx *= d; e.vy *= d;
}

function moveClamped(e: Enemy): void {
  e.x += e.vx * DT;
  e.y += e.vy * DT;
  const r = ENEMIES[e.kind].radius;
  e.x = Math.max(ARENA_MARGIN + r, Math.min(ARENA_W - ARENA_MARGIN - r, e.x));
  e.y = Math.max(ARENA_MARGIN + r, Math.min(ARENA_H - ARENA_MARGIN - r, e.y));
}

// ---------------------------------------------------------------- tumble physics

function updateTumble(w: World, e: Enemy): void {
  e.tumbleT -= DT;
  e.rot += e.spin * DT;
  const d = Math.max(0, 1 - 2.2 * DT);
  e.vx *= d; e.vy *= d;
  e.x += e.vx * DT;
  e.y += e.vy * DT;

  const speed = Math.hypot(e.vx, e.vy);
  const r = ENEMIES[e.kind].radius;
  const pinball = anyItem(w, 'pinballgut');
  const collideMult = pinball ? 1.5 : 1;

  // bowling: hit other enemies
  if (speed > TUMBLE_MIN_SPEED) {
    w.hash.query(e.x, e.y, r + 60, scratch);
    for (let j = 0; j < scratch.length; j++) {
      const o = scratch[j];
      if (o === e || !o.alive || o.state === 'tumble') continue;
      const od = Math.hypot(o.x - e.x, o.y - e.y);
      if (od < r + ENEMIES[o.kind].radius) {
        const dmg = Math.max(1, Math.round(TUMBLE_COLLIDE_DMG * speed * collideMult));
        const dirX = od > 0.01 ? (o.x - e.x) / od : 1;
        const dirY = od > 0.01 ? (o.y - e.y) / od : 0;
        emit(w, 'tumbleImpact', (e.x + o.x) / 2, (e.y + o.y) / 2, { a: dmg, dirX, dirY, kind: o.kind });
        // trophy line: yeeted enemies EXPLODE on first impact
        if (e.yeeted && anyItem(w, 'trophyline')) explodeYeet(w, e);
        applyPhysicsDamage(w, o, dmg, dirX, dirY);
        if (o.alive) {
          o.vx += dirX * speed * (pinball ? 0.55 : 0.35);
          o.vy += dirY * speed * (pinball ? 0.55 : 0.35);
          o.stunT = Math.max(o.stunT, 0.15);
        }
        if (e.alive) applyPhysicsDamage(w, e, dmg, -dirX, -dirY);
        e.vx *= pinball ? 0.85 : 0.72; e.vy *= pinball ? 0.85 : 0.72;
        if (!e.alive) return;
        break;
      }
    }
  }

  // wall splat
  const minX = ARENA_MARGIN + r, maxX = ARENA_W - ARENA_MARGIN - r;
  const minY = ARENA_MARGIN + r, maxY = ARENA_H - ARENA_MARGIN - r;
  if (e.x < minX || e.x > maxX || e.y < minY || e.y > maxY) {
    const nx = e.x < minX ? 1 : e.x > maxX ? -1 : 0;
    const ny = e.y < minY ? 1 : e.y > maxY ? -1 : 0;
    e.x = Math.max(minX, Math.min(maxX, e.x));
    e.y = Math.max(minY, Math.min(maxY, e.y));
    // wallbreaker (warden passive): +50% splat damage, wall kills pay a coin
    const launcher = e.launchedBy >= 0 ? w.frogs[e.launchedBy] : undefined;
    const wallMult = launcher && launcher.kit === 'warden' ? 1.5 : 1;
    const dmg = Math.max(1, Math.round(e.tumbleSrcDmg * WALL_SPLAT_FRAC * wallMult));
    emit(w, 'wallSplat', e.x, e.y, { a: dmg, dirX: nx, dirY: ny, kind: e.kind });
    if (e.yeeted && anyItem(w, 'trophyline')) explodeYeet(w, e);
    const hpBefore = e.hp;
    const died = e.alive ? applyPhysicsDamage(w, e, dmg, nx, ny) : true;
    if (died && hpBefore > 0 && launcher && launcher.kit === 'warden') {
      // the wall pays out
      emit(w, 'pip', e.x, e.y);
      w.coins++;
    }
    // splatterhouse: the splat bursts onto the neighbors
    if (anyItem(w, 'splatterhouse')) {
      w.hash.query(e.x, e.y, 130, scratch);
      for (const o of scratch) {
        if (o === e || !o.alive) continue;
        if (Math.hypot(o.x - e.x, o.y - e.y) < 120) applyPhysicsDamage(w, o, 10, nx, ny);
      }
    }
    if (!died) { e.state = 'seek'; e.stateF = 0; e.stunT = 0.35; e.rot = 0; e.vx = 0; e.vy = 0; }
    return;
  }

  if (e.tumbleT <= 0 || speed < TUMBLE_MIN_SPEED) {
    e.state = 'seek';
    e.stateF = 0;
    e.stunT = 0.2;
    e.rot = 0;
    e.launchedBy = -1;
    e.yeeted = false;
  }
}

function explodeYeet(w: World, e: Enemy): void {
  e.yeeted = false;   // one boom per flight
  w.hash.query(e.x, e.y, 150, scratch);
  for (const o of scratch) {
    if (o === e || !o.alive) continue;
    const d = Math.hypot(o.x - e.x, o.y - e.y);
    if (d < 130) {
      const dl = Math.max(1, d);
      applyPhysicsDamage(w, o, 22, (o.x - e.x) / dl, (o.y - e.y) / dl);
    }
  }
  emit(w, 'detonate', e.x, e.y, { a: 130 });
}

function anyItem(w: World, id: 'pinballgut' | 'trophyline' | 'splatterhouse'): boolean {
  for (const f of w.frogs) if (f.items[id]) return true;
  return false;
}
