// Wave-driven spawner — spends the wave's budget with pacing, telegraphs every
// spawn ~1s, respects the alive cap and the ENEMY_CAP law (70, Performance Budget).
// Never spawns within 260px of any frog.

import { ARENA_W, ARENA_H, ARENA_MARGIN, ENEMY_CAP } from '../data/constants';
import { WAVES, SPAWN_COST } from '../data/waves';
import type { EnemyKind } from '../data/enemies';
import type { World } from './types';
import { emit } from './events';
import { spawnEnemy } from './world';

const TELEGRAPH_FRAMES = 60;

function pickKind(w: World): EnemyKind | null {
  const spec = WAVES[Math.min(w.wave, WAVES.length) - 1];
  const affordable = (Object.entries(spec.mix) as [EnemyKind, number][])
    .filter(([k, wt]) => wt > 0 && SPAWN_COST[k] <= w.waveBudget);
  if (!affordable.length) return null;
  let total = 0;
  for (const [, wt] of affordable) total += wt;
  let r = w.rng() * total;
  for (const [k, wt] of affordable) { if ((r -= wt) < 0) return k; }
  return affordable[affordable.length - 1][0];
}

export function updateSpawner(w: World): void {
  // resolve telegraphs -> live enemies
  for (let i = w.telegraphs.length - 1; i >= 0; i--) {
    const t = w.telegraphs[i];
    t.framesLeft--;
    if (t.framesLeft <= 0) {
      w.telegraphs[i] = w.telegraphs[w.telegraphs.length - 1];
      w.telegraphs.pop();
      if (w.enemies.length < ENEMY_CAP) {
        spawnEnemy(w, t.x, t.y, t.kind);
        emit(w, 'spawn', t.x, t.y, { kind: t.kind });
      }
    }
  }

  if (w.phase !== 'wave' || w.gameOver || w.waveBudget <= 0) return;
  const spec = WAVES[Math.min(w.wave, WAVES.length) - 1];
  const pending = w.enemies.length + w.telegraphs.length;
  if (pending >= Math.min(spec.cap, ENEMY_CAP)) return;

  w.spawnAccum++;
  if (w.spawnAccum < spec.pace) return;
  w.spawnAccum = 0;

  for (let attempt = 0; attempt < 8; attempt++) {
    const side = Math.floor(w.rng() * 4);
    const m = ARENA_MARGIN + 60;
    let x: number, y: number;
    if (side === 0) { x = m + w.rng() * (ARENA_W - m * 2); y = m; }
    else if (side === 1) { x = m + w.rng() * (ARENA_W - m * 2); y = ARENA_H - m; }
    else if (side === 2) { x = m; y = m + w.rng() * (ARENA_H - m * 2); }
    else { x = ARENA_W - m; y = m + w.rng() * (ARENA_H - m * 2); }
    let tooClose = false;
    for (const f of w.frogs) if (f.alive && Math.hypot(x - f.x, y - f.y) < 260) { tooClose = true; break; }
    if (tooClose) continue;
    const kind = pickKind(w);
    if (!kind) { w.waveBudget = Math.min(w.waveBudget, 0); return; }
    w.waveBudget -= SPAWN_COST[kind];
    w.telegraphs.push({ x, y, kind, framesLeft: TELEGRAPH_FRAMES });
    emit(w, 'spawnTelegraph', x, y, { kind });
    return;
  }
}
