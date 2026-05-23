"""Combined ox + wagon + driver render — one Blender scene, single sprite
cycle so animation timing of legs / wheels / body bob / driver settle
all stay locked together.

This replaces the per-component composite (separate body + wheel +
ox-team + driver renders) for the dynamic in-sync parts. Static-state
addons (kegs, coop, milkcow, painted, damage stages) still composite
as SVG overlays on top.

Usage:
    blender -b -P render_wagon_train.py -- <output_dir> <basename> [width] [height] [frame_count]

Default: 1536x817, 12 frames. Models pulled from tools/blender/models/.

Env vars:
    OX_PAIRS=2     — number of yoked pairs (1 → 2 oxen, 2 → 4 oxen, 3 → 6 oxen)
    WAGON_MODEL    — 'prairie-schooner' (default), 'conestoga', 'covered-wagon'
    SINGLE_FRAME=1 — render one frame for composition checks (skip animation)
"""

import bpy
import os
import sys
from mathutils import Vector, Euler
from math import radians, pi

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pose_cowboy_seated as cowboy_pose


MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')


def clear_scene() -> None:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for d in (bpy.data.meshes, bpy.data.cameras, bpy.data.lights, bpy.data.actions):
        for item in list(d):
            d.remove(item)


def import_glb(path: str) -> list[bpy.types.Object]:
    """Import a GLB and return the new top-level objects."""
    pre = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    post = set(bpy.context.scene.objects)
    return list(post - pre)


def world_bbox(objs: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    """World-space bbox of the given object collection (mesh objects only)."""
    corners: list[Vector] = []
    for obj in objs:
        if obj.type != 'MESH':
            continue
        for c in obj.bound_box:
            corners.append(obj.matrix_world @ Vector(c))
    if not corners:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    return (Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners))),
            Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners))))


def detach_action(arm) -> None:
    """Strip baked actions from a Mixamo armature so manual pose sticks.
    Mirrors the fix from pose_cowboy_seated."""
    if arm.animation_data is not None:
        arm.animation_data.action = None
        arm.animation_data_clear()


def place_wagon(model_name: str) -> tuple[bpy.types.Object | None, list[bpy.types.Object]]:
    """Import the wagon GLB, return (armature_or_None, all imported objs).
    Wagon is positioned at world origin, length along Y axis (so length
    runs left-right when camera is on the X axis)."""
    path = os.path.join(MODELS_DIR, f'{model_name}.glb')
    objs = import_glb(path)
    arms = [o for o in objs if o.type == 'ARMATURE']
    print(f"Wagon '{model_name}' imported: {len(objs)} objs ({len(arms)} armatures)")
    # Most wagon GLBs have length along their long axis already aligned
    # with Y; if a model needs rotation that goes here.
    return (arms[0] if arms else None), objs


def place_ox(
    pair_idx: int,
    near_or_far: int,
    forward_axis: str,
    forward_sign: int,
    pair_spacing: float,
    pair_offset: float,
    front_edge: float,
) -> list[bpy.types.Object]:
    """Import an ox and place it ahead of the wagon along its length axis.

    forward_axis: 'x' or 'y' — the wagon's length axis.
    forward_sign: +1 or -1 — which direction along that axis is "forward".
    front_edge: world coord (along forward_axis) of the wagon's front end —
                oxen are placed beyond this in the forward direction.
    """
    objs = import_glb(os.path.join(MODELS_DIR, 'ox-walk.glb'))
    arms = [o for o in objs if o.type == 'ARMATURE']
    root = arms[0] if arms else next((o for o in objs if o.type == 'MESH'), None)
    if root is None:
        return objs
    # The ox-walk.glb includes attached yoke + chain meshes (Hungarian-style
    # rig from Sketchfab source). Names like 'fakeret' (frame), 'csati'
    # (buckle), 'krom' (chain), 'Torus' (ring). For all but the
    # closest-to-wagon pair, hide those non-ox meshes so the team doesn't
    # show 4 redundant yokes.
    if pair_idx > 0:
        for o in objs:
            n = o.name.lower()
            if any(k in n for k in ('fakeret', 'csati', 'csti', 'krom', 'torus', 'icosphere')):
                o.hide_render = True

    forward_dist = (pair_idx + 1) * pair_spacing
    side_offset = (-pair_offset / 2) if near_or_far == 0 else (pair_offset / 2)
    if forward_axis == 'y':
        root.location = (side_offset, front_edge + forward_sign * forward_dist, 0)
    else:
        root.location = (front_edge + forward_sign * forward_dist, side_offset, 0)
    return objs


def place_driver(armature_target_pos: Vector) -> list[bpy.types.Object]:
    """Import + pose the cowboy and place on the wagon bench.

    Cowboy GLB imports at scale 1.0 with mesh ~7m tall. Realistic
    seated cowboy is ~1.0-1.2m crown-to-tailbone (so total figure
    standing ~1.75m). Apply scale 0.25 so the cowboy reads at human
    proportions next to a 1.5m-tall wagon.
    """
    objs = import_glb(os.path.join(MODELS_DIR, 'cowboy-driver.glb'))
    arm = next((o for o in objs if o.type == 'ARMATURE'), None)
    if arm is None:
        return objs
    detach_action(arm)
    cowboy_pose.apply_pose(arm)
    arm.scale = (0.25, 0.25, 0.25)
    arm.location = armature_target_pos
    return objs


def setup_camera_and_lights(
    scene_center: Vector,
    scene_extent: Vector,
    length_axis: str,
) -> None:
    """Place camera PERPENDICULAR to the length axis so we see a side
    profile of the wagon train. length_axis is 'x' or 'y'."""
    cam_data = bpy.data.cameras.new(name='SideCam')
    cam_data.type = 'ORTHO'
    cam_data.clip_start = 0.1
    cam_data.clip_end = 1_000_000
    length_extent = scene_extent.x if length_axis == 'x' else scene_extent.y
    cam_data.ortho_scale = max(length_extent, scene_extent.z) * 1.10
    cam = bpy.data.objects.new('SideCam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    cam_distance = max(scene_extent) * 3.0
    if length_axis == 'x':
        # Length runs along X, camera offset on +Y looking -Y
        cam.location = (scene_center.x, scene_center.y + cam_distance, scene_center.z)
    else:
        # Length runs along Y, camera offset on +X looking -X
        cam.location = (scene_center.x + cam_distance, scene_center.y, scene_center.z)
    direction = scene_center - Vector(cam.location)
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

    # 3-light setup (matches render_wagon.py)
    key = bpy.data.lights.new('Key', 'SUN'); key.energy = 4.0; key.angle = radians(20)
    key_obj = bpy.data.objects.new('Key', key); bpy.context.scene.collection.objects.link(key_obj)
    key_obj.location = (scene_center.x + scene_extent.x, scene_center.y - scene_extent.y * 0.3, scene_center.z + scene_extent.z * 1.5)
    key_obj.rotation_euler = (radians(45), 0, radians(45))

    fill = bpy.data.lights.new('Fill', 'SUN'); fill.energy = 1.5
    fill_obj = bpy.data.objects.new('Fill', fill); bpy.context.scene.collection.objects.link(fill_obj)
    fill_obj.location = (scene_center.x + scene_extent.x, scene_center.y + scene_extent.y * 0.3, scene_center.z)
    fill_obj.rotation_euler = (radians(75), 0, radians(135))

    # Cream world background for transparency-friendly composite
    world = bpy.context.scene.world or bpy.data.worlds.new('World')
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs['Color'].default_value = (0.96, 0.93, 0.85, 1.0)
        bg.inputs['Strength'].default_value = 0.4


def main() -> None:
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if len(args) < 2:
        print("usage: render_wagon_train.py -- <output_dir> <basename> [w] [h] [frames]")
        return
    out_dir = args[0]
    basename = args[1]
    width = int(args[2]) if len(args) > 2 else 1536
    height = int(args[3]) if len(args) > 3 else 817
    frames = int(args[4]) if len(args) > 4 else 12

    os.makedirs(out_dir, exist_ok=True)
    single_frame = os.environ.get('SINGLE_FRAME', '0') == '1'
    n_pairs = int(os.environ.get('OX_PAIRS', '2'))
    wagon_model = os.environ.get('WAGON_MODEL', 'prairie-schooner')

    clear_scene()

    # --- Wagon at origin ---
    wagon_arm, wagon_objs = place_wagon(wagon_model)
    wagon_min, wagon_max = world_bbox(wagon_objs)
    wagon_extent = wagon_max - wagon_min
    print(f"Wagon bounds: min={wagon_min}  max={wagon_max}  extent={wagon_extent}")

    # Detect which horizontal axis is the wagon's LENGTH (longer of X/Y).
    # That's the direction oxen extend forward and the camera looks
    # perpendicular to.
    length_axis = 'x' if wagon_extent.x >= wagon_extent.y else 'y'
    # Forward direction: assume the wagon's tongue is on the side AWAY
    # from the centroid — pick the side closer to the more-distant end.
    # Simpler: forward = +length_axis, override later via env var if wrong.
    forward_sign = int(os.environ.get('FORWARD_SIGN', '1'))  # +1 or -1
    print(f"Length axis: {length_axis.upper()}, forward = {'+' if forward_sign>0 else '-'}{length_axis.upper()}")

    if length_axis == 'x':
        front_edge = wagon_max.x if forward_sign > 0 else wagon_min.x
        bench_x = wagon_min.x + (wagon_extent.x * 0.85 if forward_sign > 0 else wagon_extent.x * 0.15)
        bench_y = (wagon_min.y + wagon_max.y) / 2
    else:
        front_edge = wagon_max.y if forward_sign > 0 else wagon_min.y
        bench_x = (wagon_min.x + wagon_max.x) / 2
        bench_y = wagon_min.y + (wagon_extent.y * 0.85 if forward_sign > 0 else wagon_extent.y * 0.15)
    bench_pos = Vector((bench_x, bench_y, wagon_max.z * 0.80))
    print(f"Bench seat target: {bench_pos}")

    driver_objs = []
    if os.environ.get('SKIP_DRIVER', '0') != '1':
        driver_objs = place_driver(bench_pos)

    # --- Oxen ahead of the wagon front edge ---
    ox_objs_all = []
    length_size = wagon_extent.x if length_axis == 'x' else wagon_extent.y
    pair_spacing = length_size * 0.45
    pair_offset = length_size * 0.18
    for p in range(n_pairs):
        for nf in (0, 1):
            ox_objs_all.extend(place_ox(
                p, nf, length_axis, forward_sign,
                pair_spacing, pair_offset, front_edge,
            ))

    all_objs = wagon_objs + driver_objs + ox_objs_all
    smin, smax = world_bbox(all_objs)
    s_center = (smin + smax) * 0.5
    s_extent = smax - smin
    print(f"Combined scene: extent {s_extent.x:.2f} x {s_extent.y:.2f} x {s_extent.z:.2f}")
    setup_camera_and_lights(s_center, s_extent, length_axis)

    # --- Render setup ---
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    # GPU
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for backend in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = backend
            prefs.refresh_devices()
            if any(d.type in ('OPTIX', 'CUDA') for d in prefs.devices):
                for d in prefs.devices:
                    if d.type in ('OPTIX', 'CUDA'):
                        d.use = True
                break
        except Exception:
            continue
    scene.cycles.device = 'GPU'
    scene.cycles.samples = int(os.environ.get('CYCLES_SAMPLES', '48'))
    scene.cycles.use_denoising = True

    if single_frame:
        out = os.path.join(out_dir, f"{basename}.png")
        scene.render.filepath = out
        bpy.ops.render.render(write_still=True)
        print(f"Wrote {out}")
        return

    # --- Multi-frame animation ---
    # TODO Phase 2: keyframe wheel rotation and ox walk cycle
    # synchronized so 12 frames = 1 stride = 1 wheel rotation.
    # For now, single-frame baseline.
    out = os.path.join(out_dir, f"{basename}--00.png")
    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
