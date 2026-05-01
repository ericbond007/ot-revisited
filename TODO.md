# Remaining TODOs

As of 2026-04-30 (post-merge of #212 travel-stage hero layout). 31 open.

## New mechanics

| #    |                                                             |
| ---- | ----------------------------------------------------------- |
| #175 | California leg — Gold Rush headline unlocks alternate route |
| #176 | Wagon trains — join 20-50 caravan for safety bonus          |
| #180 | Year-sensitive dialogue — 1849+ California talk flavor      |

## More animals

| #    |                                                           |
| ---- | --------------------------------------------------------- |
| #139 | Milk cow — daily dairy, pace reduction, grazing-dependent |
| #140 | Pack mule — extra carry capacity outside the wagon        |
| #141 | Goats — poor-man's milk cow                               |

## System reworks

_(empty — items shipped or moved to other sections)_

## UI / UX polish

| #    |                                                                  |
| ---- | ---------------------------------------------------------------- |
| #157 | Terrain + weather visual revisit — parallax, clouds, rain/snow   |
| #159 | WagonScene strip framing pass — viewBox crop + cloud anchoring   |
| #167 | Trail-map cluster labels overlap at modal tier 1                 |
| #169 | WagonScene paused state still reads as motion                    |
| #147 | Success/arrival view rework — richer than current score panel    |
| #112 | Wagon modal visual redesign                                      |
| #86  | Expand hover tooltips across all data points                     |
| #102 | Pre-made vs custom starter kit choice                            |
| #134 | Water keg/barrel glyph next to water amount                      |
| #145 | Camp view — eliminate laptop scroll                              |
| #170 | Use new ox-team design beyond the travel strip                   |
| #171 | Laurel Hill landmark art — only gap from #89 batch               |
| #173 | TownStage hero art — hoist LandmarkArt into Visit view (Phase B) |
| #189 | Landmark / trading-post screen rework — better town actions      |
| #191 | Save format: add migration runner; deserializer hard-crashes now |

## For Claude Design or another SVG animation generator

| #156 | Wagon SVG visual revisit — proportions / damage / addons |
| #87 | Rich event visuals |
| #162 | Components revisit — StatBar + PartyPanel avatar designer pass |
| #211 | Bespoke teepee landmark art for `cheyenne_camp` + `shoshone_camp` — current placeholder is a single shared teepee silhouette; final art should show a small village (3-4 lodges, fire ring, drying rack, horses) keyed per tribe (Cheyenne plains-style hide painting, Shoshone Wind-River style) |

## Balance / audit

| #    |                                                                     |
| ---- | ------------------------------------------------------------------- |
| #183 | AI art / animation pipeline — eval libs + image-gen APIs            |
| #184 | Full game review — Sonnet pass on mechanics + balance               |
| #192 | Verify TradeModal + FordModal hero icons (audit branch, needs #185) |
| #198 | Grizzly mauling risk on big-game hunts in mountain terrain          |
| #200 | Discard-from-wagon while traveling — extend #179 beyond landmarks   |
| #206 | Whitman Mission as a post — historical check (1843-47 only)         |

## New mechanics (extension)

| #    |                                                                            |
| ---- | -------------------------------------------------------------------------- |
| #210 | Trail journal / atlas — leather-bound journal view aggregating tribes met, headlines read, letters, party members (living + memorial), trip stats. Accessible from the /play header. Period parchment aesthetic, IM Fell English serif. |

## Historical pass — 2026-04-30

Research pass on items / mechanics / landmarks / diary sources vs. period reality. Source docs: `docs/historical-pass/`.

### Items / inventory expansion

| #    |                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------- |
| #213 | ✅ shipped — see Recently shipped                                                                                  |
| #214 | Axle grease consumable — auto-burns ~1 unit/200mi; running out raises wheel-failure odds                         |
| #215 | Spare ox bow inventory item — period-real wear-and-replace; bows crack under load (Marcy spec'd 2 spares/wagon)  |
| #216 | Trade goods bundle expansion — mirrors, vermilion, awls, brass thimbles, calico cloth, pocket knives             |
| #217 | Guidebook item (Marcy / Palmer / Ware) — owning unlocks fork previews + ETA                                      |
| #218 | Tent (canvas A-frame) — reduces cold-camp morale drain                                                           |

### Daily routine mechanics

| #    |                                                                                                                       |
| ---- | --------------------------------------------------------------------------------------------------------------------- |
| #219 | Buffalo chips as plains/desert fuel — terrain-conditional label/flavor on existing gather_firewood                    |
| #220 | Teamster upgrade — add stray-oxen mitigation bonus to existing profession (already has fatigue/recovery mults)        |
| #221 | Stray oxen morning delay — random 2-4hr; mitigated by picket pins, dog (#137), Teamster (#220)                        |
| #222 | Wagon-churned butter — passive butter trickle when milk cow + crock owned (depends on #139)                           |
| #223 | Washday camp action — river camps only; restores clothing condition (ties #16)                                        |
| #224 | Sunday lay-by choice — religious morale + Preacher bonus vs. lost travel day                                          |
| #225 | Nooning mid-day beat — small fatigue tick + extra event slot                                                          |
| #226 | Going-back party encounter — eastbound family; mail handoff, surplus, news payload (extends #150)                     |

### Set-piece landmark events

| #    |                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------- |
| #227 | 4th of July at Independence Rock — date-gated set-piece (30-gun salute, fiddle dance, antelope feast)    |
| #228 | Carving names at Register Cliff — 1-day stop; carved name persists into scoring screen                   |
| #229 | Soda Springs taste-test — carbonated novelty event, +2 morale                                            |
| #230 | Washday on the Sweetwater — laundry camp at first Sweetwater crossing                                    |
| #231 | Ash Hollow descent (Windlass Hill) — rope-lower scene; damage-on-fail check                              |
| #232 | South Pass crest beat — symbolic "you've reached the top" morale moment                                  |
| #233 | Chimney Rock first-sight day — emigrant-awe text 2-3 days out                                            |
| #234 | Three Island Crossing — explicit ford vs south-bank desert detour modal                                  |
| #235 | Barlow Road toll vs Columbia raft — 1846+ explicit decision modal ($5/wagon + 10c/head vs raft-disaster) |
| #236 | Disease-camp landmark events — Ash Hollow / Chimney Rock cluster burials in cholera years                |

### Native interaction expansion (extends #121)

| #    |                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------ |
| #237 | Grass / passage toll encounter — Plains tribes; refusal damages relations                        |
| #238 | Native-run ferry option — Shoshone / Cayuse ferries at Green / Snake / Columbia                  |
| #239 | Salmon trade stops — Snake / Columbia corridor; trinkets for fresh salmon                        |
| #240 | Hire-a-guide for cutoffs — Sublette or Barlow vs Columbia decision                               |
| #241 | Gift-first parlay — small tobacco / sugar gift opens better trade rates on first contact         |

### New landmarks

| #    |                                                                                                |
| ---- | ---------------------------------------------------------------------------------------------- |
| #242 | Lone Elm Campground (mile 40, KS) — first-night company-organizing camp                        |
| #243 | Vieux's Crossing + 1849 cholera cemetery (mile 145, KS)                                        |
| #244 | Rock Creek Station (mile 230, NE) — 1857+ road ranch; Hickok shootout site                     |
| #245 | Windlass Hill (mile 510, NE) — rope-lower descent into Ash Hollow                              |
| #246 | Rachel Pattison Grave (mile 516, NE) — iconic 1849 cholera death                               |
| #247 | Mormon Ferry / Fort Caspar (mile 810, WY) — toll ferry 1847+, bridge 1853                      |
| #248 | Martin's Cove (mile 855, WY) — 1856 handcart disaster memorial                                 |
| #249 | Big Hill (mile 1140, ID) — Bear Valley descent; teams doubled, wagons rough-locked             |
| #250 | Massacre Rocks (mile 1290, ID) — pre-1862 just "Gate of Death"                                 |
| #251 | Salmon Falls (mile 1450, ID) — Shoshone fishery                                                |
| #252 | Burnt River Canyon (mile 1680, OR) — tortured zigzag through brushy gorge                      |
| #253 | Flagstaff Hill (mile 1720, OR) — first Blue Mountains view                                     |
| #254 | Laurel Hill (mile 1965, OR) — worst descent of trail; 60% grade, wheels locked, trees dragged  |

### Diary library

| #    |                                                                                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #255 | Diary library — single pool of all entries (Frizzell / Knight / Geer / Whitman / V. Reed Murphy) randomly drawn per seed/run; journal screen aggregates; excerpts attach to key events. Extends #210.        |

### Set-piece social events

| #    |                                                                                          |
| ---- | ---------------------------------------------------------------------------------------- |
| #256 | Camp dance action — fiddle / harmonica required; morale + sleep cost                     |
| #257 | Trail wedding — rare encounter; party morale spike, optional dowry trade                 |
| #258 | Lay-preacher Sunday service — Preacher profession + lay-by day; morale boost             |
| #259 | Burial ritual choice — scripture+marker / disguised-grave / quick-and-go (replaces #151) |
| #260 | Rifle salute on burial — gunpowder option; tiny powder cost, small morale                |

### Navigation / decision system

| #    |                                                                              |
| ---- | ---------------------------------------------------------------------------- |
| #261 | Wait for water to subside at fords — days cost, drown-risk drop              |
| #262 | Scout-ahead camp action — 1-day cost; reveals next 3 trail tiles' hazards    |
| #263 | Train merge / split events — join larger train (extends #176) or leave       |

## Known design-incoming

- **Claude Design integration** — Dave is iterating on UI mockups in Claude Design (released this week, post-cutoff). Plan TBD pending the format of the handoff (mockups vs. code vs. tokens). Rework targets likely include `play/+page.svelte`, `CampStage`, `TownStage`, `OutfitView`, modals.
- **wagon-bg passing-landmark rasters** — generate painterly raster sprites for the wagon-view passing landmarks currently in `src/lib/ui/wagon/landmarks/` (ChimneyRock, ScottsBluff, IndependenceRock, CourthouseRock, plus generic Fort, FerryPost, MountainPass, ValleyArch, TreeClump). Drop-in replacement for the SVG silhouettes inside `LandmarkLayer.svelte`, behind the same `?raster=1` flag. Stretch goal: integrate landmarks the player passes-but-doesn't-stop-at — visible-in-the-distance only, not gameplay stops — so the trail feels populated. Fits into wagon-bg Phase 1.5 alongside sky/cloud/sun rasters.

## Recently shipped

- **#213** Period medicine kit fill-out — added 6 historically-real wagon-chest staples to `items.ts` (epsom_salts, camphor, paregoric, hartshorn, dovers_powder, castor_oil). Each plugs into the existing `treatmentItems` arrays as gentler alternatives: epsom/paregoric/castor_oil for dysentery (avoid calomel mercury risk), Dover's powder + camphor for cholera/typhoid/measles fever-sweat treatment, hartshorn for snakebite folk-remedy. Prices in `prices.ts` follow Marcy 1850s Missouri-River rates. Fort Laramie stocks the full line; The Dalles + Fort Hall partial. Available at Independence outfitter. 9 new tests; 846/846 green.


- **#212** Travel-stage hero — `/play` layout rework. WagonScene moves to the top of the left column (where TrailMapSnippet used to be), action bar right under it. New `.travel-bottom` row places TrailMapSnippet + EventLog 50/50 below the action bar. Camp / Town / Landmark / Completed stages keep their existing layout (full-width log below the action bar). Gated on a new `isTravelStage` derived. Map snippet's hard-coded 380px height overridden via `:global(.snippet-host)` so it can flex within the new row. WagonScene at its natural strip aspect — bespoke art for the bigger canvas remains a follow-up under #156/#157/#159.
- **#208 + #209** Two missing-history newspaper headlines flagged in #207. **#208 Ward Massacre** (Aug 1854 Snake River; fires Sep-1854 through 1856): Bannock -10, Shoshone -5. **#209 Yakima War** (Nov 1855 onward through 1858): Walla Walla -12, Umatilla -8, Cayuse -5. Both compose with the existing 1847 Whitman / 1851 Treaty / 1854 Grattan / 1855 Harney pipeline — pure data-file additions, no system changes. 6 new tests.
- **#202 + #203** Native trade — village stops + hide encounter. Two new trail landmarks: `cheyenne_camp` (Sweetwater plains, mile ~620, postKind `native`, tribeId cheyenne) and `shoshone_camp` (upper Bear River, mile ~1075, Washakie's band). Mile inserts split existing gaps; total trail distance preserved at 2195. New `Landmark.tribeId` field + `isNativeCampHostile()` helper — TownStage shows a "lodge poles bare, fire pits cold" empty-camp flavor when the affiliated tribe drops to hostile (<21). New `native` PostKind with earth-tone theme + 🛖 glyph; placeholder teepee landmark icon registered for both ids (bespoke art logged as #211). New `native_hide_trade` random encounter (#203, weight 3, gates on raw_hide ≥1 + wary+ tribe): 4 choices — 2 hides for a finished buffalo_robe (+2 attitude), 1 hide for 5 lb pemmican (+1), 1 hide for 2 moccasins (+1), or wave them off (-1). 15 new tests; encounters count 10→11.
- **#207** Tribe baseline calibration — audit pass on the 9-tribe relations system. Pawnee 55→60 (period diaries lean friendlier — Sarah Royce, Donner letters, etc.). Cayuse 35→50 (the previous baseline already reflected the post-1847 Whitman Massacre wary state, but the 1847 newspaper headline ALSO drops cayuse −15, so 1848+ starts double-counted into hostile-edge ~20; restoring a pre-massacre neutral baseline lets the headline land at the correct ~35). Tests updated; system-wide audit logged a clean bill of health on encounter wiring + news-headline wiring + save migration; flagged trade-post integration + UI tribe surfacing as known gaps the journal TODO (#210) and #202 will pick up.
- **#205 + #151** Body decisions on the burial popup — when a party member dies, the burial event now pops with three choices instead of two: **Dig a proper grave** (shovel-required, +2 morale), **Build a stone mound** (no-shovel default, -4 morale, preacher halves), and **Eat the body** (hidden unless `hasNoFood` — period reality, Donner Party precedent: survivors only turned to it when no food remained, regardless of how the deceased died). All three close the body's story (clear `_burialPending`); eat-the-body marks `consumed`, grants 50 lb game_meat, -18 morale, +1 cannibalism guilt. Dropped `dig_grave` camp action (closes #151 — the action was always situational and just duplicated the burial event) and dropped `cannibalism_corpse` camp action (folded into the new burial choice — one-shot at the popup, not a deferred camp option). `cannibalism_straws` stays in camp for the "nobody dead yet, draw lots" path. New `EventChoice.hidden?: (state) => boolean` predicate on the choice schema (filters whole choices vs `requires` which renders disabled). 6 new burial-event tests; cannibalism + camp-actions test suites trimmed for the dropped actions.
- **#195** Camp-actions audit — reviewed all 18 actions; most carry real gameplay effects with sensible hour costs. Two adjustments: `read_bible` 2hr→1hr (was the worst morale-per-hour ratio at +2-4 for 2hr — period reality is a brief evening ritual, not a half-day commitment); `find_water` now gates off desert terrain (no streams in dry country — `dig_well` stays the desert water option). 4 new tests.
- **#187** Multi-day camp rework — camp stays now run day-by-day with per-day activity picks. Player sets planned stay length on entry (1-7 days); each "Rest the night" advances a single day, then CampStage re-renders with "Day X of Y" + a fresh 12-hour budget + reset activity slots. Server tracks via `_campPlannedDays` + `_campDaysSoFar` flags; per-day CampSummary modal suppressed mid-stay (the dawn-fade overlay carries the transition), final-day summary still fires on stay completion. New `?/breakCamp` action + "Break camp early" button to exit at any point. /play forces CampStage open while flags say mid-stay. rest() function unchanged — multi-day flag tracking lives only in the server route, so existing tests keep passing.
- **#201** Wagon repair audit + canvas split — `wagon.canvas` (0..100) added as a separate stat from frame condition. Canvas drains from rain (-1..2), storm (-3..6 + supply roll), snow (-1..3), desert sun (-1). At low canvas, rain-catch refill scales down (full ≥60, half ≥40, quarter ≥20, zero <20) and supply-damage rolls fire on wet days (2-5 lb of one heaviest dry good at <60 + rain; +30% gunpowder/caps roll at <40 + storm; heavier at <20 + storm/snow). Reworked `patch_wagon` (raw_hide → +8 canvas) + new `replace_canvas` (canvas spare → +30 canvas, 2× without iron_toolkit) + new `replace_planks` (1 plank → +5 condition, 2× without toolkit). New `wagon_axle` event (ungated, weight 2). `tar_bucket` cuts frame decay 25%. Dropped `iron_scrap` entirely (anvils were rare luxury cargo, smithing happened at posts). Replaced Blacksmith bonus: town smithy repair cost halved when a live Blacksmith rides along. New town service `forgeOxShoes` ($1.50/pair, 50% off w/ Blacksmith) at any post with `blacksmith` service. Audit confirmed all 8 forge posts (Kearny, Robidoux, Laramie, Bridger, Hall, Boise, Walla Walla, Dalles) match historical record. New `abandoned_wagon` encounter (post-mile-200, weight 2): pick over wreck for 1d3 spare planks + 50% canvas. WagonPanel surfaces canvas as a second stacked bar. Logged #205 (Whitman Mission as a forge post 1843-47, historical check needed).
- **#204** Per-post buyer gating — road ranches like Hollenberg's didn't deal in fur-trade specialty (raw hides, buffalo robes, beads). New optional `excludeBuyCategories: readonly string[]` on Landmark; Hollenberg sets `['native_trade']`, all other posts omit (= buys all). `trade.ts` rejects sells of excluded categories with a clear "Hollenberg won't buy raw_hide (native_trade)" error; `TradeModal` filters owned-item rows so excluded items can't be selected. Mixed-purpose hubs (Ft Laramie pre-1849, Ft Bridger, Ft Hall HBC, Ft Boise) keep accepting fur trade. 6 new tests.
- **#196 (partial)** Raw hide handling — two new camp actions for the on-trail use cases that don't need a trading partner. **`patch_wagon`** consumes 1 raw_hide + 2 hr → +5 wagon condition (gated by hide presence + sub-100 condition). **`stitch_moccasins`** consumes 1 raw_hide + 2 hr → +1 moccasins (no profession or post gating; period emigrants stitched their own with awl + sinew). The native-trade path (A) and post-sell side (B) skipped this branch — A is venue-blocked until #203 (native-band encounter trade) or wagon-party feature lands; B is mostly implicit already (raw_hide already has post sell prices, `buysFromEmigrants:false` blocks the army post). 8 new tests cover availability + state mutation. Logged follow-ups #201 (wagon repair audit), #202 (historical Indian trading post landmarks), #203 (encounter-based hide trade), #204 (per-item buyer gating).
- **#199** Hunt approach + tallow toggle — HuntModal gains two new CardRadio controls. **Approach** (big-game only): Full butchery (default — meat + hide + tallow + prize cuts) or Prize cuts only (tongue + hump 4–8 lb, leave the rest for the wolves; period emigrants celebrated this as a delicacy run, no morale penalty). **Tallow** (medium + big): Render the fat or skip to save wagon weight. The two toggles are independent — prize-only with tallow rendered still gets you the fat next to the prize cuts, just no meat or hide. Hunt log line + `HuntOptions.style` + `HuntOptions.renderTallow` + server-side parse. 4 new tests cover the matrix.
- **#197** Fish camp action + gear — `fishing_line` / `fishing_rod` / `fishing_net` items (0.30 / 1.50 / 4.00). New `fish` camp action: 2 hr, no ammo, requires at least one gear item. Yield depends on best gear (line 2–6 lb, rod 4–10, net 8–20) × terrain mult (river 2.0, forest 1.0, mountains 0.8, prairie 0.4, desert 0.2 — and gated off entirely in desert as "no fishable water nearby"). Catch name flavors by terrain ("cutthroat trout" at the river, "mountain trout" in the Rockies, "a few suckers" on a dry creek bed). Yields fresh `game_meat` so the existing spoilage + cure pipeline picks it up; closes the period gap of mountain-leg hunger when game runs thin past Fort Hall. 5 new tests.
- **#190** InventoryPanel water bar — third stacked bar beneath Weight + Warmth, matching that treatment. Color goes green-when-full to red-when-empty (inverse of weight, since here "more is good"); thresholds 70/30/10. With boiling knowledge + dirty water present the bar splits into clean (color-keyed) + dirty (diagonal-hatched rust) segments, sharing the bar width. Stats line keeps its compact text gallon readout — bar is the glanceable supplement.
- **#182** Hunt byproducts — tallow, raw hides, prize cuts. Big-game kills now drop 15–40 lb of rendered fat (`tallow`), 1–2 raw hides at 80% (`raw_hide`, untreated dried-flat — emigrants didn't tan on the trail), and 1–2 lb of tongue+hump prize cuts at 70% (`prize_cut`). Medium kills get 5–10 lb tallow + 60% chance of one hide. All scaled by yieldFraction (no kill, no skin). PostHuntModal renders new rows; per-item glyphs 🟡 tallow / 🍖 prize / 🟫 hide. Logged follow-ups #196 (hide use cases), #197 (fish action + gear), #198 (grizzly mauling), #199 (prize-cuts vs full-butchery UI choice).
- **#174** Bullets rework — split the single `bullets` item into period-correct ammo components: `gunpowder` + `lead_balls` + `percussion_caps` (each 1:1 with a shot), `lead_pig` (raw 5-lb bar), and `bullet_mold` (tool). New camp action `cast_balls` (2 hr, mold + pig → 30 balls) lets the player ride the cheap raw-lead supply path. Caps were the historical bottleneck (fulminate-of-mercury chemistry couldn't be done on the trail). Save migration in upgradeState: each old `bullets:N` becomes 30/30/30 + 1 mold so old saves keep working. Hunt consumes min of the 3 components per shot. 9 post stocks updated; Hunter + Gunsmith starter kits split. Per-item glyphs 💥/🍫/⚫/🪙/🪩 wired through TradeModal / Inventory{Panel,Modal} / CampSummaryModal.
- **#172** Travel mileage calibration audit — full sweep of all 39 leg distances against historical Oregon Trail surveys + emigrant journals. Trail length 2098 → 2195 mi (now within the historical 2170-2200 band). Biggest fixes: Ft Laramie → Register Cliff 12→60 (Register Cliff is ~60 mi past Laramie near Guernsey, not 12), Farewell Bend → Blue Mountains 120→60 (was double-counting the crossing), Hollenberg → Ft Kearny 80→120 (was 40 mi short), Whitman/Barlow inserts adjusted (the original trigger). 30 leg distances corrected; travel + scoring tests updated; cosmetic mile-comments in landmark-art refreshed.
- **#186** EventChoice.icon catalog — populated thematic action glyphs on 85 unaudited choices across events.ts / encounters.ts / party-events.ts / water-events.ts (🚶 press on, ⛺ shelter, ⚒️ repair, 🤲 take, 💪 force through, etc.). Item-gated `requires.icon` stays the primary signal; top-level `c.icon` is the action-flavor fallback per the #133 infrastructure. Pure content additions, no logic changes — Sonnet did the bulk port in one pass, intent-mapped per choice context.
- **#185** Playwright MCP fleet config — chezmoi-tracked override on flattop's `~/.claude/settings.json` disables the plugin's default playwright MCP and replaces it with `npx @playwright/mcp@latest --browser chromium --executable-path /usr/bin/chromium`. The plugin's `chrome` channel hard-paths to `/opt/google/chrome/chrome` and ignored `--executable-path`; switching to the `chromium` channel honors the override. Flattop-only (wanda + serp are headless servers). Verification pass on TradeModal/FordModal heroes still pending — logged as #192.
- **#188 + #193 + #194** Town-actions confirm modal — replaced 5 inline forms on TownStage cards (instant POST, no acknowledgment) with click-to-open `TownActionModal.svelte` carrying the cost-stepper inside the modal. Same enhance flow on Confirm; free/fixed-cost actions (gossip, newspaper, trade) keep their direct-click. Closes all three symptoms of the same UX gap (#188 no confirm, #193 felt slow, #194 cost adjustment in modal not card).
- **#132 + #163 + components 4d** PartyPanel wiring — replaced the 4 hand-drawn inline avatar-corner profession badges (doctor / scout / preacher / hunter only) with `<ProfessionIcon id={m.profession} size={5}>` so all 13 professions get bespoke watercolor art. Mini-stats footer now uses `<StatIcon kind="rations">` and `<StatIcon kind="pace">` (oxen stays on emoji — the ×N count is the focal cue). The panel was already substantially aligned with `docs/handoff/components/src/party-panel.html` from earlier work (sparkline header, avatars+rings, HP bars with hatch ticks, heart pulse, ill-shake, dead gravestone, morale ribbon, mini-stats existed); this commit closes the icon-wiring side. **#132** closes on the "denser" interpretation; the bundle's panel IS the rework. **#163** closes per the bundle's "keep mini-stats, intentional duplication" answer — comment in code already says so.
- **#133** EventModal visual polish — `EventChoice.icon?: string` field added so any choice can carry a thematic action glyph (🐂, ⛺, ⚒️, etc.), not just item-gated ones. EventModal renders `req.icon` (item-gate, stronger signal) when present, falls back to `c.icon` (action flavor). The card-slide / choice-in animations and rust-bordered button styling were already in place from earlier work; this closes the infrastructure side. Content fill — populating `c.icon` across the event catalog — is logged as #186 follow-up.
- **components/ step 4a** — ActionBar parity confirmed against `docs/handoff/components/`. The 5 sprite-symbol path data sets (`gi-travel`, `gi-rest`, `gi-hunt`, `gi-visit`, `gi-ford`) are byte-identical to the bundle; restored the inline section comments the original port stripped.
- **profession-icons** — handoff bundle's 13 watercolor profession glyphs ported (10 mechanical via Sonnet subagent + 3 worked-port templates: doctor, banker, hunter). New `src/lib/ui/profession-icons/` module mirrors landmark-icons / stat-icons shape: `LI` palette, `ProfessionIconKind` union, dispatcher with optional `badge` prop (warm/cool/gold) reusing the `_badge.svelte` HybridBadge from landmark-icons, `hasProfessionIcon()` guard. `ProfessionPicker.svelte` (new-game grid) wired — bespoke 32px SVGs replace the emoji glyphs. PartyPanel avatar corner + PartyMemberModal hero deferred to step 4d's PartyPanel rebuild (would be touched twice otherwise). `tests/profession-icons-port.test.ts` element-count parity (13 of 13). Strips Svelte `<script>` blocks before counting (Hunter's port comment mentions `<g>` literally — would inflate counts otherwise).
- **stat-icons** — handoff bundle's 8 watercolor stat glyphs ported (5 mechanical via Sonnet subagent + 3 worked-port templates: day, pace, health) plus 2 fresh glyphs in matching vocabulary for `leg` (brass-cased pocket compass) and `weather` (sun-behind-cumulus) which the bundle pre-dates. `src/lib/ui/stat-icons/StatIcon.svelte` dispatcher (Svelte 5 runes), `SI` palette, `StatIconKind` union (10 ids). Wired into `/play` top-bar header for day / date / leg, and routed through `StatPicker` for pace / rations via a new optional `kind` prop (falls back to legacy `icon: string` emoji when absent). Weather intentionally stays on emoji — the per-state glyph (clear / cloudy / rain / storm / fog) carries more info than a single watercolor cloud would. `tests/stat-icons-port.test.ts` element-count parity test had to handle JSX destructured params (`function DayIcon({ size = 16 })`) by skipping past parens before finding the body's brace; same shape ports forward.
- **landmark-icons foundation + bulk port** — handoff bundle's 4-step icon import, step 1 of 4. New module `src/lib/ui/landmark-icons/` (sibling to landmark-art so the 24×24 watercolor pin set doesn't cohabit with the 480×200 modal illustrations). 40 of 40 ids ported: 38 verbatim from `docs/handoff/landmark-icons/src/icons-{arrival,passbys,rivers,trading-posts}.jsx` (mechanical Sonnet subagent pass — `strokeWidth → stroke-width` etc., HybridBadge wrapped via `{#snippet children()}`, helper components imported from sibling files), plus 2 fresh glyphs (whitman_mission, barlow_road) drawn in matching vocabulary because the bundle predates the historical pass. `LandmarkIcon.svelte` is a Svelte 5 runes port of the bundle's Svelte 4 dispatcher (`$props` instead of `export let`, `$derived` instead of `$:`, `<Art />` instead of `<svelte:component>`); per-id REGISTRY map; `hasLandmarkIcon()` guard exposed for callers that fall back to emoji on unmapped ids. Fidelity verification: (1) `tests/landmark-icons-port.test.ts` element-count parity per landmark — 38 of 38 pass; (2) Sonnet code-reviewer subagent spot-check on 5 random ports (fort_hall / three_island_crossing / devils_gate / courthouse_jail_rocks / oregon_city) — 0 drift found; (3) `/dev/landmark-icons` specimen route shows every LANDMARKS id at 24/32/48 px. Bundle source committed at `docs/handoff/landmark-icons/`. **Wiring to LandmarkPin / modal headers + step-2 stat-icons + step-3 profession-icons + step-4 components are still ahead.**
- **wagon-bg Phase 1** raster background tiles for the wagon view — replaces the four static SVG parallax layers (FarLayer / MidLayer / NearLayer / GroundBand) with painterly hand-drawn AI-generated raster tiles per biome (5 terrains × 4 layers = 20 WebP tiles in `static/wagon-bg/`). Asset pipeline at `tools/wagon-bg/` (Python + ComfyUI HTTP + rembg/u2net for alpha). Behind a `?raster=1` URL flag so SVG and raster paths coexist for review; the SVG branches and feature flag will be removed once the raster aesthetic is locked. Animation logic, parallax math, weather overlays, ox team, and wagon SVG all unchanged. Advances #157 (terrain + weather visual revisit) and #159 (strip framing pass). Phase 2 (raster wagon + ox + LoRA + ControlNet/IPAdapter consistency stack) follows.
- **#179** Lightening the wagon — `discardItem` server action gated to `state.location.atLandmarkId` (period reality: lightening happened at the rocks and forts, not on the open trail). InventoryModal now renders three submit buttons per row when at a landmark — `−1`, `−min(10, qty)`, `all` — each with its own `name="qty" value=N` so the player picks the bulk in a single click without per-row JS state. Items removed from `state.inventory`; future ox-fatigue benefit comes through the existing weight-driven oxen system. Compact ghost-button styling so dense rows don't crowd. New `slot` prop on InventoryModal; callsite in `/play` updated.
- **#178** Independence Day — once-per-year +6 morale bump on July 4. New `systems/holidays.ts` (`applyHolidays`) wired into both engine pipelines (`tickDay` + `tickDayPausable`); per-year flag `_july4Year` gates re-firing within the same year. Cap-respecting (no morale > 100), no-op when `state.completed`. 5 new tests; pattern extends naturally to Christmas / Thanksgiving (1863+) when wanted.
- **#177** Letters from home — rare delivery on first arrival at posts with `gossip` service (~30%, per-post dedup via `flags._lettersDeliveredAt`, per-letter dedup via `flags._lettersRead`). 12 curated period letters (5 good / 3 mixed / 4 bad) — births, weddings, harvests, deaths, fires, mother begging the party home. Morale delta applied immediately. New `LetterModal.svelte` (parchment, IM Fell English serif, signed closing right-aligned, color-coded morale footnote) mounts off `flags._pendingLetter`; `?/ackLetter` clears it. Hooked into `runTravelLoop`'s post-arrival block alongside the existing whore-earnings / restock / gossip steps. 4 new tests; 678/678 green.
- **#168** Party Card hover desaturated — added the missing `background: var(--c-panel)` override (was letting the global `button:hover` rust fill bleed through) and dropped the per-row `.party-row:hover` rust tint (rows aren't individually clickable; whole panel is one button, so row-level hover just stacked rust on top of the panel hover). Ill / dead row treatments preserved — those still convey state.
- **#181** newspaper paper-styled modal — `applyNewspaper` now stages a `PaperBatch` on `flags._paperBatch` (postName + dateline + items[]), `NewspaperModal.svelte` mounts when the flag is present (same pattern as PostHuntModal / CampSummaryModal), `?/ackPaper` server action clears the flag on dismiss. Modal reuses `ParchmentBg` for the grain/age-stain layer; layout is intentionally plain (small-caps masthead, dashed-rule story dividers, IM Fell English serif) — Claude Design will rework when ready. `applyNewspaper` signature gained a `postName` param; tests + +page.server.ts updated.
- **historical pass** — period-flavor items + luxury haul + newspapers (#150 follow-up). Items: cornmeal, salt_pork, saleratus, lard, tar_bucket, vinegar; luxury haul (anvil 800 / china_tea_set 400 / feather_mattress 300); existing `sugar` re-flavored as period loaf form (loaf_sugar folded in rather than duplicated). New `news-headlines.ts` (35 curated headlines spanning 1846-1859, year+month gated), `generateNewspaper`/`applyNewspaper` interleave 2-4 historical headlines with 1-2 gossip items into the existing addNews pipeline, headline ids tracked in `flags._headlinesRead` to avoid re-serves. Headline effects use plain descriptors (`{kind: 'california_unlock'}` / `{kind: 'tribe_shift', ...}`) resolved at apply time — keeps `news-headlines.ts` a pure-data file (no circular import on systems/news.ts) and devalue-safe. Gold Rush headline flips `_californiaUnlocked` for the future California leg (#175). Treaty of Ft. Laramie 1851 nudges Sioux/Cheyenne attitude up; Grattan Affair 1854 + Harney 1855 nudge Sioux down; Whitman Massacre 1847 nudges Cayuse down. New `townNewspaper` server action ($1) + TownStage "Read the newspaper" service card gated on the same `gossip` service flag (clerks who chat have papers). 4 new regression tests covering: 2-4 headline counts, no-repeat read tracking, Gold Rush flag flip, JSON round-trip safety.
- **#89** rich landmark display — Claude Design handoff ported (39 of 38 plotted landmarks have bespoke SVG art; only `laurel_hill` lacks dedicated art and is logged as #171). New `src/lib/ui/landmark-art/` module: `LandmarkArtFrame.svelte` chrome, `LandmarkArt.svelte` id-dispatcher, 39 per-landmark `<g>`-only Svelte components, plus `landmark-art-tokens.ts` (`LMK` palette + `LandmarkId` union). `LandmarkStage.svelte`'s placeholder slot now renders `<LandmarkArt id={landmark.id} {abandoned} />` gated by `hasLandmarkArt()`. Three id remappings (`north-platte-east → north_platte_1`, `north-platte-west → north_platte_2`, `sweetwater-ford → sweetwater_1`). Two new LANDMARKS added: `whitman_mission` (mile 1885, `abandonedAfterYear: 1847`) and `barlow_road` (mile 2013). `/dev/landmark-art` harness for visual diff against the bundled atlas + per-region showcase HTMLs.
- **#158** ox + mule team visual revisit — full handoff port to `src/lib/ui/wagon/ox-team/` (Ox/Leg/OxHead/OxYoke/OxSingleYoke/OxPole/OxChain sub-components via Svelte snippets), `gait="walking"|"stopped"` prop with explicit at-rest pose, per-ox biological variance (deterministic phase ±0.03 + amplitude 0.88–1.12× hashed from pair-idx + near/far). Tokens refresh: OX_INK→#3a1a08, new OX_RED_LT/OX_WHITE_SH/POLE_WOOD; PAIR_PHASE_OFFSET 0.13→0.05; PAIR_SPACE 22→24. Architectural shift: OxTeam owns the shared `teamBob` over the entire hitched mass; WagonScene mirrors it on the wagon translate so they ride together (was independent double-frequency bounce that read as trotting). Mule fallback preserved.
- **#164** WagonScene rAF parking — wagon was animating continuously between turns, looked like the player was traveling when they weren't. WagonScene's rAF loop now lives inside a `$effect` that fully cancels when `paused`; `t` reads via `untrack` on resume so the effect doesn't tear itself down on every frame, and `t` holds its last value across pauses (wagon freezes mid-stride, no snap to t=0). /play tracks a `wagonRolling` flag set on day-change for 1500ms and passes `paused={!wagonRolling}` — wheels + parallax now only run for ~1.5s after a Travel action.
- **#166 + #160** trail-map data plumbing + visual revisit — both views were ignoring `currentMileage` (modal hardcoded the wagon glyph at `(700,260)` and the traveled/remaining paths to that frozen design-handoff state; snippet's SVG was a one-leg painting). Built `trail-map-svg/landmark-coords.ts` (per-landmark x,y in modal coord-space) + `TrailMapPaint.svelte` (shared SVG content, `paintScale` prop for proportional fonts/strokes when zoomed). `interpolatePosition()` now skips un-plotted landmarks so the wagon advances proportionally between adjacent plotted ones. Modal: wagon glyph + traveled/ahead polylines now data-driven from `currentMileage`. Snippet: 320×100 wagon-following camera window with `slice` aspect, wagon anchored at right-30% so most of the strip shows what's ahead (~2-3 upcoming landmarks). Bespoke per-leg snippet art (prairie stipple, sand dunes, named rivers) traded for honesty — per-region terrain repaint stays a future concern.
- **starter-kit audit** — BASE_KIT trimmed to a sensible day-1 floor: 300 flour + 50 beans + 30 bacon (variety unlocks #110), 2 coffee + 2 salt + 4 bandages + 1 cookware (brew/cure/triage paths all reachable), bullets dropped (useless without rifle — Hunter/Gunsmith bring one), water_skin dropped (wagons declare their own keg cap). Wagon spare parts no longer pre-loaded (player buys at outfit). Banker $800→$600. Preacher's duplicate shovel removed. Coffee/tea consumption now scales with adult count (1 oz/adult/day, 16 oz/lb) — 2 adults: 8 days/lb, 4 adults: 4 days/lb, children skip the brew.
- **#161B** BrandLockup SSR flicker — auto-variant SSR default flipped from mark to wordmark via `null`-sentinel for unmeasured `clientWidth`. Common case (wide containers) now renders correctly first paint, no hydration reflow. Narrow contexts pass `variant="mark"` explicitly.
- **#161A** icon-dictionary expansion — added 9 new categories (post_kinds, professions, town_services, fauna, ford_methods, journey_menu, end_screen, status, trend) covering ~50 emojis the brand pass left as literals. Consumers (ProfessionPicker, post-theme, HuntModal, PostHuntModal, FordModal, FordSummaryModal, TownStage, JourneyMenu, EndScreen, party-related modals, /new) all route through the typed dictionary now.
- **#151** dig-grave camp action — hidden until `_burialPending` is set, then handles the burial (clears flag, +2 morale w/ shovel). No more preemptive flavor click.
- **#143** wet firewood — rain/snow/storm cuts the day's gather (×0.5 / ×0.6 / ×0.2); wagon canvas keeps stockpiled wood dry. Multi-day wet weather drains the pile and the existing no-wood cold camp triggers naturally. Log line on noticeably-wet days.
- **#148** scoring system — miles + 200/survivor + 1000 arrival + luxury bonus on delivery. New `grandfather_clock` item (100 lb, $50, +1000 score) is the headline luxury — at Independence outfit + Ft. Laramie. Score breakdown surfaces on EndScreen.
- **#119** travel calibration audit — 8 high-plain landmarks reclassed mountains→prairie, Laurel Hill mountains→forest, mountain mult 0.55→0.65, base pace +2 mi/day. Realistic moderate-pace journey now hits ~150-day historical median.
- **#165** wagon clouds parallax-couple to scrollX — same axis as terrain, far/near depth jitter
- **#13** trail content — 2 road ranches + 4 scenic landmarks
- **#120** trading-post stock quantities + monthly restock
- **#121** Indian relations foundation — 9 tribes, attitudes, regions
- **#127** random encounters — 9 events, tribe-aware natives
- **#129** party events — quarrels, fistfights, romance, grudge tracker
- **#146** tombstone game-over screen
- **#149** cannibalism camp actions — corpse + draw-straws
- **#150** news/gossip system — clerk tips with real world-effects
- **#152** town services — round 1: blacksmith / inn / gambling / brothel
- **#152** town services — round 2: stepper inputs + ask-around news + pox risk + hire-a-guide + fullscreen TownStage replacing VisitModal
- **#154** profession rebalance — farmer berry-forage + Doctor / Blacksmith / Scout / Indian Trader bonuses wired, summaries cleaned
- **#155** starvation flow — HP curve + Starvation deathCause
- **#106** water rework — clean/dirty pools + find/boil camp actions, knowledge-gated UI
- **#136** water events — foul stream, alkali pond, keg break, spill, clear spring
- **#144** camp action time-cost rebalance — read_bible / find_water / dig_well retuned
- **#153** weather pass — 8-state daily Markov picker (terrain × season × stickiness), travel + water multipliers, rain refill / storm damage / frost morale, weather-gated event firings, WagonScene reads real state
- **#90** trail-map redesign — replaced flat parchment-strip with parchment-snippet HUD + click-to-expand pan/zoom modal showing the full 2,170-mi trail. SVG ported verbatim from Claude Design handoff. /dev/trail-map harness for visual diff.
- **#105** terrain grazing for oxen — per-terrain × season grazing quality, oxen draw on grain when grass is thin (mountains/desert/winter), travel +40% fatigue and slower rest recovery without feed; mountain/desert posts now stock grain; thin-grass chip on WagonPanel
- **#110** varied diet + coffee/tea bonuses — drawing from ≥2 nutrition groups (starch / meat / fresh) gives +1 morale; coffee/tea pulled out of calorie draw, brewed daily for +1 morale and a wired-in waterborne-disease −40% modifier; ~1 lb per 5 brew-days
- **#107** per-wagon equipment requirements — yokes now gate the hitched team (1 per pair of oxen); starter kit ships per-wagon yoke counts (1/2/3) and heavy wagons get a spare wheel + planks; major posts stock yokes; legacy saves get a one-time yoke top-up; "unyoked" warning chip on WagonPanel

## TODO

_(empty — items moved into the sections above)_
