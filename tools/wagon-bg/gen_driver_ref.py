"""Generate a clean reference image of a seated wagon driver via FLUX.
Output is fed into Hunyuan3D-2mini to produce a 3D mesh of the figure.

Hunyuan3D needs a CLEAN ISOLATED subject — single figure, plain
background — so the prompt emphasizes "isolated on white" and similar
cues to suppress scene clutter.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import flux_client


PROMPT = (
    "1860s American emigrant man sitting on a wagon bench seat, "
    "side profile view, both arms relaxed at sides with forearms extending "
    "forward to hold reins on his lap, wearing a wide-brim hat and "
    "plaid shirt and trousers and leather boots, mustache, "
    "knees bent ninety degrees with feet propped forward, "
    "isolated subject on a plain solid white background, "
    "studio photography, sharp focus, full body visible, "
    "no other people, no wagon visible, no horse visible, "
    "centered composition, detailed clothing, period-accurate"
)


def main():
    out = Path("/tmp/driver-flux.png")
    out.parent.mkdir(parents=True, exist_ok=True)

    # 1024x1024 keeps the figure detailed enough for Hunyuan3D to pick
    # up clothing details and pose.
    flux_client.generate_to(
        out_path=out,
        prompt=PROMPT,
        width=1024,
        height=1024,
        seed=int(sys.argv[1]) if len(sys.argv) > 1 else 42,
        steps=20,
        guidance=3.5,
    )
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
