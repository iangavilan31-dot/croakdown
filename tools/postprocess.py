# Slice-hero post-process: turn gpt-image-1's detailed output into crisp PIXEL ART that blends
# with the pixel-art swamp backdrop (Ian art-direction 2026-07-07). Two steps:
#   1) remove any baked-in background (color-keyed edge flood, if the corners are opaque)
#   2) pixelate: downscale to a small grid + quantize the palette + hard alpha edges
# Rendered with imageSmoothingEnabled=false in-game, this reads as detailed pixel art.
# Usage: python tools/postprocess.py [name ...]   (default: all slice heroes)

import sys
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from bg_clean import clean as bg_clean  # saves in place

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "public" / "art"

# per-asset pixel height (bigger heroes = a touch more resolution) + palette size
TARGETS = {
    "frog_warden": (150, 64),
    "prop_lotus": (150, 56),
    "enemy_sludgeling": (120, 48),
    "enemy_bogrunner": (128, 48),
    "enemy_shellback": (128, 56),
}
DEFAULT = (128, 48)


def corners_opaque(im: Image.Image) -> bool:
    w, h = im.size
    px = im.load()
    a = [px[0, 0][3], px[w - 1, 0][3], px[0, h - 1][3], px[w - 1, h - 1][3]]
    return sum(a) / 4 > 170


def pixelate(path: Path, target_h: int, colors: int) -> None:
    im = Image.open(path).convert("RGBA")
    # 1) strip a baked background if present
    if corners_opaque(im):
        bg_clean(str(path), tol=100, feather=0)
        im = Image.open(path).convert("RGBA")
    # 2) downscale to the pixel grid
    w, h = im.size
    tw = max(1, round(w * target_h / h))
    small = im.resize((tw, target_h), Image.LANCZOS)
    r, g, b, a = small.split()
    # quantize RGB to a tight palette for pixel-art cohesion
    rgb = Image.merge("RGB", (r, g, b))
    q = rgb.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    # crisp alpha edges (no semi-transparent fuzz -> reads as pixels)
    a = a.point(lambda v: 255 if v > 110 else 0)
    out = Image.merge("RGBA", (*q.split(), a))
    out.save(path)
    print(f"pixelated {path.name} -> {tw}x{target_h}, {colors} colors")


if __name__ == "__main__":
    names = sys.argv[1:] or list(TARGETS)
    for n in names:
        p = ART / (n if n.endswith(".png") else f"{n}.png")
        th, col = TARGETS.get(p.stem, DEFAULT)
        pixelate(p, th, col)
