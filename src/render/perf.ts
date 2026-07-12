// ?perf overlay — sim/render ms (EMA), entity/particle/decal counts, pool stats.
// Perf regressions block merge like test failures (Performance Budget).

import { particles, decals } from '../feel/feel';
import { pools } from '../sim/world';
import type { World } from '../sim/types';

export const perfEnabled = new URLSearchParams(location.search).has('perf');

let simMs = 0, renderMs = 0;
export function recordSim(ms: number) { simMs = simMs * 0.95 + ms * 0.05; }
export function recordRender(ms: number) { renderMs = renderMs * 0.95 + ms * 0.05; }
// QA probe (playtest.mjs reads the split headless)
(window as any).__perf = () => ({ simMs: +simMs.toFixed(2), renderMs: +renderMs.toFixed(2) });

export function drawPerf(ctx: CanvasRenderingContext2D, w: World, cw: number) {
  if (!perfEnabled) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = '600 13px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  const lines = [
    `sim ${simMs.toFixed(2)}ms  render ${renderMs.toFixed(2)}ms`,
    `enemies ${w.enemies.length}  telegraphs ${w.telegraphs.length}`,
    `particles ${particles.length}  decals ${decals.length}  drops ${w.drops.length}`,
    `pool enemy free ${pools.enemyPool.available}  drop free ${pools.dropPool.available}`,
    `tick ${w.tick}  kills ${w.kills}`,
  ];
  const mem = (performance as any).memory;
  if (mem) lines.push(`heap ${(mem.usedJSHeapSize / 1048576).toFixed(1)}MB`);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(cw - 340, 8, 332, 18 * lines.length + 10);
  ctx.fillStyle = '#9fe8c0';
  lines.forEach((l, i) => ctx.fillText(l, cw - 16, 14 + i * 18));
  ctx.restore();
}
