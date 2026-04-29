"""Background removal for wagon-bg tiles.

Reads an opaque PNG (SDXL output against a sky-blue backdrop) and writes
an alpha-masked WebP. Uses rembg's u2net model — a clean fit for painterly
silhouettes against a single-color background.

For the `ground` layer, alpha is not applied: the ground tile is
fully opaque, so callers should skip this module entirely for ground.
"""

from pathlib import Path

from PIL import Image
from rembg import new_session, remove

# Module-level session so the u2net model loads once per Python process.
_SESSION = None


def _session():
    global _SESSION
    if _SESSION is None:
        _SESSION = new_session("u2net")
    return _SESSION


def to_webp_with_alpha(src_png: Path, dst_webp: Path, *, quality: int = 85) -> None:
    """Run rembg on src_png and save the result as a WebP with alpha to dst_webp."""
    src_img = Image.open(src_png).convert("RGBA")
    out = remove(src_img, session=_session())
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
