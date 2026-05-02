"""Background removal for wagon-bg tiles.

Reads an opaque PNG (SDXL output) and writes an alpha-masked WebP. Uses
rembg's BiRefNet-general model — substantially cleaner alpha edges than
u2net (matters for foliage / tree silhouettes where u2net leaves visible
white halos against sky compositing).

For the `ground` and `sky` layers, alpha is not applied: the tile is
fully opaque, so callers should skip this module entirely.
"""

from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

# Module-level session so the matter model loads once per Python process.
# birefnet-general has cleaner edges than u2net for foliage / soft subjects;
# first run auto-downloads the model (~885 MB) to ~/.u2net/.
_SESSION = None
_MODEL_NAME = "birefnet-general"


def _session():
    global _SESSION
    if _SESSION is None:
        _SESSION = new_session(_MODEL_NAME)
    return _SESSION


def to_webp_with_alpha(src_png: Path, dst_webp: Path, *, quality: int = 85) -> None:
    """Run rembg on src_png and save the result as a WebP with alpha to dst_webp."""
    src_img = Image.open(src_png).convert("RGBA")
    out = remove(src_img, session=_session())
    dst_webp.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst_webp, format="WEBP", quality=quality, method=6)


def to_webp_with_alpha_band(
    src_png: Path,
    dst_webp: Path,
    *,
    top_frac: float,
    fade_frac: float = 0.05,
    quality: int = 85,
) -> None:
    """Matte + band-crop. Runs BiRefNet matter (clean foliage edges), then
    multiplies the resulting alpha by a vertical envelope that's zero above
    `top_frac` of source height and one below, with a linear feathered
    transition over `fade_frac`. Use this for `mid` (top_frac~0.25) and
    `close` (top_frac~0.55) layers where the matter sometimes keeps the
    painted sky region as foreground — the band crop force-removes it.

    `top_frac` is the fraction of source height above which alpha goes
    to zero. e.g. top_frac=0.55 means the top 55% of the source becomes
    transparent.
    """
    src_img = Image.open(src_png).convert("RGBA")
    matted = remove(src_img, session=_session())  # PIL RGBA

    arr = np.array(matted)
    h = arr.shape[0]

    cut_y = int(h * top_frac)
    fade_px = max(1, int(h * fade_frac))

    envelope = np.ones(h, dtype=np.float32)
    envelope[: max(0, cut_y - fade_px)] = 0.0
    fade_start = max(0, cut_y - fade_px)
    fade_end = cut_y
    if fade_end > fade_start:
        envelope[fade_start:fade_end] = np.linspace(0.0, 1.0, fade_end - fade_start)

    alpha = arr[:, :, 3].astype(np.float32) * envelope[:, np.newaxis]
    arr[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)

    out = Image.fromarray(arr)
    dst_webp.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst_webp, format="WEBP", quality=quality, method=6)


def copy_opaque_to_webp(src_png: Path, dst_webp: Path, *, quality: int = 85) -> None:
    """Save src_png as a WebP without alpha. Used for the `ground` layer."""
    src_img = Image.open(src_png).convert("RGB")
    dst_webp.parent.mkdir(parents=True, exist_ok=True)
    src_img.save(dst_webp, format="WEBP", quality=quality, method=6)


if __name__ == "__main__":
    # Smoke check: takes a sample SDXL output (the smoke test from earlier
    # sessions if present) and confirms it processes without error.
    sample = Path.home() / "ComfyUI" / "output" / "01_background_prairie_00001_.png"
    out = Path("/tmp/alpha_smoke.webp")
    if not sample.exists():
        raise SystemExit(f"sample {sample} not found — generate one first")
    to_webp_with_alpha(sample, out)
    img = Image.open(out)
    assert img.mode == "RGBA", f"expected RGBA, got {img.mode}"
    print(f"OK: {out} ({img.size}, mode={img.mode})")
