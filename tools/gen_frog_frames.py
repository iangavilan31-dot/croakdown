# Derive frog BLINK + CROAK frames by EDITING the existing frog_warden.png (character-preserving —
# full regen can't hold a consistent character across frames; an edit keeps the same toad).
# Writes CANDIDATES only. Review, then (if consistent) run postprocess + add to manifest.
#   python tools/gen_frog_frames.py
# Requires OPENAI_API_KEY.

import base64
from pathlib import Path
from openai import OpenAI

ART = Path(__file__).resolve().parent.parent / "public" / "art"
SRC = ART / "frog_warden.png"

FRAMES = {
    "frog_blink_cand": (
        "The EXACT same chunky grumpy green swamp toad, identical pose, colours, size, shading and "
        "position, but with both eyes fully CLOSED in a soft sleepy blink (smooth closed eyelids, a "
        "gentle downward lash line). Change ONLY the eyes; everything else pixel-identical. Same "
        "detailed pixel-art style, transparent background, no scene, no text."
    ),
    "frog_croak_cand": (
        "The EXACT same chunky grumpy green swamp toad, identical pose, colours, size, shading and "
        "position, but mid-CROAK: its throat puffed out into a big round taut vocal sac under the "
        "chin and the mouth slightly open, eyes half-lidded. Change ONLY the throat/mouth; "
        "everything else pixel-identical. Same detailed pixel-art style, transparent background."
    ),
}

client = OpenAI()
for name, prompt in FRAMES.items():
    with open(SRC, "rb") as f:
        r = client.images.edit(model="gpt-image-1", image=f, prompt=prompt,
                               size="1024x1024", background="transparent", n=1)
    dest = ART / f"{name}.png"
    dest.write_bytes(base64.b64decode(r.data[0].b64_json))
    print("wrote", dest)
