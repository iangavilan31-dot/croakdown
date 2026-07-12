// Hit application, knockback/launch physics, hitstop math.
// The one-event rule: every landed hit emits exactly one event carrying everything
// the feel layer needs (design/10 Programming/Technical Architecture.md).

import {
  HITSTOP_LIGHT, HITSTOP_MEDIUM, HITSTOP_HEAVY, HITSTOP_KILL_BONUS,
  HITSTOP_MULTI_CAP, HITSTOP_ATTACKER_FRAC, LAUNCH_THRESHOLD, TUMBLE_TIME,
} from '../data/constants';
import { ENEMIES, SPIKE_OUT_DMG_MULT, SPIKE_REFLECT_DMG, OVERKILL_MULT } from '../data/enemies';
import { SPIKE_BONUS_COINS } from '../data/kits';
import type { DamageClass } from '../data/weapons';
import type { Enemy, Frog, World } from './types';
import { emit } from './events';
import { dropEssence } from './world';

export function baseHitstop(cls: DamageClass): number {
  return cls === 'heavy' ? HITSTOP_HEAVY : cls === 'medium' ? HITSTOP_MEDIUM : HITSTOP_LIGHT;
}

/** Victim frames for the Nth victim of one swing: base + extras, capped (Game Feel §1). */
export function swingHitstop(cls: DamageClass, victimIndex: number, killed: boolean): number {
  const base = baseHitstop(cls) + (killed ? HITSTOP_KILL_BONUS : 0);
  return Math.min(HITSTOP_MULTI_CAP, base + victimIndex);
}

export function attackerHitstop(victimFrames: number): number {
  return Math.round(victimFrames * HITSTOP_ATTACKER_FRAC);
}

export function willLaunch(impulse: number, mass: number): boolean {
  return impulse / mass > LAUNCH_THRESHOLD;
}

export interface HitResult { killed: boolean; reflected: boolean; armored: boolean; launched: boolean }

/**
 * Apply a melee hit from the frog to an enemy.
 * dirX/dirY: unit vector of the blow. victimIndex: 0-based within this swing.
 */
export function applyMeleeHit(
  w: World, e: Enemy, damage: number, impulse: number, cls: DamageClass,
  dirX: number, dirY: number, victimIndex: number, attacker?: Frog,
): HitResult {
  const data = ENEMIES[e.kind];
  const res: HitResult = { killed: false, reflected: false, armored: false, launched: false };

  // Spikeblob: spikes out = mostly absorbed + reflects onto melee attacker
  let dmg = damage;
  if (e.kind === 'spikeblob' && e.spikesOut) {
    dmg = Math.max(1, Math.round(damage * SPIKE_OUT_DMG_MULT));
    res.reflected = true;
    res.armored = true;
  }

  // tandem bell (DUO): +20% while near your partner
  if (attacker && attacker.items.tandembell) {
    const partner = w.frogs.find((o) => o !== attacker && o.alive && !o.downed);
    if (partner && Math.hypot(partner.x - attacker.x, partner.y - attacker.y) < 150) dmg *= 1.2;
  }

  // S1 — VOLLEY SPIKE: a launched enemy met by the PARTNER's swing gets spiked.
  // Triple damage, bonus loot, the loudest hit in the game.
  if (e.state === 'tumble' && e.launchedBy >= 0 && attacker && e.launchedBy !== attacker.index) {
    dmg *= 3;
    impulse *= 1.6;
    dropEssence(w, e.x, e.y, SPIKE_BONUS_COINS, dirX, dirY);
    emit(w, 'spike', e.x, e.y, { dirX, dirY, kind: e.kind });
  }
  // Poise: light hits don't interrupt armored bruisers
  const interrupts = !(data.poiseLightImmune && cls === 'light') && !res.armored;

  const hpBefore = e.hp;
  e.hp -= dmg;
  res.killed = e.hp <= 0;
  const overkill = res.killed && dmg >= hpBefore * OVERKILL_MULT;

  // knockback impulse -> velocity change. Ian masterpass: STRONG shove — non-launching hits slide
  // enemies back x1.4 with momentum. LAUNCHING hits keep raw velocity so the tumble/bowling/wall-
  // splat economy (and its tests) is untouched.
  const tumbles = !res.killed && willLaunch(impulse, data.mass);
  const dv = (impulse / data.mass) * (tumbles ? 1 : 1.4);
  e.vx += dirX * dv;
  e.vy += dirY * dv;

  // hitstop + flash grammar
  const vFrames = swingHitstop(cls, victimIndex, res.killed);
  if (res.armored) {
    e.armorFlashT = 0.12;
    e.freeze = Math.max(e.freeze, 1);
  } else {
    e.flashT = 0.16;                        // longer white hit-flash so contact reads (critics)
    e.freeze = Math.max(e.freeze, vFrames);
  }

  // launch check -> tumble (enemies as projectiles)
  if (tumbles) {
    e.state = 'tumble';
    e.stateF = 0;
    e.tumbleT = TUMBLE_TIME;
    e.tumbleSrcDmg = damage;
    e.spin = (dirX >= 0 ? 1 : -1) * (8 + w.rng() * 6);
    e.launchedBy = attacker ? attacker.index : -1;   // S1 bookkeeping
    e.yeeted = false;
    res.launched = true;
    emit(w, 'launch', e.x, e.y, { dirX, dirY, kind: e.kind });
  } else if (interrupts && !res.killed) {
    // flinch: interrupt whatever it was doing
    if (e.state === 'windup' || e.state === 'active' || e.state === 'recover') {
      e.state = 'seek';
      e.stateF = 0;
    }
    e.stunT = Math.max(e.stunT, cls === 'light' ? 0.1 : 0.4);
  }

  emit(w, res.armored ? 'armored' : 'hit', e.x, e.y, {
    dirX, dirY, a: dmg, cls, kind: e.kind, killed: res.killed, overkill,
  });
  if (res.reflected) emit(w, 'reflect', e.x, e.y, { a: SPIKE_REFLECT_DMG });

  if (res.killed) killEnemy(w, e, dirX, dirY, overkill);
  return res;
}

/** Damage from tumble collisions / wall splats (no attacker, physics-authored). */
export function applyPhysicsDamage(w: World, e: Enemy, dmg: number, dirX: number, dirY: number): boolean {
  const hpBefore = e.hp;
  e.hp -= dmg;
  e.flashT = 0.12;
  e.freeze = Math.max(e.freeze, 2);
  const killed = e.hp <= 0;
  if (killed) killEnemy(w, e, dirX, dirY, dmg >= hpBefore * OVERKILL_MULT);
  return killed;
}

export function killEnemy(w: World, e: Enemy, dirX: number, dirY: number, overkill: boolean): void {
  e.alive = false;
  w.kills++;
  emit(w, 'kill', e.x, e.y, { dirX, dirY, kind: e.kind, overkill, a: ENEMIES[e.kind].radius });
  dropEssence(w, e.x, e.y, ENEMIES[e.kind].essence, dirX, dirY);
}
