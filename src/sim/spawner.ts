// Pond spawner — Phase 1 dummy swarm director. Density ramps 8 -> 40 over ~6 min,
// mix widens over time. Every spawn telegraphs ~1s (ground glyph -> smoke emergence).
// Cap 70 LOCKED (Performance Budget); never spawns within 260px of the frog.

import { ARENA_W, ARENA_H, ARENA_MARGIN, ENEMY_CAP } from '../data/constants';
import type { EnemyKind } from '../data/enemies';
import type { World } from './types';
import { emit } from './events';
import { spawnEnemy } from './world';

const TELEGRAPH_FRAMES = 60;

function targetCount(elapsed: number): number {
  return Math.min(52, 14 + Math.floor(elapsed / 7));   // denser horde (critics: too sparse)
}

function pickKind(w: World): EnemyKind {
  const t = w.elapsed;
  const r = w.rng();
  if (t > 28 && r < 0.14) return 'gloopa';      // variety earlier so the horde isn't one clone (critics)
  if (t > 12 && r < 0.3) return 'spikeblob';
  return 'blobbit';
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

  if (w.gameOver) return;
  const want = targetCount(w.elapsed);
  const pending = w.enemies.length + w.telegraphs.length;
  if (pending >= want || pending >= ENEMY_CAP) return;

  // stagger spawns: at most one telegraph per 7 ticks (fills the arena faster)
  w.spawnAccum++;
  if (w.spawnAccum < 7) return;
  w.spawnAccum = 0;

  // pick an edge-ring point away from the frog
  for (let attempt = 0; attempt < 8; attempt++) {
    const side = Math.floor(w.rng() * 4);
    const m = ARENA_MARGIN + 60;
    let x: number, y: number;
    if (side === 0) { x = m + w.rng() * (ARENA_W - m * 2); y = m; }
    else if (side === 1) { x = m + w.rng() * (ARENA_W - m * 2); y = ARENA_H - m; }
    else if (side === 2) { x = m; y = m + w.rng() * (ARENA_H - m * 2); }
    else { x = ARENA_W - m; y = m + w.rng() * (ARENA_H - m * 2); }
    if (Math.hypot(x - w.frog.x, y - w.frog.y) < 260) continue;
    const kind = pickKind(w);
    w.telegraphs.push({ x, y, kind, framesLeft: TELEGRAPH_FRAMES });
    emit(w, 'spawnTelegraph', x, y, { kind });
    return;
  }
}
