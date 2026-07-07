// Melee input — P1 keyboard+mouse or DualSense (MDN "standard" mapping), polled per frame.
// Verbs per design/3 Gameplay/Movement and Controls.md. Edges are consumed once per sample.

export interface FrameInput {
  mx: number; my: number;          // movement axis -1..1
  aimX: number; aimY: number;      // world-space aim point (mouse) — render sets scale
  aimStick: boolean;               // true when aim comes from right stick / movement dir
  attackEdge: boolean;             // pressed this frame
  attackHeld: boolean;             // held (heavy charge)
  tongueEdge: boolean;
  dashEdge: boolean;
  interactEdge: boolean;
  pauseEdge: boolean;
  restartEdge: boolean;
}

const keys = new Set<string>();
const edges = new Set<string>();
let mouseX = 0, mouseY = 0;        // css pixels; main converts to world
let mouseDown = false, mouseEdge = false, rmbEdge = false;

window.addEventListener('keydown', (e) => {
  if (!keys.has(e.code)) edges.add(e.code);
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); mouseDown = false; });
window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
window.addEventListener('mousedown', (e) => {
  if (e.button === 0) { mouseDown = true; mouseEdge = true; }
  if (e.button === 2) rmbEdge = true;
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
window.addEventListener('contextmenu', (e) => e.preventDefault());

let padIndex: number | null = null;
const padWas: boolean[] = [];
window.addEventListener('gamepadconnected', (e) => { if (padIndex === null) padIndex = e.gamepad.index; });
window.addEventListener('gamepaddisconnected', (e) => { if (padIndex === e.gamepad.index) padIndex = null; });

export function padConnected(): boolean {
  return padIndex !== null && !!navigator.getGamepads()[padIndex];
}

/** Screen-space mouse position (for the render layer to convert). */
export function mouseScreen(): [number, number] { return [mouseX, mouseY]; }

/** Sample P1 input. `toWorld` converts css-pixel mouse to world coords. */
export function sampleInput(toWorld: (sx: number, sy: number) => [number, number]): FrameInput {
  const kEdge = (code: string) => edges.has(code);
  const [wx, wy] = toWorld(mouseX, mouseY);
  const inp: FrameInput = {
    mx: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
    my: (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0),
    aimX: wx, aimY: wy, aimStick: false,
    attackEdge: mouseEdge || kEdge('KeyJ'),
    attackHeld: mouseDown || keys.has('KeyJ'),
    tongueEdge: rmbEdge || kEdge('KeyK'),
    dashEdge: kEdge('Space'),
    interactEdge: kEdge('KeyE'),
    pauseEdge: kEdge('Escape') || kEdge('KeyP'),
    restartEdge: kEdge('KeyR') || kEdge('Enter'),
  };

  // Gamepad overlay (standard mapping): LS move, RS aim, Square attack, R1 tongue, Cross dash
  if (padIndex !== null) {
    const gp = navigator.getGamepads()[padIndex];
    if (gp && gp.mapping === 'standard') {
      const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
      const lx = dz(gp.axes[0] ?? 0), ly = dz(gp.axes[1] ?? 0);
      if (lx || ly) { inp.mx = lx; inp.my = ly; }
      const rx = dz(gp.axes[2] ?? 0), ry = dz(gp.axes[3] ?? 0);
      if (rx || ry) { inp.aimStick = true; inp.aimX = rx; inp.aimY = ry; } // direction, not point
      const pressed = (i: number) => !!gp.buttons[i]?.pressed;
      const edge = (i: number) => { const p = pressed(i); const was = padWas[i] ?? false; padWas[i] = p; return p && !was; };
      if (edge(2)) inp.attackEdge = true;          // Square
      if (pressed(2)) inp.attackHeld = true;
      if (edge(5)) inp.tongueEdge = true;          // R1
      if (edge(0)) { inp.dashEdge = true; inp.restartEdge = true; } // Cross
      if (edge(1)) inp.interactEdge = true;        // Circle
      if (edge(9)) inp.pauseEdge = true;           // Options
    }
  }

  edges.clear(); mouseEdge = false; rmbEdge = false;
  return inp;
}
