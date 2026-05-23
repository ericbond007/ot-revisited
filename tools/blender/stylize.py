"""Painterly stylization pass for Blender renders.

Default Cycles output is photoreal; the rest of the game is FLUX-painterly,
so a clean photo of a wagon on a watercolor backdrop reads as "magazine
clipping glued onto a painting." This module pushes the render toward
the project's painterly aesthetic without leaving Blender:

  1. Lighting: enlarges sun-light angle, lowers energy → soft shadows
     instead of crisp cast shadows.
  2. Materials: override roughness on every Principled BSDF in the scene
     to a high constant (kills the specular highlights that scream CGI).
  3. Freestyle: thin warm-brown silhouette/crease lines (painterly hint,
     NOT comic-book toon — kept subtle).
  4. Compositor: color-grade toward warm tan, gentle bloom, slight blur
     on highlights to break up CGI cleanness.

Toggle via env var: STYLIZE=1
"""

import bpy
import os
from math import radians


def stylize_enabled() -> bool:
    return os.environ.get('STYLIZE', '0') == '1'


def soften_lighting() -> None:
    """Walk all sun lights in the scene; raise their angle (= softer
    shadow edge) and drop their energy. Painterly scenes don't have
    hard cast shadows."""
    for obj in bpy.context.scene.objects:
        if obj.type != 'LIGHT':
            continue
        ld = obj.data
        if ld.type == 'SUN':
            # Default render scripts use angle=20°. Push to 60° for soft
            # diffuse shadows. Drop energy by ~40% so the scene doesn't
            # over-bright.
            ld.angle = radians(60)
            ld.energy = ld.energy * 0.65


def matte_materials() -> None:
    """For every Principled BSDF in the scene, push roughness toward 1.0
    and reduce specular intensity. Kills the high-frequency specular
    highlights and micro-reflections that are the dominant photoreal
    tell."""
    for mat in bpy.data.materials:
        if not mat.use_nodes or not mat.node_tree:
            continue
        for node in mat.node_tree.nodes:
            if node.type != 'BSDF_PRINCIPLED':
                continue
            inputs = node.inputs
            # Roughness → 0.85 (matte but not chalky)
            if 'Roughness' in inputs:
                # If a texture is plugged in, leave the texture but
                # break the link and replace with constant. Aggressive
                # but consistent.
                rough = inputs['Roughness']
                if rough.is_linked:
                    for link in list(mat.node_tree.links):
                        if link.to_socket == rough:
                            mat.node_tree.links.remove(link)
                rough.default_value = 0.85
            # Specular → 0.15 (was usually 0.5 default)
            for spec_name in ('Specular IOR Level', 'Specular'):
                if spec_name in inputs:
                    s = inputs[spec_name]
                    if s.is_linked:
                        for link in list(mat.node_tree.links):
                            if link.to_socket == s:
                                mat.node_tree.links.remove(link)
                    s.default_value = 0.15
                    break
            # Reduce metallic — most period materials shouldn't read as metal
            if 'Metallic' in inputs:
                m = inputs['Metallic']
                if not m.is_linked and m.default_value > 0.3:
                    m.default_value = 0.0


def enable_freestyle() -> None:
    """Subtle painterly silhouette/crease lines.

    The trick: thin (1.0px), warm-dark-brown not pure black, AND only
    drawn on silhouette + sharp creases (not every edge). This reads as
    "the painter outlined the form" rather than "it's a comic book."
    """
    scene = bpy.context.scene
    scene.render.use_freestyle = True
    view_layer = scene.view_layers[0]
    view_layer.use_freestyle = True

    # Configure the default line set.
    if not view_layer.freestyle_settings.linesets:
        return
    lineset = view_layer.freestyle_settings.linesets[0]
    # Only silhouette + crease (skip border, contour, edge marks)
    lineset.select_silhouette = True
    lineset.select_border = True
    lineset.select_crease = True
    lineset.select_edge_mark = False
    lineset.select_contour = False
    lineset.select_external_contour = False
    lineset.select_suggestive_contour = False
    lineset.select_material_boundary = True
    lineset.select_ridge_valley = False

    # Crease angle threshold — only sharp creases, not every face edge
    view_layer.freestyle_settings.crease_angle = radians(140)

    # Style the stroke: warm dark brown, more visible
    linestyle = lineset.linestyle
    linestyle.color = (0.15, 0.08, 0.04)  # warm near-black brown
    linestyle.thickness = 2.5
    linestyle.alpha = 0.95
    # Slight roundness/jitter for a painted feel — Blender exposes this
    # via the geometry modifiers; a "spatial noise" modifier adds
    # painterly waver.
    try:
        mod = linestyle.geometry_modifiers.new(name='Wobble', type='SPATIAL_NOISE')
        mod.amplitude = 0.5
        mod.scale = 80.0
        mod.octaves = 2
    except Exception:
        # Some Blender builds don't expose this — non-fatal.
        pass


def setup_compositor_grade() -> None:
    """Compositor: warm tan color shift + slight glare on highlights.
    Brings render output's color palette into the cream/tan range that
    matches FLUX backdrops.

    Blender 5.x uses scene.compositing_node_group (a NodeGroup) instead
    of the old scene.node_tree property. Both are CompositorNodeTrees
    underneath.
    """
    scene = bpy.context.scene
    scene.use_nodes = True
    if hasattr(scene, 'compositing_node_group') and scene.compositing_node_group is None:
        ng = bpy.data.node_groups.new(name='Compositing', type='CompositorNodeTree')
        scene.compositing_node_group = ng
    tree = getattr(scene, 'compositing_node_group', None) or getattr(scene, 'node_tree', None)
    if tree is None:
        print("WARN: no compositor node tree available — skipping color grade")
        return
    # Clear default
    for n in list(tree.nodes):
        tree.nodes.remove(n)

    # Layout: RenderLayers → Kuwahara (painterly oil filter) → HueSat
    # (warm/desat) → ColorCorrection (cream-tan tint) → Composite
    rl = tree.nodes.new(type='CompositorNodeRLayers')
    rl.location = (0, 0)

    # Kuwahara filter — oil-painting / brushstroke look. The
    # ANISOTROPIC variant follows local image structure for more
    # painterly directional strokes; CLASSIC uses square neighborhoods.
    kuwa = tree.nodes.new(type='CompositorNodeKuwahara')
    kuwa.location = (300, 0)
    try:
        kuwa.variation = 'ANISOTROPIC'
    except (TypeError, AttributeError):
        pass
    # Size = how big the brushstroke is. Too big = abstract blobs;
    # too small = nearly invisible. 6–10 reads as oil-painting strokes.
    if 'Size' in kuwa.inputs:
        kuwa.inputs['Size'].default_value = float(os.environ.get('STYLIZE_KUWAHARA', '8'))
    # Sharpness controls how soft/painterly the strokes blend.
    if 'Sharpness' in kuwa.inputs:
        kuwa.inputs['Sharpness'].default_value = 0.4

    # Hue/Saturation: gentle desaturation + slight warm shift
    hsv = tree.nodes.new(type='CompositorNodeHueSat')
    hsv.location = (600, 0)
    hsv.inputs['Hue'].default_value = 0.51    # tiny warm shift
    hsv.inputs['Saturation'].default_value = float(os.environ.get('STYLIZE_SATURATION', '0.85'))
    hsv.inputs['Value'].default_value = 1.0

    # ColorCorrection: tint master toward cream/tan to match FLUX
    # backdrops. Use master.gain to multiply by warm cream; lift to
    # warm shadows.
    cc = tree.nodes.new(type='CompositorNodeColorCorrection')
    cc.location = (900, 0)
    # Master tints (these properties are component-wise)
    try:
        cc.master_gain = 1.0
        cc.master_lift = 0.02
        cc.master_gamma = 1.0
        cc.master_saturation = 0.95
    except AttributeError:
        pass
    # Optional: red lift slightly higher than blue for warm-shift overall
    try:
        cc.midtones_red = 1.05
        cc.midtones_blue = 0.97
    except AttributeError:
        pass

    # Blender 5.1 dropped CompositorNodeComposite. Compositor output is
    # now via a NodeGroupOutput on the compositing_node_group, with the
    # group's interface defining a single 'Image' output socket.
    output_node = tree.nodes.new(type='NodeGroupOutput')
    output_node.location = (1200, 0)
    # Ensure the group has an Image output socket.
    if not any(s.name == 'Image' and s.in_out == 'OUTPUT' for s in tree.interface.items_tree if hasattr(s, 'in_out')):
        tree.interface.new_socket(name='Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    # Find the newly-created Image input socket on the output node.
    out_image_input = None
    for sock in output_node.inputs:
        if sock.name == 'Image':
            out_image_input = sock
            break
    if out_image_input is None and len(output_node.inputs) > 0:
        out_image_input = output_node.inputs[0]

    links = tree.links
    links.new(rl.outputs['Image'], kuwa.inputs['Image'])
    links.new(kuwa.outputs['Image'], hsv.inputs['Image'])
    links.new(hsv.outputs['Image'], cc.inputs['Image'])
    if out_image_input is not None:
        links.new(cc.outputs['Image'], out_image_input)


# --- Per-ox color reskin ---------------------------------------------------
#
# Period-correct ox/cow palette for an Oregon Trail emigrant team. The
# reskin keeps the original texture (fur detail, dirt, AO, weathering)
# and inserts a MULTIPLY node so values here act as a TINT applied to
# the texture's white point, not a flat replacement. So a tint of
# (0.55, 0.20, 0.10) means "fully-lit fur reads as that color, and
# darker fur in the texture reads as darker shades of the same hue."
#
# Linear sRGB (Blender's working space). Tint values are calibrated for
# multiply against the existing Hungarian Grey texture, which has
# approx mean luminance 0.6.
OX_COLORS = {
    'gray':      (1.00, 0.97, 0.92),  # near-white tint — keep original Hungarian Grey
    'devon':     (0.55, 0.20, 0.10),  # Devon Red
    'angus':     (0.18, 0.15, 0.13),  # Aberdeen Angus — strongly darken
    'durham':    (0.62, 0.32, 0.18),  # Durham/Shorthorn — mid red-brown
    'roan':      (0.78, 0.50, 0.42),  # Durham roan — light reddish
    'brindle':   (0.32, 0.22, 0.16),  # Brindle — dark mottled brown
    'red':       (0.65, 0.25, 0.12),  # generic red ox
    'black':     (0.20, 0.17, 0.15),  # alias for angus
    'white':     (1.10, 1.05, 0.95),  # brighten + warm — rare-but-attested
}


def add_geometry_double_sided() -> None:
    """For each visible mesh, add a flipped-winding DUPLICATE of every
    face — created from DUPLICATED vertices, not the originals.

    Why duplicate vertices: bmesh treats a face by its vertex *set*,
    not winding order, so creating a face with the same verts in
    reversed order gives back the same face (no-op). Building the new
    face from new verts lets bmesh see it as a different face. The
    duplicated verts sit at the same world position as the originals
    but are not connected to any other geometry, so the flipped face
    is a true geometric duplicate facing the opposite direction.

    Result: every visible surface has a counterpart on the other
    side. Bone deformation cannot expose an unshaded back-face or
    a real hole — there's always a properly-oriented face to render.
    Adds ~2× faces and ~2× verts. Render time bump is small for
    low-poly models like our cow (2985 polys).
    """
    import bmesh
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH' or obj.hide_render or not obj.data:
            continue
        mesh = obj.data
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.verts.ensure_lookup_table()
        bm.faces.ensure_lookup_table()

        original_faces = list(bm.faces)
        original_verts = list(bm.verts)

        # Duplicate every vertex (new verts are detached — no edges/faces yet)
        vert_dup = {v: bm.verts.new(v.co) for v in original_verts}

        added = 0
        for face in original_faces:
            try:
                flipped = [vert_dup[v] for v in face.verts][::-1]
                nf = bm.faces.new(flipped)
                nf.material_index = face.material_index
                nf.smooth = face.smooth
                added += 1
            except (ValueError, KeyError):
                pass

        bm.normal_update()
        bm.to_mesh(mesh)
        mesh.update()
        bm.free()
        print(f"  geometry-double-sided: {obj.name} +{added} flipped faces "
              f"(now {len(mesh.polygons)} polys, {len(mesh.vertices)} verts)")


def make_backfaces_double_sided() -> None:
    """For every Cycles material in the scene, ensure back-facing
    fragments render with the FRONT-face shading. Achieved by
    intercepting the BSDF's Normal input — when Geometry.Backfacing=1,
    we flip the normal so the lighting computation treats the back
    face as if it were a front face. The shader graph then produces
    the same color/texture on both sides; no black or transparent
    triangles when bone deformation flips a face's visible side.
    """
    for mat in bpy.data.materials:
        if not mat.use_nodes or not mat.node_tree:
            continue
        nt = mat.node_tree
        # Find the principled BSDF that drives the surface
        bsdf = None
        for n in nt.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                bsdf = n
                break
        if bsdf is None:
            continue
        normal_in = bsdf.inputs.get('Normal')
        if normal_in is None:
            continue
        # Skip if already wrapped (label tag)
        if any(n.label == 'NormalFlipMix' for n in nt.nodes):
            continue

        # Build: existing-Normal-source (or Geometry.Normal default)
        # → VectorMath(Multiply by -1) → Mix(factor=Backfacing) → BSDF.Normal
        geo = nt.nodes.new(type='ShaderNodeNewGeometry')
        # Original normal source: either the linked one, or geo.Normal
        if normal_in.is_linked:
            orig_normal_socket = normal_in.links[0].from_socket
            nt.links.remove(normal_in.links[0])
        else:
            orig_normal_socket = geo.outputs['Normal']

        flip = nt.nodes.new(type='ShaderNodeVectorMath')
        flip.operation = 'MULTIPLY'
        flip.inputs[1].default_value = (-1.0, -1.0, -1.0)
        nt.links.new(orig_normal_socket, flip.inputs[0])

        mix = nt.nodes.new(type='ShaderNodeMix')
        mix.data_type = 'VECTOR'
        mix.label = 'NormalFlipMix'
        # Mix factor: backfacing=1 → use B (flipped); backfacing=0 → use A (original)
        nt.links.new(geo.outputs['Backfacing'], mix.inputs['Factor'])
        # ShaderNodeMix's vector inputs are named 'A' and 'B'
        a_in = next((s for s in mix.inputs if s.type == 'VECTOR' and s.name == 'A'), None)
        b_in = next((s for s in mix.inputs if s.type == 'VECTOR' and s.name == 'B'), None)
        if a_in is not None:
            nt.links.new(orig_normal_socket, a_in)
        if b_in is not None:
            nt.links.new(flip.outputs['Vector'], b_in)
        out_socket = next((s for s in mix.outputs if s.type == 'VECTOR'), mix.outputs[0])
        nt.links.new(out_socket, normal_in)
        print(f"  backface-double-sided (normal flip) applied to: {mat.name}")


def hide_far_ox() -> None:
    """The Sketchfab "Double Ox walk" GLB ships TWO oxen built into one
    model (cx ≈ ±0.55 along world X). For a side-on render, the back ox
    peeks out from behind — we want to hide it. Hide all meshes whose
    centroid is on the far side of the X-axis center (negative cx,
    behind the camera-facing ox).

    Also hides shared yoke/harness assemblies that visibly extend toward
    the back ox (the long drawbar, etc) — keeps just the near ox + its
    own attached harness pieces if present.
    """
    from mathutils import Vector
    cx_threshold = float(os.environ.get('HIDE_OX_CX', '-0.1'))
    hidden = 0
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH' or not obj.data:
            continue
        corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
        if not corners:
            continue
        cx = sum(c.x for c in corners) / len(corners)
        if cx < cx_threshold:
            obj.hide_render = True
            hidden += 1
    print(f"hide_far_ox: hid {hidden} meshes with cx < {cx_threshold}")


def reskin_ox_body(color_name: str, seed: str = '') -> None:
    """Override the body-fur color of a loaded ox model.

    The Hungarian Grey ox model in tools/blender/models/ox-walk.glb has
    ~10 generically-named materials. We identify "body" materials by
    face-count dominance (lower threshold than before so the leg fur
    gets caught too — earlier 30% threshold was too aggressive).

    For per-ox visual variety, an OX_SEED env var (or `seed` arg) jitters
    the tint slightly: same breed but each ox gets a unique shade. The
    seed string is hashed deterministically so the same seed always
    produces the same variation.

    Skipped if color_name is unknown or 'gray' (the default).
    """
    if not color_name or color_name == 'gray':
        return
    target = OX_COLORS.get(color_name)
    if target is None:
        print(f"OX_COLOR={color_name}: unknown — skipping reskin")
        return

    # Per-ox seed jitter: vary tint by ±15% per channel based on seed hash.
    if seed:
        import hashlib
        h = hashlib.md5(seed.encode()).digest()
        # Three channels: -0.15..+0.15 multiplier shift each
        jr = ((h[0] / 255) - 0.5) * 0.30
        jg = ((h[1] / 255) - 0.5) * 0.30
        jb = ((h[2] / 255) - 0.5) * 0.30
        target = (
            max(0.05, min(1.4, target[0] * (1.0 + jr))),
            max(0.05, min(1.4, target[1] * (1.0 + jg))),
            max(0.05, min(1.4, target[2] * (1.0 + jb))),
        )
        print(f"OX_COLOR={color_name} OX_SEED='{seed}': jittered tint to RGB {tuple(round(v,3) for v in target)}")
    target_rgba = (target[0], target[1], target[2], 1.0)
    if not seed:
        print(f"OX_COLOR={color_name}: reskinning body fur to RGB {target}")

    # Compute total face count per material — body fur uses the most.
    mat_face_count: dict = {}
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH' or not obj.data:
            continue
        # Count polys per material slot
        slot_counts = [0] * len(obj.material_slots)
        for poly in obj.data.polygons:
            if 0 <= poly.material_index < len(slot_counts):
                slot_counts[poly.material_index] += 1
        for slot, count in zip(obj.material_slots, slot_counts):
            if slot.material is None:
                continue
            mat_face_count[slot.material.name] = mat_face_count.get(slot.material.name, 0) + count

    if not mat_face_count:
        print("  no materials found — skipping")
        return

    # Pick the body fur materials. The Hungarian Grey Ox model has:
    # Material.010 (body, 22k faces), Material.008 + .006 (legs upper,
    # 2k each), Material.009 + .012 (legs lower / hooves, 1.5k each),
    # Material.001 (head, 0.6k). Harness/yoke parts use Material.002,
    # .003, .004, krom — those should NOT be reskinned.
    #
    # Strategy: include any material >= 1.5% of the largest, but EXCLUDE
    # by name the known harness materials. This catches body + legs +
    # head while skipping the yoke leather/wood/iron pieces.
    HARNESS_MATERIAL_NAMES = {
        'Material.002',  # fakeret + Torus = wood frame parts
        'Material.003',  # csati_huzo = leather strap
        'Material.004',  # csati_bor = leather skin/hide pad
        'krom',          # csti_krom = chrome/iron pieces
    }
    sorted_mats = sorted(mat_face_count.items(), key=lambda kv: kv[1], reverse=True)
    print(f"  materials by face count: {sorted_mats[:8]}")
    top_count = sorted_mats[0][1]
    body_mats = [
        name for name, count in sorted_mats
        if count >= top_count * 0.015 and name not in HARNESS_MATERIAL_NAMES
    ]
    print(f"  treating as body (will tint): {body_mats}")
    skipped = [n for n, _ in sorted_mats if n in HARNESS_MATERIAL_NAMES]
    print(f"  preserving harness/yoke materials: {skipped}")

    for mat_name in body_mats:
        mat = bpy.data.materials.get(mat_name)
        if not mat or not mat.use_nodes or not mat.node_tree:
            continue
        for node in mat.node_tree.nodes:
            if node.type != 'BSDF_PRINCIPLED':
                continue
            base = node.inputs.get('Base Color')
            if base is None:
                continue
            if base.is_linked:
                # Insert a Mix(MULTIPLY) node between the texture and
                # the BSDF base color so the texture's detail (fur, AO,
                # weathering) is preserved but tinted to the desired
                # color. Try ShaderNodeMix first (Blender 4+), fall
                # back to ShaderNodeMixRGB.
                existing_link = next(
                    (l for l in mat.node_tree.links if l.to_socket == base),
                    None,
                )
                if existing_link is None:
                    base.default_value = target_rgba
                    continue
                source_socket = existing_link.from_socket
                mat.node_tree.links.remove(existing_link)

                mix_node = None
                try:
                    mix_node = mat.node_tree.nodes.new(type='ShaderNodeMix')
                    mix_node.data_type = 'RGBA'
                except (RuntimeError, AttributeError):
                    try:
                        mix_node = mat.node_tree.nodes.new(type='ShaderNodeMixRGB')
                    except (RuntimeError, AttributeError):
                        # No mix node available — fall back to flat fill
                        base.default_value = target_rgba
                        continue
                mix_node.label = f"OX_COLOR={color_name} tint"
                # Multiply blend
                if hasattr(mix_node, 'blend_type'):
                    mix_node.blend_type = 'MULTIPLY'
                fac_in = mix_node.inputs.get('Factor') or mix_node.inputs.get('Fac') or mix_node.inputs[0]
                fac_in.default_value = 1.0
                # Find color A (texture) and color B (tint) inputs.
                # ShaderNodeMix uses A/B labels; ShaderNodeMixRGB uses
                # positional 1/2.
                rgba_inputs = [i for i in mix_node.inputs if i.type == 'RGBA']
                a_in = next((i for i in rgba_inputs if i.name in ('A', 'Color1', 'Image')), None)
                b_in = next((i for i in rgba_inputs if i.name in ('B', 'Color2') and i is not a_in), None)
                # Fallbacks for older naming
                if a_in is None and len(rgba_inputs) >= 1:
                    a_in = rgba_inputs[0]
                if b_in is None and len(rgba_inputs) >= 2:
                    b_in = rgba_inputs[1]
                if a_in is not None:
                    mat.node_tree.links.new(source_socket, a_in)
                if b_in is not None:
                    b_in.default_value = target_rgba
                # Hook output back into BSDF base color
                out = mix_node.outputs.get('Result') or mix_node.outputs.get('Color') or mix_node.outputs[0]
                mat.node_tree.links.new(out, base)
                print(f"  inserted {color_name} multiply tint into {mat_name} (texture preserved)")
            else:
                # No texture — just set flat color
                base.default_value = target_rgba
                print(f"  set {mat_name} base color (no texture present)")


def stylize() -> None:
    """Apply all stylization passes if STYLIZE=1, else no-op.

    Skipping Freestyle by default — FLUX backdrops are soft-edge
    watercolor, hard ink lines look out of place against them. Re-enable
    via STYLIZE_OUTLINES=1 if needed.
    """
    if not stylize_enabled():
        return
    print("STYLIZE=1: applying painterly post-processing")
    soften_lighting()
    matte_materials()
    if os.environ.get('STYLIZE_OUTLINES', '0') == '1':
        enable_freestyle()
    setup_compositor_grade()
