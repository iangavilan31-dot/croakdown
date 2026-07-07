// Enemy update: seek/attack cycles with readable anticipation, crowd separation,
// tumble physics (enemies as projectiles: collisions, wall splats), spike cycles.
// Contracts: design/5 Enemies/Sludge Family.md + Combat System physics.

import {
  DT, FROG_SPEED, FROG_RADIUS, ARENA_W, ARENA_H, ARENA_MARGIN,
  MUD_FRICTION, TUMBLE_MIN_SPEED, TUMBLE_COLLIDE_DMG, WALL_SPLAT_FRAC,
} from '../data/constants';
import { ENEMIES, SPIKE_IN_TIME, SPIKE_OUT_TIME } from '../data/enemies';
import type { Enemy, World } from './types';
import { emit } from './events';
import { applyPhysicsDamage } from './combat';
import { hurtFrog } from './frog';

const scratch: Enemy[] = [];

export function updateEnemies(w: World): void {
  const f = w.frog;
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies[i];
    if (!e.alive) continue;

    // spikeblob cycle runs regardless of state (readable rhythm)
    if (e.kind === 'spikeblob') {
      e.spikeT += DT;
      const period = e.spikesOut ? SPIKE_OUT_TIME : SPIKE_IN_TIME;
      if (e.spikeT >= period) { e.spikeT = 0; e.spikesOut = !e.spikesOut; }
    }
    if (e.flashT > 0) e.flashT -= DT;
    if (e.armorFlashT > 0) e.armorFlashT -= DT;

    // victim hitstop: frozen solid (sprite shakes render-side)
    if (e.freeze > 0) { e.freeze--; continue; }

    if (e.state === 'pulled') continue; // tongue owns this body

    if (e.state === 'tumble') { updateTumble(w, e); continue; }

    if (e.stunT > 0) { e.stunT -= DT; applyFriction(e); moveClamped(e); continue; }

    const data = ENEMIES[e.kind];
    const dx = f.x - e.x, dy = f.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) e.facing = Math.atan2(dy, dx);

    switch (e.state) {
      case 'spawning': {
        e.stateF++;
        if (e.stateF >= 18) { e.state = 'seek'; e.stateF = 0; }
        break;
      }
      case 'seek': {
        e.stateF++;
        if (f.alive && dist < data.atkRange) {
          e.state = 'windup';
          e.stateF = 0;
          // lock the strike point at windup start (honest telegraph)
          if (e.kind === 'gloopa') {
            const lead = Math.min(dist, 70);
            e.atkX = e.x + (dx / Math.max(1, dist)) * lead;
            e.atkY = e.y + (dy / Math.max(1, dist)) * lead;
          } else { e.atkX = f.x; e.atkY = f.y; }
          emit(w, 'enemyWindup', e.x, e.y, { kind: e.kind });
          break;
        }
        // seek with crowd separation (soft-body, budget 3 neighbors)
        const speed = FROG_SPEED * data.speedFrac;
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
        if (f.alive && dist > 1) {
          e.vx = (dx / dist) * speed + sx * speed * 0.9;
          e.vy = (dy / dist) * speed + sy * speed * 0.9;
        } else { e.vx = sx * speed; e.vy = sy * speed; }
        moveClamped(e);
        break;
      }
      case 'windup': {
        e.stateF++;
        e.vx = 0; e.vy = 0;
        if (e.stateF >= data.atkWindup) {
          e.state = 'active';
          e.stateF = 0;
          if (e.kind === 'gloopa') {
            // belly-flop: leap onto the strike point
            e.x = e.atkX; e.y = e.atkY;
            emit(w, 'flop', e.x, e.y, { a: data.atkRadius });
          }
        }
        break;
      }
      case 'active': {
        e.stateF++;
        if (f.alive) {
          const hx = e.kind === 'gloopa' ? e.x : e.atkX;
          const hy = e.kind === 'gloopa' ? e.y : e.atkY;
          const d = Math.hypot(f.x - hx, f.y - hy);
          if (d < data.atkRadius + FROG_RADIUS * 0.6) {
            const ddx = f.x - hx, ddy = f.y - hy;
            const dl = Math.max(1, Math.hypot(ddx, ddy));
            hurtFrog(w, f, data.atkDamage, ddx / dl, ddy / dl);
            if (e.kind !== 'gloopa') emit(w, 'nibbleHit', hx, hy, { kind: e.kind });
          }
        }
        if (e.stateF >= data.atkActive) { e.state = 'recover'; e.stateF = 0; }
        break;
      }
      case 'recover': {
        e.stateF++;
        // the punish window — gloopa lies grounded, gills heaving
        if (e.stateF >= data.atkRecovery) { e.state = 'seek'; e.stateF = 0; }
        break;
      }
    }
    // knockback velocity always decays and applies
    applyFriction(e);
  }
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
  // lighter friction while ballistic — they really fly
  const d = Math.max(0, 1 - 2.2 * DT);
  e.vx *= d; e.vy *= d;
  e.x += e.vx * DT;
  e.y += e.vy * DT;

  const speed = Math.hypot(e.vx, e.vy);
  const r = ENEMIES[e.kind].radius;

  // bowling: hit other enemies
  if (speed > TUMBLE_MIN_SPEED) {
    w.hash.query(e.x, e.y, r + 60, scratch);
    for (let j = 0; j < scratch.length; j++) {
      const o = scratch[j];
      if (o === e || !o.alive || o.state === 'tumble') continue;
      const od = Math.hypot(o.x - e.x, o.y - e.y);
      if (od < r + ENEMIES[o.kind].radius) {
        const dmg = Math.max(1, Math.round(TUMBLE_COLLIDE_DMG * speed));
        const dirX = od > 0.01 ? (o.x - e.x) / od : 1;
        const dirY = od > 0.01 ? (o.y - e.y) / od : 0;
        emit(w, 'tumbleImpact', (e.x + o.x) / 2, (e.y + o.y) / 2, { a: dmg, dirX, dirY, kind: o.kind });
        applyPhysicsDamage(w, o, dmg, dirX, dirY);
        if (o.alive) { o.vx += dirX * speed * 0.35; o.vy += dirY * speed * 0.35; o.stunT = Math.max(o.stunT, 0.15); }
        if (e.alive) applyPhysicsDamage(w, e, dmg, -dirX, -dirY);
        e.vx *= 0.72; e.vy *= 0.72;
        if (!e.alive) return;
        break; // one impact per tick keeps it readable
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
    const dmg = Math.max(1, Math.round(e.tumbleSrcDmg * WALL_SPLAT_FRAC));
    emit(w, 'wallSplat', e.x, e.y, { a: dmg, dirX: nx, dirY: ny, kind: e.kind });
    const died = applyPhysicsDamage(w, e, dmg, nx, ny);
    if (!died) { e.state = 'seek'; e.stateF = 0; e.stunT = 0.35; e.rot = 0; e.vx = 0; e.vy = 0; }
    return;
  }

  if (e.tumbleT <= 0 || speed < TUMBLE_MIN_SPEED) {
    e.state = 'seek';
    e.stateF = 0;
    e.stunT = 0.2;
    e.rot = 0;
  }
}
