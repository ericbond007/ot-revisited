# Clothing wear (#1072) + mend_clothes (#1193) — design

**Problem.** Clothing today is a static token count (`systems/warmth.ts`:
coat/blanket/boots/robe/moccasins points, no wear, no decay, no repair).
The record says one crossing took an outfit from presentable to rags —
universally (McMartin thesis; Longmire arriving with one boot; Ward's
"every thread begrimed"). Boots died first, often by Devil's Gate.

**Decisions (Dave, 2026-06-12):** option 2 — two tracks (garments +
footwear), per-WAGON family pool (historically: clothing was personally
fitted but family-maintained — adult garments cut down for children,
bedding doubled as wraps; the wardrobe was managed as one pool); wear
is MILES-WEIGHTED for the abrasion component (slow pace = less wear per
day; pushing hard concentrates it) + a small flat per-day rot component;
durable sewing kit; mild barefoot penalties (revisit after SO runs);
light garment morale drag (−1/day only below 25); clothing-as-currency
filed as #1405.

## 1. State

`resources.clothingCondition` and `resources.footwearCondition`, both
0–100, default 100 (old saves: `?? 100` at read sites — no migration per
the standing rule). NPC wagons inherit via `WagonStateLike.resources`
(verify the synth bridge round-trips resources — it carries water etc.).

## 2. Wear engine — one daily-steps entry, `applyClothingWear`

Per tick (registered on the spine near the other daily attrition steps,
unscoped — NPC parity):

- **Abrasion (per-mile)**: `WEAR_PER_MILE` (garments ~0.022, footwear
  ~0.045 — boots wear ~2×) × milesTraveledToday × TERRAIN_WEAR_MULT
  (prairie 1.0, forest 1.2, desert 1.5, mountains 1.6 — the sage/
  prickly-pear proxy; worsens west of South Pass via the terrain mix).
  Rest days contribute zero abrasion. milesTraveledToday = the day's
  delta (read how the tick exposes it — travel.ts returns miles; if the
  step can't see the delta directly, compute from a `_milesAtDayStart`
  snapshot or place the step after travel with the delta in scope —
  implementer picks the cleanest seam consistent with the spine).
- **Rot (flat per-day)**: `WEAR_PER_DAY` ~0.15 garments / ~0.1 footwear
  — dust embedding, mildew, camp chores. Applies every day incl. rest.
- **Moisture spikes**: ford day +3 garments / +1.5 footwear; storm +2/+1;
  rain +1/+0.5. After any soak set `_clothingDampSinceDay`; while damp,
  +0.5/day garments until a CLEAR-weather day or wash_clothes clears it
  (the "no time to dry → mold" mechanism).
- **Cold minor secondary**: frost/snow days +0.25 garments (brittle
  fabric/leather stress — reads weather, not the temp model, for
  simplicity; #1019's nightTempF is available if finer is wanted later).
- Calibration target (probe-gated): unmended balanced run ≈ 25 garments
  by the Blues (~day 150); Sabbath-mending cadence holds ≈ 65.

## 3. Consequences

- **Effective warmth**: `warmthFor` scales garment-item points
  (coat/blanket/buffalo_robe/tent stays whole) by
  `clothingCondition/100` and footwear points (boots/moccasins) by
  `footwearCondition/100`, with a floor mult of 0.35 (rags still cover
  something). Every existing exposure consumer (ford chill, cold camp,
  winter zones) inherits automatically.
- **Footwear ≤25**: milesPerDay × 0.95; **footwear ≤10**: × 0.9 AND on
  desert/mountains terrain a small daily party HP nick (−1, children
  included — Conyers' rag-swathed feet). MILD per Dave; revisit-after-SO
  note in the constants comment.
- **Garments <25**: −1 morale/day (light — the shame of rags; do not
  stack other morale effects; respects the #1403 mourning cap trivially).

## 4. Restoration

- **`mend_clothes` (#1193)**: new CAMP_ACTIONS entry. 2h, requires
  `sewing_kit` in inventory (durable — NOT consumed), available when
  clothingCondition < 85. Restores garments +18. Period copy: Sabbath
  mending (Knight 1853 "done some washing and sewing").
- **`stitch_moccasins`** (exists — read its current effect first):
  rewire/extend to ALSO restore footwear +10 (hide-consuming as today).
- **Purchases bump condition**: settleTrade/buy paths — each clothing-
  category item bought: garments +6; boots +25 footwear; moccasins +15
  footwear (cap 100). Implement at ONE shared seam (find where purchased
  goods enter inventory — settleTrade — and key off item category/id;
  the outfit screen's initial purchase keeps start at 100 regardless).
- **`wash_clothes`** (exists): clears `_clothingDampSinceDay`.
- **New item `sewing_kit`**: category equipment (or clothing — match
  catalog conventions), ~1 lb, ~$2, in BASE_KIT and post stocks.
  Description carries Marcy's housewife verbatim flavor (thread,
  needles, beeswax, awl).

## 5. Agent brains (mandatory axes)

- **game-ai (#302)**: `bundleCampActions` urgency for mend_clothes when
  garments <50 (mirror the existing urgency() shapes in ai/bundle.ts);
  shopping (ai/shopping.ts equipment slice): add boots/moccasins to the
  restock list when footwearCondition <40 at a post that stocks them;
  sewing_kit to the equipment wishlist if absent.
- **NPC parity (#298)**: the wear step is unscoped on the spine; NPC
  wagons' resources round-trip the two numbers through wagon-synth
  (verify + test); NPC restocks flow through the same shopping slices.

## 6. UI (explicit per Dave; Playwright pass mandatory)

1. **Play-screen inventory, clothing group header**: two compact chips
   `🧥 NN% · 🥾 NN%` — token colors shifting at <50 (amber) and <25
   (red). Find the grouped-inventory header component (#111 work);
   match broadsheet tokens; Z Fold 4 width-safe (chips inline, no wrap).
2. **Camp view**: mend_clothes renders via the existing CAMP_ACTIONS
   auto-grid (verify availability text + hour cost display like
   siblings — no bespoke UI).
3. **Threshold log lines** (50/25 crossings, once per crossing,
   re-armed on recovery above): garments 50 — "The sage is dreadful on
   one's clothes — coats and trousers fraying." (Geer, near-verbatim);
   garments 25 — "The family is in rags; the 'best' dress comes out of
   the trunk."; footwear 25 — "Boots worn through — feet swathed in
   rags." Level-trigger flags, plain JSON.
4. **Outfit screen**: sewing_kit appears in its category automatically;
   confirm description renders.
5. Playwright screenshots: play-screen chips at 3 condition states (dev
   scenario / loadScenario to set values), camp grid with mend action.

## 7. Gates

1. Wear-trajectory probe (inline or scripts/): balanced 150-day run —
   unmended ≈25 garments at the Blues; with bot mending ≈55–70;
   footwear hits ≤25 around Devil's Gate-to-Hall unmitigated.
2. `npx tsx scripts/arrival-timing.ts --runs 150` — all 13 passing SO
   archetypes hold BOTH bands (watch TF/Schoolmarm death bands — worn
   clothing raises late-trail exposure; tune WEAR_PER_MILE before
   touching bands). Unprepared LOW unchanged.
3. Full verify; Playwright visual pass.

## Out of scope

Per-person garments (pool model per the historical check); clothing as
barter currency (#1405); harsher barefoot consequences (revisit note);
material tiers (wool/cotton/buckskin — future texture).
