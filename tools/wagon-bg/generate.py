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
from seam import blend_horizontal_seam

THIS_DIR = Path(__file__).parent
RAW_DIR = THIS_DIR / "raw"
STATIC_DIR = THIS_DIR.parent.parent / "static" / "wagon-bg"
MANIFEST = THIS_DIR / ".manifest.json"

# Known LoRAs we can stack via `--lora <key>` (or `--lora a,b` for stacks).
# Each entry: (filename in ~/ComfyUI/models/loras/, default weight, trigger words to prepend).
# Phase 1.5b spike — testing whether style LoRAs alone resolve the framing
# / palette complaints before committing to a custom train.
LORA_REGISTRY: dict[str, tuple[str, float, str]] = {
    "cottagecore": (
        "cottagecore-gouache-v1.safetensors",
        0.8,
        "novuschroma23 style, ",
    ),
    # Custom-trained LoRA — Phase 1.5b first run. 37 hand-picked Hudson River
    # School + Whittredge plains references at rank 32, Adafactor, UNet-only
    # (text encoder LoRA wasn't trained). Three checkpoints captured to A/B
    # for the right convergence sweet spot.
    "ht_500":  ("ht_landscape_v1_500.safetensors",  1.0, "ht_landscape, "),
    "ht_1000": ("ht_landscape_v1_1000.safetensors", 1.0, "ht_landscape, "),
    "ht_1500": ("ht_landscape_v1_1500.safetensors", 1.0, "ht_landscape, "),
    # v2: rank 64, 896 res, per-image composition-tagged captions, PagedAdamW8bit.
    # Final loss 0.131 vs v1's 0.142. Trigger word same: ht_landscape.
    "v2_500":  ("ht_landscape_v2_500.safetensors",  1.0, "ht_landscape, "),
    "v2_1000": ("ht_landscape_v2_1000.safetensors", 1.0, "ht_landscape, "),
    "v2_1500": ("ht_landscape_v2_1500.safetensors", 1.0, "ht_landscape, "),
    "v2_2000": ("ht_landscape_v2_2000.safetensors", 1.0, "ht_landscape, "),
}


def _signature(p: TilePrompt, loras: list[tuple[str, float]]) -> str:
    """Hash of everything that affects the output: checkpoint + prompt + neg + dims + seed + LoRA stack."""
    h = hashlib.sha256()
    h.update(CHECKPOINT.encode())
    h.update(p.full_prompt.encode())
    h.update(NEGATIVE_PROMPT.encode())
    h.update(f"{p.width}x{p.height}".encode())
    h.update(str(p.seed).encode())
    for name, weight in loras:
        h.update(f"|lora:{name}@{weight}".encode())
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


def _resolve_loras(spec: str | None) -> tuple[list[tuple[str, float]], str, str]:
    """Resolve --lora spec into (lora_stack, trigger_prefix, out_suffix).

    `spec` is either None (no LoRAs), a single registry key ("cottagecore"),
    or comma-separated keys ("cottagecore,classipeint"). Each key may carry
    an explicit weight via "@N.NN" (e.g. "cottagecore@0.6").

    The trigger prefix is the concatenation of registry trigger strings in
    stack order; callers prepend it to the per-tile content prompt.
    The out_suffix is appended to filenames so LoRA outputs don't clobber
    base outputs.
    """
    if not spec:
        return [], "", ""
    keys = []
    for raw in spec.split(","):
        key, _, weight_s = raw.strip().partition("@")
        if key not in LORA_REGISTRY:
            raise SystemExit(
                f"unknown --lora key '{key}'. known: {sorted(LORA_REGISTRY)}"
            )
        filename, default_w, trigger = LORA_REGISTRY[key]
        weight = float(weight_s) if weight_s else default_w
        keys.append((key, filename, weight, trigger))
    stack = [(filename, weight) for _, filename, weight, _ in keys]
    triggers = "".join(trigger for _, _, _, trigger in keys)
    suffix = "--" + "_".join(f"{k}@{w}" for k, _, w, _ in keys)
    return stack, triggers, suffix


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="layer[,terrain] filter, e.g. 'far,prairie'", default=None)
    parser.add_argument("--regen", action="store_true", help="force regenerate even if manifest matches")
    parser.add_argument(
        "--lora",
        default=None,
        help=(
            "Stack one or more registered LoRAs. Comma-separated, "
            "optional @weight, e.g. --lora cottagecore or --lora cottagecore@0.6,classipeint@0.5. "
            "Output filenames get a suffix so they don't clobber base output. "
            f"Known: {sorted(LORA_REGISTRY)}"
        ),
    )
    args = parser.parse_args()

    if not ping():
        raise SystemExit("ComfyUI not reachable at http://127.0.0.1:8188 — start it first")

    lora_stack, lora_triggers, lora_suffix = _resolve_loras(args.lora)
    if lora_stack:
        print(f"LoRA stack: {lora_stack}  (triggers prepended: {lora_triggers!r})\n")

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    manifest = _load_manifest()
    selection = _filter(args, PROMPTS)
    print(f"Generating {len(selection)} tile(s) of {len(PROMPTS)} total\n")

    for i, p in enumerate(selection, 1):
        sig = _signature(p, lora_stack)
        # When LoRAs are stacked, write to a sibling filename so the base
        # output (no LoRA) remains intact for A/B comparison.
        out_filename = (
            p.filename.replace(".webp", f"{lora_suffix}.webp")
            if lora_suffix
            else p.filename
        )
        out_path = STATIC_DIR / out_filename
        if not args.regen and manifest.get(out_filename) == sig and out_path.exists():
            print(f"[{i}/{len(selection)}] {out_filename}  -- up to date, skip")
            continue

        print(f"[{i}/{len(selection)}] {out_filename}  ({p.width}x{p.height}, seed={p.seed})", flush=True)
        t0 = time.monotonic()
        raw_path = RAW_DIR / f"{p.layer}-{p.terrain}{lora_suffix}.png"
        # Backdrops generate seamlessly on the X axis so adjacent tile copies
        # in BackdropPainting have invisible seams. Ground tiles stay non-seamless.
        generate_to(
            raw_path,
            f"{lora_triggers}{p.full_prompt}",
            NEGATIVE_PROMPT,
            p.width,
            p.height,
            p.seed,
            seamless=(p.layer == "backdrop"),
            loras=lora_stack or None,
        )

        # Both layers are opaque now: the backdrop is a full painted scene
        # (sky baked in), the ground is a trail surface. rembg's alpha pass
        # was useful when we had silhouette-band fragments, but the new
        # architecture treats each tile as a complete image.
        copy_opaque_to_webp(raw_path, out_path)
        manifest_key = out_filename

        # NOTE: seam.py post-process was tested but disabled here — every
        # variant (narrow feather, wide feather, offset+gauss-blur) made
        # the visible artifact WORSE than the raw seamless output (created
        # hazy washed bands or blurry strips inside the painting). The
        # fundamental issue is that painting edges show different content
        # (sky vs tree, mesa vs sand) so no purely-pixel post-process makes
        # them appear continuous. Real fixes are out-of-scope for this
        # commit: train a tileable LoRA, prompt explicitly for matching
        # edges, or accept the residual line at scrolling speed.
        # if p.layer == "backdrop":
        #     blend_horizontal_seam(out_path, out_path)

        elapsed = time.monotonic() - t0
        manifest[manifest_key] = sig
        _save_manifest(manifest)
        print(f"   -> {out_path.relative_to(THIS_DIR.parent.parent)}  ({elapsed:.1f}s)\n")

    print("done.")


if __name__ == "__main__":
    main()
