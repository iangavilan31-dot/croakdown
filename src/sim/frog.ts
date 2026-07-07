// Frog update: hop movement, dash-hop (i-frames), the sword attack state machine
// (buffer / chain / cancel / hold-heavy), and the tier-1 tongue.
// Contract: design/3 Gameplay/Combat System.md + Movement and Controls.md.
// Hold-heavy model (Decision 2026-07-07): lights fire INSTANTLY on press; holding
// ≥250 ms charges the heavy (windup holds at the top until release).

import {
  DT, FROG_SPEED, FROG_ACCEL_MS, FROG_RADIUS, DASH_DIST, DASH_TIME, DASH_CHARGES,
  DASH_RECHARGE, INPUT_BUFFER_TICKS, RECOIL_HOP,
  ARENA_W, ARENA_H, ARENA_MARGIN, MAGNETISM_ANGLE,
} from '../data/constants';
import { STICK_CHAIN, STICK_HEAVY, CHAIN_WINDOW_TICKS, TONGUE } from '../data/weapons';
import { ENEMIES } from '../data/enemies';
import type { Enemy, Frog, SimInput, World } from './types';
import { emit } from './events';
import { applyMeleeHit, attackerHitstop, swingHitstop } from './combat';

const STEER_LIMIT = (30 * Math.PI) / 180;
const scratch: Enemy[] = [];

function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function updateFrog(w: World, inp: SimInput): void {
  const f = w.frog;
  if (!f.alive) return;

  // --- buffers & timers tick even during hitstop (buffered inputs must register) ---
  if (inp.attackEdge) f.attackBufT = INPUT_BUFFER_TICKS;
  else if (f.attackBufT > 0) f.attackBufT--;
  if (inp.dashEdge) f.dashBufT = INPUT_BUFFER_TICKS;
  else if (f.dashBufT > 0) f.dashBufT--;
  f.attackHeldTicks = inp.attackHeld ? f.attackHeldTicks + 1 : 0;
  if (f.chainWindowT > 0) f.chainWindowT--;
  if (f.iframesT > 0) f.iframesT -= DT;
  if (f.hurtFlashT > 0) f.hurtFlashT -= DT;
  if (f.tCd > 0) f.tCd -= DT;
  if (f.dashCharges < DASH_CHARGES) {
    f.dashRegenT -= DT;
    if (f.dashRegenT <= 0) { f.dashCharges++; f.dashRegenT = DASH_RECHARGE; }
  }

  // --- attacker hitstop: freeze everything else ---
  if (f.freeze > 0) { f.freeze--; return; }

  // --- aim ---
  const dx = inp.aimX - f.x, dy = inp.aimY - f.y;
  if (dx * dx + dy * dy > 4) f.aim = Math.atan2(dy, dx);

  // --- tongue ---
  updateTongue(w, f, inp);

  // --- attack state machine ---
  updateAttack(w, f, inp);

  // --- dash ---
  const atk = f.attack;
  const canDashCancel =
    atk.phase === 'none' || atk.phase === 'recovery' || atk.phase === 'follow' ||
    (atk.phase === 'heavywindup' && atk.frame < 8);
  if (f.dashBufT > 0 && f.dashCharges > 0 && f.dashT <= 0 && canDashCancel) {
    f.dashBufT = 0;
    f.dashCharges--;
    if (f.dashCharges < DASH_CHARGES && f.dashRegenT <= 0) f.dashRegenT = DASH_RECHARGE;
    f.dashT = DASH_TIME;
    const len = Math.hypot(inp.mx, inp.my);
    if (len > 0.01) { f.dashDirX = inp.mx / len; f.dashDirY = inp.my / len; }
    else { f.dashDirX = Math.cos(f.aim); f.dashDirY = Math.sin(f.aim); }
    if (atk.phase === 'recovery' || atk.phase === 'follow' || atk.phase === 'heavywindup') {
      atk.phase = 'none'; // dash cancels recovery (always) — Combat System law
    }
    emit(w, 'dash', f.x, f.y, { dirX: f.dashDirX, dirY: f.dashDirY });
  }

  // --- movement ---
  if (f.dashT > 0) {
    f.dashT -= DT;
    const speed = DASH_DIST / DASH_TIME;
    f.vx = f.dashDirX * speed;
    f.vy = f.dashDirY * speed;
  } else {
    // attack phases slow movement, never lock it (wading through crowds is the game)
    let mult = 1;
    if (atk.phase === 'windup' || atk.phase === 'active') mult = 0.35;
    else if (atk.phase === 'follow') mult = 0.5;
    else if (atk.phase === 'recovery') mult = 0.6;
    else if (atk.phase === 'heavywindup' || atk.phase === 'heavyhold') mult = 0.25;
    const len = Math.hypot(inp.mx, inp.my);
    if (len > 0.01) {
      const tx = (inp.mx / len) * FROG_SPEED * mult;
      const ty = (inp.my / len) * FROG_SPEED * mult;
      const accel = FROG_SPEED / (FROG_ACCEL_MS / 1000);
      const ax = tx - f.vx, ay = ty - f.vy;
      const alen = Math.hypot(ax, ay);
      const step = accel * DT;
      if (alen <= step) { f.vx = tx; f.vy = ty; }
      else { f.vx += (ax / alen) * step; f.vy += (ay / alen) * step; }
      f.hopPhase += (len * mult * DT * 7) % 1;
      if (f.hopPhase >= 1) { f.hopPhase -= 1; emit(w, 'hop', f.x, f.y); }
    } else { f.vx = 0; f.vy = 0; } // instant stop (survivor precision)
  }
  f.x += f.vx * DT;
  f.y += f.vy * DT;
  f.x = Math.max(ARENA_MARGIN + FROG_RADIUS, Math.min(ARENA_W - ARENA_MARGIN - FROG_RADIUS, f.x));
  f.y = Math.max(ARENA_MARGIN + FROG_RADIUS, Math.min(ARENA_H - ARENA_MARGIN - FROG_RADIUS, f.y));
}

export function frogDashIframes(f: Frog): boolean {
  if (f.dashT <= 0) return false;
  const t = DASH_TIME - f.dashT;
  return t >= 2 / 60 && t <= 9 / 60;
}

// ---------------------------------------------------------------- attack machine

function startChainAttack(w: World, f: Frog): void {
  const atk = f.attack;
  if (f.chainWindowT <= 0) atk.chainIdx = 0;
  atk.data = STICK_CHAIN[atk.chainIdx];
  atk.phase = 'windup';
  atk.frame = 0;
  atk.baseAngle = f.aim;
  atk.angle = f.aim;
  atk.swingId = ++w.swingCounter;
  atk.victims = 0;
  atk.didRecoil = false;
  f.attackBufT = 0;
  emit(w, 'swing', f.x, f.y, { cls: atk.data.cls });
}

/** Held past the light's windup → the swing upgrades into the greatsword heavy.
 *  Tap-vs-hold disambiguation (Decision 2026-07-07): the light windup is shared
 *  anticipation; releasing before it ends commits the light, holding through it
 *  charges the heavy. Taps stay instant/spammy; the heavy is a deliberate charge. */
function upgradeToHeavy(w: World, f: Frog): void {
  const atk = f.attack;
  atk.data = STICK_HEAVY;
  atk.phase = 'heavywindup';
  atk.frame = 0;
  atk.swingId = ++w.swingCounter; // fresh swing so victims re-register for the heavy arc
  atk.victims = 0;
  atk.didRecoil = false;
  emit(w, 'swingHeavy', f.x, f.y, { cls: 'heavy' });
}

/** Enter active on the SAME tick the windup completes — no wasted handoff frame. */
function enterActive(w: World, f: Frog): void {
  const atk = f.attack;
  atk.phase = 'active';
  atk.frame = 0;
  magnetizeSwing(w, f);
  resolveSwingHits(w, f);
}

function updateAttack(w: World, f: Frog, inp: SimInput): void {
  const atk = f.attack;

  // steering: aim may drift ±30° from baseAngle during any windup
  if (atk.phase === 'windup' || atk.phase === 'heavywindup' || atk.phase === 'heavyhold') {
    const d = angDiff(f.aim, atk.baseAngle);
    atk.angle = atk.baseAngle + Math.max(-STEER_LIMIT, Math.min(STEER_LIMIT, d));
  }

  switch (atk.phase) {
    case 'none': {
      if (f.attackBufT > 0) startChainAttack(w, f);
      break;
    }
    case 'windup': {
      atk.frame++;
      if (atk.frame >= atk.data!.windup) {
        // decision point: still holding -> heavy; released -> commit the light
        if (inp.attackHeld) upgradeToHeavy(w, f);
        else enterActive(w, f);
      }
      break;
    }
    case 'heavywindup': {
      atk.frame++;
      if (atk.frame >= atk.data!.windup) { atk.phase = 'heavyhold'; atk.frame = 0; }
      break;
    }
    case 'heavyhold': {
      atk.frame++;
      if (!inp.attackHeld || atk.frame > 90) enterActive(w, f); // release fires; 1.5 s max hang
      break;
    }
    case 'active': {
      atk.frame++;
      if (atk.frame >= atk.data!.active) { atk.phase = 'follow'; atk.frame = 0; }
      else resolveSwingHits(w, f);
      break;
    }
    case 'follow': {
      atk.frame++;
      if (atk.frame >= atk.data!.follow) { atk.phase = 'recovery'; atk.frame = 0; }
      break;
    }
    case 'recovery': {
      atk.frame++;
      // chain cancel after cancelFrom (tap during recovery -> next swing)
      if (f.attackBufT > 0 && atk.frame >= atk.data!.cancelFrom) {
        atk.chainIdx = (atk.chainIdx + 1) % STICK_CHAIN.length;
        f.chainWindowT = CHAIN_WINDOW_TICKS;
        startChainAttack(w, f);
        break;
      }
      if (atk.frame >= atk.data!.recovery) {
        atk.phase = 'none';
        atk.frame = 0;
        atk.chainIdx = (atk.chainIdx + 1) % STICK_CHAIN.length;
        f.chainWindowT = CHAIN_WINDOW_TICKS;
      }
      break;
    }
  }
}

/** Soft magnetism: snap swing center to nearest enemy within reach and ±20° (Combat System). */
function magnetizeSwing(w: World, f: Frog): void {
  const atk = f.attack;
  const reach = atk.data!.reach;
  w.hash.query(f.x, f.y, reach + 60, scratch);
  let best: Enemy | null = null;
  let bestAbs = MAGNETISM_ANGLE;
  for (let i = 0; i < scratch.length; i++) {
    const e = scratch[i];
    if (!e.alive) continue;
    const d = Math.hypot(e.x - f.x, e.y - f.y);
    if (d > reach + ENEMIES[e.kind].radius) continue;
    const da = Math.abs(angDiff(Math.atan2(e.y - f.y, e.x - f.x), atk.angle));
    if (da < bestAbs) { bestAbs = da; best = e; }
  }
  if (best) atk.angle = Math.atan2(best.y - f.y, best.x - f.x);
}

/** Query the arc each active frame; new entrants get hit once per swing. */
function resolveSwingHits(w: World, f: Frog): void {
  const atk = f.attack;
  const data = atk.data!;
  w.hash.query(f.x, f.y, data.reach + 60, scratch);
  let newHits = 0;
  let maxVictimFrames = 0;
  for (let i = 0; i < scratch.length; i++) {
    const e = scratch[i];
    if (!e.alive || e.lastSwingHit === atk.swingId) continue;
    const ex = e.x - f.x, ey = e.y - f.y;
    const dist = Math.hypot(ex, ey);
    const r = ENEMIES[e.kind].radius;
    if (dist > data.reach + r) continue;
    const da = Math.abs(angDiff(Math.atan2(ey, ex), atk.angle));
    if (da > data.arc / 2 + Math.atan2(r, Math.max(1, dist))) continue;

    e.lastSwingHit = atk.swingId;
    const dirX = dist > 0.01 ? ex / dist : Math.cos(atk.angle);
    const dirY = dist > 0.01 ? ey / dist : Math.sin(atk.angle);
    const res = applyMeleeHit(w, e, data.damage, data.impulse, data.cls, dirX, dirY, atk.victims);
    const vf = swingHitstop(data.cls, atk.victims, res.killed);
    maxVictimFrames = Math.max(maxVictimFrames, res.armored ? 2 : vf);
    atk.victims++;
    newHits++;
    if (res.reflected) hurtFrog(w, f, 5, -dirX, -dirY);
  }
  if (newHits > 0) {
    f.freeze = Math.max(f.freeze, attackerHitstop(maxVictimFrames));
    if (!atk.didRecoil) {
      atk.didRecoil = true;
      f.x -= Math.cos(atk.angle) * RECOIL_HOP;
      f.y -= Math.sin(atk.angle) * RECOIL_HOP;
    }
  }
}

// ---------------------------------------------------------------- tongue (tier 1)

function updateTongue(w: World, f: Frog, inp: SimInput): void {
  if (f.tState === 'idle') {
    if (inp.tongueEdge && f.tCd <= 0) {
      f.tState = 'out';
      f.tT = 0;
      f.tAngle = f.aim;
      f.tTarget = null;
      f.tCd = TONGUE.cooldown;
      emit(w, 'tongueOut', f.x, f.y, { dirX: Math.cos(f.aim), dirY: Math.sin(f.aim) });
    }
    return;
  }
  f.tT += DT;
  if (f.tState === 'out') {
    const prog = Math.min(1, f.tT / TONGUE.outTime);
    f.tTipX = f.x + Math.cos(f.tAngle) * TONGUE.reach * prog;
    f.tTipY = f.y + Math.sin(f.tAngle) * TONGUE.reach * prog;
    // first enemy near the tip gets grabbed
    w.hash.query(f.tTipX, f.tTipY, 46, scratch);
    for (let i = 0; i < scratch.length; i++) {
      const e = scratch[i];
      if (!e.alive || e.state === 'tumble') continue;
      const d = Math.hypot(e.x - f.tTipX, e.y - f.tTipY);
      if (d < ENEMIES[e.kind].radius + 22) {
        if (ENEMIES[e.kind].mass <= TONGUE.pullMassMax) {
          f.tTarget = e;
          e.state = 'pulled';
          e.pullT = 0;
          if (e.kind === 'spikeblob') e.spikesOut = false; // pull retracts spikes (safe pull counter)
          emit(w, 'tongueSnap', e.x, e.y, { kind: e.kind });
        }
        f.tState = 'back';
        f.tT = 0;
        return;
      }
    }
    if (prog >= 1) { f.tState = 'back'; f.tT = 0; }
  } else {
    // back
    const prog = Math.min(1, f.tT / TONGUE.backTime);
    const e = f.tTarget;
    if (e && e.alive && e.state === 'pulled') {
      // pull enemy toward frog, land at pullToRange
      const targX = f.x + Math.cos(f.tAngle) * TONGUE.pullToRange;
      const targY = f.y + Math.sin(f.tAngle) * TONGUE.pullToRange;
      e.x += (targX - e.x) * Math.min(1, prog * 1.6);
      e.y += (targY - e.y) * Math.min(1, prog * 1.6);
      f.tTipX = e.x; f.tTipY = e.y;
      if (prog >= 1) {
        e.state = 'seek';
        e.stunT = TONGUE.stun; // arrives stunned — the pull-into-swing window
        e.vx = 0; e.vy = 0;
      }
    } else {
      f.tTipX = f.x + Math.cos(f.tAngle) * TONGUE.reach * (1 - prog);
      f.tTipY = f.y + Math.sin(f.tAngle) * TONGUE.reach * (1 - prog);
    }
    if (prog >= 1) { f.tState = 'idle'; f.tTarget = null; }
  }
}

// ---------------------------------------------------------------- damage to frog

export function hurtFrog(w: World, f: Frog, dmg: number, dirX: number, dirY: number): void {
  if (!f.alive || f.iframesT > 0 || frogDashIframes(f)) return;
  f.hp -= dmg;
  f.iframesT = 0.3;
  f.hurtFlashT = 0.15;
  f.vx += dirX * 220;
  f.vy += dirY * 220;
  emit(w, 'frogHurt', f.x, f.y, { a: dmg, dirX, dirY });
  if (f.hp <= 0) {
    f.hp = 0;
    f.alive = false;
    w.gameOver = true;
    emit(w, 'frogDown', f.x, f.y);
  }
}
