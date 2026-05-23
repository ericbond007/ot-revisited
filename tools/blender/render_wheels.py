"""Render N frames of WAGON WHEELS rotating in place.

Pipeline strategy: render the wagon body WITHOUT visible wheels in
render_wagon.py (we'll add a hide-by-material flag there), and render
the wheels alone here as a rotating sprite cycle. Composite in SVG:
the body raster underneath, the wheel-cycle raster overlaid at each
wheel's position.

Usage:
    blender -b -P render_wheels.py -- <model.glb> <output_dir> <basename> [width] [height] [frame_count] [wheel_material]

The default wheel material name is 'WholeWheelSet' (Conestoga). For
other models, pass the wheel-material name explicitly.

Approach: find mesh objects whose material slots include the named
material, isolate them in render (hide everything else), keyframe
their rotation around the axle axis (X for Y-length models, Y for
X-length models — auto-detected from bounds), render N frames.
"""

import bpy
import json
import os
import sys
from mathutils import Vector
from math import radians, pi


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(args) < 3:
        print("ERROR: pass <model_path> <output_dir> <basename> [width] [height] [frame_count] [wheel_material]")
        return
    model_path = args[0]
    output_dir = args[1]
    basename = args[2]
    width = int(args[3]) if len(args) > 3 else 512
    height = int(args[4]) if len(args) > 4 else 512
    frame_count = int(args[5]) if len(args) > 5 else 12
    wheel_material = args[6] if len(args) > 6 else "WholeWheelSet"

    os.makedirs(output_dir, exist_ok=True)
    print(f"Loading: {model_path}")
    print(f"Wheel material: {wheel_material}")

    # Clear default scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for cam in list(bpy.data.cameras):
        bpy.data.cameras.remove(cam)
    for light in list(bpy.data.lights):
        bpy.data.lights.remove(light)

    bpy.ops.import_scene.gltf(filepath=model_path)

    # Identify wheel meshes by material name
    wheel_objs = []
    other_objs = []
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        wheel = any(slot.material and slot.material.name == wheel_material for slot in obj.material_slots)
        (wheel_objs if wheel else other_objs).append(obj)

    print(f"Wheel meshes: {len(wheel_objs)}")
    print(f"Other meshes: {len(other_objs)}  (will be hidden during render)")

    if not wheel_objs:
        print(f"ERROR: no meshes found with material '{wheel_material}'")
        print("Available materials:")
        mats = set()
        for obj in bpy.context.scene.objects:
            if obj.type == 'MESH':
                for slot in obj.material_slots:
                    if slot.material:
                        mats.add(slot.material.name)
        for m in sorted(mats):
            print(f"  - {m}")
        return

    # Hide non-wheel meshes from render
    for obj in other_objs:
        obj.hide_render = True

    # The Conestoga's WholeWheelSet is one merged mesh containing all 4
    # wheels (plus likely the tongue/drawbar) baked into one mesh that
    # ISN'T topologically welded. Loose-separate explodes it into
    # hundreds of pieces (each spoke, hub bolt, rim segment).
    #
    # Strategy: separate-loose, then cluster the resulting parts by
    # world-space centroid into 4 groups (the 4 wheels). For each group,
    # create an empty at its centroid and parent the parts to it. Rotate
    # the empty around the axle axis -> all parts in that wheel rotate
    # rigidly around the hub.
    split_parts: list = []
    for wheel in wheel_objs:
        bpy.ops.object.select_all(action='DESELECT')
        bpy.context.view_layer.objects.active = wheel
        wheel.select_set(True)
        try:
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.separate(type='LOOSE')
            bpy.ops.object.mode_set(mode='OBJECT')
        except Exception as e:
            print(f"  loose-separate failed for {wheel.name}: {e}")
        for sel in bpy.context.selected_objects:
            if sel.type == 'MESH':
                split_parts.append(sel)

    seen = set()
    parts: list = []
    for w in split_parts:
        if w.name in seen:
            continue
        seen.add(w.name)
        parts.append(w)
    print(f"After loose-separate: {len(parts)} parts")

    # Compute each part's world-space centroid (mean of bound_box corners)
    def part_centroid(p) -> Vector:
        corners = [p.matrix_world @ Vector(c) for c in p.bound_box]
        return sum(corners, Vector((0, 0, 0))) / 8

    def part_axis_extent(p, axis_idx) -> float:
        corners = [p.matrix_world @ Vector(c) for c in p.bound_box]
        vals = [c[axis_idx] for c in corners]
        return max(vals) - min(vals)

    centroids = [part_centroid(p) for p in parts]

    # LABEL_MANIFEST: explicit per-part labels from
    # tools/blender/label_wagon_parts.py. Bypasses ALL heuristic
    # classification (k-means, axial-tol, hide-brake-hardware, etc.)
    # when set. Each fresh part is matched to a manifest entry by
    # nearest centroid; the manifest's label decides whether the part
    # rotates with a wheel, stays stationary, or is hidden.
    manifest_path = os.environ.get('LABEL_MANIFEST', '').strip()
    manifest_loaded = False
    if manifest_path:
        with open(manifest_path) as f:
            manifest = json.load(f)
        HUB_KEYS = ['FL', 'FR', 'RL', 'RR']
        hubs = [Vector(manifest['hubs'][k]) for k in HUB_KEYS]
        wheel_radius = float(manifest.get('wheel_radius', 0.55))
        hidden_labels = set(
            l.strip() for l in
            os.environ.get('MANIFEST_HIDE_LABELS', 'brake').split(',')
            if l.strip()
        )
        # Match each fresh part to manifest by nearest centroid.
        mp_entries = manifest['parts']
        mp_centroids = [Vector(e['centroid']) for e in mp_entries]
        mp_used = [False] * len(mp_entries)
        match_tol_sq = float(os.environ.get('MANIFEST_MATCH_TOL', '0.01')) ** 2
        wheel_groups = [[] for _ in range(4)]
        stationary = []
        hidden_count = 0
        unmatched = 0
        for p, c in zip(parts, centroids):
            best_d = 1e18
            best_j = -1
            for j, mc in enumerate(mp_centroids):
                if mp_used[j]: continue
                d = (c - mc).length_squared
                if d < best_d:
                    best_d = d; best_j = j
            if best_j < 0 or best_d > match_tol_sq:
                unmatched += 1
                stationary.append((p, c))
                continue
            mp_used[best_j] = True
            lbl = mp_entries[best_j]['label']
            if lbl.startswith('wheel_'):
                key = lbl.split('_', 1)[1]
                if key in HUB_KEYS:
                    wheel_groups[HUB_KEYS.index(key)].append(p)
                else:
                    stationary.append((p, c))
            elif lbl in hidden_labels:
                p.hide_render = True
                hidden_count += 1
            else:
                stationary.append((p, c))
        print(f"LABEL_MANIFEST {manifest_path}:")
        print(f"  wheels per hub {HUB_KEYS}: {[len(g) for g in wheel_groups]}")
        print(f"  stationary: {len(stationary)}, hidden ({sorted(hidden_labels)}): {hidden_count}, unmatched: {unmatched}")
        manifest_loaded = True

    # The wheel-set mesh contains the 4 wheels PLUS structural parts
    # (tongue/drawbar, axle bars connecting wheel pairs, brake hardware).
    # We want all 4 wheels to rotate around their own hubs, while the
    # tongue + axles stay stationary (visible but not rotating).
    #
    # Strategy:
    #   1. K-means k=4 in 3D centroid space, initialized at the 4 corners
    #      of the wheel-set's XY bounding box. This converges to the
    #      4 wheel hubs because they're the densest clusters of parts.
    #   2. Per part: assign to its nearest hub. Keep parts within
    #      wheel_radius of the hub as "rotating" parts (this wheel).
    #      Parts beyond wheel_radius are kept VISIBLE but unrotated
    #      (tongue, connecting axles, brake bars).
    if not manifest_loaded:
        span_z = max(c.z for c in centroids) - min(c.z for c in centroids)
        wheel_radius = span_z * 0.55  # 10% margin past rim
        # Override via WHEEL_HARD_RADIUS for models where span_z doesn't
        # cleanly correspond to wheel diameter (e.g., chassis hardware
        # extends Z far past the actual wheel rim).
        hard_r = os.environ.get('WHEEL_HARD_RADIUS')
        if hard_r:
            wheel_radius = float(hard_r)
            print(f"WHEEL_HARD_RADIUS={wheel_radius} (overriding span_z-based estimate)")

        # MANUAL_HUBS: comma-separated triples "x1,y1,z1;x2,y2,z2;..." for
        # hand-authored hub positions. Bypasses k-means entirely. Use when
        # the model has parts that the heuristic clustering can't separate.
        manual_hubs_str = os.environ.get('MANUAL_HUBS', '').strip()
        if manual_hubs_str:
            hubs = []
            for triple in manual_hubs_str.split(';'):
                parts_xyz = [float(s) for s in triple.split(',')]
                hubs.append(Vector(parts_xyz))
            print(f"MANUAL_HUBS: {len(hubs)} hubs at {[(round(h.x,2),round(h.y,2),round(h.z,2)) for h in hubs]}")
            # Skip k-means — refined_hubs = hubs directly
            refined_hubs = hubs
        else:
            # N_HUBS=4 (4 individual wheels) or 2 (front-axle + rear-axle).
            n_hubs = int(os.environ.get('N_HUBS', '4'))
            xs = sorted(c.x for c in centroids)
            ys = sorted(c.y for c in centroids)
            zs = sorted(c.z for c in centroids)
            median_z = zs[len(zs) // 2]
            x_min, x_max = xs[len(xs) // 20], xs[-len(xs) // 20]
            y_min, y_max = ys[len(ys) // 20], ys[-len(ys) // 20]
            if n_hubs == 2:
                y_mid = (y_min + y_max) / 2
                hubs = [
                    Vector((x_min, y_mid, median_z)),
                    Vector((x_max, y_mid, median_z)),
                ]
            else:
                hubs = [
                    Vector((x_min, y_min, median_z)),
                    Vector((x_min, y_max, median_z)),
                    Vector((x_max, y_min, median_z)),
                    Vector((x_max, y_max, median_z)),
                ]
            for it in range(20):
                assignments = [0] * len(centroids)
                for i, c in enumerate(centroids):
                    best_d = float('inf')
                    best_h = 0
                    for h, hub_pos in enumerate(hubs):
                        d = (c - hub_pos).length_squared
                        if d < best_d:
                            best_d = d
                            best_h = h
                    assignments[i] = best_h
                new_hubs = []
                for h in range(len(hubs)):
                    members_c = [centroids[i] for i in range(len(centroids)) if assignments[i] == h]
                    if not members_c:
                        new_hubs.append(hubs[h])
                        continue
                    new_hubs.append(sum(members_c, Vector((0, 0, 0))) / len(members_c))
                max_shift = max((nh - oh).length for nh, oh in zip(new_hubs, hubs))
                hubs = new_hubs
                if max_shift < 0.5:
                    print(f"K-means converged after {it + 1} iterations")
                    break
            for h, hub in enumerate(hubs):
                print(f"  hub {h}: ({hub.x:.1f}, {hub.y:.1f}, {hub.z:.1f})")
            # Mean-shift refinement
            refined_hubs = []
            for h, hub in enumerate(hubs):
                for _ in range(8):
                    nearby = [c for c in centroids if (c - hub).length <= wheel_radius]
                    if not nearby: break
                    new_hub = sum(nearby, Vector((0, 0, 0))) / len(nearby)
                    if (new_hub - hub).length < 0.3:
                        hub = new_hub
                        break
                    hub = new_hub
                refined_hubs.append(hub)
            for h, hub in enumerate(refined_hubs):
                print(f"  refined hub {h}: ({hub.x:.1f}, {hub.y:.1f}, {hub.z:.1f})")
        hubs = refined_hubs

        # Per part: find the nearest hub. If within WHEEL_RADIUS_FACTOR ×
        # wheel_radius → rotate with that wheel. Else: stationary or tongue.
        # WHEEL_RADIUS_FACTOR=1.05 is a permissive default. Drop to ~0.85
        # for models where non-wheel parts share the wheel material (e.g.
        # axle bars, brake hardware) and orbit visibly when included.
        wheel_radius_factor = float(os.environ.get('WHEEL_RADIUS_FACTOR', '1.05'))
        # Also enforce a separate AXIAL filter: parts must be within the
        # wheel's axial PLANE (perpendicular to the axle) by at most
        # WHEEL_AXIAL_TOL × wheel_radius. This keeps a hub from claiming
        # parts whose axial offset (along the axle direction) is huge —
        # like the long axle bar that connects the two front wheels.
        axial_tol = float(os.environ.get('WHEEL_AXIAL_TOL', '0.6'))
        # WHEEL_AXIAL_TOL_ABS: ABSOLUTE axial-distance limit (in meters)
        # from hub Y. Wheel rim/spoke parts are thin axially (~0.05m);
        # anything farther is hardware that happens to share the wheel
        # material. Setting this overrides the factor-based tol.
        axial_tol_abs = os.environ.get('WHEEL_AXIAL_TOL_ABS')
        axial_tol_abs = float(axial_tol_abs) if axial_tol_abs else None
        # Determine axle axis index — must match the rotation axis used
        # later (Y for X-length wagon, X for Y-length).
        span_x_full_pre = max(c.x for c in centroids) - min(c.x for c in centroids)
        span_y_full_pre = max(c.y for c in centroids) - min(c.y for c in centroids)
        axle_idx = 1 if span_x_full_pre >= span_y_full_pre else 0
        # AXLE_BAR_EXTENT_RATIO: parts whose AXIAL extent (length along the
        # axle axis) is > this fraction of the wheelbase span are treated as
        # connectors (axle bars, struts that span both sides of an ax pair)
        # and forced stationary. Default 0.5 — a real wheel part has thin
        # axial extent (~rim thickness, <0.1m), while a connector spans
        # ~hub-to-hub distance (0.5+m).
        axle_bar_extent_ratio = float(os.environ.get('AXLE_BAR_EXTENT_RATIO', '0.5'))
        axle_span = max(c[axle_idx] for c in centroids) - min(c[axle_idx] for c in centroids)
        axle_bar_threshold = axle_span * axle_bar_extent_ratio

        wheel_groups: list = [[] for _ in range(len(hubs))]
        stationary: list = []
        rejected_as_connector = 0
        # BRAKE_BAR_Z_EXTENT: parts whose Z-extent exceeds this absolute
        # threshold are treated as non-wheel (brake posts, suspension
        # struts that span body→axle). Wheel rim/spokes have small Z
        # extent (< wheel_radius). Default 0.4 (anything taller than a
        # typical wheel-radius's worth in Z).
        brake_bar_z_max = float(os.environ.get('BRAKE_BAR_Z_EXTENT', '999'))
        rejected_brake = 0
        for p, c in zip(parts, centroids):
            # Reject "axle-bar"-like parts that span axially more than the threshold.
            if part_axis_extent(p, axle_idx) > axle_bar_threshold:
                stationary.append((p, c))
                rejected_as_connector += 1
                continue
            # Reject brake-post-like parts that span Z too much.
            if part_axis_extent(p, 2) > brake_bar_z_max:
                stationary.append((p, c))
                rejected_brake += 1
                continue
            in_plane_d = []
            axial_d = []
            full_d = []
            for h in hubs:
                d3 = c - h
                ax = abs(d3[axle_idx])
                ip = (d3.length_squared - ax * ax) ** 0.5
                in_plane_d.append(ip)
                axial_d.append(ax)
                full_d.append(d3.length)
            # Use FULL 3D distance to pick nearest hub — in-plane alone
            # doesn't discriminate between hubs sharing X-Z coords (i.e.,
            # left vs right wheel of a pair).
            nearest = full_d.index(min(full_d))
            axial_ok = (axial_d[nearest] <= axial_tol_abs) if axial_tol_abs is not None \
                       else (axial_d[nearest] <= wheel_radius * axial_tol)
            if in_plane_d[nearest] <= wheel_radius * wheel_radius_factor and axial_ok:
                wheel_groups[nearest].append(p)
            else:
                stationary.append((p, c))
        print(f"Wheel parts per hub: {[len(g) for g in wheel_groups]}; stationary: {len(stationary)} "
              f"(radius_factor={wheel_radius_factor}, axial_tol={axial_tol}, axle_bar_rejected={rejected_as_connector}, brake_rejected={rejected_brake})")

        # HIDE_BRAKE_HARDWARE=1: hide stationary AND rotating parts that
        # sit ABOVE the wheel hub and within the wheel-radius zone. Use
        # cylindrical XY filter so brake posts spanning tall Z get caught.
        if os.environ.get('HIDE_BRAKE_HARDWARE', '0') == '1':
            hide_above_z = float(os.environ.get('BRAKE_HIDE_ABOVE_HUB_Z', '0.0'))
            hide_radius = float(os.environ.get('BRAKE_HIDE_RADIUS', str(wheel_radius * wheel_radius_factor)))
            hidden_brake = 0

            # Only hide parts whose Z extent is SMALL (bracket-like).
            # Wheel spokes extend radially from hub to rim — their Z extent
            # is ~rim_radius (0.5m). Brake brackets sitting above the wheel
            # are compact (Z extent < 0.2m). This keeps spokes safe.
            brake_zextent_max = float(os.environ.get('BRAKE_HIDE_ZEXTENT_MAX', '0.25'))

            def in_brake_zone(c, part):
                if part_axis_extent(part, 2) > brake_zextent_max:
                    return False  # part has tall Z extent = spoke, not bracket
                for h in hubs:
                    xy_d = ((c.x - h.x)**2 + (c.y - h.y)**2) ** 0.5
                    if (c.z - h.z) > hide_above_z and xy_d < hide_radius:
                        return True
                return False

            new_stationary = []
            for p, c in stationary:
                if in_brake_zone(c, p):
                    p.hide_render = True
                    hidden_brake += 1
                else:
                    new_stationary.append((p, c))
            stationary = new_stationary

            # Also filter rotating wheel parts.
            # We need a centroid lookup — rebuild map from part name to centroid.
            centroid_map = dict(zip([p.name for p in parts], centroids))
            for h_idx, group in enumerate(wheel_groups):
                new_group = []
                for p in group:
                    c = centroid_map.get(p.name)
                    if c is not None and in_brake_zone(c, p):
                        p.hide_render = True
                        hidden_brake += 1
                    else:
                        new_group.append(p)
                wheel_groups[h_idx] = new_group

            print(f"HIDE_BRAKE_HARDWARE: hid {hidden_brake} parts above hub Z within radius {hide_radius:.2f}")

    # Identify the tongue: stationary parts that extend OUTSIDE the
    # wheelbase along the length axis (past either the front or back
    # axle). Whichever side has more parts outside is the "front"
    # direction (where the tongue hooks to the ox team).
    span_x_full = max(c.x for c in centroids) - min(c.x for c in centroids)
    span_y_full = max(c.y for c in centroids) - min(c.y for c in centroids)
    length_idx = 0 if span_x_full >= span_y_full else 1

    hub_pos_min = min(h[length_idx] for h in hubs)
    hub_pos_max = max(h[length_idx] for h in hubs)
    # Tongue parts: outside [hub_pos_min, hub_pos_max] on the length axis.
    above_max: list = []
    below_min: list = []
    in_range: list = []
    for p, c in stationary:
        if c[length_idx] > hub_pos_max + wheel_radius * 0.3:
            above_max.append((p, c))
        elif c[length_idx] < hub_pos_min - wheel_radius * 0.3:
            below_min.append((p, c))
        else:
            in_range.append((p, c))
    # Pick the side with more parts as the tongue side.
    if len(above_max) >= len(below_min):
        tongue_side = above_max
        front_pos_val = hub_pos_max
        forward_sign = 1
    else:
        tongue_side = below_min
        front_pos_val = hub_pos_min
        forward_sign = -1
    tongue_parts = [m[0] for m in tongue_side]
    other_stationary = [m[0] for m in in_range] + [m[0] for m in (below_min if forward_sign > 0 else above_max)]
    print(f"Tongue side: {'+' if forward_sign > 0 else '-'} length-axis; "
          f"tongue parts: {len(tongue_parts)}; other stationary: {len(other_stationary)}")
    # Front axle midpoint = midpoint of the two hubs on the tongue side
    # (i.e. closer to front_pos_val than to the other end). Tolerance
    # generous enough that mean-shift noise doesn't drop one of the pair.
    midpoint = (hub_pos_min + hub_pos_max) / 2
    if forward_sign > 0:
        front_hubs_pos = [h for h in hubs if h[length_idx] > midpoint]
    else:
        front_hubs_pos = [h for h in hubs if h[length_idx] < midpoint]
    if front_hubs_pos:
        front_axle_mid = sum(front_hubs_pos, Vector((0, 0, 0))) / len(front_hubs_pos)
    else:
        front_axle_mid = Vector((0, 0, 0))
    print(f"Front axle midpoint: ({front_axle_mid.x:.1f}, {front_axle_mid.y:.1f}, {front_axle_mid.z:.1f})")

    # Parent tongue parts to a pitch empty at the front axle midpoint.
    # Sinusoidal pitch (~3° peak) synced to one full wheel cycle gives
    # the wagon-end-of-tongue a subtle rise/fall as wheels turn — same
    # frequency as a road bump traversal.
    tongue_empty = None
    if tongue_parts:
        tongue_empty = bpy.data.objects.new("TonguePivot", None)
        tongue_empty.empty_display_type = 'PLAIN_AXES'
        tongue_empty.location = front_axle_mid
        bpy.context.scene.collection.objects.link(tongue_empty)
        bpy.ops.object.select_all(action='DESELECT')
        for p in tongue_parts:
            p.select_set(True)
        bpy.context.view_layer.objects.active = tongue_empty
        tongue_empty.select_set(True)
        bpy.ops.object.parent_set(type='OBJECT', keep_transform=True)

    # APPLY all transforms on wheel parts BEFORE parenting. Without this,
    # parts that inherited a non-identity matrix from the gltf importer
    # (e.g., gltf's Y-up→Z-up conversion via parent rotation) have a
    # non-identity matrix_world. Then parent_set(keep_transform=True)
    # bakes that into matrix_parent_inverse and rotation around the
    # empty's location gets compounded wrong. Applying transforms first
    # gives each part identity matrix_world, so empty.rotation_euler
    # cleanly rotates children around the empty's origin.
    bpy.ops.object.select_all(action='DESELECT')
    all_wheel_parts = [p for g in wheel_groups for p in g] + tongue_parts + [
        m[0] if isinstance(m, tuple) else m for m in stationary
    ]
    seen_apply: set = set()
    for p in all_wheel_parts:
        if not isinstance(p, bpy.types.Object): continue
        if p.name in seen_apply: continue
        seen_apply.add(p.name)
        p.select_set(True)
    if seen_apply:
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        print(f"Applied transforms to {len(seen_apply)} wheel/tongue/stationary parts")

    # Build one empty per hub, parent that wheel's parts to it.
    wheel_pivots: list = []
    for h, group_parts in enumerate(wheel_groups):
        if not group_parts:
            continue
        empty = bpy.data.objects.new(f"WheelHub_{h}", None)
        empty.empty_display_type = 'PLAIN_AXES'
        empty.location = hubs[h]
        bpy.context.scene.collection.objects.link(empty)
        bpy.ops.object.select_all(action='DESELECT')
        for p in group_parts:
            p.select_set(True)
        bpy.context.view_layer.objects.active = empty
        empty.select_set(True)
        bpy.ops.object.parent_set(type='OBJECT', keep_transform=True)
        wheel_pivots.append(empty)

    # Compute bounds from the WHOLE original scene (body + wheels) so
    # this render's camera matches render_wagon.py exactly. That way the
    # body raster (rendered separately with HIDE_MATERIAL=WholeWheelSet)
    # and these wheel-cycle frames composite cleanly in SVG at the same
    # scale and position.
    all_corners: list[Vector] = []
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        for corner in obj.bound_box:
            all_corners.append(obj.matrix_world @ Vector(corner))
    # Replace wheel_objs with the pivot empties AFTER bounds — those are
    # what we'll keyframe.
    wheel_objs = wheel_pivots
    min_v = Vector((min(v.x for v in all_corners),
                    min(v.y for v in all_corners),
                    min(v.z for v in all_corners)))
    max_v = Vector((max(v.x for v in all_corners),
                    max(v.y for v in all_corners),
                    max(v.z for v in all_corners)))
    center = (min_v + max_v) * 0.5
    extent = max_v - min_v
    print(f"Wheel set bounds: extent {extent.x:.2f} x {extent.y:.2f} x {extent.z:.2f}")

    # Auto-pick axle axis: for an emigrant wagon side view, the AXLE
    # runs perpendicular to the wagon length. If the longest horizontal
    # is X, axle is along Y (wheels rotate around Y). If longest is Y,
    # axle is along X.
    length_along_x = extent.x >= extent.y
    axle_axis = 'Y' if length_along_x else 'X'
    print(f"Length axis: {'X' if length_along_x else 'Y'}, axle axis (wheel rotation): {axle_axis}")

    # Add keyframe animation: full rotation across the cycle
    cycle_frames = 24
    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = cycle_frames

    # Default new keyframes to LINEAR interpolation (so the rotation rate
    # is constant across the cycle — bezier ease-in/out would look weird
    # for a wheel spin).
    bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'

    axis_idx = {'X': 0, 'Y': 1, 'Z': 2}[axle_axis]
    for wheel in wheel_objs:
        wheel.rotation_euler[axis_idx] = 0
        wheel.keyframe_insert(data_path='rotation_euler', frame=0, index=axis_idx)
        # One full revolution by frame cycle_frames. Wagons roll forward
        # toward decreasing length-axis; -2π gives forward rolling from
        # the camera side.
        wheel.rotation_euler[axis_idx] = -2 * pi
        wheel.keyframe_insert(data_path='rotation_euler', frame=cycle_frames, index=axis_idx)

    # Tongue pitch: subtle ~3° sinusoidal oscillation around the front
    # axle midpoint, synced one full cycle per wheel revolution. Same
    # axle_axis rotation. Use 5 keyframes (sine sample at 0, π/2, π,
    # 3π/2, 2π) with bezier interpolation for a smooth oscillation.
    if tongue_empty is not None:
        # Restore default bezier for tongue (sine needs smooth interp,
        # not linear).
        bpy.context.preferences.edit.keyframe_new_interpolation_type = 'BEZIER'
        from math import sin
        tongue_amp = radians(2.5)  # peak pitch
        n_samples = 9  # over 0..cycle_frames inclusive
        for s in range(n_samples):
            frame_n = int(round(cycle_frames * s / (n_samples - 1)))
            phase = 2 * pi * s / (n_samples - 1)
            tongue_empty.rotation_euler[axis_idx] = tongue_amp * sin(phase)
            tongue_empty.keyframe_insert(data_path='rotation_euler', frame=frame_n, index=axis_idx)
        # Restore linear default for any subsequent keyframes (none, but
        # safe).
        bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'

    # --- Camera + lighting (same as render_wagon side-on) ---
    cam_data = bpy.data.cameras.new(name='SideCam')
    cam_data.type = 'ORTHO'
    cam_data.clip_start = 0.1
    cam_data.clip_end = 1_000_000

    target_aspect = width / height
    length_extent = extent.x if length_along_x else extent.y
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

    # Lighting (3-point)
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

    # Render
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'

    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.refresh_devices()
    for dev in prefs.devices:
        if dev.type in ('OPTIX', 'CUDA'):
            dev.use = True
    scene.cycles.device = 'GPU'
    scene.cycles.samples = int(os.environ.get('CYCLES_SAMPLES', '64'))
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPTIX'

    # DIRECT_VERT_ROT=1: bypass the empty/parenting/keyframe approach
    # entirely. Snapshot wheel-part vert positions once, then for each
    # frame, transform verts directly around their assigned hub. Avoids
    # the parent_inverse complications that were making wheels orbit
    # instead of spin in place for the covered-wagon model.
    direct_rot = os.environ.get('DIRECT_VERT_ROT', '0') == '1'
    if direct_rot:
        from math import cos, sin
        # DO NOT re-center hubs on cluster centroid — chassis hardware
        # in the cluster biases the centroid AWAY from the actual wheel
        # center, which means the wheel rim/spokes orbit around the
        # chassis instead of spinning in place. Trust MANUAL_HUBS
        # (bbox-derived true wheel centers) as-is.
        # Use WHEEL_HARD_RADIUS to set a tight radius so chassis parts
        # OUTSIDE the rim get rejected to stationary, and only true
        # wheel parts (rim, spokes, hub bolts) rotate.
        # UNPARENT all wheel parts so the empty rotation doesn't apply
        # alongside our direct vert rotation. Use clear_inverse=True so
        # children keep their world position. Then delete the empties
        # and tongue empty so nothing else animates.
        for group in wheel_groups:
            for p in group:
                bpy.ops.object.select_all(action='DESELECT')
                p.select_set(True)
                bpy.context.view_layer.objects.active = p
                bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
        for empty in list(wheel_pivots):
            bpy.data.objects.remove(empty, do_unlink=True)
        if tongue_empty is not None:
            for p in tongue_parts:
                bpy.ops.object.select_all(action='DESELECT')
                p.select_set(True)
                bpy.context.view_layer.objects.active = p
                bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
            bpy.data.objects.remove(tongue_empty, do_unlink=True)
        print(f"DIRECT_VERT_ROT: unparented all wheel parts, removed {len(wheel_pivots)} empties")
        # Map each part → assigned hub_idx
        part_hub = {}
        for h_idx, group in enumerate(wheel_groups):
            for p in group:
                part_hub[p.name] = h_idx
        # Snapshot original world positions of wheel-part verts
        snapshots = {}
        for pname, h_idx in part_hub.items():
            obj = bpy.data.objects.get(pname)
            if not obj or obj.type != 'MESH': continue
            M = obj.matrix_world
            snapshots[pname] = [M @ v.co for v in obj.data.vertices]

        # Same axle index used by the keyframe path
        axle_axis_idx = axis_idx
        # Index of OTHER axes for rotation in the perpendicular plane
        other_axes = [i for i in range(3) if i != axle_axis_idx]
        oa, ob = other_axes  # rotation moves coordinates oa <-> ob

        # WHEEL_CYCLE_FRACTION: how much of a full rotation the cycle
        # covers. 1.0 = 360° (each frame at a different spoke position).
        # 1/N where N=spoke_count gives ONE SPOKE WIDTH per cycle —
        # visually a smoother, more obvious wheel-spin loop because
        # each frame's spokes are at a non-aligned position.
        # For a 12-spoke wheel, 1/12 = 30° total over the cycle, with
        # 2.5° per frame (across 12 frames) — clearly animating.
        cycle_fraction = float(os.environ.get('WHEEL_CYCLE_FRACTION', '1.0'))
        for i in range(frame_count):
            angle = -2 * pi * cycle_fraction * (i / frame_count)
            ca, sa = cos(angle), sin(angle)
            # Diagnostic: track centroid of all rotated verts per hub
            hub_vert_sums = [Vector((0,0,0)) for _ in hubs]
            hub_vert_counts = [0 for _ in hubs]
            for pname, h_idx in part_hub.items():
                obj = bpy.data.objects.get(pname)
                if not obj or obj.type != 'MESH': continue
                hub = hubs[h_idx]
                Minv = obj.matrix_world.inverted()
                orig_world = snapshots[pname]
                for vi, world_orig in enumerate(orig_world):
                    da = world_orig[oa] - hub[oa]
                    db = world_orig[ob] - hub[ob]
                    # Standard 2D rotation around hub: (a, b) → (a', b')
                    # a' = a*cos - b*sin, b' = a*sin + b*cos (CCW)
                    # Negate sa for CW rotation (forward-rolling wheel
                    # in side view): a' = a*cos + b*sin, b' = -a*sin + b*cos
                    new_a = hub[oa] + da * ca + db * sa
                    new_b = hub[ob] - da * sa + db * ca
                    new_world = Vector(world_orig)
                    new_world[oa] = new_a
                    new_world[ob] = new_b
                    obj.data.vertices[vi].co = Minv @ new_world
                    hub_vert_sums[h_idx] += new_world
                    hub_vert_counts[h_idx] += 1
                obj.data.update()
            # Diagnostic: confirm centroid stays at hub (proper rotation)

            out_path = os.path.join(output_dir, f"{basename}--{i:02d}.png")
            scene.render.filepath = out_path
            bpy.ops.render.render(write_still=True)
            print(f"  frame {i:02d} angle={angle*180/pi:.0f}° → {out_path}")
    else:
        # Render frames evenly across cycle (keyframe-based path)
        for i in range(frame_count):
            frame_n = int(round(cycle_frames * i / frame_count))
            scene.frame_set(frame_n)
            out_path = os.path.join(output_dir, f"{basename}--{i:02d}.png")
            scene.render.filepath = out_path
            bpy.ops.render.render(write_still=True)
            print(f"  frame {i:02d} (rotation phase {360*i/frame_count:.0f}°) → {out_path}")

    print(f"\nWrote {frame_count} wheel frames to {output_dir}/")


if __name__ == "__main__":
    main()
