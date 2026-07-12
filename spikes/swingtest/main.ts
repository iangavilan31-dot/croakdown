// SWING TEST — the Gate-1 spike. Gray rectangles on the locked 6-part topology,
// driven by the REAL sim (frog state machine, combat, hitstop, knockback) and the
// REAL pose solver (src/render/rig.ts). No art, no atmosphere: if it doesn't feel
// heavy here, it never will. Keys: WASD move, mouse aim, LMB tap/hold swing,
// Space dash, K tongue, G respawn dummies, Comma toggle 0.25x slow-mo.

import { createWorld, spawnEnemy } from '../../src/sim/world';
import { updateFrog } from '../../src/sim/frog';
import { updateEnemies } from '../../src/sim/enemies';
import type { SimInput, World } from '../../src/sim/types';
import { sampleInput } from '../../src/engine/input';
import { DT, ARENA_W, ARENA_H } from '../../src/data/constants';
import { ENEMIES } from '../../src/data/enemies';
import { consumeEvents, decayFeel, feel, particles, ripples, shakeOffset, updateParticles, updateRipples } from '../../src/feel/feel';
import { initAudio, resumeAudio } from '../../src/engine/audio';
import { RIG, createRigState, makePose, solvePose, type Pose, type RigState } from '../../src/render/rig';
import { drawSkinnedFrog, loadSkin, type Skin } from '../../src/render/rigSkin';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
addEventListener('resize', resize); resize();

const world: World = createWorld(1234);
(window as any).__world = world;
(window as any).__feel = feel;

function placeDummies() {
  for (const e of world.enemies) e.alive = false;
  compact();
  spawnEnemy(world, world.frog.x + 220, world.frog.y, 'blobbit').state = 'seek';
  spawnEnemy(world, world.frog.x + 300, world.frog.y - 120, 'blobbit').state = 'seek';
  spawnEnemy(world, world.frog.x + 380, world.frog.y + 90, 'gloopa').state = 'seek';
  spawnEnemy(world, world.frog.x - 260, world.frog.y - 40, 'spikeblob').state = 'seek';
}
function compact() {
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    if (!world.enemies[i].alive) {
      if (world.frog.tTarget === world.enemies[i]) world.frog.tTarget = null;
      world.enemies[i] = world.enemies[world.enemies.length - 1];
      world.enemies.pop();
    }
  }
}
placeDummies();

// spike tick — the real sim minus the spawner/drops (controlled dummy pen)
function tick(inp: SimInput) {
  world.tick++;
  world.elapsed += DT;
  const f = world.frog;
  f.px = f.x; f.py = f.y;
  for (const e of world.enemies) { e.px = e.x; e.py = e.y; }
  world.hash.clear();
  for (const e of world.enemies) if (e.alive) world.hash.insert(e);
  updateFrog(world, inp);
  updateEnemies(world);
  compact();
  // dummy pen: frog can't die, dummies respawn when cleared
  if (f.hp < 40) f.hp = f.maxHp;
  f.alive = true; world.gameOver = false;
  if (world.enemies.length === 0) placeDummies();
}

// camera: frog-centered, 1:1 scale
let camX = ARENA_W / 2, camY = ARENA_H / 2;
function view() {
  return { scale: 1, ox: canvas.width / 2 - camX, oy: canvas.height / 2 - camY };
}
function toWorld(sx: number, sy: number): [number, number] {
  const v = view();
  return [(sx - v.ox) / v.scale, (sy - v.oy) / v.scale];
}

// ?skin=warden -> painted parts on the same pose (Gate 3); gray rig is the fallback
const skinName = new URLSearchParams(location.search).get('skin');
const skin: Skin | null = skinName ? loadSkin(skinName) : null;

// keys the spike owns
let slowmo = false;
addEventListener('keydown', (e) => {
  if (e.code === 'Comma') slowmo = !slowmo;
  if (e.code === 'KeyG') placeDummies();
});
let audioOn = false;
addEventListener('pointerdown', () => { if (!audioOn) { audioOn = true; initAudio(); resumeAudio(); } });

// ---------------------------------------------------------------- rig drawing (gray gate)
const rigState: RigState = createRigState(0.37);
const pose: Pose = makePose();

const G = { dark: '#3a4146', mid: '#5b656c', light: '#8b969e', hot: '#c9d4da', line: '#22282b' };

function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill; g.fill();
  g.strokeStyle = G.line; g.lineWidth = 2; g.stroke();
}

function drawFrogRig(g: CanvasRenderingContext2D, p: Pose, x: number, y: number) {
  g.save();
  g.translate(x, y + p.hopY);
  g.rotate(p.lean);
  g.transform(1, 0, p.shear, 1, 0, 0);
  g.translate(0, RIG.FOOT_Y); g.scale(p.squashX, p.squashY); g.translate(0, -RIG.FOOT_Y);

  const bladeBehind = Math.sin(p.bladeAngle) < -0.2;
  if (bladeBehind) drawArmBlade(g, p);

  g.save();
  g.scale(p.facing, 1);
  // back arm (far side)
  g.save();
  g.translate(RIG.BACKARM_X, RIG.BACKARM_Y);
  g.rotate(p.backArmRot);
  rect(g, -RIG.BACKARM_W / 2, 0, RIG.BACKARM_W, RIG.BACKARM_H, 6, G.dark);
  g.restore();
  // backpack (behind body top) — springy secondary
  g.save();
  g.translate(RIG.PACK_X, RIG.PACK_Y);
  g.rotate(p.packRot);
  rect(g, -RIG.PACK_W / 2, -RIG.PACK_H / 2, RIG.PACK_W, RIG.PACK_H, 7, G.dark);
  g.restore();
  // body + haunches
  rect(g, RIG.BODY_CX - RIG.BODY_W / 2, RIG.BODY_CY - RIG.BODY_H / 2, RIG.BODY_W, RIG.BODY_H, 18, G.mid);
  // haunch hint (reads the crouch)
  rect(g, -RIG.BODY_W / 2 + 4, RIG.BODY_CY + 6, 30, RIG.BODY_H / 2 - 2, 10, G.dark);
  // head (open = tall w/ eye; closed = blink squash)
  g.save();
  g.translate(RIG.HEAD_X + p.headDX, RIG.HEAD_Y + p.headDY);
  g.rotate(p.headRot);
  if (p.headVariant === 'open') {
    rect(g, -RIG.HEAD_W / 2, -RIG.HEAD_H / 2, RIG.HEAD_W, RIG.HEAD_H, 12, G.light);
    g.fillStyle = G.line;
    g.beginPath(); g.arc(RIG.HEAD_W * 0.22, -4, 4.5, 0, Math.PI * 2); g.fill();
  } else {
    rect(g, -RIG.HEAD_W / 2, -RIG.HEAD_H / 2 + 6, RIG.HEAD_W, RIG.HEAD_H - 10, 12, G.light);
    g.strokeStyle = G.line; g.lineWidth = 2;
    g.beginPath(); g.moveTo(RIG.HEAD_W * 0.1, -2); g.lineTo(RIG.HEAD_W * 0.34, -2); g.stroke();
  }
  g.restore();
  g.restore(); // un-flip

  if (!bladeBehind) drawArmBlade(g, p);
  g.restore();
}

function drawArmBlade(g: CanvasRenderingContext2D, p: Pose) {
  const shX = RIG.SHOULDER_X * p.facing, shY = RIG.SHOULDER_Y;
  g.save();
  g.translate(shX, shY);
  g.rotate(p.bladeAngle);
  // front arms reaching along the blade to the hilt
  rect(g, 0, -RIG.ARM_W / 2, RIG.HILT_R + 6, RIG.ARM_W, 7, G.mid);
  // hilt + blade, thrust by reach
  const hx = RIG.HILT_R + p.bladeReach * 26;
  rect(g, hx - 4, -9, 8, 18, 3, G.dark);
  rect(g, hx + 4, -RIG.BLADE_W / 2, RIG.BLADE_LEN, RIG.BLADE_W, RIG.BLADE_W / 2, G.hot);
  if (p.chargeGlint > 0) {
    g.globalAlpha = p.chargeGlint * (0.5 + 0.5 * Math.sin(performance.now() / 40));
    rect(g, hx + 4, -RIG.BLADE_W / 2, RIG.BLADE_LEN, RIG.BLADE_W, RIG.BLADE_W / 2, '#ffffff');
    g.globalAlpha = 1;
  }
  g.restore();
}

// Smears are PHOTOGRAPHIC: they decay in real time even while the sim is frozen
// in hitstop (a static gray slab for 13 frames reads as UI, not motion).
interface TrailSeg { x: number; y: number; from: number; to: number; alpha: number }
const trailSegs: TrailSeg[] = [];
function pushTrail(p: Pose, x: number, y: number, frozen: boolean) {
  if (frozen || p.smear <= 0.01) return;
  trailSegs.push({ x, y, from: p.smearFrom, to: p.bladeAngle, alpha: 0.55 * p.smear });
  if (trailSegs.length > 24) trailSegs.shift();
}
function drawTrails(g: CanvasRenderingContext2D, dt: number) {
  for (let i = trailSegs.length - 1; i >= 0; i--) {
    const s = trailSegs[i];
    s.alpha -= dt * 3.2;
    if (s.alpha <= 0.01) { trailSegs.splice(i, 1); continue; }
    let a0 = s.from, a1 = s.to;
    if (a1 < a0) { const t = a0; a0 = a1; a1 = t; }
    if (a1 - a0 > Math.PI * 1.7) continue;   // degenerate wrap — skip, never a full pie
    const r0 = 54, r1 = 152;
    g.save();
    g.translate(s.x, s.y);
    const grad = g.createRadialGradient(0, 0, r0, 0, 0, r1);
    grad.addColorStop(0, 'rgba(223,233,238,0)');
    grad.addColorStop(0.75, `rgba(223,233,238,${s.alpha * 0.5})`);
    grad.addColorStop(1, `rgba(255,255,255,${s.alpha})`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, r1, a0, a1);
    g.arc(0, 0, r0, a1, a0, true);
    g.closePath();
    g.fill();
    // hot leading edge
    g.globalAlpha = Math.min(1, s.alpha * 1.6);
    g.strokeStyle = '#ffffff'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, (r0 + r1) / 2 + 20, a1 - 0.14, a1); g.stroke();
    g.restore();
    g.globalAlpha = 1;
  }
}

function drawEnemy(g: CanvasRenderingContext2D, e: any) {
  const d = ENEMIES[e.kind as keyof typeof ENEMIES];
  const r = d.radius;
  g.save();
  g.translate(e.x, e.y);
  if (e.state === 'tumble') g.rotate(e.rot);
  // squash on hit: flatten ALONG the knockback direction (impact reads as mass)
  if (e.flashT > 0) {
    const s = 1 + e.flashT * 2.4;
    const ang = Math.abs(e.vx) + Math.abs(e.vy) > 20 ? Math.atan2(e.vy, e.vx) : e.facing;
    g.rotate(ang);
    g.scale(1 / s, Math.min(1.5, s * 0.9 + 0.1));
    g.rotate(-ang);
  }
  g.beginPath();
  g.ellipse(0, 0, r, r * 0.85, 0, 0, Math.PI * 2);
  g.fillStyle = e.flashT > 0 ? '#e8f0f2' : e.state === 'windup' ? '#6a5560' : '#464e52';
  g.fill();
  g.strokeStyle = G.line; g.lineWidth = 2; g.stroke();
  // eyes so hits read direction
  g.fillStyle = e.flashT > 0 ? '#1a1a1a' : '#c8d861';
  const ex = Math.cos(e.facing) * r * 0.4, ey = Math.sin(e.facing) * r * 0.4;
  g.beginPath(); g.arc(ex - 6, ey - 4, 4, 0, Math.PI * 2); g.arc(ex + 6, ey - 4, 4, 0, Math.PI * 2); g.fill();
  // hp pips
  if (e.hp < e.maxHp) {
    g.fillStyle = '#222'; g.fillRect(-r, -r - 12, r * 2, 5);
    g.fillStyle = '#9fd88a'; g.fillRect(-r, -r - 12, (r * 2 * e.hp) / e.maxHp, 5);
  }
  g.restore();
}

// ---------------------------------------------------------------- loop
let last = performance.now();
let accum = 0;
let time = 0;

// STEP MODE (?step): deterministic single-tick advance for filmstrip capture.
// window.__step(n, patch) runs n exact 60Hz ticks (edges fire on tick 1 only)
// and draws after each, so a screenshot between calls is a true frame.
const stepMode = location.search.includes('step');
function buildSimInput(p: Partial<SimInput>): SimInput {
  return {
    mx: p.mx ?? 0, my: p.my ?? 0,
    aimX: p.aimX ?? world.frog.x + 200, aimY: p.aimY ?? world.frog.y,
    attackEdge: !!p.attackEdge, attackHeld: !!p.attackHeld,
    tongueEdge: !!p.tongueEdge, dashEdge: !!p.dashEdge,
  };
}
(window as any).__step = (n: number, patch: Partial<SimInput> = {}) => {
  const si = buildSimInput(patch);
  for (let i = 0; i < n; i++) {
    tick(si);
    si.attackEdge = false; si.tongueEdge = false; si.dashEdge = false;
    consumeEvents(world);
    updateParticles(DT);
    updateRipples(DT);
    decayFeel(DT);
    time += DT;
    renderFrame(DT);
  }
  const f = world.frog;
  return {
    phase: f.attack.phase, frame: f.attack.frame, freeze: f.freeze,
    x: Math.round(f.x), y: Math.round(f.y),
    hopY: Math.round(pose.hopY * 10) / 10, gait: Math.round(rigState.gaitPhase * 100) / 100,
    enemies: world.enemies.map((e) => ({
      kind: e.kind, state: e.state, hp: e.hp, freeze: e.freeze,
      vx: Math.round(e.vx), vy: Math.round(e.vy), flashT: Math.round(e.flashT * 100) / 100,
    })),
  };
};

function frame(now: number) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (stepMode) return;              // frozen: __step drives everything
  if (slowmo) dt *= 0.25;
  time += dt;

  const inp = sampleInput(toWorld);
  const simInput: SimInput = {
    mx: inp.mx, my: inp.my, aimX: inp.aimX, aimY: inp.aimY,
    attackEdge: inp.attackEdge, attackHeld: inp.attackHeld,
    tongueEdge: inp.tongueEdge, dashEdge: inp.dashEdge,
  };

  accum += dt;
  let ticks = 0;
  while (accum >= DT && ticks < 4) {
    tick(simInput);
    accum -= DT;
    ticks++;
    simInput.attackEdge = false; simInput.tongueEdge = false; simInput.dashEdge = false;
  }
  if (ticks === 4) accum = 0;

  consumeEvents(world);
  updateParticles(dt);
  updateRipples(dt);
  decayFeel(dt);
  renderFrame(dt);
}

function renderFrame(dt: number) {
  const f = world.frog;
  camX += (f.x - camX) * Math.min(1, dt * 6);
  camY += (f.y - camY) * Math.min(1, dt * 6);
  const v = view();
  (window as any).__view = v;

  // pose (the frozen flag holds springs during hitstop — real timeline freeze)
  const atk = f.attack;
  solvePose({
    x: f.x, y: f.y, vx: f.vx, vy: f.vy, maxSpeed: 330,
    aim: f.aim,
    attackPhase: atk.phase, attackFrame: atk.frame,
    attackWindup: atk.data?.windup ?? 6, attackActive: atk.data?.active ?? 5,
    attackFollow: atk.data?.follow ?? 4, attackRecovery: atk.data?.recovery ?? 10,
    attackAngle: atk.phase === 'none' ? f.aim : atk.angle,
    heavy: atk.data?.cls === 'heavy',
    dashing: f.dashT > 0, dashDirX: f.dashDirX, dashDirY: f.dashDirY,
    frozen: f.freeze > 0, hurt: f.hurtFlashT > 0, alive: f.alive, seed: 0.37,
  }, rigState, f.freeze > 0 ? 0 : dt, pose);
  (window as any).__pose = pose;

  if (pose.landed) {
    ripples.push({ x: f.x, y: f.y + RIG.FOOT_Y, t: 0, life: 0.55, maxR: 44 });
  }

  // ------------- draw -------------
  const g = ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#171c1e';
  g.fillRect(0, 0, canvas.width, canvas.height);

  const [shx, shy, shr] = shakeOffset(time);
  g.translate(canvas.width / 2 + shx, canvas.height / 2 + shy);
  g.rotate(shr);
  g.translate(-canvas.width / 2, -canvas.height / 2);
  g.translate(v.ox, v.oy);

  // ground: pond hint + arena border
  g.strokeStyle = '#242b2e'; g.lineWidth = 4;
  g.strokeRect(70, 70, ARENA_W - 140, ARENA_H - 140);
  g.fillStyle = '#1b2124';
  g.beginPath(); g.ellipse(f.x, f.y + RIG.FOOT_Y + 6, 64 * pose.squashX, 16 * pose.squashX, 0, 0, Math.PI * 2); g.fill();

  // ripples
  for (const r of ripples) {
    const p = r.t / r.life;
    g.globalAlpha = (1 - p) * 0.5;
    g.strokeStyle = '#5d6d74'; g.lineWidth = 2.5 * (1 - p) + 0.5;
    g.beginPath(); g.ellipse(r.x, r.y, r.maxR * p, r.maxR * p * 0.38, 0, 0, Math.PI * 2); g.stroke();
  }
  g.globalAlpha = 1;

  // contact shadow scales with hop height (weight read)
  const air = Math.min(1, -pose.hopY / 18);
  g.fillStyle = `rgba(0,0,0,${0.35 - air * 0.18})`;
  g.beginPath(); g.ellipse(f.x, f.y + RIG.FOOT_Y + 6, 40 * (1 - air * 0.25), 11 * (1 - air * 0.25), 0, 0, Math.PI * 2); g.fill();

  pushTrail(pose, f.x, f.y + pose.hopY * 0.4, f.freeze > 0);
  drawTrails(g, dt);

  // tongue (spike: simple band so K still reads)
  if (f.tState !== 'idle') {
    g.strokeStyle = '#c88'; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(f.x, f.y - 10); g.lineTo(f.tTipX, f.tTipY); g.stroke();
  }

  for (const e of world.enemies) drawEnemy(g, e);
  if (!skin || !drawSkinnedFrog(g, pose, skin, f.x, f.y)) drawFrogRig(g, pose, f.x, f.y);

  // particles
  for (const p of particles) {
    g.globalAlpha = Math.max(0, p.life / p.maxLife);
    g.fillStyle = p.color;
    g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  g.globalAlpha = 1;

  // ------------- debug HUD -------------
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#9fb0b8';
  g.font = '13px monospace';
  g.fillText(`phase:${atk.phase} f:${atk.frame} freeze:${f.freeze} gait:${rigState.gaitPhase.toFixed(2)} ${slowmo ? 'SLOW-MO 0.25x' : ''}`, 12, 20);
  g.fillText('LMB tap/hold=swing/heavy  Space=dash  K=tongue  G=dummies  ,=slow-mo', 12, 38);
}
requestAnimationFrame(frame);
