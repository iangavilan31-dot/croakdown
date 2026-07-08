# CROAKDOWN art pass — gpt-image-1, GEEKED pipeline pattern (~$1-3 total).
# Usage:  python tools/gen_art.py            (generate everything missing)
#         python tools/gen_art.py --only frog_warden,enemy_sludgeling
#         python tools/gen_art.py --sheet    (contact sheet only, no API calls)
# Requires OPENAI_API_KEY in env. Writes public/art/*.png + public/art/manifest.json.

import base64
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "art"
OUT.mkdir(parents=True, exist_ok=True)

# North star: Ian's PIXEL reference mockup (2026-07-07, second image — final) — high-quality
# pixel art, moody swamp at night, glossy dark water, glowing golden lotus, smug chunky toad,
# critters as dark blobs with glowing eyes, smoky haze. Cute-but-eerie, NOT kid-friendly.
STYLE = (
    "detailed high-quality 2D pixel art game sprite, dark storybook swamp fantasy at night, "
    "moody dithered shading, deep murky greens and bog purples with glowing accents, "
    "cute-but-eerie and slightly unsettling, chunky readable silhouette, subtle glow "
    "highlights, crisp clean pixels, centered, fully transparent background, no ground, no text"
)

CRITTER = (
    "a dark rounded blob-creature silhouette with small glowing eyes, lurking swamp critter, "
)

# SLICE hero assets target REF_01: DETAILED PIXEL ART (painterly-pixel hybrid), stylized not
# realistic, so they blend with the pixel-art swamp backdrop. Generated high-detail then
# pixelated in post (tools/postprocess.py) to a crisp pixel grid. Ian art-direction 2026-07-07:
# "reference photo combined with pixel art is the direction" + "must blend into the pixel bg".
SLICE_STYLE = (
    "detailed high-quality PIXEL ART game sprite, in the style of Hyper Light Drifter and Dead "
    "Cells, crisp clean readable pixels with soft dithered shading and a gentle bioluminescent "
    "rim light, STYLIZED not realistic, chunky appealing storybook forms, dark swamp fantasy at "
    "night, deep murky swamp greens and bog purples with soft glowing accents, cute-but-eerie, "
    "bold heavy silhouette, centered, fully transparent background, no ground, no scene, no text"
)
# slice heroes: generated high-detail, then bg-cleaned + pixelated in post to match the backdrop
SLICE_HEROES = {"frog_warden", "prop_lotus", "enemy_sludgeling", "enemy_bogrunner", "enemy_shellback"}

BOSS_CARD_STYLE = (
    "spider-punk zine collage boss poster, torn paper edges, halftone dots, "
    "high contrast screenprint, swamp-mystic palette (deep green, bog purple, "
    "acid teal and amber accents), menacing creature portrait filling the frame, "
    "punk energy, no text, no letters, no words"
)

# key -> (prompt, quality, size)
ASSETS: dict[str, tuple[str, str, str]] = {
    # frogs (heroes — the grumpy chunky toad from REF_01/REF_02; the game's icon)
    "frog_warden": (f"a single chunky grumpy green toad, heavy-lidded sleepy half-closed eyes, mottled olive-green skin with darker spots and faint glowing flecks, plump rounded heavy body, sitting alert in a slight three-quarter top-down view facing forward-right, isolated single character, {SLICE_STYLE}", "high", "1024x1024"),
    # golden lotus centerpiece — the iconic light source in both reference mockups
    "prop_lotus": (f"a single glowing golden lotus flower blooming on a dark lily pad, warm radiant golden-white glow, layered petals lit from within, top-down three-quarter view, {SLICE_STYLE}", "high", "1024x1024"),
    "frog_sporeback": (f"plump purple-gray toad shaman with glowing teal mushrooms and spores growing out of its back, one eye milky, facing right, {STYLE}", "medium", "1024x1024"),
    "frog_ribbit": (f"battle-scarred red-brown toad knight dragging an enormous rusted greatsword twice its size, low stance, grim heavy-lidded stare, facing right, {STYLE}", "medium", "1024x1024"),
    # slice roster (Ian art-direction 2026-07-07 v2): SIMPLE clean readable swamp blobs like the
    # reference enemies — rounded shapes, glowing eyes, little legs, mossy swamp-green, NOT muddy.
    "enemy_sludgeling": (f"a small plump round swamp slime creature, a TRANSLUCENT gooey jelly body of glowing green swamp sludge with visible bubbles and gunk and a tiny lily seed suspended INSIDE it, two big round glowing yellow-green eyes, tiny stubby legs, wet and jiggly and dripping, a simple clean cute-but-gross readable shape, {SLICE_STYLE}", "high", "1024x1024"),
    "enemy_bogrunner": (f"a small lean swamp sprite creature mid-dash, sleek wet dark-green tadpole-imp body, long thin springy legs, one big round glowing amber eye, a wisp of trailing algae, quick and darting, a simple clean readable shape, {SLICE_STYLE}", "high", "1024x1024"),
    "enemy_spitter": (f"{CRITTER} bloated with a fleshy tube snout aiming up, glowing green throat sac, {STYLE}", "low", "1024x1024"),
    "enemy_shellback": (f"a big round plump swamp turtle-toad creature, a clear grumpy mossy head with two big glowing teal eyes at the FRONT, a smooth mossy domed shell on its back dotted with a few glowing spores, thick stubby legs, slow and heavy, a simple clean readable shape, {SLICE_STYLE}", "high", "1024x1024"),
    "enemy_broodmother": (f"grotesque swollen egg-sac toad matriarch, translucent belly full of glowing young, too many eyes, {STYLE}", "medium", "1024x1024"),
    "enemy_broodling": (f"{CRITTER} tiny pink hatchling with one oversized glowing eye, {STYLE}", "low", "1024x1024"),
    "enemy_dragonfly": (f"eerie dragonfly with tattered ghost-lit wings and a needle body, glowing cyan compound eyes, {STYLE}", "low", "1024x1024"),
    "enemy_rotleech": (f"grotesque segmented leech worm, lamprey mouth of concentric teeth, weeping rust-orange sores, {STYLE}", "low", "1024x1024"),
    "enemy_hunter": (f"gaunt violet mantis-assassin, scythe arms, a third eye growing wrong out of the side of its head, glowing red gaze, {STYLE}", "medium", "1024x1024"),
    # bosses — grotesque, not kid-friendly
    "enemy_elder_sludge": (f"huge ancient sludge titan of moss and drowned wood, four asymmetric glowing amber eyes, one bursting from its temple, dripping, {STYLE}", "medium", "1024x1024"),
    "enemy_drowned_stag": (f"drowned elk revenant, waterlogged rotting hide, vast pale antlers hung with weeds, glowing ice-blue eyes, exposed ribs, {STYLE}", "medium", "1024x1024"),
    "enemy_mother_of_moths": (f"giant ghost moth queen, tattered dust-shedding wings, a ring of lantern eyes, unsettling humanlike face plates, {STYLE}", "medium", "1024x1024"),
    "enemy_rotting_king": (f"colossal rotting swamp king, crown of dead roots grown through his skull, moss beard, one huge acid-green eye erupting from his forehead, {STYLE}", "medium", "1024x1024"),
    # boss intro cards (landscape collage posters — the one spider-punk surface)
    "card_elder_sludge": (f"ancient moss sludge titan rising from black bog water, {BOSS_CARD_STYLE}", "medium", "1536x1024"),
    "card_drowned_stag": (f"drowned elk revenant with vast antlers breaching dark water, {BOSS_CARD_STYLE}", "medium", "1536x1024"),
    "card_mother_of_moths": (f"colossal moth queen blotting out a swamp moon, {BOSS_CARD_STYLE}", "medium", "1536x1024"),
    "card_rotting_king": (f"rotting swamp king on a throne of roots, crown askew, {BOSS_CARD_STYLE}", "medium", "1536x1024"),
    # the pixel arena backdrop — the reference mockup's world WITHOUT creatures
    "arena_backdrop": (
        "top-down detailed pixel art swamp arena at night, glossy dark reflective water with "
        "subtle dithered ripples, scattered green lily pads, cattails and reeds at the edges, "
        "small glowing mushrooms, fireflies, drifting smoky haze, deep murky greens and bog "
        "purples, an open circular clearing of water at the exact center, eight subtle mossy "
        "stump platforms spread around the middle distance, dark root tunnels at the edges, "
        "no creatures, no text, cute-but-eerie moody videogame arena, high-quality pixel art",
        "high", "1536x1024"),
    # title vista (Ian's pixel mockup composition)
    "title_vista": (
        "detailed pixel art swamp vista at night: giant glowing golden lotus on a lily pad in "
        "dark glossy water, smug chunky toad silhouette nearby, dark critters with glowing "
        "eyes lurking in reeds and cattails, fireflies, smoky haze, deep greens and bog "
        "purples, no text, no letters, empty upper third for a logo, high-quality pixel art",
        "medium", "1536x1024"),
}

# towers: 6 species x 3 growth tiers — carnivorous, slightly wrong, glowing
TOWER_PROMPTS = {
    "snaplily": "carnivorous snapping lily plant, toothy jawed flower head with a glowing gullet",
    "sporeshroom": "hunched mortar mushroom with a fleshy cap, lobbing glowing purple spore bombs",
    "thornvine": "coiled whip-vine with barbed thorns and a single glowing eye at its tip, striking pose",
    "willowisp": "wispy pale-blue lantern flower cradling a floating will-o-wisp ghost light",
    "bulrush": "stout cattail bruiser plant with a heavy club head wrapped in creeping moss",
    "moonbell": "silver bell-flower dripping soft white healing light, moth wings grown into its stem",
}
TIER_MOD = {
    1: "young small sprout version",
    2: "grown mid-size version, more teeth and glow",
    3: "huge ancient overgrown version, maximum menace and glow",
}
for kind, desc in TOWER_PROMPTS.items():
    for tier, mod in TIER_MOD.items():
        ASSETS[f"tower_{kind}_t{tier}"] = (f"{desc}, {mod}, rooted plant turret, {STYLE}", "low", "1024x1024")


def generate(keys: list[str]) -> None:
    from openai import OpenAI  # lazy import
    client = OpenAI()
    total = len(keys)
    for i, key in enumerate(keys, 1):
        prompt, quality, size = ASSETS[key]
        dest = OUT / f"{key}.png"
        if dest.exists():
            print(f"[{i}/{total}] skip {key} (exists)")
            continue
        print(f"[{i}/{total}] gen  {key} ({quality}, {size}) ...", flush=True)
        for attempt in range(3):
            try:
                r = client.images.generate(
                    model="gpt-image-1",
                    prompt=prompt,
                    size=size,
                    quality=quality,
                    background="opaque" if key in ("title_vista", "arena_backdrop") or key.startswith("card_") else "transparent",
                    n=1,
                )
                dest.write_bytes(base64.b64decode(r.data[0].b64_json))
                break
            except Exception as e:  # noqa: BLE001
                print(f"    retry {attempt + 1}: {e}")
                time.sleep(4 * (attempt + 1))
        else:
            print(f"    FAILED {key}")


def downscale() -> None:
    """Shrink legacy pixel sprites for load time. Slice heroes stay FULL-RES + painterly
    (REF_02 target) — the renderer scales them down smoothly, so never crunch them here."""
    from PIL import Image
    for p in OUT.glob("*.png"):
        if p.stem.startswith(("card_", "title_", "arena_")) or p.stem in SLICE_HEROES:
            continue
        img = Image.open(p)
        if img.width > 320:
            img.thumbnail((320, 320), Image.NEAREST)
            img.save(p)
    print("downscaled legacy sprites to <=320px; slice heroes kept full-res")


def manifest() -> None:
    m = {p.stem: f"/art/{p.name}" for p in sorted(OUT.glob("*.png"))}
    (OUT / "manifest.json").write_text(json.dumps(m, indent=2))
    print(f"manifest.json: {len(m)} entries")


def sheet() -> None:
    """Contact sheet for visual verification (docs/qa/art-sheet.png)."""
    from PIL import Image, ImageDraw
    pngs = [p for p in sorted(OUT.glob("*.png")) if not p.stem.startswith(("card_", "title_"))]
    if not pngs:
        print("no sprites yet")
        return
    cell, cols = 132, 8
    rows = (len(pngs) + cols - 1) // cols
    im = Image.new("RGB", (cols * cell, rows * cell + 16), (34, 54, 42))
    d = ImageDraw.Draw(im)
    for i, p in enumerate(pngs):
        s = Image.open(p).convert("RGBA")
        s.thumbnail((cell - 24, cell - 24), Image.LANCZOS)
        cx, cy = (i % cols) * cell, (i // cols) * cell
        im.paste(s, (cx + (cell - s.width) // 2, cy + (cell - s.height) // 2), s)
        d.text((cx + 4, cy + cell - 14), p.stem[:18], fill=(220, 230, 220))
    dest = ROOT / "docs" / "qa" / "art-sheet.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest)
    print(f"contact sheet -> {dest}")


if __name__ == "__main__":
    if "--sheet" in sys.argv:
        sheet()
        sys.exit(0)
    if not os.environ.get("OPENAI_API_KEY"):
        print("OPENAI_API_KEY not set")
        sys.exit(1)
    keys = list(ASSETS)
    if "--only" in sys.argv:
        wanted = sys.argv[sys.argv.index("--only") + 1].split(",")
        keys = [k for k in keys if k in wanted]
    generate(keys)
    downscale()
    manifest()
    sheet()
