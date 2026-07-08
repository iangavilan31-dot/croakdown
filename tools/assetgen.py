# CROAKDOWN — individual-asset generator (Batch pipeline). Ian directive 2026-07-07.
#
# LAWS (from docs/refs/REFERENCE_PACK.png + REFERENCE_PACK_V2_NOTES.md — ART LAW):
#  - The reference pack is the absolute art bible. Generate PIXEL ART DIRECTLY.
#  - Frog: EXTREMELY PLUMP, lazy hooded eyes, cream belly, a SAMURAI KATANA
#    sheathed across its back. Multiple animation frames (idle/blink/croak/jump).
#  - Enemies: CUTE, PLUMP, SQUISHY, TRANSLUCENT GREEN jelly blobs with big glowing
#    eyes. NOT black, NOT dark. Adorable but eerie. Big and readable.
#  - Glow in small CLUSTERS, not soft blur. Low pixel density, heavy dithering.
#  - One asset / one frame per call, highest quality, its own transparent PNG.
#  - Animation-frame variants are anchored to the generated BASE sprite (so the
#    frog stays the SAME frog across frames — kills gpt-image-1 drift).
#  - Validate every asset. Frames pack into sheets only as an export step.
#
# Usage:
#   python tools/assetgen.py frog_base            # one asset
#   python tools/assetgen.py --group frog         # base + all frog frames (in order!)
#   python tools/assetgen.py --list
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
STYLE = (
    "premium modern indie pixel art matching the reference swamp game EXACTLY (Hollow Knight "
    "/ Dead Cells / Hyper Light Drifter fidelity): FINE, high-resolution, REFINED pixel art with "
    "small crisp pixels, controlled dithering, soft painterly-pixel shading — NOT chunky, NOT "
    "blocky, NOT retro 8-bit, NOT flat, NOT a smooth digital painting. Bioluminescent glow shown "
    "as small CLUSTERED bright pixel dots, not soft radial blur. Mystical nighttime swamp mood: "
    "quiet, dreamlike, slightly eerie. Palette: deep forest greens, muted teals, dark olive, warm "
    "golden-yellow glow, small hot-pink accents, near-black shadows; soft warm rim light. A SINGLE "
    "centered game asset, isolated on a fully transparent background, no scene, no ground, no "
    "shadow, no text, no UI, no border. Perfectly readable at gameplay zoom."
)

# ---- FROG: the hero. WAY plump, lazy, katana on the back. --------------------
FROG = (
    "The Frog Warden, the hero: an EXTREMELY PLUMP, fat, round, chubby ancient swamp-guardian toad "
    "with a huge heavy round belly, very low center of gravity, short stubby powerful legs, wide "
    "shoulders, big webbed hands — comically thicc and heavy, like the plump toads in the reference "
    "pack. CRUCIAL: LOW heavy-lidded HALF-CLOSED sleepy hooded eyes with droopy upper eyelids, a "
    "permanently UNIMPRESSED lazy bored calm ancient expression (NOT wide-eyed, NOT cute-big-eyed, "
    "NOT angry). Dark olive-green bumpy skin with tiny glowing lime-green spore dots, a big pale "
    "cream underbelly. A SAMURAI KATANA is sheathed diagonally across its back: a dark wrapped "
    "scabbard and a cloth-wrapped katana handle rising over its right shoulder (clearly a sheathed "
    "sword on the back). Soft warm rim light"
)

# ---- ENEMY: cute, plump, squishy, GREEN. NOT black. --------------------------
BLOBBIT = (
    "A CUTE round kawaii SLIME monster, like a happy slime from Slime Rancher or the classic Dragon "
    "Quest slime: a plump glossy DROPLET-shaped blob of BRIGHT TRANSLUCENT GREEN jelly (lime and "
    "emerald), wobbly and squishy, that you can partly see through, with tiny bubbles and glowing "
    "spore flecks suspended inside. Two big shiny happy dark eyes with white highlights, a tiny "
    "cute smiling mouth, a bright glossy highlight on top. Adorable, wholesome, bouncy. IMPORTANT: "
    "BRIGHT GREEN and glossy — absolutely NOT black, NOT dark, NOT scary, NOT a demon, NO horns"
)

KATANA = (
    "The Reed Katana: a curved single-edged samurai katana forged for a swamp warrior — a slightly "
    "curved blade of hardened green swamp-reed and dark metal with a faint glowing lime edge, a long "
    "cloth-wrapped handle, a small round tsuba guard with glowing moss, weathered and handmade"
)

# name -> (group, prompt, size, anchor). anchor=None uses the swamp style-ref;
# anchor="<file>" edits that PREVIOUSLY-GENERATED sprite so frames stay on-model.
REGISTRY: dict[str, tuple[str, str, str, str | None]] = {
    # ---- frog + animation frames (generate frog_base FIRST) ----
    "frog_base": ("frog", f"{FROG}. Calm idle pose, mouth closed, sitting squat and settled, three-quarter top-down view facing forward-right, the sheathed katana handle visible over its shoulder. The frog ALONE — NO lily pad, NO water, NOTHING beneath or behind it. {STYLE}", "1024x1024", None),
    "frog_blink": ("frog", "The EXACT SAME plump katana toad, identical body/pose/colors/sheathed sword, but with its eyes fully CLOSED and content (a mid-blink) — only the eyes change to gentle closed curved lines. Keep everything else pixel-identical. Isolated on transparent background.", "1024x1024", "frog_base.png"),
    "frog_croak": ("frog", "The EXACT SAME plump katana toad, identical body/pose/colors/sheathed sword, but its wide mouth is OPEN in a big hearty croak/laugh, throat puffed out round, eyes squeezed happy — a joyful open-mouthed croak. Keep body/limbs/colors pixel-identical. Isolated on transparent background.", "1024x1024", "frog_base.png"),
    "frog_jump": ("frog", "The EXACT SAME plump katana toad, identical colors/sheathed sword, but STRETCHED into a mid-air JUMP pose: body stretched taller and leaning, short legs tucked then kicking out, arms up — clearly airborne and dynamic. Keep the same colors, belly and sheathed katana. Isolated on transparent background.", "1024x1024", "frog_base.png"),
    # ---- enemy + frames (generate blobbit_base FIRST) ----
    "blobbit_base": ("enemy", f"{BLOBBIT}. Standing idle, plump and round, facing forward-right, three-quarter top-down view. The creature ALONE, nothing beneath or behind it. {STYLE}", "1024x1024", None),
    "blobbit_hit": ("enemy", "The EXACT SAME cute translucent-green jelly blob, identical colors, but SQUISHED and recoiling from a hit — squashed wider and flatter, eyes wide and startled, jelly rippling. Keep the same bright green translucent look. Isolated on transparent background.", "1024x1024", "blobbit_base.png"),
    "blobbit_pop": ("enemy", "The EXACT SAME cute translucent-green jelly blob, identical colors, but BURSTING/dissolving: splattered flat into a spreading puddle of glowing green jelly droplets and bubbles, eyes fading — a splash of green sludge. Isolated on transparent background.", "1024x1024", "blobbit_base.png"),
    # ---- weapon ----
    "reed_katana": ("weapon", f"{KATANA}. A single katana shown diagonally, curved blade pointing up and to the right, ready to be held and swung, three-quarter view. The katana ALONE, nothing behind it. {STYLE}", "1024x1024", None),
    # ---- env props (kept from before; regenerate only if needed) ----
    "prop_lotus": ("env", f"A glowing golden lotus flower blooming on a small dark lily pad, warm radiant golden bioluminescent glow shown as clustered bright pixel dots, the primary swamp light source, top-down three-quarter view. Isolated, nothing else. {STYLE}", "1024x1024", None),
}

GROUPS = {
    "frog": ["frog_base", "frog_blink", "frog_croak", "frog_jump"],
    "enemy": ["blobbit_base", "blobbit_hit", "blobbit_pop"],
    "weapon": ["reed_katana"],
    "env": ["prop_lotus"],
    "all": ["frog_base", "frog_blink", "frog_croak", "frog_jump",
            "blobbit_base", "blobbit_hit", "blobbit_pop", "reed_katana"],
}


def _client():
    from openai import OpenAI
    return OpenAI()


# Names whose anchor is used for STYLE/PALETTE ONLY (draw a brand-new subject), NOT edit-preserve.
# e.g. the green enemy seeds its palette from the green frog so it doesn't inherit the dark
# swamp-scene enemies (which are black) when anchored to VISUAL_REF.
FRESH_ANCHORS: set[str] = set()
# Enemy sprites come out black no matter the prompt -> recolor to bright green slime after cleanup.
COLORIZE = {"blobbit_base", "blobbit_hit", "blobbit_pop"}


def generate(name: str) -> Path:
    prompt, _group, size, anchor = REGISTRY[name]
    dest = OUT / f"{name}.png"
    client = _client()
    # Pure text-to-image (no reference) — for subjects the swamp-scene ref biases badly (the dark
    # enemies). gpt-image-1 generate supports a transparent background directly.
    if anchor == "__generate__":
        r = client.images.generate(model="gpt-image-1", prompt=prompt, size=size,
                                    quality="high", background="transparent")
        dest.write_bytes(base64.b64decode(r.data[0].b64_json))
        print(f"generated {name} -> {dest.relative_to(ROOT)} (text-to-image)")
        _autoclean(dest)
        return dest
    # Pick the reference: an anchor sprite (for on-model animation frames) else the swamp style-ref.
    ref_path = (OUT / anchor) if anchor else REF
    if anchor and not ref_path.exists():
        raise SystemExit(f"anchor {anchor} not generated yet — run its base first")
    if anchor and name not in FRESH_ANCHORS:
        instr = ("Edit THIS sprite. Keep the SAME character pixel-identical (same body, colors, "
                 "size, outline) and change ONLY what is described. Do NOT add any sword, weapon, "
                 "prop, background or new object. Output the single isolated sprite on a pure "
                 "transparent background. Change: " + prompt)
    else:
        seed = ("this sprite" if anchor else "this reference image")
        instr = ("Use ONLY the pixel-art STYLE, pixel density, shading and colour PALETTE of "
                 f"{seed} as a style guide — do NOT copy its subject, shape or scene. Draw ONE "
                 "brand-new, completely different isolated game sprite floating in empty space on "
                 "a pure transparent background — nothing beneath, behind or around it. Subject: "
                 + prompt)
    with open(ref_path, "rb") as ref:
        r = client.images.edit(
            model="gpt-image-1", image=[ref], prompt=instr,
            size=size, quality="high", background="transparent",
        )
    dest.write_bytes(base64.b64decode(r.data[0].b64_json))
    print(f"generated {name} -> {dest.relative_to(ROOT)}")
    _autoclean(dest)
    if name in COLORIZE:
        from bg_clean import colorize_green
        colorize_green(str(dest))
    return dest


def _opaque_frac(path: Path) -> float:
    from PIL import Image
    a = Image.open(path).convert("RGBA").getchannel("A")
    hist = a.histogram()
    return sum(hist[200:]) / max(1, sum(hist))


def _autoclean(path: Path) -> None:
    """Strip the baked background without eating the subject. Try strip; if it LEAKS through soft
    edges (<8% subject left), revert to the gentle corner colour-key. Then dehalo, but ONLY keep
    the dehalo if it didn't over-eat (guards soft sprites like an open-mouth croak frame)."""
    import shutil
    sys.path.insert(0, str(Path(__file__).parent))
    from bg_clean import strip, clean, dehalo
    raw = path.with_suffix(".raw.png")
    shutil.copy(path, raw)
    strip(str(path), tol=32)
    if _opaque_frac(path) < 0.08:
        shutil.copy(raw, path)
        clean(str(path), tol=76, feather=1)
        print("  (strip leaked -> corner colour-key fallback)")
    pre = path.with_suffix(".pre.png")
    shutil.copy(path, pre)
    before = _opaque_frac(path)
    dehalo(str(path))
    after = _opaque_frac(path)
    if after < before * 0.6 or after < 0.06:   # dehalo over-ate the subject -> keep pre-dehalo
        shutil.copy(pre, path)
        print("  (dehalo over-ate -> kept pre-dehalo)")
    pre.unlink(missing_ok=True)
    raw.unlink(missing_ok=True)


def validate(path: Path) -> bool:
    from PIL import Image
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    a = im.getchannel("A")
    lo, _hi = a.getextrema()
    transparent = lo == 0
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
