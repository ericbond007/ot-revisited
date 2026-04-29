# wagon-bg asset pipeline

Generates the painterly raster parallax tiles consumed by `WagonScene.svelte`'s
terrain layers when run with `?raster=1`.

## Prereqs

1. ComfyUI running at `http://127.0.0.1:8188` with `sd_xl_base_1.0.safetensors`
   in `~/ComfyUI/models/checkpoints/`. (See the wagon-view spec for the
   feasibility-test setup.)
2. Python 3.11+. Create a venv and install deps:

   ```bash
   uv venv --python 3.11 .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

## Run

```bash
# Generate every missing or stale tile
python generate.py

# Regenerate one specific layer/terrain
python generate.py --only far,prairie

# Force full rebuild
python generate.py --regen
```

Outputs land in `../../static/wagon-bg/{layer}-{terrain}.webp`. The manifest
at `.manifest.json` tracks last-generated seed and prompt hash so a subsequent
run only regenerates what changed.

## Iteration

Edit `prompts.py` for the tile you want to change, rerun `python generate.py`
— only the changed entry regenerates.
