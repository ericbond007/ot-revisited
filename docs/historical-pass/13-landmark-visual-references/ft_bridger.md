# Fort Bridger — Landmark Visual Reference

**VK task:** [#1113](https://projects.ericbond.net/tasks/1113)
**Game landmark:** `trading_post` at mile ~1070, Black's Fork of the Green River, WY
**Code note:** `priceMultiplier: 1.5` (gouge tier — period diaries are consistent on this). No `abandonedAfterYear` gate is set in the code, but the historical reality is a near-total closure from Oct 1857 through mid-1858: the Mormons burned it, the Army wintered at Camp Scott two miles away, and active emigrant trading did not resume until the Army opened its rebuilt post. An implementer may want a year-gated burned/closed state for 1857–58.
**Game window:** 1843–1860
**Period states covered:** Three — (1) 1843–1855 Bridger & Vasquez trapper-trader post; (2) 1855–1857 Mormon-fortified; (3) 1858–1860 US Army rebuild. Plus brief note on the 1857–58 ruin.

---

## Setting and approach

Fort Bridger sits at roughly 6,675 feet elevation in the broad, flat Bridger Valley on the upper Black's Fork of the Green River, southwestern Wyoming — sage high-desert basin country, backed to the south by the blue-grey wall of the Uinta Mountains. The approach from the east is emphatically NOT spectacular: no prominent rock formation, no dramatic canyon. It is a gradual descent into a wide basin. Sage (silver-grey, waist-high) dominates the uplands; the river bottom is the only green in the scene.

Black's Fork at the fort divides into multiple shallow braided channels forming low willow-and-cottonwood-fringed islands. The narrow-leaf cottonwood and thick willows along the water make a vivid ribbon of green cutting through the sagebrush palette. In the Bridger & Vasquez era this bottomland was the fort's main selling point: the grass was thick, the water clean, and an exhausted ox team could be turned out to recover before the next mountain push. The fort itself was placed on one of these islands. Captain Howard Stansbury noted in 1849 that Black's Fork "divides into three principal channels, forming several extensive islands, upon one of which the fort is placed."

**Palette for the valley approach:**
- Sage upland: grey-green `#8a9a6a` to silver-grey `#b0b89a`
- Cottonwood/willow ribbon: vivid sage-green `#6b8c52` shading to deeper `#4a6b3a` in summer
- Black's Fork water: grey-blue `#7a9aac` — shallow, braided, not a dramatic river
- Sky: high-desert blue, bright, often cloudless in July–August when most emigrants passed
- Uinta Mountains backdrop (south): dark blue-grey `#3a4a5a` with lingering snow patches visible at high elevations even in July
- Valley floor soil: pale tan `#c8b887` where exposed

---

## Period State 1: Bridger & Vasquez Trapper-Trader Post (1843–1855)

### What it was

Small by any measure. Bridger himself set expectations: in a December 1843 letter he wrote, *"I have established a small fort, with a blacksmith shop and a supply of iron in the road of emigrants on Black Fork of Green River, which promises fairly."* Visitors in the 1840s consistently arrived expecting something like Fort Laramie — walls, bastions, the weight of a trading empire — and found a cluster of rough log buildings that barely registered against the landscape.

The structure evolved incrementally over the twelve-year Bridger & Vasquez period. Early accounts describe just two log houses; by the early 1850s it had grown to a quadrangle configuration. The following period accounts, taken together, establish what a renderer needs to know:

**Orson Pratt, July 7, 1847** (Mormon Pioneer Company advance scout):
> "Bridger's post consists of two adjoining log houses, dirt roofs, and a small picket yard of logs set in the ground, and about eight feet high."

**Edwin Bryant, 1846** (California-bound emigrant, published *What I Saw in California*, 1848):
> "The buildings are two or three miserable cabins, rudely constructed and bearing but a faint resemblance to habitable houses."

**Joel Palmer, July 25, 1845** (Oregon emigrant, published *Journal of Travels over the Rocky Mountains*, 1847):
> "It is built of poles and daubed with mud; it is a shabby concern. Here are about 25 lodges of Indians, or rather white trapper's lodges, occupied by their Indian wives."

**Mrs. Benjamin G. Ferris, October 1852** (passing through with her husband, Utah territorial official):
> "a long, low, strongly-constructed log building, surrounded by a high wall of logs, stuck endwise in the ground."

**William K. Sloan, summer 1853** (emigrant, later recalled in his autobiography):
> "a string of log houses built in the shape of a quadrangle, with a gate on one side opening into the square. The doors and windows, or rather openings, were on the inside."

The evolution implied by these accounts: 1845–47 = two-house proto-fort with rudimentary picket yard; by 1852–53 = a more organized quadrangle of log structures with proper enclosure, though still modest. Biographer Stanley Vestal synthesizes the structure as *"an eight-foot stockade, with a corral adjoining on the north. Within that stockade stood four log cabins with flat dirt roofs."*

### Architectural specifics for rendering

**Overall footprint:** Compact. The enclosed yard was small — the "hollow square" described by Stansbury contained lodging and offices, but period photos of similar mountain-trade posts suggest no more than 60–80 feet per side. The Wyoming Genealogy research summary gives "two rude double-log houses about 40 feet in length, joined with a pen for horses" as the initial form — this is a small compound.

**Stockade wall:**
- Logs set vertically (endwise) in the ground — the "picket" construction standard for Western trade posts, not horizontal-log construction
- Height: ~8 feet per Orson Pratt, consistent with other accounts
- No gun-ports, no watchtower — this was a commercial post, not a military one
- The logs would be locally sourced: cottonwood from the river bottom is the most likely material in this area, supplemented with whatever conifer could be hauled from the Uintas

**Log buildings:**
- Flat dirt roofs (Orson Pratt, corroborated by the broader pattern of mountain-trade construction in this climate — pitched roofs were uncommon; dirt provided insulation)
- Walls: rough-hewn green logs, not finish-worked. The "poles and daubed with mud" (Joel Palmer) is the key visual: gaps chinked with mud-and-grass daub rather than tight-fitted timbers. The mud chinking would show between logs as dark horizontal lines.
- Doors and windows faced inward toward the central yard, not outward (Sloan) — the outward face was wall only, the door situation was protective.
- Low silhouette: one story throughout, probably 7–9 feet plate height, fitting under the flat dirt roof

**Corral:**
- North of the stockade (Vestal account)
- Likely a pole-rail fence extending from the stockade wall, not logs set vertically
- Large enough for horses and mules — the blacksmith shop and livestock trade were central to the business

**Blacksmith shop:**
- Bridger specified this in his founding letter; it was the fort's main differentiator from a simple roadside camp
- Likely a distinct building within or adjacent to the enclosure, identifiable by a forge chimney

**Indian/trapper lodges:**
- Palmer noted ~25 lodges surrounding the compound — this is a major visual element
- These were conical hide or canvas tipis/lodges of the trappers' Indian wives and extended trade families
- Set outside the stockade walls in an irregular ring
- By 1846, Bryant noted "an immense number of oxen and horses scattered over the entire valley, grazing upon the green grass" and "circles of white-tented wagons in every direction" during peak emigrant season — so the fort in summer was embedded in a large chaotic camp, not sitting alone

**Color palette, Bridger & Vasquez era:**
- Log walls: weathered grey-tan `#8a7a60` to `#7a6a50` — these logs would not be fresh-cut pale yellow; in even one Wyoming winter they'd weather to this tone
- Mud chinking: red-brown clay `#8b5e3c` — Black's Fork bottomland soils are clay-heavy
- Dirt roofs: pale tan-brown `#b09a74`, with rough grass growing if summer
- Stockade pickets: slightly darker than the cabin walls, grey-brown `#6a5a42`
- Blacksmith chimney: fieldstone or adobe, grey `#8a8a7a`

### What NOT to render for this period

- **The modern state historic site's "reconstructed trading post"** is an interpretive reconstruction, not an archaeological replica. It uses hewn log construction that is tidier than the period accounts warrant. The real Bridger & Vasquez post was rough, not quaint.
- **Any stone wall.** The cobblestone wall is 100% Mormon construction (1855). The Bridger & Vasquez period had log pickets only.
- **A large fort.** It was small. Emigrants were routinely disappointed. Render it as a collection of low log structures, not a commanding installation.
- **A proper roof pitch.** Flat dirt roofs, or nearly flat, throughout.
- **Windows with glass.** Openings, not glazed windows.

---

## Period State 2: Mormon-Fortified (1855–1857)

### What happened

The ownership transition is historically contested. The deed dated August 3, 1855 (not recorded until October 21, 1858) purports to transfer Fort Bridger to the LDS Church for $8,000 in gold coins — $4,000 down, balance due November 3, 1856. The deed was signed by H.F. Morrell under a power of attorney, witnessed by Alinerin Grow and William Adams Hickman ("Wild Bill" Hickman — who later burned the fort). **Bridger denied the sale**, claiming he was absent serving as a guide for Sir St. George Gore at the time his signature was affixed. Vasquez is generally understood to have accepted the arrangement. Whether this was a legitimate purchase, a forced sale under duress, or an opportunistic seizure remains a live historiographical dispute — different LDS and non-LDS sources render it differently. The visual reference doc need not adjudicate this; both traditions agree the Mormons took possession and built the stone wall.

The Mormons had clear strategic intent: Brigham Young intended Fort Bridger as the eastern bastion of the State of Deseret, and with the Utah War looming, that meant fortifying. They built extensively in 1855–1857.

### The cobblestone wall — the dominant visual element

This is the architectural centerpiece of the Mormon period and the fact that most distinguishes this state from the Bridger & Vasquez period. An Army report filed after the fort's capture in November 1857 (reproduced in multiple secondary sources via the New York Times correspondent) gives the clearest technical description:

> "The wall of the Fort is built of cobble-stone, laid in mortar, four feet thick at the bottom, about two feet thick at the top, and twenty feet in height. Adjoining this wall is a large corral, enclosed by a stone wall of the same description, about eight feet in height. These improvements were found uninjured, but the wooden gates were almost entirely consumed by fire; all the buildings which surrounded the Fort were also burned to the ground."

Archaeological excavations conducted in summer 1990 under archaeologist A. Dudley Gardner confirmed the wall's construction: cobblestone ("cobblerock") with mortar, base width approximately 5 feet, surviving height approximately 15 feet at excavated sections (the original 20-foot claim may be slightly generous or represent the gate towers). The enclosure measured approximately 100 feet square.

Secondary sources consistently cite the wall as "eighteen feet high" — the Army report's "twenty feet" and the archaeology's surviving ~15 feet and the secondary "eighteen feet" are in a plausible range given settling and partial demolition.

**Wall material:** The "cobblestone" here means **river cobbles** — rounded stones carried by Black's Fork and the Green River, available in abundance in the valley. Not cut stone, not quarried limestone. The mortar was likely a lime-sand mix. Color: grey-tan fieldstone, irregular rounded shapes, with visible mortar joints — `#8a8278` for the cobblestone face, `#c0b49a` for the mortar.

**Interior:** In addition to the wall, the Mormons constructed "thirteen log structures" within the enclosure (per secondary accounts that cite claims paid to Vasquez's widow). These were improved versions of the existing cabins — still log construction, but the Mormons were competent builders and the 1855–57 structures would have been tighter and more finished than Bridger's originals.

**Gates:** Wooden — and burned first when the Mormons torched the fort. The Army found the gates "almost entirely consumed" while the stone walls stood intact.

**The corral:** Larger than Bridger's original pole-rail corral, now enclosed by the same cobblestone wall at ~8 feet height, extending from the main enclosure.

**Situation:** The fort still sat in the same Black's Fork bottomland, still surrounded by willows and cottonwood. In the Mormon period, however, the surrounding trapper-lodge camp would largely have disappeared — the Mormons were not operating a trapper-trade business, they were running an emigrant resupply station (primarily for Mormon emigrants on the Mormon Trail) and garrisoning a strategic point. The setting becomes less chaotic camp, more deliberate settlement.

**Color palette, Mormon-fortified era:**
- The cobblestone wall is the dominant visual: grey-tan river rock `#8a8278`, mortar lines `#c0b49a`
- Wall interior and log buildings: same weathered log tones as Bridger period, but somewhat less dilapidated
- The wall height (18–20 feet) would visually dominate over the one-story log structures inside — from outside, you see wall, not buildings
- Wooden gate: dark-weathered wood `#5a4a32`

### What NOT to render for this period

- **A log-picket stockade.** That's the Bridger period. The Mormon wall is stone.
- **A small, rough compound.** The Mormons improved the site substantially. This is the most imposing of the three states.
- **The modern site's mix of eras.** The reconstructed trading post on-site today represents the Bridger period, not the Mormon period.

---

## Interlude: Ruin State (October 1857–mid-1858)

### What the Army found

Mormon militiamen William Hickman and his party burned Fort Bridger between September 27 and October 7, 1857 (sources vary on the exact date; the Army arrived November 14, 1857 and found the ruins). Hickman also burned Fort Supply, 12 miles south, and destroyed forage within seven miles of the fort.

When Colonel Albert Sidney Johnston's forces arrived, they found the scene described in the Army/NYT correspondent's report quoted above: wooden gates consumed, all internal buildings burned to the ground, but the cobblestone walls intact and undamaged. A black-and-white cat was found among the ruins "maintaining her lonely watch." Small vegetable caches — three bushels of potatoes, patches of turnips and beets — survived in the ground; five acres of cut hay survived in the meadow.

Johnston used the stone enclosure as a supply storage area and established Camp Scott for winter quarters two miles away, where soldiers lived in Sibley tents through the brutal Wyoming winter of 1857–58.

**For rendering:** The ruin state is visually stark — cobblestone walls still standing 18–20 feet high, intact, but interior is ash and blackened timber stumps. Wooden gates replaced by open gaps. Snow in the typical rendering window (November–May for the winter period). The Uinta Mountains would be fully snow-covered. The bottomland willows leafless and grey. The ruin is monumental stone walls enclosing nothing but char.

This state is a short game-window slice and probably not a primary rendering target, but if rendered: cobblestone wall color unchanged, interior shows burnt log ends `#2a1a0a` protruding from snow-dusted ash `#d0c8b8`, sky leaden grey.

---

## Period State 3: US Army Fort Bridger (1858–1860)

### What was rebuilt

Following the resolution of the Utah War (negotiated peace mid-1858), Colonel Johnston's forces formally took possession of the site and the Army began rebuilding. Major William Hoffman commanded from June 7, 1858. Lieutenant Colonel Hoffman erected log buildings during summer 1858; the Government formally established the military post and reservation under the old Fort Bridger name. A military reservation of 500 square miles was established July 14, 1859.

The Army build followed standard Western military post architecture of the period: **no perimeter wall.** The buildings faced inward toward a central open parade ground. This is completely different from both the Bridger & Vasquez stockade and the Mormon cobblestone wall. The site opened up spatially — wide parade ground, buildings on three or four sides, no enclosing barrier.

### Surviving structures and construction details

From existing Wyoming State Historic Site documentation and the surviving 1858-era buildings:

- **Log officer quarters duplex (1858):** One of the oldest surviving buildings on the site. A small duplex — two doors, two windows per side — in horizontal-log construction, chinked, with a wooden-shingle roof (an improvement over the flat dirt roofs of the Bridger era). Likely whitewashed or lime-washed by the 1860s, though the very early 1858 version would have been raw log.
- **1858 sentry box:** Small, visible from the road
- **1858 guardhouse:** A more substantial log building, now crumbling ruin
- **Storehouses and troop quarters:** Erected by elements of the Sixth and Tenth Infantry and First Cavalry. Likely horizontal-log or whipsawed plank construction, gable-roofed.
- **Sutler's store and post office (combined):** William A. Carter arrived as sutler in 1858; his store was a focal point of the post
- **Mormon Wall (surviving):** The cobblestone wall was not demolished — it was kept as the east/northeast boundary of the supply corral area and as storage. By the late 1850s it had become an archaeological feature within the military post. A portion remains visible today.
- **Pony Express barn:** The fort served as a Pony Express station 1860–1861; the surviving Pony Express barn at the modern site dates from this era

**Layout:** Parade ground as center. Buildings on the north, south, and east sides. The Mormon wall on the east was incorporated as a boundary. The fort by 1860 was open-plan — no gates, no enclosure wall, just the parade ground and its facing buildings.

**Scale:** Considerably larger footprint than either prior state. The 1859 military reservation was enormous (500 square miles), but the built compound was still modest — a frontier Army post, not a large cantonment.

**Color palette, Army era:**
- Log walls: weathered grey-tan `#8a7a60` (same underlying material, but more consistently chinked and maintained)
- Parade ground: packed earth, pale tan-grey `#c0b49a`, rutted
- Roofs: wooden shingles, grey-brown `#6a5a44`
- The Mormon cobblestone wall still present on the east: same grey-tan river rock `#8a8278`
- Flag: US Army post would have a flagstaff and American flag on the parade ground — a visual marker absent from both prior states
- Background willows and cottonwood remain (the river setting is unchanged)

### What NOT to render for this period

- **A stockade or perimeter wall.** The Army did not enclose the post. Open parade ground.
- **The full Mormon cobblestone wall as a perimeter.** It was partial and incorporated as a storage boundary, not the fort's dominant visual.
- **The later-era stone/brick buildings.** The 1884 stone barracks building (which houses the modern museum) postdates our game window by 24 years. Do not render it. The 1858 post was log construction.
- **The Lincoln Highway cabins or modern visitor infrastructure.** Obvious anachronism.
- **A tidy, whitewashed Army post.** In 1858–1860 the post was still raw — new log buildings, muddy parade ground, working frontier post, not a polished installation.

---

## FLUX Prompts

### Period 1: Bridger & Vasquez Trading Post (1843–1855)

**Recommended default for most game-window renders.** Covers the longest single period (12 years) and the span when most Oregon Trail emigrants would have arrived — the game's core audience is heading to Oregon or California, not Utah.

```
Frontier trading post on the Black's Fork of the Green River, Wyoming Territory, 1847, golden afternoon light. Low rough-hewn log buildings with flat mud roofs arranged around a small central yard, logs weathered grey-tan, gaps chinked with red-brown clay mud. Eight-foot vertical log picket stockade wall surrounding the compound, cottonwood logs set endwise in the ground, weathered to grey-brown. Small blacksmith shop with stone chimney visible. Wide dirt-floored corral of pole rails extending north from the stockade. Outside the walls, a dozen conical hide lodges of Native and mixed-blood trapper families, scattered informally. River-bottom cottonwood trees and dense willows lining the braided Black's Fork channels, vivid green ribbons across a grey-green sagebrush plain. Distant blue-grey Uinta Mountains with snow patches on the highest ridges to the south. Exhausted ox teams and loose horses grazing the river-bottom grass. Three emigrant wagons with sun-bleached canvas tops visible near the stockade gate. Sky a clear high-desert blue, no clouds. Realistic, painterly, not glamorized.
```

### Period 2: Mormon-Fortified (1855–1857)

```
Fortified trading post in the Green River basin of Utah Territory, 1856, midday summer light. Imposing cobblestone wall eighteen feet high enclosing a square compound one hundred feet across, river cobbles laid in mortar, tan-grey stone with visible mortar lines, rectangular and rounded stones mixed. Wooden gate partially open, heavy timber construction. Low log buildings visible inside the enclosure, one story, flat or shallow-pitch roofs. Large stone-walled livestock corral extending from the main enclosure, cobblestone walls eight feet high. The surrounding landscape is open sagebrush high desert, grey-green sage to the horizon. Black's Fork cottonwood and willow trees visible along the river to the south. Blue Uinta Mountains backdrop. The setting is deliberate and militarized, less chaotic than a typical emigrant camp — few people visible, the stone walls conveying permanence and defensive intent. Realistic period illustration style.
```

### Period 3: US Army Fort Bridger (1858–1860)

```
United States Army frontier post on Black's Fork, southwestern Wyoming Territory, 1859, early morning light with long shadows. Open parade ground of packed earth as the central feature, no enclosing perimeter wall. Log buildings facing the parade ground on three sides: officer quarters duplex with two doors and chinked log walls on the left, low log barracks in the background, sutler's store on the right with a wide porch. Wooden flagpole at the center of the parade ground, American flag flying. Remnant cobblestone wall visible on the far east edge of the compound, incorporated as a storage enclosure. Roofs are wooden-shingle gable construction. The setting is open and airy compared to a stockaded post. River-bottom cottonwood and willow trees along Black's Fork behind the buildings. Uinta Mountains snowy in the background. Two soldiers in blue US Army uniforms visible near the flagpole. A sutler's wagon near the store. The fort is functional but unpolished, raw log construction, muddy ground. Realistic, muted palette, western plains morning light.
```

---

## Source quality notes and open questions

### On the Mormon purchase vs. seizure

The primary documents are: (1) the August 3, 1855 deed, signed by Morrell under power of attorney for both Bridger and Vasquez, witnessed by Grow and Hickman; (2) Bridger's later denials that he authorized any sale; (3) Vasquez's general acceptance of the arrangement. Most LDS-institution sources treat this as a purchase. Most Bridger-biography sources emphasize the coercive circumstances and Bridger's denial. The game should not adjudicate this; the visual reference doc simply notes the dispute exists and that both parties agree the Mormons took possession and built the stone wall.

### On sources not reached

- **Fred Gowans and Eugene Campbell, *Fort Bridger: Island in the Wilderness* (1975)** — the definitive monograph, cited in all secondary sources. Not available online; a physical library copy would provide more precise architectural detail for the Army period than online sources can. This is the primary gap in this document. The Gowans & Campbell work is specifically noted in the prompt as the ideal source; it was not accessible in this research pass.
- **The full Stansbury 1852 report** (*Exploration and survey of the valley of the Great Salt Lake*) — the architectural description in Stansbury's published government report describing Fort Bridger "built in the usual form of pickets, with lodging apartments and offices opening into a hollow square" appears in secondary sources but the full primary text was not retrieved. The secondary-source paraphrase is consistent with Sloan's direct account of the same configuration.
- **William Henry Jackson photographs of Fort Bridger** — Jackson photographed the Army-era post (a photograph is indexed at BYU's digital Jackson collection), but the image metadata was not accessible. The photo would be the best single reference for the 1860s–1870s Army post appearance. Note that any Jackson photo of Fort Bridger is from 1869–1870 at the earliest, which is outside our game window but represents the same building stock.

### On prices

The `priceMultiplier: 1.5` is well-supported by period accounts. Thomas Bullock (Mormon Pioneer Company, 1847) noted that "few succeeded" in making trades "as they could not obtain sufficient for their goods." The high-price complaint appears in multiple emigrant diaries. Bridger was not a great storekeeper; stock was often sparse and prices high.

### On the "Fort Supply" question

A commenter on the Wyoming Genealogy site disputes whether the Mormons renamed Fort Bridger to "Fort Supply." The consensus in secondary sources is that Fort Supply was a distinct Mormon establishment approximately 12 miles south of Fort Bridger, established 1853. Both were burned in 1857. Renderers should not conflate them. Fort Supply was a separate Mormon agricultural settlement, not the fortified trading post.

---

## Visual reference materials

| Source | What it provides |
|---|---|
| [WyoHistory — Fort Bridger](https://www.wyohistory.org/encyclopedia/fort-bridger) | Best single narrative overview; Bridger&Vasquez, Mormon, Army periods |
| [Wikipedia — Fort Bridger](https://en.wikipedia.org/wiki/Fort_Bridger) | Reliable structural overview; has the Ferris 1852 quote and Stansbury reference |
| [Legends of America — Fort Bridger](https://www.legendsofamerica.com/wy-fortbridger/) | Palmer 1845 and Bryant 1846 quotes; broad multi-period summary |
| [Wyoming Genealogy — James Bridger and His Post](https://wyominggenealogy.com/uinta/james_bridger_and_his_post.htm) | Stansbury 1849, Sloan 1853 quadrangle account |
| [Wyoming Genealogy — History of Fort Bridger](https://wyominggenealogy.com/uinta/history-of-fort-bridger.htm) | Mormon wall "100 feet square, fourteen feet high boulder wall" sourcing |
| [Church News — Mormon Wall excavated (1990)](https://www.thechurchnews.com/1990/9/1/23261444/mormon-wall-at-fort-bridger-excavated/) | Archaeological dimensions: 5-ft base, ~15-ft surviving height, cobblestone with mortar |
| [Wyoming Tales and Trails — Fort Bridger, Mormon War](http://www.wyomingtalesandtrails.com/bridgera.html) | NYT correspondent's Army report quoting wall dimensions (4-ft base, 2-ft top, 20-ft height); ruin description with cat |
| [Intermountain Histories — Fort Bridger Crossroads of the West](https://www.intermountainhistories.org/items/show/243) | Army period layout; open parade ground; military building stock |
| [NPS Mormon Pioneer NHT — Fort Bridger](https://www.nps.gov/mopi/planyourvisit/fort-bridger.htm) | Thomas Bullock 1847 trade-difficulty account; trail junction significance |
| [Utah History Encyclopedia — Fort Bridger](https://www.uen.org/utah_history_encyclopedia/f/FORT_BRIDGER.shtml) | Stone wall "vestiges remain"; burning date; Hoffman reconstruction |
| [Library of Congress — Fort Bridger LOC photo set](https://www.loc.gov/item/2017688295/) | Interior of Army-era officer's quarters photo (modern interior of 1858 structure) |
| [Donner Party Diary — July 1846](https://www.donnerpartydiary.com/jul46.html) | James Reed diary entries at Fort Bridger; "beautiful Grass bottom" landscape description |
| [Spartacus Educational — Fort Bridger](https://spartacus-educational.com/WWfortbridger.htm) | Edwin Bryant and James Reed quotes; emigrant-camp-around-fort description |

---

## Recommendation: default rendering

**Period 1 (Bridger & Vasquez trapper-trader post) is the correct default.** It covers 1843–1855 — twelve years, the longest single state, and the period when the vast majority of Oregon Trail emigrants arrived. An emigrant departing Independence in April 1845 would arrive at Fort Bridger in July, well within the Bridger & Vasquez period. The Mormon period (1855–57) covers only two emigrant seasons at peak, and the Army period (1858–60) is outside the core trail years for most player archetypes.

The Period 1 prompt should fire for any player year from 1843–1854. A year gate at 1855–1857 could fire the Mormon-fortified prompt. 1858+ fires the Army prompt. A narrow 1857–58 burned state is achievable with the ruin description above if the implementer wants full historical fidelity for those two seasons.
