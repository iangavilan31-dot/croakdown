// The 6-part frog puppet rig — ONE pose solver for the swing-test spike AND the
// real renderer (the spike proves it, the game inherits it — never fork it).
//
// Topology (locked, matches the parts-sheet layout):
//   backArm / body(haunches+backpack) / head-open / head-closed / frontArms+hilt / blade
//
// Laws it encodes (design/3 Gameplay/Game Feel Standards.md + tonight's brief):
//   - HOP locomotion, never a run cycle: crouch-squash -> launch-stretch -> land-splat.
//     Gait phase advances from actual velocity, so stride length is constant and
//     pads never slide. Footfall (landed flag) is the render's ripple/dust cue.
//   - Asymmetric timing everywhere: long anticipation, 1-2 frame snap, long settle.
//   - Nothing moves alone: head lags ~3 frames (spring), backpack/cheek springs,
//     blade drag + overshoot via its own angular spring.
//   - Rotation cap ±25° on body parts; the sword arm/blade is exempt (world-angle).
//   - Hitstop freezes the puppet truly: springs skip integration while frozen.

import type { AttackPhase } from '../sim/types';

// ---------------------------------------------------------------- geometry (px, frog local)
// Local frame: +x = facing direction, +y = down. Origin = frog sim position
// (center of mass). Ground contact (pad surface) at y = FOOT_Y.
export const RIG = {
  FOOT_Y: 30,
  BODY_W: 92, BODY_H: 62,
  BODY_CX: -2, BODY_CY: 4,           // body center offset
  PACK_W: 34, PACK_H: 26,            // backpack sits top-back of body
  PACK_X: -26, PACK_Y: -26,
  HEAD_W: 54, HEAD_H: 44,
  HEAD_X: 26, HEAD_Y: -26,           // head front-top
  BACKARM_W: 16, BACKARM_H: 30,
  BACKARM_X: -14, BACKARM_Y: 2,      // far-side arm
  ARM_W: 18, ARM_H: 26,              // front arms (near side, holds hilt)
  SHOULDER_X: 18, SHOULDER_Y: -10,   // blade pivot (world-angle exempt part)
  HILT_R: 20,                        // hilt distance from shoulder along blade
  BLADE_LEN: 98, BLADE_W: 16,
  ROT_CAP: (25 * Math.PI) / 180,
};

// ---------------------------------------------------------------- gait + swing tuning
const HOP_HEIGHT = 26;         // px at full speed — the arc must READ, this frog is heavy
const HOP_FREQ = 5.2;          // hops/sec at full speed (stride = speed/freq, constant)
const AIR_FROM = 0.20, AIR_TO = 0.82;   // phase window airborne (asymmetric: long land)
const CROUCH_FROM = 0.04;      // pre-launch crouch dip
const IDLE_BREATH_HZ = 0.42;
// The snap is front-loaded: active frame 0 already draws most of the sweep, so the
// sim's contact-on-first-active-tick freezes the blade BURIED in the target
// (impact bite), never cocked at the top of the arc.
const SNAP_LEAD = 1.35;        // virtual frames of sweep credit at active frame 0

// swing angles relative to the attack aim (radians). Windup drags BACK past the
// shoulder; active snaps THROUGH; follow overshoots and settles.
const LIGHT_BACK = -1.55, LIGHT_FWD = 1.35, LIGHT_OVER = 0.22;
const HEAVY_BACK = -2.35, HEAVY_FWD = 1.95, HEAVY_OVER = 0.34;
const REST_OFFSET = 0.34;      // blade rest: relaxed forward guard, clear of the water

// springs (per-second stiffness/damping — integrated at render dt)
const HEAD_STIFF = 340, HEAD_DAMP = 26;      // ~3 frame lag
const PACK_STIFF = 130, PACK_DAMP = 11;      // loose — visible secondary wobble
const BLADE_STIFF = 900, BLADE_DAMP = 42;    // tight but drags + overshoots

// ---------------------------------------------------------------- types
export interface RigInput {
  x: number; y: number;               // interpolated world position
  vx: number; vy: number;
  maxSpeed: number;                   // for speed fractions
  aim: number;
  attackPhase: AttackPhase;
  attackFrame: number;
  attackWindup: number; attackActive: number; attackFollow: number; attackRecovery: number;
  attackAngle: number;                // world radians
  heavy: boolean;
  dashing: boolean;
  dashDirX: number; dashDirY: number;
  frozen: boolean;                    // attacker hitstop this frame
  hurt: boolean;
  alive: boolean;
  seed: number;                       // per-frog stable variation (blink offsets, idle)
}

export interface Pose {
  facing: 1 | -1;
  hopY: number;                       // <=0 while airborne
  squashX: number; squashY: number;   // anchored at feet
  lean: number;                       // small world-directional body rotation
  shear: number;                      // skew during fast movement / dash
  crouch: number;                     // 0..1 (render may dip pads/shadow)
  headDX: number; headDY: number; headRot: number;   // lag offsets on top of HEAD_X/Y
  packRot: number;
  backArmRot: number;
  bladeAngle: number;                 // WORLD angle of blade (spring-followed)
  bladeReach: number;                 // 0..1 extension (windup pulls in, active thrusts)
  armAngle: number;                   // front-arm world angle (leads blade slightly)
  headVariant: 'open' | 'closed';
  smear: number;                      // 0..1 — draw the arc smear at this alpha
  smearFrom: number; smearTo: number; // world angles of the smear wedge
  landed: boolean;                    // contact happened THIS solve (ripple cue)
  launched: boolean;                  // left ground this solve (dust cue)
  airborne: boolean;
  chargeGlint: number;                // 0..1 during heavyhold (emissive cue)
}

export interface RigState {
  gaitPhase: number;
  wasAir: boolean;
  landSquashT: number;                // seconds since landing (squash recovery)
  headX: number; headVX: number; headY: number; headVY: number;
  headA: number; headVA: number;
  packA: number; packVA: number;
  bladeA: number; bladeVA: number;
  blinkClock: number;
  idleClock: number;
  lastPhase: AttackPhase;
}

export function createRigState(seed = 0): RigState {
  return {
    gaitPhase: 0, wasAir: false, landSquashT: 9,
    headX: 0, headVX: 0, headY: 0, headVY: 0, headA: 0, headVA: 0,
    packA: 0, packVA: 0,
    bladeA: REST_OFFSET, bladeVA: 0,
    blinkClock: 1.2 + seed * 2.4, idleClock: seed * 5,
    lastPhase: 'none',
  };
}

// ---------------------------------------------------------------- easing (all asymmetric)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
const easeInCubic = (t: number) => t * t * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

function spring(x: number, v: number, target: number, stiff: number, damp: number, dt: number): [number, number] {
  const a = (target - x) * stiff - v * damp;
  v += a * dt;
  x += v * dt;
  return [x, v];
}

// ---------------------------------------------------------------- the solver
export function solvePose(inp: RigInput, st: RigState, dt: number, out: Pose): Pose {
  const speed = Math.hypot(inp.vx, inp.vy);
  const spdFrac = clamp01(speed / inp.maxSpeed);
  const moving = spdFrac > 0.02 && !inp.dashing;

  // facing follows aim; during a swing it locks to the attack angle
  const faceAngle = inp.attackPhase === 'none' ? inp.aim : inp.attackAngle;
  out.facing = Math.cos(faceAngle) >= 0 ? 1 : -1;

  out.landed = false; out.launched = false;

  if (!inp.frozen) {
    st.idleClock += dt;
    st.blinkClock -= dt;
    if (st.blinkClock <= 0) st.blinkClock = 2.2 + ((st.idleClock * 7.13 + inp.seed * 31) % 1) * 2.6;
    st.landSquashT += dt;

    // ---- gait: phase advances from actual velocity -> constant stride ----
    if (moving) {
      st.gaitPhase += spdFrac * HOP_FREQ * dt;
      if (st.gaitPhase >= 1) st.gaitPhase -= 1;
    } else if (st.gaitPhase > 0.02 && st.gaitPhase < 0.98) {
      // finish the current hop so we never freeze mid-air
      st.gaitPhase = Math.min(1, st.gaitPhase + HOP_FREQ * dt) % 1;
    } else st.gaitPhase = 0;
  }

  const ph = st.gaitPhase;
  const airborne = moving || st.wasAir ? ph > AIR_FROM && ph < AIR_TO : false;
  if (!inp.frozen) {
    if (airborne && !st.wasAir) out.launched = true;
    if (!airborne && st.wasAir) { out.landed = true; st.landSquashT = 0; }
    st.wasAir = airborne;
  }
  out.airborne = airborne;

  // hop arc + squash chain: crouch (anticipation) -> stretch (launch) -> splat (land)
  let hopY = 0, sqX = 1, sqY = 1, crouch = 0, airPitch = 0;
  if (airborne) {
    const at = (ph - AIR_FROM) / (AIR_TO - AIR_FROM);
    hopY = -Math.sin(at * Math.PI) * HOP_HEIGHT * (0.35 + 0.65 * spdFrac);
    // stretch along the arc: rising = long, falling = returning to neutral
    const stretch = 1 + 0.22 * Math.sin(at * Math.PI) * (at < 0.5 ? 1 : 0.55);
    sqY = stretch; sqX = 1 / Math.sqrt(stretch);
    // pitch over the arc: nose up rising, nose down falling (weight reads in the air)
    airPitch = Math.cos(at * Math.PI) * 0.13 * out.facing * spdFrac;
  } else if (moving && ph >= CROUCH_FROM && ph <= AIR_FROM) {
    // pre-launch crouch — the anticipation beat
    crouch = (ph - CROUCH_FROM) / (AIR_FROM - CROUCH_FROM);
    sqY = 1 - 0.20 * crouch; sqX = 1 + 0.14 * crouch;
    hopY = 4 * crouch;
  }
  // landing splat decays over ~150ms (long settle)
  if (st.landSquashT < 0.15) {
    const lt = 1 - st.landSquashT / 0.15;
    const splat = easeOutCubic(lt) * 0.30;
    sqY *= 1 - splat; sqX *= 1 + splat * 0.9;
  }
  // idle breathing + weight shift (never static)
  if (!moving && !airborne) {
    const b = Math.sin(st.idleClock * IDLE_BREATH_HZ * Math.PI * 2 + inp.seed * 9);
    sqY *= 1 + 0.022 * b;
    sqX *= 1 - 0.014 * b;
    hopY += Math.sin(st.idleClock * 0.31 * Math.PI * 2 + inp.seed * 17) * 0.8;
  }
  out.hopY = hopY; out.squashX = sqX; out.squashY = sqY; out.crouch = crouch;

  // dash: hard stretch + shear along motion
  out.shear = 0;
  if (inp.dashing) {
    out.squashY = 0.82; out.squashX = 1.28;
    out.shear = 0.22 * out.facing;
  } else if (spdFrac > 0.75 && airborne) {
    out.shear = 0.09 * out.facing;
  }

  // lean into motion + swing coil + hop pitch
  let lean = (inp.vx / inp.maxSpeed) * 0.10 + airPitch;

  // ---- swing choreography (frames come from the sim; hitstop holds them) ----
  const atk = inp.attackPhase;
  const back = inp.heavy ? HEAVY_BACK : LIGHT_BACK;
  const fwd = inp.heavy ? HEAVY_FWD : LIGHT_FWD;
  const over = inp.heavy ? HEAVY_OVER : LIGHT_OVER;
  const dir = out.facing;  // swing sweeps through aim; angles are aim-relative * facing chirality
  let bladeTarget = inp.aim + REST_OFFSET * dir;
  let reach = 0.6;
  out.smear = 0;
  let charge = 0;

  const A = inp.attackAngle;
  switch (atk) {
    case 'windup': {
      const t = clamp01(inp.attackFrame / Math.max(1, inp.attackWindup));
      bladeTarget = A + back * dir * easeOutCubic(t);   // fast pull, settles deep
      reach = 0.6 - 0.25 * t;                            // blade pulls IN close
      lean -= 0.09 * t * dir; sqY *= 1 - 0.05 * t;       // coil
      break;
    }
    case 'heavywindup': {
      const t = clamp01(inp.attackFrame / Math.max(1, inp.attackWindup));
      bladeTarget = A + back * dir * easeOutCubic(t);
      reach = 0.6 - 0.3 * t;
      lean -= 0.14 * t * dir;
      out.squashY *= 1 - 0.10 * t; out.squashX *= 1 + 0.07 * t;  // deep crouch coil
      break;
    }
    case 'heavyhold': {
      bladeTarget = A + back * dir;
      reach = 0.3 + Math.sin(st.idleClock * 34) * 0.012;         // strain tremble
      lean -= 0.14 * dir;
      out.squashY *= 0.90; out.squashX *= 1.07;
      charge = Math.min(1, inp.attackFrame / 20);
      break;
    }
    case 'active': {
      // THE SNAP: full travel front-loaded into the first ~2 frames, then ride
      const t = clamp01((inp.attackFrame + SNAP_LEAD) / Math.max(1, inp.attackActive));
      const sweep = easeOutQuint(t);
      bladeTarget = A + (back + (fwd - back) * sweep) * dir;
      reach = 0.6 + 0.5 * Math.sin(sweep * Math.PI);             // thrust OUT mid-arc
      lean += 0.12 * sweep * dir;
      out.smear = 1 - 0.35 * t;
      out.smearFrom = A + back * dir;
      out.smearTo = bladeTarget;
      break;
    }
    case 'follow': {
      const t = clamp01(inp.attackFrame / Math.max(1, inp.attackFollow));
      bladeTarget = A + (fwd + over * (1 - easeInCubic(t))) * dir;  // overshoot bleeds off
      reach = 1.0 - 0.3 * t;
      lean += 0.10 * (1 - t) * dir;
      out.smear = 0.35 * (1 - t);
      out.smearFrom = A + (fwd - 0.5) * dir; out.smearTo = bladeTarget;
      break;
    }
    case 'recovery': {
      // blend home with a long settle — the swing never snaps back to guard
      const t = clamp01(inp.attackFrame / Math.max(1, inp.attackRecovery));
      bladeTarget = lerpAngle(A + fwd * dir, inp.aim + REST_OFFSET * dir, easeOutCubic(t));
      reach = 0.7 - 0.1 * (1 - t);
      break;
    }
  }
  out.chargeGlint = charge;
  out.lean = Math.max(-0.24, Math.min(0.24, lean));

  // blade spring: drag-back on windup, whip + overshoot on the snap
  if (!inp.frozen) {
    // during 'active' the spring stiffens — the snap must not be mushy
    const stiff = atk === 'active' ? BLADE_STIFF * 2.2 : BLADE_STIFF;
    const damp = atk === 'active' ? BLADE_DAMP * 0.7 : BLADE_DAMP;
    let d = bladeTarget - st.bladeA;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const [na, nv] = spring(0, st.bladeVA, d, stiff, damp, dt);
    st.bladeA += na; st.bladeVA = nv;
  }
  out.bladeAngle = st.bladeA;
  out.bladeReach = reach;
  out.armAngle = st.bladeA;  // arms track the (sprung) blade — they hold the hilt

  // ---- head: spring-lagged aim + counter-bob (~3 frame lag) ----
  if (!inp.frozen) {
    const wantX = Math.cos(faceAngle) * 6 * out.facing;      // peeks toward aim
    const wantY = -hopY * 0.25;                               // counter-bob (lags body)
    const wantA = Math.max(-RIG.ROT_CAP, Math.min(RIG.ROT_CAP,
      (atk === 'windup' || atk === 'heavywindup' ? -0.18 * out.facing : 0) + lean * 0.6));
    [st.headX, st.headVX] = spring(st.headX, st.headVX, wantX, HEAD_STIFF, HEAD_DAMP, dt);
    [st.headY, st.headVY] = spring(st.headY, st.headVY, wantY, HEAD_STIFF, HEAD_DAMP, dt);
    [st.headA, st.headVA] = spring(st.headA, st.headVA, wantA, HEAD_STIFF, HEAD_DAMP, dt);
    // backpack: loose spring driven by hop + lean (secondary motion, nothing moves alone)
    const packWant = -lean * 1.6 - hopY * 0.012 * out.facing;
    [st.packA, st.packVA] = spring(st.packA, st.packVA, packWant, PACK_STIFF, PACK_DAMP, dt);
  }
  out.headDX = st.headX; out.headDY = st.headY;
  out.headRot = st.headA;
  out.packRot = Math.max(-RIG.ROT_CAP, Math.min(RIG.ROT_CAP, st.packA));
  out.backArmRot = -out.packRot * 0.7 + (atk === 'active' ? 0.3 * out.facing : 0);

  out.headVariant = st.blinkClock < 0.11 || !inp.alive ? 'closed' : 'open';
  return out;
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function makePose(): Pose {
  return {
    facing: 1, hopY: 0, squashX: 1, squashY: 1, lean: 0, shear: 0, crouch: 0,
    headDX: 0, headDY: 0, headRot: 0, packRot: 0, backArmRot: 0,
    bladeAngle: 0, bladeReach: 0.6, armAngle: 0, headVariant: 'open',
    smear: 0, smearFrom: 0, smearTo: 0, landed: false, launched: false,
    airborne: false, chargeGlint: 0,
  };
}
