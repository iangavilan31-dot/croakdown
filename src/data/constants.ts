// Global tuning constants. Sources: design/3 Gameplay/Game Feel Standards.md,
// design/10 Programming/Performance Budget.md. TUNE values are starting points.

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

// Arena (logical world units; render scales to viewport)
export const ARENA_W = 1920;
export const ARENA_H = 1080;
export const ARENA_MARGIN = 70;         // wall inset — tumbles splat here

// Caps (LOCKED, Performance Budget)
export const ENEMY_CAP = 70;
export const PARTICLE_CAP = 600;
export const DECAL_CAP = 250;
export const FLOATER_CAP = 200;
export const HITEVENT_CAP = 64;

// Frog (Movement and Controls)
export const FROG_HP = 100;
export const FROG_SPEED = 330;
export const FROG_ACCEL_MS = 90;        // ms to full speed
export const FROG_RADIUS = 34;
export const DASH_DIST = 260;
export const DASH_TIME = 0.18;
export const DASH_IFRAME_FROM = 2 / 60; // i-frames frames 2..9
export const DASH_IFRAME_TO = 9 / 60;
export const DASH_CHARGES = 2;
export const DASH_RECHARGE = 1.4;
export const HURT_IFRAMES = 0.3;
export const INPUT_BUFFER_TICKS = 9;    // 150 ms LOCKED
export const HEAVY_HOLD_TICKS = 15;     // 250 ms hold -> heavy charge

// Physics (Combat System)
export const LAUNCH_THRESHOLD = 600;    // impulse/mass above this -> tumble
export const MUD_FRICTION = 6;          // exponential velocity decay /s
export const TUMBLE_MIN_SPEED = 150;    // tumble ends below this
export const TUMBLE_TIME = 0.55;
export const TUMBLE_COLLIDE_DMG = 0.04; // x relative speed
export const WALL_SPLAT_FRAC = 0.5;     // +50% of launching hit damage
export const RECOIL_HOP = 12;

// Hitstop (frames @60; victim base by class, attacker gets 70%). Ian's masterpass: swings must
// feel EXPENSIVE/HEAVY — bumped so contact bites harder (chunkier freeze on every hit).
export const HITSTOP_LIGHT = 4;
export const HITSTOP_MEDIUM = 7;
export const HITSTOP_HEAVY = 13;
export const HITSTOP_KILL_BONUS = 4;
export const HITSTOP_MULTI_CAP = 18;
export const HITSTOP_ATTACKER_FRAC = 0.72;

// Trauma budgets (shake = trauma^2, decay 1.8/s, max 24px / 0.5deg). Heavier hits kick the camera
// harder for weight; decay a touch slower so the shake reads instead of snapping back instantly.
export const TRAUMA_LIGHT = 0.06;
export const TRAUMA_HEAVY = 0.19;
export const TRAUMA_KILL = 0.12;
export const TRAUMA_SPLAT = 0.28;
export const TRAUMA_MAX = 0.75;
export const TRAUMA_DECAY = 1.6;

// Economy feel (prototype: collection only)
export const MAGNET_RADIUS = 90;
export const ESSENCE_FLY_SPEED = 900;

// Soft aim magnetism
export const MAGNETISM_ANGLE = (20 * Math.PI) / 180;
