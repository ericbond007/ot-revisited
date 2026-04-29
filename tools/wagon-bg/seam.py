"""Horizontal seam blender for tiled backdrop images.

SDXL with circular x-axis padding (via ComfyUI-seamless-tiling) produces
images whose right and left edges are *nearly* identical, but residual
VAE-decode artifacts can leave a faint vertical line at the seam where
adjacent tile copies meet.

Strategy: enforce strict equality at the very boundary (columns 0 and
w-1 both equal to the average of the original outermost columns), with
a wide feathered transition so the blend is imperceptible against the
surrounding texture. Wider feather = smoother gradient but slightly
more interior-content modification.

No blur — keeps the painting as sharp as SDXL produced it. The texture
mismatch tile-to-tile is averaged smoothly across the feather region
rather than appearing as a discrete line.

Cost: ~50 ms per 3072×768 image.
"""

from pathlib import Path

import numpy as np
from PIL import Image


def blend_horizontal_seam(src: Path, dst: Path, *, feather: int = 96) -> None:
    """Apply seam blend to `src` and write to `dst`.

    Forces leftmost column == rightmost column (both equal to the
    average of the originals), fading back to original interior content
    over `feather` pixels on each side. Total transition zone width =
    2 × feather pixels straddling the seam when tiles are placed
    side-by-side.

    `feather=96` covers ~6 % of a 3072-wide painting on each side.
    Wider than the original 16-pixel feather, smoother gradient,
    same edge-equality guarantee.
    """
    img = Image.open(src).convert("RGB")
    arr = np.array(img).astype(np.float32)
    h, w, _ = arr.shape

    if feather >= w // 4:
        raise ValueError(f"feather {feather} too large for image width {w}")

    avg_edge = (arr[:, 0:1, :] + arr[:, -1:, :]) / 2  # shape (h, 1, 3)

    # Smooth interpolation curve (cubic ease) so the blend doesn't
    # look like a linear ramp against the painting's texture.
    def ease(t: float) -> float:
        # smoothstep: 3t^2 - 2t^3
        return t * t * (3.0 - 2.0 * t)

    for i in range(feather):
        a = ease(i / (feather - 1)) if feather > 1 else 1.0
        arr[:, i, :] = avg_edge[:, 0, :] * (1.0 - a) + arr[:, i, :] * a
        arr[:, w - 1 - i, :] = avg_edge[:, 0, :] * (1.0 - a) + arr[:, w - 1 - i, :] * a

    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.suffix.lower() == ".webp":
        out.save(dst, format="WEBP", quality=85, method=6)
    else:
        out.save(dst)


if __name__ == "__main__":
    # CLI: apply seam blend to every backdrop-*.webp in static/wagon-bg/.
    # Used to retro-fit existing tiles without re-running SDXL.
    import sys

    static_dir = Path(__file__).parent.parent.parent / "static" / "wagon-bg"
    tiles = sorted(static_dir.glob("backdrop-*.webp"))
    if not tiles:
        raise SystemExit(f"No backdrop tiles found in {static_dir}")

    print(f"Blending seams in {len(tiles)} backdrop tile(s)...")
    for t in tiles:
        blend_horizontal_seam(t, t)
        print(f"  ✓ {t.name}")
    print("done.")
