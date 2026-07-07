// CROAKDOWN renderer — Canvas 2D. Placeholder art is PROCEDURAL but silhouette-first and
// palette-disciplined (swamp-mystic world, house-identity chrome). gpt-image-1 sprites swap
// in later via the atlas manifest (drawSprite falls back to vectors until then).

import { Game, Frog, Enemy, Tower, ARENA_W, ARENA_H, HEART, loadout } from './game';
import { TOWERS, FROGS, ROOT_NODES, SPAWN_MOUTHS, ENEMIES, BOSS_CARDS, EnemyKind, TowerKind } from './data';
import { juice, particles, decals, floaters, shakeOffset } from './juice';
import { getMusicVolume, getSfxVolume } from './audio';
import { rerollCost } from './sim';

export const VIEW_W = ARENA_W;
export const VIEW_H = ARENA_H;

const P_RIM = ['#e8b84a', '#4ac4b8']; // P1 amber / P2 spore-teal (BRIEF §7.3)
const UI_BLUE = '#A5D8E8';
const INK = '#1a2420';
const TIER_COLORS = ['#e8e4d8', '#7ab8e0', '#b48ae0', '#e8a04a']; // white/blue/purple/amber

// ---------- sprite atlas hook (art pass swaps these in) ----------
const sprites = new Map<string, HTMLImageElement>();
export async function loadAtlas(manifestUrl = '/art/manifest.json') {
  try {
    const res = await fetch(manifestUrl);
    if (!res.ok) return;
    const manifest: Record<string, string> = await res.json();
    await Promise.all(Object.entries(manifest).map(([key, url]) => new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => { sprites.set(key, img); resolve(); };
      img.onerror = () => resolve();
      img.src = url;
    })));
  } catch { /* vectors until the art pass lands */ }
}
function sprite(key: string): HTMLImageElement | undefined { return sprites.get(key); }
function drawSpriteOr(ctx: CanvasRenderingContext2D, key: string, x: number, y: number, size: number, fallback: () => void, flip = 1) {
  const img = sprite(key);
  if (img) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip, 1);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  } else fallback();
}

// ---------- static arena layer (pre-rendered once) ----------
let arenaCanvas: HTMLCanvasElement | null = null;
function buildArena(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = ARENA_W; c.height = ARENA_H;
  const x = c.getContext('2d')!;
  // bog base — brighter mid-green so entities (dark-outlined) pop against it
  const grad = x.createRadialGradient(ARENA_W / 2, ARENA_H / 2, 100, ARENA_W / 2, ARENA_H / 2, 700);
  grad.addColorStop(0, '#2a4232');
  grad.addColorStop(0.6, '#22362a');
  grad.addColorStop(1, '#16231c');
  x.fillStyle = grad;
  x.fillRect(0, 0, ARENA_W, ARENA_H);
  let s = 12345;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  // mottled ground texture
  for (let i = 0; i < 160; i++) {
    const px = rnd() * ARENA_W, py = rnd() * ARENA_H, r = 8 + rnd() * 30;
    x.fillStyle = `rgba(${40 + rnd() * 30}, ${64 + rnd() * 30}, ${44 + rnd() * 24}, ${0.12 + rnd() * 0.12})`;
    x.beginPath(); x.ellipse(px, py, r, r * 0.7, rnd() * Math.PI, 0, Math.PI * 2); x.fill();
  }
  // water pools — visible teal sheen with bright rims
  for (let i = 0; i < 22; i++) {
    const px = rnd() * ARENA_W, py = rnd() * ARENA_H, r = 30 + rnd() * 80;
    const pool = x.createRadialGradient(px, py, 2, px, py, r);
    pool.addColorStop(0, 'rgba(60, 120, 130, 0.55)');
    pool.addColorStop(1, 'rgba(30, 66, 74, 0.35)');
    x.fillStyle = pool;
    x.beginPath(); x.ellipse(px, py, r, r * 0.5, rnd() * Math.PI * 0.3, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(140, 210, 200, 0.3)';
    x.lineWidth = 2.5;
    x.stroke();
    // glints
    x.fillStyle = 'rgba(190, 240, 230, 0.25)';
    x.beginPath(); x.ellipse(px - r * 0.25, py - r * 0.12, r * 0.3, r * 0.08, 0, 0, Math.PI * 2); x.fill();
  }
  // lily pads — rim-lit, readable
  for (let i = 0; i < 16; i++) {
    const px = rnd() * ARENA_W, py = rnd() * ARENA_H, r = 14 + rnd() * 20;
    x.fillStyle = 'rgba(74, 120, 74, 0.85)';
    x.beginPath(); x.ellipse(px, py, r, r * 0.72, rnd() * Math.PI, 0.3, Math.PI * 2 + 0.1); x.fill();
    x.strokeStyle = 'rgba(150, 200, 140, 0.55)';
    x.lineWidth = 2.5; x.stroke();
  }
  // reeds
  for (let i = 0; i < 110; i++) {
    const px = rnd() * ARENA_W, py = rnd() * ARENA_H;
    x.strokeStyle = `rgba(${86 + rnd() * 40}, ${130 + rnd() * 40}, ${76 + rnd() * 30}, 0.6)`;
    x.lineWidth = 2.5;
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(px + (rnd() - 0.5) * 10, py - 12 - rnd() * 16, px + (rnd() - 0.5) * 18, py - 22 - rnd() * 20);
    x.stroke();
  }
  // glowing spore moss clusters near root nodes (leads the eye to build sites)
  for (const n of ROOT_NODES) {
    const nx = n.x * ARENA_W, ny = n.y * ARENA_H;
    for (let i = 0; i < 7; i++) {
      const a = rnd() * Math.PI * 2, d = 30 + rnd() * 26;
      const sx2 = nx + Math.cos(a) * d, sy2 = ny + Math.sin(a) * d * 0.7;
      const glow = x.createRadialGradient(sx2, sy2, 0, sx2, sy2, 7);
      glow.addColorStop(0, 'rgba(170, 240, 190, 0.85)');
      glow.addColorStop(1, 'rgba(170, 240, 190, 0)');
      x.fillStyle = glow;
      x.beginPath(); x.arc(sx2, sy2, 7, 0, Math.PI * 2); x.fill();
    }
  }
  // root nodes: glowing stump sockets
  for (const n of ROOT_NODES) {
    const nx = n.x * ARENA_W, ny = n.y * ARENA_H;
    x.fillStyle = 'rgba(46, 64, 46, 0.9)';
    x.beginPath(); x.ellipse(nx, ny, 26, 18, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(120, 160, 110, 0.5)';
    x.lineWidth = 3;
    x.beginPath(); x.ellipse(nx, ny, 20, 13, 0, 0, Math.PI * 2); x.stroke();
  }
  // spawn mouths: dark root tunnels at the edges
  for (const m of SPAWN_MOUTHS) {
    const mx = m.x * ARENA_W, my = m.y * ARENA_H;
    x.fillStyle = 'rgba(8, 10, 8, 0.9)';
    x.beginPath(); x.ellipse(mx, my, 48, 34, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(110, 92, 70, 0.7)';
    x.lineWidth = 4;
    x.beginPath(); x.ellipse(mx, my, 42, 28, 0, 0, Math.PI * 2); x.stroke();
  }
  // fog vignette — depth without hiding the field
  const vig = x.createRadialGradient(ARENA_W / 2, ARENA_H / 2, 380, ARENA_W / 2, ARENA_H / 2, 820);
  vig.addColorStop(0, 'rgba(8, 14, 10, 0)');
  vig.addColorStop(1, 'rgba(8, 14, 10, 0.55)');
  x.fillStyle = vig;
  x.fillRect(0, 0, ARENA_W, ARENA_H);
  return c;
}

// gameplay anchors drawn OVER the generated backdrop (root sockets + spawn mouths must
// stay readable wherever the art pass put its scenery)
function drawArenaAnchors(ctx: CanvasRenderingContext2D, g: Game) {
  // the backdrop's painted stumps are the sockets — just a soft breathing ring on each empty one
  for (let i = 0; i < ROOT_NODES.length; i++) {
    if (g.towers.some(t => t.node === i)) continue;
    const nx = ROOT_NODES[i].x * ARENA_W, ny = ROOT_NODES[i].y * ARENA_H;
    const pulse = 0.30 + Math.sin(g.time * 2 + nx) * 0.14;
    ctx.strokeStyle = `rgba(150, 220, 160, ${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(nx, ny, 26, 17, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // spawn mouths: subtle dark burrows at the edges (gameplay anchor over the painting)
  for (const m of SPAWN_MOUTHS) {
    const mx = m.x * ARENA_W, my = m.y * ARENA_H;
    const grad = ctx.createRadialGradient(mx, my, 4, mx, my, 44);
    grad.addColorStop(0, 'rgba(4, 6, 4, 0.85)');
    grad.addColorStop(1, 'rgba(4, 6, 4, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(mx, my, 44, 30, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// grounding drop shadow under every live entity
function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(6, 10, 8, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.75, r * 0.95, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- main draw ----------
export function draw(ctx: CanvasRenderingContext2D, g: Game, canvasW: number, canvasH: number) {
  if (!arenaCanvas) arenaCanvas = buildArena();
  ctx.save();
  ctx.imageSmoothingEnabled = false; // pixel art stays crisp (art-bible law)
  // letterbox-fit the arena
  const scale = Math.min(canvasW / VIEW_W, canvasH / VIEW_H);
  const ox = (canvasW - VIEW_W * scale) / 2, oy = (canvasH - VIEW_H * scale) / 2;
  ctx.fillStyle = '#060a08';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  const [shx, shy] = shakeOffset(g.time);
  const zoom = 1 + juice.zoomPulse * 0.03;
  ctx.translate(VIEW_W / 2 + shx, VIEW_H / 2 + shy);
  ctx.scale(zoom, zoom);
  ctx.translate(-VIEW_W / 2, -VIEW_H / 2);

  if (g.phase === 'title') { drawTitle(ctx, g); ctx.restore(); return; }
  if (g.phase === 'frogpick') { drawFrogPick(ctx, g); ctx.restore(); return; }

  // world — pixel backdrop from the art pass when it exists, procedural until then
  const backdrop = sprite('arena_backdrop');
  if (backdrop) {
    ctx.drawImage(backdrop, 0, 0, ARENA_W, ARENA_H);
    drawArenaAnchors(ctx, g);
  } else {
    ctx.drawImage(arenaCanvas, 0, 0);
  }
  drawWorldTint(ctx, g);
  drawDecals(ctx);
  drawHeart(ctx, g);
  drawForecast(ctx, g);
  drawTowers(ctx, g);
  drawOrbs(ctx, g);
  drawEnemies(ctx, g);
  drawFrogs(ctx, g);
  drawProjectiles(ctx, g);
  // the golden fly (secret): a streak of gold you have to chase
  if (g.goldenFly) {
    const fly = g.goldenFly;
    for (let i = 1; i <= 4; i++) {
      ctx.globalAlpha = 0.5 - i * 0.1;
      dot(ctx, fly.x - i * 9, fly.y - Math.sin((fly.t - i * 0.03) * 3.2) * 3, 4 - i * 0.6, '#ffd75e');
    }
    ctx.globalAlpha = 1;
    dot(ctx, fly.x, fly.y, 5, '#ffe9a0');
    ctx.fillStyle = 'rgba(255, 235, 160, 0.65)';
    ctx.beginPath();
    ctx.ellipse(fly.x - 2, fly.y - 5, 5, 2.4, Math.sin(fly.t * 40) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  drawParticles(ctx);
  drawFloaters(ctx);
  drawHud(ctx, g);
  if (g.bossRef) drawBossBar(ctx, g);
  if (g.bossIntroT > 0 && g.bossIntroKind) drawBossCard(ctx, g);

  // overlays
  if (g.phase === 'shop') drawShop(ctx, g);
  if (g.phase === 'levelup') drawLevelup(ctx, g);
  if (g.phase === 'ceremony') drawCeremony(ctx, g);
  if (g.phase === 'gameover') drawEnd(ctx, g, false);
  if (g.phase === 'victory') drawEnd(ctx, g, true);
  if (g.paused) drawPause(ctx, g);

  ctx.restore();
}

// world-state lighting: build = warm dusk, wave = cold night (feat #3, no banners)
function drawWorldTint(ctx: CanvasRenderingContext2D, g: Game) {
  const d = g.worldDusk; // 0 build → 1 wave
  ctx.fillStyle = `rgba(${Math.round(60 - d * 45)}, ${Math.round(42 - d * 26)}, ${Math.round(10 + d * 40)}, ${0.10 + d * 0.10})`;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
}

function drawHeart(ctx: CanvasRenderingContext2D, g: Game) {
  const pulse = 1 + Math.sin(g.time * 2.2) * 0.04;
  const frac = g.heartHp / g.heartMax;
  // lotus pad
  ctx.fillStyle = '#233c2a';
  ctx.beginPath(); ctx.ellipse(HEART.x, HEART.y + 8, HEART.r + 26, (HEART.r + 26) * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(140, 190, 140, 0.35)';
  ctx.lineWidth = 3; ctx.stroke();
  // heartbloom
  const glow = ctx.createRadialGradient(HEART.x, HEART.y, 4, HEART.x, HEART.y, HEART.r * 1.9);
  glow.addColorStop(0, `rgba(255, ${Math.round(150 + frac * 90)}, 170, ${0.5 + frac * 0.3})`);
  glow.addColorStop(1, 'rgba(255, 160, 170, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(HEART.x, HEART.y, HEART.r * 1.9, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + g.time * 0.15;
    ctx.fillStyle = g.heartFlash > 0 ? '#ffffff' : `rgba(${230 - i * 4}, ${120 + frac * 80}, ${150}, 0.95)`;
    ctx.beginPath();
    ctx.ellipse(HEART.x + Math.cos(a) * 18 * pulse, HEART.y + Math.sin(a) * 18 * pulse, 22, 11, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = g.heartFlash > 0 ? '#fff' : '#ffe9a0';
  ctx.beginPath(); ctx.arc(HEART.x, HEART.y, 12 * pulse, 0, Math.PI * 2); ctx.fill();
  // ready-check ring during build
  if (g.phase === 'build' && g.buildReadyT > 0) {
    ctx.strokeStyle = UI_BLUE;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(HEART.x, HEART.y, HEART.r + 16, -Math.PI / 2, -Math.PI / 2 + g.buildReadyT * Math.PI * 2);
    ctx.stroke();
  }
}

// world-space threat forecast: glowing eyes + silhouette glyphs at spawn mouths (feat #2)
function drawForecast(ctx: CanvasRenderingContext2D, g: Game) {
  if (g.phase !== 'build' && g.phase !== 'shop') return;
  for (const f of g.forecast) {
    const m = SPAWN_MOUTHS[f.mouth];
    const mx = m.x * ARENA_W, my = m.y * ARENA_H;
    const cx = Math.max(60, Math.min(ARENA_W - 60, mx)), cy = Math.max(50, Math.min(ARENA_H - 50, my));
    const blink = (Math.sin(g.time * 3 + f.mouth * 2) + 1) / 2;
    // pairs of eyes in the dark
    for (let i = 0; i < f.kinds.length; i++) {
      const ex = cx + (i - (f.kinds.length - 1) / 2) * 26;
      const ey = cy + Math.sin(g.time * 2 + i) * 3;
      ctx.fillStyle = `rgba(255, ${90 + blink * 60}, 60, ${0.55 + blink * 0.4})`;
      ctx.beginPath(); ctx.arc(ex - 5, ey, 3.4, 0, Math.PI * 2); ctx.arc(ex + 5, ey, 3.4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ---------- entities (silhouette-first placeholder vectors) ----------
function outlined(ctx: CanvasRenderingContext2D, fill: string, flash: number, path: () => void) {
  ctx.save();
  path();
  ctx.fillStyle = flash > 0 ? '#ffffff' : fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(6, 10, 8, 0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawEnemies(ctx: CanvasRenderingContext2D, g: Game) {
  for (const e of g.enemies) {
    if (!e.alive) continue;
    if (e.telegraph > 0) {
      // ground glyph telegraph (research: Brotato red X)
      const a = 1 - e.telegraph / 0.9;
      ctx.strokeStyle = `rgba(255, 80, 60, ${0.35 + a * 0.5})`;
      ctx.lineWidth = 3.5;
      const r = 12 + a * 6;
      ctx.beginPath();
      ctx.moveTo(e.x - r, e.y - r); ctx.lineTo(e.x + r, e.y + r);
      ctx.moveTo(e.x + r, e.y - r); ctx.lineTo(e.x - r, e.y + r);
      ctx.stroke();
      continue;
    }
    // victim-sprite shake during hitstop (hurtbox static — Sakurai law)
    const sx = e.shakeT > 0 ? (Math.random() - 0.5) * 5 : 0;
    const sy = e.shakeT > 0 ? (Math.random() - 0.5) * 5 : 0;
    const x = e.x + sx, y = e.y + sy, r = e.def.radius;
    const wob = Math.sin(g.time * 6 + e.x * 0.05) * 0.12;
    shadow(ctx, e.x, e.y, r);
    drawSpriteOr(ctx, `enemy_${e.def.kind}`, x, y, r * 3.4, () => {
      drawEnemyVector(ctx, e.def.kind, x, y, r, e.hitFlash, wob, g.time);
    });
    if (e.isElite) {
      ctx.strokeStyle = '#e8a04a';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.stroke();
    }
    if (e.def.boss || e.isElite || e.hp < e.maxHp * 0.995 && e.maxHp > 100) {
      // small hp sliver only for big things (world > text law)
      if (e.def.boss || e.isElite) {
        const w = r * 2.2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x - w / 2, y - r - 12, w, 4);
        ctx.fillStyle = '#e05a5a';
        ctx.fillRect(x - w / 2, y - r - 12, w * Math.max(0, e.hp / e.maxHp), 4);
      }
    }
  }
}

function drawEnemyVector(ctx: CanvasRenderingContext2D, kind: EnemyKind, x: number, y: number, r: number, flash: number, wob: number, t: number) {
  const tint = flash > 0 ? '#ffffff' : undefined;
  switch (kind) {
    case 'sludgeling':
      outlined(ctx, tint ?? '#4a6741', flash, () => { ctx.beginPath(); ctx.ellipse(x, y, r * (1 + wob), r * (1 - wob), 0, 0, Math.PI * 2); });
      dot(ctx, x - r * 0.3, y - r * 0.2, 2.5, '#ffdf60'); dot(ctx, x + r * 0.3, y - r * 0.2, 2.5, '#ffdf60');
      break;
    case 'bogrunner':
      outlined(ctx, tint ?? '#5d4a66', flash, () => { ctx.beginPath(); ctx.moveTo(x + r * 1.3, y); ctx.lineTo(x - r, y - r * 0.8); ctx.lineTo(x - r * 0.5, y); ctx.lineTo(x - r, y + r * 0.8); ctx.closePath(); });
      dot(ctx, x + r * 0.4, y, 2.5, '#ff9060');
      break;
    case 'spitter':
      outlined(ctx, tint ?? '#6b7d3a', flash, () => { ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r * 0.9, 0, 0, Math.PI * 2); });
      outlined(ctx, tint ?? '#8a9d4a', flash, () => { ctx.beginPath(); ctx.ellipse(x, y - r * 0.7, r * 0.45, r * 0.55, 0, 0, Math.PI * 2); });
      break;
    case 'shellback':
      outlined(ctx, tint ?? '#3d5c5c', flash, () => { ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.closePath(); });
      outlined(ctx, tint ?? '#2c4444', flash, () => { ctx.beginPath(); ctx.ellipse(x, y + 2, r * 1.05, r * 0.4, 0, 0, Math.PI); });
      break;
    case 'broodmother':
      outlined(ctx, tint ?? '#7a4a5e', flash, () => { ctx.beginPath(); ctx.ellipse(x, y, r * (1 + wob * 0.5), r * 1.1, 0, 0, Math.PI * 2); });
      for (let i = 0; i < 3; i++) dot(ctx, x + Math.cos(t * 2 + i * 2.1) * r * 0.4, y + Math.sin(t * 2 + i * 2.1) * r * 0.4, 3.5, '#c88aa0');
      break;
    case 'broodling':
      outlined(ctx, tint ?? '#96637a', flash, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); });
      break;
    case 'dragonfly': {
      const wingFlap = Math.sin(t * 30) * 0.7;
      ctx.fillStyle = `rgba(140, 200, 220, ${0.5 + Math.abs(wingFlap) * 0.3})`;
      ctx.beginPath(); ctx.ellipse(x, y - 4, r * 1.6, r * 0.5, wingFlap * 0.4, 0, Math.PI * 2); ctx.fill();
      outlined(ctx, tint ?? '#4a7d8c', flash, () => { ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r * 0.5, 0, 0, Math.PI * 2); });
      break;
    }
    case 'rotleech':
      for (let i = 0; i < 3; i++) {
        const seg = i * r * 0.8;
        outlined(ctx, tint ?? (i === 0 ? '#8c5a3a' : '#6e4630'), flash, () => { ctx.beginPath(); ctx.arc(x - seg, y + Math.sin(t * 5 + i) * 3, r * (1 - i * 0.18), 0, Math.PI * 2); });
      }
      break;
    case 'hunter':
      outlined(ctx, tint ?? '#5e3d5c', flash, () => { ctx.beginPath(); ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r, y + r * 0.8); ctx.lineTo(x, y + r * 0.3); ctx.lineTo(x - r, y + r * 0.8); ctx.closePath(); });
      dot(ctx, x - 3, y - 2, 2.5, '#ff5a5a'); dot(ctx, x + 3, y - 2, 2.5, '#ff5a5a');
      break;
    case 'elder_sludge':
      outlined(ctx, tint ?? '#37503a', flash, () => { ctx.beginPath(); ctx.ellipse(x, y, r * (1 + wob), r * (0.9 - wob), 0, 0, Math.PI * 2); });
      for (let i = 0; i < 4; i++) dot(ctx, x + Math.cos(i * 1.6 + t) * r * 0.5, y + Math.sin(i * 1.6 + t) * r * 0.4, 3, '#ffdf60');
      break;
    case 'drowned_stag': {
      outlined(ctx, tint ?? '#42606e', flash, () => { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2); });
      // antlers
      ctx.strokeStyle = flash > 0 ? '#fff' : '#8aa4b0';
      ctx.lineWidth = 5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * r * 0.4, y - r * 0.6);
        ctx.lineTo(x + s * r * 0.9, y - r * 1.4);
        ctx.moveTo(x + s * r * 0.65, y - r * 1.0);
        ctx.lineTo(x + s * r * 1.2, y - r * 1.15);
        ctx.stroke();
      }
      dot(ctx, x - r * 0.25, y - r * 0.15, 4, '#b0e8ff'); dot(ctx, x + r * 0.25, y - r * 0.15, 4, '#b0e8ff');
      break;
    }
    case 'mother_of_moths': {
      const flap = Math.sin(t * 8) * 0.5;
      ctx.fillStyle = `rgba(190, 175, 215, ${0.35 + Math.abs(flap) * 0.25})`;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * r * 0.9, y, r * 1.1, r * 0.6, s * flap, 0, Math.PI * 2); ctx.fill(); }
      outlined(ctx, tint ?? '#8a7d9e', flash, () => { ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r, 0, 0, Math.PI * 2); });
      dot(ctx, x - 6, y - r * 0.5, 4.5, '#ffe8a0'); dot(ctx, x + 6, y - r * 0.5, 4.5, '#ffe8a0');
      break;
    }
    case 'rotting_king': {
      outlined(ctx, tint ?? '#5e6e3a', flash, () => { ctx.beginPath(); ctx.ellipse(x, y, r * (1 + wob * 0.4), r * 0.95, 0, 0, Math.PI * 2); });
      // crown of roots
      ctx.strokeStyle = flash > 0 ? '#fff' : '#8c8050';
      ctx.lineWidth = 6;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * r * 0.3, y - r * 0.7);
        ctx.lineTo(x + i * r * 0.42, y - r * 1.35);
        ctx.stroke();
      }
      dot(ctx, x - r * 0.3, y - r * 0.15, 5, '#c8ff60'); dot(ctx, x + r * 0.3, y - r * 0.15, 5, '#c8ff60');
      break;
    }
  }
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function drawFrogs(ctx: CanvasRenderingContext2D, g: Game) {
  for (const f of g.frogs) {
    const x = f.x, y = f.y;
    if (f.state === 'downed') {
      // bleed-out ghost
      ctx.globalAlpha = 0.55 + Math.sin(g.time * 4) * 0.15;
      drawFrogBody(ctx, f, x, y, g.time, true);
      ctx.globalAlpha = 1;
      if (f.reviveProgress > 0) {
        ctx.strokeStyle = '#aef0c0';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + f.reviveProgress * Math.PI * 2); ctx.stroke();
      }
      continue;
    }
    // greatsword swing: heavy crescent slash toward the target
    if (f.attackAnim > 0 && f.def.weapon.kind === 'sword') {
      const swingA = Math.atan2(f.attackTY - y, f.attackTX - x);
      const prog = 1 - f.attackAnim; // 0 → 1 over the swing
      const halfArc = (f.def.weapon.arc ?? Math.PI * 0.8) / 2;
      const a0 = swingA - halfArc + prog * halfArc * 2;
      const range = f.stats.range;
      ctx.save();
      // crescent smear
      ctx.fillStyle = `rgba(232, 224, 210, ${0.5 * f.attackAnim})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, range, a0 - 0.5, a0 + 0.22);
      ctx.closePath();
      ctx.fill();
      // the blade itself — huge, reads bigger than the frog
      ctx.translate(x, y);
      ctx.rotate(a0);
      ctx.fillStyle = '#c8ccd2';
      ctx.strokeStyle = 'rgba(6, 10, 8, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(14, -7); ctx.lineTo(range - 8, -3.5); ctx.lineTo(range + 4, 0); ctx.lineTo(range - 8, 3.5); ctx.lineTo(14, 7);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6a5038';
      ctx.fillRect(4, -4, 12, 8); // grip
      ctx.restore();
    }
    // tongue/attack animation
    if (f.attackAnim > 0 && f.def.weapon.kind === 'tongue') {
      ctx.strokeStyle = '#ff9fb4';
      ctx.lineWidth = 6 * f.attackAnim;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      const tx = x + (f.attackTX - x) * f.attackAnim, ty = y - 4 + (f.attackTY - y + 4) * f.attackAnim;
      ctx.quadraticCurveTo((x + tx) / 2, Math.min(y, ty) - 14, tx, ty);
      ctx.stroke();
      dot(ctx, tx, ty, 5 * f.attackAnim, '#ff9fb4');
      ctx.lineCap = 'butt';
    }
    drawFrogBody(ctx, f, x, y, g.time, false);
    // build/attune channel: spores flying from frog to node (diegetic purchase, feat #1)
    if (f.buildChannel > 0 && f.channelNode >= 0) {
      const nx = ROOT_NODES[f.channelNode].x * ARENA_W, ny = ROOT_NODES[f.channelNode].y * ARENA_H;
      for (let i = 0; i < 5; i++) {
        const p = (f.buildChannel + i * 0.2) % 1;
        const px = x + (nx - x) * p, py = y + (ny - y) * p - Math.sin(p * Math.PI) * 24;
        dot(ctx, px, py, 3.5, `rgba(190, 240, 160, ${0.9 - p * 0.3})`);
      }
      ctx.strokeStyle = 'rgba(190, 240, 160, 0.8)';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(nx, ny, 30, -Math.PI / 2, -Math.PI / 2 + f.buildChannel * Math.PI * 2); ctx.stroke();
    }
  }
}

function drawFrogBody(ctx: CanvasRenderingContext2D, f: Frog, x: number, y: number, t: number, downed: boolean) {
  const hop = downed ? 0 : Math.abs(Math.sin(t * 8 + f.idx)) * (Math.abs(f.vx) + Math.abs(f.vy) > 1 ? 3 : 1);
  const flash = f.hitFlash > 0;
  if (!downed) shadow(ctx, x, y + 6, 16);
  // Ribbit's idle greatsword: dragged low behind him, bigger than he is
  if (f.def.weapon.kind === 'sword' && f.attackAnim <= 0) {
    ctx.save();
    ctx.translate(x, y - hop);
    ctx.rotate(f.facing > 0 ? 0.9 : Math.PI - 0.9);
    ctx.fillStyle = '#b8bcc4';
    ctx.strokeStyle = 'rgba(6, 10, 8, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, -6); ctx.lineTo(58, -3); ctx.lineTo(66, 0); ctx.lineTo(58, 3); ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6a5038';
    ctx.fillRect(2, -3.5, 9, 7);
    ctx.restore();
  }
  drawSpriteOr(ctx, `frog_${f.def.id}`, x, y - hop, 52, () => {
    // team rim
    ctx.strokeStyle = P_RIM[f.idx];
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, y - hop, 20, 17, 0, 0, Math.PI * 2); ctx.stroke();
    // body (chunky, thick outline)
    outlined(ctx, flash ? '#fff' : f.def.tint, f.hitFlash, () => {
      ctx.beginPath(); ctx.ellipse(x, y - hop, 17, 14, 0, 0, Math.PI * 2);
    });
    // belly
    ctx.fillStyle = flash ? '#fff' : 'rgba(230, 235, 200, 0.75)';
    ctx.beginPath(); ctx.ellipse(x, y - hop + 5, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    // eyes (big, on top — the Ollama-pfp energy)
    for (const s of [-1, 1]) {
      dot(ctx, x + s * 8, y - hop - 11, 6.5, flash ? '#fff' : f.def.tint);
      dot(ctx, x + s * 8 + f.facing * 1.5, y - hop - 11, 3.2, '#101510');
      dot(ctx, x + s * 8 + f.facing * 1.5 - 1, y - hop - 12, 1.1, '#fff');
    }
  }, f.facing);
  // dash i-frame shimmer
  if (f.iframes > 0.05 && !downed) {
    ctx.strokeStyle = `rgba(220, 245, 255, ${f.iframes})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y - hop, 24, 20, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawTowers(ctx: CanvasRenderingContext2D, g: Game) {
  for (const t of g.towers) {
    const def = TOWERS[t.kind];
    const grow = 1 + t.growAnim * 0.25;
    const tier = t.tier;
    const x = t.x, y = t.y;
    // faint range ring while building (TD readability; hidden mid-wave to save clarity)
    if (g.phase === 'build' || g.phase === 'shop') {
      const ownerStats = g.frogs[t.owner]?.stats ?? g.frogs[0]?.stats;
      const range = def.range[t.tier - 1] * (ownerStats?.towerRange ?? 1);
      ctx.strokeStyle = 'rgba(170, 240, 190, 0.16)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.arc(x, y, range, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    shadow(ctx, x, y + 4, 16 + tier * 4);
    drawSpriteOr(ctx, `tower_${t.kind}_t${tier}`, x, y - 10, 56 + tier * 18, () => {
      const h = (24 + tier * 13) * grow;
      const sway = Math.sin(g.time * 1.5 + t.node) * 5;
      // leaves at the base
      for (const s of [-1, 1]) {
        ctx.fillStyle = 'rgba(66, 106, 66, 0.9)';
        ctx.beginPath(); ctx.ellipse(x + s * 10, y + 2, 12, 5, s * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      // stem
      ctx.strokeStyle = t.hitFlash > 0 ? '#fff' : '#3a5c3a';
      ctx.lineWidth = 7 + tier * 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.quadraticCurveTo(x + sway, y - h / 2, x + sway * 0.6, y - h); ctx.stroke();
      ctx.lineCap = 'butt';
      const hx = x + sway * 0.6, hy = y - h;
      // head per species (bigger — towers are characters)
      outlined(ctx, t.hitFlash > 0 ? '#fff' : def.tint, t.hitFlash, () => {
        ctx.beginPath();
        if (t.kind === 'snaplily') { ctx.ellipse(hx, hy, 16 + tier * 5, 12 + tier * 3.5, Math.sin(g.time * 2) * 0.25, 0, Math.PI * 2); }
        else if (t.kind === 'sporeshroom') { ctx.arc(hx, hy, 15 + tier * 5.5, Math.PI * 0.95, Math.PI * 0.05); ctx.closePath(); }
        else if (t.kind === 'bulrush') { ctx.ellipse(hx, hy, 9 + tier * 2.5, 19 + tier * 4.5, 0, 0, Math.PI * 2); }
        else { ctx.arc(hx, hy, 13 + tier * 4.5, 0, Math.PI * 2); }
      });
      // species accents
      if (t.kind === 'snaplily') { dot(ctx, hx - 5, hy - 3, 2.8, '#fff'); dot(ctx, hx + 5, hy - 3, 2.8, '#fff'); }
      if (t.kind === 'sporeshroom') for (let i = 0; i < 3; i++) dot(ctx, hx - 8 + i * 8, hy - 4 - (i % 2) * 5, 2.6, 'rgba(240, 220, 250, 0.8)');
      if (t.kind === 'willowisp') dot(ctx, hx, hy, 5 + Math.sin(g.time * 5) * 1.5, 'rgba(230, 250, 255, 0.9)');
      if (t.kind === 'moonbell') dot(ctx, hx, hy + 2, 4, 'rgba(255, 255, 255, 0.8)');
      // tier pips (world-readable, no text)
      for (let i = 0; i < tier; i++) dot(ctx, x - 8 + i * 8, y + 14, 3.2, '#cfe8a0');
    });
    // hp sliver when damaged
    if (t.hp < t.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 16, y + 18, 32, 4);
      ctx.fillStyle = '#8ac48a';
      ctx.fillRect(x - 16, y + 18, 32 * (t.hp / t.maxHp), 4);
    }
  }
  // nearest-node species indicator for each frog holding cycle (world-space radial hint)
  for (const f of g.frogs) {
    if (f.state !== 'alive') continue;
    let best = -1, bestD = 64;
    for (let i = 0; i < ROOT_NODES.length; i++) {
      const nx = ROOT_NODES[i].x * ARENA_W, ny = ROOT_NODES[i].y * ARENA_H;
      const d = Math.hypot(f.x - nx, f.y - ny);
      if (d < bestD) { best = i; bestD = d; }
    }
    if (best >= 0 && !g.towers.some(tw => tw.node === best)) {
      const nx = ROOT_NODES[best].x * ARENA_W, ny = ROOT_NODES[best].y * ARENA_H;
      const lo = loadout();
      const k = lo[f.loadoutSel % lo.length];
      // ghost of the selected species
      ctx.globalAlpha = 0.45 + Math.sin(g.time * 4) * 0.1;
      dot(ctx, nx, ny - 18, 8, TOWERS[k].tint);
      ctx.globalAlpha = 1;
    }
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, g: Game) {
  for (const p of g.projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(p.x - p.vx * 0.01, p.y - p.vy * 0.01, p.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
}

function drawOrbs(ctx: CanvasRenderingContext2D, g: Game) {
  for (const o of g.orbs) {
    const pulse = 1 + Math.sin(g.time * 6 + o.x) * 0.2;
    ctx.fillStyle = 'rgba(150, 240, 190, 0.9)';
    ctx.beginPath(); ctx.arc(o.x, o.y, 4 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(230, 255, 240, 0.8)';
    ctx.beginPath(); ctx.arc(o.x, o.y, 1.8, 0, Math.PI * 2); ctx.fill();
  }
}

function drawDecals(ctx: CanvasRenderingContext2D) {
  for (const d of decals) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.scale(d.scale, d.scale);
    ctx.globalAlpha = 0.55;
    if (d.kind === 'bones') {
      ctx.strokeStyle = '#c9c4a8';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.moveTo(-5, -4); ctx.lineTo(-5, 4); ctx.moveTo(5, -4); ctx.lineTo(5, 4); ctx.stroke();
    } else if (d.kind === 'lily') {
      ctx.fillStyle = 'rgba(110, 150, 100, 0.7)';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(i * 6 - 6, (i % 2) * 4, 6, 3, i, 0, Math.PI * 2); ctx.fill(); }
    } else if (d.kind === 'scorch') {
      ctx.fillStyle = 'rgba(20, 16, 12, 0.8)';
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
    } else if (d.kind === 'blood') {
      ctx.fillStyle = 'rgba(120, 18, 30, 0.55)';
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(6 + i * 5, (i % 2 ? 3 : -3) + i, 3.5 - i * 0.6, 2.4 - i * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(40, 55, 40, 0.6)';
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawParticles(ctx: CanvasRenderingContext2D) {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 8; }
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx: CanvasRenderingContext2D) {
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, f.life / 0.7);
    dot(ctx, f.x, f.y, f.size, f.color);
  }
  ctx.globalAlpha = 1;
}

// ---------- HUD (≤5 elements, no text labels) ----------
function drawHud(ctx: CanvasRenderingContext2D, g: Game) {
  // frog HP pips (top-left, per player)
  for (const f of g.frogs) {
    const bx = 24, by = 22 + f.idx * 34;
    dot(ctx, bx, by, 9, P_RIM[f.idx]);
    const pips = 10;
    for (let i = 0; i < pips; i++) {
      const filled = f.hp / f.maxHp > i / pips;
      ctx.fillStyle = filled ? '#e8f0e0' : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(bx + 16 + i * 15, by - 6, 11, 12, 3);
      ctx.fill();
    }
  }
  // essence (top-right): glowing orb + count (the ONE number allowed)
  dot(ctx, ARENA_W - 96, 24, 7, '#96f0be');
  ctx.fillStyle = '#e8f0e0';
  ctx.font = '700 24px Outfit, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(g.essence), ARENA_W - 82, 32);
  // wave pip-track (top-center)
  const trackW = 320, tx0 = ARENA_W / 2 - trackW / 2;
  for (let i = 1; i <= 20; i++) {
    const px = tx0 + ((i - 1) / 19) * trackW;
    const isBoss = i === 8 || i === 10 || i === 15 || i === 20;
    const done = i < g.wave || (i === g.wave && g.phase !== 'wave');
    const active = i === g.wave && g.phase === 'wave';
    ctx.fillStyle = active ? UI_BLUE : done ? 'rgba(165, 216, 232, 0.55)' : 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    if (isBoss) { ctx.arc(px, 22, active ? 7 : 5.5, 0, Math.PI * 2); }
    else ctx.arc(px, 22, active ? 5 : 3.2, 0, Math.PI * 2);
    ctx.fill();
    if (isBoss) { ctx.strokeStyle = 'rgba(232, 160, 74, 0.8)'; ctx.lineWidth = 2; ctx.stroke(); }
  }
  // heart pip (under wave track)
  const hfrac = g.heartHp / g.heartMax;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.roundRect(ARENA_W / 2 - 60, 34, 120, 7, 4); ctx.fill();
  ctx.fillStyle = hfrac > 0.4 ? '#ff9fb4' : '#ff5a6a';
  ctx.beginPath(); ctx.roundRect(ARENA_W / 2 - 60, 34, 120 * hfrac, 7, 4); ctx.fill();
}

function drawBossBar(ctx: CanvasRenderingContext2D, g: Game) {
  const b = g.bossRef!;
  const w = 520, x0 = ARENA_W / 2 - w / 2, y0 = ARENA_H - 46;
  ctx.fillStyle = 'rgba(6, 10, 8, 0.75)';
  ctx.beginPath(); ctx.roundRect(x0 - 8, y0 - 10, w + 16, 30, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.roundRect(x0, y0 - 2, w, 14, 6); ctx.fill();
  const frac = Math.max(0, b.hp / b.maxHp);
  const grad = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  grad.addColorStop(0, '#c85a78'); grad.addColorStop(1, '#e8a04a');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(x0, y0 - 2, w * frac, 14, 6); ctx.fill();
  // skull notches at phase thresholds (feat #8 — spatial dread, no text)
  for (const th of [0.66, 0.33]) {
    const px = x0 + w * th;
    const passed = frac <= th;
    ctx.fillStyle = passed ? 'rgba(255,255,255,0.25)' : '#e8e4d8';
    // tiny skull glyph
    ctx.beginPath(); ctx.arc(px, y0 - 12, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(px - 3.5, y0 - 10, 7, 4);
    ctx.fillStyle = passed ? 'rgba(0,0,0,0.2)' : '#1a2420';
    ctx.beginPath(); ctx.arc(px - 2, y0 - 13, 1.4, 0, Math.PI * 2); ctx.arc(px + 2, y0 - 13, 1.4, 0, Math.PI * 2); ctx.fill();
  }
}

// boss intro card — the ONE spider-punk collage surface (BRIEF §2)
function drawBossCard(ctx: CanvasRenderingContext2D, g: Game) {
  const kind = g.bossIntroKind!;
  const card = BOSS_CARDS[kind];
  const t = 2.2 - g.bossIntroT; // 0 → 2.2
  const slam = Math.min(1, t * 5); // card slams in fast
  const out = g.bossIntroT < 0.25 ? g.bossIntroT / 0.25 : 1; // rip out at the end
  ctx.save();
  ctx.globalAlpha = out;
  ctx.fillStyle = `rgba(4, 6, 5, ${0.72 * out})`;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  const cx = ARENA_W / 2, cy = ARENA_H / 2 - 20;
  ctx.translate(cx, cy);
  ctx.rotate((1 - slam) * 0.25 - 0.035);
  ctx.scale(0.8 + slam * 0.2, 0.8 + slam * 0.2);
  // anarchic starburst
  ctx.fillStyle = '#e8a04a';
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 210 : 330 + Math.sin(i * 7.3) * 40;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.7);
  }
  ctx.closePath();
  ctx.fill();
  // torn-paper slab
  ctx.fillStyle = '#16201a';
  ctx.beginPath();
  const w = 560, h = 300;
  let seed = 7;
  const jag = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - 0.5) * 26; };
  ctx.moveTo(-w / 2 + jag(), -h / 2 + jag());
  for (let i = 1; i <= 6; i++) ctx.lineTo(-w / 2 + (w * i) / 6 + jag(), -h / 2 + jag());
  for (let i = 1; i <= 3; i++) ctx.lineTo(w / 2 + jag(), -h / 2 + (h * i) / 3 + jag());
  for (let i = 1; i <= 6; i++) ctx.lineTo(w / 2 - (w * i) / 6 + jag(), h / 2 + jag());
  for (let i = 1; i <= 3; i++) ctx.lineTo(-w / 2 + jag(), h / 2 - (h * i) / 3 + jag());
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#efe8da';
  ctx.lineWidth = 5;
  ctx.stroke();
  // halftone dots
  ctx.fillStyle = 'rgba(232, 160, 74, 0.28)';
  for (let yy = -h / 2 + 16; yy < h / 2; yy += 17) for (let xx = -w / 2 + 16; xx < w / 2; xx += 17) {
    const rr = 1.4 + ((xx + yy * 3) % 29 + 29) % 29 / 29 * 2.4;
    ctx.beginPath(); ctx.arc(xx, yy, rr, 0, Math.PI * 2); ctx.fill();
  }
  // portrait: card art sprite if the art pass landed, else the boss vector, huge
  const img = sprites.get(`card_${kind}`);
  if (img) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20); ctx.clip();
    ctx.globalAlpha = 0.85 * out;
    ctx.drawImage(img, -w / 2, -h / 2 - 60, w, (w / 3) * 2);
    ctx.restore();
    ctx.globalAlpha = out;
  } else {
    const def = ENEMIES[kind];
    ctx.save();
    ctx.scale(2.6, 2.6);
    drawEnemyVector(ctx, kind, 0, -14, def.radius, 0, 0.1, g.time);
    ctx.restore();
  }
  // name + ONE tag (text law) — chunky ransom energy
  if (card) {
    ctx.fillStyle = '#f2f7f1';
    ctx.font = '900 54px Outfit, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.rotate(-0.02);
    ctx.fillText(card.name, 0, h / 2 - 44);
    ctx.restore();
    ctx.font = '600 20px Outfit, system-ui, sans-serif';
    ctx.fillStyle = '#e8a04a';
    ctx.fillText(card.tag, 0, h / 2 - 14);
  }
  ctx.restore();
}

// ---------- overlays (house identity: frosted glass, Outfit, #A5D8E8, ink) ----------
function frosted(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 18) {
  ctx.fillStyle = 'rgba(6, 12, 10, 0.55)';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  ctx.fillStyle = 'rgba(240, 248, 246, 0.92)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = 'rgba(165, 216, 232, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawShop(ctx: CanvasRenderingContext2D, g: Game) {
  const panelW = g.players === 2 ? 560 : 720;
  const px = g.players === 2 ? [ARENA_W / 2 - panelW - 12, ARENA_W / 2 + 12] : [ARENA_W / 2 - panelW / 2];
  // Brotato co-op precedent: per-player panels, shared wallet
  for (let pi = 0; pi < px.length; pi++) {
    const x0 = px[pi], y0 = 120, h = 520;
    if (pi === 0) frosted(ctx, x0, y0, panelW, h);
    else {
      ctx.fillStyle = 'rgba(240, 248, 246, 0.92)';
      ctx.beginPath(); ctx.roundRect(x0, y0, panelW, h, 18); ctx.fill();
      ctx.strokeStyle = 'rgba(165, 216, 232, 0.8)'; ctx.lineWidth = 2; ctx.stroke();
    }
    // player chip
    dot(ctx, x0 + 28, y0 + 30, 9, P_RIM[pi]);
    // shared essence
    ctx.fillStyle = INK;
    ctx.font = '800 30px Outfit, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(g.essence), x0 + panelW - 60, y0 + 40);
    dot(ctx, x0 + panelW - 40, y0 + 31, 7, '#4ab884');
    // 4 cards (one-glance grammar: icon + tier color + price, feat #7)
    const cardW = (panelW - 60) / 4;
    for (let ci = 0; ci < g.shopCards.length; ci++) {
      const c = g.shopCards[ci];
      const cx = x0 + 24 + ci * (cardW + 4), cy = y0 + 66, ch = 300;
      ctx.fillStyle = c.sold ? 'rgba(180, 190, 185, 0.4)' : '#ffffff';
      ctx.beginPath(); ctx.roundRect(cx, cy, cardW - 8, ch, 12); ctx.fill();
      const tier = c.item?.tier ?? 1;
      ctx.strokeStyle = c.sold ? 'rgba(0,0,0,0.1)' : TIER_COLORS[tier - 1];
      ctx.lineWidth = 3.5;
      ctx.stroke();
      if (c.sold) continue;
      // icon (procedural until art pass)
      const iconY = cy + 74;
      if (c.tower) {
        ctx.strokeStyle = '#3a5c3a'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx + cardW / 2 - 4, iconY + 30); ctx.lineTo(cx + cardW / 2 - 4, iconY - 10); ctx.stroke();
        dot(ctx, cx + cardW / 2 - 4, iconY - 16, 16, TOWERS[c.tower].tint);
      } else if (c.item) {
        dot(ctx, cx + cardW / 2 - 4, iconY, 22, TIER_COLORS[tier - 1]);
        dot(ctx, cx + cardW / 2 - 4, iconY, 10, 'rgba(255,255,255,0.6)');
      }
      // name + ONE tag (the text law)
      ctx.fillStyle = INK;
      ctx.font = '800 15px Outfit, system-ui, sans-serif';
      ctx.textAlign = 'center';
      const name = c.tower ? TOWERS[c.tower].name : c.item!.name;
      ctx.fillText(name, cx + (cardW - 8) / 2, cy + 150, cardW - 20);
      ctx.font = '500 12px Outfit, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(26, 36, 32, 0.65)';
      const tag = c.tower ? TOWERS[c.tower].tag : c.item!.tag;
      ctx.fillText(tag, cx + (cardW - 8) / 2, cy + 170, cardW - 16);
      // price chip
      const afford = g.essence >= c.price;
      ctx.fillStyle = afford ? '#e8f6ee' : '#f6e8e8';
      ctx.beginPath(); ctx.roundRect(cx + (cardW - 8) / 2 - 34, cy + ch - 52, 68, 30, 15); ctx.fill();
      ctx.fillStyle = afford ? '#1f7a4d' : '#a04848';
      ctx.font = '800 17px Outfit, system-ui, sans-serif';
      ctx.fillText(String(c.price), cx + (cardW - 8) / 2, cy + ch - 30);
      // lock pip
      dot(ctx, cx + cardW - 26, cy + 18, 6, c.locked ? '#e8a04a' : 'rgba(0,0,0,0.12)');
      // keyboard hint number
      ctx.fillStyle = 'rgba(26,36,32,0.35)';
      ctx.font = '700 13px Outfit, system-ui, sans-serif';
      ctx.fillText(String(ci + 1), cx + 16, cy + 22);
    }
    // reroll + go
    const rr = rerollCost(g.wave, g.rerolls);
    ctx.fillStyle = g.essence >= rr ? UI_BLUE : 'rgba(165, 216, 232, 0.4)';
    ctx.beginPath(); ctx.roundRect(x0 + 24, y0 + h - 110, 170, 48, 24); ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = '800 18px Outfit, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`R  ·  ${rr}`, x0 + 109, y0 + h - 80);
    ctx.fillStyle = '#1a2420';
    ctx.beginPath(); ctx.roundRect(x0 + panelW - 194, y0 + h - 110, 170, 48, 24); ctx.fill();
    ctx.fillStyle = '#f0f8f6';
    ctx.fillText('GO', x0 + panelW - 109, y0 + h - 80);
    // hints (small, bottom, opt-in glance)
    ctx.fillStyle = 'rgba(26,36,32,0.4)';
    ctx.font = '500 13px Outfit, system-ui, sans-serif';
    ctx.fillText('1-4 buy · L lock · R reroll · Enter go', x0 + panelW / 2, y0 + h - 26);
    break; // v1: one shared panel (both players buy from it); per-player split when P2 UI lands
  }
}

function drawLevelup(ctx: CanvasRenderingContext2D, g: Game) {
  const choices = g.levelupChoices[0];
  if (!choices) return;
  const w = 640, x0 = ARENA_W / 2 - w / 2, y0 = 220, h = 320;
  frosted(ctx, x0, y0, w, h);
  const fIdx = (choices[0] as any).frogIdx ?? 0;
  dot(ctx, x0 + w / 2, y0 + 36, 10, P_RIM[fIdx]);
  const cw = (w - 80) / 3;
  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    const cx = x0 + 30 + i * (cw + 10), cy = y0 + 64;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(cx, cy, cw, 190, 12); ctx.fill();
    ctx.strokeStyle = UI_BLUE; ctx.lineWidth = 3; ctx.stroke();
    dot(ctx, cx + cw / 2, cy + 62, 26, ['#e07a5f', '#81b29a', '#f2cc8f', '#9a8ab8', '#96f0be', '#7da35a', '#e8b84a'][i * 2 % 7]);
    ctx.fillStyle = INK;
    ctx.font = '800 22px Outfit, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.name, cx + cw / 2, cy + 122);
    ctx.font = '500 14px Outfit, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(26,36,32,0.65)';
    ctx.fillText(c.tag, cx + cw / 2, cy + 148);
    ctx.fillStyle = 'rgba(26,36,32,0.35)';
    ctx.font = '700 14px Outfit, system-ui, sans-serif';
    ctx.fillText(String(i + 1), cx + 18, cy + 24);
  }
}

// the Great Lotus ceremony (feat #4 — the authored jackpot)
function drawCeremony(ctx: CanvasRenderingContext2D, g: Game) {
  const t = g.ceremonyT;
  ctx.fillStyle = `rgba(4, 8, 6, ${Math.min(0.8, t * 1.2)})`;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  const cx = ARENA_W / 2, cy = ARENA_H / 2;
  // petals unfurl one by one
  const petals = 10;
  const open = Math.min(1, t / 2.2);
  for (let i = 0; i < petals; i++) {
    const petalOpen = Math.max(0, Math.min(1, open * petals - i));
    if (petalOpen <= 0) continue;
    const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
    const len = 90 + petalOpen * 90;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, 'rgba(255, 200, 215, 0.95)');
    grad.addColorStop(1, `rgba(255, 235, 180, ${0.5 + petalOpen * 0.4})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(len / 2, 0, len / 2, 26 + petalOpen * 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  // glow core
  const glow = ctx.createRadialGradient(cx, cy, 5, cx, cy, 160 + open * 100);
  glow.addColorStop(0, `rgba(255, 240, 200, ${0.5 + Math.sin(t * 5) * 0.15})`);
  glow.addColorStop(1, 'rgba(255, 240, 200, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, 160 + open * 100, 0, Math.PI * 2); ctx.fill();
  // item reveal
  if (g.ceremonyRevealed && g.ceremonyItem) {
    const item = g.ceremonyItem;
    const pop = Math.min(1, (t - 2.4) * 3);
    if (pop > 0) {
      ctx.save();
      ctx.translate(cx, cy - 10);
      ctx.scale(pop, pop);
      dot(ctx, 0, 0, 34, TIER_COLORS[item.tier - 1]);
      dot(ctx, 0, 0, 16, 'rgba(255,255,255,0.7)');
      ctx.fillStyle = '#f5f8f0';
      ctx.font = '800 30px Outfit, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name, 0, 84);
      ctx.font = '500 17px Outfit, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(240, 248, 240, 0.7)';
      ctx.fillText(item.tag, 0, 112);
      ctx.restore();
    }
  }
}

// pause — the swamp holds its breath. Sim clock is frozen, so the overlay breathes on
// real time: hush vignette, drifting fog, fireflies, a sleeping lotus bud above the words.
function drawPause(ctx: CanvasRenderingContext2D, g: Game) {
  const t = performance.now() / 1000;
  const cx = ARENA_W / 2, cy = ARENA_H / 2;

  ctx.fillStyle = 'rgba(4, 8, 6, 0.58)';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  const vig = ctx.createRadialGradient(cx, cy, 200, cx, cy, 820);
  vig.addColorStop(0, 'rgba(2, 5, 4, 0)');
  vig.addColorStop(1, 'rgba(2, 5, 4, 0.88)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  // low fog banks drifting through the dark
  for (let i = 0; i < 3; i++) {
    const fx = cx + Math.sin(t * 0.11 + i * 2.4) * (320 + i * 90);
    const fy = cy + 180 + i * 70 + Math.cos(t * 0.07 + i) * 24;
    const fog = ctx.createRadialGradient(fx, fy, 0, fx, fy, 260 + i * 60);
    fog.addColorStop(0, 'rgba(140, 180, 165, 0.05)');
    fog.addColorStop(1, 'rgba(140, 180, 165, 0)');
    ctx.fillStyle = fog;
    ctx.beginPath(); ctx.ellipse(fx, fy, 260 + i * 60, 90 + i * 20, 0, 0, Math.PI * 2); ctx.fill();
  }
  // fireflies (title language)
  for (let i = 0; i < 14; i++) {
    const fx = (Math.sin(i * 132.7 + t * (0.14 + (i % 5) * 0.05)) * 0.5 + 0.5) * ARENA_W;
    const fy = (Math.cos(i * 87.3 + t * (0.1 + (i % 3) * 0.04)) * 0.5 + 0.5) * ARENA_H;
    const tw = (Math.sin(t * 2.4 + i * 2) + 1) / 2;
    dot(ctx, fx, fy, 1.6 + tw * 1.4, `rgba(220, 255, 170, ${0.18 + tw * 0.4})`);
  }

  // sleeping lotus bud: folded petals, breathing gold core
  const breathe = (Math.sin(t * 1.4) + 1) / 2;
  const bx = cx, by = cy - 168;
  const glow = ctx.createRadialGradient(bx, by, 4, bx, by, 90 + breathe * 26);
  glow.addColorStop(0, `rgba(255, 235, 180, ${0.28 + breathe * 0.14})`);
  glow.addColorStop(1, 'rgba(255, 235, 180, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(bx, by, 90 + breathe * 26, 0, Math.PI * 2); ctx.fill();
  for (let i = -2; i <= 2; i++) {
    const lean = i * 0.34;
    ctx.save();
    ctx.translate(bx, by + 26);
    ctx.rotate(lean);
    const grad = ctx.createLinearGradient(0, 0, 0, -52);
    grad.addColorStop(0, 'rgba(255, 200, 215, 0.9)');
    grad.addColorStop(1, `rgba(255, 235, 180, ${0.65 + breathe * 0.2})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, -26, 11 - Math.abs(i) * 2, 27 - Math.abs(i) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // its lily pad
  ctx.fillStyle = 'rgba(74, 110, 78, 0.85)';
  ctx.beginPath(); ctx.ellipse(bx, by + 54, 40, 12, 0, 0, Math.PI * 2); ctx.fill();

  ctx.textAlign = 'center';
  if (g.pauseView === 'menu') {
    ctx.fillStyle = '#f2f7f1';
    ctx.font = '900 72px Outfit, system-ui, sans-serif';
    ctx.fillText('PAUSED', cx, cy - 30);
    const items = ['RESUME', 'SETTINGS', 'QUIT'];
    for (let i = 0; i < items.length; i++) {
      const iy = cy + 48 + i * 56;
      const sel = g.pauseSel === i;
      if (sel) {
        const sg = ctx.createRadialGradient(cx, iy - 9, 4, cx, iy - 9, 130);
        sg.addColorStop(0, 'rgba(255, 217, 138, 0.16)');
        sg.addColorStop(1, 'rgba(255, 217, 138, 0)');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(cx, iy - 9, 130, 0, Math.PI * 2); ctx.fill();
        // lily-pad marker
        ctx.fillStyle = 'rgba(126, 176, 110, 0.95)';
        ctx.beginPath(); ctx.ellipse(cx - 108, iy - 9, 14, 8, 0, 0.35, Math.PI * 2 + 0.05); ctx.fill();
      }
      ctx.fillStyle = sel ? '#ffd98a' : 'rgba(240, 248, 246, 0.5)';
      ctx.font = `800 ${sel ? 30 : 27}px Outfit, system-ui, sans-serif`;
      ctx.fillText(items[i], cx, iy);
    }
    ctx.fillStyle = 'rgba(240, 248, 246, 0.32)';
    ctx.font = '600 14px Outfit, system-ui, sans-serif';
    ctx.fillText('esc', cx, ARENA_H - 44);
    return;
  }

  // settings view
  ctx.fillStyle = '#f2f7f1';
  ctx.font = '900 46px Outfit, system-ui, sans-serif';
  ctx.fillText('SETTINGS', cx, cy - 52);
  const rows: { label: string; pips: number }[] = [
    { label: 'MUSIC', pips: Math.round(getMusicVolume() * 10) },
    { label: 'SOUND', pips: Math.round(getSfxVolume() * 10) },
    { label: 'SHAKE', pips: Math.round((juice.shakeSlider / 1.5) * 10) },
  ];
  for (let i = 0; i < rows.length; i++) {
    const ry = cy + 16 + i * 62;
    const sel = g.settingsSel === i;
    if (sel) {
      ctx.fillStyle = 'rgba(126, 176, 110, 0.95)';
      ctx.beginPath(); ctx.ellipse(cx - 268, ry - 8, 13, 7.5, 0, 0.35, Math.PI * 2 + 0.05); ctx.fill();
    }
    ctx.fillStyle = sel ? '#ffd98a' : 'rgba(240, 248, 246, 0.55)';
    ctx.font = '800 26px Outfit, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(rows[i].label, cx - 240, ry);
    for (let p = 0; p < 10; p++) {
      const px = cx - 20 + p * 28, py = ry - 9;
      if (p < rows[i].pips) {
        const pg = ctx.createRadialGradient(px, py, 1, px, py, 12);
        pg.addColorStop(0, 'rgba(255, 217, 138, 0.95)');
        pg.addColorStop(1, 'rgba(255, 217, 138, 0)');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
        dot(ctx, px, py, 6.5, sel ? '#ffd98a' : 'rgba(255, 217, 138, 0.75)');
      } else {
        ctx.strokeStyle = 'rgba(240, 248, 246, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px, py, 6.5, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.textAlign = 'center';
  }
  ctx.fillStyle = 'rgba(240, 248, 246, 0.32)';
  ctx.font = '600 14px Outfit, system-ui, sans-serif';
  ctx.fillText('a d  ·  esc', cx, ARENA_H - 44);
}

function drawTitle(ctx: CanvasRenderingContext2D, g: Game) {
  const vista = sprite('title_vista');
  if (vista) {
    ctx.drawImage(vista, 0, 0, ARENA_W, ARENA_H);
    ctx.fillStyle = 'rgba(6, 12, 9, 0.28)';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  } else {
    if (!arenaCanvas) arenaCanvas = buildArena();
    ctx.drawImage(arenaCanvas, 0, 0);
    ctx.fillStyle = 'rgba(6, 12, 9, 0.6)';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  }
  // heartbloom glow behind the title
  const glow = ctx.createRadialGradient(ARENA_W / 2, 330, 20, ARENA_W / 2, 330, 420);
  glow.addColorStop(0, 'rgba(255, 190, 200, 0.35)');
  glow.addColorStop(1, 'rgba(255, 190, 200, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  // fireflies
  for (let i = 0; i < 22; i++) {
    const fx = (Math.sin(i * 132.7 + g.time * (0.2 + (i % 5) * 0.08)) * 0.5 + 0.5) * ARENA_W;
    const fy = (Math.cos(i * 87.3 + g.time * (0.15 + (i % 3) * 0.06)) * 0.5 + 0.5) * ARENA_H;
    const tw = (Math.sin(g.time * 3 + i * 2) + 1) / 2;
    dot(ctx, fx, fy, 2 + tw * 1.5, `rgba(220, 255, 170, ${0.25 + tw * 0.5})`);
  }
  ctx.fillStyle = '#f2f7f1';
  ctx.font = '900 110px Outfit, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CROAKDOWN', ARENA_W / 2, 360);
  ctx.font = '500 24px Outfit, system-ui, sans-serif';
  ctx.fillStyle = UI_BLUE;
  ctx.fillText('the swamp remembers', ARENA_W / 2, 404);
  const pulse = (Math.sin(g.time * 3) + 1) / 2;
  ctx.fillStyle = `rgba(242, 247, 241, ${0.5 + pulse * 0.5})`;
  ctx.font = '700 26px Outfit, system-ui, sans-serif';
  ctx.fillText('hop in', ARENA_W / 2, 530);
}

function drawFrogPick(ctx: CanvasRenderingContext2D, g: Game) {
  if (!arenaCanvas) arenaCanvas = buildArena();
  ctx.drawImage(arenaCanvas, 0, 0);
  ctx.fillStyle = 'rgba(6, 12, 9, 0.55)';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  const stage = g.frogPickStage; // 0 = P1 frog, 1 = players/P2, 2 = danger
  ctx.fillStyle = '#f2f7f1';
  ctx.font = '900 44px Outfit, system-ui, sans-serif';
  ctx.textAlign = 'center';
  if (stage === 0 || stage === 1) {
    const pi = stage;
    ctx.fillText(stage === 0 ? 'YOUR FROG' : 'PLAYER TWO', ARENA_W / 2, 150);
    if (stage === 1) {
      ctx.font = '500 19px Outfit, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(242,247,241,0.65)';
      ctx.fillText('press a gamepad button or Enter to join · Space to skip (solo)', ARENA_W / 2, 190);
    }
    // picture-grid (feat #7: menu→run <30s)
    for (let i = 0; i < FROGS.length; i++) {
      const fd = FROGS[i];
      const cx = ARENA_W / 2 + (i - (FROGS.length - 1) / 2) * 300;
      const cy = 420;
      const sel = g.frogPickSel[pi] === i;
      ctx.fillStyle = sel ? 'rgba(240, 248, 246, 0.95)' : 'rgba(240, 248, 246, 0.25)';
      ctx.beginPath(); ctx.roundRect(cx - 120, cy - 130, 240, 280, 20); ctx.fill();
      if (sel) { ctx.strokeStyle = P_RIM[pi]; ctx.lineWidth = 4; ctx.stroke(); }
      // big frog portrait
      const mock: Frog = { def: fd, idx: pi, x: cx, y: cy - 20, vx: 0, vy: 0, hp: 1, maxHp: 1, state: 'alive', reviveProgress: 0, dashT: 0, dashCdT: 0, dashDirX: 0, dashDirY: 0, iframes: 0, atkCd: 0, facing: 1, stats: null as any, items: [], level: 1, xp: 0, pendingPicks: 0, buildChannel: 0, channelNode: -1, loadoutSel: 0, hitFlash: 0, attackAnim: 0, attackTX: 0, attackTY: 0 };
      ctx.save(); ctx.translate(0, 0); ctx.scale(1, 1);
      drawSpriteOr(ctx, `frog_${fd.id}`, cx, cy - 30, 120, () => {
        ctx.save(); ctx.translate(cx, cy - 30); ctx.scale(2.4, 2.4); ctx.translate(-cx, -(cy - 30));
        drawFrogBody(ctx, mock, cx, cy - 30, g.time, false);
        ctx.restore();
      });
      ctx.restore();
      ctx.fillStyle = sel ? INK : 'rgba(242,247,241,0.9)';
      ctx.font = '800 24px Outfit, system-ui, sans-serif';
      ctx.fillText(fd.name, cx, cy + 92);
      ctx.font = '500 15px Outfit, system-ui, sans-serif';
      ctx.fillStyle = sel ? 'rgba(26,36,32,0.65)' : 'rgba(242,247,241,0.6)';
      ctx.fillText(fd.tag, cx, cy + 118);
    }
  } else {
    ctx.fillText('DANGER', ARENA_W / 2, 200);
    for (let i = 0; i <= 3; i++) {
      const cx = ARENA_W / 2 + (i - 1.5) * 110;
      const sel = g.frogPickDanger === i;
      ctx.fillStyle = sel ? '#e8a04a' : 'rgba(240, 248, 246, 0.25)';
      ctx.beginPath(); ctx.arc(cx, 380, sel ? 34 : 26, 0, Math.PI * 2); ctx.fill();
      // skull pips for danger
      for (let s = 0; s < i; s++) dot(ctx, cx - (i - 1) * 8 + s * 16, 380, 5, sel ? INK : 'rgba(255,255,255,0.5)');
      if (i === 0) dot(ctx, cx, 380, 6, sel ? INK : 'rgba(255,255,255,0.5)');
    }
    const pulse = (Math.sin(g.time * 3) + 1) / 2;
    ctx.fillStyle = `rgba(242, 247, 241, ${0.5 + pulse * 0.5})`;
    ctx.font = '700 24px Outfit, system-ui, sans-serif';
    ctx.fillText('hop in', ARENA_W / 2, 560);
  }
}

function drawEnd(ctx: CanvasRenderingContext2D, g: Game, victory: boolean) {
  const t = victory ? g.victoryT : g.gameoverT;
  ctx.fillStyle = `rgba(4, 8, 6, ${Math.min(0.85, t)})`;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = victory ? '#ffe9a0' : '#e0788a';
  ctx.font = '900 84px Outfit, system-ui, sans-serif';
  ctx.fillText(victory ? 'THE SWAMP STANDS' : 'THE SWAMP FALLS', ARENA_W / 2, 340);
  // run record as pips/art, one line of numbers max
  ctx.fillStyle = 'rgba(242,247,241,0.8)';
  ctx.font = '500 22px Outfit, system-ui, sans-serif';
  ctx.fillText(`${g.runStats.kills}   ·   ${g.runStats.towersGrown}   ·   ${g.runStats.essenceEarned}`, ARENA_W / 2, 400);
  ctx.font = '500 15px Outfit, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(242,247,241,0.45)';
  ctx.fillText('felled · grown · gathered', ARENA_W / 2, 428);
  if (t > 1.2) {
    const pulse = (Math.sin(g.time * 3) + 1) / 2;
    ctx.fillStyle = `rgba(242, 247, 241, ${0.5 + pulse * 0.5})`;
    ctx.font = '700 24px Outfit, system-ui, sans-serif';
    ctx.fillText('again', ARENA_W / 2, 540);
  }
}
