"""Append crossfade bridge frames to a rendered animation cycle so
the loop seam is visually smooth.

When the source animation isn't a true periodic walk-in-place — like
the cow-npc model whose pose drifts slightly across one cycle — the
last frame doesn't match the first frame. The resulting loop has a
visible jump.

Workaround: render N cycle frames as normal, then synthesize K bridge
frames whose pixels are linearly blended from frame (N-1) toward
frame 0. Final loop sequence = N + K frames. The eye sees the cycle
play, then a smooth wash back to start.

Usage:
    python3 crossfade_loop.py <frames_dir> <basename> <bridge_count>

Reads <frames_dir>/<basename>--00.png ... <basename>--(N-1).png
Writes <frames_dir>/<basename>--N.png ... <basename>--(N+K-1).png

Bridge alpha increments evenly: bridge frame k (1..K) has alpha = k/(K+1)
applied to the start frame, with (1 - alpha) on the end frame.
"""

import sys
import subprocess
from pathlib import Path
from glob import glob


def main() -> None:
    if len(sys.argv) < 4:
        print("usage: crossfade_loop.py <frames_dir> <basename> <bridge_count>")
        return
    frames_dir = Path(sys.argv[1])
    basename = sys.argv[2]
    bridge_count = int(sys.argv[3])

    existing = sorted(glob(str(frames_dir / f"{basename}--*.png")))
    if not existing:
        print(f"No frames found at {frames_dir}/{basename}--*.png")
        return
    n = len(existing)
    print(f"Existing frames: {n}")

    start_frame = frames_dir / f"{basename}--00.png"
    end_frame = frames_dir / f"{basename}--{n - 1:02d}.png"

    for k in range(1, bridge_count + 1):
        # bridge frame k: alpha=k/(bridge_count+1) toward start frame
        alpha_pct = k * 100 / (bridge_count + 1)
        out_path = frames_dir / f"{basename}--{n - 1 + k:02d}.png"
        # ImageMagick blend: result = src1 * (1 - alpha) + src2 * alpha
        # We want: result = end_frame * (1 - alpha) + start_frame * alpha
        # `-compose blend -define compose:args=ALPHA% -composite` does this.
        cmd = [
            'magick',
            str(end_frame), str(start_frame),
            '-compose', 'blend',
            '-define', f'compose:args={alpha_pct:.2f}',
            '-composite',
            str(out_path),
        ]
        subprocess.run(cmd, check=True)
        print(f"  bridge frame {n - 1 + k:02d}: {alpha_pct:.1f}% start blended into end → {out_path.name}")

    print(f"\nTotal frames now: {n + bridge_count} (was {n}, added {bridge_count} bridge)")


if __name__ == "__main__":
    main()
