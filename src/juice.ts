// CROAKDOWN juice pipeline — hitstop, trauma shake, flashes, particles, decals, floaters.
// BRIEF §7.4. Victim-sprite shake during hitstop; hurtboxes never move (Sakurai law).

import { Pool } from './sim';

export const juice = {
  hitstopFrames: 0,
  trauma: 0,           // 0..1, shake = trauma^2
  shakeSlider: 1,      // player-adjustable
  flashTimer: 0,       // full-screen white on big events (kept subtle)
  zoomPulse: 0,        // boss-phase micro zoom
};

export function addHitstop(frames: number) { juice.hitstopFrames = Math.max(juice.hitstopFrames, frames); }
export function addTrauma(amount: number) { juice.trauma = Math.min(1, juice.trauma + amount); }

export function shakeOffset(time: number): [number, number] {
  const s = juice.trauma * juice.trauma * 14 * juice.shakeSlider;
  if (s < 0.1) return [0, 0];
  return [
    s * (Math.sin(time * 91.7) + Math.sin(time * 47.3) * 0.6),
    s * (Math.cos(time * 83.1) + Math.cos(time * 53.9) * 0.6),
  ];
}

export function decayJuice(dt: number) {
  juice.trauma = Math.max(0, juice.trauma - dt * 1.6);
  juice.flashTimer = Math.max(0, juice.flashTimer - dt);
  juice.zoomPulse = Math.max(0, juice.zoomPulse - dt * 2);
}

// ---------- particles (pooled, hard cap) ----------
export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string;
  gravity: number; drag: number; glow: boolean;
}
const PARTICLE_CAP = 600;
export const particles: Particle[] = [];
const pPool = new Pool<Particle>(() => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', gravity: 0, drag: 0, glow: false }), 200);

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

// ---------- permanence decals (bones, torn lilies, scorch) ----------
export interface Decal { x: number; y: number; kind: 'bones' | 'lily' | 'scorch' | 'stain'; rot: number; scale: number; age: number }
const DECAL_CAP = 200;
export const decals: Decal[] = [];
export function addDecal(x: number, y: number, kind: Decal['kind']) {
  if (decals.length >= DECAL_CAP) decals.shift(); // oldest fades out of the record
  decals.push({ x, y, kind, rot: Math.random() * Math.PI * 2, scale: 0.8 + Math.random() * 0.5, age: 0 });
}

// ---------- floaters (essence pips / symbiosis bursts — art, not text) ----------
export interface Floater { x: number; y: number; vy: number; life: number; color: string; size: number }
export const floaters: Floater[] = [];
export function addFloater(x: number, y: number, color: string, size = 4) {
  if (floaters.length > 80) floaters.shift();
  floaters.push({ x, y, vy: -40, life: 0.7, color, size });
}
export function updateFloaters(dt: number) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.life -= dt; f.y += f.vy * dt; f.vy *= 0.94;
    if (f.life <= 0) { floaters[i] = floaters[floaters.length - 1]; floaters.pop(); }
  }
}
