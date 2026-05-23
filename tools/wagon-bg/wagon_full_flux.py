"""Generate a painterly FULL WAGON SIDE VIEW raster via FLUX.

Option B exploration (per docs/historical-pass/10-wagon-format-decision.md
escape valve): instead of a hybrid SVG body + raster bonnet, generate
the entire wagon side view as a single raster image. Loses state-driven
SVG flexibility (kegs, wear, accessory toggles) but gains maximum
painterly fidelity.

Outputs at static/wagon-bg/wagon-full/<name>.png. To compare against
option A (hybrid SVG + raster canvas) and the SVG-only baseline.

Generates 3 wagon model variants (light / prairie_schooner / heavy) at
clean / fresh state.
"""

from pathlib import Path

from flux_client import generate_to, ping

OUT_DIR = Path(__file__).parent.parent.parent / "static" / "wagon-bg" / "wagon-full"

WIDTH = 1536
HEIGHT = 640

VARIANTS = [
    (
        "wagon-prairie-schooner",
        710001,
        "Painterly oil painting in the style of Albert Bierstadt and "
        "Hudson River School: a SIDE VIEW of a complete 1840s emigrant "
        "PRAIRIE SCHOONER covered wagon, isolated against a plain "
        "cream-white background. The wagon facing LEFT (forward). "
        "Visible: four wood-spoked iron-tired wheels with the front "
        "pair smaller than the rear pair, straight square wood bed "
        "with flat plank sides extending down to the axle level, "
        "weathered brown unpainted wood with visible plank grain, "
        "iron banding at the corners. The off-white double-thickness "
        "cotton duck canvas is stretched TIGHT over six hickory bow "
        "ribs, with the foremost and rearmost bows visible framing "
        "the front and rear drawstring openings. Front opening is a "
        "puckered cinched circular hole behind the driver bench seat. "
        "Wood tongue extending forward to a doubletree at the front. "
        "Tar bucket dangling on a short chain from the rear axle stub. "
        "Brush stroke detail, painterly oil painting period 1840s, "
        "no oxen, no people, no driver figure, no landscape, no "
        "scene, isolated subject only.",
    ),
    (
        "wagon-light",
        720001,
        "Painterly oil painting in the style of Albert Bierstadt and "
        "Hudson River School: a SIDE VIEW of a small 1840s emigrant "
        "LIGHT FARM WAGON (smaller than a prairie schooner), isolated "
        "against a plain cream-white background. Wagon faces LEFT. "
        "Four wood-spoked iron-tired wheels with the front pair "
        "smaller than the rear pair (overall wheels smaller than a "
        "schooner's). Short square wood bed with flat plank sides. "
        "Smaller canvas bonnet stretched over four hickory bow ribs. "
        "Cinched front drawstring opening behind a small bench seat. "
        "Wood tongue with doubletree. Tar bucket on rear axle. "
        "Painterly oil painting brush stroke detail, period 1840s, "
        "no oxen, no people, no driver, no landscape.",
    ),
    (
        "wagon-heavy",
        730001,
        "Painterly oil painting in the style of Albert Bierstadt and "
        "Hudson River School: a SIDE VIEW of a heavy 1840s "
        "CONESTOGA-style FREIGHT WAGON, isolated against a plain "
        "cream-white background. Wagon faces LEFT. Four large "
        "wood-spoked iron-tired wheels with smaller front pair and "
        "very tall rear wheels. The wood bed has a distinctive "
        "boat-shaped curve with the front and rear ends curving "
        "upward (Conestoga signature). Large canvas bonnet stretched "
        "tight over seven hickory bow ribs that follow the upturned "
        "bed curve, creating a sailing-ship silhouette. Cinched "
        "drawstring openings at front and rear. Heavy iron banding "
        "wrapping the bed sides, intricate hand-forged hardware. "
        "Wood tongue with iron-banded doubletree. Painterly oil "
        "painting period 1840s, no oxen, no people, no landscape.",
    ),
]


def main() -> None:
    import sys
    if not ping():
        raise SystemExit("ComfyUI not reachable at http://127.0.0.1:8188")
    filter_names = set(sys.argv[1:])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    selection = [v for v in VARIANTS if not filter_names or v[0] in filter_names]
    print(f"FLUX-generating {len(selection)} full-wagon variant(s)\n")
    for i, (name, seed, prompt) in enumerate(selection, 1):
        out = OUT_DIR / f"{name}.png"
        print(f"[{i}/{len(selection)}] {out.name}  ({WIDTH}x{HEIGHT}, seed={seed})", flush=True)
        generate_to(out, prompt, WIDTH, HEIGHT, seed)
        print(f"   -> {out.relative_to(Path(__file__).parent.parent.parent)}\n")
    print("done.")


if __name__ == "__main__":
    main()
