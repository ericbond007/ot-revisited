"""Horizontal seam blender for tiled backdrop images.

SDXL with circular x-axis padding (via ComfyUI-seamless-tiling) produces
images whose right and left edges are *nearly* identical, but residual
VAE-decode artifacts can leave a faint vertical line at the seam where
adjacent tile copies meet.

`blend_horizontal_seam` enforces strict edge equality with a feathered
blend: the outermost column on each side is replaced with the average
of the original outermost columns, fading back to the original interior
content over `feather` pixels. Result: leftmost column == rightmost
column, no perceptible seam, original content preserved everywhere
except the very edge.

Cost: ~50 ms per 3072×768 image. Negligible vs SDXL generation cost.
"""

from pathlib import Path

import numpy as np
from PIL import Image


def blend_horizontal_seam(src: Path, dst: Path, *, feather: int = 16) -> None:
    """Apply seam blend to `src` and write to `dst`.

    Forces the leftmost and rightmost columns to be identical (the
    average of the originals), fading back to the original interior
    over `feather` pixels on each side.
    """
    img = Image.open(src).convert("RGB")
    arr = np.array(img).astype(np.float32)
    h, w, _ = arr.shape

    if feather >= w // 4:
        raise ValueError(f"feather {feather} too large for image width {w}")

    # The target value at the boundary: the average of the outermost
    # columns. After blending, column 0 and column w-1 both equal this.
    avg_edge = (arr[:, 0:1, :] + arr[:, -1:, :]) / 2  # shape (h, 1, 3)

    # Blend the leftmost `feather` columns: at x=0 it's all avg_edge;
    # at x=feather-1 it's the original interior content.
    for i in range(feather):
        a = i / (feather - 1)  # 0 at outermost edge, 1 at innermost
        arr[:, i, :] = avg_edge[:, 0, :] * (1.0 - a) + arr[:, i, :] * a

    # Blend the rightmost `feather` columns symmetrically.
    for i in range(feather):
        a = i / (feather - 1)
        arr[:, w - 1 - i, :] = avg_edge[:, 0, :] * (1.0 - a) + arr[:, w - 1 - i, :] * a

    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    dst.parent.mkdir(parents=True, exist_ok=True)
    # Preserve format (WebP for our pipeline outputs, PNG for raw inputs).
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
