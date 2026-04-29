"""Wagon-bg pipeline orchestrator.

Iterates the prompt config, generates each tile through ComfyUI, runs
the alpha post-process, writes the final WebP to ../../static/wagon-bg/.
A manifest at .manifest.json tracks which tiles have been built so a
re-run only regenerates what changed.
"""

import argparse
import hashlib
import json
import time
from pathlib import Path

from alpha import copy_opaque_to_webp, to_webp_with_alpha
from comfy_client import CHECKPOINT, generate_to, ping
from prompts import NEGATIVE_PROMPT, PROMPTS, TilePrompt

THIS_DIR = Path(__file__).parent
RAW_DIR = THIS_DIR / "raw"
STATIC_DIR = THIS_DIR.parent.parent / "static" / "wagon-bg"
MANIFEST = THIS_DIR / ".manifest.json"


def _signature(p: TilePrompt) -> str:
    """Hash of everything that affects the output: checkpoint + prompt + neg + dims + seed."""
    h = hashlib.sha256()
    h.update(CHECKPOINT.encode())
    h.update(p.full_prompt.encode())
    h.update(NEGATIVE_PROMPT.encode())
    h.update(f"{p.width}x{p.height}".encode())
    h.update(str(p.seed).encode())
    return h.hexdigest()[:16]


def _load_manifest() -> dict[str, str]:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text())
    return {}


def _save_manifest(m: dict[str, str]) -> None:
    MANIFEST.write_text(json.dumps(m, indent=2, sort_keys=True))


def _filter(args: argparse.Namespace, all_prompts: list[TilePrompt]) -> list[TilePrompt]:
    if not args.only:
        return all_prompts
    # --only "far,prairie" or --only "far" or --only "*,mountains"
    parts = [p.strip() for p in args.only.split(",")]
    layer_filter = parts[0] if parts and parts[0] != "*" else None
    terrain_filter = parts[1] if len(parts) > 1 and parts[1] != "*" else None
    out = []
    for p in all_prompts:
        if layer_filter and p.layer != layer_filter:
            continue
        if terrain_filter and p.terrain != terrain_filter:
            continue
        out.append(p)
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="layer[,terrain] filter, e.g. 'far,prairie'", default=None)
    parser.add_argument("--regen", action="store_true", help="force regenerate even if manifest matches")
    args = parser.parse_args()

    if not ping():
        raise SystemExit("ComfyUI not reachable at http://127.0.0.1:8188 — start it first")

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    manifest = _load_manifest()
    selection = _filter(args, PROMPTS)
    print(f"Generating {len(selection)} tile(s) of {len(PROMPTS)} total\n")

    for i, p in enumerate(selection, 1):
        sig = _signature(p)
        out_path = STATIC_DIR / p.filename
        if not args.regen and manifest.get(p.filename) == sig and out_path.exists():
            print(f"[{i}/{len(selection)}] {p.filename}  -- up to date, skip")
            continue

        print(f"[{i}/{len(selection)}] {p.filename}  ({p.width}x{p.height}, seed={p.seed})", flush=True)
        t0 = time.monotonic()
        raw_path = RAW_DIR / f"{p.layer}-{p.terrain}.png"
        # Backdrops generate seamlessly on the X axis so adjacent tile copies
        # in BackdropPainting have invisible seams. Ground tiles stay non-seamless
        # (they're cropped to the bottom of a perspective shot, so tileability
        # at the edges doesn't matter).
        generate_to(
            raw_path, p.full_prompt, NEGATIVE_PROMPT, p.width, p.height, p.seed,
            seamless=(p.layer == "backdrop"),
        )

        # Both layers are opaque now: the backdrop is a full painted scene
        # (sky baked in), the ground is a trail surface. rembg's alpha pass
        # was useful when we had silhouette-band fragments, but the new
        # architecture treats each tile as a complete image.
        copy_opaque_to_webp(raw_path, out_path)

        elapsed = time.monotonic() - t0
        manifest[p.filename] = sig
        _save_manifest(manifest)
        print(f"   -> {out_path.relative_to(THIS_DIR.parent.parent)}  ({elapsed:.1f}s)\n")

    print("done.")


if __name__ == "__main__":
    main()
