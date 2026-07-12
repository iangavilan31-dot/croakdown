// CROAKDOWN boot — fixed 60Hz sim (accumulator), rAF render with interpolation.
// Run flow: title (kit pick) -> waves <-> shop -> gameover/victory, R restarts.
// Co-op drop-in: P2 joins mid-run with gamepad or IJKL+U. QA hooks: __world/__view.
// ?quick=1 skips the title (warden); ?kit=snapper picks P1's kit.

import { createWorld, addPlayer2, startWave, tickWorld } from './sim/world';
import type { SimInput, World } from './sim/types';
import type { KitId } from './data/kits';
import { sampleInput } from './engine/input';
import { draw, toWorld } from './render/render';
import { drawPerf, perfEnabled, recordRender, recordSim } from './render/perf';
import { consumeEvents, decayFeel, feel, updateParticles, updateRipples } from './feel/feel';
import { initAudio, resumeAudio, updateAudio, startMusic, setSfxVolume } from './engine/audio';
import { loadAssets } from './engine/assets';
import { DT } from './data/constants';

loadAssets();

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resize);
resize();

const params = new URLSearchParams(location.search);
const quick = params.has('quick');
const forcedKit = (params.get('kit') as KitId | null) ?? undefined;
const KIT_ORDER: KitId[] = ['warden', 'snapper', 'morel'];

let titleCursor = 0;
let world: World = createWorld((Math.random() * 1e9) | 0, forcedKit ?? 'warden', quick ? 'wave' : 'title') as World;
let paused = false;
(window as any).__world = world;
(window as any).__feel = feel;

function newRun(kit: KitId) {
  world = createWorld((Math.random() * 1e9) | 0, kit, 'wave');
  (window as any).__world = world;
}

// settings (persisted key survives from the TD era)
try {
  const s = JSON.parse(localStorage.getItem('croakdown.settings.v1') ?? '{}');
  if (typeof s.sfx === 'number') setSfxVolume(s.sfx);
  if (typeof s.shake === 'number') feel.shakeSlider = Math.max(0, Math.min(1.5, s.shake));
} catch { /* defaults */ }

let audioStarted = false;
function ensureAudio() {
  if (audioStarted) return;
  audioStarted = true;
  initAudio();
  resumeAudio();
  startMusic();
}
window.addEventListener('pointerdown', ensureAudio);
window.addEventListener('keydown', ensureAudio);

// title kit-pick (also exposed for QA): 1/2/3 or A/D + confirm
window.addEventListener('keydown', (e) => {
  if (world.phase !== 'title') return;
  if (e.code === 'Digit1') titleCursor = 0;
  if (e.code === 'Digit2') titleCursor = 1;
  if (e.code === 'Digit3') titleCursor = 2;
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') titleCursor = (titleCursor + 2) % 3;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') titleCursor = (titleCursor + 1) % 3;
  if (e.code === 'Enter' || e.code === 'Space') newRun(KIT_ORDER[titleCursor]);
});
window.addEventListener('pointerdown', (e) => {
  if (world.phase !== 'title') return;
  // click a portrait third to pick, click lower half to start
  const x = e.clientX / window.innerWidth;
  if (e.clientY / window.innerHeight > 0.72) newRun(KIT_ORDER[titleCursor]);
  else titleCursor = Math.min(2, Math.floor(x * 3));
});
(window as any).__pickKit = (k: KitId) => newRun(k);
(window as any).__titleCursor = () => titleCursor;
// QA hook: jump the run to a wave (screenshot rituals; sim completability is
// proven headless in test/run.test.mjs — this never ships behavior)
(window as any).__skipToWave = (n: number) => {
  world.wave = Math.max(0, n - 1);
  world.enemies.length = 0;
  world.telegraphs.length = 0;
  world.globs.length = 0;
  startWave(world);
};
(window as any).__setPhase = (p: string) => { (world as any).phase = p; };

let last = performance.now();
let accum = 0;
let time = 0;

function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += dt;

  const dual = sampleInput(toWorld);
  const p2Here = world.frogs.length > 1;

  // drop-in: any P2 verb during a run summons the second frog
  if (!p2Here && dual.p2WantsIn && (world.phase === 'wave' || world.phase === 'shop')) {
    addPlayer2(world);
  }

  if (dual.p1.pauseEdge || dual.p2.pauseEdge) {
    if (world.phase === 'wave' || world.phase === 'shop') paused = !paused;
  }
  if ((world.phase === 'gameover' || world.phase === 'victory') &&
    (dual.p1.restartEdge || dual.p2.restartEdge)) {
    newRun(world.frogs[0].kit);
  }

  const mkSim = (p: typeof dual.p1, fi: number): SimInput => {
    const f = world.frogs[fi];
    const si: SimInput = {
      mx: p.mx, my: p.my,
      aimX: p.aimX, aimY: p.aimY,
      attackEdge: p.attackEdge, attackHeld: p.attackHeld,
      tongueEdge: p.tongueEdge, dashEdge: p.dashEdge, sigEdge: p.sigEdge,
    };
    if (p.aimStick && f) {
      // stick/dir aim: direction, not point — project from the frog; idle stick keeps last aim
      if (Math.abs(p.aimX) + Math.abs(p.aimY) > 0.05) {
        si.aimX = f.x + p.aimX * 240;
        si.aimY = f.y + p.aimY * 240;
      } else { si.aimX = f.x + Math.cos(f.aim) * 240; si.aimY = f.y + Math.sin(f.aim) * 240; }
    }
    return si;
  };

  const simInputs: SimInput[] = [mkSim(dual.p1, 0)];
  if (p2Here) simInputs.push(mkSim(dual.p2, 1));

  if (!paused) {
    const t0 = performance.now();
    accum += dt;
    let ticks = 0;
    while (accum >= DT && ticks < 4) {  // spiral-of-death guard
      tickWorld(world, simInputs);
      accum -= DT;
      ticks++;
      for (const si of simInputs) { si.attackEdge = false; si.tongueEdge = false; si.dashEdge = false; si.sigEdge = false; }
    }
    if (ticks === 4) accum = 0;
    recordSim(performance.now() - t0);

    consumeEvents(world);
    updateParticles(dt);
    updateRipples(dt);
    decayFeel(dt);
    updateAudio(dt);
  }

  const alpha = paused ? 1 : Math.min(1, accum / DT);
  const r0 = performance.now();
  draw(ctx, world, canvas.width, canvas.height, alpha, time, paused, titleCursor);
  recordRender(performance.now() - r0);
  if (perfEnabled) drawPerf(ctx, world, canvas.width);
}

requestAnimationFrame(frame);
export { startWave };
