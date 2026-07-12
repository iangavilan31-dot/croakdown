# Matting-model background removal for the parts sheets (bg_clean floods eat
# painterly soft edges; U2Net keys the subjects properly). .orig.png -> .png
import sys
from pathlib import Path

from PIL import Image
from rembg import remove, new_session

SHEETS = Path(__file__).resolve().parent.parent / "public" / "art" / "parts" / "sheets"
session = new_session("u2net")

names = sys.argv[1:] or [p.stem[:-5] for p in SHEETS.glob("*.orig.png")]
for name in names:
    src = SHEETS / f"{name}.orig.png"
    if not src.exists():
        print(f"-- {name}: no orig")
        continue
    im = Image.open(src).convert("RGBA")
    out = remove(im, session=session)
    out.save(SHEETS / f"{name}.png")
    # coverage sanity: how much survived
    a = out.getchannel("A")
    kept = sum(1 for v in a.getdata() if v > 24) / (out.width * out.height)
    print(f"ok {name}: kept {kept*100:.0f}% as subject")
