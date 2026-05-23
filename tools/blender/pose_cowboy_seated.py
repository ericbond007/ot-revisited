"""Pose the Mixamo-rigged Western Cowboy into a SEATED, holding-reins
posture so he can sit on the wagon driver bench.

Rig: Mixamo standard humanoid (LeftUpLeg, LeftLeg, LeftFoot, LeftArm,
LeftForeArm, etc.). Bone-local rotations applied via pose-mode + euler.

Usage:
    blender -b -P pose_cowboy_seated.py -- <input.glb> <output_dir> <basename> [width] [height]

Renders one frame side-on. Saves as <output_dir>/<basename>--seated.png.
"""

import bpy
import os
import sys
from mathutils import Vector
from math import radians

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stylize as _stylize


SEATED_POSE = {
    # Hip 90° forward — proper sitting-on-chair angle (femur horizontal).
    # Earlier reduced to 50° to hide the rigidly-skinned hip pistol;
    # now that the pistol verts are collapsed into the body, the hip
    # can go back to the natural 90°.
    'mixamorig:LeftUpLeg_047':   ('XYZ', (radians(90), 0, 0)),
    'mixamorig:RightUpLeg_052':  ('XYZ', (radians(90), 0, 0)),
    # Knees: 90° back. Femur horizontal + lower leg vertical = classic
    # sitting pose.
    'mixamorig:LeftLeg_048':     ('XYZ', (radians(-90), 0, 0)),
    'mixamorig:RightLeg_053':    ('XYZ', (radians(-90), 0, 0)),
    # Feet propped slightly forward + up (resting on wagon footrest).
    # -30 had toes pointing too far down; 0 = neutral, positive curls toes up.
    'mixamorig:LeftFoot_049':    ('XYZ', (radians(0), 0, 0)),
    'mixamorig:RightFoot_054':   ('XYZ', (radians(0), 0, 0)),
    # Shoulders neutral
    'mixamorig:LeftShoulder_07':   ('XYZ', (0, 0, 0)),
    'mixamorig:RightShoulder_027': ('XYZ', (0, 0, 0)),
    # Arms posed via WORLD_AXIS_POSE below (set_world_axis_rotation),
    # not via euler in this dict — bone-local euler axes don't match
    # world axes for arm bones, which led to 12+ failed pose iterations.
    # Hands: keep the inward Z tilt (thumb toward midline) AND add wrist
    # twist around the forearm axis (bone-local Y) so thumbs point ~70°
    # toward sky instead of full 90° up.
    'mixamorig:LeftHand_010':    ('XYZ', (0, radians(50), 0)),
    'mixamorig:RightHand_030':   ('XYZ', (0, radians(-50), 0)),
    # Spine forward lean
    'mixamorig:Spine_02':        ('XYZ', (radians(8), 0, 0)),
}

# Finger curl: close every finger bone segment to make a fist gripping
# imaginary reins. Each finger has 4 bones (Thumb1-4, Index1-4, etc.).
# Rotating the bone-local Z axis (perpendicular to the finger length)
# curls it inward.
FINGER_CURL_DEG = 55  # how tightly to curl
FINGER_BONES_LEFT = [
    'mixamorig:LeftHandThumb1_011',  'mixamorig:LeftHandThumb2_012',  'mixamorig:LeftHandThumb3_013',
    'mixamorig:LeftHandIndex1_015',  'mixamorig:LeftHandIndex2_016',  'mixamorig:LeftHandIndex3_017',
    'mixamorig:LeftHandMiddle1_019', 'mixamorig:LeftHandMiddle2_020', 'mixamorig:LeftHandMiddle3_021',
    'mixamorig:LeftHandRing1_023',   'mixamorig:LeftHandRing2_024',   'mixamorig:LeftHandRing3_025',
]
FINGER_BONES_RIGHT = [
    'mixamorig:RightHandThumb1_031',  'mixamorig:RightHandThumb2_032',  'mixamorig:RightHandThumb3_033',
    'mixamorig:RightHandIndex1_035',  'mixamorig:RightHandIndex2_036',  'mixamorig:RightHandIndex3_037',
    'mixamorig:RightHandMiddle1_039', 'mixamorig:RightHandMiddle2_040', 'mixamorig:RightHandMiddle3_041',
    'mixamorig:RightHandRing1_043',   'mixamorig:RightHandRing2_044',   'mixamorig:RightHandRing3_045',
]


def apply_finger_curl(armature):
    """Curl all finger bones into a grip.

    Mixamo finger bones: bone-local Y is along the finger length.
    Curl = rotate around bone-local X axis (perpendicular to length).
    Try multiple axes per side until something looks right; the rig
    convention varies across Mixamo exports.
    """
    # Try X-axis curl first (most common Mixamo convention)
    for bone_name in FINGER_BONES_LEFT:
        pb = armature.pose.bones.get(bone_name)
        if pb is None:
            continue
        pb.rotation_mode = 'XYZ'
        deg = FINGER_CURL_DEG * (0.4 if 'Thumb' in bone_name else 1.0)
        # Curl: rotate around X (bone-local). Sign: negative curls fingers
        # toward palm on the left hand.
        pb.rotation_euler = (radians(deg), 0, 0)
    for bone_name in FINGER_BONES_RIGHT:
        pb = armature.pose.bones.get(bone_name)
        if pb is None:
            continue
        pb.rotation_mode = 'XYZ'
        deg = FINGER_CURL_DEG * (0.4 if 'Thumb' in bone_name else 1.0)
        # Right hand: same direction (both palms curl inward toward
        # camera in our side-on view; the bones are mirrored so signs
        # actually match for "curl into palm")
        pb.rotation_euler = (radians(deg), 0, 0)


def apply_ik_arms(armature):
    """Pose the arms via Inverse Kinematics by placing target Empties
    where the hands should be. Blender's IK solver figures out the
    bone rotations automatically — bypasses the bone-local-axis
    confusion of pose-mode euler rotations.

    Hand targets are placed in world space at:
      - Slightly in front of the body (forward along -Y world)
      - At lap height (Z just below the seated hip)
      - One per hand, slightly offset side-to-side

    The IK chain affects forearm + upper arm (2-bone chain).
    """
    from mathutils import Vector
    if armature.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.objects.active = armature

    # Hand targets at lap level (Dave's "much better" v10 settings:
    # ±0.4 X, slightly forward, lap height). Pole targets removed —
    # pole_angle attempts (0°, 180°) all produced arms-up V-shape;
    # natural IK without pole gives the v10 result we liked.
    hand_targets = {
        'mixamorig:LeftForeArm_09':   Vector((-0.4, -0.6, 3.5)),
        'mixamorig:RightForeArm_029': Vector((0.4, -0.6, 3.5)),
    }

    target_objs = {}
    for bone_name, world_target in hand_targets.items():
        empty_name = f"IK_target_{bone_name.split(':')[-1]}"
        existing = bpy.data.objects.get(empty_name)
        if existing:
            bpy.data.objects.remove(existing)
        empty = bpy.data.objects.new(empty_name, None)
        empty.empty_display_type = 'SPHERE'
        empty.empty_display_size = 0.1
        empty.location = world_target
        bpy.context.scene.collection.objects.link(empty)
        target_objs[bone_name] = empty

    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')
    for bone_name, empty in target_objs.items():
        pb = armature.pose.bones.get(bone_name)
        if pb is None:
            continue
        for c in list(pb.constraints):
            if c.type == 'IK':
                pb.constraints.remove(c)
        ik = pb.constraints.new('IK')
        ik.target = empty
        ik.chain_count = 2
        ik.use_tail = True
        print(f"  IK: {bone_name} → target {world_target}, chain=2, no pole")
    bpy.ops.object.mode_set(mode='OBJECT')


def set_world_axis_rotation(armature, pose_bone, axis, angle_deg):
    """Rotate a pose bone around a WORLD-SPACE axis by the given angle,
    composing with whatever rotation the parent already has.

    Uses pose_bone.matrix (CURRENT armature-space matrix after any parent
    pose) rather than the static rest matrix, so for child bones whose
    parent has been rotated first (call view_layer.update() between
    parents and children), the world axis is interpreted in the bone's
    *currently-posed* world frame.

    Formula:
      pose_bone.matrix = parent.matrix @ rest_offset @ rotation_basis
      We want new_world = R_world @ current_world
      → new pose_bone.matrix = M_world_inv @ R_world @ M_world @ pose_bone.matrix
        but the part we control is rotation_basis only. So:
        new_basis = current_basis @ (M_world_local_rest^-1 @ R_world @ M_world_local_rest)
      where M_world_local_rest is the rotation portion of armature.matrix_world @ pose_bone.matrix.
    """
    from mathutils import Quaternion, Vector, Matrix
    current_world = armature.matrix_world @ pose_bone.matrix
    current_world_3x3 = current_world.to_3x3()
    world_q = Quaternion(Vector(axis), radians(angle_deg))
    local_mat = current_world_3x3.inverted() @ world_q.to_matrix() @ current_world_3x3
    pose_bone.rotation_mode = 'QUATERNION'
    # Compose: existing rotation × world-rotation-expressed-in-current-frame
    existing = pose_bone.rotation_quaternion.copy()
    pose_bone.rotation_quaternion = existing @ local_mat.to_quaternion()


# World-axis rotations for the seated pose. Specs in (axis, angle_deg).
# Verified empirically: Y-axis rotation drops arms naturally (Dave's GUI test).
WORLD_AXIS_POSE = {
    # Arms hang DOWN: rotate around world +Y. Left arm (+X tip) → -Z (down)
    # via +90°. Right arm (-X tip) → -Z via -90°.
    'mixamorig:LeftArm_08':       ((0, 1, 0), 90),
    'mixamorig:RightArm_028':     ((0, 1, 0), -90),
    # Forearms: bend forward at elbow ~75° around world X axis. The arms
    # currently hang straight down; this rotates the forearm forward to
    # extend toward where the reins would be in the cowboy's lap area.
    'mixamorig:LeftForeArm_09':   ((1, 0, 0), -75),
    'mixamorig:RightForeArm_029': ((1, 0, 0), -75),
}


def apply_pose(armature):
    """Set pose-bone rotations from the SEATED_POSE dict + IK arms."""
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')
    set_count = 0
    for bone_name, (mode, eul) in SEATED_POSE.items():
        pb = armature.pose.bones.get(bone_name)
        if pb is None:
            print(f"  [skip] bone not found: {bone_name}")
            continue
        pb.rotation_mode = mode
        pb.rotation_euler = eul
        set_count += 1
    # Apply world-axis arm rotations IN ORDER: parents first, then
    # children. Each child's rest_world depends on parent's current
    # pose, so we update the depsgraph between to refresh matrices.
    PARENT_FIRST_ORDER = [
        'mixamorig:LeftArm_08', 'mixamorig:RightArm_028',
        'mixamorig:LeftForeArm_09', 'mixamorig:RightForeArm_029',
    ]
    for bone_name in PARENT_FIRST_ORDER:
        if bone_name not in WORLD_AXIS_POSE:
            continue
        axis, deg = WORLD_AXIS_POSE[bone_name]
        pb = armature.pose.bones.get(bone_name)
        if pb is None:
            print(f"  [skip] world-axis bone not found: {bone_name}")
            continue
        set_world_axis_rotation(armature, pb, axis, deg)
        # Update depsgraph so subsequent children see the new parent pose
        bpy.context.view_layer.update()
        print(f"  world-axis: {bone_name} → axis={axis}, {deg}°")
        set_count += 1
    if os.environ.get('DISABLE_FINGER_CURL', '0') != '1':
        apply_finger_curl(armature)
    bpy.ops.object.mode_set(mode='OBJECT')
    print(f"Applied seated pose to {set_count} bones (world-axis arms)")


def reweight_gun_to_root(armature):
    """Pivot from delete-gun to keep-gun-but-don't-rotate-with-hip.

    The pistols are skinned to mixamorig:Hips_01 with the rest of the
    pelvis. When Hips rotates 90° forward for the seated pose, the gun
    rotates with it — grip swings forward, barrel ends up pointing
    horizontally instead of down. We can't easily un-rotate just the
    gun verts without finding the right bbox.

    Cleaner: re-skin the gun verts to `_rootJoint` (the armature root,
    which doesn't rotate during pose). Gun stays at its rest world
    position; hips rotate around it. Net look: gun in holster, grip up,
    barrel pointing down toward thigh — same as T-pose orientation.

    Bbox is in WORLD-space REST pose, |X|=0.72-0.95, Y=-0.30 to 0.25,
    Z=0.40 to 1.40 — covers grip + barrel + trigger + holster pieces.
    """
    body = next(
        (o for o in bpy.context.scene.objects
         if o.type == 'MESH' and not o.hide_render and len(o.data.polygons) > 1000),
        None,
    )
    if body is None:
        print("reweight_gun_to_root: no body mesh"); return
    root_vg = body.vertex_groups.get('_rootJoint')
    if root_vg is None:
        print("reweight_gun_to_root: no _rootJoint vertex group; pistols will rotate with hip")
        return
    M = body.matrix_world
    other_vgs = [vg for vg in body.vertex_groups if vg.name != '_rootJoint']
    rewritten = 0
    for v in body.data.vertices:
        wp = M @ v.co
        if (0.72 < abs(wp.x) < 0.95 and
            -0.30 < wp.y < 0.25 and
            0.40 < wp.z < 1.40):
            for vg in other_vgs:
                try: vg.remove([v.index])
                except: pass
            root_vg.add([v.index], 1.0, 'REPLACE')
            rewritten += 1
    print(f"reweight_gun_to_root: re-skinned {rewritten} verts to _rootJoint")


def remove_gun_islands():
    """Find connected mesh islands whose CENTROID lies in the gun
    region, and delete those islands whole. Avoids the bbox approach's
    over-deletion of pant/belt verts that just happened to fall in the
    same volume — only verts CONNECTED to gun mesh get removed.

    Empirically the gun is ~10 small disconnected islands at world
    centroid (±0.75-0.78, -0.16 to -0.10, ~1.04) — see analysis dump
    in conversation.
    """
    import bmesh
    body = next(
        (o for o in bpy.context.scene.objects
         if o.type == 'MESH' and not o.hide_render and len(o.data.polygons) > 1000),
        None,
    )
    if not body: return
    M = body.matrix_world
    bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()

    # BFS to find connected components
    visited = set()
    islands = []
    for start in bm.verts:
        if start.index in visited: continue
        stack = [start]; isl = []
        while stack:
            v = stack.pop()
            if v.index in visited: continue
            visited.add(v.index); isl.append(v)
            for e in v.link_edges:
                o = e.other_vert(v)
                if o.index not in visited: stack.append(o)
        islands.append(isl)

    # Identify gun islands by CENTROID position. Body proper is one
    # huge island (>10k verts) — exclude it. Other limbs/hat/eyes are
    # large islands too (>200 verts) — exclude by Z range.
    to_delete = []
    matched_islands = 0
    for isl in islands:
        if len(isl) > 500: continue   # too big to be a gun piece
        pts = [M @ v.co for v in isl]
        cx = sum(p.x for p in pts) / len(pts)
        cy = sum(p.y for p in pts) / len(pts)
        cz = sum(p.z for p in pts) / len(pts)
        # Wider centroid filter: catches holster (smaller |x|) and
        # barrel tips (lower Z) that previous bbox missed.
        if (0.55 < abs(cx) < 0.95 and
            -0.30 < cy < 0.40 and
            -0.10 < cz < 1.30):
            to_delete.extend(isl)
            matched_islands += 1
    if to_delete:
        bmesh.ops.delete(bm, geom=to_delete, context='VERTS')
    bm.to_mesh(body.data); body.data.update(); bm.free()
    print(f"remove_gun_islands: deleted {matched_islands} islands ({len(to_delete)} verts)")


def remove_gun_geometry():
    """[deprecated] Hard-deletes gun verts via bbox. Replaced by
    remove_gun_islands() — see that function for rationale.
    Bbox in WORLD-space rest pose, |X|=0.72-0.95, Y=-0.30 to 0.25,
    Z=0.40 to 1.40.
    """
    import bmesh
    body = next(
        (o for o in bpy.context.scene.objects
         if o.type == 'MESH' and not o.hide_render and len(o.data.polygons) > 1000),
        None,
    )
    if not body:
        print("remove_gun_geometry: no body mesh found")
        return
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bm.verts.ensure_lookup_table()
    # The body mesh's matrix_world has scale 0.01 — raw vertex coords
    # are 100× larger than what appears in world space.
    M = body.matrix_world
    # DELETE the gun verts entirely (with bmesh.ops.delete). Earlier
    # collapse-to-body-center followed the hip bone when posed,
    # showing as ghost hands at lap. Sink-to-far-below stretched the
    # mesh into a cone. Plain deletion creates a hole at the belt
    # level — covered by the vest from the front, mostly hidden from
    # the side. Cleanest of the three options.
    to_delete = []
    for v in bm.verts:
        wp = M @ v.co
        # Bbox extended down to barrel tip + up to top of handle, tightened
        # on the inside (X, Y) so we stop catching pants/belt-band verts.
        if (0.72 < abs(wp.x) < 0.95 and
            -0.30 < wp.y < 0.25 and
            0.40 < wp.z < 1.40):
            to_delete.append(v)
    if to_delete:
        bmesh.ops.delete(bm, geom=to_delete, context='VERTS')
    moved = len(to_delete)
    bm.to_mesh(body.data)
    body.data.update()
    bm.free()
    print(f"remove_gun_geometry: collapsed {moved} pistol/holster verts into body interior")


def main() -> None:
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if len(args) < 3:
        print("usage: pose_cowboy_seated.py -- <input.glb> <output_dir> <basename> [w] [h]")
        return
    model_path = args[0]
    output_dir = args[1]
    basename = args[2]
    width = int(args[3]) if len(args) > 3 else 1024
    height = int(args[4]) if len(args) > 4 else 1024

    os.makedirs(output_dir, exist_ok=True)

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    for c in list(bpy.data.cameras): bpy.data.cameras.remove(c)
    for l in list(bpy.data.lights): bpy.data.lights.remove(l)
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)

    bpy.ops.import_scene.gltf(filepath=model_path)
    armature = next((o for o in bpy.context.scene.objects if o.type == 'ARMATURE'), None)
    if not armature:
        print("ERROR: no armature found")
        return

    # CRITICAL: Mixamo GLBs ship with a baked T-pose / idle action. If left
    # bound, frame evaluation re-applies the action's keyframes AFTER our
    # pose-mode rotations, silently reverting the cowboy to T-pose during
    # render. Detach the action and wipe it from bpy.data.
    if armature.animation_data is not None:
        armature.animation_data.action = None
        armature.animation_data_clear()
        print("Detached embedded mixamo.com action from armature")
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)

    # Hide IK helpers (Icosphere, etc.)
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' and obj.name.startswith(('Icosphere', 'Sphere.', 'IK_')):
            obj.hide_render = True

    # Pivot from gun-removal to gun-reweight: re-skin pistol verts to
    # _rootJoint so they don't rotate with the hip when the cowboy
    # sits. KEEP_GUN=1 leaves them as-is (will rotate with hip — bad).
    # OLD_REMOVE_GUN=1 falls back to the destructive bbox-delete path.
    # Default: surgically delete gun mesh ISLANDS (only verts that are
    # connected to gun pieces). KEEP_GUN=1 leaves them. REWEIGHT_GUN=1
    # falls back to the reweight-to-root experiment (don't use — gun
    # ends up flag-poling below the seated cowboy).
    if os.environ.get('KEEP_GUN', '0') != '1':
        if os.environ.get('REWEIGHT_GUN', '0') == '1':
            reweight_gun_to_root(armature)
        else:
            remove_gun_islands()

    apply_pose(armature)

    # Force depsgraph update
    bpy.context.view_layer.update()

    # Compute bounds of the posed mesh
    all_corners = []
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' and not obj.hide_render and obj.data:
            deps = bpy.context.evaluated_depsgraph_get()
            ev = obj.evaluated_get(deps).data
            for v in ev.vertices:
                wp = obj.matrix_world @ v.co
                all_corners.append(wp)
    if not all_corners:
        print("ERROR: no visible vertices")
        return
    min_v = Vector((min(p.x for p in all_corners),
                    min(p.y for p in all_corners),
                    min(p.z for p in all_corners)))
    max_v = Vector((max(p.x for p in all_corners),
                    max(p.y for p in all_corners),
                    max(p.z for p in all_corners)))
    center = (min_v + max_v) * 0.5
    extent = max_v - min_v
    print(f"Posed bounds: extent {extent.x:.2f} x {extent.y:.2f} x {extent.z:.2f}")

    # Side-on camera (camera on X axis, looking along -X) — gives profile
    cam_data = bpy.data.cameras.new(name='SideCam')
    cam_data.type = 'ORTHO'
    cam_data.clip_start = 0.1
    cam_data.clip_end = 1_000_000
    target_aspect = width / height
    # Vertical extent (Z) usually dominates a posed figure. Use it as
    # ortho_scale or whichever's larger.
    biggest = max(extent.y, extent.z) * 1.10
    cam_data.ortho_scale = biggest

    cam = bpy.data.objects.new('SideCam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    cam_distance = max(extent.x, extent.y, extent.z) * 3.0
    flip = os.environ.get('FLIP_VIEW', '0') == '1'
    sign = -1 if flip else 1
    # CAMERA_VIEW: 'side' (default, on X axis), 'front' (-Y, looking
    # at cowboy's face), 'back' (+Y), '3q' (front-side 3/4 view)
    view = os.environ.get('CAMERA_VIEW', 'side').lower()
    if view == 'front':
        cam.location = (center.x, center.y - cam_distance, center.z)
    elif view == 'back':
        cam.location = (center.x, center.y + cam_distance, center.z)
    elif view == '3q':
        cam.location = (center.x + cam_distance * 0.7,
                        center.y - cam_distance * 0.7, center.z)
    else:  # side
        cam.location = (center.x + cam_distance * sign, center.y, center.z)
    direction = center - Vector(cam.location)
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

    # World ambient lighting (flat, like the cow setup)
    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new('World')
        bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs['Color'].default_value = (0.96, 0.93, 0.85, 1.0)
        bg.inputs['Strength'].default_value = 3.0

    # Render
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = int(os.environ.get('CYCLES_SAMPLES', '64'))
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPTIX'
    scene.cycles.diffuse_bounces = 0  # flat lighting

    # If SAVE_BLEND env var is set, save the .blend file instead of rendering.
    # That way the user can open the file in Blender GUI and edit the pose
    # manually with all our IK/setup pre-applied.
    save_blend = os.environ.get('SAVE_BLEND')
    if save_blend:
        out_blend = os.path.abspath(save_blend)
        bpy.ops.wm.save_as_mainfile(filepath=out_blend)
        print(f"Saved .blend to {out_blend}")
        return

    out_path = os.path.join(output_dir, f"{basename}--seated.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
