"""Headless Blender script: render a side-on view of a wagon model with
alpha PNG output.

Usage:
    blender -b -P render_wagon.py -- <model.glb> <output.png> [width] [height]

Camera: orthographic, side-on along the wagon's X axis (wagon's Y axis
is its length so it becomes the horizontal screen axis). The camera
auto-fits to the model's bounding box with a small margin.

Lighting: 3-point setup (key + fill + rim) for a painterly look that
mimics the FLUX aesthetic on the rest of the project. Sun lights for
clean shadows + ambient world for fill.

Render: Eevee Next (fast iteration). Switch to Cycles for final via
the RENDER_ENGINE env var.
"""

import bpy
import os
import sys
from mathutils import Vector
from math import radians

# Add the script's own dir to sys.path so we can import the stylize module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stylize as _stylize


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(args) < 2:
        print("ERROR: pass <model_path> <output_path> [width] [height]")
        return
    model_path = args[0]
    output_path = args[1]
    width = int(args[2]) if len(args) > 2 else 1536
    height = int(args[3]) if len(args) > 3 else 817

    print(f"Loading model: {model_path}")
    print(f"Output: {output_path}  ({width}x{height})")

    # Clear default scene completely
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for cam in list(bpy.data.cameras):
        bpy.data.cameras.remove(cam)
    for light in list(bpy.data.lights):
        bpy.data.lights.remove(light)

    # --- Import model ---
    ext = os.path.splitext(model_path)[1].lower()
    if ext in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=model_path)
    elif ext == '.obj':
        bpy.ops.wm.obj_import(filepath=model_path)
    elif ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=model_path)
    else:
        raise SystemExit(f"Unknown model format: {ext}")

    mesh_objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not mesh_objs:
        raise SystemExit("No mesh objects loaded.")

    # HIDE_MATERIAL env var: comma-separated list of material names whose
    # owning meshes should be hidden from render. Used to render the
    # wagon body WITHOUT wheels so the wheel-cycle sprites can be
    # composited over the body in SVG.
    hide_materials = [m.strip() for m in os.environ.get('HIDE_MATERIAL', '').split(',') if m.strip()]
    if hide_materials:
        print(f"Hiding meshes whose material slots include: {hide_materials}")
        hidden = 0
        for obj in mesh_objs:
            for slot in obj.material_slots:
                if slot.material and slot.material.name in hide_materials:
                    obj.hide_render = True
                    hidden += 1
                    break
        print(f"  {hidden} mesh(es) hidden")
        # KEEP hidden meshes in bounds — camera should frame the full
        # wagon (body + missing-wheel footprint) so this body-only render
        # composites at the same scale/position as the wheel-cycle
        # sprites in SVG.

    # TONGUE_LIFT_DEG: rotate verts past TONGUE_PIVOT_Y around the X axis
    # at the pivot so the wagon's tongue points UP toward the ox-yoke
    # height instead of drooping at rest. Pivot is in WORLD coords (model
    # imported, axes already converted by gltf importer). For prairie-
    # schooner: TONGUE_PIVOT_Y ~ 1.4 (clevis where tongue meets body),
    # TONGUE_LIFT_DEG ~ 25 (degrees, positive = tip rises).
    # HIDE_BELOW_Z: delete verts below this world-Z threshold before
    # rendering. Used to strip wheels from the body PNG (wheels live at
    # low Z, body+canvas at high Z) when the model has no separable
    # wheel material/mesh. Default unset → keep everything.
    hide_below_z = os.environ.get('HIDE_BELOW_Z')
    if hide_below_z is not None:
        import bmesh
        thr = float(hide_below_z)
        deleted = 0
        for obj in mesh_objs:
            if obj.hide_render:
                continue
            M = obj.matrix_world
            bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
            to_del = [v for v in bm.verts if (M @ v.co).z < thr]
            if to_del:
                bmesh.ops.delete(bm, geom=to_del, context='VERTS')
                deleted += len(to_del)
            bm.to_mesh(obj.data); obj.data.update(); bm.free()
        print(f"HIDE_BELOW_Z={thr}: deleted {deleted} verts (wheels)")

    # TONGUE_LIFT_DEG: rotate verts FORWARD of the pivot upward, so the
    # wagon tongue points up toward the ox-yoke height instead of
    # drooping at rest. TONGUE_LIFT_AXIS picks which axis the pivot is
    # on: 'y' (pivot in Y, rotate around X — for length-along-Y wagons
    # like prairie-schooner.glb) or 'x' (pivot in X, rotate around Y —
    # for length-along-X wagons like covered-wagon.glb).
    # FORWARD direction is verts on the side OPPOSITE the wagon body
    # — set TONGUE_PIVOT_SIGN=+1 (default, verts > pivot lift) or -1.
    # NOTE: TONGUE_LIFT must be applied AFTER bounds + camera are set
    # up so the body's framing matches render_wheels.py (which uses
    # pre-lift bounds). The lift block has been moved to just before
    # the render call below.

    # --- Compute bounding box ---
    all_corners: list[Vector] = []
    for obj in mesh_objs:
        for corner in obj.bound_box:
            all_corners.append(obj.matrix_world @ Vector(corner))

    min_v = Vector((min(v.x for v in all_corners),
                    min(v.y for v in all_corners),
                    min(v.z for v in all_corners)))
    max_v = Vector((max(v.x for v in all_corners),
                    max(v.y for v in all_corners),
                    max(v.z for v in all_corners)))
    center = (min_v + max_v) * 0.5
    extent = max_v - min_v
    print(f"Bounds: min={min_v}  max={max_v}")
    print(f"Center: {center}  extent: {extent}")

    # --- Camera: orthographic side-on, looking along +X toward -X.
    # Place camera FAR on the +X side, looking back at center.
    # Y becomes screen-horizontal, Z becomes screen-vertical. ---
    cam_data = bpy.data.cameras.new(name='SideCam')
    cam_data.type = 'ORTHO'
    # Push the far clip plane out — our model is in scene units that
    # could be hundreds or thousands away from the camera. Default
    # clip_end=100 hides anything beyond that.
    cam_data.clip_start = 0.1
    cam_data.clip_end = 1_000_000

    # Figure out which axis is the wagon's LENGTH (longest horizontal).
    # Models from Sketchfab vary: Conestoga has length on Y, the
    # shuvalov.di covered wagon has length on X. Pick the longer one
    # as length; the other horizontal becomes the camera-look axis.
    # Z is always assumed up (Blender convention; gltf importer usually
    # converts Y-up models to Blender's Z-up).
    force_axis = os.environ.get('FORCE_LENGTH_AXIS', '').lower()
    if force_axis == 'x':
        length_along_x = True
    elif force_axis == 'y':
        length_along_x = False
    else:
        length_along_x = extent.x >= extent.y
    length_extent = extent.x if length_along_x else extent.y
    print(f"Length axis: {'X' if length_along_x else 'Y'}  (extent {length_extent:.2f}{'  [forced]' if force_axis else ''})")

    target_aspect = width / height
    model_aspect = length_extent / extent.z
    if model_aspect >= target_aspect:
        cam_data.ortho_scale = length_extent * 1.10   # 10% margin
    else:
        cam_data.ortho_scale = extent.z * target_aspect * 1.10

    cam = bpy.data.objects.new('SideCam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    # Position: camera offset along the SHORT horizontal axis. If
    # length is along X, look along Y. If length is along Y, look along X.
    # FLIP_VIEW env var puts the camera on the OPPOSITE side, flipping
    # the wagon's facing direction (e.g. covered-wagon faces right by
    # default; FLIP_VIEW=1 makes it face left).
    cam_distance = max(extent) * 3.0
    flip = os.environ.get('FLIP_VIEW', '0') == '1'
    sign = -1 if flip else 1
    if length_along_x:
        cam.location = (center.x, center.y + cam_distance * sign, center.z)
    else:
        cam.location = (center.x + cam_distance * sign, center.y, center.z)
    direction = center - Vector(cam.location)
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

    # --- Lighting: 3-point sun setup ---
    # Key light: above + front-side, warm
    key_data = bpy.data.lights.new(name='Key', type='SUN')
    key_data.energy = 4.0
    key_data.angle = radians(20)  # soft shadow edge
    key_data.color = (1.0, 0.96, 0.86)
    key = bpy.data.objects.new('Key', key_data)
    bpy.context.scene.collection.objects.link(key)
    key.location = (center.x + extent.x, center.y - extent.y * 0.3, center.z + extent.z * 1.5)
    key.rotation_euler = (radians(45), 0, radians(45))

    # Fill light: opposite side, cooler, less intense
    fill_data = bpy.data.lights.new(name='Fill', type='SUN')
    fill_data.energy = 1.5
    fill_data.color = (0.84, 0.92, 1.0)
    fill = bpy.data.objects.new('Fill', fill_data)
    bpy.context.scene.collection.objects.link(fill)
    fill.location = (center.x + extent.x, center.y + extent.y * 0.3, center.z)
    fill.rotation_euler = (radians(75), 0, radians(135))

    # Rim light: behind, accent on the canvas top edges
    rim_data = bpy.data.lights.new(name='Rim', type='SUN')
    rim_data.energy = 2.0
    rim_data.color = (1.0, 1.0, 0.95)
    rim = bpy.data.objects.new('Rim', rim_data)
    bpy.context.scene.collection.objects.link(rim)
    rim.location = (center.x - extent.x, center.y, center.z + extent.z * 1.2)
    rim.rotation_euler = (radians(135), 0, radians(-90))

    # --- World background: cream-white to match the FLUX aesthetic ---
    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg is not None:
        bg.inputs['Color'].default_value = (0.96, 0.93, 0.85, 1.0)
        bg.inputs['Strength'].default_value = 0.4

    # --- Render settings ---
    scene = bpy.context.scene
    engine = os.environ.get('RENDER_ENGINE', 'CYCLES')
    scene.render.engine = engine
    print(f"Render engine: {engine}")

    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True   # alpha output
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'

    if engine == 'CYCLES':
        # GPU acceleration via OptiX (NVIDIA RTX). Try OPTIX first,
        # fall back to CUDA, then CPU.
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for backend in ('OPTIX', 'CUDA', 'NONE'):
            try:
                prefs.compute_device_type = backend
                prefs.refresh_devices()
                gpu_devices = [d for d in prefs.devices if d.type in ('OPTIX', 'CUDA')]
                if gpu_devices:
                    print(f"GPU backend: {backend}  ({len(gpu_devices)} device(s) found)")
                    for dev in gpu_devices:
                        dev.use = True
                        print(f"  enabled: {dev.name}")
                    break
            except Exception as e:
                print(f"  {backend} not available: {e}")
                continue

        scene.cycles.device = 'GPU'
        scene.cycles.samples = int(os.environ.get('CYCLES_SAMPLES', '128'))
        scene.cycles.use_denoising = True
        scene.cycles.denoiser = 'OPTIX' if prefs.compute_device_type == 'OPTIX' else 'OPENIMAGEDENOISE'
        print(f"Cycles samples: {scene.cycles.samples}, denoiser: {scene.cycles.denoiser}")

    # Apply painterly stylization pass if STYLIZE=1
    _stylize.stylize()

    # TONGUE_LIFT — applied here, AFTER camera framing, so body and
    # wheel renders share identical camera bounds. See note above.
    tongue_lift_deg = float(os.environ.get('TONGUE_LIFT_DEG', '0'))
    if tongue_lift_deg != 0:
        from math import cos, sin
        import bmesh
        axis = os.environ.get('TONGUE_LIFT_AXIS', 'y').lower()
        pivot_z = float(os.environ.get('TONGUE_PIVOT_Z', '0.0'))
        sign = float(os.environ.get('TONGUE_PIVOT_SIGN', '1'))
        ang = radians(tongue_lift_deg)
        ca, sa = cos(ang), sin(ang)
        if axis == 'x':
            pivot = float(os.environ.get('TONGUE_PIVOT_X', '-1.0'))
        else:
            pivot = float(os.environ.get('TONGUE_PIVOT_Y', '1.4'))
        total_lifted = 0
        for obj in mesh_objs:
            if obj.hide_render: continue
            M = obj.matrix_world
            Minv = M.inverted()
            bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
            for v in bm.verts:
                wp = M @ v.co
                if axis == 'x':
                    selected = (wp.x < pivot) if sign < 0 else (wp.x > pivot)
                    if selected:
                        dx = wp.x - pivot
                        dz = wp.z - pivot_z
                        new_x = pivot + (dx * ca + dz * sa)
                        new_z = pivot_z + (-dx * sa + dz * ca)
                        v.co = Minv @ Vector((new_x, wp.y, new_z))
                        total_lifted += 1
                else:
                    selected = (wp.y < pivot) if sign < 0 else (wp.y > pivot)
                    if selected:
                        dy = wp.y - pivot
                        dz = wp.z - pivot_z
                        new_y = pivot + (dy * ca - dz * sa)
                        new_z = pivot_z + (dy * sa + dz * ca)
                        v.co = Minv @ Vector((wp.x, new_y, new_z))
                        total_lifted += 1
            bm.to_mesh(obj.data); obj.data.update(); bm.free()
        print(f"Tongue lift: {total_lifted} verts rotated {tongue_lift_deg}° around {'Y' if axis=='x' else 'X'}@({axis}={pivot}, z={pivot_z}, sign={sign:+.0f})")

    scene.render.filepath = output_path
    print("Rendering...")
    bpy.ops.render.render(write_still=True)
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
