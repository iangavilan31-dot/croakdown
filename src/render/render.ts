// Render — layered canvases (static backdrop / accumulating decals / entities+VFX / HUD).
// Graybox pond in the locked palette (Art Direction): dark teal body, gold + hot pink
// accents only. Nearest-neighbor chunky shapes; real art replaces shapes in Phase 2.

import {
  ARENA_W, ARENA_H, ARENA_MARGIN, FROG_RADIUS, DASH_CHARGES,
} from '../data/constants';
import { ENEMIES } from '../data/enemies';
import { TONGUE } from '../data/weapons';
import type { Enemy, World } from '../sim/types';
import { feel, particles, decals, decalStats, ripples, shakeOffset, type Decal } from '../feel/feel';
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
      g.fillStyle = 'rgba(58,140,84,0.42)';   // green sludge stain (swamp gore law)
      g.beginPath(); g.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(14, 6, 8, 5, 0.5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(-12, -7, 6, 4, -0.4, 0, Math.PI * 2); g.fill();
      break;
    case 'smear':
      g.fillStyle = 'rgba(58,140,84,0.32)';
      g.beginPath(); g.ellipse(0, 0, 34, 7, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(26, 0, 10, 4, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'splat':
      g.fillStyle = 'rgba(70,160,96,0.5)';
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
    case 'gel':   // glowing sludge puddle — the main enemy-death stain (dissolve-to-ripple)
      g.fillStyle = 'rgba(47,120,72,0.32)';
      g.beginPath(); g.ellipse(0, 0, 15, 9, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(120,205,140,0.22)';
      g.beginPath(); g.ellipse(-2, -1, 7, 4, 0, 0, Math.PI * 2); g.fill();
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
// slow-rising bioluminescent spores (drift up, sway, fade at the top, respawn low)
const spores = Array.from({ length: 30 }, () => ({
  x: Math.random() * ARENA_W, y: Math.random() * ARENA_H,
  rise: 8 + Math.random() * 16, sway: 10 + Math.random() * 24,
  sp: 0.4 + Math.random() * 0.7, ph: Math.random() * Math.PI * 2,
  r: 1 + Math.random() * 1.6,
}));
function drawAtmosphere(ctx: CanvasRenderingContext2D, time: number) {
  // spores rise slowly, drifting sideways; cycle their vertical position over the arena
  ctx.fillStyle = '#b6ff7a';
  ctx.shadowColor = '#8fff5a';
  for (const s of spores) {
    const cycle = (time * s.rise + s.ph * 200) % (ARENA_H + 120);
    const y = ARENA_H + 40 - cycle;                 // travels bottom -> top
    const x = s.x + Math.sin(time * s.sp + s.ph) * s.sway;
    const fade = Math.min(1, cycle / 120) * Math.min(1, (ARENA_H + 120 - cycle) / 200);
    ctx.globalAlpha = fade * 0.55;
    ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
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

// ---------- water ripples (concentric rings expanding on the pond surface) ----------
function drawRipples(ctx: CanvasRenderingContext2D) {
  for (const rp of ripples) {
    const p = rp.t / rp.life;            // 0 -> 1 lifetime
    const a = (1 - p) * 0.5;             // fade out
    if (a <= 0.01) continue;
    ctx.strokeStyle = `rgba(180,225,210,${a})`;
    ctx.lineWidth = 2.5 * (1 - p * 0.6);
    // leading ring
    let r = rp.maxR * p;
    ctx.beginPath();
    ctx.ellipse(rp.x, rp.y, r, r * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
    // trailing ring (chases behind for a real ripple read)
    const p2 = p - 0.28;
    if (p2 > 0) {
      r = rp.maxR * p2;
      ctx.strokeStyle = `rgba(180,225,210,${a * 0.6})`;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, r, r * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
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
  drawRipples(ctx);

  // spawn emergence: a sludge mound bubbles up from the water (REFERENCE_PACK v2 —
  // "smoke-cloud emergence", themed to the swamp; NOT a pink ring).
  for (const t of w.telegraphs) {
    const p = 1 - t.framesLeft / 60;         // 0 -> 1 over the telegraph
    // spreading water ring (teal, subtle) as the ground breaks
    ctx.strokeStyle = `rgba(120,190,150,${0.28 * (1 - p)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(t.x, t.y + 8, 20 + p * 26, (20 + p * 26) * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
    // rising sludge mound (grows out of the water)
    const rise = p * 20;
    ctx.fillStyle = `rgba(38,74,54,${0.5 + p * 0.4})`;
    ctx.beginPath(); ctx.ellipse(t.x, t.y + 6 - rise * 0.4, 8 + p * 16, 6 + p * 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(70,140,92,${0.35 + p * 0.35})`;
    ctx.beginPath(); ctx.ellipse(t.x - 2, t.y + 2 - rise * 0.4, 5 + p * 10, 4 + p * 8, 0, 0, Math.PI * 2); ctx.fill();
    // bubbling spore dots rising (clustered glow, not soft blur)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + t.x * 0.01;
      const br = (8 + p * 14) * (0.5 + 0.5 * Math.sin(time * 6 + i));
      const bx = t.x + Math.cos(a) * br, by = t.y + 6 - rise - Math.abs(Math.sin(time * 4 + i)) * 12 * p;
      ctx.fillStyle = `rgba(150,230,150,${0.5 * p})`;
      ctx.fillRect(bx - 1.5, by - 1.5, 3, 3);
    }
    // eyes ignite late, right before it fully rises
    if (p > 0.6) {
      const ea = (p - 0.6) / 0.4;
      ctx.fillStyle = C.eye;
      ctx.shadowColor = C.eye; ctx.shadowBlur = 6;
      ctx.globalAlpha = ea;
      ctx.beginPath(); ctx.arc(t.x - 6, t.y - rise * 0.4, 2.6, 0, Math.PI * 2); ctx.arc(t.x + 6, t.y - rise * 0.4, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
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

  // The katana lives SHEATHED on the back (drawBackKatana) and is only drawn/swung during an
  // attack — no more dragging a heavy blade around while idle (Ian: "weird heavy thing").
  const attacking = atk.phase !== 'none';
  // sword BEHIND frog when aiming up
  const aimUp = Math.sin(atk.phase === 'none' ? f.aim : atk.angle) < -0.3;
  if (aimUp && attacking) drawSword(ctx, w, time);

  const facingLeft = Math.cos(atk.phase === 'none' ? f.aim : atk.angle) < 0;
  ctx.scale((facingLeft ? -1 : 1) * squashX, squashY);

  // ---- animation state machine: pick the right frame (idle/blink/croak/jump) ----
  // Frog is airborne mid-hop or dashing -> stretched jump frame. Otherwise it idly
  // blinks (brief) and croaks (mouth open, throat puff) on gentle offset cycles.
  const airborne = f.dashT > 0 || hopArc > 0.55;
  const idleish = !moving && f.dashT <= 0 && atk.phase === 'none';
  const blinking = (time % 3.3) < 0.12;
  const croaking = idleish && (time % 6.7) < 0.55;
  let frogImg: HTMLImageElement | null;
  if (airborne && img('frogJump')) frogImg = img('frogJump');
  else if (croaking && img('frogCroak')) { frogImg = img('frogCroak'); squashY *= 1.05; squashX *= 1.04; }
  else if (blinking && img('frogBlink')) frogImg = img('frogBlink');
  else frogImg = img('frog');

  // sheathed KATANA on the back (Ian: "a samurai sword on the back — dope"). Drawn behind
  // the body so the wrapped handle rises over the shoulder.
  if (frogImg) drawBackKatana(ctx, FROG_RADIUS);

  if (frogImg) {
    const h = FROG_RADIUS * 4.8;                        // bigger hero silhouette (critics: ~1.6x up)
    const dw = h * (frogImg.width / frogImg.height);
    const bx = -dw / 2, by = -h * 0.66;
    ctx.imageSmoothingEnabled = false;
    // warm rim/hero-glow so the frog always pops off the stumps + water (value contrast)
    ctx.shadowColor = 'rgba(255,206,130,0.95)'; ctx.shadowBlur = 16;
    ctx.drawImage(frogImg, bx, by, dw, h);
    ctx.shadowBlur = 0;
    ctx.drawImage(frogImg, bx, by, dw, h);             // crisp body on top of the halo
    if (f.hurtFlashT > 0) {
      ctx.globalAlpha = Math.min(0.75, f.hurtFlashT * 5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(frogImg, bx, by, dw, h);
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

  // sword IN FRONT when aiming down/side (only while attacking — otherwise it's sheathed)
  if (!aimUp && attacking) {
    ctx.save();
    ctx.translate(fx, fy - hop);
    drawSwordAt(ctx, w, time);
    ctx.restore();
  }
}

function drawSword(ctx: CanvasRenderingContext2D, w: World, time: number) {
  drawSwordAt(ctx, w, time);
}

/** Sheathed katana across the frog's back — handle + tsuba rise over the shoulder, scabbard runs
 *  down behind the body (mostly hidden, correct for a back-sheath). Drawn before the body sprite. */
function drawBackKatana(ctx: CanvasRenderingContext2D, r: number) {
  ctx.save();
  ctx.lineCap = 'round';
  // scabbard: dark diagonal across the back
  ctx.strokeStyle = '#1c130c'; ctx.lineWidth = r * 0.36;
  ctx.beginPath(); ctx.moveTo(-r * 0.72, -r * 1.12); ctx.quadraticCurveTo(r * 0.1, -r * 0.25, r * 0.5, r * 0.35); ctx.stroke();
  ctx.strokeStyle = '#33261a'; ctx.lineWidth = r * 0.12;
  ctx.beginPath(); ctx.moveTo(-r * 0.72, -r * 1.12); ctx.quadraticCurveTo(r * 0.1, -r * 0.25, r * 0.5, r * 0.35); ctx.stroke();
  // wrapped handle rising over the shoulder
  ctx.strokeStyle = '#4a3a24'; ctx.lineWidth = r * 0.24;
  ctx.beginPath(); ctx.moveTo(-r * 0.72, -r * 1.08); ctx.lineTo(-r * 1.02, -r * 1.66); ctx.stroke();
  ctx.strokeStyle = '#241a10'; ctx.lineWidth = r * 0.06;
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const hx = -r * 0.72 - t * r * 0.3, hy = -r * 1.08 - t * r * 0.58;
    ctx.beginPath(); ctx.moveTo(hx - r * 0.12, hy + r * 0.05); ctx.lineTo(hx + r * 0.1, hy - r * 0.05); ctx.stroke();
  }
  // tsuba guard + a fleck of glowing moss
  ctx.fillStyle = '#5a4a2e';
  ctx.beginPath(); ctx.ellipse(-r * 0.74, -r * 1.1, r * 0.16, r * 0.09, -0.9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b6ff6a'; ctx.shadowColor = '#8fff5a'; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.arc(-r * 0.7, -r * 1.06, r * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
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
    // crisp katana slash: a sweeping crescent band + a bright leading cut-line. Colour reads the
    // combo step (light=lime-white, finisher=gold, heavy=amber) so each hit looks distinct.
    const heavy = atk.data!.cls === 'heavy';
    const fin = atk.data!.cls === 'medium';
    const col = heavy ? '255,205,120' : fin ? '255,228,150' : '206,244,188';
    const reach = atk.data!.reach;
    const a0 = atk.angle - dir * half, a1 = ang;
    const r0 = reach * 0.55, r1 = reach * 1.02;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r1, a0, a1, dir < 0);
    ctx.arc(0, 0, r0, a1, a0, dir >= 0);
    ctx.closePath();
    const grad = ctx.createRadialGradient(0, 0, r0, 0, 0, r1);
    grad.addColorStop(0, `rgba(${col},0)`);
    grad.addColorStop(1, `rgba(${col},${0.45 + p * 0.25})`);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.9 * (1 - p * 0.15);
    ctx.fill();
    // bright leading edge — the blade's current cut line
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(255,255,242,${0.9 * (1 - p * 0.3)})`;
    ctx.lineWidth = heavy ? 6 : 4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
    ctx.lineTo(Math.cos(a1) * (r1 + 6), Math.sin(a1) * (r1 + 6));
    ctx.stroke();
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
  // REED KATANA (design/4 Weapons + reference pack): a curved single-edged swamp katana —
  // steel-green blade with a glowing lime edge, round tsuba, cloth-wrapped tsuka.
  const bo = -9;                               // blade curves upward toward the tip
  const spine = (): void => { ctx.moveTo(13, -3); ctx.quadraticCurveTo(L * 0.55, -6 + bo * 0.4, L, bo); };
  const edge = (): void => { ctx.moveTo(14, 4); ctx.quadraticCurveTo(L * 0.55, 2 + bo * 0.4, L - 2, bo + 2); };
  // blade body
  ctx.beginPath();
  ctx.moveTo(13, -3); ctx.quadraticCurveTo(L * 0.55, -6 + bo * 0.4, L, bo);
  ctx.lineTo(L - 2, bo + 2); ctx.quadraticCurveTo(L * 0.55, 2 + bo * 0.4, 14, 5);
  ctx.closePath();
  ctx.fillStyle = '#838d6e'; ctx.fill();
  // glowing lime cutting edge (hamon)
  ctx.strokeStyle = 'rgba(150,255,120,0.4)'; ctx.lineWidth = 3.2; ctx.beginPath(); edge(); ctx.stroke();
  ctx.strokeStyle = '#e2f4b6'; ctx.lineWidth = 1.6; ctx.beginPath(); edge(); ctx.stroke();
  // dark spine
  ctx.strokeStyle = '#39472a'; ctx.lineWidth = 1.6; ctx.beginPath(); spine(); ctx.stroke();
  // round tsuba guard
  ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.ellipse(11, 0, 3, 7.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b6ff6a'; ctx.shadowColor = '#8fff5a'; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.arc(11, -6, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  // cloth-wrapped tsuka (handle)
  ctx.fillStyle = '#243038'; ctx.fillRect(-5, -3.5, 16, 7);
  ctx.strokeStyle = '#101a20'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-4 + i * 4, -3.5); ctx.lineTo(-1 + i * 4, 3.5); ctx.stroke(); }
  // kashira (pommel)
  ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(-5, 0, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Authored attack telegraph: a danger zone that FILLS as the enemy winds up (soft red-amber
// disc + a crisp ring that snaps bright at the end) — reads as "incoming", not a debug gizmo.
function drawAttackTell(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, p: number) {
  const rr = radius * (0.55 + p * 0.45);
  ctx.save();
  const g = ctx.createRadialGradient(x, y, rr * 0.2, x, y, rr);
  g.addColorStop(0, `rgba(255,120,60,${0.04 + p * 0.22})`);
  g.addColorStop(0.75, `rgba(240,80,50,${0.03 + p * 0.14})`);
  g.addColorStop(1, 'rgba(240,80,50,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  // filling wedge sweep (clock hand) so the timing reads
  ctx.strokeStyle = `rgba(255,190,120,${0.35 + p * 0.55})`;
  ctx.lineWidth = 1.5 + p * 2.5;
  ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.55, 0, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
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
  const sImg = (e.flashT > 0 && img('blobbitHit')) ? img('blobbitHit') : img('sludgeling');
  if (sImg) {
    // bouncy waddle: rock + hop + per-step squish while closing on the player (critics: too stiff)
    const moving = e.state === 'seek' && Math.hypot(e.vx, e.vy) > 10;
    const wadT = time * 9 + e.seed * 20;
    if (moving) {
      const wadHop = Math.abs(Math.sin(wadT)) * r * 0.3;
      ctx.rotate(Math.sin(wadT) * 0.2);            // rock
      ctx.translate(0, -wadHop);                    // hop
      ctx.scale(1 + Math.cos(wadT * 2) * 0.09, 1 - Math.cos(wadT * 2) * 0.09); // squish per step
    }
    if (e.flashT > 0) ctx.scale(1.28, 0.72);        // hard flatten recoil on hit (juice)
    const h = r * 3.15;                             // plumper/bigger (critics: read as threats)
    const dw = h * (sImg.width / sImg.height);
    ctx.imageSmoothingEnabled = false;
    // soft bioluminescent rim so the slime separates from the dark water + green foliage
    ctx.shadowColor = 'rgba(150,240,150,0.75)'; ctx.shadowBlur = 7;
    ctx.drawImage(sImg, -dw / 2, -h * 0.6, dw, h);
    ctx.shadowBlur = 0;
    ctx.drawImage(sImg, -dw / 2, -h * 0.6, dw, h);
    if (e.flashT > 0) {
      ctx.globalAlpha = 0.9; ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(sImg, -dw / 2, -h * 0.6, dw, h);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (e.state === 'windup') drawAttackTell(ctx, e.atkX, e.atkY, data.atkRadius, e.stateF / data.atkWindup);
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

  // windup strike telegraph (honest ground truth) — authored filling danger zone
  if (e.state === 'windup') {
    drawAttackTell(ctx, e.atkX, e.atkY, data.atkRadius, e.stateF / data.atkWindup);
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
  drawPixelText(ctx, String(f.essence), 122, 154, 30, C.cream, 'left');

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

  // kill tally: subtle notches under essence (the pond keeps score)
  drawPixelText(ctx, `x${w.kills}`, 122, 196, 20, 'rgba(242,234,216,0.4)', 'left');

  if (paused) {
    overlay(ctx, 'rgba(2,8,6,0.72)');
    drawPixelText(ctx, 'PAUSED', ARENA_W / 2, ARENA_H / 2, 68, C.cream, 'center', 900);
  }
  if (w.gameOver) {
    overlay(ctx, 'rgba(6,2,4,0.68)');
    // themed, restrained (Ian: minimal UI text) — sickly swamp-green, pixel font
    drawPixelText(ctx, 'THE POND CLAIMS YOU', ARENA_W / 2, ARENA_H / 2 - 26, 54, '#8fd17a', 'center', 900);
    drawPixelText(ctx, `x${w.kills}`, ARENA_W / 2, ARENA_H / 2 + 40, 30, C.gold, 'center', 800);
    if (Math.sin(time * 4) > 0) {
      drawPixelText(ctx, 'R', ARENA_W / 2, ARENA_H / 2 + 100, 24, 'rgba(242,234,216,0.7)', 'center', 800);
    }
  }
  ctx.restore();
}

function overlay(ctx: CanvasRenderingContext2D, fill: string) {
  ctx.fillStyle = fill;
  ctx.fillRect(-200, -200, ARENA_W + 400, ARENA_H + 400);
}

// Pixel-font text: render small, upscale with smoothing off -> chunky bitmap look that matches
// the reference font AND needs no external font file (verifiable headless). All game text uses it.
let ptCanvas: HTMLCanvasElement | null = null;
function drawPixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
                       size: number, color: string, align: 'left' | 'center' | 'right' = 'left', weight = 800) {
  const scale = 3;
  const src = Math.max(6, Math.round(size / scale));
  if (!ptCanvas) ptCanvas = document.createElement('canvas');
  const o = ptCanvas;
  const g = o.getContext('2d')!;
  const font = `${weight} ${src}px 'Outfit', 'Trebuchet MS', sans-serif`;
  g.font = font;
  const tw = Math.max(1, Math.ceil(g.measureText(text).width));
  o.width = tw + 2; o.height = src + 4;                 // resizing clears the canvas
  g.font = font; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillStyle = color;
  g.fillText(text, 1, 2);
  const dw = o.width * scale, dh = o.height * scale;
  let dx = x; if (align === 'center') dx = x - dw / 2; else if (align === 'right') dx = x - dw;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(o, dx, y - dh / 2, dw, dh);
  ctx.imageSmoothingEnabled = prev;
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.bezierCurveTo(x - s * 1.4, y, x - s * 0.8, y - s, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.8, y - s, x + s * 1.4, y, x, y + s);
  ctx.fill();
}
