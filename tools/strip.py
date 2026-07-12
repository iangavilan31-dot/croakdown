# Generic filmstrip builder: glob frames -> one horizontal strip (row-wrapped).
# Usage: python tools/strip.py <glob> <out.png> [--cols 10] [--crop x,y,w,h]
import sys
from glob import glob
from PIL import Image

pattern, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[sys.argv.index("--cols") + 1]) if "--cols" in sys.argv else 10
crop = None
if "--crop" in sys.argv:
    crop = tuple(int(v) for v in sys.argv[sys.argv.index("--crop") + 1].split(","))

paths = sorted(glob(pattern))
if not paths:
    print("no frames match", pattern)
    sys.exit(1)
imgs = []
for p in paths:
    im = Image.open(p)
    if crop:
        x, y, w, h = crop
        im = im.crop((x, y, x + w, y + h))
    imgs.append(im)
w, h = imgs[0].size
rows = (len(imgs) + cols - 1) // cols
strip = Image.new("RGB", (w * min(cols, len(imgs)), h * rows), (20, 20, 20))
for i, im in enumerate(imgs):
    strip.paste(im, ((i % cols) * w, (i // cols) * h))
strip.save(out)
print(f"{out}: {len(imgs)} frames, {strip.size[0]}x{strip.size[1]}")
