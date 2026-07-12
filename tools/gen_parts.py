# GATE 2 — puppet parts sheets via gpt-image-1 (whole-sheet generations ONLY).
# One sheet per character (4x2 grid, 8 cells) and per enemy (1x2 grid), all parts
# in ONE generation so style stays coherent; any redo regenerates the WHOLE sheet.
# Usage:  python tools/gen_parts.py --only warden          (regen = delete png first)
#         python tools/gen_parts.py --list
# Writes public/art/parts/sheets/<name>.png

import base64
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "art" / "parts" / "sheets"
OUT.mkdir(parents=True, exist_ok=True)

# Style continuity with the graded backdrop (R13-17 lineage): painterly-pixel,
# swamp palette. Parts law: flat ambient light, no cast/baked shadows, no ground.
BASE = (
    "high-quality detailed 2D game sprite parts, painterly pixel-art hybrid in the style of "
    "Hyper Light Drifter and Dead Cells, soft dithered shading, gentle bioluminescent rim light, "
    "dark swamp fantasy palette of deep murky greens and bog purples, cute-but-eerie storybook "
    "forms, crisp readable silhouettes, soft FLAT ambient light, NO cast shadows, NO ground, "
    "NO background scenery, fully transparent background, no text, no labels, no grid lines"
)

SHEET_RULES = (
    "This is a character PARTS SHEET for a 2D puppet rig: a strict {grid} grid of {n} separate "
    "isolated parts with generous empty transparent space between them, no part touching another, "
    "every part fully inside its own grid cell, all parts in the SAME art style and palette, "
    "3/4 view facing right, neutral pose. "
)

CHAR_TEMPLATE = (
    "TOP ROW, left to right: "
    "(1) the far-side back ARM only of the character, small and stubby; "
    "(2) the character's BODY only: plump torso with big frog haunches and {back_item} on its back "
    "— strictly NO head, NO front arms, NO weapon on this part; "
    "(3) the character's HEAD only, eyes wide OPEN, {head_desc}; "
    "(4) the exact same HEAD with eyes fully CLOSED, blinking, same size and angle. "
    "BOTTOM ROW, left to right: "
    "(5) two stubby frog front ARMS gripping {grip_desc}, no body attached; "
    "(6) {weapon_desc}, shown alone, pointing right; "
    "(7) {extra_a}; "
    "(8) {extra_b}."
)

SHEETS: dict[str, dict] = {
    # ---- the 3 playable frogs (1536x1024, 4x2 grid) ----
    "warden": {
        "size": "1536x1024",
        "prompt": SHEET_RULES.format(grid="4 column by 2 row", n=8) + CHAR_TEMPLATE.format(
            back_item="a tiny worn leather adventurer backpack strapped",
            head_desc="a grumpy chunky olive-green toad head, heavy-lidded sleepy eyes, wide flat mouth, mottled skin with darker spots and faint glowing flecks",
            grip_desc="a leather-wrapped machete handle",
            weapon_desc="a huge weathered rusty MACHETE BLADE without any handle, long single-edged cleaver blade with a faint glowing edge",
            extra_a="a wide curved pale-green motion smear arc crescent, translucent",
            extra_b="a thinner faint motion smear arc crescent, translucent",
        ) + " The character is a plump grumpy olive-green swamp toad warrior. " + BASE,
    },
    "snapper": {
        "size": "1536x1024",
        "prompt": SHEET_RULES.format(grid="4 column by 2 row", n=8) + CHAR_TEMPLATE.format(
            back_item="a coiled rope bandolier slung",
            head_desc="a lean eager teal-green frog head with HUGE wide mouth, big round alert amber eyes, a few pale freckles",
            grip_desc="a short wooden reed-paddle handle",
            weapon_desc="a short flat REED PADDLE BLADE without handle, worn light wood with a faint glowing green edge",
            extra_a="a round hot-pink tongue tip sucker pad, glossy and sticky-looking",
            extra_b="a wide curved pale-pink motion smear arc crescent, translucent",
        ) + " The character is a lean athletic teal-green swamp frog rope-hunter. " + BASE,
    },
    "morel": {
        "size": "1536x1024",
        "prompt": SHEET_RULES.format(grid="4 column by 2 row", n=8) + CHAR_TEMPLATE.format(
            back_item="a cluster of small glowing teal mushrooms growing",
            head_desc="a sly purple-gray toad head with one milky pale eye and one sharp amber eye, thin knowing smirk",
            grip_desc="a crooked dark thorn-cane handle",
            weapon_desc="a crooked dark THORN CANE walking-stick blade without handle, gnarled wood with glowing teal spore pods",
            extra_a="a deflated cloth frog decoy doll, floppy and slumped, same purple-gray colors",
            extra_b="a wide curved pale-teal motion smear arc crescent with drifting spore dots, translucent",
        ) + " The character is a sly purple-gray toad trickster shaman. " + BASE,
    },
    # ---- the 5 enemies (1024x1024, 1x2 stack: body on top, eyes below) ----
    "bogling": {
        "size": "1024x1024",
        "prompt": (
            "A 2-part enemy sprite sheet: TOP HALF: one small round swamp sludge creature body, a "
            "near-black murky green blob silhouette with tiny stubby legs, wet dripping edges, NO eyes, "
            "NO face. BOTTOM HALF: only a pair of round glowing yellow-green EYES floating alone, "
            "bright and emissive. Generous empty space between the two parts. " + BASE
        ),
    },
    "midge": {
        "size": "1024x1024",
        "prompt": (
            "A 2-part enemy sprite sheet: TOP HALF: one eerie plump mosquito-wisp creature body, "
            "near-black bog-purple blob with two tattered translucent moth wings and a thin needle "
            "snout, NO eyes, NO face. BOTTOM HALF: only a pair of small glowing hot-pink EYES "
            "floating alone, bright and emissive. Generous empty space between the two parts. " + BASE
        ),
    },
    "gloopa": {
        "size": "1024x1024",
        "prompt": (
            "A 2-part enemy sprite sheet: TOP HALF: one huge heavy swamp slime dome creature body, "
            "near-black deep-green translucent jelly mound with drowned twigs and bubbles suspended "
            "inside, thick dripping base, NO eyes, NO face. BOTTOM HALF: only a pair of big round "
            "glowing amber EYES floating alone, bright and emissive. Generous empty space between "
            "the two parts. " + BASE
        ),
    },
    "spitshroom": {
        "size": "1024x1024",
        "prompt": (
            "A 2-part enemy sprite sheet: TOP HALF: one squat hunched mushroom creature body, "
            "near-black bog-brown cap with a fleshy tube snout aimed upward and a faint glowing "
            "green throat sac, NO eyes, NO face. BOTTOM HALF: only a pair of narrow glowing "
            "acid-green EYES floating alone, bright and emissive. Generous empty space between "
            "the two parts. " + BASE
        ),
    },
    "broodmaw": {
        "size": "1024x1024",
        "prompt": (
            "A 2-part enemy sprite sheet: TOP HALF: one bloated egg-sac toad matriarch creature "
            "body, near-black murky purple-green blob with a faintly glowing translucent belly full "
            "of tiny glowing young, NO eyes, NO face. BOTTOM HALF: only a cluster of five small "
            "glowing warm-gold EYES floating alone, bright and emissive. Generous empty space "
            "between the two parts. " + BASE
        ),
    },
}


def generate(keys: list[str]) -> None:
    from openai import OpenAI
    client = OpenAI()
    for i, key in enumerate(keys, 1):
        spec = SHEETS[key]
        dest = OUT / f"{key}.png"
        if dest.exists():
            print(f"[{i}/{len(keys)}] skip {key} (exists — delete to regen)")
            continue
        print(f"[{i}/{len(keys)}] gen {key} ({spec['size']}) ...", flush=True)
        for attempt in range(3):
            try:
                r = client.images.generate(
                    model="gpt-image-1",
                    prompt=spec["prompt"],
                    size=spec["size"],
                    quality="high",
                    background="transparent",
                    n=1,
                )
                dest.write_bytes(base64.b64decode(r.data[0].b64_json))
                print(f"    -> {dest.name}")
                break
            except Exception as e:  # noqa: BLE001
                print(f"    retry {attempt + 1}: {e}")
                time.sleep(5 * (attempt + 1))
        else:
            print(f"    FAILED {key}")


if __name__ == "__main__":
    if "--list" in sys.argv:
        print("\n".join(SHEETS))
        sys.exit(0)
    if not os.environ.get("OPENAI_API_KEY"):
        print("OPENAI_API_KEY not set")
        sys.exit(1)
    keys = list(SHEETS)
    if "--only" in sys.argv:
        wanted = sys.argv[sys.argv.index("--only") + 1].split(",")
        keys = [k for k in keys if k in wanted]
    generate(keys)
