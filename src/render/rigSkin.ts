// GATE 3 — painted parts on the proven rectangle rig. Draws the SAME Pose the
// gray spike proved, with sheet-sliced part images. Transform stack mirrors the
// spike's drawFrogRig exactly; only the fills changed. Joint overlap 30-40% is
// baked into the pivot/size table below (parts overshoot their gray rects).

import { RIG, type Pose } from './rig';

export interface PartSpec {
  // pivot in trimmed-image UV (0..1); the point that lands on the rig anchor
  px: number; py: number;
  // world width the image is scaled to (height follows aspect)
  w: number;
}

// Per-part mounting. Calibrated against the sliced sheets (docs/qa/parts-review.png).
export const PART_SPECS: Record<string, PartSpec> = {
  backarm: { px: 0.5, py: 0.15, w: 26 },
  body: { px: 0.5, py: 0.55, w: 118 },       // includes haunches + backpack paint
  head_open: { px: 0.42, py: 0.78, w: 66 },   // pivot at the neck
  head_closed: { px: 0.42, py: 0.78, w: 66 },
  arms: { px: 0.1, py: 0.42, w: 50 },         // pivot at the shoulder end
  blade: { px: 0.05, py: 0.55, w: 128 },      // pivot at the handle end
};

export interface Skin {
  name: string;
  img: Record<string, HTMLImageElement>;
  ready: boolean;
}

const skins = new Map<string, Skin>();

export function loadSkin(name: string): Skin {
  let s = skins.get(name);
  if (s) return s;
  s = { name, img: {}, ready: false };
  skins.set(name, s);
  let pending = 0;
  for (const part of Object.keys(PART_SPECS)) {
    const im = new Image();
    pending++;
    im.onload = () => { if (--pending === 0) s!.ready = true; };
    im.onerror = () => { pending--; };  // missing part -> that part just skips
    im.src = `/art/parts/${name}/${part}.png`;
    s.img[part] = im;
  }
  return s;
}

function part(g: CanvasRenderingContext2D, s: Skin, key: string,
  x: number, y: number, rot: number, flipY = false, alpha = 1) {
  const im = s.img[key];
  const spec = PART_SPECS[key];
  if (!im || !im.complete || !im.naturalWidth || !spec) return false;
  const scale = spec.w / im.naturalWidth;
  const h = im.naturalHeight * scale;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  if (flipY) g.scale(1, -1);
  if (alpha < 1) g.globalAlpha = alpha;
  g.drawImage(im, -spec.px * spec.w, -spec.py * h, spec.w, h);
  g.restore();
  return true;
}

/** Draw a skinned frog with the proven pose. Returns false if the skin isn't
 *  loaded yet (caller falls back to the gray rig — art never blocks the game).
 *  `flash` (0..1) redraws the puppet additively for hurt feedback. */
export function drawSkinnedFrog(g: CanvasRenderingContext2D, p: Pose, s: Skin,
  x: number, y: number, flash = 0): boolean {
  if (!s.ready) return false;
  for (let pass = 0; pass < (flash > 0 ? 2 : 1); pass++) {
    if (pass === 1) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = Math.min(0.7, flash);
    }
    g.save();
    g.translate(x, y + p.hopY);
    g.rotate(p.lean);
    g.transform(1, 0, p.shear, 1, 0, 0);
    g.translate(0, RIG.FOOT_Y); g.scale(p.squashX, p.squashY); g.translate(0, -RIG.FOOT_Y);

    const bladeBehind = Math.sin(p.bladeAngle) < -0.2;
    if (bladeBehind) drawArmBlade(g, p, s);

    g.save();
    g.scale(p.facing, 1);
    part(g, s, 'backarm', RIG.BACKARM_X, RIG.BACKARM_Y, p.backArmRot);
    // body carries the backpack paint; pack spring wobbles the whole torso subtly
    part(g, s, 'body', RIG.BODY_CX, RIG.BODY_CY, p.packRot * 0.35);
    part(g, s, p.headVariant === 'open' ? 'head_open' : 'head_closed',
      RIG.HEAD_X + p.headDX, RIG.HEAD_Y + p.headDY, p.headRot);
    g.restore();

    if (!bladeBehind) drawArmBlade(g, p, s);
    g.restore();
    if (pass === 1) g.restore();
  }
  return true;
}

function drawArmBlade(g: CanvasRenderingContext2D, p: Pose, s: Skin) {
  const shX = RIG.SHOULDER_X * p.facing, shY = RIG.SHOULDER_Y;
  // weapon sprite flips vertically when pointing left so the edge stays down
  const flip = Math.abs(((p.bladeAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI) < Math.PI / 2;
  g.save();
  g.translate(shX, shY);
  part(g, s, 'arms', 0, 0, p.bladeAngle, flip);
  g.rotate(p.bladeAngle);
  g.translate(RIG.HILT_R + p.bladeReach * 26, 0);
  g.rotate(-p.bladeAngle);
  part(g, s, 'blade', 0, 0, p.bladeAngle, flip);
  if (p.chargeGlint > 0) {
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = p.chargeGlint * 0.35 * (0.6 + 0.4 * Math.sin(performance.now() / 40));
    part(g, s, 'blade', 0, 0, p.bladeAngle, flip);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}
