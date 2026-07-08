# Remove a flat/gradient background from a generated sprite (gpt-image-1 sometimes bakes one in
# despite a transparent request). Color-keyed flood-fill from the edges: a pixel is background
# only if it is close to the sampled corner colour AND connected to the border. The subject
# (far from the bg colour) halts the fill, so soft painterly edges are preserved.
# Usage: python tools/bg_clean.py public/art/frog_warden.png [tol] [feather]

import sys
from collections import deque
from pathlib import Path
from PIL import Image, ImageFilter


def _corner_bg(px, w, h, s=24):
    cols = []
    for cx, cy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        rs = gs = bs = n = 0
        for dx in range(s):
            for dy in range(s):
                x = min(w - 1, max(0, cx + (dx if cx == 0 else -dx)))
                y = min(h - 1, max(0, cy + (dy if cy == 0 else -dy)))
                r, g, b, _ = px[x, y]
                rs += r; gs += g; bs += b; n += 1
        cols.append((rs / n, gs / n, bs / n))
    return cols


def clean(path: str, tol: int = 90, feather: int = 1) -> None:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    corners = _corner_bg(px, w, h)

    def is_bg(x, y):
        r, g, b, _ = px[x, y]
        # close to ANY corner colour (handles a gradient across the image)
        for cr, cg, cb in corners:
            if abs(r - cr) + abs(g - cg) + abs(b - cb) <= tol:
                return True
        return False

    bg = [[False] * w for _ in range(h)]
    q = deque()

    def push(x, y):
        if 0 <= x < w and 0 <= y < h and not bg[y][x] and is_bg(x, y):
            bg[y][x] = True
            q.append((x, y))

    for x in range(w):
        push(x, 0); push(x, h - 1)
    for y in range(h):
        push(0, y); push(w - 1, y)
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            push(x + dx, y + dy)

    alpha = Image.new("L", (w, h), 255)
    ap = alpha.load()
    for y in range(h):
        row = bg[y]
        for x in range(w):
            if row[x]:
                ap[x, y] = 0
    if feather:
        alpha = alpha.filter(ImageFilter.GaussianBlur(feather))
    im.putalpha(alpha)
    im.save(path)
    filled = sum(sum(r) for r in bg)
    print(f"cleaned {Path(path).name}: removed {100 * filled / (w * h):.0f}% as background")


def dehalo(path: str, sat_max: float = 0.20, val_min: float = 0.22) -> None:
    """Kill a baked GRAY/desaturated background halo (gpt-image-1 paints these despite a
    transparent request). Removes low-saturation, mid/high-value pixels; keeps the saturated
    subject AND its dark near-black outline (low value). Robust for a colored sprite on gray."""
    import colorsys
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if ss < sat_max and vv > val_min:
                px[x, y] = (r, g, b, 0)
    # feather the new edge a touch
    alpha = im.getchannel("A").filter(ImageFilter.GaussianBlur(0.6))
    im.putalpha(alpha)
    im.save(path)
    print(f"dehaloed {Path(path).name}")


def colorize_green(path: str, val_lift: float = 0.30) -> None:
    """Recolor a (dark) blob sprite into a BRIGHT TRANSLUCENT GREEN slime. gpt-image-1 keeps
    drawing the swamp's enemies black no matter the prompt; the SHAPE + eyes are good, only the
    hue is wrong. Map every opaque pixel onto a green ramp: brightness is lifted (so even near-black
    body reads as mid-green jelly), saturation scales with brightness (translucent look), and the
    brightest pixels (the eyes) push toward yellow-green so they still pop."""
    import colorsys
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            _hh, _ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            nv = val_lift + (1 - val_lift) * vv          # lift darks into visible green
            hue = 0.34 - 0.12 * vv                        # dark=emerald(.34) -> bright=lime/yellow(.22)
            sat = 0.55 + 0.35 * vv                        # brighter = more saturated jelly
            nr, ng, nb = colorsys.hsv_to_rgb(hue, sat, nv)
            px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    im.save(path)
    print(f"colorized {Path(path).name} -> green slime")


def strip(path: str, tol: int = 32, feather: int = 1) -> None:
    """Melt a baked gradient background inward from the edges, stopping at the sprite's hard
    outline. Neighbour-relative flood (follows a smooth gradient), halted by any sharp value
    jump — ideal for a pixel sprite with a dark outline on a soft baked background."""
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = [[False] * w for _ in range(h)]
    q = deque()

    def push(x, y):
        if 0 <= x < w and 0 <= y < h and not bg[y][x]:
            bg[y][x] = True
            q.append((x, y))

    for x in range(w):
        push(x, 0); push(x, h - 1)
    for y in range(h):
        push(0, y); push(w - 1, y)
    while q:
        x, y = q.popleft()
        r0, g0, b0, _ = px[x, y]
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx]:
                r1, g1, b1, _ = px[nx, ny]
                if abs(r1 - r0) + abs(g1 - g0) + abs(b1 - b0) <= tol:
                    bg[ny][nx] = True
                    q.append((nx, ny))

    alpha = im.getchannel("A")
    ap = alpha.load()
    for y in range(h):
        row = bg[y]
        for x in range(w):
            if row[x]:
                ap[x, y] = 0
    if feather:
        alpha = alpha.filter(ImageFilter.GaussianBlur(feather * 0.6))
    im.putalpha(alpha)
    im.save(path)
    filled = sum(sum(r) for r in bg)
    print(f"stripped {Path(path).name}: removed {100 * filled / (w * h):.0f}% bg")


if __name__ == "__main__":
    if sys.argv[1] == "--strip":
        strip(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 32)
        sys.exit(0)
    if sys.argv[1] == "--dehalo":
        dehalo(sys.argv[2])
        sys.exit(0)
    p = sys.argv[1]
    tol = int(sys.argv[2]) if len(sys.argv) > 2 else 90
    feather = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    clean(p, tol, feather)
