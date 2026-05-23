"""Loose-separate the wagon's wheel-material mesh into N parts, classify
each by position/extent heuristics, and emit a JSON manifest mapping
each part (by centroid) to a label: wheel_FL / wheel_FR / wheel_RL /
wheel_RR / chassis / tongue / brake.

This is the "label once, then trust the labels" approach. Heuristics
can be hand-tuned by editing the JSON output before re-running.

Usage:
    blender -b -P label_wagon_parts.py -- <model.glb> <wheel-material-name> <output.json>

Example:
    blender -b -P label_wagon_parts.py -- \\
      tools/blender/models/covered-wagon.glb 1011 \\
      tools/blender/models/covered-wagon-labels.json

Labels emitted (one of):
  wheel_FL / wheel_FR / wheel_RL / wheel_RR  — actual wheel parts (rim, spokes, hub)
  chassis                                     — axle bars between wheels
  brake                                       — brake bars/posts (tall in Z)
  hub_attachment                              — small parts at the hub center (axle stubs)
  unknown                                     — falls through to no-rotate, visible

Manifest schema:
{
  "hubs": {"FL": [x,y,z], ...},
  "wheel_radius": 0.55,
  "parts": [
    {"centroid": [x,y,z], "axial_extent": 0.04, "z_extent": 0.32,
     "label": "wheel_FL", "name": "csti_krom_krom_0_42"},
    ...
  ]
}
"""

import bpy
import sys
import os
import json
from mathutils import Vector

# Wheel centers (from ground-contact analysis of covered-wagon)
DEFAULT_HUBS = {
    'FL': (-1.121, -0.774, 0.49),
    'FR': (-1.123, 0.774, 0.49),
    'RL': (1.009, -0.779, 0.573),
    'RR': (1.010, 0.779, 0.573),
}


def main() -> None:
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if len(args) < 3:
        print("usage: label_wagon_parts.py -- <model.glb> <wheel-material-name> <output.json>")
        return
    glb = args[0]
    wheel_material = args[1]
    out_json = args[2]

    # Clear scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=glb)

    # Find the wheel-material mesh + apply transforms so loose-separate is clean
    wheel_mesh = next(
        (o for o in bpy.context.scene.objects
         if o.type == 'MESH'
         and any(m and m.name == wheel_material for m in o.data.materials)),
        None,
    )
    if not wheel_mesh:
        raise SystemExit(f"No mesh with material {wheel_material!r}")
    bpy.ops.object.select_all(action='DESELECT')
    wheel_mesh.select_set(True)
    bpy.context.view_layer.objects.active = wheel_mesh
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Hide IK helpers etc
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and o.name.startswith(('Icosphere', 'Sphere.', 'IK_')):
            o.hide_render = True

    # Loose-separate
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.separate(type='LOOSE')
    bpy.ops.object.mode_set(mode='OBJECT')

    parts = [o for o in bpy.context.scene.objects
             if o.type == 'MESH'
             and any(m and m.name == wheel_material for m in o.data.materials)]
    print(f"Loose-separated into {len(parts)} parts")

    hubs = {k: Vector(v) for k, v in DEFAULT_HUBS.items()}
    rim_radius = float(os.environ.get('RIM_RADIUS', '0.65'))
    axial_thin_max = float(os.environ.get('AXIAL_THIN_MAX', '0.20'))
    z_tall_threshold = float(os.environ.get('Z_TALL_THRESHOLD', '0.7'))
    axial_bar_min = float(os.environ.get('AXIAL_BAR_MIN', '0.5'))
    hub_attachment_radius = float(os.environ.get('HUB_ATTACHMENT_RADIUS', '0.15'))

    def part_geom(p):
        corners = [p.matrix_world @ Vector(c) for c in p.bound_box]
        cx = sum(c.x for c in corners) / 8
        cy = sum(c.y for c in corners) / 8
        cz = sum(c.z for c in corners) / 8
        x_ext = max(c.x for c in corners) - min(c.x for c in corners)
        y_ext = max(c.y for c in corners) - min(c.y for c in corners)
        z_ext = max(c.z for c in corners) - min(c.z for c in corners)
        return Vector((cx, cy, cz)), x_ext, y_ext, z_ext

    manifest = {
        "hubs": {k: list(v) for k, v in hubs.items()},
        "wheel_radius": rim_radius,
        "wheel_material": wheel_material,
        "parts": [],
    }
    label_counts = {}

    for p in parts:
        c, x_ext, y_ext, z_ext = part_geom(p)
        # Classification — apply rules in order, first match wins
        label = None

        # Distance to nearest hub (in-plane and full 3D) — used by
        # multiple rules.
        dists = {k: (c - h).length for k, h in hubs.items()}
        nearest = min(dists, key=lambda k: dists[k])
        nh = hubs[nearest]
        axial_offset = abs(c.y - nh.y)
        in_plane_d = ((c.x - nh.x) ** 2 + (c.z - nh.z) ** 2) ** 0.5

        # 1. Long axial extent (Y direction) → chassis bar between wheels
        if y_ext > axial_bar_min:
            label = "chassis"

        # 2. Tall Z AND large X extent + centroid near a hub → RIM. The
        #    full rim is one rotationally-symmetric mesh whose centroid
        #    sits at the hub center; bounding box spans the wheel
        #    diameter in BOTH x and z. A brake post has tall Z but
        #    narrow X.
        elif (z_ext > z_tall_threshold and x_ext > z_tall_threshold
              and axial_offset < axial_thin_max
              and in_plane_d < 0.2):
            label = f"wheel_{nearest}"

        # 3. Tall Z extent (without matching X extent) → brake post
        elif z_ext > z_tall_threshold:
            label = "brake"

        else:
            # 4. Otherwise: classify by nearest hub + position relative to hub
            near_d = dists[nearest]
            above_hub = c.z - nh.z

            if near_d > rim_radius + 0.3:
                label = "chassis"
            elif axial_offset > axial_thin_max:
                # Axially far from wheel plane → hub attachment (axle stub)
                # or bracket. Distinguish by Z position.
                if above_hub > 0.05 and in_plane_d < hub_attachment_radius:
                    label = "brake"
                else:
                    label = "hub_attachment"
            elif in_plane_d > rim_radius:
                label = "chassis"
            else:
                # Thin axially + within rim radius → it's a wheel part
                label = f"wheel_{nearest}"

        manifest["parts"].append({
            "name": p.name,
            "centroid": [round(c.x, 4), round(c.y, 4), round(c.z, 4)],
            "axial_extent": round(y_ext, 4),
            "z_extent": round(z_ext, 4),
            "label": label,
        })
        label_counts[label] = label_counts.get(label, 0) + 1

    print("Label counts:")
    for k, v in sorted(label_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {k}: {v}")

    os.makedirs(os.path.dirname(out_json) or ".", exist_ok=True)
    with open(out_json, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Wrote {out_json}")


if __name__ == "__main__":
    main()
