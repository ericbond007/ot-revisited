# Daily Routines & Activities Emigrants Did

Cross-referenced against current Hoosier Trail mechanics (Travel/Rest/Hunt/Ford/Visit + camp actions). Each section ends with concrete game hooks for activities we don't model.

## 1. Daily schedule, guard duty, circling

The cadence was militia-tight. Bugle/rifle reveille at **4 a.m.**, breakfast 5:30, "Wagons Ho" at **7:00 a.m.**, midday **nooning** (1–2 hr rest, oxen unyoked but kept harnessed), camp by ~6 p.m., supper, then **two-hour guard rotations** through the night with the last shift firing the wake-up shot. Wagons formed a **corral ring** at night — chains lashed wheel-to-wheel — penning oxen inside when Indian raids were feared, outside on grass when not. Sunday "lay-by" days were common (and contested — religious trains lost a day's travel; pragmatic trains pushed on).

**Game hooks:**
- Travel days currently abstract this. Add a **nooning** mid-day beat that gives a small fatigue/morale tick or trip event slot.
- **Guard rotation roster** — assigning party members nightly costs a fatigue tick the next day; skipping a rotation increases theft/strays risk.
- **Sunday lay-by** as a player choice: morale + religious party bonus vs. losing a travel day.
- **Corral the wagons** decision at hostile-region camps: safer from raids, worse grazing.

## 2. Chores en route (the unmodeled grind)

Diaries are saturated with chore detail we elide. Women rose at 4 to **gather buffalo chips** (3+ bushels for a full meal — wet chips smoked unbearably); kids' job was a daily **chip hunt** in canvas aprons. Boys wiped trail-dust from oxen muzzles at noon to prevent suffocation. **Churning butter happened automatically** — a covered crock of cream hung off the wagon bow churned itself by suppertime. Bread was baked in cast-iron Dutch ovens buried in coals. Canvas needed re-greasing after rain; **axle hubs needed re-tarring/tallowing every 2–3 days** or they'd dry-burn. Sunday was traditional **washday**, often paired with creek camps (Sweetwater River had a notorious washday camp).

**Game hooks:**
- **Buffalo chip gathering** as a fuel-stockpile camp action in plains regions; requires a basket/sack item; dries up east of the Rockies.
- **Wagon-churned butter**: passive trickle of `butter` per travel day if a `milk_cow` + `crock` is owned. Ties into your milk-cow TODO #139.
- **Axle grease / wagon tar** as a consumable that auto-burns on travel days; running out triggers wheel-failure events.
- **Boys wipe oxen** — child party-member chore; if children present and assigned, small ox-fatigue reduction.
- **Washday camp action** on river camps — restores clothing condition (ties into clothing rework #16).

## 3. Foraging

Foraging was real but uneven. **Wild strawberries, gooseberries, currants, chokecherries, serviceberries** were diary staples east of South Pass. **Wild onions, prairie turnips (timpsila), camas bulbs** west of the Rockies. **Prairie chickens and sage grouse** were pot-shot from the wagon seat. Fish — **trout in the Sweetwater and Bear, salmon at the Snake/Columbia** — were major morale lifts. By the late 1850s 250k+ travelers had stripped easy foraging from the corridor; you had to walk a half-mile off-trail.

**Game hooks:**
- **Region-keyed forage table**: berries (Platte/Sweetwater), wild onions/camas (Snake plain), salmon-trade (Snake/Columbia), prairie chicken (eastern plains).
- **"Forage off-trail"** as a low-yield daily option distinct from Hunt: small food + small fatigue, no powder cost. Farmer/Hunter professions get bonuses.
- **Year-decay**: late-period years (1855+) get reduced forage yields to reflect corridor depletion — fits your year-gate pattern (#104).
- **Salmon trade** as a flagged activity at Fort Hall / Three Island Crossing / Snake landmarks.

## 4. Animal care (the morning time-sink)

The single biggest unmodeled time cost: **stray oxen**. Picket lines failed, oxen wandered miles for grass, and parties routinely lost **2–4 hours every morning** rounding them up. Diaries record entire days lost. Oxen also needed **shoeing** — far harder than horses because of the cloven hoof; emigrants improvised by **pouring hot mutton tallow** on cracked hooves. River crossings: **chaining wagon strings together** so lead oxen could pull the chain across; **swimming herds** separately (often losing animals downstream).

**Game hooks:**
- **Stray oxen morning event**: random N% chance of a 2–4 hr departure delay, modifiable by `picket_pins` item, herding dog (your #137), or a "Drover" trait.
- **Ox shoeing** as a wear mechanic; cracked hooves slow pace; `ox_shoes` + `mutton tallow` items at posts; failure → ox lost.
- **Herd swimming** sub-step on river fords: separate from wagon-ford check, can lose loose stock (cows, mules, chickens already on TODO).
- **Chain-coupling wagons** as a ford strategy choice: safer but slower.

## 5. Encounters with other parties

Trains constantly **merged, split, and renegotiated**. Fast trains shed slow families; mismatched stock caused divorces. **"Going-back" parties** — emigrants who'd quit and turned east — were a real institution, especially after Forts Laramie/Hall, and they were the prime **east-bound mail carriers** and news source. Forts plastered with letters on stick-boards. Emigrants **swapped surplus** (flour for bacon, sugar for coffee) more than they bought.

**Game hooks:**
- **Going-back party encounter**: optional letter-mail handoff, rumor/news payload (ties into news #150), chance to buy desperate-cheap supplies.
- **Train merge/split events**: optionally join a larger train (raid protection up, pace = slowest member); leave a slow train (pace up, morale down).
- **Stick-board letter post** at Forts: drop letters, read others' rumors of trail conditions ahead.
- **Inter-emigrant barter** at random encounters — distinct from trading-post pricing, more favorable rates.

## 6. Indian interactions

Most contact was **commercial, not violent**. Plains tribes (Pawnee, Sioux) charged **grass tolls** — a dollar or two per wagon for prairie passage. **Shoshone and Cayuse ran ferries** at the Green, Snake, and lower Columbia for cash or trade goods. **Salmon trade** with Nez Perce/Cayuse along the Snake-Columbia corridor was huge — fresh salmon for buttons, cloth, shirts, fishhooks. **Gift-giving was protocol**: tobacco, sugar, a shirt opened most parlays. Emigrants hired **Indian guides** for cutoffs and ford crossings.

**Game hooks:**
- **Grass / passage toll** events in plains chapters, gated by your tribe-relations system (#121). Refusing damages relations; paying = small cost.
- **Native ferry option** at Green/Snake fords — alternative to wading, costs trade goods, 100% safe.
- **Salmon trade-stops** as flagged interactions in Snake region.
- **Hire-a-guide** action for Sublette Cutoff or Barlow vs Columbia decision: lowers route risk, costs a shirt/blanket/tobacco.
- **Gift-first parlay**: small tobacco/sugar gift on first contact opens better trade rates.

## 7. Recreation & social life

Trail life had **fiddle music every other camp** — diaries from Catherine Haun, Lavinia Porter, J.G. Bruff describe nightly dancing, costume games, sing-arounds. **Trail weddings** happened (couples who met on the trip; chaplains or emigrant elders officiated). **Camp schools** for children on lay-by days. **Religious services** Sundays, lay-preached. **Christmas, Easter** observed where they fell. Your harmonica/fiddle/bible items (#109) hint at this but events are sparse.

**Game hooks:**
- **Camp dance** action on fiddle/harmonica nights: morale boost, requires the instrument item, costs sleep.
- **Trail wedding** as a rare random encounter: party morale spike, optional dowry trade.
- **Camp school** (lay-by + child + bible/book item) — small literacy/morale tick for kids.
- **Lay-preacher Sunday service** if a Preacher profession is in party; morale boost; consumes lay-by day.

## 8. Death & burial

Beyond digging: **a brief service was near-universal** — scripture read (Psalm 23, John 14), a hymn, sometimes a fired-rifle salute. Markers were **wagon-rim slats, charcoal-on-board, scratched stone**. Crucially, graves were often **dug in the wheel-rut and driven over by following wagons** to defeat both wolves and (feared) grave-robbing. **Multi-day disease camps** ("cholera hill" sites near Ash Hollow, Chimney Rock) where 8–12 burials happened in a stretch.

**Game hooks:**
- **Burial ritual choice**: scripture+marker (morale +, time cost), trail-disguised grave (morale -, no desecration risk), quick-and-go (morale --, possible event "grave was disturbed" rumor).
- **Wagon-rim marker** as a craftable from a broken wheel — flavor.
- **Rifle salute** option if `gunpowder` available — small morale, tiny powder cost.
- **Disease-camp landmark events** at Ash Hollow / Chimney Rock — cluster burials, multi-day mire.

## 9. Navigation & decisions

Captains carried **Marcy's, Palmer's, or Ware's guidebook** and read aloud nightly. **Scouts were dispatched ahead** at every fork to assess water/grass. **High-water waits** at the Kaw, Platte fords, and Snake routinely cost 3–7 days. Major forks: **Parting of the Ways** (Sublette Cutoff: 70 mi shorter, 50 waterless miles vs. Fort Bridger long-but-safe), **Hudspeth Cutoff** (1849+, bypass Fort Hall), **Barlow Road vs. Columbia raft** (toll $5/wagon + 10c/head vs. raft-and-pray).

**Game hooks:**
- **Guidebook item** with named author (Marcy/Palmer): unlocks fork-decision previews and ETA estimates.
- **Scout-ahead** camp action: 1-day cost, reveals next 3 trail tiles' hazards.
- **Wait for water to subside** explicit option at fords — costs days, drops drown risk.
- **Parting of the Ways modal**: explicit risk/reward fork (already partially modeled?). Sublette = +waterless events, -days. Hudspeth gates 1849+.
- **Barlow toll vs. Columbia raft**: cash + livestock-head fee vs. raft-disaster check.

## 10. Famous landmark events

Ready-made set-piece moments tied to specific landmarks:

- **4th of July at Independence Rock** — toasts, 30-gun sunrise salute (Bruff 1849), fiddle dance, antelope feast (Porter 1860). Win-condition flavor: "you reached the rock by the 4th."
- **Carving names at Register Cliff** — 1-day stop near Fort Laramie. Carve a party-member's name; persists in scoring screen / leaderboard.
- **Washday on the Sweetwater** — laundry camp at Sweetwater crossing #1; clothing-condition restore.
- **Soda Springs taste-test** — naturally carbonated; novelty morale event.
- **Ascent of South Pass** — anticlimactic crest (gentle), but it's "the top"; symbolic morale beat.
- **Chimney Rock first-sight day** — visible 2–3 days out; widely diarised "first real landmark" awe.
- **Ash Hollow descent** — wagons lowered by rope down a 25° grade; locked-wheel skid; unique terrain event.
- **Three Island Crossing** — choose the dangerous Snake ford (shorter) vs. the south-bank desert detour (Hudspeth-aligned).

Each of these maps cleanly onto your landmark-arrival event system (#115).

## Top-priority gaps shortlist

If you want one shortlist: stray-oxen morning delay (§4), buffalo-chip gathering (§2), grass-toll encounters (§6), trail-burial ritual choice (§8), 4th-of-July-at-the-Rock set-piece (§10), going-back party news handoff (§5).

## Sources

- [A Day on the Trail — Oregon Trail Center](https://oregontrailcenter.org/day-on-the-trail)
- [Traveling the Emigrant Trails — NPS](https://www.nps.gov/articles/000/traveling-emigrant-trails.htm)
- [What Was Life Like on the Oregon Trail — Meredith Allard](https://meredithallard.com/2021/10/04/daily-life-on-the-oregon-trail/)
- [NHOTIC Daily Life — BLM](https://www.blm.gov/learn/interpretive-centers/national-historic-oregon-trail-interpretive-center/field-trips/daily-life)
- [Some Mighty Fine Eatin' on the Oregon Trail — HHH](https://www.hhhistory.com/2014/07/some-mighty-fine-eatin-on-oregon-trail.html)
- [Oxen — NPS Oregon NHT](https://www.nps.gov/oreg/learn/historyculture/oxen.htm)
- [The Oxen Were the Unheralded Heroes — What It Means to Be American](https://whatitmeanstobeamerican.org/journeys/the-real-heroes-of-the-overland-trail-were-the-oxen/)
- [Crossing a River on the Oregon Trail by Oxen in 1852](https://greg.bennette.org/the-oxen/)
- [Life and Death on the Oregon Trail — OCTA](https://octa-trails.org/articles/life-and-death-on-the-oregon-trail/)
- [Let's Make a Deal — OCTA](https://octa-trails.org/trail-stories/lets-make-a-deal/)
- [Trading Post Forts — OCTA](https://octa-trails.org/articles/trading-post-forts/)
- [Fourth of July on the Overland Trails — NPS](https://www.nps.gov/articles/000/fourth-of-july-on-the-overland-trails.htm)
- [Independence Rock — WyoHistory](https://www.wyohistory.org/encyclopedia/independence-rock)
- [Register Cliff — WyoHistory](https://www.wyohistory.org/encyclopedia/register-cliff)
- [Register Cliff — Legends of America](https://www.legendsofamerica.com/wy-registercliff/)
- [Gravesites — OCTA](https://octa-trails.org/gravesites/)
- [The Nation's Longest Graveyard](https://geanderson.wordpress.com/2009/04/21/the-nations-longest-graveyard/)
- [Parting of the Ways — WyoHistory](https://www.wyohistory.org/encyclopedia/parting-ways)
- [Parting of the Ways — Wikipedia](https://en.wikipedia.org/wiki/Parting_of_the_Ways_(Wyoming))
- [Barlow Road — Wikipedia](https://en.wikipedia.org/wiki/Barlow_Road)
- [Where Did the Trail Go — End of the Oregon Trail](https://historicoregoncity.org/2019/04/03/where-did-the-trail-go/)
- [Rafting the Columbia — Died of Dysentery](https://www.died-of-dysentery.com/stories/rafting-columbia.html)
- [Oregon Trail — Wikipedia](https://en.wikipedia.org/wiki/Oregon_Trail)
- [Emigrant's Diaries and Journals — oregonpioneers.com](http://www.oregonpioneers.com/diaries.htm)
