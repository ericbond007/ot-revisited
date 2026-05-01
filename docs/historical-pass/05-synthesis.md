# Synthesis: Gap Analysis + Proposed TODOs

Distillation of the four research files into actionable TODO additions, grouped by theme. Each entry is one line, matching `TODO.md` format. Bracketed labels: `[S]` small (single-day branch), `[M]` medium (2-3 day branch), `[L]` large (multi-task plan).

---

## What we already have right

The codebase audit shows we're more historically grounded than expected. Already correct:

- Calomel as toxic mercury purgative (period-accurate) — `[01]` confirms.
- Patent medicine as 50/35/15 snake-oil RNG — period-accurate.
- Tar bucket = 0.75× wagon decay — period-correct (pine tar + tallow axle dressing).
- Cooking-fire required for water purification post-1854 (germ theory pre-Snow) — period-correct.
- Cholera 1849/1852 spikes; Whitman 1847 closure; Fort Hall 1856 abandonment — period-correct.
- Buffalo robes as primary winter warmth from native trade — period-correct.
- Pemmican as never-spoils pinnacle food — period-correct.
- Jerky requires salt OR 2× time — period-correct.

## Themed proposed TODOs

### A. Items / inventory expansion (low-risk, high-flavor)

| Theme | Proposed entry | Effort |
|---|---|---|
| Medicine kit | Epsom salts + medicine kit fill-out (camphor, paregoric, hartshorn, Dover's powder, castor oil) — period-correct, varying purgative/pain/wound-soak roles | [M] |
| Wagon supplies | Axle grease as consumable — auto-burns 1 unit per ~200 mi traveled; running out triggers wheel-failure events more often | [S] |
| Wagon supplies | Spare ox bow + ox shoes + nails inventory items — wear/replacement cycle (pairs with #201 forge ox shoes) | [S] |
| Trade goods | Trade goods bundle expansion — small mirrors, vermilion, awls, brass thimbles, calico cloth, pocket knives (extends native trade options) | [M] |
| Tools | Guidebook item (Marcy / Palmer / Ware) — owning unlocks fork-decision previews and ETA estimates | [M] |
| Comfort | Tent (canvas A-frame) — reduces cold-camp morale drain; many slept under wagon without one (period-accurate luxury) | [S] |

### B. Daily routine mechanics (medium impact)

| Theme | Proposed entry | Effort |
|---|---|---|
| Fuel | Buffalo chip gathering — plains-only camp action; substitutes for firewood east of Rockies; 4 a.m. women/kids chore | [M] |
| Animal care | Stray oxen morning event — random 2-4 hr departure delay; mitigated by picket pins, dog (#137), Drover trait | [M] |
| Animal care | Wagon-churned butter — passive butter trickle when milk cow + crock owned (folds into #139) | [S] |
| Chores | Washday camp action — river camps only; restores clothing condition (ties #16); Sunday tradition | [S] |
| Chores | Sunday lay-by choice — religious morale + Preacher bonus vs. losing a travel day | [S] |
| Schedule | Nooning mid-day beat — small fatigue tick + extra event slot; abstract today | [M] |
| Encounters | Going-back party encounter — eastbound family, mail handoff, cheap surplus supplies, news payload (extends #150) | [S] |

### C. Set-piece landmark events (low-effort, high-flavor)

These are "ready-made" — landmark exists in code, attach a unique event:

| Theme | Proposed entry | Effort |
|---|---|---|
| Calendar | 4th of July at Independence Rock — date-gated set-piece: 30-gun salute, fiddle dance, antelope feast, +6 morale; iconic finish-by-July-4 goal | [S] |
| Landmark | Carving names at Register Cliff — 1-day stop; carve a party member's name; persists in scoring screen | [S] |
| Landmark | Soda Springs taste-test — carbonated novelty event; +2 morale flavor beat | [S] |
| Landmark | Washday on the Sweetwater — laundry camp at first Sweetwater crossing; clothing restore (+ ties #16) | [S] |
| Landmark | Ash Hollow descent (Windlass Hill) — wagons lowered by rope; locked-wheel skid; unique terrain event with damage-on-fail | [S] |
| Landmark | South Pass crest beat — symbolic morale moment; "you've reached the top" | [S] |
| Landmark | Chimney Rock first-sight day — 2-3 days out; emigrant awe text | [S] |
| Choice | Three Island Crossing — explicit ford vs south-bank desert detour modal | [M] |
| Choice | Barlow Road toll vs Columbia raft — $5/wagon + 10c/head vs raft-disaster check (1846+ gate) | [M] |
| Cluster | Disease-camp landmark events — Ash Hollow / Chimney Rock cluster burials in cholera years | [M] |

### D. Native interaction expansion (extends #121)

| Theme | Proposed entry | Effort |
|---|---|---|
| Encounter | Grass / passage toll — Plains tribes charge $1-2/wagon for prairie passage; refusal damages relations | [S] |
| Ford | Native-run ferry option — Shoshone/Cayuse-run ferries at Green/Snake/Columbia; trade-good cost, 100% safe | [M] |
| Encounter | Salmon trade stops — flagged interactions Snake/Columbia corridor; trinkets-for-fresh-salmon | [S] |
| Encounter | Hire-a-guide for cutoffs — Indian guide for Sublette or Barlow vs. Columbia decision | [M] |
| Encounter | Gift-first parlay — small tobacco/sugar gift on first contact opens better trade rates | [S] |

### E. New landmarks (purely additive, low risk)

Trail mileage redistribution — currently 2195 mi, can stay; insert new landmarks between existing legs.

| Mile (approx) | Proposed entry | Effort |
|---|---|---|
| 40 | Lone Elm Campground (KS) — first-night company-organizing camp; tree dead by 1844 | [S] |
| 145 | Vieux's Crossing (KS) — toll bridge + 1849 cholera cemetery beside ford | [S] |
| 230 | Rock Creek Station (NE) — 1857+ road ranch; Wild Bill Hickok shootout site | [S] |
| 510 | Windlass Hill (NE) — descent into Ash Hollow; rope-lower scene | [S] |
| 516 | Rachel Pattison Grave (NE) — iconic 1849 cholera death; preserved headstone | [S] |
| 810 | Mormon Ferry / Fort Caspar (WY) — last North Platte crossing; toll ferry 1847+, bridge 1853 | [M] |
| 855 | Martin's Cove (WY) — 1856 handcart disaster memorial; 145 dead | [S] |
| 1140 | Big Hill (ID) — brutal Bear Valley descent; teams doubled, wagons rough-locked | [S] |
| 1290 | Massacre Rocks (ID) — 1862 narrow basalt gap; pre-1862 just "Gate of Death" | [S] |
| 1450 | Salmon Falls (ID) — Shoshone fishery; salmon-for-trinkets diary highlight | [S] |
| 1680 | Burnt River Canyon (OR) — tortured zigzag through brushy gorge; diaries hated it | [S] |
| 1720 | Flagstaff Hill (OR) — first view of Blue Mountains from Virtue Flat | [S] |
| 1965 | Laurel Hill (OR) — worst descent of trail; 60% grade, wheels locked, trees dragged | [M] |

### F. Diary library (#210 expansion)

The current journal/atlas TODO #210 should absorb this:

| Theme | Proposed entry | Effort |
|---|---|---|
| Sources | Diary library — five-diarist starter set (Frizzell, Knight, Geer, Whitman, V. Reed Murphy) verbatim transcribed into `src/lib/game/content/diary-entries.ts` | [M] |
| Display | Journal screen rendering diary entries by mile/landmark/event; period parchment aesthetic | [M] |
| Integration | Diary excerpt attachments on key events — cholera, ford, burial, native trade, awe-moments fire matched diary line in event modal | [M] |

### G. Set-piece social events

| Theme | Proposed entry | Effort |
|---|---|---|
| Camp | Camp dance action — fiddle/harmonica required; morale + sleep cost; nightly trail tradition | [S] |
| Encounter | Trail wedding — rare encounter; party morale spike, optional dowry trade | [S] |
| Camp | Lay-preacher Sunday service — Preacher profession + lay-by day; morale boost | [S] |
| Burial | Burial ritual choice — scripture+marker / disguised-grave / quick-and-go (replaces #151 dig-grave rework) | [M] |
| Camp | Rifle salute on burial — gunpowder option; tiny powder cost, small morale | [S] |

### H. Navigation / decision system (deferrable, complex)

| Theme | Proposed entry | Effort |
|---|---|---|
| Choice | Wait for water to subside at fords — explicit option; days cost, drown-risk drop | [S] |
| Camp | Scout-ahead camp action — 1-day cost; reveals next 3 trail tiles' hazards; needs guidebook? | [M] |
| Choice | Train merge/split events — join larger train (pace = slowest, raid protection up) or leave (pace up, morale down) | [L] |

---

## Recommended priority order

If picking five to ship next, in order:

1. **#NEW Epsom salts + medicine kit fill-out** — directly answers the user's research question; pure additive content, low risk.
2. **#NEW 4th of July at Independence Rock** — iconic, calendar-gated, lights up an existing landmark, ~1 day of work.
3. **#NEW Stray oxen morning delay** — biggest unmodeled time sink; teaches a real period reality.
4. **#NEW Buffalo chip gathering** — region-keyed fuel; ties firewood mechanics to plains terrain.
5. **#210 Trail journal + diary library** — already on the list; high educational payoff.

Each is `[S]` or `[M]`, individually shippable, and reinforces the "fun + educational" thesis. The landmark-additions block (E) is also viable as a single bulk-add branch — drop in 5-8 new landmarks at once.
