# Rock Creek Station — Visual Reference

**Trail position:** Mile ~230, southeastern Jefferson County, Nebraska
**Landmark id:** `rock_creek_station`
**Vikunja ticket:** #1086 — https://projects.ericbond.net/tasks/1086
**Component status:** NONE — needs new `src/lib/ui/landmark-art/RockCreekStationArt.svelte` + registry entry in `LandmarkArt.svelte`
**Code flags:** `postKind: 'frontier'`, `abandonedBeforeYear: 1857` (pre-1857 starts see open prairie, no structure)
**Game window:** 1843–1860 — the Hickok/McCanles gunfight (July 12, 1861) **postdates our window entirely**

---

## What this doc is for

FLUX/SDXL backdrop generation and the eventual `RockCreekStationArt.svelte` SVG illustration. The landmark is a GAP — no art component exists. This doc establishes the visual brief so the generated image and the SVG illustration agree on physical facts rather than drifting toward the landmark's post-1861 fame.

Rock Creek Station is the grimmer cousin of Hollenberg Ranch (the calibrator for this landmark type). Where Hollenberg is domestic and well-tended, Rock Creek is frontier-utilitarian: low, dark, primitive, built for function not comfort. The visual tone is closer to Fort Kearny's engraving style than to the cheerful tallgrass-prairie warmth of the Hollenberg Ranch art.

---

## 1. Historical layer (period facts that drive visual decisions)

### 1.1 Founding and ownership

- **1857** — S.C. Glenn (sometimes listed as "Newton Glenn") establishes the West Station on the west bank of Rock Creek: a small cabin, lean-to store, and barn. This is the beginning of the station; `abandonedBeforeYear: 1857` correctly gates pre-build starts.
- **March 1859** — David McCanles and his brother James purchase the property. McCanles is the dominant figure through 1861. He expands the West Ranch substantially and soon builds east.
- **1859–1860** — McCanles constructs the toll bridge across Rock Creek, replacing the crude rock-ford that required wagons to be lowered into the creek and hauled out. Tolls: 10¢–50¢ per wagon depending on ability to pay.
- **1860** — McCanles builds a second structure on the **east** bank, digging a well. This East Ranch becomes the Pony Express relay. He rents it to Russell, Majors and Waddell as a swing station.
- **1860–1861** — The East Ranch operates as a Pony Express swing station (horse change only, not a home station with rider rest). The West Ranch remains McCanles's family home and road ranch for emigrants.
- **April 1861** — McCanles sells the West Ranch to freighters Hagenstein and Wolfe and moves his family three miles south.
- **July 12, 1861** — The McCanles Affair (the Hickok gunfight). **This is outside our game window. Do not reach for this imagery.**

### 1.2 The two sites — key visual distinction

The "Rock Creek Station" label in the game merges two discrete sites about a quarter-mile apart, as travelers and later writers always did:

| | West Ranch | East Ranch |
|---|---|---|
| **Founded** | 1857 (Glenn) | 1860 (McCanles) |
| **Who owned it** | McCanles 1859–April 1861 | Leased to Pony Express 1860 |
| **Main structure** | Station house + lean-to store | Hewn-log main building, 36×16×8 ft |
| **Support structures** | 80×20 ft barn, blacksmith shop, corral, cottonwood-log water trough, well | Well |
| **Character** | Road ranch, emigrant supply, family residence | Swing station, horse corral |

For game-window visuals (1857–1860), the **West Ranch is the primary scene**. The East Ranch and toll bridge are visible in the distance or middle-ground.

### 1.3 Architecture — what is documented

**West Ranch station house** (Glenn/McCanles era, 1857–1861):
The original structure was a small log cabin with a lean-to addition serving as a primitive store. McCanles expanded it. The reconstructed buildings at the state park (based on 1980–1981 archaeological excavation of foundation remnants) include a station house, bunkhouse, and barn. No pre-1861 photograph survives. The reconstruction distinguishes log-and-sod construction for the main house.

**West Ranch barn and outbuildings:**
Historically documented as an 80-by-20-foot barn, a blacksmith shop, and a corral just southwest of the station house. Near the well, a hollowed-out cottonwood log served as a water trough — a standard Great Plains expedient. The corral rails were rough-cut, not finished lumber.

**East Ranch main building:**
The most precisely documented structure. The hewn-log building measured 36 feet long, 16 feet wide, and 8 feet high at the eaves. It had an outside-accessible attic (reached by ladder from the exterior, a common frontier pattern) and a stone fireplace — the only source of heat and cooking in the building. This is the structure that became the Pony Express station.

**The toll bridge:**
Replaced a crude rock-ford where wagons had to be lowered and hauled. Constructed of rough wooden timbers — a simple plank bridge wide enough for a wagon, with low railings if any. The creek banks at the ford were steep and eroded; period travelers noted the difficulty of the crossing before the bridge existed. The bridge's toll gate or post would have been a simple upright log or bar across the road approach.

**Roofing:**
Period road ranches in southeastern Nebraska used sod roofs almost universally for the station house and simpler outbuildings. Richer or better-established operations used cedar-pole-and-earth construction (cedar poles from nearby hills formed the roof structure, covered with sod). The barn may have had a cruder brush-and-earth or bark roof. Nothing at Rock Creek would have had cut shingles in 1857–1860.

**Sod construction detail:**
Regional sod was cut from tallgrass-prairie turf in large flakes using a plow, then cut to brick lengths with a short-handled spade. Walls could be sod-brick laid without mortar, or a log frame with sod infill. Either way, the resulting walls were thick, dark, and irregular. Richard Francis Burton, traveling the overland route in August 1860 (the same season Rock Creek was operating as a Pony Express station), described the typical road-ranch station house in terms that apply directly: "The station-house was not unlike an Egyptian fellah's hut," and at Cold Springs wrote: "Squalor and misery were imprinted upon the wretched log hut, which ignored the duster and the broom, and myriads of flies disputed with us a dinner consisting of dough-nuts, green and poisonous with saleratus, suspicious eggs in a massive greasy fritter, and rusty bacon, intolerably fat." (*The City of the Saints*, 1861 — Burton traveled the same overland route in August 1860, passing stations of exactly this type.)

Mark Twain, writing about his 1861 stage journey through the same corridor, noted that sod-roofed stations left travelers with the odd sensation of a "man's front yard on top of his house" — grass and weeds growing from the living roof. He described the eating room at a typical Nebraska station as cramped enough that "you could rest your elbow on its eaves" with a dirt floor, no stove, only a fireplace, and furnishings of two three-legged stools, a pine-board bench, and a couple of empty candle-boxes. (*Roughing It*, 1872, describing conditions directly contemporary with our 1860 game window.)

These descriptions are Burton and Twain's general impressions of this class of station, not Rock Creek specifically — but Rock Creek was in the same category, the same region, the same year.

### 1.4 Setting and terrain

Rock Creek Station occupies rolling prairie in extreme southern Jefferson County, Nebraska, near the present village of Endicott. The terrain is characteristic of the Big Blue drainage: prairie hilltops, wooded creek bottoms, and ravines cut by wind and water. Rock Creek itself ran in a cut with steep, eroded banks — the reason the ford was difficult and the toll bridge valuable. Cottonwood trees lined the creek banks, providing the only significant timber in an otherwise open, grass-covered landscape. Away from the creek, the land is exposed and wind-scoured, with sparse vegetation and long views to the horizon. The site sits at approximately 1,485 feet elevation — flat enough to feel exposed, rolling enough that the creek bottom is visually separated from the surrounding prairie. The Oregon Trail's ruts approaching the crossing are still dramatically visible at the modern state park — the NPS describes them as "the finest stretch of pristine trail ruts in southeastern Nebraska," spanning approximately 1,600 feet, "quite dramatic in appearance." The depth of those ruts tells you something about how much traffic this crossing saw.

---

## 2. Visual brief

### 2.1 Scene composition (480×200 SVG viewBox)

Following the Fort Kearny engraving-style conventions:

- **Far horizon** at approximately y=105 — low, hazy prairie ridge, possibly a hint of the cottonwood line along Rock Creek
- **Creek cut**: Rock Creek itself sits mid-composition, lower than the surrounding grade. The creek surface catches sky reflection — a narrow blue-gray strip visible between the cut banks
- **Toll bridge**: The central foreground element crossing the creek. Rough timber construction, low profile, maybe 3–4 wagon-widths long. No decorative railing — just planks and cross-timbers. A simple pole or upright log at the approach marks the toll point.
- **West Ranch buildings** left-of-center: the station house (squat, sod-roofed log structure) with the lean-to store attached at the side. The station house is low — you could rest your elbow on the eaves. Behind it, the large barn (80×20 ft, proportionally the biggest structure on the scene) and a rough corral of crooked rail.
- **East Ranch building** visible right-of-center, across the bridge: the hewn-log main building, 36×16×8 ft, slightly more substantial than the West Ranch house. The outside ladder to the attic is visible.
- **Cottonwoods** line both sides of the creek cut, framing the bridge. Away from the creek, the landscape is open and grass-covered, with no shade trees.
- **Foreground**: The trail approaches from lower-left, wagon ruts pressed into the ground. An emigrant wagon paused at the toll approach, ox team stopped, driver probably arguing the toll.
- **No stockade walls, no defensive works, no flag, no soldiers.** This is not a fort.

### 2.2 Color palette

Working from the LMK token set and period photography of the region:

| Element | Hex | Notes |
|---|---|---|
| Sod walls | `#7a6840` | Dried-grass tan, darker than Fort Kearny's adobe |
| Sod shadow side | `#4a3e24` | Nearly earth-brown on the shadowed face |
| Living sod roof | `#6a7840` | Slightly greener than the wall sod — grass still growing |
| Roof grass (tufts) | `#8a9452` | Highlights on the roof grass |
| Log construction | `#5a3e22` | Rough-hewn brown, darker than finished lumber |
| Log end grain | `#3a2810` | Very dark at the exposed log ends |
| Bridge planking | `#7a6040` | Weathered plank, gray-brown |
| Creek water | `#6a8898` | Narrow, somewhat murky — not the clear-water blue of Ash Hollow |
| Creek bank soil | `#5a4428` | Steep eroded banks, dark with moisture |
| Dry prairie grass | `#a89858` | Dominant ground color, wind-bleached |
| Cottonwood canopy | `#586840` | Muted, not lush — late-summer Nebraska |
| Corral rails | `#4a3820` | Rough-cut, darkened by weather |
| Stone fireplace cap | `#8a8478` | The visible chimney emerging from the roof |

### 2.3 Atmosphere and light

The scene is **mid-afternoon, summer**. Not the golden-hour warmth of Hollenberg Ranch — Rock Creek gets the harsh direct overhead light of the prairie summer that flattens everything and makes shadows hard and short. The sky is high and pale blue-white, not dramatic. Sun from the upper-right casts short shadows to the left.

The overall impression should be: **spare, functional, frontier-grim**. Nothing is decorative. Every element exists because it must. The sod roofs are saggy and irregular. The corral rails are crooked. The buildings huddle near the creek cut for wind protection and water access. The toll bridge is the newest and best-built thing in the scene, and it's still just rough timber.

Smoke from the station's stone chimney: present, lazy, curling sideways in a light prairie wind. The smoke is the only sign of warmth in a scene that otherwise reads as functional austerity.

---

## 3. What NOT to render

This section is longer than usual because Rock Creek's post-1861 fame creates strong FLUX failure modes.

**Historical accuracy violations:**
- The Wild Bill Hickok / McCanles gunfight. No weapons drawn, no confrontation, no bodies, no drama. The 1861 event postdates our window.
- Any imagery of Hickok himself — he is not present in our game-window 1857–1860.
- A "saloon" aesthetic — Rock Creek had no dedicated saloon. Whiskey was sold from the lean-to store alongside flour and bacon. The interior was a combined general store / rough dining room / crash space, not a saloon with a bar and swinging doors.
- Stockade walls, palisade, blockhouse, or any defensive structure. Rock Creek was never fortified.
- A US flag or military presence. Rock Creek was a private enterprise, not a government post.
- The "Pony Express station" signage or iconography visible from outside. The Pony Express occupied the East Ranch for about a year (1860–61); there would be a corral for fresh horses, nothing more dramatic than that.
- A large or prosperous-looking establishment. Rock Creek was specifically small-scale and rough. It is described universally as a road ranch (the lowest tier of frontier commercial stop), not a trading post of the Hollenberg or Fort Laramie class.

**Visual cliché violations:**
- Romantic frontier warmth — no golden light, no welcoming porch scene, no cheerful bystanders.
- Clean new buildings. Everything at Rock Creek was already weathered and irregular by 1860. Sod walls slump. Roofs grow weeds. Log ends darken.
- A picturesque or scenic creek. Rock Creek was a utilitarian ford with steep, muddy banks — the whole reason the toll bridge was worth building.
- Cattle grazing in a pastoral meadow. The corral held work stock (oxen, horses for the Pony Express) — draft animals, not pastoral scenery.
- Any imagery derived from Hollywood Western set design: false-front buildings, wide plank boardwalks, water towers, swing doors.
- Modern reconstruction visitors, interpretive signs, or any anachronism from the current state park.

---

## 4. Default FLUX prompt

```
Oregon Trail road ranch, Rock Creek Nebraska 1860, two sod-roofed log buildings squatting low on the prairie near a creek cut, rough wooden toll bridge crossing a narrow muddy creek with steep eroded banks, bark-rail corral holding ox teams, cottonwood trees lining creek banks, open rolling tallgrass prairie hills to horizon, no stockade walls, primitive frontier road ranch not a fort, lean-to store attached to station house, stone chimney with lazy smoke, wagon and ox team approaching bridge from lower left, harsh summer prairie light, frontier-grim atmosphere, pen-and-ink period engraving style, warm parchment tones, low scale buildings, everything weathered and irregular
```

**Negative prompt additions specific to this landmark:**
```
saloon, gunslingers, Wild Bill Hickok, gunfight, wanted posters, stockade walls, fort, palisade, flag, soldiers, clean new lumber, bright colors, romantic, lush, picturesque, visitor center, modern reconstruction, Hollywood western
```

---

## 5. SVG illustration notes

For the eventual `RockCreekStationArt.svelte`, calibrate against `FortKearnyArt.svelte` (the frontier-post calibrator) and against `HollenbergRanchArt.svelte` (the closest road-ranch analog), but push toward Fort Kearny's austerity rather than Hollenberg's domesticity.

**Hierarchy of visual elements (most to least prominent):**
1. The toll bridge — the scene's reason for the crossing, and the newest construction
2. Rock Creek itself — visible as a narrow strip between steep cut banks
3. West Ranch station house + lean-to — the largest structure left of the bridge
4. The 80×20 barn behind the station house (big enough to register even in silhouette)
5. Corral rails (crooked, rough)
6. East Ranch building visible right-of-bridge (smaller, slightly more finished-looking)
7. Cottonwood line framing the creek
8. Prairie horizon (low, undramatic)
9. Approaching wagon + ox team (foreground, lower-left)

**Technical notes:**
- The sod roof should show grass tufts, as in `FortKearnyArt` (already has the "grass tufts on the roof" detail for the barracks — reuse that pattern)
- The bridge planking should use roughly spaced horizontal lines, not a clean deck
- The creek surface should be a narrow horizontal strip of `#6a8898` between two dark-soil banks — different from the broad river treatment in `BigBlueArt` or `GreenRiverArt`
- The stone chimney emerges from the sod roof; it is the tallest element on the station house
- No windows on the station house visible from the front (period sod buildings had few and small windows, facing away from the prevailing wind); the only openings are a low door and possibly one small window
- The corral should read as visually irregular — posts at uneven heights, rails not perfectly horizontal — this is not a finished corral

**Caption text** (IM Fell English italic, matching other landmark captions):
`Rock Creek Station — the toll crossing, Nebraska`

---

## 6. Registry integration

When `RockCreekStationArt.svelte` is built:

**`landmark-art-tokens.ts`** — add `'rock_creek_station'` to the `LandmarkId` union.

**`LandmarkArt.svelte`** — add between `hollenberg_ranch` and `ft_kearny` (trail mileage order):

```ts
import RockCreekStationArt from './RockCreekStationArt.svelte';
// ...
rock_creek_station: { Art: RockCreekStationArt, tone: 'warm' },
```

The tone is `'warm'` — same as Hollenberg Ranch and Fort Kearny. The parchment-and-ink palette applies. The warmth here is the prairie summer light, not domestic coziness.

**Abandoned state:** The `abandonedBeforeYear: 1857` flag in `landmarks.ts` handles the pre-build case at the game layer. The `abandoned` prop on the art component (used for Whitman Mission's post-1847 ruin) is not needed here — Rock Creek doesn't present as a ruin during the game window.

---

## 7. Period sources consulted

| Source | What it contributes | Confidence |
|---|---|---|
| Nebraska Game & Parks Commission / Nebraska State Historical Society — Rock Creek Station site documentation | Core physical facts: Glenn founding 1857, McCanles purchase 1859, East Ranch 1860, Pony Express swing station, toll bridge 10–50¢, occupation 1857–1867 | High — institutional source, based on 1980–81 archaeological excavation |
| Archaeological excavation 1980–81 (reported in state park documentation) | East Ranch building dimensions: 36×16×8 ft, hewn log, outside-accessible attic, stone fireplace. West Ranch: 80×20 ft barn, blacksmith shop, corral, cottonwood-log trough, well southwest of station house | High — physical evidence, used to reconstruct buildings |
| Richard Francis Burton, *The City of the Saints, and Across the Rocky Mountains to California* (1861) | General character of this class of Nebraska road-ranch station, 1860. "The station-house was not unlike an Egyptian fellah's hut." Cold Springs description: "Squalor and misery were imprinted upon the wretched log hut, which ignored the duster and the broom, and myriads of flies disputed with us a dinner consisting of dough-nuts, green and poisonous with saleratus, suspicious eggs in a massive greasy fritter, and rusty bacon, intolerably fat." Burton explicitly identifies Rock Creek (West Turkey Creek) on his 1860 itinerary, placing him at the crossing the same season it served the Pony Express | Medium-High — Burton describes this class of station, not Rock Creek specifically by name in detail; his Cold Springs account is from a station of identical type on the same route |
| Mark Twain, *Roughing It* (1872, describing 1861 journey) | General station conditions: "you could rest your elbow on its eaves," dirt floor, no stove, two three-legged stools, pine-board bench; "a man's front yard on top of his house" (sod roofs); describes squalor as normal and unexceptional | Medium — retrospective, 1861 journey (just outside our window), general rather than Rock Creek-specific |
| Oregon-California Trails Association milepost data and NPS Oregon National Historic Trail | Trail position at mile ~230, terrain and setting, NPS description of trail ruts at Rock Creek as "finest stretch of pristine trail ruts in southeastern Nebraska," spanning approximately 1,600 feet | High — NPS institutional source |
| Expedition Utah — Nebraska Pony Express Stations | Confirms swing station (horse change only) status of East Ranch, lean-to store at West Ranch | Medium — secondary, draws from primary sources |
| Legends of America — Rock Creek Station | Corroborates McCanles timeline, toll bridge construction, East Ranch 1860 | Medium — secondary, popular history synthesis |

**What I could not verify:**
- Whether the West Ranch station house itself was pure sod-brick or log-frame with sod infill. The reconstruction used log framing; this is the most likely correct interpretation for a 1857–1861 structure in this region, but no pre-1861 description of the West Ranch main building's specific construction method survives independently. The 36×16×8 ft dimensions apply to the East Ranch (1860) building; the West Ranch main house dimensions are not separately documented in any source I found.
- Burton's specific description of the Rock Creek crossing. His itinerary identifies "West Turkey or Rock Creek in Nebraska Territory, a branch of the Big Blue: its approximate altitude is 1485 feet" — but this is a geographic notation, not a station description. His detailed station descriptions on this route apply to other stops.
- Whether the toll bridge had any railing, signage, or structural feature beyond the basic plank deck. The reconstruction includes a railing; I cannot confirm this from period sources.
- The precise construction date of Glenn's original West Ranch station house. Some sources say 1857, one says 1858. The `abandonedBeforeYear: 1857` in code is correct as a gate — Glenn built in 1857, no structure before that year.

---

## 8. FLUX failure modes specific to this landmark

**Primary failure mode: the gunfight scene.** FLUX trained on internet imagery will associate "Rock Creek Station Nebraska" heavily with the 1861 Hickok/McCanles incident. Any prompt that includes "Wild Bill," "McCanles," "gunfight," "shootout," or even "1861" risks generating dramatic confrontation imagery — men with drawn guns, bodies on the ground. The negative prompt must be explicit. The date anchoring in the positive prompt ("1860") and the "Oregon Trail road ranch" framing help, but test outputs should be checked for figures in threatening poses.

**Secondary failure mode: Hollywood saloon.** The word "frontier" combined with "Nebraska" and "station" will pull toward false-front saloon architecture with swinging doors, a wide porch, and decorative signage. The positive prompt needs to specify "sod-roofed log buildings" and the negative prompt needs "saloon, Hollywood western" explicitly.

**Tertiary failure mode: Pony Express iconography.** "Rock Creek Station Pony Express 1860" will generate a heroic rider galloping scene with the station as a large, purpose-built backdrop. The East Ranch is a small log building with a horse corral, not a monumental relay facility. Frame the Pony Express element (if used at all) as a background detail — a rider arriving across the toll bridge — not the scene's subject.

**Quaternary failure mode: modern state park.** The state park reconstruction includes a visitor center, interpretive signs, mowed grass paths, and a well-maintained replica. FLUX trained on Google Image results for "Rock Creek Station" will have many modern park photos. Keep the negative prompt explicit about "visitor center, modern reconstruction, interpretive signs."

**Scale calibration:** The biggest FLUX failure for road-ranch landmarks is generating buildings that read as imposing frontier forts. Rock Creek's East Ranch main building was 36 feet long and 8 feet to the eaves — about the height of a modern single-story house, and half the length of a typical ranch house. The station house is smaller. In the generated image, both structures should look small against the sky, not dominant. The horizon line should be high relative to the buildings, emphasizing the exposure and flatness of the landscape around the creek cut.
