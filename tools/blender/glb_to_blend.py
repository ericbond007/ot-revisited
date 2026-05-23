"""Import a GLB into a fresh Blender scene and save as .blend.

Usage:
    blender -b -P glb_to_blend.py -- <input.glb> <output.blend>

The output .blend can be opened directly with `blender file.blend`.
GLBs themselves can't be opened with `blender file.glb` — they're
imports, not native files.
"""
import sys
import os
import bpy

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(args) < 2:
    print("usage: glb_to_blend.py -- <input.glb> <output.blend>")
    raise SystemExit(1)
glb_path = os.path.abspath(args[0])
blend_path = os.path.abspath(args[1])

# Clear default scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.meshes):
    bpy.data.meshes.remove(m)
for c in list(bpy.data.cameras):
    bpy.data.cameras.remove(c)
for l in list(bpy.data.lights):
    bpy.data.lights.remove(l)

bpy.ops.import_scene.gltf(filepath=glb_path)
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f"Saved {blend_path}")
