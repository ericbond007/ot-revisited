"""Render a YOKED PAIR of oxen walking — period-correct ox yoke + bows.

The ox-walk.glb model is a single ox; emigrants drove pairs (sometimes
multiple yoked pairs in tandem). A wooden YOKE BEAM rides over the necks
of the two oxen with two U-shaped wooden BOWS looping under each neck
and up through holes in the beam — that's how the team is hitched
together and to the wagon's tongue.

This script:
  1. Imports two copies of ox-walk.glb side-by-side along the X axis.
  2. Constructs a yoke beam (cylinder, oriented along X) at neck height.
  3. Constructs two U-shaped bows (curve with bevel = tube) around each
     ox's neck.
  4. Plays the model's built-in walk action.
  5. Renders N frames evenly across the cycle.

Usage:
    blender -b -P render_ox_team.py -- <ox.glb> <output_dir> <basename> [width] [height] [frame_count] [pair_offset]

Tunables (env vars):
    PAIR_OFFSET   — center-to-center side spacing of the two oxen (m).
    NECK_Y        — Y position of yoke along the ox's length axis.
    NECK_Z        — Z height of yoke above ground.
    BOW_RADIUS    — radius of the U-bow tubes (m).
    BEAM_RADIUS   — radius of the yoke beam (m).
"""

import bpy
import os
import sys
from mathutils import Vector
from math import radians, pi, cos, sin


def make_yoke_beam(center: Vector, length: float, radius: float) -> bpy.types.Object:
    """Wooden yoke beam: cylinder along X axis, slight bulge in middle."""
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius,
        depth=length,
        location=(center.x, center.y, center.z),
    )
    beam = bpy.context.active_object
    beam.name = "YokeBeam"
    # Cylinder default points along Z; rotate so its axis is along X.
    beam.rotation_euler = (0, radians(90), 0)
    # Material: dark stained wood
    mat = bpy.data.materials.new(name="YokeWood")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is not None:
        bsdf.inputs["Base Color"].default_value = (0.20, 0.13, 0.07, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.85
    beam.data.materials.append(mat)
    return beam


def make_bow(center: Vector, width: float, height: float, radius: float, name: str) -> bpy.types.Object:
    """U-shaped wooden bow: a bezier curve traced as a half-loop, with
    bevel for tube thickness. Width = bow span along X, height = bow
    drop below the beam, radius = tube radius."""
    crv = bpy.data.curves.new(name=name + "_curve", type='CURVE')
    crv.dimensions = '3D'
    crv.bevel_depth = radius
    crv.bevel_resolution = 6
    spline = crv.splines.new('BEZIER')
    # 7 control points trace a U: top-left → side-left → bottom-left →
    # bottom-mid → bottom-right → side-right → top-right
    pts = [
        (-width / 2, 0, 0),
        (-width / 2, 0, -height * 0.5),
        (-width / 2 * 0.85, 0, -height * 0.95),
        (0, 0, -height),
        (width / 2 * 0.85, 0, -height * 0.95),
        (width / 2, 0, -height * 0.5),
        (width / 2, 0, 0),
    ]
    spline.bezier_points.add(len(pts) - 1)
    for i, (x, y, z) in enumerate(pts):
        bp = spline.bezier_points[i]
        bp.co = (x, y, z)
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'

    obj = bpy.data.objects.new(name, crv)
    obj.location = center
    bpy.context.scene.collection.objects.link(obj)

    # Material: same as beam
    mat = bpy.data.materials.new(name=name + "_mat")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is not None:
        bsdf.inputs["Base Color"].default_value = (0.20, 0.13, 0.07, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.85
    obj.data.materials.append(mat)
    return obj


def import_ox(model_path: str, x_offset: float, label: str) -> tuple[list[bpy.types.Object], list[bpy.types.Object]]:
    """Import a fresh copy of the ox model, translate by x_offset on X.
    Returns (mesh_objs, all_objs) lists. Each call adds a new action to
    bpy.data.actions; the latest action drives the new copy.
    """
    pre_objs = set(bpy.context.scene.objects)
    pre_actions = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=model_path)
    new_objs = [o for o in bpy.context.scene.objects if o not in pre_objs]
    new_actions = [a for a in bpy.data.actions if a not in pre_actions]
    print(f"{label}: imported {len(new_objs)} objects, {len(new_actions)} new action(s)")

    # Translate the imported subtree along X. The mesh objects are
    # skinned to an Armature whose pose drives world-space mesh
    # deformation; translating root Empties alone is ignored by skinned
    # geometry. So: translate every Armature in the new objects set
    # (and rename everything for diagnostics).
    for obj in new_objs:
        if obj.type == 'ARMATURE':
            obj.location.x += x_offset
        elif obj.parent is None or obj.parent not in new_objs:
            # Translate root-level objects too (catches stray meshes
            # like the Icosphere helper that aren't parented to the
            # armature).
            obj.location.x += x_offset
        obj.name = f"{label}_{obj.name}"

    mesh_objs = [o for o in new_objs if o.type == 'MESH']
    return mesh_objs, new_objs


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(args) < 3:
        print("ERROR: pass <model_path> <output_dir> <basename> [width] [height] [frame_count] [pair_offset]")
        return
    model_path = args[0]
    output_dir = args[1]
    basename = args[2]
    width = int(args[3]) if len(args) > 3 else 1024
    height = int(args[4]) if len(args) > 4 else 1024
    frame_count = int(args[5]) if len(args) > 5 else 12
    pair_offset = float(args[6]) if len(args) > 6 else float(os.environ.get('PAIR_OFFSET', '1.6'))

    os.makedirs(output_dir, exist_ok=True)
    print(f"Loading: {model_path}")
    print(f"Output: {output_dir}/{basename}--NN.png  ({width}x{height}, {frame_count} frames)")
    print(f"Pair offset: {pair_offset:.2f}m (center-to-center)")

    # Clear default scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for cam in list(bpy.data.cameras):
        bpy.data.cameras.remove(cam)
    for light in list(bpy.data.lights):
        bpy.data.lights.remove(light)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)

    # Import two ox copies
    left_meshes, left_all = import_ox(model_path, -pair_offset / 2, "oxL")
    right_meshes, right_all = import_ox(model_path, +pair_offset / 2, "oxR")

    all_meshes = left_meshes + right_meshes


    # Compute bounds across both oxen
    all_corners: list[Vector] = []
    for obj in all_meshes:
        for corner in obj.bound_box:
            all_corners.append(obj.matrix_world @ Vector(corner))
    min_v = Vector((min(v.x for v in all_corners),
                    min(v.y for v in all_corners),
                    min(v.z for v in all_corners)))
    max_v = Vector((max(v.x for v in all_corners),
                    max(v.y for v in all_corners),
                    max(v.z for v in all_corners)))
    extent = max_v - min_v
    print(f"Pair bounds: extent {extent.x:.2f} x {extent.y:.2f} x {extent.z:.2f}")

    # Yoke geometry: place at front of body. For this Hungarian-Grey
    # ox model (ox-walk.glb), the HEAD is at the min-Y end (the side-on
    # render shows head on image-left = world -Y). Neck just behind the
    # horns = ~22% from the front, so 22% of the way from min_v.y to
    # max_v.y. NECK_Z at ~74% of height puts it near the top of the
    # neck (just below the horn base).
    neck_y = float(os.environ.get('NECK_Y', str(min_v.y + extent.y * 0.22)))
    neck_z = float(os.environ.get('NECK_Z', str(min_v.z + extent.z * 0.74)))
    beam_radius = float(os.environ.get('BEAM_RADIUS', '0.05'))
    bow_radius = float(os.environ.get('BOW_RADIUS', '0.025'))
    beam_length = pair_offset + 0.6  # spans both oxen with overhang
    beam_center = Vector((0, neck_y, neck_z))

    print(f"Yoke beam at ({beam_center.x:.2f}, {beam_center.y:.2f}, {beam_center.z:.2f}), length {beam_length:.2f}, r={beam_radius:.3f}")
    make_yoke_beam(beam_center, beam_length, beam_radius)

    # Bows: one per ox, U-shaped, hanging from beam down around neck.
    bow_width = 0.32  # bow opening (horizontal at top)
    bow_height = 0.55  # depth of U
    for x_offset, name in [(-pair_offset / 2, "BowL"), (pair_offset / 2, "BowR")]:
        bow_center = Vector((x_offset, neck_y, neck_z))
        make_bow(bow_center, bow_width, bow_height, bow_radius, name)

    # --- Determine animation frame range ---
    actions = list(bpy.data.actions)
    if not actions:
        raise SystemExit("No animation actions found in model.")
    # Both ox copies share the action namespace; just pick the first.
    action = actions[0]
    frame_start = int(action.frame_range[0])
    frame_end = int(action.frame_range[1])
    print(f"Action: {action.name}  frames {frame_start}..{frame_end}")

    # --- Camera: side-on, length axis is Y for this model ---
    cam_data = bpy.data.cameras.new(name='SideCam')
    cam_data.type = 'ORTHO'
    cam_data.clip_start = 0.1
    cam_data.clip_end = 1_000_000

    center = (min_v + max_v) * 0.5
    length_along_x = extent.x >= extent.y
    length_extent = extent.x if length_along_x else extent.y
    target_aspect = width / height
    model_aspect = length_extent / extent.z
    if model_aspect >= target_aspect:
        cam_data.ortho_scale = length_extent * 1.10
    else:
        cam_data.ortho_scale = extent.z * target_aspect * 1.10

    cam = bpy.data.objects.new('SideCam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    cam_distance = max(extent) * 3.0
    flip = os.environ.get('FLIP_VIEW', '0') == '1'
    sign = -1 if flip else 1
    if length_along_x:
        cam.location = (center.x, center.y + cam_distance * sign, center.z)
    else:
        cam.location = (center.x + cam_distance * sign, center.y, center.z)
    direction = center - Vector(cam.location)
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

    # Lighting (3-point, same as wagon renders)
    for name, energy, color, loc, rot in [
        ('Key',  4.0, (1.0, 0.96, 0.86),
         (center.x + extent.x, center.y - extent.y * 0.3, center.z + extent.z * 1.5),
         (radians(45), 0, radians(45))),
        ('Fill', 1.5, (0.84, 0.92, 1.0),
         (center.x + extent.x, center.y + extent.y * 0.3, center.z),
         (radians(75), 0, radians(135))),
        ('Rim',  2.0, (1.0, 1.0, 0.95),
         (center.x - extent.x, center.y, center.z + extent.z * 1.2),
         (radians(135), 0, radians(-90))),
    ]:
        ldata = bpy.data.lights.new(name=name, type='SUN')
        ldata.energy = energy
        ldata.color = color
        ldata.angle = radians(20)
        l = bpy.data.objects.new(name, ldata)
        bpy.context.scene.collection.objects.link(l)
        l.location = loc
        l.rotation_euler = rot

    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg is not None:
        bg.inputs['Color'].default_value = (0.96, 0.93, 0.85, 1.0)
        bg.inputs['Strength'].default_value = 0.4

    # Render settings
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'

    # Cycles + GPU
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for backend in ('OPTIX', 'CUDA', 'NONE'):
        try:
            prefs.compute_device_type = backend
            prefs.refresh_devices()
            gpu_devices = [d for d in prefs.devices if d.type in ('OPTIX', 'CUDA')]
            if gpu_devices:
                for dev in gpu_devices:
                    dev.use = True
                break
        except Exception:
            continue
    scene.cycles.device = 'GPU'
    scene.cycles.samples = int(os.environ.get('CYCLES_SAMPLES', '64'))
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPTIX'

    # Sample N frames evenly across the action's range
    frame_span = frame_end - frame_start
    for i in range(frame_count):
        frame_n = frame_start + int(round(frame_span * i / frame_count))
        scene.frame_set(frame_n)
        out_path = os.path.join(output_dir, f"{basename}--{i:02d}.png")
        scene.render.filepath = out_path
        bpy.ops.render.render(write_still=True)
        print(f"  frame {i:02d} (action frame {frame_n}) → {out_path}")

    print(f"\nWrote {frame_count} ox-team frames to {output_dir}/")


if __name__ == "__main__":
    main()
