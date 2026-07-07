// CROAKDOWN boot — fixed 60Hz sim (accumulator), rAF render with interpolation.
// Phase 1 combat prototype: straight into the pond. Esc pauses (frozen-sim flag),
// R restarts after death. QA hook: window.__world.

import { createWorld, tickWorld } from './sim/world';
import type { SimInput, World } from './sim/types';
import { sampleInput } from './engine/input';
import { draw, toWorld } from './render/render';
import { drawPerf, perfEnabled, recordRender, recordSim } from './render/perf';
import { consumeEvents, decayFeel, feel, updateParticles } from './feel/feel';
import { initAudio, resumeAudio, updateAudio, playBgm, setSfxVolume } from './engine/audio';
import { DT } from './data/constants';

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

let world: World = createWorld((Math.random() * 1e9) | 0);
let paused = false;
(window as any).__world = world;
(window as any).__feel = feel;

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
  playBgm('wave');
}
window.addEventListener('pointerdown', ensureAudio);
window.addEventListener('keydown', ensureAudio);

let last = performance.now();
let accum = 0;
let time = 0;

function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += dt;

  const inp = sampleInput(toWorld);

  if (inp.pauseEdge && !world.gameOver) paused = !paused;
  if (world.gameOver && inp.restartEdge) {
    world = createWorld((Math.random() * 1e9) | 0);
    (window as any).__world = world;
  }

  const simInput: SimInput = {
    mx: inp.mx, my: inp.my,
    aimX: inp.aimX, aimY: inp.aimY,
    attackEdge: inp.attackEdge, attackHeld: inp.attackHeld,
    tongueEdge: inp.tongueEdge, dashEdge: inp.dashEdge,
  };
  // right-stick aim gives a direction, not a point — project from the frog
  if (inp.aimStick) {
    simInput.aimX = world.frog.x + inp.aimX * 240;
    simInput.aimY = world.frog.y + inp.aimY * 240;
  }

  if (!paused) {
    const t0 = performance.now();
    accum += dt;
    let ticks = 0;
    while (accum >= DT && ticks < 4) {  // spiral-of-death guard
      tickWorld(world, simInput);
      accum -= DT;
      ticks++;
      // edges must not repeat across catch-up ticks
      simInput.attackEdge = false;
      simInput.tongueEdge = false;
      simInput.dashEdge = false;
    }
    if (ticks === 4) accum = 0;
    recordSim(performance.now() - t0);

    consumeEvents(world);
    updateParticles(dt);
    decayFeel(dt);
    updateAudio(dt);
  }

  const alpha = paused ? 1 : Math.min(1, accum / DT);
  const r0 = performance.now();
  draw(ctx, world, canvas.width, canvas.height, alpha, time, paused);
  recordRender(performance.now() - r0);
  if (perfEnabled) drawPerf(ctx, world, canvas.width);
}

requestAnimationFrame(frame);
