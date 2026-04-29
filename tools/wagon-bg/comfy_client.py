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
) -> dict:
    """Build a t2i workflow. When `seamless=True`, inserts the
    `SeamlessTile` node (x_only — tiles horizontally, not vertically) and
    the `CircularVAEDecode` node, both from the `ComfyUI-seamless-tiling`
    custom node pack. The result is an image whose right edge matches
    its left edge so tiled copies in BackdropPainting have no visible seam.
    """
    if seamless:
        # Node 10 patches the SDXL UNet's conv padding to circular on X axis
        # only. Node 11 replaces the standard VAEDecode with a circular one.
        ksampler_model = ["10", 0]
        decode_node: dict = {
            "class_type": "CircularVAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2], "tiling": "x_only"},
        }
    else:
        ksampler_model = ["4", 0]
        decode_node = {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
        }

    workflow: dict = {
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
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["4", 1]}},
        "8": decode_node,
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": filename_prefix}},
    }
    if seamless:
        workflow["10"] = {
            "class_type": "SeamlessTile",
            "inputs": {
                "model": ["4", 0],
                "tiling": "x_only",
                "copy_model": "Make a copy",
            },
        }
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
) -> None:
    """Generate one image and copy ComfyUI's output PNG to `out_path`.

    `out_path` is the final destination (e.g. a path under tools/wagon-bg/raw/).
    The intermediate file in ~/ComfyUI/output/ stays in place; we copy out.
    Pass `seamless=True` for x-axis-tileable output (used for backdrop tiles).
    """
    prefix = f"wagon-bg-{out_path.stem}"
    workflow = _build_workflow(prompt, negative, width, height, seed, prefix, seamless=seamless)
    pid = _post(workflow)
    history = _wait(pid)

    # Find the produced filename — there's exactly one image in node 9's outputs.
    images = []
    for _, out in history.get("outputs", {}).items():
        images.extend(out.get("images", []))
    if not images:
        raise RuntimeError(f"prompt {pid} produced no images")
    src = COMFY_OUTPUT_DIR / images[0]["filename"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, out_path)


if __name__ == "__main__":
    # Smoke check: ComfyUI is reachable.
    if not ping():
        raise SystemExit("ComfyUI not reachable at " + API)
    print("OK: ComfyUI reachable")
