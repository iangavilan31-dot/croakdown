// The juice pipeline — consumes sim events and fans out to trauma, particles,
// decals, and audio in the same frame (the one-event rule). Numbers from
// design/3 Gameplay/Game Feel Standards.md. Render draws what lives here.

import { Pool } from '../engine/pool';
import { sfx } from '../engine/audio';
import {
  PARTICLE_CAP, DECAL_CAP, TRAUMA_LIGHT, TRAUMA_HEAVY, TRAUMA_KILL, TRAUMA_SPLAT,
  TRAUMA_MAX, TRAUMA_DECAY,
} from '../data/constants';
import type { SimEvent, World } from '../sim/types';
import { drainEvents } from '../sim/events';

export const feel = {
  trauma: 0,
  shakeSlider: 1,
  zoomPulse: 0,
};

export function addTrauma(amount: number) { feel.trauma = Math.min(TRAUMA_MAX, feel.trauma + amount); }

export function shakeOffset(time: number): [number, number, number] {
  const s = feel.trauma * feel.trauma * 24 * feel.shakeSlider;
  if (s < 0.15) return [0, 0, 0];
  return [
    s * (Math.sin(time * 91.7) + Math.sin(time * 47.3) * 0.6) * 0.6,
    s * (Math.cos(time * 83.1) + Math.cos(time * 53.9) * 0.6) * 0.6,
    feel.trauma * feel.trauma * 0.5 * (Math.PI / 180) * Math.sin(time * 67.1) * feel.shakeSlider,
  ];
}

export function decayFeel(dt: number) {
  feel.trauma = Math.max(0, feel.trauma - dt * TRAUMA_DECAY);
  feel.zoomPulse = Math.max(0, feel.zoomPulse - dt * 2);
}

// ---------- particles ----------
export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string;
  gravity: number; drag: number; glow: boolean;
}
export const particles: Particle[] = [];
const pPool = new Pool<Particle>(() => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', gravity: 0, drag: 0, glow: false }), 256);

export function spawnParticles(x: number, y: number, count: number, opts: Partial<Particle> & { speed?: number; spread?: number; angle?: number }) {
  const n = Math.min(count, PARTICLE_CAP - particles.length);
  for (let i = 0; i < n; i++) {
    const p = pPool.get();
    const ang = (opts.angle ?? 0) + (Math.random() - 0.5) * (opts.spread ?? Math.PI * 2);
    const spd = (opts.speed ?? 80) * (0.4 + Math.random() * 0.8);
    p.x = x; p.y = y;
    p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd;
    p.maxLife = p.life = (opts.maxLife ?? 0.5) * (0.6 + Math.random() * 0.8);
    p.size = (opts.size ?? 3) * (0.6 + Math.random() * 0.9);
    p.color = opts.color ?? '#fff';
    p.gravity = opts.gravity ?? 0;
    p.drag = opts.drag ?? 2;
    p.glow = opts.glow ?? false;
    particles.push(p);
  }
}

export function updateParticles(dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles[i] = particles[particles.length - 1]; particles.pop(); pPool.put(p); continue; }
    p.vy += p.gravity * dt;
    const d = Math.max(0, 1 - p.drag * dt);
    p.vx *= d; p.vy *= d;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
}

// ---------- permanence decals (the battlefield remembers) ----------
export type DecalKind = 'blood' | 'smear' | 'bones' | 'crater' | 'splat' | 'gel';
export interface Decal { x: number; y: number; kind: DecalKind; rot: number; scale: number; fade: number }
export const decals: Decal[] = [];
// render bookkeeping: incremental draws; a shift (over cap) forces a full redraw
export const decalStats = { adds: 0, drops: 0 };

export function addDecal(x: number, y: number, kind: DecalKind, rot = Math.random() * Math.PI * 2, scale = 1) {
  if (decals.length >= DECAL_CAP) { decals.shift(); decalStats.drops++; }
  decals.push({ x, y, kind, rot, scale: scale * (0.8 + Math.random() * 0.5), fade: 1 });
  decalStats.adds++;
}

// ---------- water ripples (the swamp reacts to every footfall) ----------
export interface Ripple { x: number; y: number; t: number; life: number; maxR: number }
export const ripples: Ripple[] = [];
export function spawnRipple(x: number, y: number, maxR: number, life = 0.7) {
  if (ripples.length > 60) ripples.shift();
  ripples.push({ x, y, t: 0, life, maxR });
}
export function updateRipples(dt: number) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].t += dt;
    if (ripples[i].t >= ripples[i].life) { ripples[i] = ripples[ripples.length - 1]; ripples.pop(); }
  }
}

// ---------- event consumption (the fan-out) ----------
// Swamp gore law (REFERENCE_PACK v2): enemies are GREEN sludge — hits spray glowing
// jelly, deaths dissolve to sludge puddles + water ripples. No red blood, no bones.
const PINK = '#ff5fa2';       // tongue impact only (reference-approved accent)
const SLUDGE = '#4fbf6e';     // bright enemy jelly spray
const SLUDGE_DK = '#2f8f52';  // deeper sludge
const GOLD = '#ffd27a';
const GEL = '#7fd6a8';

export function consumeEvents(w: World): void {
  drainEvents(w, (e: SimEvent) => {
    switch (e.type) {
      case 'swing': sfx('swing'); break;
      case 'swingHeavy': sfx('swingHeavy'); break;
      case 'hit': {
        const ang = Math.atan2(e.dirY, e.dirX);
        spawnParticles(e.x, e.y, 6, { angle: ang, spread: 0.9, speed: 260, color: '#fff', maxLife: 0.22, size: 3 });
        spawnParticles(e.x, e.y, e.cls === 'heavy' ? 14 : 6, { angle: ang, spread: 1.1, speed: 320, color: SLUDGE, maxLife: 0.5, size: 4, gravity: 300, drag: 3 });
        if (Math.random() < (e.cls === 'heavy' ? 0.5 : 0.18)) addDecal(e.x + e.dirX * 24, e.y + e.dirY * 24, 'blood', ang, e.cls === 'heavy' ? 0.7 : 0.5);
        addTrauma(e.cls === 'heavy' ? TRAUMA_HEAVY : TRAUMA_LIGHT);
        sfx(e.cls === 'heavy' || e.cls === 'medium' ? 'sliceHeavy' : 'sliceLight');
        if (e.killed) onKill(e);
        break;
      }
      case 'armored': {
        spawnParticles(e.x, e.y, 5, { spread: Math.PI, speed: 140, color: '#9aa5a0', maxLife: 0.3, size: 3 });
        sfx('clink');
        if (e.killed) onKill(e);
        break;
      }
      case 'reflect': sfx('reflect'); break;
      case 'kill': break; // handled via hit.killed (kill event reserved for physics deaths)
      case 'launch': sfx('launch'); break;
      case 'tumbleImpact': {
        spawnParticles(e.x, e.y, 8, { spread: Math.PI * 2, speed: 220, color: GEL, maxLife: 0.35, size: 4 });
        addTrauma(TRAUMA_LIGHT);
        sfx('pop');
        break;
      }
      case 'wallSplat': {
        const ang = Math.atan2(e.dirY, e.dirX);
        spawnParticles(e.x, e.y, 16, { angle: ang, spread: 1.6, speed: 380, color: SLUDGE, maxLife: 0.6, size: 5, gravity: 260, drag: 3 });
        addDecal(e.x, e.y, 'splat', ang, 1.3);
        addTrauma(TRAUMA_SPLAT);
        sfx('splat');
        break;
      }
      case 'spawnTelegraph': break; // sim renders glyph from telegraph list
      case 'spawn': {
        spawnParticles(e.x, e.y, 10, { spread: Math.PI * 2, speed: 120, color: '#4a6157', maxLife: 0.6, size: 6, drag: 4 });
        sfx('spawn');
        break;
      }
      case 'enemyWindup': break; // warm flash handled by render state
      case 'flop': {
        spawnParticles(e.x, e.y, 18, { spread: Math.PI * 2, speed: 300, color: '#5b4a36', maxLife: 0.5, size: 5, gravity: 220 });
        addDecal(e.x, e.y, 'crater', 0, 1.1);
        spawnRipple(e.x, e.y + 10, 110, 0.7);
        addTrauma(TRAUMA_HEAVY);
        sfx('flop');
        break;
      }
      case 'nibbleHit': sfx('nibble'); break;
      case 'frogHurt': {
        spawnParticles(e.x, e.y, 10, { spread: Math.PI * 2, speed: 260, color: PINK, maxLife: 0.4, size: 4 });
        addTrauma(TRAUMA_HEAVY);
        sfx('hurt');
        break;
      }
      case 'frogDown': {
        addTrauma(TRAUMA_MAX);
        feel.zoomPulse = 1;
        sfx('death');
        break;
      }
      case 'dash': {
        spawnParticles(e.x - e.dirX * 20, e.y - e.dirY * 20, 8, { angle: Math.atan2(-e.dirY, -e.dirX), spread: 0.8, speed: 180, color: '#cfe8dd', maxLife: 0.3, size: 3 });
        spawnRipple(e.x, e.y + 14, 70, 0.6);
        sfx('dash');
        break;
      }
      case 'hop': {
        spawnParticles(e.x, e.y + 18, 2, { spread: Math.PI, angle: Math.PI, speed: 60, color: '#3d5a4e', maxLife: 0.3, size: 2 });
        spawnRipple(e.x, e.y + 16, 40, 0.55);
        sfx('hop');
        break;
      }
      case 'tongueOut': sfx('tongueOut'); break;
      case 'tongueSnap': {
        spawnParticles(e.x, e.y, 8, { spread: Math.PI * 2, speed: 200, color: PINK, maxLife: 0.3, size: 3 });
        sfx('tongueSnap');
        break;
      }
      case 'pip': {
        spawnParticles(e.x, e.y, 3, { spread: Math.PI * 2, speed: 80, color: GOLD, maxLife: 0.3, size: 2, glow: true });
        sfx('pip');
        break;
      }
      case 'essenceDrop': break;
    }
  });
}

function onKill(e: SimEvent): void {
  const ang = Math.atan2(e.dirY, e.dirX);
  addTrauma(TRAUMA_KILL);
  if (e.overkill) {
    // burst of glowing jelly, then dissolve to a sludge puddle + water ripple
    spawnParticles(e.x, e.y, 26, { spread: Math.PI * 2, speed: 420, color: SLUDGE, maxLife: 0.7, size: 6, gravity: 320, drag: 2.5 });
    spawnParticles(e.x, e.y, 10, { spread: Math.PI * 2, speed: 300, color: GEL, maxLife: 0.6, size: 7, gravity: 280, glow: true });
    addDecal(e.x, e.y, 'gel', ang, 0.75);
    spawnRipple(e.x, e.y + 8, 80, 0.7);
    sfx('gib');
  } else {
    spawnParticles(e.x, e.y, 12, { spread: Math.PI * 2, speed: 280, color: SLUDGE, maxLife: 0.5, size: 4, gravity: 280, drag: 3 });
    spawnParticles(e.x, e.y, 6, { spread: Math.PI * 2, speed: 180, color: GEL, maxLife: 0.45, size: 4, glow: true });
    addDecal(e.x, e.y, 'gel', ang, e.kind === 'gloopa' ? 0.7 : 0.5);
    spawnRipple(e.x, e.y + 8, 55, 0.6);
    sfx('kill');
  }
}
