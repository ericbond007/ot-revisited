"""Align all frames in an animation cycle to the same image-space
center-of-mass as frame 0. Eliminates the "body shift" component of
loop discontinuity for animations that aren't true walk-in-place.

For each frame:
  1. Open as RGBA
  2. Find the centroid of non-transparent pixels (alpha > 0)
  3. Translate the image so its centroid matches frame 0's

The image canvas size stays the same; the cow content shifts within it.
Edges that get translated off-frame are lost; the freed area on the
opposite edge fills with transparency.

Usage:
    python3 align_frames.py <frames_dir> <basename>

Modifies the PNGs in-place. Backs them up to <basename>--NN.png.orig
on the first run.
"""

import sys
from pathlib import Path
from glob import glob
from PIL import Image
import shutil


def opaque_centroid(img: Image.Image) -> tuple[float, float]:
    """Center-of-mass of non-transparent pixels (alpha > 0)."""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    alpha = img.getchannel('A')
    w, h = alpha.size
    # Threshold the alpha channel to find opaque region.
    # Use bbox first as a fast bound, then weight inside it.
    bbox = alpha.getbbox()
    if bbox is None:
        return w / 2, h / 2
    # Compute weighted centroid using alpha as weight
    sum_x = 0.0
    sum_y = 0.0
    sum_w = 0.0
    pixels = alpha.load()
    x0, y0, x1, y1 = bbox
    for y in range(y0, y1):
        for x in range(x0, x1):
            a = pixels[x, y]
            if a > 16:  # ignore very faint edges
                sum_x += x * a
                sum_y += y * a
                sum_w += a
    if sum_w == 0:
        return w / 2, h / 2
    return sum_x / sum_w, sum_y / sum_w


def shift_image(img: Image.Image, dx: int, dy: int) -> Image.Image:
    """Translate image by (dx, dy) integer pixels. Edges out fall off,
    edges in fill with transparent."""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    canvas = Image.new('RGBA', img.size, (0, 0, 0, 0))
    canvas.paste(img, (dx, dy), img)
    return canvas


def main() -> None:
    if len(sys.argv) < 3:
        print("usage: align_frames.py <frames_dir> <basename>")
        return
    frames_dir = Path(sys.argv[1])
    basename = sys.argv[2]
    files = sorted(glob(str(frames_dir / f"{basename}--*.png")))
    files = [f for f in files if not f.endswith('.orig')]
    if not files:
        print(f"No frames at {frames_dir}/{basename}--*.png")
        return

    # Backup originals on first run
    for f in files:
        orig = Path(f + '.orig')
        if not orig.exists():
            shutil.copy(f, orig)

    # Compute reference centroid from frame 0
    ref_img = Image.open(files[0] + '.orig').convert('RGBA')
    ref_x, ref_y = opaque_centroid(ref_img)
    print(f"Reference centroid (frame 00): ({ref_x:.1f}, {ref_y:.1f})")

    for i, f in enumerate(files):
        src = Image.open(f + '.orig').convert('RGBA')
        cx, cy = opaque_centroid(src)
        dx = round(ref_x - cx)
        dy = round(ref_y - cy)
        out = shift_image(src, dx, dy)
        out.save(f)
        print(f"  frame {i:02d}: centroid ({cx:.1f}, {cy:.1f}) → shift ({dx:+d}, {dy:+d})")

    print(f"\nAligned {len(files)} frames; originals saved as <name>.orig")


if __name__ == "__main__":
    main()
