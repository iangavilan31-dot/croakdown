// Frog update: hop movement, dash flavors, the sword attack state machine
// (buffer / chain / cancel / hold-heavy), universal tongue, and the KIT layer —
// each frog is a toolkit (swing + dash + signature + passive) with combo rules:
// dash-cancel keeps a heavy charge, grab feeds yeet, trails feed detonation.
// Contract: design/3 Gameplay/Combat System.md + tonight's KITS brief.

import {
  DT, FROG_ACCEL_MS, FROG_RADIUS, DASH_DIST, DASH_TIME,
  INPUT_BUFFER_TICKS, RECOIL_HOP,
  ARENA_W, ARENA_H, ARENA_MARGIN, MAGNETISM_ANGLE,
} from '../data/constants';
import { CHAIN_WINDOW_TICKS, TONGUE, type AttackData } from '../data/weapons';
import { ENEMIES } from '../data/enemies';
import {
  KITS, BACKSTAB_MULT, DECOY_LIFE, SLAM_DMG, SLAM_R, SLAM_IMPULSE,
  YEET_SPEED, YEET_DMG,
} from '../data/kits';
import type { Enemy, Frog, SimInput, World } from './types';
import { emit } from './events';
import { applyMeleeHit, attackerHitstop, swingHitstop } from './combat';
import { spawnDecoy, spawnGlob, spawnZone, tryDetonateZones } from './world';

const STEER_LIMIT = (30 * Math.PI) / 180;
const scratch: Enemy[] = [];

function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Item- and kit-scaled attack data (allocation-free: reuses a scratch struct). */
const atkScratch: AttackData = { id: '', windup: 0, active: 0, follow: 0, recovery: 0, cancelFrom: 0, damage: 0, impulse: 0, arc: 0, reach: 0, cls: 'light' };
function scaledAtk(f: Frog, base: AttackData): AttackData {
  const s = f.stat;
  atkScratch.id = base.id;
  atkScratch.windup = base.windup; atkScratch.active = base.active;
  atkScratch.follow = base.follow; atkScratch.recovery = base.recovery;
  atkScratch.cancelFrom = base.cancelFrom;
  atkScratch.damage = base.damage * s.dmg;
  atkScratch.impulse = base.impulse * s.impulse;
  atkScratch.arc = Math.min(Math.PI * 1.9, base.arc * s.arc);
  atkScratch.reach = base.reach * s.reach;
  atkScratch.cls = base.cls;
  atkScratch.superArmor = base.superArmor;
  return atkScratch;
}

export function updateFrog(w: World, f: Frog, inp: SimInput): void {
  if (!f.alive || f.downed) return;
  const kit = KITS[f.kit];

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
  if (f.sigCd > 0) f.sigCd -= DT;
  if (f.slingT > 0) f.slingT -= DT;
  if (f.dashCharges < f.stat.maxDash) {
    f.dashRegenT -= DT;
    if (f.dashRegenT <= 0) { f.dashCharges++; f.dashRegenT = f.stat.dashRegen; }
  }

  // --- attacker hitstop: freeze everything else ---
  if (f.freeze > 0) { f.freeze--; return; }

  // --- aim ---
  const dx = inp.aimX - f.x, dy = inp.aimY - f.y;
  if (dx * dx + dy * dy > 4) f.aim = Math.atan2(dy, dx);

  // --- signature (kit identity move) + universal tongue ---
  updateSignature(w, f, inp);
  updateTongue(w, f, inp);
  updateGrab(w, f);

  // --- attack state machine ---
  updateAttack(w, f, inp);

  // --- dash (kit-flavored) ---
  const atk = f.attack;
  const canDashCancel =
    atk.phase === 'none' || atk.phase === 'recovery' || atk.phase === 'follow' ||
    atk.phase === 'heavywindup' || atk.phase === 'heavyhold';
  if (f.dashBufT > 0 && f.dashCharges > 0 && f.dashT <= 0 && canDashCancel) {
    f.dashBufT = 0;
    f.dashCharges--;
    if (f.dashCharges < f.stat.maxDash && f.dashRegenT <= 0) f.dashRegenT = f.stat.dashRegen;
    f.dashT = DASH_TIME * (kit.dashKind === 'zip' ? 1.25 : 1);
    f.dashId = ++w.swingCounter;
    const len = Math.hypot(inp.mx, inp.my);
    if (kit.dashKind === 'zip') {
      // zip: dash goes where you AIM (tongue-hunter mobility), not where you walk
      f.dashDirX = Math.cos(f.aim); f.dashDirY = Math.sin(f.aim);
      if (len > 0.01) { f.dashDirX = inp.mx / len; f.dashDirY = inp.my / len; } // stick overrides
    } else if (len > 0.01) { f.dashDirX = inp.mx / len; f.dashDirY = inp.my / len; }
    else { f.dashDirX = Math.cos(f.aim); f.dashDirY = Math.sin(f.aim); }
    // COMBO LAW: dash-cancel KEEPS a heavy charge — heavywindup/hold survive the dash
    if (atk.phase === 'recovery' || atk.phase === 'follow') { atk.phase = 'none'; }
    emit(w, 'dash', f.x, f.y, { dirX: f.dashDirX, dirY: f.dashDirY, kind: 'frog' });
  }

  // --- movement ---
  if (f.dashT > 0) {
    f.dashT -= DT;
    const speed = (DASH_DIST / DASH_TIME) * (f.slingT > 0 ? 1.4 : 1);
    f.vx = f.dashDirX * speed;
    f.vy = f.dashDirY * speed;
    applyDashFlavor(w, f, kit.dashKind);
  } else {
    // attack phases slow movement, never lock it (wading through crowds is the game)
    let mult = 1;
    if (atk.phase === 'windup' || atk.phase === 'active') mult = 0.35;
    else if (atk.phase === 'follow') mult = 0.5;
    else if (atk.phase === 'recovery') mult = 0.6;
    else if (atk.phase === 'heavywindup' || atk.phase === 'heavyhold') mult = 0.25;
    if (f.sigT > 0) mult = 0;                 // slam crouch roots
    const len = Math.hypot(inp.mx, inp.my);
    if (len > 0.01) {
      const tx = (inp.mx / len) * kit.speed * mult;
      const ty = (inp.my / len) * kit.speed * mult;
      const accel = kit.speed / (FROG_ACCEL_MS / 1000);
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

function applyDashFlavor(w: World, f: Frog, kind: 'bull' | 'zip' | 'sporetrail'): void {
  if (kind === 'bull') {
    // bull splash: shove enemies out of the lane (no damage — a door, not a blender)
    w.hash.query(f.x, f.y, 90, scratch);
    for (const e of scratch) {
      if (!e.alive || e.state === 'tumble') continue;
      const d = Math.hypot(e.x - f.x, e.y - f.y);
      if (d < ENEMIES[e.kind].radius + FROG_RADIUS + 8) {
        const dl = Math.max(1, d);
        e.vx += ((e.x - f.x) / dl) * 300 + f.dashDirX * 160;
        e.vy += ((e.y - f.y) / dl) * 300 + f.dashDirY * 160;
        e.stunT = Math.max(e.stunT, 0.12);
      }
    }
  } else if (kind === 'sporetrail') {
    // morel: the wake is a poison ribbon (S3 fuel)
    f.trailAcc += Math.hypot(f.vx, f.vy) * DT;
    if (f.trailAcc > 55) {
      f.trailAcc = 0;
      spawnZone(w, 'poison', f.index, f.x - f.dashDirX * 20, f.y - f.dashDirY * 20, 44, 3.0);
    }
  }
  // wake ripper (item): the dash wake cuts
  if (f.items.wakeripper) {
    w.hash.query(f.x, f.y, 70, scratch);
    for (const e of scratch) {
      if (!e.alive || e.lastSwingHit === f.dashId) continue;
      if (Math.hypot(e.x - f.x, e.y - f.y) < ENEMIES[e.kind].radius + FROG_RADIUS) {
        e.lastSwingHit = f.dashId;
        applyMeleeHit(w, e, 8, 200, 'light', f.dashDirX, f.dashDirY, 0, f);
      }
    }
  }
}

export function frogDashIframes(f: Frog): boolean {
  if (f.dashT <= 0) return false;
  const t = DASH_TIME - f.dashT;
  return t >= 2 / 60 && t <= 9 / 60;
}

// ---------------------------------------------------------------- signatures
function updateSignature(w: World, f: Frog, inp: SimInput): void {
  const kit = KITS[f.kit];
  // warden slam: crouch beat, then the pond breaks
  if (f.sigT > 0) {
    f.sigT -= DT;
    if (f.sigT <= 0 && f.kit === 'warden') {
      w.hash.query(f.x, f.y, SLAM_R + 80, scratch);
      for (const e of scratch) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - f.x, e.y - f.y);
        if (d < SLAM_R + ENEMIES[e.kind].radius) {
          const dl = Math.max(1, d);
          applyMeleeHit(w, e, SLAM_DMG, SLAM_IMPULSE, 'heavy', (e.x - f.x) / dl, (e.y - f.y) / dl, 0, f);
        }
      }
      if (f.items.seismicplates) spawnZone(w, 'crater', f.index, f.x, f.y, SLAM_R * 0.8, 4);
      emit(w, 'slam', f.x, f.y, { a: SLAM_R });
      f.freeze = Math.max(f.freeze, 6);
    }
    return;
  }
  if (!inp.sigEdge || f.sigCd > 0) return;

  if (f.kit === 'warden') {
    f.sigCd = kit.sigCooldown;
    f.sigT = 0.22;                         // the crouch — anticipation before the break
    emit(w, 'swingHeavy', f.x, f.y, { cls: 'heavy' });
  } else if (f.kit === 'morel') {
    f.sigCd = kit.sigCooldown;
    spawnDecoy(w, f.index, f.x, f.y, (f.items.nightcap ? 1.6 : 1) * 240, DECOY_LIFE);
    f.iframesT = Math.max(f.iframesT, 1.2);  // slip away while they converge
    f.slingT = 0.35;                          // brief speed surge
  }
  // snapper's signature IS the tongue — handled in updateTongue (cooldown from kit)
}

// ---------------------------------------------------------------- grab & yeet (snapper)
function updateGrab(w: World, f: Frog): void {
  const e = f.grabbed;
  if (!e) return;
  if (!e.alive) { f.grabbed = null; return; }
  f.grabT -= DT;
  // held at the frog's hip, squirming
  e.state = 'grabbed';
  e.x = f.x + Math.cos(f.aim + 2.2) * 42;
  e.y = f.y + Math.sin(f.aim + 2.2) * 42;
  e.vx = 0; e.vy = 0;
  if (f.grabT <= 0) {
    e.state = 'seek'; e.stunT = 0.3;
    f.grabbed = null;
  }
}

/** Buffered attack while holding a grab = YEET: the enemy becomes the projectile. */
function tryYeet(w: World, f: Frog): boolean {
  const e = f.grabbed;
  if (!e || !e.alive) return false;
  f.grabbed = null;
  e.state = 'tumble';
  e.stateF = 0;
  e.tumbleT = 0.8;
  e.tumbleSrcDmg = YEET_DMG;
  e.launchedBy = f.index;
  e.yeeted = true;
  e.spin = 14;
  e.vx = Math.cos(f.aim) * YEET_SPEED;
  e.vy = Math.sin(f.aim) * YEET_SPEED;
  e.x = f.x + Math.cos(f.aim) * 30;
  e.y = f.y + Math.sin(f.aim) * 30;
  f.attackBufT = 0;
  emit(w, 'yeet', f.x, f.y, { dirX: Math.cos(f.aim), dirY: Math.sin(f.aim), kind: e.kind });
  return true;
}

// ---------------------------------------------------------------- attack machine

function startChainAttack(w: World, f: Frog): void {
  const kit = KITS[f.kit];
  const atk = f.attack;
  if (f.chainWindowT <= 0) atk.chainIdx = 0;
  atk.data = { ...scaledAtk(f, kit.chain[atk.chainIdx]) };
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

function upgradeToHeavy(w: World, f: Frog): void {
  const atk = f.attack;
  atk.data = { ...scaledAtk(f, KITS[f.kit].heavy) };
  atk.phase = 'heavywindup';
  atk.frame = 0;
  atk.swingId = ++w.swingCounter;
  atk.victims = 0;
  atk.didRecoil = false;
  emit(w, 'swingHeavy', f.x, f.y, { cls: 'heavy' });
}

function enterActive(w: World, f: Frog): void {
  const atk = f.attack;
  atk.phase = 'active';
  atk.frame = 0;
  magnetizeSwing(w, f);
  resolveSwingHits(w, f);
  // echo edge: the chain finisher hurls a cutting crescent
  if (f.items.echoedge && atk.data && atk.data.cls === 'medium') {
    const g = ++w.swingCounter;
    spawnGlob(w, f.index, f.x + Math.cos(atk.angle) * 40, f.y + Math.sin(atk.angle) * 40,
      f.x + Math.cos(atk.angle) * 560, f.y + Math.sin(atk.angle) * 560, 14, 0, 900, 3);
    w.globs[w.globs.length - 1].lastHit = g;
  }
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
      if (f.attackBufT > 0) {
        if (tryYeet(w, f)) break;           // grab in hand -> the enemy IS the swing
        startChainAttack(w, f);
      }
      break;
    }
    case 'windup': {
      atk.frame++;
      if (atk.frame >= atk.data!.windup) {
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
      if (f.dashT > 0) break;               // dash-cancel carries the charge (combo law)
      if (!inp.attackHeld || atk.frame > 90) enterActive(w, f);
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
      if (f.attackBufT > 0 && atk.frame >= atk.data!.cancelFrom) {
        atk.chainIdx = (atk.chainIdx + 1) % KITS[f.kit].chain.length;
        f.chainWindowT = CHAIN_WINDOW_TICKS;
        if (tryYeet(w, f)) break;
        startChainAttack(w, f);
        break;
      }
      if (atk.frame >= atk.data!.recovery) {
        atk.phase = 'none';
        atk.frame = 0;
        atk.chainIdx = (atk.chainIdx + 1) % KITS[f.kit].chain.length;
        f.chainWindowT = CHAIN_WINDOW_TICKS;
      }
      break;
    }
  }
}

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
    let dmg = data.damage;
    // morel passive: backstab bites x1.8 (victim facing away from the blow)
    if (f.kit === 'morel') {
      const facingDot = Math.cos(e.facing) * dirX + Math.sin(e.facing) * dirY;
      if (facingDot > 0.35) dmg *= BACKSTAB_MULT;
    }
    const res = applyMeleeHit(w, e, dmg, data.impulse, data.cls, dirX, dirY, atk.victims, f);
    const vf = swingHitstop(data.cls, atk.victims, res.killed);
    maxVictimFrames = Math.max(maxVictimFrames, res.armored ? 2 : vf);
    atk.victims++;
    newHits++;
    // S3: the OTHER frog's poison detonates under this hit
    tryDetonateZones(w, f.index, e.x, e.y);
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

// ---------------------------------------------------------------- tongue
// Universal reach tool; for SNAPPER it is the signature (short cooldown, grabs
// feed yeet, and it can YANK THE PARTNER out of danger — S2).

function tongueCooldown(f: Frog): number {
  return f.kit === 'snapper' ? KITS.snapper.sigCooldown : TONGUE.cooldown;
}

function updateTongue(w: World, f: Frog, inp: SimInput): void {
  const reach = TONGUE.reach * f.stat.tongueReach;
  if (f.tState === 'idle') {
    // UNIVERSAL tongue on its own button; the snapper's signature is a super-tongue
    // (short cooldown, grabs feed yeet) so its sig button fires it too.
    const wants = inp.tongueEdge || (f.kit === 'snapper' && !!inp.sigEdge);
    if (wants && f.tCd <= 0 && !f.grabbed) {
      f.tState = 'out';
      f.tT = 0;
      f.tAngle = f.aim;
      f.tTarget = null;
      f.tPartner = false;
      f.tCd = tongueCooldown(f);
      // partner yank check (S2): partner in the cone and not right next to us
      const partner = w.frogs.find((o) => o !== f && o.alive);
      if (partner) {
        const pd = Math.hypot(partner.x - f.x, partner.y - f.y);
        const pa = Math.abs(angDiff(Math.atan2(partner.y - f.y, partner.x - f.x), f.aim));
        const anyRange = !!f.items.longleash;
        if (pd > 130 && pa < 0.35 && (anyRange || pd < reach)) {
          f.tPartner = true;
          if (f.items.longleash) f.tCd *= 0.5;
        }
      }
      emit(w, 'tongueOut', f.x, f.y, { dirX: Math.cos(f.aim), dirY: Math.sin(f.aim) });
    }
    return;
  }
  f.tT += DT;
  if (f.tState === 'out') {
    const prog = Math.min(1, f.tT / TONGUE.outTime);
    f.tTipX = f.x + Math.cos(f.tAngle) * reach * prog;
    f.tTipY = f.y + Math.sin(f.tAngle) * reach * prog;
    if (f.tPartner) {
      const partner = w.frogs.find((o) => o !== f && o.alive);
      if (partner && Math.hypot(partner.x - f.tTipX, partner.y - f.tTipY) < 70) {
        // latched: the partner flies to us (i-frames), or SLINGSHOTS if holding attack
        f.tState = 'back'; f.tT = 0;
        partner.iframesT = Math.max(partner.iframesT, 0.6);
        if (partner.attackHeldTicks > 0) {
          partner.slingT = 0.32;
          partner.dashT = Math.max(partner.dashT, 0.32);
          partner.dashDirX = Math.cos(partner.aim);
          partner.dashDirY = Math.sin(partner.aim);
          emit(w, 'slingshot', partner.x, partner.y);
        } else {
          partner.x = f.x + Math.cos(f.tAngle) * 70;
          partner.y = f.y + Math.sin(f.tAngle) * 70;
          partner.px = partner.x; partner.py = partner.y;
          emit(w, 'tongueSnap', partner.x, partner.y, { kind: 'frog' });
        }
        return;
      }
      if (prog >= 1) { f.tState = 'back'; f.tT = 0; }
      return;
    }
    // first enemy near the tip gets grabbed
    w.hash.query(f.tTipX, f.tTipY, 46, scratch);
    for (let i = 0; i < scratch.length; i++) {
      const e = scratch[i];
      if (!e.alive || e.state === 'tumble' || e.state === 'grabbed') continue;
      const d = Math.hypot(e.x - f.tTipX, e.y - f.tTipY);
      if (d < ENEMIES[e.kind].radius + 22) {
        if (ENEMIES[e.kind].mass <= TONGUE.pullMassMax) {
          f.tTarget = e;
          e.state = 'pulled';
          e.pullT = 0;
          if (e.kind === 'spikeblob') e.spikesOut = false;
          if (f.items.barbedtip) { e.hp -= 10; e.flashT = 0.1; }
          // lightning gland: the grab zaps neighbors
          if (f.items.lightninggland) {
            w.hash.query(e.x, e.y, 160, scratch);
            let zaps = 0;
            for (const o of scratch) {
              if (o === e || !o.alive || zaps >= 3) continue;
              o.hp -= 12; o.flashT = 0.12; o.freeze = Math.max(o.freeze, 3);
              emit(w, 'zap', o.x, o.y);
              if (o.hp <= 0) { o.alive = false; w.kills++; emit(w, 'kill', o.x, o.y, { kind: o.kind }); }
              zaps++;
            }
          }
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
      const targX = f.x + Math.cos(f.tAngle) * TONGUE.pullToRange;
      const targY = f.y + Math.sin(f.tAngle) * TONGUE.pullToRange;
      e.x += (targX - e.x) * Math.min(1, prog * 1.6);
      e.y += (targY - e.y) * Math.min(1, prog * 1.6);
      f.tTipX = e.x; f.tTipY = e.y;
      if (prog >= 1) {
        // SNAPPER keeps it: grabbed -> next attack = yeet. Others: arrives stunned.
        if (f.kit === 'snapper' && !f.grabbed) {
          f.grabbed = e;
          f.grabT = 1.6;
          e.state = 'grabbed';
        } else {
          e.state = 'seek';
          e.stunT = TONGUE.stun;
          e.vx = 0; e.vy = 0;
        }
      }
    } else {
      f.tTipX = f.x + Math.cos(f.tAngle) * reach * (1 - prog);
      f.tTipY = f.y + Math.sin(f.tAngle) * reach * (1 - prog);
    }
    if (prog >= 1) { f.tState = 'idle'; f.tTarget = null; }
  }
}

// ---------------------------------------------------------------- damage to frog

export function hurtFrog(w: World, f: Frog, dmg: number, dirX: number, dirY: number): void {
  if (!f.alive || f.downed || f.iframesT > 0 || frogDashIframes(f)) return;
  let final = dmg * f.stat.resist;
  // blood pact (DUO): one shared pool — pain is split between both frogs
  const partner = w.frogs.find((o) => o !== f && o.alive && !o.downed);
  if (f.items.bloodpact || (partner && partner.items.bloodpact)) {
    if (partner) {
      const half = final / 2;
      partner.hp -= half;
      partner.hurtFlashT = 0.1;
      final = half;
      if (partner.hp <= 0) downFrog(w, partner);
    }
  }
  f.hp -= final;
  f.iframesT = 0.3;
  f.hurtFlashT = 0.15;
  f.vx += dirX * 220;
  f.vy += dirY * 220;
  emit(w, 'frogHurt', f.x, f.y, { a: final, dirX, dirY });
  if (f.hp <= 0) downFrog(w, f);
}

function downFrog(w: World, f: Frog): void {
  f.hp = 0;
  if (w.frogs.length > 1 && w.frogs.some((o) => o !== f && o.alive && !o.downed)) {
    // duo: downed on the lily pad, waiting for the heartbeat (S4)
    f.downed = true;
    f.reviveT = 0;
    f.vx = 0; f.vy = 0;
    emit(w, 'frogDown', f.x, f.y);
  } else {
    f.alive = false;
    emit(w, 'frogDown', f.x, f.y);
  }
}
