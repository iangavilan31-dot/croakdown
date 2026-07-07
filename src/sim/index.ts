// Headless sim surface — everything the test suite (and future netcode) needs.
// DOM-free by construction; the feel/render layers live elsewhere.

export { createWorld, createFrog, tickWorld, spawnEnemy, dropEssence, pools } from './world';
export { drainEvents, emit } from './events';
export { updateFrog, hurtFrog, frogDashIframes } from './frog';
export { applyMeleeHit, applyPhysicsDamage, swingHitstop, attackerHitstop, baseHitstop, willLaunch } from './combat';
export * from './formulas';
export * from './types';
export { Pool } from '../engine/pool';
export { SpatialHash } from '../engine/spatial';
export { makeRng } from '../engine/rng';
export * as constants from '../data/constants';
export { STICK_CHAIN, STICK_HEAVY, TONGUE, CHAIN_WINDOW_TICKS } from '../data/weapons';
export { ENEMIES, SPIKE_OUT_TIME, SPIKE_IN_TIME, SPIKE_REFLECT_DMG, SPIKE_OUT_DMG_MULT, OVERKILL_MULT } from '../data/enemies';
