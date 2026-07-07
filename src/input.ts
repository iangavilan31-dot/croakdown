// CROAKDOWN input — P1 keyboard (WASD+Space+E), P2 DualSense/gamepad (standard mapping)
// with Arrows+Enter keyboard fallback. Gamepad API is poll-only: sampled once per frame.

export interface PlayerInput {
  mx: number; my: number;        // movement axis -1..1
  dash: boolean;                 // edge-triggered
  build: boolean;                // held (diegetic grow/attune channel)
  confirm: boolean;              // edge-triggered (menus, radial pick)
  cycle: boolean;                // edge-triggered (cycle tower species at a node)
  pause: boolean;                // edge-triggered
  connected: boolean;
}

const keys = new Set<string>();
const edges = new Set<string>();

window.addEventListener('keydown', (e) => {
  if (!keys.has(e.code)) edges.add(e.code);
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); });

let padIndex: number | null = null;
let padWasPressed: boolean[] = [];

window.addEventListener('gamepadconnected', (e) => { if (padIndex === null) padIndex = e.gamepad.index; });
window.addEventListener('gamepaddisconnected', (e) => { if (padIndex === e.gamepad.index) padIndex = null; });

function pollPad(): PlayerInput {
  const out: PlayerInput = { mx: 0, my: 0, dash: false, build: false, confirm: false, cycle: false, pause: false, connected: false };
  if (padIndex === null) return out;
  const gp = navigator.getGamepads()[padIndex];
  if (!gp) return out;
  out.connected = true;
  const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
  out.mx = dz(gp.axes[0] ?? 0);
  out.my = dz(gp.axes[1] ?? 0);
  // d-pad adds to axes (standard mapping buttons 12-15)
  if (gp.buttons[14]?.pressed) out.mx = -1;
  if (gp.buttons[15]?.pressed) out.mx = 1;
  if (gp.buttons[12]?.pressed) out.my = -1;
  if (gp.buttons[13]?.pressed) out.my = 1;
  const pressed = (i: number) => !!gp.buttons[i]?.pressed;
  const edge = (i: number) => { const p = pressed(i); const was = padWasPressed[i] ?? false; padWasPressed[i] = p; return p && !was; };
  out.dash = edge(0);          // Cross
  out.build = pressed(2) || pressed(7);  // Square or R2 held
  out.confirm = edge(0);       // Cross doubles as confirm in menus
  out.cycle = edge(3);         // Triangle
  out.pause = edge(9);         // Options
  return out;
}

/** True when any gamepad button is currently pressed (join/gesture-gate detection). */
export function padAnyPressed(): boolean {
  for (const gp of navigator.getGamepads()) {
    if (gp && gp.buttons.some(b => b.pressed)) { if (padIndex === null) padIndex = gp.index; return true; }
  }
  return false;
}

export function padConnected(): boolean {
  if (padIndex === null) return false;
  return !!navigator.getGamepads()[padIndex];
}

/** Sample all player inputs for this frame. p2Mode: 'pad' | 'keys' | 'off'. */
export function sampleInput(p2Mode: 'pad' | 'keys' | 'off'): [PlayerInput, PlayerInput] {
  const kEdge = (code: string) => { const had = edges.has(code); return had; };
  const p1: PlayerInput = {
    mx: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
    my: (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0),
    dash: kEdge('Space'),
    build: keys.has('KeyE'),
    confirm: kEdge('Space') || kEdge('KeyE') || kEdge('Enter'),
    cycle: kEdge('KeyQ'),
    pause: kEdge('Escape') || kEdge('KeyP'),
    connected: true,
  };
  let p2: PlayerInput;
  if (p2Mode === 'pad') p2 = pollPad();
  else if (p2Mode === 'keys') p2 = {
    mx: (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0),
    my: (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0),
    dash: kEdge('ShiftRight') || kEdge('Numpad0'),
    build: keys.has('Enter'),
    confirm: kEdge('Enter'),
    cycle: kEdge('Slash'),
    pause: false,
    connected: true,
  };
  else p2 = { mx: 0, my: 0, dash: false, build: false, confirm: false, cycle: false, pause: false, connected: false };
  edges.clear(); // consume edges once per frame
  return [p1, p2];
}
