"""Strip the cream-white background from FLUX-generated wagon sprites.

Uses ImageMagick floodfill from each corner with a fuzz threshold to
make the bg transparent while preserving the wagon (including the
off-white canvas which should NOT be keyed out — it's enclosed by
darker wood/iron borders so floodfill won't reach it).

Inputs: static/wagon-bg/wagon-body/*.png + static/wagon-bg/wagon-wheels/*.png
Outputs: in-place replacement (overwrites the originals).
Originals are committed via git, so re-running is reversible.

Usage:
    .venv/bin/python strip_bg.py            # all wagon-body + wagon-wheels
    .venv/bin/python strip_bg.py BODY       # only bodies
    .venv/bin/python strip_bg.py WHEELS     # only wheels
    .venv/bin/python strip_bg.py path1 path2  # specific files
"""

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
BODY_DIR = ROOT / "static" / "wagon-bg" / "wagon-body"
WHEEL_DIR = ROOT / "static" / "wagon-bg" / "wagon-wheels"
CANVAS_DIR = ROOT / "static" / "wagon-bg" / "wagon-canvas"
FULL_DIR = ROOT / "static" / "wagon-bg" / "wagon-full"


def strip(input_path: Path) -> None:
    """Strip cream-white background from one image. Floods from each
    of the 4 corners with fuzz=10% — typical FLUX cream bg has slight
    variation but is solidly distinct from the wagon's wood/canvas."""
    if not input_path.exists():
        print(f"  skip: {input_path} (missing)")
        return
    # Backup original to <name>.flux-orig.png the first time, so we
    # have a recoverable copy if floodfill goes wrong.
    backup = input_path.with_suffix(".flux-orig.png")
    if not backup.exists():
        shutil.copy2(input_path, backup)
    cmd = [
        "magick", str(backup),  # always work from the backup
        "-alpha", "set",
        "-bordercolor", "none",
        "-border", "1",
        "-fuzz", "10%",
        "-fill", "none",
        "-floodfill", "+0+0", "white",
        "-floodfill", "-0+0", "white",
        "-floodfill", "+0-0", "white",
        "-floodfill", "-0-0", "white",
        "-shave", "1x1",
        str(input_path),
    ]
    print(f"  → {input_path.name}", flush=True)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"     ERROR: {result.stderr}")
        return


def main() -> None:
    args = sys.argv[1:]
    targets: list[Path] = []
    if not args:
        targets.extend(sorted(BODY_DIR.glob("*.png")))
        targets.extend(sorted(WHEEL_DIR.glob("*.png")))
    elif args == ["BODY"]:
        targets.extend(sorted(BODY_DIR.glob("*.png")))
    elif args == ["WHEELS"]:
        targets.extend(sorted(WHEEL_DIR.glob("*.png")))
    elif args == ["CANVAS"]:
        targets.extend(sorted(CANVAS_DIR.glob("*.png")))
    elif args == ["FULL"]:
        targets.extend(sorted(FULL_DIR.glob("*.png")))
    else:
        targets = [Path(a) for a in args]

    # Filter out backup files
    targets = [t for t in targets if not t.name.endswith(".flux-orig.png")]

    print(f"Stripping bg from {len(targets)} image(s)\n")
    for t in targets:
        strip(t)
    print("\ndone.")


if __name__ == "__main__":
    main()
