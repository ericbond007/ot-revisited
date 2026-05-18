# Dynamic period-accurate trail debris — design

Date: 2026-05-17
Status: approved (brainstorm), pending spec review → implementation plan

## Problem

`GroundPainting.svelte` scatters 6 generic FLUX sprites
(`pebble-*`, `stick-*`, `bone-fragment`) via a hand-tuned static array.
It is the same on every screen and every playthrough, ignores terrain
and trail progress, and `debris_sprites_flux.py` has already drifted
ahead of it (categorised sprites incl. skulls/ribcage/jettisoned junk
that were never generated; `bone-fragment` no longer defined; a
referenced `DEBRIS_PLAN.md` that does not exist).

Goal: a period-accurate trail surface that visibly evolves with
**terrain** and **trail progress** — clean rocks/sticks early, animal
remains mid-trail, jettisoned cargo late with a spike at the Fort
Laramie "Camp Sacrifice", and graves that scale with the run's actual
death toll. Strictly read-only atmosphere.

Historical basis: `docs/historical-pass/01-items.md` + web research
(diarist J.G. Bruff "counted 150 dead oxen… difficult to find a
camping ground destitute of carcasses"; ~20,000 lb of bacon dumped at
Fort Laramie 1849; abandoned anvils/stoves/pianos west of Laramie;
"a grave every ~50 yards"; buffalo chips the universal plains fuel).

## Goals / non-goals

**Goals**
- Period-accurate sprite library (~20), 4 categories, single source of
  truth, consistent higher-detail style.
- Deterministic per-trail-position placement: trail at mile X always
  looks like mile X; no frame-to-frame jitter; varies with progress
  and terrain.
- Two read-only journey hooks: Fort Laramie junk spike; grave density
  ∝ actual death count.

**Non-goals**
- No new mechanics, no inventory coupling, no reactivity beyond the two
  named read-only hooks.
- No NPC-specific or game-ai coupling.
- No change to the dirt-base or rut-overlay layers.

## Approach (chosen: A — deterministic per-trail-position field)

Placement is a pure function of an absolute **cumulative trail
coordinate** `worldX` (NOT per-scene scroll — so debris is stable along
the real trail even across scene/scroll resets). Category/sprite
*weighting* is evaluated from the current frame's slowly-varying
`progress` / `terrain` / `deathCount` props (uniform across one screen
is visually exact and avoids per-slot progress math). No runtime state,
no jitter, fully unit-testable.

## Components

### 1. Sprite library — `tools/wagon-bg/debris_sprites_flux.py` + `static/wagon-bg/trail-debris/*.webp`

Single source of truth. Regenerate **all** sprites (incl. the existing
6) with enriched per-sprite + `_STYLE` prompts for more surface
texture/wear, so the whole set is style-consistent. Remove
`bone-fragment` everywhere (drift fix). Delete the dead `DEBRIS_PLAN.md`
reference from the script docstring (this spec replaces it).

| Category | Sprites |
|---|---|
| `natural` | pebble-gray, pebble-tan, pebble-rust, rock-cluster, stick-short, stick-curved, **buffalo-chips** |
| `bones` | bison-skull, pronghorn-skull, rib-cage, **ox-skull**, **long-bones** |
| `junk` | broken-wheel, discarded-barrel, abandoned-trunk, cook-stove, **anvil**, **bacon-heap** |
| `graves` | grave-mound (low unmarked dirt mound), grave-marker (crude wooden headboard/cross), grave-wolfdug (mound dug into) |

≤22 sprites; each rembg-matted webp ≲20 KB; total <~400 KB. 1024²
generation retained (detail survives the hard scene downscale).

### 2. Weighting — new pure module `src/lib/ui/wagon/terrain/debris-field.ts`

`trail-progress.ts` unchanged (`trailProgress(miles)→0..1`,
`TOTAL_TRAIL_MILES`). New module:

```
p          = trailProgress(milesTraveled)            // 0..1
pLaramie   = trailProgress(milesAtFortLaramie)       // from LANDMARKS
ss(a,b,x)  = smoothstep
```

Category weights (then normalised to a simplex for the per-slot pick):

- `natural` = 1.0 (≈flat). Within natural, `buffalo-chips` relative
  weight = (terrain ∈ {prairie, desert}) ? 0.9 : 0.05; remaining
  natural sprites split the rest evenly.
- `bones` = (0.15 + 0.85·ss(0.12, 0.55, p)) · tMul, where
  tMul = 1.5 (prairie/desert), 0.6 (forest/mountains), else 1.0.
- `junk` = 1.1·ss(0.22, 0.85, p) + spike, where
  spike = 1.6·exp(−((p − pLaramie)/0.05)²) if the Fort Laramie
  landmark resolves, else 0 (graceful: no crash/NaN, just no
  Camp-Sacrifice bump). pLaramie is resolved once from `LANDMARKS`
  by a stable id/predicate the plan pins down.
  (Sparse early, heavy late, sharp localized Camp-Sacrifice spike.)
- `graves` = min(0.6, (0.05 + 0.25·p) · (1 + 0.15·deathCount))
  (always sparse/somber, rises with progress, scaled by real deaths).

Placement:

- `slotPitch` = 26 scene-x units (tunable constant).
- For slot `i = floor(worldX / slotPitch)`: `h = hash(i)` (small
  integer hash, e.g. mulberry32-style). `occupancy = clamp(0.35 +
  0.25·p, 0, 0.7)`; slot occupied iff `h.f0 < occupancy`. If occupied:
  category by weighted pick on `h.f1`; sprite within category by
  `h.f2`; x = slot centre + (`h.f3`−0.5)·0.8·slotPitch jitter;
  y-row + size + rot by `h.f4..f6`.
- y-rows reuse the existing bands from `GroundPainting`: above-rut
  (~scene y 540–558) and below-rut (~588–600); the rut band (~560–585)
  is never used. Large sprites (anvil, broken-wheel, cook-stove,
  bacon-heap, rib-cage, graves) bias to the wider below-rut band.

`debrisAt(worldX, weights) → {sprite, x, y, size, rot} | null` is pure
and total: identical input ⇒ identical output.

### 3. Wiring — `ParallaxBands.svelte` → `GroundBand.svelte` → `GroundPainting.svelte`

- `terrain` already reaches `GroundBand`; pass through to
  `GroundPainting`.
- Thread `milesTraveled` and `deathCount` (read-only) from the scene
  composer through `ParallaxBands` → `GroundBand` → `GroundPainting`.
- Graceful degradation: if `milesTraveled`/`deathCount` are absent
  (composer not yet threaded), default to `0` ⇒ the layer renders
  early-trail procedural debris (no crash, no graves). The plan must
  locate the composer and thread real values; the default keeps the
  component independently testable.
- `GroundPainting`: replace the static `DEBRIS[]` with a sweep over the
  visible `worldX` window (`[scrollX-derived start, +SCENE_W]` stepped
  by `slotPitch`), calling `debrisAt`. Dirt-base + rut-overlay layers
  unchanged. `worldX` = cumulative trail coordinate derived from the
  scene's scroll↔trail mapping (specified in the plan once the composer
  is located).

## Performance & budget

- Field eval: only the visible window — `SCENE_W / slotPitch` ≈ a few
  dozen slots/frame, pure integer hashing. Negligible.
- Asset payload bounded as above; one-time cached load; fine for the
  Z-Fold mobile target.
- FLUX library regen is the heavy step — run via the now-OOM-safe
  (zswap + 32 GB swap) backgrounded + memory-monitored flow; review in
  the wagon-bg gallery before wiring.

## NPC parity / game-ai check (required)

- **NPC parity (#298): N/A.** Debris is the shared trail-position
  ground layer beneath the scene — identical regardless of which wagon
  (player or NPC train) is shown. No per-wagon state.
- **game-ai (#302): N/A.** Pure read-only *output* of (progress,
  terrain, deathCount); never an input to any AI decision layer. Adds
  no mechanics; "items must do something" N/A — deliberately cosmetic.

## Testing

- Unit (`debris-field.ts`): determinism (same worldX ⇒ same output);
  curve checks (junk monotone↑ in p; bones rise mid; graves scale with
  deathCount and stay ≤0.6; junk has a local maximum at p≈pLaramie);
  rut-band avoidance (no emitted y in 560–585); occupancy bounds.
- Visual: regenerate library → wagon-bg gallery review (watch graves —
  must read somber, not comical). Then `/dev/wagon-view` across
  (progress, terrain, deathCount) scenarios via the dev scenario
  harness. `npm run check` must pass before done.

## Risks

- Scene composer may not currently expose `milesTraveled`/`deathCount`
  → mitigated by the graceful `0` defaults; plan handles threading.
- FLUX quality for somber sprites (graves) → gallery gate; seed/prompt
  iterate if they read wrong.
- `worldX` origin stability across scene transitions → define as a
  cumulative trail coordinate, not per-scene scrollX (called out for
  the plan).
