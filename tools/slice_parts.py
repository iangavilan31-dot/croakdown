# GATE 2/3 — slice a generated parts sheet into trimmed part PNGs + manifest.
# Robust to grid drift: finds connected alpha components (not fixed cells), sorts
# them into reading order (row-major by centroid), maps to the part-name list.
# Usage: python tools/slice_parts.py warden          (all: no args)
#        python tools/slice_parts.py --review        (contact sheet of all parts)
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / "public" / "art" / "parts" / "sheets"
OUT = ROOT / "public" / "art" / "parts"

CHAR_PARTS = ["backarm", "body", "head_open", "head_closed", "arms", "blade", "fx_a", "fx_b"]
ENEMY_PARTS = ["body", "eyes"]
NAMES = {
    "warden": CHAR_PARTS, "snapper": CHAR_PARTS, "morel": CHAR_PARTS,
    "bogling": ENEMY_PARTS, "midge": ENEMY_PARTS, "gloopa": ENEMY_PARTS,
    "spitshroom": ENEMY_PARTS, "broodmaw": ENEMY_PARTS,
}


def components(alpha: np.ndarray, thresh=24, scale=4):
    """Connected components on a downsampled alpha mask -> list of full-res bboxes."""
    small = alpha[::scale, ::scale] > thresh
    h, w = small.shape
    seen = np.zeros_like(small, dtype=bool)
    boxes = []
    for sy in range(h):
        for sx in range(w):
            if not small[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]
            seen[sy, sx] = True
            x0 = x1 = sx; y0 = y1 = sy; area = 0
            while stack:
                cy, cx = stack.pop()
                area += 1
                x0 = min(x0, cx); x1 = max(x1, cx)
                y0 = min(y0, cy); y1 = max(y1, cy)
                for ny, nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1),(cy-1,cx-1),(cy-1,cx+1),(cy+1,cx-1),(cy+1,cx+1)):
                    if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            boxes.append([x0*scale, y0*scale, (x1+1)*scale, (y1+1)*scale, area*scale*scale])
    return boxes


def merge_overlapping(boxes, pad=14):
    """Merge boxes whose padded rects intersect (parts split by thin gaps)."""
    changed = True
    while changed:
        changed = False
        out = []
        while boxes:
            a = boxes.pop()
            merged = False
            for b in out:
                if not (a[2]+pad < b[0] or b[2]+pad < a[0] or a[3]+pad < b[1] or b[3]+pad < a[1]):
                    b[0] = min(a[0], b[0]); b[1] = min(a[1], b[1])
                    b[2] = max(a[2], b[2]); b[3] = max(a[3], b[3]); b[4] += a[4]
                    merged = True; changed = True
                    break
            if not merged:
                out.append(a)
        boxes = out
    return boxes


# smear/FX cells are OPTIONAL — procedural smears already passed Gate 1, so a
# matting model dropping a translucent crescent never blocks the pipeline.
OPTIONAL = {"fx_a", "fx_b"}


def _crop_save(im, box, dest, part, manifest, pad=4):
    x0, y0, x1, y1 = box[:4]
    crop = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))
    crop.save(dest / f"{part}.png")
    manifest[part] = {"w": crop.width, "h": crop.height}


def _recover(name: str, part: str, cell, dest, manifest) -> bool:
    """A required part the sheet-level matting ate: crop its grid cell from the
    ORIGINAL generation and mat that crop alone (single-object = U2Net happy path).
    Still the same whole-sheet generation — no per-part regen."""
    orig = SHEETS / f"{name}.orig.png"
    if not orig.exists():
        return False
    from rembg import remove, new_session
    global _SESSION
    if "_SESSION" not in globals():
        _SESSION = new_session("u2net")
    im = Image.open(orig).convert("RGBA").crop(cell)
    out = remove(im, session=_SESSION)
    a = np.asarray(out)[:, :, 3]
    ys, xs = np.where(a > 24)
    if len(xs) < 400:
        return False
    box = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    _crop_save(out, box, dest, part, manifest)
    print(f"   recovered {part} from orig cell")
    return True


def slice_sheet(name: str) -> bool:
    src = SHEETS / f"{name}.png"
    if not src.exists():
        print(f"-- {name}: sheet missing")
        return False
    parts = NAMES[name]
    im = Image.open(src).convert("RGBA")
    W, H = im.width, im.height
    alpha = np.asarray(im)[:, :, 3]
    min_area = W * H * 0.0004
    boxes = [b for b in merge_overlapping(components(alpha)) if b[4] >= min_area]
    dest = OUT / name
    dest.mkdir(parents=True, exist_ok=True)
    manifest = {}
    missing = []

    if len(parts) == 2:
        # enemy sheet: body = largest; eyes = largest of the rest (else recover lower half)
        boxes.sort(key=lambda b: -b[4])
        if boxes:
            _crop_save(im, boxes[0], dest, "body", manifest)
        else:
            missing.append("body")
        if len(boxes) > 1:
            _crop_save(im, boxes[1], dest, "eyes", manifest)
        elif not _recover(name, "eyes", (0, H // 2, W, H), dest, manifest):
            missing.append("eyes")
    else:
        # character sheet, semantic assignment:
        mid = H / 2
        top = [b for b in boxes if (b[1] + b[3]) / 2 < mid]
        bot = [b for b in boxes if (b[1] + b[3]) / 2 >= mid]
        # top: body = largest; heads = two rightmost of the rest; backarm = leftover leftmost
        if top:
            top.sort(key=lambda b: -b[4])
            body, rest = top[0], top[1:]
            _crop_save(im, body, dest, "body", manifest)
            rest.sort(key=lambda b: (b[0] + b[2]) / 2)
            if len(rest) >= 3:
                _crop_save(im, rest[0], dest, "backarm", manifest)
                _crop_save(im, rest[-2], dest, "head_open", manifest)
                _crop_save(im, rest[-1], dest, "head_closed", manifest)
            elif len(rest) == 2:
                _crop_save(im, rest[0], dest, "head_open", manifest)
                _crop_save(im, rest[1], dest, "head_closed", manifest)
                if not _recover(name, "backarm", (0, 0, W // 4, H // 2), dest, manifest):
                    missing.append("backarm")
            else:
                missing += [p for p in ("backarm", "head_open", "head_closed")]
        else:
            missing += ["body", "backarm", "head_open", "head_closed"]
        # bottom: arms = leftmost; blade = largest remaining; fx = rest
        if bot:
            bot.sort(key=lambda b: (b[0] + b[2]) / 2)
            arms, rest = bot[0], bot[1:]
            _crop_save(im, arms, dest, "arms", manifest)
            if rest:
                rest.sort(key=lambda b: -b[4])
                _crop_save(im, rest[0], dest, "blade", manifest)
                for fx_name, b in zip(("fx_a", "fx_b"), rest[1:]):
                    _crop_save(im, b, dest, fx_name, manifest)
            else:
                missing.append("blade")
        else:
            missing += ["arms", "blade"]
        # weapon sanity: the blade must be ELONGATED. If a blobby prop (decoy doll)
        # out-sized the real weapon in the bottom row, swap it with the most
        # elongated fx part (morel's cane landed in fx_a this way).
        def elong(p):
            m = manifest.get(p)
            return max(m["w"] / m["h"], m["h"] / m["w"]) if m else 0
        if "blade" in manifest and elong("blade") < 1.6:
            best_fx = max((p for p in ("fx_a", "fx_b") if p in manifest), key=elong, default=None)
            if best_fx and elong(best_fx) > elong("blade"):
                import os
                a, b = dest / "blade.png", dest / f"{best_fx}.png"
                tmp = dest / "_swap.png"
                os.replace(a, tmp); os.replace(b, a); os.replace(tmp, b)
                manifest["blade"], manifest[best_fx] = manifest[best_fx], manifest["blade"]
                print(f"   {name}: blade was blobby -> swapped with {best_fx}")
        # blink fallback: a lost closed-head never blocks — reuse the open head
        if "head_closed" in missing and "head_open" in manifest:
            import shutil
            shutil.copy(dest / "head_open.png", dest / "head_closed.png")
            manifest["head_closed"] = manifest["head_open"]
            missing.remove("head_closed")
            print(f"   {name}: head_closed lost -> reusing head_open (no blink)")

    (dest / "manifest.json").write_text(json.dumps(manifest, indent=1))
    missing = [m for m in missing if m not in OPTIONAL]
    if missing:
        print(f"-- {name}: missing REQUIRED {missing} — REGEN THE SHEET")
        return False
    print(f"ok {name}: {len(manifest)}/{len(parts)} parts -> {dest}")
    return True


def review():
    cells = []
    for name, parts in NAMES.items():
        for p in parts:
            f = OUT / name / f"{p}.png"
            if f.exists():
                cells.append((f"{name}/{p}", Image.open(f)))
    if not cells:
        print("nothing sliced yet")
        return
    cell, cols = 190, 8
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * cell), (30, 42, 38))
    d = ImageDraw.Draw(sheet)
    for i, (label, im) in enumerate(cells):
        im = im.copy()
        im.thumbnail((cell - 22, cell - 30), Image.LANCZOS)
        cx, cy = (i % cols) * cell, (i // cols) * cell
        sheet.paste(im, (cx + (cell - im.width)//2, cy + (cell - im.height)//2), im)
        d.text((cx + 5, cy + cell - 15), label[:26], fill=(225, 235, 225))
    dest = ROOT / "docs" / "qa" / "parts-review.png"
    sheet.save(dest)
    print(f"review sheet -> {dest}")


if __name__ == "__main__":
    if "--review" in sys.argv:
        review()
        sys.exit(0)
    targets = [a for a in sys.argv[1:] if not a.startswith("-")] or list(NAMES)
    okc = sum(slice_sheet(t) for t in targets)
    print(f"{okc}/{len(targets)} sheets sliced")
