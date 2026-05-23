#!/bin/bash
# Renders all yoke-related sprite sets AND the wagon body+wheel cycle
# with the dialed-in parameters.
# Run from project root: ./tools/blender/render-yoke-set.sh
#
# Sources: tools/blender/models/ox-walk.glb (Hungarian Grey Ox + harness)
#          tools/blender/models/covered-wagon.glb (prairie-schooner-style wagon)
# Outputs: static/wagon-bg/wagon-blender/{...}/
set -euo pipefail
cd "$(dirname "$0")/../.."

# Common harness-cleanup flags. csti_krom.001 = the 4 metal rings.
# csti_krom_krom = the long iron chain. csati_* = leather straps.
# krom_krom_0 = small chest-level chain pieces.
HARNESS_HIDE="csati_bor,csati_huzo,csti_krom_krom,csti_krom.001,krom_krom_0"

# Yoke-shape adjustments dialed in 2026-05-07
YOKE_FLAGS=(
  YOKE_Y_SCALE=1.25         # Widen yoke geometry along body axis (10° turn)
  UV_COMP_BOOST=2.0         # Compensate UVs 2× the geom scale to keep grain proportional
  YOKE_BOW_STRETCH=1.2      # Stretch bow wood downward (z<1.7) so bows wrap UNDER neck
  YOKE_PEG_SCALE=2.0        # Enlarge outer pegs at the arch ends
  YOKE_PEG_PIVOT_Z=1.7
  YOKE_PEG_OUTER_X=0.7      # Only OUTER pegs (|X|>0.7), not the inner tall bars
  FAKERET_KILL_RINGS=1.5    # Delete small fakeret ring-islands at z<1.5
)

# 1. Bare ox body (no harness) — used as per-pair sprite base
HIDE_HARNESS=1 \
blender -b -P tools/blender/render_animation.py -- \
  tools/blender/models/ox-walk.glb \
  static/wagon-bg/wagon-blender/ox-walk-only-frames \
  ox 1024 1024 12

# 2. Yoke alone — for visual reference in the wagon-bg gallery
"${YOKE_FLAGS[@]}" KEEP_ONLY="fakeret,torus" \
blender -b -P tools/blender/render_animation.py -- \
  tools/blender/models/ox-walk.glb \
  static/wagon-bg/wagon-blender/ox-yoke-only-frames \
  yoke 1024 1024 12

# 3. Single ox + yoke (no rope/beam) — side profile, for OxTeam per-pair sprite
"${YOKE_FLAGS[@]}" HIDE_NAMES="${HARNESS_HIDE}" \
blender -b -P tools/blender/render_animation.py -- \
  tools/blender/models/ox-walk.glb \
  static/wagon-bg/wagon-blender/ox-yoke-wide-frames \
  yoke-wide 1024 1024 12

# 4. Yoked pair at -30° 3/4 view — showcase
OX_PAIR=1 OX_PAIR_OFFSET=1.6 CAMERA_3Q_DEG=-30 \
"${YOKE_FLAGS[@]}" HIDE_NAMES="${HARNESS_HIDE}" \
blender -b -P tools/blender/render_animation.py -- \
  tools/blender/models/ox-walk.glb \
  static/wagon-bg/wagon-blender/ox-pair-yoke-frames \
  pair-yoke 1024 1024 12

# 5. Wagon body (no wheels) — covered-wagon.glb, tongue tilted up at axle
TONGUE_LIFT_DEG=20 TONGUE_LIFT_AXIS=x TONGUE_PIVOT_X=-1.7 TONGUE_PIVOT_Z=1.0 TONGUE_PIVOT_SIGN=-1 \
HIDE_MATERIAL=1011 FLIP_VIEW=1 \
blender -b -P tools/blender/render_wagon.py -- \
  tools/blender/models/covered-wagon.glb \
  static/wagon-bg/wagon-blender/prairie-schooner-body--nowheels.png \
  1536 817

# 6. Wheel cycle — driven by explicit per-part labels from
# tools/blender/label_wagon_parts.py (see covered-wagon-labels.json).
# Manifest lookup bypasses the heuristic classifier (axial-tol,
# hide-brake-hardware, axle-bar-extent) entirely. Regenerate the
# manifest if the model geometry changes:
#   blender -b -P tools/blender/label_wagon_parts.py -- \
#     tools/blender/models/covered-wagon.glb 1011 \
#     tools/blender/models/covered-wagon-labels.json
# 24 frames × 15°/frame = full 360° rotation. The wheel returns to its
# EXACT starting orientation at frame 24 (= loop point), so wraparound
# is mathematically lossless — no reliance on spoke symmetry. 30° and
# 60° partial cycles relied on 12-fold symmetry that the hub's bolt
# pattern doesn't actually have, producing a visible loop snap.
FLIP_VIEW=1 DIRECT_VERT_ROT=1 \
LABEL_MANIFEST=tools/blender/models/covered-wagon-labels.json \
WHEEL_CYCLE_FRACTION=-1.0 \
blender -b -P tools/blender/render_wheels.py -- \
  tools/blender/models/covered-wagon.glb \
  static/wagon-bg/wagon-blender/prairie-schooner-wheels-frames \
  wheel 1536 817 24 1011

# Body + wheel frames must crop to a SHARED union bbox so SVG composites
# at identical pixel coordinates.
python3 - <<'PY'
from PIL import Image
import glob
paths = ['static/wagon-bg/wagon-blender/prairie-schooner-body--nowheels.png'] + sorted(glob.glob('static/wagon-bg/wagon-blender/prairie-schooner-wheels-frames/wheel--*.png'))
bb = None
for p in paths:
    b = Image.open(p).getbbox()
    if b: bb = b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
print(f'wagon body+wheels union bbox: {bb}')
for p in paths: Image.open(p).crop(bb).save(p)
PY

# Crop each ox-yoke set to its own union bbox so SVG composites at correct scale.
python3 - <<'PY'
from PIL import Image
import glob
SETS = [
    ('ox-walk-only-frames', 'ox'),
    ('ox-yoke-only-frames', 'yoke'),
    ('ox-yoke-wide-frames', 'yoke-wide'),
    ('ox-pair-yoke-frames', 'pair-yoke'),
]
for d, base in SETS:
    paths = sorted(glob.glob(f'static/wagon-bg/wagon-blender/{d}/{base}--*.png'))
    if not paths: continue
    bb = None
    for p in paths:
        b = Image.open(p).getbbox()
        if b: bb = b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
    if not bb: continue
    for p in paths: Image.open(p).crop(bb).save(p)
    print(f'{d}: {bb[2]-bb[0]}x{bb[3]-bb[1]} (aspect {(bb[2]-bb[0])/(bb[3]-bb[1]):.2f})')
PY
