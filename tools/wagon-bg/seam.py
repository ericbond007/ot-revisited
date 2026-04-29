"""Horizontal seam blender for tiled backdrop images.

SDXL with circular x-axis padding (via ComfyUI-seamless-tiling) produces
images whose right and left edges are *nearly* identical, but residual
VAE-decode artifacts can leave a faint vertical line at the seam where
adjacent tile copies meet.

Two passes, applied in order:

1. **Offset-blur** — shift the image by half its width so the original
   seam now sits in the middle of the canvas, apply a small gaussian
   blur to a feathered band centered on the seam, then shift back.
   Smooths any residual high-frequency content mismatch in the
   ~80-pixel band straddling the seam without touching the rest of
   the image.

2. **Edge equality** — force the outermost column on each side to be
   exactly equal (the average of the originals), fading back to the
   blurred interior over a small feather. Guarantees adjacent tile
   copies share an identical column at the boundary.

Cost: ~150 ms per 3072×768 image. Negligible vs SDXL generation cost.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def _offset_blur(arr: np.ndarray, *, band_width: int, blur_radius: float) -> np.ndarray:
    """Shift the image by half its width so the original seam sits at
    column w/2, gaussian-blur a feathered band centered there, shift back.
    """
    h, w, _ = arr.shape
    shift = w // 2
    shifted = np.roll(arr, shift, axis=1)

    seam_x = w // 2
    half = band_width // 2
    band_l = max(0, seam_x - half)
    band_r = min(w, seam_x + half)

    band_orig = shifted[:, band_l:band_r, :]
    band_pil = Image.fromarray(band_orig.astype(np.uint8))
    blurred_pil = band_pil.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    band_blurred = np.array(blurred_pil).astype(np.float32)

    # Feathered alpha: 1 at the seam (center of band), 0 at the band's edges.
    width_actual = band_r - band_l
    alpha_1d = np.zeros(width_actual, dtype=np.float32)
    center = width_actual / 2
    for i in range(width_actual):
        d = abs(i - center) / center if center > 0 else 0
        alpha_1d[i] = max(0.0, (1.0 - d) ** 2)
    alpha = alpha_1d.reshape(1, -1, 1)

    band_orig_f = band_orig.astype(np.float32)
    blended = band_blurred * alpha + band_orig_f * (1.0 - alpha)
    shifted_fixed = shifted.astype(np.float32).copy()
    shifted_fixed[:, band_l:band_r, :] = blended

    return np.roll(shifted_fixed, -shift, axis=1)


def _enforce_edge_equality(arr: np.ndarray, *, feather: int) -> np.ndarray:
    """Force columns 0 and w-1 to equal the average of the originals,
    fading back to the (already-blurred) interior over `feather` pixels.
    """
    h, w, _ = arr.shape
    avg_edge = (arr[:, 0:1, :] + arr[:, -1:, :]) / 2  # (h, 1, 3)
    for i in range(feather):
        a = i / (feather - 1) if feather > 1 else 1.0
        arr[:, i, :] = avg_edge[:, 0, :] * (1.0 - a) + arr[:, i, :] * a
        arr[:, w - 1 - i, :] = avg_edge[:, 0, :] * (1.0 - a) + arr[:, w - 1 - i, :] * a
    return arr


def blend_horizontal_seam(
    src: Path,
    dst: Path,
    *,
    band_width: int = 96,
    blur_radius: float = 4.0,
    feather: int = 16,
) -> None:
    """Apply seam blend to `src` and write to `dst`.

    Two passes: offset-and-blur the seam region (reduces content
    mismatch), then enforce strict edge equality (eliminates any
    residual line at the boundary itself).
    """
    img = Image.open(src).convert("RGB")
    arr = np.array(img).astype(np.float32)

    if band_width >= arr.shape[1] // 2:
        raise ValueError(f"band_width {band_width} too large for width {arr.shape[1]}")

    arr = _offset_blur(arr, band_width=band_width, blur_radius=blur_radius)
    arr = _enforce_edge_equality(arr, feather=feather)

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
