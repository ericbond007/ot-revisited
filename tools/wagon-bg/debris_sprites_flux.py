"""Generate individual trail-debris sprites via FLUX.1-dev.

Each sprite is a single object on a plain background, then rembg-matted
so the background goes transparent in the final WebP. Composited at
deterministic positions in GroundPainting.svelte.

Why sprites instead of baking debris into the trail tile: FLUX refused
to paint visible debris into the main trail tile no matter how the
prompt was phrased, but it renders "single object on plain background"
subjects reliably (cf. the wagon-textures pipeline).

Each sprite carries a CATEGORY tag consumed by the dynamic trail-debris
system (`debris-field.ts` + `GroundPainting.svelte`) — see
`docs/superpowers/specs/2026-05-17-dynamic-trail-debris-design.md`.
  - "natural": rocks, sticks — present on every terrain, all distances
  - "bones":   western plains animal remains — weight up in prairie /
               desert and from mid-trail onward
  - "junk":    abandoned wagon cargo — weight up with milesTraveled
               (pioneers dumped furniture/barrels/parts to lighten
               loads as the journey wore on; Fort Laramie was nicknamed
               "Camp Sacrifice"). Historically near-absent early,
               heavy mid/late trail.
  - "graves":  trail grave sites — weight with deathCount, present
               mid-trail onward; frequency capped to avoid sensationalism.

Sprites land at static/wagon-bg/trail-debris/<name>.webp with a real
alpha channel from rembg's BiRefNet matte.
"""

from pathlib import Path

from alpha import to_webp_with_alpha
from flux_client import generate_to, ping

THIS_DIR = Path(__file__).parent
RAW_DIR = THIS_DIR / "raw"
OUT_DIR = THIS_DIR.parent.parent / "static" / "wagon-bg" / "trail-debris"

# 1024×1024 — single objects, so the higher resolution is cheap (~40s
# each) and FLUX paints dramatically more texture/edge detail than at
# 512. The sprites get scaled down hard in the scene anyway, but the
# extra detail survives the downscale as crisp form.
WIDTH = 1024
HEIGHT = 1024

# Shared prompt scaffold: single centered object, plain background for a
# clean rembg matte, painterly oil style to match the trail tile + the
# Hudson-River backdrop aesthetic. Top-down so the item reads as lying
# flat on the trail when composited.
_STYLE = (
    " The object is centered on a plain flat off-white background with "
    "soft even lighting and a faint contact shadow directly beneath it. "
    "Painted in a detailed Hudson-River-School oil illustration style "
    "with visible brushwork and rich surface texture. Top-down view, "
    "the object lying flat on the ground. Single object only, nothing "
    "else in frame."
)

# (name, category, seed, prompt)
DEBRIS: list[tuple[str, str, int, str]] = [
    # ── natural: rocks ──────────────────────────────────────────────
    ("pebble-gray", "natural", 801001,
     "A single smooth dark gray river stone, rounded oval shape, with "
     "subtle mineral mottling and a worn polished surface." + _STYLE),
    ("pebble-tan", "natural", 801002,
     "A single tan and cream weathered sandstone pebble, irregular "
     "rounded shape, dry and dusty with fine grain texture." + _STYLE),
    ("pebble-rust", "natural", 801003,
     "A single rust-red iron-stained rock, angular broken shape, with "
     "orange oxidation streaks and rough fractured faces." + _STYLE),
    ("rock-cluster", "natural", 801007,
     "A small cluster of three or four scattered stones of varied size "
     "and earth-tone color (gray, tan, ochre), nestled together in the "
     "dirt." + _STYLE),
    # ── natural: wood ───────────────────────────────────────────────
    ("stick-short", "natural", 801004,
     "A single short broken weathered tree branch, finger-length, gray "
     "and tan bark peeling, dry and cracked." + _STYLE),
    ("stick-curved", "natural", 801005,
     "A single curved weathered driftwood-like stick, slightly bent, "
     "silver-gray sun-bleached wood with split grain." + _STYLE),
    # ── natural: plains fuel ────────────────────────────────────────
    ("buffalo-chips", "natural", 801006,
     "A single dried disc of weathered buffalo dung (a 'buffalo chip'), "
     "flat circular fibrous brown pat, cracked and sun-dried — the "
     "universal cooking fuel of the treeless plains." + _STYLE),
    # ── bones: western plains remains ───────────────────────────────
    ("bison-skull", "bones", 801010,
     "A single sun-bleached American bison buffalo skull, broad plains "
     "skull with two short curved dark horns and weathered white-gray "
     "bone, half-buried in trail dust." + _STYLE),
    ("pronghorn-skull", "bones", 801011,
     "A single sun-bleached pronghorn antelope skull with its pair of "
     "black pronged horns curving up and back, weathered ivory bone, "
     "dry and cracked." + _STYLE),
    ("rib-cage", "bones", 801012,
     "A partial sun-bleached ox ribcage and spine section, curved "
     "white-gray rib bones arcing up from a vertebral column, "
     "weathered and dry — a draft ox that died on the trail." + _STYLE),
    ("ox-skull", "bones", 801013,
     "A single sun-bleached domestic ox skull with broad forehead and "
     "two thick weathered horns, cracked gray-white bone half sunk in "
     "dust — the most common large carcass on the Oregon Trail." + _STYLE),
    ("long-bones", "bones", 801014,
     "A few scattered sun-bleached large animal leg bones, white-gray, "
     "dry and cracked, lying loosely apart in the dirt as if scattered "
     "by wolves." + _STYLE),
    # ── junk: abandoned wagon cargo ─────────────────────────────────
    ("broken-wheel", "junk", 801020,
     "A single broken wooden wagon wheel, iron rim rusted, several "
     "spokes snapped, lying flat and partly splintered — discarded "
     "from a broken-down prairie schooner." + _STYLE),
    ("discarded-barrel", "junk", 801021,
     "A single weathered wooden barrel lying on its side, iron hoops "
     "rusted, staves grayed and cracked, lid missing — a food barrel "
     "abandoned to lighten a wagon load." + _STYLE),
    ("abandoned-trunk", "junk", 801022,
     "A single battered wooden steamer trunk, leather straps cracked, "
     "brass corners tarnished, lid ajar — a settler's chest left "
     "behind on the trail." + _STYLE),
    ("cook-stove", "junk", 801023,
     "A single small cast-iron cook stove, rusted, one leg bent, "
     "abandoned and tipped slightly — the kind of heavy household "
     "item pioneers dumped at Fort Laramie's 'Camp Sacrifice'." + _STYLE),
    ("anvil", "junk", 801024,
     "A single rusted blacksmith's anvil sitting in the dirt, heavy "
     "iron pitted with orange rust — endlessly listed among goods "
     "jettisoned on the 1849 trail." + _STYLE),
    ("bacon-heap", "junk", 801025,
     "A single heap of abandoned cured side-bacon slabs, fatty cream "
     "and pink-brown streaked, dusty and spoiling in a pile on the "
     "ground — the infamous 'piles of most beautiful bacon'." + _STYLE),
    # ── graves: the trail's long graveyard ──────────────────────────
    ("grave-mound", "graves", 801030,
     "A single low unmarked grave: a long mound of compacted trail "
     "dirt, slightly raised, bare and somber, no marker — dug into "
     "the trail itself." + _STYLE),
    ("grave-marker", "graves", 801031,
     "A single lonely grave with a crude weathered wooden headboard, "
     "a rough plank or simple wooden cross leaning slightly, low dirt "
     "mound, stark and somber." + _STYLE),
    ("grave-wolfdug", "graves", 801032,
     "A single disturbed shallow grave, the low dirt mound partly dug "
     "open and scattered by wolves, a broken wooden marker askew — "
     "grim and somber, no remains visible." + _STYLE),
]


def main() -> None:
    import sys
    if not ping():
        raise SystemExit("ComfyUI not reachable at http://127.0.0.1:8188")

    # Optional CLI filters: a category ("natural"/"bones"/"junk"/"graves") or
    # specific sprite names.
    args = set(sys.argv[1:])
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    selection = [
        d for d in DEBRIS
        if not args or d[0] in args or d[1] in args
    ]
    print(f"FLUX-generating {len(selection)} debris sprite(s) "
          f"at {WIDTH}x{HEIGHT}\n")

    for i, (name, category, seed, prompt) in enumerate(selection, 1):
        raw_path = RAW_DIR / f"debris-{name}.png"
        out_path = OUT_DIR / f"{name}.webp"
        print(f"[{i}/{len(selection)}] {out_path.name}  "
              f"[{category}] (seed={seed})", flush=True)
        generate_to(raw_path, prompt, WIDTH, HEIGHT, seed)
        to_webp_with_alpha(raw_path, out_path)
        print(f"   -> {out_path.relative_to(THIS_DIR.parent.parent)}\n")

    print("done.")


if __name__ == "__main__":
    main()
