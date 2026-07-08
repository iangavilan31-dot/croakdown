// Render — layered canvases (static backdrop / accumulating decals / entities+VFX / HUD).
// Graybox pond in the locked palette (Art Direction): dark teal body, gold + hot pink
// accents only. Nearest-neighbor chunky shapes; real art replaces shapes in Phase 2.

import {
  ARENA_W, ARENA_H, ARENA_MARGIN, FROG_RADIUS, DASH_CHARGES,
} from '../data/constants';
import { ENEMIES } from '../data/enemies';
import { TONGUE } from '../data/weapons';
import type { Enemy, World } from '../sim/types';
import { feel, particles, decals, decalStats, shakeOffset, type Decal } from '../feel/feel';
import { img } from '../engine/assets';

// palette (Art Direction law)
const C = {
  water: '#06211c', waterDeep: '#041713', mud: '#241c12', mudLight: '#32271a',
  bank: '#0d0f0c', reed: '#3d5a4e', pad: '#2f5546', padLight: '#3c6b58',
  cream: '#f2ead8', gold: '#ffd27a', pink: '#ff5fa2', blood: '#7d0f24',
  frog: '#4c7a45', frogBelly: '#c9d8a6', frogDark: '#35592f',
  sludge: '#2e4238', sludgeDark: '#22332b', eye: '#d8f06a', gel: '#7fd6a8',
};

let view = { scale: 1, ox: 0, oy: 0 };
export function toWorld(sx: number, sy: number): [number, number] {
  return [(sx - view.ox) / view.scale, (sy - view.oy) / view.scale];
}

// ---------- static backdrop ----------
let backdrop: HTMLCanvasElement | null = null;
function buildBackdrop(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = ARENA_W; c.height = ARENA_H;
  const g = c.getContext('2d')!;
  // deep water base
  g.fillStyle = C.waterDeep;
  g.fillRect(0, 0, ARENA_W, ARENA_H);
  // water ring
  g.fillStyle = C.water;
  g.fillRect(ARENA_MARGIN * 0.4, ARENA_MARGIN * 0.4, ARENA_W - ARENA_MARGIN * 0.8, ARENA_H - ARENA_MARGIN * 0.8);
  // mud island (the fighting floor)
  g.fillStyle = C.mud;
  roundRect(g, ARENA_MARGIN, ARENA_MARGIN, ARENA_W - ARENA_MARGIN * 2, ARENA_H - ARENA_MARGIN * 2, 90);
  g.fill();
  // mottled mud texture
  for (let i = 0; i < 260; i++) {
    const x = ARENA_MARGIN + 30 + Math.random() * (ARENA_W - ARENA_MARGIN * 2 - 60);
    const y = ARENA_MARGIN + 30 + Math.random() * (ARENA_H - ARENA_MARGIN * 2 - 60);
    g.fillStyle = Math.random() < 0.5 ? C.mudLight : '#1d160e';
    g.globalAlpha = 0.25 + Math.random() * 0.3;
    g.beginPath();
    g.ellipse(x, y, 8 + Math.random() * 26, 5 + Math.random() * 14, Math.random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // bank edge (the wall — splat surface, readable as solid)
  g.strokeStyle = C.bank;
  g.lineWidth = 26;
  roundRect(g, ARENA_MARGIN - 6, ARENA_MARGIN - 6, ARENA_W - (ARENA_MARGIN - 6) * 2, ARENA_H - (ARENA_MARGIN - 6) * 2, 96);
  g.stroke();
  // rocks on the bank
  for (let i = 0; i < 26; i++) {
    const t = Math.random() * Math.PI * 2;
    const onX = Math.random() < 0.5;
    const x = onX ? ARENA_MARGIN + Math.random() * (ARENA_W - ARENA_MARGIN * 2) : (Math.random() < 0.5 ? ARENA_MARGIN : ARENA_W - ARENA_MARGIN);
    const y = onX ? (Math.random() < 0.5 ? ARENA_MARGIN : ARENA_H - ARENA_MARGIN) : ARENA_MARGIN + Math.random() * (ARENA_H - ARENA_MARGIN * 2);
    g.fillStyle = '#141a16';
    g.beginPath();
    g.ellipse(x, y, 14 + Math.random() * 18, 10 + Math.random() * 12, t, 0, Math.PI * 2);
    g.fill();
  }
  // lily pads in the water ring
  for (let i = 0; i < 14; i++) {
    const edge = Math.floor(Math.random() * 4);
    const m = ARENA_MARGIN * 0.55;
    let x = 0, y = 0;
    if (edge === 0) { x = Math.random() * ARENA_W; y = m; }
    else if (edge === 1) { x = Math.random() * ARENA_W; y = ARENA_H - m; }
    else if (edge === 2) { x = m; y = Math.random() * ARENA_H; }
    else { x = ARENA_W - m; y = Math.random() * ARENA_H; }
    g.fillStyle = Math.random() < 0.5 ? C.pad : C.padLight;
    g.beginPath();
    const r = 18 + Math.random() * 22;
    g.arc(x, y, r, 0.3, Math.PI * 2 - 0.2);
    g.lineTo(x, y);
    g.fill();
  }
  // vignette
  const v = g.createRadialGradient(ARENA_W / 2, ARENA_H / 2, ARENA_H * 0.42, ARENA_W / 2, ARENA_H / 2, ARENA_H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(2,8,6,0.55)');
  g.fillStyle = v;
  g.fillRect(0, 0, ARENA_W, ARENA_H);
  return c;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ---------- decal layer (accumulating, incremental) ----------
let decalCanvas: HTMLCanvasElement | null = null;
let drawnAdds = 0, seenDrops = 0;

function drawDecal(g: CanvasRenderingContext2D, d: Decal) {
  g.save();
  g.translate(d.x, d.y);
  g.rotate(d.rot);
  g.scale(d.scale, d.scale);
  switch (d.kind) {
    case 'blood':
      g.fillStyle = 'rgba(125,15,36,0.5)';
      g.beginPath(); g.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(14, 6, 8, 5, 0.5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(-12, -7, 6, 4, -0.4, 0, Math.PI * 2); g.fill();
      break;
    case 'smear':
      g.fillStyle = 'rgba(125,15,36,0.38)';
      g.beginPath(); g.ellipse(0, 0, 34, 7, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(26, 0, 10, 4, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'splat':
      g.fillStyle = 'rgba(125,15,36,0.55)';
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI - Math.PI / 2;
        g.beginPath(); g.ellipse(Math.cos(a) * 16, Math.sin(a) * 20, 8, 4, a, 0, Math.PI * 2); g.fill();
      }
      g.beginPath(); g.ellipse(0, 0, 16, 18, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'bones':
      g.strokeStyle = 'rgba(226,216,196,0.55)';
      g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-10, -3); g.lineTo(10, 3); g.stroke();
      g.beginPath(); g.moveTo(-4, 8); g.lineTo(7, -8); g.stroke();
      g.fillStyle = 'rgba(226,216,196,0.55)';
      g.beginPath(); g.arc(-12, -4, 3.4, 0, Math.PI * 2); g.arc(12, 4, 3.4, 0, Math.PI * 2); g.fill();
      break;
    case 'crater':
      g.strokeStyle = 'rgba(15,10,5,0.5)';
      g.lineWidth = 6;
      g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(20,14,8,0.4)';
      g.beginPath(); g.arc(0, 0, 24, 0, Math.PI * 2); g.fill();
      break;
    case 'gel':
      g.fillStyle = 'rgba(60,110,88,0.4)';
      g.beginPath(); g.ellipse(0, 0, 26, 18, 0, 0, Math.PI * 2); g.fill();
      break;
  }
  g.restore();
}

function updateDecalLayer() {
  if (!decalCanvas) {
    decalCanvas = document.createElement('canvas');
    decalCanvas.width = ARENA_W; decalCanvas.height = ARENA_H;
  }
  const g = decalCanvas.getContext('2d')!;
  if (decalStats.drops !== seenDrops) {
    // cap overflow: full redraw with survivors
    g.clearRect(0, 0, ARENA_W, ARENA_H);
    for (let i = 0; i < decals.length; i++) drawDecal(g, decals[i]);
    seenDrops = decalStats.drops;
    drawnAdds = decalStats.adds;
    return;
  }
  const newCount = decalStats.adds - drawnAdds;
  if (newCount > 0) {
    for (let i = decals.length - newCount; i < decals.length; i++) drawDecal(g, decals[i]);
    drawnAdds = decalStats.adds;
  }
}

// ---------- glowing golden lotus centerpiece (the swamp's light source) ----------
function drawLotus(ctx: CanvasRenderingContext2D, time: number) {
  const cx = ARENA_W / 2, cy = ARENA_H / 2;
  const pulse = 0.85 + Math.sin(time * 1.4) * 0.15;
  ctx.save();
  // warm radial glow washing the arena center
  const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 560 * pulse);
  glow.addColorStop(0, 'rgba(255,214,140,0.34)');
  glow.addColorStop(0.4, 'rgba(255,180,90,0.12)');
  glow.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 600, cy - 600, 1200, 1200);
  // pad
  ctx.fillStyle = 'rgba(28,54,40,0.9)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 10, 84, 40, 0, 0, Math.PI * 2); ctx.fill();
  // petals (three rings, rounded + overlapping), lit warm gold from within
  ctx.translate(cx, cy - 4);
  const drawPetal = (len: number, wide: number, c0: string, c1: string) => {
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-wide, -len * 0.4, -wide * 0.5, -len, 0, -len);   // rounded tip
    ctx.bezierCurveTo(wide * 0.5, -len, wide, -len * 0.4, 0, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,70,20,0.25)'; ctx.lineWidth = 1; ctx.stroke();
  };
  // outer ring — deep amber
  for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate((i / 8) * Math.PI * 2); drawPetal(52, 26, '#a9691f', '#e8a63c'); ctx.restore(); }
  // mid ring — brighter gold, offset
  for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(((i + 0.5) / 8) * Math.PI * 2); drawPetal(40, 22, '#c8892e', '#ffcf6e'); ctx.restore(); }
  // inner ring — pale warm, cupping the core
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate((i / 6) * Math.PI * 2 + 0.3); drawPetal(24, 17, '#e0a83e', '#fff0c0'); ctx.restore(); }
  // hot core
  ctx.fillStyle = 'rgba(255,247,220,' + (0.85 * pulse) + ')';
  ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 26 * pulse;
  ctx.beginPath(); ctx.arc(0, -6, 13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ---------- fireflies + fog (living swamp overlays) ----------
const fireflies = Array.from({ length: 22 }, () => ({
  x: Math.random() * ARENA_W, y: Math.random() * ARENA_H,
  ph: Math.random() * Math.PI * 2, sp: 0.3 + Math.random() * 0.5,
  rx: 40 + Math.random() * 120, ry: 30 + Math.random() * 90,
}));
function drawAtmosphere(ctx: CanvasRenderingContext2D, time: number) {
  // fireflies drift in slow lissajous loops, twinkle warm
  for (const f of fireflies) {
    const x = f.x + Math.cos(time * f.sp + f.ph) * f.rx;
    const y = f.y + Math.sin(time * f.sp * 1.3 + f.ph) * f.ry;
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 3 + f.ph * 5));
    ctx.globalAlpha = tw;
    ctx.fillStyle = '#ffe58a';
    ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  // slow drifting fog band (two layers) for depth
  for (let i = 0; i < 2; i++) {
    const off = (time * (6 + i * 4)) % (ARENA_W + 600) - 300;
    const g = ctx.createLinearGradient(off, 0, off + 600, 0);
    g.addColorStop(0, 'rgba(60,80,72,0)');
    g.addColorStop(0.5, `rgba(70,92,82,${0.05 + i * 0.03})`);
    g.addColorStop(1, 'rgba(60,80,72,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, i === 0 ? ARENA_H * 0.1 : ARENA_H * 0.6, ARENA_W, ARENA_H * 0.3);
  }
}

// ---------- pixel-sprite helper (nearest, flip, squash, tint) ----------
function drawSprite(ctx: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number,
                    h: number, flip: boolean, sx: number, sy: number, flash: number, rot = 0) {
  const aspect = im.width / im.height;
  const dh = h, dw = h * aspect;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale((flip ? -1 : 1) * sx, sy);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, -dw / 2, -dh, dw, dh); // anchor at feet (bottom-center)
  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(im, -dw / 2, -dh, dw, dh);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ---------- dash afterimages (render-local trail) ----------
const trail: { x: number; y: number; life: number }[] = [];

// ---------- main draw ----------
export function draw(ctx: CanvasRenderingContext2D, w: World, cw: number, ch: number, alpha: number, time: number, paused: boolean) {
  if (!backdrop) backdrop = buildBackdrop();
  updateDecalLayer();

  // letterboxed uniform scale
  const scale = Math.min(cw / ARENA_W, ch / ARENA_H);
  view.scale = scale / devicePixelRatio;
  const w2 = ARENA_W * scale, h2 = ARENA_H * scale;
  const ox = (cw - w2) / 2, oy = (ch - h2) / 2;
  view.ox = ox / devicePixelRatio; view.oy = oy / devicePixelRatio;

  ctx.fillStyle = '#020806';
  ctx.fillRect(0, 0, cw, ch);
  ctx.save();
  ctx.imageSmoothingEnabled = false; // crisp pixel art
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  // camera: trauma shake + zoom pulse (juice-only camera law)
  const [sx, sy, rot] = shakeOffset(time);
  const zoom = 1 + feel.zoomPulse * 0.02;
  ctx.translate(ARENA_W / 2, ARENA_H / 2);
  ctx.rotate(rot);
  ctx.scale(zoom, zoom);
  ctx.translate(-ARENA_W / 2 + sx, -ARENA_H / 2 + sy);

  // real painted swamp backdrop (falls back to graybox pond until the image loads)
  const bd = img('backdrop');
  if (bd) ctx.drawImage(bd, 0, 0, ARENA_W, ARENA_H);
  else { if (!backdrop) backdrop = buildBackdrop(); ctx.drawImage(backdrop, 0, 0); }
  drawLotus(ctx, time);
  if (decalCanvas) ctx.drawImage(decalCanvas, 0, 0);

  // spawn telegraphs: pulsing glyph + glowing eyes
  for (const t of w.telegraphs) {
    const p = 1 - t.framesLeft / 60;
    ctx.strokeStyle = `rgba(255,95,162,${0.25 + p * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 34 - p * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = C.eye;
    ctx.globalAlpha = 0.4 + p * 0.6;
    ctx.beginPath(); ctx.arc(t.x - 8, t.y - 4, 3, 0, Math.PI * 2); ctx.arc(t.x + 8, t.y - 4, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // shadows
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (const e of w.enemies) {
    const ex = e.px + (e.x - e.px) * alpha, ey = e.py + (e.y - e.py) * alpha;
    ctx.beginPath();
    ctx.ellipse(ex, ey + ENEMIES[e.kind].radius * 0.75, ENEMIES[e.kind].radius * 0.9, ENEMIES[e.kind].radius * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const f = w.frog;
  const fx = f.px + (f.x - f.px) * alpha, fy = f.py + (f.y - f.py) * alpha;
  ctx.beginPath();
  ctx.ellipse(fx, fy + FROG_RADIUS * 0.8, FROG_RADIUS * 1.0, FROG_RADIUS * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  // essence drops
  for (const d of w.drops) {
    const dx = d.px + (d.x - d.px) * alpha, dy = d.py + (d.y - d.py) * alpha;
    ctx.fillStyle = C.gold;
    ctx.shadowColor = C.gold; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // enemies (y-sorted with frog)
  const sorted: (Enemy | 'frog')[] = [...w.enemies].sort((a, b) => a.y - b.y) as (Enemy | 'frog')[];
  let frogDrawn = false;
  for (let i = 0; i <= sorted.length; i++) {
    const e = i < sorted.length ? (sorted[i] as Enemy) : null;
    if (!frogDrawn && (!e || e.y > f.y)) { drawFrog(ctx, w, fx, fy, time); frogDrawn = true; }
    if (e) drawEnemy(ctx, e, alpha, time);
  }

  // dash trail decay
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].life -= 0.016;
    if (trail[i].life <= 0) trail.splice(i, 1);
  }
  if (f.dashT > 0) trail.push({ x: fx, y: fy, life: 0.25 });
  for (const t of trail) {
    ctx.fillStyle = `rgba(201,216,166,${t.life * 0.9})`;
    ctx.beginPath(); ctx.ellipse(t.x, t.y, FROG_RADIUS * 0.9, FROG_RADIUS * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  }

  // particles
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 10; }
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  drawAtmosphere(ctx, time);

  ctx.restore();

  drawHud(ctx, w, cw, ch, scale, ox, oy, time, paused);
}

// ---------- frog ----------
function drawFrog(ctx: CanvasRenderingContext2D, w: World, fx: number, fy: number, time: number) {
  const f = w.frog;
  if (!f.alive) {
    // downed frog: flat, pale
    ctx.save();
    ctx.translate(fx, fy);
    ctx.fillStyle = '#6a7a5a';
    ctx.beginPath(); ctx.ellipse(0, 8, FROG_RADIUS * 1.2, FROG_RADIUS * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  const atk = f.attack;
  const speed = Math.hypot(f.vx, f.vy);
  const moving = speed > 20 && f.dashT <= 0;
  // hop arc: 0 at ground contact -> 1 at apex -> 0, once per hop. Drives lift + squash/stretch.
  const hopArc = moving ? Math.abs(Math.sin(f.hopPhase * Math.PI)) : 0;
  const hop = hopArc * 17 + (moving ? 0 : Math.sin(time * 2.1) * 1.4); // idle micro-bob
  // stretch tall at the apex, squash wide on landing
  let squashX = 1 - hopArc * 0.11;
  let squashY = 1 + hopArc * 0.15;
  if (!moving && f.dashT <= 0) { const b = Math.sin(time * 2.2) * 0.03; squashX -= b; squashY += b; } // breathing
  if (atk.phase === 'windup' || atk.phase === 'heavywindup') { squashX *= 1.08; squashY *= 0.9; }
  if (atk.phase === 'heavyhold') { squashX *= 1.12 + Math.sin(time * 18) * 0.015; squashY *= 0.86; }
  if (atk.phase === 'active') { squashX *= 0.92; squashY *= 1.1; }
  if (f.dashT > 0) { squashX = 1.32; squashY = 0.7; }
  // lean into the hop + into horizontal motion (secondary motion)
  const lean = (moving ? Math.sin(f.hopPhase * Math.PI * 2) * 0.05 : 0)
    + Math.max(-0.1, Math.min(0.1, f.vx / 3200));

  const flicker = f.iframesT > 0 && Math.floor(time * 24) % 2 === 0;
  ctx.save();
  ctx.translate(fx, fy - hop);
  if (lean) ctx.rotate(lean);
  if (flicker) ctx.globalAlpha = 0.45;

  // sword BEHIND frog when aiming up
  const aimUp = Math.sin(atk.phase === 'none' ? f.aim : atk.angle) < -0.3;
  if (aimUp) drawSword(ctx, w, time);

  const facingLeft = Math.cos(atk.phase === 'none' ? f.aim : atk.angle) < 0;
  ctx.scale((facingLeft ? -1 : 1) * squashX, squashY);
  const frogImg = img('frog');
  if (frogImg) {
    const h = FROG_RADIUS * 3.0;
    const dw = h * (frogImg.width / frogImg.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frogImg, -dw / 2, -h * 0.66, dw, h); // anchored near feet
    if (f.hurtFlashT > 0) {
      ctx.globalAlpha = Math.min(0.75, f.hurtFlashT * 5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(frogImg, -dw / 2, -h * 0.66, dw, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  } else {
    // graybox fallback until the sprite loads
    ctx.fillStyle = f.hurtFlashT > 0 ? '#e8d8d2' : C.frog;
    ctx.beginPath(); ctx.ellipse(0, 0, FROG_RADIUS, FROG_RADIUS * 0.88, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = f.hurtFlashT > 0 ? '#fff' : C.frogBelly;
    ctx.beginPath(); ctx.ellipse(0, FROG_RADIUS * 0.28, FROG_RADIUS * 0.62, FROG_RADIUS * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // tongue
  if (f.tState !== 'idle') {
    ctx.save();
    ctx.strokeStyle = C.pink;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fx, fy - hop - 6);
    ctx.lineTo(f.tTipX, f.tTipY);
    ctx.stroke();
    ctx.fillStyle = C.pink;
    ctx.beginPath(); ctx.arc(f.tTipX, f.tTipY, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // sword IN FRONT when aiming down/side
  if (!aimUp) {
    ctx.save();
    ctx.translate(0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(fx, fy - hop);
    drawSwordAt(ctx, w, time);
    ctx.restore();
  }
}

function drawSword(ctx: CanvasRenderingContext2D, w: World, time: number) {
  drawSwordAt(ctx, w, time);
}

/** Sword drawn relative to current translate (frog center). LONGER than the frog is tall. */
function drawSwordAt(ctx: CanvasRenderingContext2D, w: World, time: number) {
  const f = w.frog;
  const atk = f.attack;
  const L = 118; // blade length — bigger than the frog (Weapons law)
  let ang = f.aim;
  let raise = 0;

  if (atk.phase === 'windup') {
    const p = atk.frame / Math.max(1, atk.data!.windup);
    const dir = atk.chainIdx % 2 === 0 ? 1 : -1;
    ang = atk.angle - dir * (atk.data!.arc / 2 + 0.5) * (1 - p * 0.15);
  } else if (atk.phase === 'heavywindup' || atk.phase === 'heavyhold') {
    ang = atk.angle - (atk.data!.arc / 2 + 0.7);
    raise = -14;
    // charge glow
    ctx.save();
    ctx.shadowColor = C.gold; ctx.shadowBlur = 16 + Math.sin(time * 20) * 6;
    ctx.strokeStyle = 'rgba(255,210,122,0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, raise, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (atk.phase === 'active') {
    const p = (atk.frame + 1) / Math.max(1, atk.data!.active);
    const dir = atk.data === null || atk.chainIdx % 2 === 0 ? 1 : -1;
    const half = atk.data!.arc / 2;
    ang = atk.angle - dir * half + dir * atk.data!.arc * p;
    // arc smear (crescent)
    ctx.save();
    ctx.globalAlpha = 0.5;
    const heavy = atk.data!.cls === 'heavy';
    const grad = ctx.createRadialGradient(0, 0, atk.data!.reach * 0.35, 0, 0, atk.data!.reach);
    grad.addColorStop(0, 'rgba(242,234,216,0)');
    grad.addColorStop(1, heavy ? 'rgba(255,210,122,0.85)' : 'rgba(242,234,216,0.7)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    const a0 = atk.angle - dir * half, a1 = ang;
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, atk.data!.reach, a0, a1, dir < 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (atk.phase === 'follow') {
    const dir = atk.chainIdx % 2 === 0 ? 1 : -1;
    ang = atk.angle + dir * (atk.data!.arc / 2 + 0.35);
  } else if (atk.phase === 'recovery') {
    const p = atk.frame / Math.max(1, atk.data!.recovery);
    const dir = atk.chainIdx % 2 === 0 ? 1 : -1;
    ang = atk.angle + dir * (atk.data!.arc / 2 + 0.35) * (1 - p);
  } else {
    // idle carry: dragged low behind, tip in the mud (weight before the first swing)
    ang = f.aim + Math.PI * 0.82;
  }

  ctx.save();
  ctx.translate(Math.cos(ang) * 16, Math.sin(ang) * 16 + raise);
  ctx.rotate(ang);
  // REED SWORD (design/4 Weapons): a blade of hardened swamp reeds, leather-wrapped grip,
  // mossy-vine binding, chipped edge, glowing lime moss at the guard.
  // blade body (tapered reed, olive-green)
  ctx.fillStyle = '#5c6b2f';
  ctx.beginPath();
  ctx.moveTo(14, -6); ctx.lineTo(L - 6, -4); ctx.lineTo(L + 4, 0); ctx.lineTo(L - 6, 4); ctx.lineTo(14, 6);
  ctx.closePath(); ctx.fill();
  // lit reed edge (top highlight)
  ctx.fillStyle = '#8fae4a';
  ctx.beginPath();
  ctx.moveTo(14, -6); ctx.lineTo(L - 6, -4); ctx.lineTo(L - 8, -1); ctx.lineTo(14, -2);
  ctx.closePath(); ctx.fill();
  // dark reed spine
  ctx.fillStyle = '#3a4a22';
  ctx.fillRect(14, 2, L - 18, 3);
  // a couple of chips out of the edge
  ctx.fillStyle = 'rgba(10,16,8,0.6)';
  ctx.beginPath(); ctx.arc(L * 0.6, 5, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(L * 0.82, -4, 2.4, 0, Math.PI * 2); ctx.fill();
  // vine binding wraps near the base of the blade
  ctx.strokeStyle = '#2f5233'; ctx.lineWidth = 2.5;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(16 + i * 5, -6); ctx.lineTo(20 + i * 5, 6); ctx.stroke(); }
  // guard + glowing moss
  ctx.fillStyle = '#5a4a2e';
  ctx.fillRect(10, -8, 6, 16);
  ctx.fillStyle = '#b6ff6a';
  ctx.shadowColor = '#8fff5a'; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.arc(13, -7, 2.2, 0, Math.PI * 2); ctx.arc(12, 7, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  // leather-wrapped grip
  ctx.fillStyle = '#3a2c1c';
  ctx.fillRect(-2, -5, 12, 10);
  ctx.strokeStyle = '#241a10'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0 + i * 4, -5); ctx.lineTo(2 + i * 4, 5); ctx.stroke(); }
  // pommel
  ctx.fillStyle = '#4a3722';
  ctx.beginPath(); ctx.arc(-3, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------- enemies ----------
function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, alpha: number, time: number) {
  const data = ENEMIES[e.kind];
  const ex = e.px + (e.x - e.px) * alpha, ey = e.py + (e.y - e.py) * alpha;
  const r = data.radius;
  ctx.save();

  // hitstop sprite shake (hurtbox static — Sakurai law)
  let jx = 0, jy = 0;
  if (e.freeze > 0) { jx = (Math.random() - 0.5) * 4; jy = (Math.random() - 0.5) * 4; }
  ctx.translate(ex + jx, ey + jy);
  if (e.state === 'tumble') ctx.rotate(e.rot);

  // spawn scale-in
  if (e.state === 'spawning') {
    const p = Math.min(1, e.stateF / 18);
    ctx.scale(p, p);
    ctx.globalAlpha = p;
  }

  // breathing squash + state squash
  const breathe = 1 + Math.sin(time * 3 + e.seed * 12) * 0.035;
  let sx2 = breathe, sy2 = 2 - breathe;
  if (e.state === 'windup') {
    const p = e.stateF / data.atkWindup;
    sx2 = 1 + p * 0.22; sy2 = 1 - p * 0.2; // coil
  } else if (e.state === 'recover' && e.kind === 'gloopa') {
    sx2 = 1.35; sy2 = 0.55; // grounded, gills heaving
    sy2 += Math.sin(time * 9) * 0.04;
  } else if (e.stunT > 0) {
    sx2 = 1.1; sy2 = 0.9;
  }
  ctx.scale(sx2, sy2);

  // real sludgeling sprite (all sludge-family kinds share it for the slice), then bail to the
  // world-space windup telegraph. Graybox blob below is the fallback until the image loads.
  const sImg = img('sludgeling');
  if (sImg) {
    // penguin-waddle: rock side-to-side + little hops while closing on the player (Ian's vision)
    const moving = e.state === 'seek' && Math.hypot(e.vx, e.vy) > 10;
    const wadT = time * 9 + e.seed * 20;
    if (moving) {
      const wadHop = Math.abs(Math.sin(wadT)) * r * 0.18;
      ctx.rotate(Math.sin(wadT) * 0.14);           // rock
      ctx.translate(0, -wadHop);                    // hop
      ctx.scale(1 + Math.cos(wadT * 2) * 0.05, 1 - Math.cos(wadT * 2) * 0.05); // squish per step
    }
    const h = r * 2.7;
    const dw = h * (sImg.width / sImg.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sImg, -dw / 2, -h * 0.6, dw, h);
    if (e.flashT > 0) {
      ctx.globalAlpha = 0.85; ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(sImg, -dw / 2, -h * 0.6, dw, h);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (e.state === 'windup') {
      const p = e.stateF / data.atkWindup;
      ctx.save();
      ctx.strokeStyle = `rgba(255,95,162,${0.2 + p * 0.55})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.atkX, e.atkY, data.atkRadius * (0.5 + p * 0.5), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }

  // body color: white flash > armor flash > windup warm > base
  const warm = e.state === 'windup' && (e.stateF & 4) !== 0;
  let body = e.kind === 'gloopa' ? C.sludgeDark : C.sludge;
  if (warm) body = '#8a3050';
  if (e.armorFlashT > 0) body = '#8b9490';
  if (e.flashT > 0) body = '#ffffff';
  ctx.fillStyle = body;

  // blob silhouette (round-bottomed)
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  // drips
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, r * 0.55, r * 0.28, r * 0.2, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.45, r * 0.5, r * 0.22, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // spikeblob spikes
  if (e.kind === 'spikeblob') {
    const out = e.spikesOut ? 1 : 0.25;
    // inflate tell right before toggle
    const period = e.spikesOut ? 1.2 : 1.8;
    const tell = e.spikeT / period > 0.8 ? 1.12 : 1;
    ctx.fillStyle = e.flashT > 0 ? '#fff' : e.spikesOut ? '#5d7a6a' : '#3a4f43';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const bx = Math.cos(a) * r * 0.9 * tell, by = Math.sin(a) * r * 0.75 * tell;
      const tx = Math.cos(a) * (r * 0.9 + 14 * out) * tell, ty = Math.sin(a) * (r * 0.75 + 14 * out) * tell;
      ctx.beginPath();
      ctx.moveTo(bx + Math.sin(a) * 5, by - Math.cos(a) * 5);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx - Math.sin(a) * 5, by + Math.cos(a) * 5);
      ctx.closePath();
      ctx.fill();
    }
  }

  // gloopa crown of bones (bruiser tell)
  if (e.kind === 'gloopa') {
    ctx.fillStyle = e.flashT > 0 ? '#fff' : '#c9bfa8';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 14 - 5, -r * 0.7);
      ctx.lineTo(i * 14, -r * 0.7 - 12);
      ctx.lineTo(i * 14 + 5, -r * 0.7);
      ctx.closePath();
      ctx.fill();
    }
  }

  // glowing eyes (cool/dark body, eye glow = the readable bit)
  const eyeC = warm ? C.pink : C.eye;
  ctx.shadowColor = eyeC; ctx.shadowBlur = 7;
  ctx.fillStyle = eyeC;
  const look = e.facing;
  const lx = Math.cos(look) * 4, ly = Math.sin(look) * 3;
  ctx.beginPath();
  ctx.arc(-r * 0.3 + lx, -r * 0.25 + ly, e.kind === 'gloopa' ? 6 : 4.5, 0, Math.PI * 2);
  ctx.arc(r * 0.3 + lx, -r * 0.25 + ly, e.kind === 'gloopa' ? 6 : 4.5, 0, Math.PI * 2);
  ctx.fill();
  // the grotesque touch: third eye on gloopa
  if (e.kind === 'gloopa') {
    ctx.beginPath(); ctx.arc(lx, -r * 0.55 + ly, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;

  ctx.restore();

  // windup strike telegraph (honest ground truth)
  if (e.state === 'windup') {
    const p = e.stateF / data.atkWindup;
    ctx.save();
    ctx.strokeStyle = `rgba(255,95,162,${0.2 + p * 0.55})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.atkX, e.atkY, data.atkRadius * (0.5 + p * 0.5), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------- HUD (≤5 elements, no text labels) ----------
function drawHud(ctx: CanvasRenderingContext2D, w: World, cw: number, ch: number, scale: number, ox: number, oy: number, time: number, paused: boolean) {
  const f = w.frog;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  // hearts (pink), 20 HP each
  const hearts = Math.ceil(f.maxHp / 20);
  for (let i = 0; i < hearts; i++) {
    const hx = 96 + i * 44, hy = 100;
    const fill = Math.max(0, Math.min(1, (f.hp - i * 20) / 20));
    drawHeart(ctx, hx, hy, 16, 'rgba(20,16,20,0.75)');
    if (fill > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(hx - 18, hy - 16 + (1 - fill) * 34, 36, fill * 34);
      ctx.clip();
      drawHeart(ctx, hx, hy, 16, C.pink);
      ctx.restore();
    }
  }
  // essence count
  ctx.fillStyle = C.gold;
  ctx.shadowColor = C.gold; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(102, 152, 8, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = '800 30px Outfit, sans-serif';
  ctx.fillStyle = C.cream;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(String(f.essence), 122, 154);

  // dash pips
  for (let i = 0; i < DASH_CHARGES; i++) {
    ctx.fillStyle = i < f.dashCharges ? C.cream : 'rgba(242,234,216,0.18)';
    ctx.beginPath();
    ctx.ellipse(98 + i * 26, 196, 9, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // tongue cooldown radial
  const cd = Math.max(0, f.tCd) / TONGUE.cooldown;
  ctx.strokeStyle = 'rgba(255,95,162,0.25)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(166, 196, 11, 0, Math.PI * 2); ctx.stroke();
  if (cd < 1) {
    ctx.strokeStyle = C.pink;
    ctx.beginPath(); ctx.arc(166, 196, 11, -Math.PI / 2, -Math.PI / 2 + (1 - cd) * Math.PI * 2); ctx.stroke();
  }

  // kill tally: subtle notches under essence (the pond keeps score) — capped display
  ctx.fillStyle = 'rgba(242,234,216,0.35)';
  ctx.font = '700 20px Outfit, sans-serif';
  ctx.fillText(`×${w.kills}`, 122, 196);

  if (paused) {
    overlay(ctx, 'rgba(2,8,6,0.72)');
    ctx.fillStyle = C.cream;
    ctx.font = '900 84px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', ARENA_W / 2, ARENA_H / 2);
  }
  if (w.gameOver) {
    overlay(ctx, 'rgba(6,2,4,0.68)');
    ctx.fillStyle = C.pink;
    ctx.font = '900 92px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE POND CLAIMS YOU', ARENA_W / 2, ARENA_H / 2 - 30);
    ctx.fillStyle = C.cream;
    ctx.font = '700 34px Outfit, sans-serif';
    ctx.fillText(`×${w.kills}`, ARENA_W / 2, ARENA_H / 2 + 44);
    if (Math.sin(time * 4) > 0) {
      ctx.font = '700 26px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(242,234,216,0.7)';
      ctx.fillText('R — again', ARENA_W / 2, ARENA_H / 2 + 110);
    }
  }
  ctx.restore();
}

function overlay(ctx: CanvasRenderingContext2D, fill: string) {
  ctx.fillStyle = fill;
  ctx.fillRect(-200, -200, ARENA_W + 400, ARENA_H + 400);
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.bezierCurveTo(x - s * 1.4, y, x - s * 0.8, y - s, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.8, y - s, x + s * 1.4, y, x, y + s);
  ctx.fill();
}
