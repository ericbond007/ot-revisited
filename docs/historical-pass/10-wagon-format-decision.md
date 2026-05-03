# Wagon + Ox Render Format — Decision

Synthesizes findings from docs 06–09 into a format-decision recommendation for the wagon + ox-team visual rework.

---

## The two options on the table

| | **Option 2 — All-raster painted** | **Option 4 — SVG vectors with raster pattern fills** |
|---|---|---|
| **Wagon body** | Painted via SDXL (or hand) — one image per `(model × condition-stop)` combo | SVG paths/shapes with raster `<pattern>` fills (canvas weave, weathered wood) |
| **Ox team** | Could be painted (combinatorial cost) or stay SVG | Stays SVG, animal silhouette overlaid with leather/hide pattern fills |
| **Accessories** | Either pre-baked into the wagon image (tightly-coupled state) OR composed as SVG `<image>` overlays at fixed anchor points | SVG `<symbol>` per accessory at named anchor points; toggle by game state |
| **Wear states** | Bake 5 wear stops × 3 wagon models = 15 painted variants minimum | SVG-overlaid wear elements (patches, rust streaks, mud, splints) toggled by condition |
| **State combinations** | Each combo needs its own variant unless using SVG-overlay layering on top of base raster (which moves toward option 4) | Pure code — game state drives visibility |
| **Painterly fidelity** | High — SDXL paints what we ask, including weave, brushwork, color drift | Medium-high — pattern fills give painterly surfaces, but composition is geometric |
| **Authoring lift** | Moderate — generate prompts + iterate, like backdrops | High — every shape, anchor, wear element needs hand-authored SVG |
| **Iteration speed** | Slow — regenerate to tweak | Fast — change a CSS-like value or a path |

---

## What the research surfaced that matters

From docs 06–09:

1. **The wear progression is the visual centerpiece** (doc 09). Five stops × 3 wagon models is 15 conditions; if we split canvas-state from body-state to model independent decay, that's 5 × 5 × 3 = 75 combinations. **Combinatorial.**

2. **Accessories appear/disappear based on inventory** (doc 08): butter pail, chicken coop, milk cow, water keg etc. Each has a fixed anchor point on the wagon. They don't compose into the wagon image — they sit at named positions and toggle.

3. **Ox team is variable count + mixed kind** (doc 07): 1–6 animals, ox vs mule, with corresponding driver position swap (walking-bullwhacker vs seated-muleskinner). Already SVG (OxTeam.svelte) — pulling it back to raster doesn't gain anything and loses the count flexibility.

4. **Period-correctness signals are small but iconic** (doc 06–08): horns on oxen, yoke beam shape, tar bucket dangling from rear axle, pail under wagon for butter, chicken coop strap pattern. These are *small* visual cues — readable at our render scale but easy to omit.

5. **Patches and rust streaks are SVG-natural** (doc 09): mismatched fabric patches as `<path>` elements with pattern fills (calico print pattern!), rust as `<path>` strokes, drawstring knots as `<circle>`s. Adding/removing each as condition changes is trivial in SVG, painful in raster.

---

## Recommendation: **Option 4 (SVG + raster pattern fills)**

### Why

**The wear progression is the killer use case for option 4.** Each wear element (patch, rust streak, mud cake, splint) is a tiny piece of SVG that toggles on/off by `wagon.condition` threshold. Going raster means baking 15+ wagon-body variants and 25+ canvas-state combinations, and Dave has to wait through an SDXL queue every time he wants to re-tune a wear stop.

**Accessories are inherently overlay-shaped.** They appear and disappear independently of wagon condition. That's exactly what `{#if inventory.chicken > 0}` controls naturally in SVG. In raster, you'd either bake every combination (combinatorial) or have a "naked wagon" raster + SVG accessory overlays (which is option 4-flavored for the accessories anyway).

**The ox team already proved this approach works.** OxTeam.svelte is SVG-driven, scales by `oxCount`, swaps to mule rendering, supports gait animation. Pulling it to raster would be regression. Wagon body should match.

**Iteration speed.** Dave will tune this — adjust the wagon proportions, move an anchor, try a different patch color. SVG = code change, refresh, see it. Raster = regenerate, evaluate, regenerate. With 15+ variants, each tweak is a multi-hour cycle.

**Painterly aesthetic via raster pattern fills.** SDXL generates seamless tileable textures (we already have the pipeline from groundtex experiments — even if the trail-strip texture didn't land, the *technique* of generating tileable patterns works). One canvas-weave texture, one weathered-wood texture, one wagon-blue-paint-flake texture, one rust-streak texture. The SVG paths are colored by these patterns, giving painterly surfaces inside vector control.

### What option 2 wins on (and what we're giving up)

Option 2 (all-raster) wins on:
- **Brushwork detail** — SDXL puts in tiny painterly inflections that hand-authored SVG won't match
- **Lighting consistency** — a painted image has natural shadows + highlights; SVG would need explicit shading paths
- **Speed of "looks great" first impression** — a good SDXL gen lands looking polished; SVG primitives need tuning to look as nice

If those are the things that *most* matter (brushwork integrity, lighting), option 2 is preferable. But based on the research, the things that matter for *this* game are state-driven visual change and gameplay-fidelity — not high-art painted detail at 1280×400.

### Hybrid escape valve

If during implementation we discover SVG can't carry the painterly look at our render scale, we can pivot to **option 3-flavored hybrid**: keep the SVG infrastructure (anchors, accessory toggling, wear-overlay system), but swap the wagon-body **base** from SVG paths to a painted raster (3 models × 5 condition stops = 15 paintings, one per combo). The accessory and wear-overlay layers stay SVG. This costs 15 variants instead of 75 (still bounded) and keeps state-driven flexibility on top.

So: start with full option 4. Pivot to hybrid if needed. Don't start with option 2 — it locks us into the variant explosion.

---

## What this means for the build sequence

Phase A — foundation:
1. Refactor `Wagon.svelte` into SVG with named anchor groups (jockey-box-anchor, water-keg-anchor, churn-anchor, coop-anchor, etc.)
2. Generate 4–6 small seamless raster textures via SDXL (canvas weave, weathered wood, wagon-blue-paint, wagon-green-paint, rust, leather harness)
3. Ship a "fresh / Stop 0" rendering, use as baseline

Phase B — accessory overlays:
1. SVG `<symbol>` per accessory: tar bucket, water keg, jockey box, butter pail, chicken coop, milk cow, axe, feed trough
2. Game-state-driven `{#if}` toggles
3. Test each accessory's visibility logic

Phase C — wear progression:
1. Add patch/rust/mud/splint/scorch SVG layers driven by `wagon.condition` thresholds
2. Tune patch colors (calico prints from generated pattern, matching the period detail)
3. Test all 5 condition stops

Phase D — ox team detail:
1. Update `OxTeam.svelte` per doc 07: yoke beam + bows visible, lead/swing/wheel pair distinction in proportions, horns on oxen, mule harness as alternate render
2. Add walking driver figure (bullwhacker beside ox team / seated muleskinner for mule team)

Phase E — accessories tuning + animation polish:
1. Butter-pail swing animation
2. Coop sway
3. Milk cow walking gait
4. Wagon body bob (already done — extend if needed)

Phase F (deferred — phase 2):
1. Party member figures walking alongside

---

## Decision

**Recommended: Option 4 (SVG + raster pattern fills).** Hybrid (option 3 with hand-authored SVG body, raster body) is the escape valve if SVG paths can't carry the painterly look during implementation.

Format decision is **locked** pending Dave's approval here. Build sequence above is the implementation plan.
