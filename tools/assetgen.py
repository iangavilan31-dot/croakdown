# CROAKDOWN — individual-asset generator (Batch pipeline). Ian directive 2026-07-07.
#
# LAWS:
#  - The reference swamp image (docs/refs/VISUAL_REF_01.png) is the absolute art bible.
#  - Generate PIXEL ART DIRECTLY from the model. Do NOT paint-then-pixelate.
#  - One asset / one frame per call, highest quality, its own transparent PNG.
#  - Validate every asset (transparent bg, coverage, size). Regenerate failures.
#  - Frames are packed into sheets only as an EXPORT step (tools/pack_sheets.py), never generated as sheets.
#
# Usage:
#   python tools/assetgen.py frog_idle_a            # one asset
#   python tools/assetgen.py --group player         # a whole group
#   python tools/assetgen.py --list                 # show registry
#
# Requires OPENAI_API_KEY. Writes public/art/batch01/<name>.png + validates.

import base64
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "art" / "batch01"
OUT.mkdir(parents=True, exist_ok=True)
REF = ROOT / "docs" / "refs" / "VISUAL_REF_01.png"

# ------------------------------------------------------------------ global style
# Ian's GLOBAL ART STYLE spec, encoded as the shared prompt tail. Every asset shares this so
# the whole batch reads as one artist. "Premium modern indie pixel art" — NOT retro/SNES/flat.
STYLE = (
    "premium modern indie pixel art matching the reference swamp game EXACTLY (Hyper Light Drifter "
    "/ Dead Cells fidelity): FINE, high-resolution, REFINED pixel art with small crisp pixels and "
    "smooth painterly-pixel shading and soft gradients — NOT chunky, NOT blocky, NOT big pixels, "
    "NOT retro 8-bit or 16-bit, NOT flat, and NOT a smooth digital painting. Subtle controlled "
    "dithering, soft atmospheric bioluminescent glow, strong readable silhouette. Mystical "
    "nighttime swamp mood: quiet, dreamlike, slightly eerie. Palette: deep forest greens, muted "
    "teals, dark olive, warm golden-yellow glow, small hot-pink accents, near-black shadows; soft "
    "warm rim light. A SINGLE centered game asset, isolated on a fully transparent background, no "
    "scene, no ground, no shadow, no text, no UI, no border. Perfectly readable at gameplay zoom."
)

FROG = (
    "The Frog Warden, the hero: a heavy ancient swamp-guardian toad, large round heavy body with "
    "a low center of gravity, short powerful legs, wide shoulders, huge webbed hands. CRUCIAL: LOW "
    "heavy-lidded HALF-CLOSED sleepy hooded eyes with droopy upper eyelids covering the top half of "
    "each eye, golden irises barely showing, a permanently UNIMPRESSED bored calm ancient "
    "expression exactly like the reference toad (NOT wide-eyed, NOT round-eyed, NOT cute, NOT "
    "angry). Dark olive bumpy skin with tiny glowing lime-green spores embedded naturally in it, "
    "cream-colored underbelly, soft warm rim light from nearby lotus glow"
)
SLUDGELING = (
    "The Sludgeling, first enemy: a small round creature made entirely of translucent glowing "
    "green swamp sludge, with tiny bubbles, floating algae, bits of mud and glowing spores clearly "
    "visible suspended INSIDE its jelly body, two large bright glowing yellow-green eyes, tiny "
    "stubby feet, wet and jiggly, adorable but eerie, a CLEAN BOLD DARK OUTLINE around the whole "
    "shape, strong readable silhouette (NO pink, NO magenta anywhere)"
)
REEDSWORD = (
    "The Reed Sword: a primitive handcrafted sword forged from hardened swamp reeds, hilt wrapped "
    "with worn leather strips and bound by mossy vines, a slightly chipped blade, small glowing "
    "lime moss growing near the guard, handmade and weathered"
)

# name -> (group, prompt, size). Batch 01 = the transformative sprites for the first minute.
# FX (ripples/splash/sparks/spores/fireflies) and HUD stay CODE-DRAWN (already in-palette).
# Motion is PROCEDURAL on these base sprites (Ian-approved) — not generated frame sheets.
REGISTRY: dict[str, tuple[str, str, str]] = {
    "frog_idle_a": ("player", f"{FROG}. Calm idle pose, mouth CLOSED, sitting squat and settled, three-quarter top-down view facing forward-right. The frog ALONE — absolutely NO lily pad, NO water, NO leaf, NOTHING beneath or behind it. {STYLE}", "1024x1024"),
    "sludgeling": ("enemy", f"{SLUDGELING}. Standing idle, small, facing forward-right, three-quarter top-down view. The creature ALONE, nothing beneath or behind it. {STYLE}", "1024x1024"),
    "reed_sword": ("weapon", f"{REEDSWORD}. A single sword shown diagonally, blade pointing up and to the right, ready to be held and swung, three-quarter view. The sword ALONE, nothing behind it. {STYLE}", "1024x1024"),
    "prop_lotus": ("env", f"A glowing golden lotus flower blooming on a small dark lily pad, warm radiant golden-white bioluminescent glow from within its layered petals, the primary swamp light source, top-down three-quarter view. Isolated, nothing else around it. {STYLE}", "1024x1024"),
    "prop_lily_large": ("env", f"A large round swamp lily pad seen from top-down, aged wet mossy surface, a natural notch cut in one side, subtle water sheen, gentle glowing rim. Isolated single lily pad, nothing else. {STYLE}", "1024x1024"),
    "prop_lily_small": ("env", f"A small round swamp lily pad seen from top-down, wet mossy surface, natural imperfections. Isolated single small lily pad, nothing else. {STYLE}", "1024x1024"),
    "prop_reeds": ("env", f"A cluster of tall thin swamp reeds and cattails, dark green, gently wind-blown, growing upward. Isolated cluster, no ground line. {STYLE}", "1024x1024"),
    "prop_rock": ("env", f"A rounded swamp boulder almost completely covered in soft wet moss, a few tiny glowing spores. Isolated single mossy rock, nothing else. {STYLE}", "1024x1024"),
    "prop_mushroom": ("env", f"A small cluster of glowing swamp mushrooms with soft green bioluminescent caps on organic curved stems, damp and mossy. Isolated cluster, nothing else. {STYLE}", "1024x1024"),
}

GROUPS = {
    "player": ["frog_idle_a"],
    "enemy": ["sludgeling"],
    "weapon": ["reed_sword"],
    "env": ["prop_lotus", "prop_lily_large", "prop_lily_small", "prop_reeds", "prop_rock", "prop_mushroom"],
    "all": ["frog_idle_a", "sludgeling", "reed_sword", "prop_lotus", "prop_lily_large",
            "prop_lily_small", "prop_reeds", "prop_rock", "prop_mushroom"],
}


def _client():
    from openai import OpenAI
    return OpenAI()


def generate(name: str) -> Path:
    prompt, _group, size = REGISTRY[name]
    dest = OUT / f"{name}.png"
    client = _client()
    # Reference-anchored EDIT: passing the art-bible swamp image nails the pixel density, palette
    # and lighting (plain text generate returned unrelated garbage / lost the pixel style). We
    # fight scene-copy contamination with a hard isolation instruction, then clean any baked bg.
    with open(REF, "rb") as ref:
        r = client.images.edit(
            model="gpt-image-1",
            image=[ref],
            prompt=("Use the pixel-art STYLE, pixel density, palette and lighting of this reference "
                    "image as a strict style guide, but do NOT copy its scene, layout, lily pads, "
                    "water or any background. Draw ONE brand-new isolated game sprite floating in "
                    "empty space on a pure transparent background — nothing beneath, behind or "
                    "around it. Subject: " + prompt),
            size=size,
            quality="high",
            background="transparent",
        )
    dest.write_bytes(base64.b64decode(r.data[0].b64_json))
    print(f"generated {name} -> {dest.relative_to(ROOT)}")
    _autoclean(dest)   # scrub the baked background the edit endpoint paints in
    return dest


def _opaque_frac(path: Path) -> float:
    from PIL import Image
    a = Image.open(path).convert("RGBA").getchannel("A")
    hist = a.histogram()
    return sum(hist[200:]) / max(1, sum(hist))


def _autoclean(path: Path) -> None:
    """Strip the baked background: edge flood (halts at a hard outline) for outlined sprites.
    If the flood LEAKS through soft edges and eats the subject (<5% left), revert to the raw
    generation and use the gentle corner colour-key instead. Then an HSV pass for grey halos."""
    import shutil
    sys.path.insert(0, str(Path(__file__).parent))
    from bg_clean import strip, clean, dehalo
    raw = path.with_suffix(".raw.png")
    shutil.copy(path, raw)
    strip(str(path), tol=32)
    if _opaque_frac(path) < 0.05:      # over-ate a soft-edged asset -> gentle fallback
        shutil.copy(raw, path)
        clean(str(path), tol=76, feather=1)
        print("  (strip leaked -> corner colour-key fallback)")
    dehalo(str(path))
    raw.unlink(missing_ok=True)


def validate(path: Path) -> bool:
    from PIL import Image
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    a = im.getchannel("A")
    lo, hi = a.getextrema()
    transparent = lo == 0  # some fully-transparent pixels exist
    # coverage: opaque fraction should be sensible (not empty, not a full box)
    opaque = sum(1 for p in a.getdata() if p > 200)
    frac = opaque / (w * h)
    ok = transparent and 0.03 < frac < 0.92
    print(f"  validate {path.name}: transparent={transparent} coverage={frac:.0%} -> {'OK' if ok else 'FAIL'}")
    return ok


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--list" in args:
        for g, names in GROUPS.items():
            print(f"[{g}] " + ", ".join(names))
        sys.exit(0)
    if "--group" in args:
        names = GROUPS[args[args.index("--group") + 1]]
    else:
        names = [a for a in args if not a.startswith("--")]
    for n in names:
        p = generate(n)
        validate(p)
