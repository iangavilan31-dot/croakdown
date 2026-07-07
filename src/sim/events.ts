// Pooled sim events — zero steady-state allocation (Performance Budget law).

import { Pool } from '../engine/pool';
import { HITEVENT_CAP } from '../data/constants';
import type { SimEvent, SimEventType, World } from './types';

const eventPool = new Pool<SimEvent>(() => ({
  type: 'hit', x: 0, y: 0, dirX: 0, dirY: 0, a: 0, cls: 'none', kind: 'none', killed: false, overkill: false,
}), 64);

export function emit(w: World, type: SimEventType, x: number, y: number, fields?: Partial<SimEvent>): void {
  if (w.events.length >= HITEVENT_CAP) return; // bounded per tick-batch
  const e = eventPool.get();
  e.type = type; e.x = x; e.y = y;
  e.dirX = 0; e.dirY = 0; e.a = 0; e.cls = 'none'; e.kind = 'none'; e.killed = false; e.overkill = false;
  if (fields) Object.assign(e, fields);
  w.events.push(e);
}

/** Consumer drains all pending events, then they return to the pool. */
export function drainEvents(w: World, cb: (e: SimEvent) => void): void {
  for (let i = 0; i < w.events.length; i++) {
    cb(w.events[i]);
    eventPool.put(w.events[i]);
  }
  w.events.length = 0;
}
