"""Headless Blender script: load a model + report bounds + object count.

Usage:
    blender -b -P inspect_model.py -- /path/to/model.glb
"""

import bpy
import sys
from mathutils import Vector


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if not args:
        print("ERROR: pass model path after --")
        return
    model_path = args[0]
    print(f"Loading: {model_path}")

    # Clear default scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.meshes):
        bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        bpy.data.materials.remove(block)

    # Import GLB
    if model_path.lower().endswith('.glb') or model_path.lower().endswith('.gltf'):
        bpy.ops.import_scene.gltf(filepath=model_path)
    elif model_path.lower().endswith('.obj'):
        bpy.ops.wm.obj_import(filepath=model_path)
    elif model_path.lower().endswith('.fbx'):
        bpy.ops.import_scene.fbx(filepath=model_path)
    elif model_path.lower().endswith('.blend'):
        # Append all objects from the .blend
        with bpy.data.libraries.load(model_path) as (data_from, data_to):
            data_to.objects = list(data_from.objects)
        for obj in data_to.objects:
            bpy.context.collection.objects.link(obj)

    # Survey what loaded
    mesh_objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    print(f"\nLoaded {len(mesh_objs)} mesh object(s):")
    total_polys = 0
    total_verts = 0
    for obj in mesh_objs:
        polys = len(obj.data.polygons)
        verts = len(obj.data.vertices)
        total_polys += polys
        total_verts += verts
        print(f"  - {obj.name}: {polys} polys, {verts} verts")

    print(f"\nTotal: {total_polys} polys, {total_verts} verts")

    # Compute scene bounding box
    if not mesh_objs:
        print("No mesh objects — nothing to bound.")
        return

    all_verts: list[Vector] = []
    for obj in mesh_objs:
        for corner in obj.bound_box:
            all_verts.append(obj.matrix_world @ Vector(corner))

    min_x = min(v.x for v in all_verts)
    max_x = max(v.x for v in all_verts)
    min_y = min(v.y for v in all_verts)
    max_y = max(v.y for v in all_verts)
    min_z = min(v.z for v in all_verts)
    max_z = max(v.z for v in all_verts)

    print(f"\nBounding box (Blender world coords):")
    print(f"  X: {min_x:8.2f} .. {max_x:8.2f}  (extent {max_x - min_x:.2f})")
    print(f"  Y: {min_y:8.2f} .. {max_y:8.2f}  (extent {max_y - min_y:.2f})")
    print(f"  Z: {min_z:8.2f} .. {max_z:8.2f}  (extent {max_z - min_z:.2f})")

    # Material survey
    materials = set()
    for obj in mesh_objs:
        for slot in obj.material_slots:
            if slot.material:
                materials.add(slot.material.name)
    print(f"\nMaterials ({len(materials)}):")
    for mat in sorted(materials):
        print(f"  - {mat}")


if __name__ == "__main__":
    main()
