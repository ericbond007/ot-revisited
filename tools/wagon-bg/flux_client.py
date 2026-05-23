"""Minimal FLUX.1-dev (FP8) HTTP client for the wagon-bg pipeline.

Parallel to comfy_client.py (which uses SDXL). FLUX produces meaningfully
better detail + composition for the wagon-asset workload, especially for
"side view of X" and "macro texture" prompts that SDXL kept botching.

Workflow:
  UNETLoader (flux1-dev-fp8) → UNET
  DualCLIPLoader (t5xxl + clip_l, type=flux) → CLIP
  VAELoader (ae.safetensors) → VAE
  CLIPTextEncode (positive only — FLUX doesn't use a negative; cfg=1) → POS
  FluxGuidance(POS, guidance=3.5) → POS with guidance baked in
  EmptySD3LatentImage(w,h,1) → LATENT
  KSampler(model=UNET, positive=POS, negative=POS, cfg=1.0, steps=20,
          sampler=euler, scheduler=simple, latent=LATENT) → SAMPLED
  VAEDecode(SAMPLED, VAE) → IMAGE
  SaveImage(IMAGE, prefix)

VRAM footprint on 8GB: tight. Comfy's auto-offload + FP8 quant fits
flux1-dev with ~1-2 GB headroom. May need to kill ComfyUI between
runs if the GPU gets fragmented; restart picks up cleanly.
"""

import json
import shutil
import time
import urllib.request
from pathlib import Path

API = "http://127.0.0.1:8188"
COMFY_OUTPUT_DIR = Path.home() / "ComfyUI" / "output"

UNET_NAME = "flux1-dev-fp8.safetensors"
CLIP_T5_NAME = "t5xxl_fp8_e4m3fn.safetensors"
CLIP_L_NAME = "clip_l.safetensors"
VAE_NAME = "ae.safetensors"


def _build_workflow(
    prompt: str,
    width: int,
    height: int,
    seed: int,
    filename_prefix: str,
    *,
    steps: int = 20,
    guidance: float = 3.5,
) -> dict:
    """Build a FLUX dev t2i workflow.

    `guidance` is FLUX's own internal conditioning scale — not CFG. Default
    3.5 is the model's own recommended baseline. Higher values (4-6) push
    composition fidelity at the cost of slight oversaturation.
    """
    return {
        # UNET (the FLUX transformer)
        "1": {
            "class_type": "UNETLoader",
            "inputs": {"unet_name": UNET_NAME, "weight_dtype": "fp8_e4m3fn"},
        },
        # CLIP — DualCLIPLoader for FLUX (t5xxl + clip_l)
        "2": {
            "class_type": "DualCLIPLoader",
            "inputs": {
                "clip_name1": CLIP_T5_NAME,
                "clip_name2": CLIP_L_NAME,
                "type": "flux",
            },
        },
        # VAE
        "3": {
            "class_type": "VAELoader",
            "inputs": {"vae_name": VAE_NAME},
        },
        # Positive text encoding
        "4": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": prompt, "clip": ["2", 0]},
        },
        # FLUX guidance node — bakes guidance into the conditioning
        "5": {
            "class_type": "FluxGuidance",
            "inputs": {"conditioning": ["4", 0], "guidance": guidance},
        },
        # Empty latent (FLUX uses SD3-style latent)
        "6": {
            "class_type": "EmptySD3LatentImage",
            "inputs": {"width": width, "height": height, "batch_size": 1},
        },
        # KSampler — cfg=1 (FLUX doesn't use CFG; guidance is in the cond)
        "7": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": 1.0,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 1.0,
                "model": ["1", 0],
                "positive": ["5", 0],
                "negative": ["5", 0],  # FLUX: same conditioning for both
                "latent_image": ["6", 0],
            },
        },
        # VAEDecode
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["7", 0], "vae": ["3", 0]},
        },
        # SaveImage
        "9": {
            "class_type": "SaveImage",
            "inputs": {"images": ["8", 0], "filename_prefix": filename_prefix},
        },
    }


def ping() -> bool:
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


def _wait(prompt_id: str, timeout: float = 300.0) -> dict:
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
    width: int,
    height: int,
    seed: int,
    *,
    steps: int = 20,
    guidance: float = 3.5,
) -> None:
    """Generate one FLUX image and copy to `out_path`."""
    prefix = f"flux-{out_path.stem}"
    workflow = _build_workflow(
        prompt, width, height, seed, prefix, steps=steps, guidance=guidance,
    )
    submit_t = time.time()
    pid = _post(workflow)
    history = _wait(pid)

    images = []
    for _, out in history.get("outputs", {}).items():
        images.extend(out.get("images", []))

    if images:
        src = COMFY_OUTPUT_DIR / images[0]["filename"]
    else:
        # Cached-output fallback — same recovery as comfy_client.
        candidates = sorted(
            (p for p in COMFY_OUTPUT_DIR.glob(f"{prefix}_*.png") if p.stat().st_mtime + 5 >= submit_t),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if not candidates:
            candidates = sorted(
                COMFY_OUTPUT_DIR.glob(f"{prefix}_*.png"),
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )
        if not candidates:
            raise RuntimeError(f"prompt {pid} produced no images and no fallback for prefix {prefix!r}")
        src = candidates[0]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, out_path)


if __name__ == "__main__":
    import sys
    if not ping():
        raise SystemExit("ComfyUI not reachable at " + API)
    if len(sys.argv) > 1 and sys.argv[1] == "smoke":
        # Smoke test: generate one small image.
        out = Path(__file__).parent / "wagon-refs" / "flux-smoke.png"
        print(f"FLUX smoke test → {out}")
        generate_to(
            out,
            "painterly oil painting of a wood barrel, close-up texture detail",
            512, 512, seed=999,
        )
        print(f"OK: wrote {out} ({out.stat().st_size} bytes)")
    else:
        print(f"OK: ComfyUI reachable. Run `flux_client.py smoke` to test.")
