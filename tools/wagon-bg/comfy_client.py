"""Minimal ComfyUI HTTP client for the wagon-bg pipeline.

Builds a stock SDXL t2i workflow, submits it, polls until done,
returns the absolute path of the produced image.
"""

import json
import shutil
import time
import urllib.request
from pathlib import Path

API = "http://127.0.0.1:8188"
COMFY_OUTPUT_DIR = Path.home() / "ComfyUI" / "output"
CHECKPOINT = "sd_xl_base_1.0.safetensors"


def _build_workflow(
    prompt: str,
    negative: str,
    width: int,
    height: int,
    seed: int,
    filename_prefix: str,
    *,
    seamless: bool = False,
    loras: list[tuple[str, float]] | None = None,
) -> dict:
    """Build a t2i workflow. When `seamless=True`, inserts the
    `SeamlessTile` node (x_only — tiles horizontally, not vertically) and
    the `CircularVAEDecode` node, both from the `ComfyUI-seamless-tiling`
    custom node pack. The result is an image whose right edge matches
    its left edge so tiled copies in BackdropPainting have no visible seam.

    `loras` is an optional list of `(filename, weight)` tuples. Each entry
    becomes a chained LoraLoader applied at the same weight to UNet and CLIP.
    Stack order = list order; SeamlessTile sits downstream of all LoRAs.
    Trigger words must be appended to `prompt` by the caller.
    """
    # Track the "current" model + clip refs as we add nodes. Starts at
    # the checkpoint loader; advances through each LoraLoader.
    model_ref: list = ["4", 0]
    clip_ref: list = ["4", 1]
    workflow: dict = {
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
    }

    # LoraLoaders chain at ids 20, 21, 22... so they don't collide with
    # the fixed-numbered nodes (3-11) below.
    for i, (lora_name, weight) in enumerate(loras or []):
        node_id = str(20 + i)
        workflow[node_id] = {
            "class_type": "LoraLoader",
            "inputs": {
                "lora_name": lora_name,
                "strength_model": weight,
                "strength_clip": weight,
                "model": model_ref,
                "clip": clip_ref,
            },
        }
        model_ref = [node_id, 0]
        clip_ref = [node_id, 1]

    if seamless:
        # Patches the (LoRA-modified) UNet's conv padding to circular on X
        # axis only. CircularVAEDecode replaces the standard VAEDecode.
        workflow["10"] = {
            "class_type": "SeamlessTile",
            "inputs": {
                "model": model_ref,
                "tiling": "x_only",
                "copy_model": "Make a copy",
            },
        }
        ksampler_model = ["10", 0]
        decode_node: dict = {
            "class_type": "CircularVAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2], "tiling": "x_only"},
        }
    else:
        ksampler_model = model_ref
        decode_node = {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
        }

    workflow.update({
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": 28,
                "cfg": 7.0,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1.0,
                "model": ksampler_model,
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0],
            },
        },
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": clip_ref}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": clip_ref}},
        "8": decode_node,
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": filename_prefix}},
    })
    return workflow


def ping() -> bool:
    """Return True if ComfyUI's HTTP API responds."""
    try:
        with urllib.request.urlopen(f"{API}/", timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def _post(workflow: dict) -> str:
    payload = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(
        f"{API}/prompt", data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["prompt_id"]


def _wait(prompt_id: str, timeout: float = 180.0) -> dict:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        with urllib.request.urlopen(f"{API}/history/{prompt_id}") as r:
            h = json.loads(r.read())
        if prompt_id in h and h[prompt_id].get("status", {}).get("completed"):
            return h[prompt_id]
        time.sleep(1)
    raise TimeoutError(f"prompt {prompt_id} did not complete in {timeout}s")


def generate_to(
    out_path: Path,
    prompt: str,
    negative: str,
    width: int,
    height: int,
    seed: int,
    *,
    seamless: bool = False,
    loras: list[tuple[str, float]] | None = None,
) -> None:
    """Generate one image and copy ComfyUI's output PNG to `out_path`.

    `out_path` is the final destination (e.g. a path under tools/wagon-bg/raw/).
    The intermediate file in ~/ComfyUI/output/ stays in place; we copy out.
    Pass `seamless=True` for x-axis-tileable output (used for backdrop tiles).
    Pass `loras=[(filename, weight), ...]` to stack one or more LoRAs.
    """
    prefix = f"wagon-bg-{out_path.stem}"
    workflow = _build_workflow(
        prompt, negative, width, height, seed, prefix, seamless=seamless, loras=loras,
    )
    submit_t = time.time()
    pid = _post(workflow)
    history = _wait(pid)

    # Find the produced filename — there's exactly one image in node 9's outputs.
    images = []
    for _, out in history.get("outputs", {}).items():
        images.extend(out.get("images", []))

    if images:
        src = COMFY_OUTPUT_DIR / images[0]["filename"]
    else:
        # Cached-SaveImage fallback: when ComfyUI's per-node hash cache hits
        # on every node (e.g., the same workflow was queued and ran in a
        # prior killed session), `outputs` is empty even though the file
        # already exists on disk. Find it by scanning the output dir for
        # files matching the prefix that are at least as new as our submit.
        candidates = sorted(
            (p for p in COMFY_OUTPUT_DIR.glob(f"{prefix}_*.png") if p.stat().st_mtime + 5 >= submit_t),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if not candidates:
            # Last resort: take the newest file matching prefix regardless
            # of mtime (the workflow may have been cached from a prior run
            # whose output is still on disk and content-equivalent).
            candidates = sorted(
                COMFY_OUTPUT_DIR.glob(f"{prefix}_*.png"),
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )
        if not candidates:
            raise RuntimeError(f"prompt {pid} produced no images and no fallback file matched prefix {prefix!r}")
        src = candidates[0]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, out_path)


if __name__ == "__main__":
    # Smoke check: ComfyUI is reachable.
    if not ping():
        raise SystemExit("ComfyUI not reachable at " + API)
    print("OK: ComfyUI reachable")
