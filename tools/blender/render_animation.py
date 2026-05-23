"""Render an animation cycle as numbered PNG frames (sprite sheet pieces).

Used for the ox walk-cycle and wagon wheel rotation. Loads a model
that has built-in actions/animations, samples N frames evenly across
the action's range, renders each as a transparent PNG.

Usage:
    blender -b -P render_animation.py -- <model.glb> <output_dir> <basename> [width] [height] [frame_count]

Output: <output_dir>/<basename>--00.png, <basename>--01.png, ...

Example:
    blender -b -P render_animation.py -- \\
      tools/blender/models/ox-walk.glb \\
      static/wagon-bg/wagon-blender/ox-walk-frames \\
      ox 1024 1024 12
"""

import bpy
import os
import sys
from mathutils import Vector
from math import radians

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stylize as _stylize


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(args) < 3:
        print("ERROR: pass <model_path> <output_dir> <basename> [width] [height] [frame_count]")
        return
    model_path = args[0]
    output_dir = args[1]
    basename = args[2]
    width = int(args[3]) if len(args) > 3 else 1024
    height = int(args[4]) if len(args) > 4 else 1024
    frame_count = int(args[5]) if len(args) > 5 else 12

    os.makedirs(output_dir, exist_ok=True)
    print(f"Loading: {model_path}")
    print(f"Output: {output_dir}/{basename}--NN.png  ({width}x{height}, {frame_count} frames)")

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

    # Import GLB
    bpy.ops.import_scene.gltf(filepath=model_path)

    # OX_PAIR=1 imports a SECOND copy of the model offset on the X
    # axis (perpendicular to the ox's body axis), so we can render a
    # yoked PAIR of oxen with the yoke spanning between. Only the
    # FIRST copy keeps its built-in yoke; second copy's harness meshes
    # get hidden so we don't get two stacked yokes.
    if os.environ.get('OX_PAIR', '0') == '1':
        first_pass_objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        bpy.ops.import_scene.gltf(filepath=model_path)
        new_objs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o not in first_pass_objs]
        offset = float(os.environ.get('OX_PAIR_OFFSET', '1.6'))
        # Find new top-level (root) objects to translate
        new_roots = [o for o in bpy.context.scene.objects if o.type in ('ARMATURE', 'EMPTY', 'MESH') and o not in first_pass_objs and o.parent is None]
        for r in new_roots:
            r.location = r.location + Vector((offset, 0, 0))
        # Hide harness meshes on the SECOND copy so only the first copy's yoke is visible.
        harness_kw = ('fakeret', 'csati', 'csti', 'krom', 'torus')
        hidden = 0
        for o in new_objs:
            n = o.name.lower()
            if any(k in n for k in harness_kw):
                o.hide_render = True
                hidden += 1
        print(f"OX_PAIR: imported 2nd copy at +X={offset}, hid {hidden} duplicate harness meshes")

    mesh_objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not mesh_objs:
        raise SystemExit("No mesh objects loaded.")

    # Hide IK-helper / debug meshes that game-asset rigs often ship with.
    # The cow-npc model has an "Icosphere" (80 polys) parented to a leg
    # bone as an IK target — visible during animation as small triangles
    # near the back when the rear leg swings. The ox-walk model also
    # has an Icosphere (already filtered by HIDE_FAR_OX). Common helper
    # names to suppress: Icosphere*, Sphere*, IK_*, *_target, helper*.
    HELPER_NAME_PREFIXES = ('Icosphere', 'Sphere.', 'IK_', 'helper', 'Helper')
    HELPER_NAME_SUFFIXES = ('_target', '_helper', '_IK')
    helpers_hidden = 0
    for obj in mesh_objs:
        nm = obj.name
        if any(nm.startswith(p) for p in HELPER_NAME_PREFIXES) or any(nm.endswith(s) for s in HELPER_NAME_SUFFIXES):
            obj.hide_render = True
            helpers_hidden += 1
    if helpers_hidden:
        print(f"Hidden {helpers_hidden} IK-helper / debug mesh(es)")

    # HIDE_HARNESS=1 hides the wagon-tongue + yoke + chain meshes
    # baked into ox-walk.glb (Hungarian-style rig). Leaves only the ox
    # body so per-ox sprites can be tiled into a multi-pair team
    # without each ox dragging its own tongue. Mesh keywords:
    # 'fakeret' (tongue/frame), 'csati' (buckle), 'csti' (chain link),
    # 'krom' (chain), 'Torus' (ring).
    harness_keywords = ('fakeret', 'csati', 'csti', 'krom', 'torus')
    if os.environ.get('HIDE_HARNESS', '0') == '1':
        harness_hidden = 0
        for obj in mesh_objs:
            n = obj.name.lower()
            if any(k in n for k in harness_keywords):
                obj.hide_render = True
                harness_hidden += 1
        if harness_hidden:
            print(f"Hidden {harness_hidden} harness mesh(es) (tongue/yoke/chain)")
    # KEEP_HARNESS_ONLY=1 inverts: hide everything that is NOT a harness
    # mesh, so we render JUST the yoke + chain + tongue. Used to make a
    # composite-able harness sprite for multi-pair teams.
    if os.environ.get('KEEP_HARNESS_ONLY', '0') == '1':
        body_hidden = 0
        for obj in mesh_objs:
            n = obj.name.lower()
            if not any(k in n for k in harness_keywords):
                obj.hide_render = True
                body_hidden += 1
        print(f"Hidden {body_hidden} non-harness mesh(es); kept yoke/chain only")

    # KEEP_ONLY="kw1,kw2": render ONLY meshes whose name contains one
    # of the listed keywords. Used to split the yoke into its sub-parts
    # (yoke beam, leather rope, iron chain) for independent compositing.
    keep_only = os.environ.get('KEEP_ONLY', '').strip()
    if keep_only:
        keep_kws = tuple(k.strip().lower() for k in keep_only.split(',') if k.strip())
        body_hidden = 0
        for obj in mesh_objs:
            n = obj.name.lower()
            if not any(k in n for k in keep_kws):
                obj.hide_render = True
                body_hidden += 1
        print(f"KEEP_ONLY={keep_only!r}: hidden {body_hidden} mesh(es)")

    # YOKE_Y_SCALE: scale yoke-related meshes along the Y axis (the ox's
    # body axis) to make the yoke read as wood when viewed from pure
    # side profile. Default 1.0 (no change). Try 2.5–4.0 for visibility.
    # YOKE_PEG_SCALE: enlarge the small wood pegs/dowels at the TOPS of
    # the yoke arches (locking pins that secure the bows). Verts above
    # YOKE_PEG_PIVOT_Z (default 1.85) get scaled in 3D away from the
    # pivot plane on Z and from each peg's local centroid on X/Y.
    peg_scale = float(os.environ.get('YOKE_PEG_SCALE', '1.0'))
    if peg_scale != 1.0:
        import bmesh
        peg_pivot_z = float(os.environ.get('YOKE_PEG_PIVOT_Z', '1.85'))
        yoke_kw = ('fakeret', 'torus')
        for obj in mesh_objs:
            n = obj.name.lower()
            if not any(k in n for k in yoke_kw): continue
            if obj.hide_render: continue
            M = obj.matrix_world
            Minv = M.inverted()
            bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
            # Identify peg verts (z>pivot) and compute X/Y centroid PER peg
            # via connected-island clustering, so scaling is around each
            # peg's own center (not the global yoke center).
            # Only OUTER pegs (at large |X|) — inside pegs in the middle
            # of the yoke shouldn't be scaled.
            peg_outer_min_x = float(os.environ.get('YOKE_PEG_OUTER_X', '0.7'))
            peg_verts = [v for v in bm.verts
                         if (M @ v.co).z > peg_pivot_z
                         and abs((M @ v.co).x) > peg_outer_min_x]
            if peg_verts:
                # Group peg verts into islands using BFS over edges
                visited = set()
                islands = []
                pverts = set(v.index for v in peg_verts)
                for s in peg_verts:
                    if s.index in visited: continue
                    stack=[s]; isl=[]
                    while stack:
                        v = stack.pop()
                        if v.index in visited or v.index not in pverts: continue
                        visited.add(v.index); isl.append(v)
                        for e in v.link_edges:
                            o = e.other_vert(v)
                            if o.index in pverts and o.index not in visited:
                                stack.append(o)
                    islands.append(isl)
                for isl in islands:
                    pts = [M @ v.co for v in isl]
                    cx = sum(p.x for p in pts) / len(pts)
                    cy = sum(p.y for p in pts) / len(pts)
                    for v in isl:
                        wp = M @ v.co
                        wp.x = cx + (wp.x - cx) * peg_scale
                        wp.y = cy + (wp.y - cy) * peg_scale
                        wp.z = peg_pivot_z + (wp.z - peg_pivot_z) * peg_scale
                        v.co = Minv @ wp
                print(f"YOKE_PEG_SCALE={peg_scale}: scaled {len(islands)} peg island(s) ({sum(len(i) for i in islands)} verts)")
            bm.to_mesh(obj.data); obj.data.update(); bm.free()

    # YOKE_BOW_STRETCH: scale verts BELOW YOKE_BOW_PIVOT_Z (default 1.7,
    # roughly the arch height) further down by this factor on world Z.
    # Used to extend the wooden bows so they wrap UNDER the ox's neck
    # instead of clipping into it. Default 1.0 (no change).
    bow_stretch = float(os.environ.get('YOKE_BOW_STRETCH', '1.0'))
    if bow_stretch != 1.0:
        import bmesh
        pivot_z = float(os.environ.get('YOKE_BOW_PIVOT_Z', '1.7'))
        yoke_kw = ('fakeret', 'torus')
        stretched = 0
        for obj in mesh_objs:
            n = obj.name.lower()
            if not any(k in n for k in yoke_kw): continue
            if obj.hide_render: continue
            M = obj.matrix_world
            Minv = M.inverted()
            bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
            for v in bm.verts:
                wp = M @ v.co
                if wp.z < pivot_z:
                    wp.z = pivot_z + (wp.z - pivot_z) * bow_stretch
                    v.co = Minv @ wp
            bm.to_mesh(obj.data); obj.data.update(); bm.free()
            stretched += 1
        print(f"YOKE_BOW_STRETCH={bow_stretch} (pivot z={pivot_z}): stretched {stretched} mesh(es)")

    # FAKERET_KILL_RINGS: delete SMALL connected-mesh islands within
    # fakeret whose top Z is below the given threshold. Targets only
    # the small metal-ring/connector pieces at chest level WITHOUT
    # touching the larger bow-and-arch wood. Default unset → keep all.
    kill_rings_z = os.environ.get('FAKERET_KILL_RINGS')
    if kill_rings_z is not None:
        import bmesh
        thr = float(kill_rings_z)
        max_island_size = int(os.environ.get('FAKERET_KILL_RINGS_MAX', '40'))
        for obj in mesh_objs:
            if 'fakeret' not in obj.name.lower(): continue
            if obj.hide_render: continue
            M = obj.matrix_world
            bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
            visited = set(); islands = []
            for s in bm.verts:
                if s.index in visited: continue
                stack=[s]; isl=[]
                while stack:
                    v = stack.pop()
                    if v.index in visited: continue
                    visited.add(v.index); isl.append(v)
                    for e in v.link_edges:
                        o = e.other_vert(v)
                        if o.index not in visited: stack.append(o)
                islands.append(isl)
            to_del = []
            killed_islands = 0
            for isl in islands:
                if len(isl) > max_island_size: continue
                top_z = max((M @ v.co).z for v in isl)
                if top_z < thr:
                    to_del.extend(isl)
                    killed_islands += 1
            if to_del:
                bmesh.ops.delete(bm, geom=to_del, context='VERTS')
            bm.to_mesh(obj.data); obj.data.update(); bm.free()
            print(f"FAKERET_KILL_RINGS<{thr} (size<={max_island_size}): killed {killed_islands} islands ({len(to_del)} verts)")

    yoke_y_scale = float(os.environ.get('YOKE_Y_SCALE', '1.0'))
    if yoke_y_scale != 1.0:
        import bmesh
        yoke_kw = ('fakeret', 'torus', 'csti_krom.001', 'krom_krom_0')
        scaled = 0
        for obj in mesh_objs:
            n = obj.name.lower()
            if not any(k in n for k in yoke_kw): continue
            if obj.hide_render: continue
            # Scale verts along WORLD Y, then COMPENSATE the UV layout so
            # the texture stays proportional (1/scale along the UV axis
            # most aligned with world Y). This avoids the stretched-grain
            # look from straight geometry scaling.
            M = obj.matrix_world
            Minv = M.inverted()
            mesh = obj.data
            # Build per-vertex world->UV influence: take the dominant
            # UV axis aligned with world-Y for this mesh.
            uv_layer = mesh.uv_layers.active
            world_ys = [(M @ v.co).y for v in mesh.vertices]
            cy = sum(world_ys) / len(world_ys) if world_ys else 0
            # Find UV axis correlated with world Y. Sample face corners.
            if uv_layer:
                samples = []
                for poly in mesh.polygons[: min(50, len(mesh.polygons))]:
                    for li in poly.loop_indices:
                        loop = mesh.loops[li]
                        wp_y = (M @ mesh.vertices[loop.vertex_index].co).y
                        uv = uv_layer.data[li].uv
                        samples.append((wp_y, uv.x, uv.y))
                if samples:
                    n = len(samples)
                    mean_y = sum(s[0] for s in samples) / n
                    mean_u = sum(s[1] for s in samples) / n
                    mean_v = sum(s[2] for s in samples) / n
                    cov_yu = sum((s[0]-mean_y)*(s[1]-mean_u) for s in samples)
                    cov_yv = sum((s[0]-mean_y)*(s[2]-mean_v) for s in samples)
                    use_v = abs(cov_yv) >= abs(cov_yu)
                    # UV needs to GROW with geometry scale so the texture
                    # tiles more (or covers proportionally more uv space)
                    # to keep apparent density constant. UV_COMP_BOOST
                    # over-compensates beyond the geometric scale (default
                    # 2× — empirically: 1.15 stretch was still visible
                    # with 1× compensation, so the texture density needs
                    # to be amplified further).
                    grow = 1.0 + (yoke_y_scale - 1.0) * float(os.environ.get('UV_COMP_BOOST', '2.0'))
                    for li in range(len(mesh.loops)):
                        uv = uv_layer.data[li].uv
                        if use_v:
                            uv.y = mean_v + (uv.y - mean_v) * grow
                        else:
                            uv.x = mean_u + (uv.x - mean_u) * grow
                    print(f"  UV-compensated {obj.name}: axis={'V' if use_v else 'U'}, UV×{grow:.3f}")

            # Scale geometry along world Y around the centroid
            bm = bmesh.new(); bm.from_mesh(mesh); bm.verts.ensure_lookup_table()
            for v in bm.verts:
                wp = M @ v.co
                wp.y = cy + (wp.y - cy) * yoke_y_scale
                v.co = Minv @ wp
            bm.to_mesh(mesh); mesh.update(); bm.free()
            scaled += 1
        print(f"YOKE_Y_SCALE={yoke_y_scale}: scaled {scaled} yoke mesh(es) along world Y")

    # HIDE_NAMES="kw1,kw2": hide meshes whose name contains any keyword.
    # Used to keep the ox + selected harness parts (rendering the
    # harness AS WORN on the ox) while dropping unwanted parts.
    hide_names = os.environ.get('HIDE_NAMES', '').strip()
    if hide_names:
        hide_kws = tuple(k.strip().lower() for k in hide_names.split(',') if k.strip())
        body_hidden = 0
        for obj in mesh_objs:
            n = obj.name.lower()
            if any(k in n for k in hide_kws):
                obj.hide_render = True
                body_hidden += 1
        print(f"HIDE_NAMES={hide_names!r}: hidden {body_hidden} mesh(es)")
    mesh_objs = [o for o in mesh_objs if not o.hide_render]

    # Recalculate normals on every imported mesh — fixes static
    # back-face artifacts. Then ALSO disable backface culling on every
    # material, which makes both sides of every polygon render. Game
    # models often have one-sided faces inside the body that get
    # exposed when bone deformation flips a face during animation.
    if os.environ.get('FIX_NORMALS', '1') == '1':
        for obj in mesh_objs:
            try:
                bpy.ops.object.select_all(action='DESELECT')
                bpy.context.view_layer.objects.active = obj
                obj.select_set(True)
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.mesh.select_all(action='SELECT')
                bpy.ops.mesh.normals_make_consistent(inside=False)
                bpy.ops.object.mode_set(mode='OBJECT')
            except Exception as e:
                print(f"  normal-recalc failed for {obj.name}: {e}")
        # Backface handling DISABLED by default. The "black triangles"
        # we were chasing turned out to be self-cast SHADOWS from sun
        # lights hitting the cow's shoulder/spine ridges and falling
        # on flatter back areas during certain leg poses — not real
        # back-face exposure. Geometry doubling Z-fights with the
        # original surface anyway. Enable via BACKFACE_FIX=1 only if
        # a model demonstrably has back-face problems AND you've
        # ruled out shadow artifacts (use NO_SUN_LIGHTS=1 to check).
        if os.environ.get('BACKFACE_FIX', '0') == '1':
            _stylize.add_geometry_double_sided()

    # The "Double Ox walk" model has 2 oxen built in — hide the far one
    # so we get a clean single-ox sprite. Disable via HIDE_FAR_OX=0.
    if os.environ.get('HIDE_FAR_OX', '1') == '1':
        _stylize.hide_far_ox()
    # Apply ox color reskin if OX_COLOR is set
    _stylize.reskin_ox_body(
        os.environ.get('OX_COLOR', '').strip().lower(),
        seed=os.environ.get('OX_SEED', ''),
    )

    # --- Determine animation frame range ---
    actions = list(bpy.data.actions)
    if not actions:
        raise SystemExit("No animation actions found in model.")
    # Use the first action's frame range. Multi-action models would need
    # explicit selection.
    action = actions[0]
    frame_start = int(action.frame_range[0])
    frame_end = int(action.frame_range[1])
    # FRAME_START / FRAME_END env vars override — useful when a model
    # ships with one big action containing multiple sub-animations
    # (idle, walk, graze, etc.) concatenated, and we want just the walk.
    env_start = os.environ.get('FRAME_START')
    env_end = os.environ.get('FRAME_END')
    if env_start is not None:
        frame_start = int(env_start)
    if env_end is not None:
        frame_end = int(env_end)
    print(f"Action: {action.name}  frames {frame_start}..{frame_end}")

    # Compute bounds (for camera placement) — same approach as render_wagon.
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

    # Camera setup — same logic as render_wagon (auto-pick length axis)
    cam_data = bpy.data.cameras.new(name='SideCam')
    cam_data.type = 'ORTHO'
    cam_data.clip_start = 0.1
    cam_data.clip_end = 1_000_000

    # Auto-pick the longer horizontal axis as "length" — but allow
    # FORCE_LENGTH_AXIS=x or =y to override. Useful for figures (e.g.,
    # T-posed cowboy whose arms make X dominant; we want camera on X
    # to see his profile, which means length must be Y).
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
        cam_data.ortho_scale = length_extent * 1.10
    else:
        cam_data.ortho_scale = extent.z * target_aspect * 1.10

    cam = bpy.data.objects.new('SideCam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    cam_distance = max(extent) * 3.0
    flip = os.environ.get('FLIP_VIEW', '0') == '1'
    sign = -1 if flip else 1
    # CAMERA_3Q_DEG: rotate camera around scene Z by N degrees off the
    # pure side axis. 0 = pure side. 30..45 gives a 3/4 angle showing
    # both depth (length axis) and width (cross axis) — useful for
    # visualizing yoked PAIRS of oxen where the pair-offset axis is
    # the same as the camera axis (pure side hides the second ox).
    rot3q_deg = float(os.environ.get('CAMERA_3Q_DEG', '0'))
    from math import radians as _rad, cos as _cos, sin as _sin
    if length_along_x:
        base_x, base_y = 0.0, cam_distance * sign
    else:
        base_x, base_y = cam_distance * sign, 0.0
    if rot3q_deg != 0:
        ang = _rad(rot3q_deg)
        rot_x = base_x * _cos(ang) - base_y * _sin(ang)
        rot_y = base_x * _sin(ang) + base_y * _cos(ang)
        base_x, base_y = rot_x, rot_y
    cam.location = (center.x + base_x, center.y + base_y, center.z)
    direction = center - Vector(cam.location)
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

    # Lighting. NO_SUN_LIGHTS=1 skips the 3-point sun setup and bumps
    # world ambient instead — useful for diagnosing whether dark
    # patches on a deformed mesh are self-cast shadows vs real geometry.
    if os.environ.get('NO_SUN_LIGHTS', '0') == '1':
        # Skip 3-point sun lights entirely
        pass
    else:
        # Reduced energies + larger angle = softer shadows. Hard cast
        # shadows from a Sun light at angle=20° were forming sharp
        # black triangles on the cow's back when the body deformed.
        # All sun lights with shadow-casting DISABLED. Directional
        # shading (top brighter than bottom etc.) still gives the cow
        # 3D form, but no cast-shadow triangles when bone deformation
        # creates protrusions like the shoulder/spine ridges.
        # Shadows still come from world ambient occlusion contribution.
        key_data = bpy.data.lights.new(name='Key', type='SUN')
        key_data.energy = 2.5
        key_data.angle = radians(45)
        key_data.color = (1.0, 0.96, 0.86)
        key_data.use_shadow = False
        key = bpy.data.objects.new('Key', key_data)
        bpy.context.scene.collection.objects.link(key)
        key.location = (center.x + extent.x, center.y - extent.y * 0.3, center.z + extent.z * 1.5)
        key.rotation_euler = (radians(45), 0, radians(45))

        fill_data = bpy.data.lights.new(name='Fill', type='SUN')
        fill_data.energy = 1.0
        fill_data.angle = radians(60)
        fill_data.color = (0.84, 0.92, 1.0)
        fill_data.use_shadow = False
        fill = bpy.data.objects.new('Fill', fill_data)
        bpy.context.scene.collection.objects.link(fill)
        fill.location = (center.x + extent.x, center.y + extent.y * 0.3, center.z)
        fill.rotation_euler = (radians(75), 0, radians(135))

        rim_data = bpy.data.lights.new(name='Rim', type='SUN')
        rim_data.energy = 1.2
        rim_data.angle = radians(45)
        rim_data.color = (1.0, 1.0, 0.95)
        rim_data.use_shadow = False
        rim = bpy.data.objects.new('Rim', rim_data)
        bpy.context.scene.collection.objects.link(rim)
        rim.location = (center.x - extent.x, center.y, center.z + extent.z * 1.2)
        rim.rotation_euler = (radians(135), 0, radians(-90))

    # World background
    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg is not None:
        bg.inputs['Color'].default_value = (0.96, 0.93, 0.85, 1.0)
        # Bumped ambient (was 0.4) helps fill in self-cast shadows on
        # the deforming mesh — directional lights still set the look,
        # ambient prevents harsh shadow triangles in the dark patches.
        bg.inputs['Strength'].default_value = (
            3.0 if os.environ.get('NO_SUN_LIGHTS', '0') == '1' else 1.2
        )

    # Render settings
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'

    # Cycles + OptiX
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
    # FLAT_LIGHTING=1 disables indirect bouncing + AO so a deformed
    # mesh with self-intersections doesn't render dark patches where
    # one body part penetrates another. Kills realism a touch
    # (no contact shadows under the cow's belly etc) but eliminates
    # the artifact-during-animation problem.
    if os.environ.get('FLAT_LIGHTING', '0') == '1':
        scene.cycles.diffuse_bounces = 0
        scene.cycles.glossy_bounces = 0
        scene.cycles.transmission_bounces = 0
        scene.cycles.volume_bounces = 0
        scene.cycles.transparent_max_bounces = 0
        scene.cycles.max_bounces = 0
        if scene.world:
            try:
                scene.world.light_settings.use_ambient_occlusion = False
            except AttributeError:
                pass  # Blender 5.x renamed/moved AO setting

    # CLEAR_LOCATION_KEYS=1: remove all location keyframes from the
    # action so the cow walks in place (only rotation keyframes remain
    # → bones rotate through their gait, no body translation). This is
    # the cleanest way to convert a forward-walking source animation
    # into a true walk-in-place cycle. Doesn't touch rotation or scale.
    if os.environ.get('CLEAR_LOCATION_KEYS', '0') == '1':
        cleared = 0
        for action in bpy.data.actions:
            # Blender 5.x action structure: action.layers[].strips[].channelbags[].fcurves
            fcurves = []
            if hasattr(action, 'fcurves') and action.fcurves:
                fcurves.extend(action.fcurves)
            if hasattr(action, 'layers'):
                for layer in action.layers:
                    for strip in (layer.strips if hasattr(layer, 'strips') else []):
                        for cb in (strip.channelbags if hasattr(strip, 'channelbags') else []):
                            if hasattr(cb, 'fcurves'):
                                fcurves.extend(cb.fcurves)
            # Remove fcurves whose data_path ends in 'location'
            for fc in list(fcurves):
                if fc.data_path.endswith('.location') or fc.data_path == 'location':
                    # Find the parent collection and remove
                    for cb in (
                        [action] +
                        [s for layer in getattr(action, 'layers', []) for s in layer.strips]
                    ):
                        try:
                            for collection in (
                                [cb.fcurves] if hasattr(cb, 'fcurves') and cb.fcurves else []
                            ) + [
                                bag.fcurves for layer in getattr(action, 'layers', [])
                                for strip in layer.strips
                                for bag in strip.channelbags
                                if hasattr(bag, 'fcurves')
                            ]:
                                if fc in list(collection):
                                    collection.remove(fc)
                                    cleared += 1
                                    break
                        except Exception:
                            pass
                        if fc not in fcurves:
                            break
        print(f"CLEAR_LOCATION_KEYS: removed {cleared} location-fcurves "
              f"(action loops in place, no forward translation)")

    # Optional: lock the body to a reference position so the animation
    # plays in-place even if the source action has cumulative drift in
    # sub-bones. Computes a reference centroid at frame_start, then per
    # frame translates the armature to put the current centroid back
    # to that reference. Result: legs/gait cycle through their full
    # motion, body stays anchored. Enable via LOCK_BODY_POSITION=1.
    lock_body = os.environ.get('LOCK_BODY_POSITION', '0') == '1'
    armature = next((o for o in bpy.context.scene.objects if o.type == 'ARMATURE'), None)
    reference_centroid = None
    if lock_body and armature:
        # Compute reference centroid at frame_start. Use the largest
        # mesh deformed by the armature.
        body_mesh = None
        for obj in bpy.context.scene.objects:
            if obj.type != 'MESH' or obj.hide_render or not obj.data:
                continue
            if body_mesh is None or len(obj.data.polygons) > len(body_mesh.data.polygons):
                body_mesh = obj
        if body_mesh:
            scene.frame_set(int(frame_start))
            bpy.context.view_layer.update()
            deps = bpy.context.evaluated_depsgraph_get()
            ev = body_mesh.evaluated_get(deps).data
            verts_world = [body_mesh.matrix_world @ v.co for v in ev.vertices]
            if verts_world:
                reference_centroid = Vector((
                    sum(v.x for v in verts_world) / len(verts_world),
                    sum(v.y for v in verts_world) / len(verts_world),
                    sum(v.z for v in verts_world) / len(verts_world),
                ))
                print(f"LOCK_BODY_POSITION: reference centroid (frame {frame_start}) = "
                      f"({reference_centroid.x:.2f}, {reference_centroid.y:.2f}, {reference_centroid.z:.2f})")
        else:
            print("LOCK_BODY_POSITION: no body mesh found, skipping")
            reference_centroid = None
    initial_armature_loc = armature.location.copy() if armature else None

    # Sample N frames evenly across the action's range using SUB-FRAME
    # precision. Formula: action position = start + i * span / N,
    # where i goes 0..N-1. Exclusive end sampling — the loop step
    # (frame N-1 → frame 0) is the same span/N action distance as every
    # other step, so the cycle wraps smoothly with no jank at the seam.
    # Sub-frame avoids the integer-rounding error that would offset
    # specific frames by up to half a frame, distorting the loop.
    frame_span = frame_end - frame_start
    for i in range(frame_count):
        action_pos = frame_start + frame_span * i / frame_count
        frame_int = int(action_pos)
        subframe = action_pos - frame_int
        # Reset armature location before sampling (counter-translation
        # from previous frame would compound)
        if armature and initial_armature_loc is not None:
            armature.location = initial_armature_loc.copy()
        scene.frame_set(frame_int, subframe=subframe)

        # Apply per-frame body-lock counter-translation
        if reference_centroid and body_mesh and armature:
            bpy.context.view_layer.update()
            deps = bpy.context.evaluated_depsgraph_get()
            ev = body_mesh.evaluated_get(deps).data
            verts_world = [body_mesh.matrix_world @ v.co for v in ev.vertices]
            if verts_world:
                cur = Vector((
                    sum(v.x for v in verts_world) / len(verts_world),
                    sum(v.y for v in verts_world) / len(verts_world),
                    sum(v.z for v in verts_world) / len(verts_world),
                ))
                offset = reference_centroid - cur
                armature.location = initial_armature_loc + offset
                bpy.context.view_layer.update()

        out_path = os.path.join(output_dir, f"{basename}--{i:02d}.png")
        scene.render.filepath = out_path
        bpy.ops.render.render(write_still=True)
        print(f"  frame {i:02d} (action {action_pos:.3f}) → {out_path}")

    print(f"\nWrote {frame_count} frames to {output_dir}/")


if __name__ == "__main__":
    main()
