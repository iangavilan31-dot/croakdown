# One-off, REVERSIBLE arena_backdrop regen toward REF_02 (dark teal lily-pond).
# Writes a CANDIDATE (never overwrites the live art). Review, then swap by hand if better.
#   python tools/gen_backdrop.py
# Requires OPENAI_API_KEY. Output: public/art/arena_backdrop_cand.png (1536x1024, opaque).

import base64
from pathlib import Path
from openai import OpenAI

OUT = Path(__file__).resolve().parent.parent / "public" / "art"

PROMPT = (
    "Top-down slightly-angled overhead view of a 2D game arena background: a calm DARK TEAL "
    "night-swamp pond. Deep teal and murky green water with soft painterly ripples and gentle "
    "light reflections. Scattered flat lily pads and lotus leaves, clusters of reeds and cattails "
    "and grass tufts around the outer edges, a few mossy rocks and roots. Drifting fog and haze, "
    "glowing fireflies and floating spores, one soft warm golden lotus glow. The CENTER is open "
    "clear water, uncluttered, ready for gameplay. Painterly pixel art, muted swamp greens and "
    "deep teal palette with warm gold and faint accents, soft bloom, dark vignette at the edges, "
    "dreamy cozy late-night mood. NO tree stumps, NO logs, NO characters, NO creatures, NO text, "
    "NO letters, NO UI. Cohesive hand-painted background plate."
)

client = OpenAI()
r = client.images.generate(model="gpt-image-1", prompt=PROMPT, size="1536x1024",
                           quality="medium", background="opaque", n=1)
dest = OUT / "arena_backdrop_cand.png"
dest.write_bytes(base64.b64decode(r.data[0].b64_json))
print("wrote", dest)
