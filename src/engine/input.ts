// Melee input — P1 keyboard+mouse or DualSense (MDN "standard" mapping), polled per frame.
// Verbs per design/3 Gameplay/Movement and Controls.md. Edges are consumed once per sample.

export interface FrameInput {
  mx: number; my: number;          // movement axis -1..1
  aimX: number; aimY: number;      // world-space aim point (mouse) — render sets scale
  aimStick: boolean;               // true when aim comes from right stick / movement dir
  attackEdge: boolean;             // pressed this frame
  attackHeld: boolean;             // held (heavy charge)
  tongueEdge: boolean;             // universal tongue
  sigEdge: boolean;                // kit signature
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

export interface DualInput { p1: FrameInput; p2: FrameInput; p2Active: boolean; p2WantsIn: boolean }

function blankInput(): FrameInput {
  return {
    mx: 0, my: 0, aimX: 0, aimY: 0, aimStick: false,
    attackEdge: false, attackHeld: false, tongueEdge: false, sigEdge: false, dashEdge: false,
    interactEdge: false, pauseEdge: false, restartEdge: false,
  };
}

/** Sample BOTH players. P1 = keyboard(WASD)+mouse. P2 = gamepad, or IJKL move +
 *  U attack + O signature + P dash (drop-in: any P2 verb raises p2WantsIn). */
export function sampleInput(toWorld: (sx: number, sy: number) => [number, number]): DualInput {
  const kEdge = (code: string) => edges.has(code);
  const [wx, wy] = toWorld(mouseX, mouseY);
  const p1: FrameInput = {
    mx: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
    my: (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0),
    aimX: wx, aimY: wy, aimStick: false,
    attackEdge: mouseEdge,
    attackHeld: mouseDown,
    tongueEdge: rmbEdge,                    // tongue on right-mouse (K belongs to P2 now)
    sigEdge: kEdge('KeyQ') || kEdge('KeyF'),  // the kit move lives beside WASD
    dashEdge: kEdge('Space') || kEdge('ShiftLeft'),
    interactEdge: kEdge('KeyE'),
    pauseEdge: kEdge('Escape'),
    restartEdge: kEdge('KeyR') || kEdge('Enter'),
  };

  const p2 = blankInput();
  let p2Signal = false;

  // P2 keyboard layer: IJKL diamond + U attack, O signature, P dash.
  // Joining takes a VERB (U/O/P or a pad button) — movement alone never drops P2 in.
  const kmx = (keys.has('KeyL') ? 1 : 0) - (keys.has('KeyJ') ? 1 : 0);
  const kmy = (keys.has('KeyK') ? 1 : 0) - (keys.has('KeyI') ? 1 : 0);
  if (kEdge('KeyU') || kEdge('KeyO') || kEdge('KeyP')) p2Signal = true;
  p2.mx = kmx; p2.my = kmy;
  p2.attackEdge = kEdge('KeyU');
  p2.attackHeld = keys.has('KeyU');
  p2.sigEdge = kEdge('KeyO');
  p2.tongueEdge = kEdge('Semicolon');
  p2.dashEdge = kEdge('KeyP');
  p2.aimStick = true;  // P2 keyboard aims with movement direction (twin-stick without a stick)
  p2.aimX = kmx; p2.aimY = kmy;

  // note: P1 keyboard tongue is K — shared with P2's "down". When P2 is active,
  // main.ts routes K to P2 only (P1 keeps right-mouse for the signature).

  // Gamepad = P2 (standard mapping): LS move, RS aim, Square attack, R1 sig, Cross dash
  if (padIndex !== null) {
    const gp = navigator.getGamepads()[padIndex];
    if (gp && gp.mapping === 'standard') {
      const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
      const lx = dz(gp.axes[0] ?? 0), ly = dz(gp.axes[1] ?? 0);
      if (lx || ly) { p2.mx = lx; p2.my = ly; p2Signal = true; }
      const rx = dz(gp.axes[2] ?? 0), ry = dz(gp.axes[3] ?? 0);
      if (rx || ry) { p2.aimStick = true; p2.aimX = rx; p2.aimY = ry; }
      const pressed = (i: number) => !!gp.buttons[i]?.pressed;
      const edge = (i: number) => { const p = pressed(i); const was = padWas[i] ?? false; padWas[i] = p; return p && !was; };
      if (edge(2)) { p2.attackEdge = true; p2Signal = true; }
      if (pressed(2)) p2.attackHeld = true;
      if (edge(5)) { p2.tongueEdge = true; p2Signal = true; }   // R1 tongue
      if (edge(4)) { p2.sigEdge = true; p2Signal = true; }      // L1 signature
      if (edge(0)) { p2.dashEdge = true; p2.restartEdge = true; p2Signal = true; }
      if (edge(1)) p2.interactEdge = true;
      if (edge(9)) p2.pauseEdge = true;
    }
  }

  edges.clear(); mouseEdge = false; rmbEdge = false;
  return { p1, p2, p2Active: false, p2WantsIn: p2Signal };
}
