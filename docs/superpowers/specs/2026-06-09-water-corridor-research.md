# Oregon Trail Water-Access Audit — `waterCorridor` content flag

Leg-by-leg classification of water access along the Hoosier Trail landmark
catalog (Independence → Oregon City), 1843–1859 emigration window. A "leg" is
the travel segment from the *previous* landmark to *this* landmark (i.e. the
`milesFromPrevious` segment that ends at the named landmark).

**Classification key**
- **CORRIDOR** — a year-round river/stream ran beside or repeatedly crossed the
  wagon road; water trivially accessible at most camps.
- **RIM/CANYON** — road paralleled a river but ABOVE it in canyon/rim country;
  water only at named descents.
- **POINT** — dry-ish country with discrete known water (named springs/creeks).
- **DRY** — genuine dry drive, no reliable water.

Cumulative-mile anchors from `landmarks.ts` header: Kearny 319 · Chimney 492 ·
Laramie 650 · Independence Rock 815 · South Pass 915 · Bridger 1040 · Soda
1145 · Hall 1290 · Boise 1570 · Whitman 1830 · Dalles 1950 · Oregon City 2170.

---

## Per-leg table

| Leg (prev → id : name) | Class | Evidence (source + gist) | Named access points (RIM/POINT) | Game-flag recommendation |
|---|---|---|---|---|
| (start) → independence_mo : Independence | — | Trailhead. | — | n/a |
| independence_mo → lone_elm_campground : Lone Elm | POINT | Prairie creek-hopping; Lone Elm camp = single elm + creek water. Kansas tallgrass prairie is well-creeked but the *road* hits water at crossings, not continuously. | Lone Elm creek | keep-point |
| lone_elm → kansas_river : Kansas River | CORRIDOR | River-kind ford; Kansas/Wakarusa drainage. Wet prairie. | — | corridor |
| kansas_river → vieux_crossing : Vieux's Crossing | CORRIDOR | Vermillion crossing (`vieux_crossing.md` / catalog note); creek-hop prairie, water every few miles. | — | corridor |
| vieux_crossing → alcove_spring : Alcove Spring | POINT/CORRIDOR | `big_blue_river.md` + catalog: Alcove Spring is a named spring at the Big Blue ford — famous *because* it was clear water on the divide. Blue River country is creek-dense. | Alcove Spring | corridor (Blue R. valley) |
| alcove_spring → big_blue_river : Big Blue River | CORRIDOR | River-kind ford; Big Blue valley. | — | corridor |
| big_blue → hollenberg_ranch : Hollenberg Ranch | CORRIDOR | Road ranch on **Cottonwood Creek**; the Little Blue valley road begins. Creek-fed prairie. | — | corridor |
| hollenberg → rock_creek_station : Rock Creek Station | CORRIDOR | Post sits on the **Little Blue / Rock Creek** crossing (catalog note). The Little Blue valley road follows the river ~60 mi. | — | corridor |
| rock_creek → ft_kearny : Fort Kearny | POINT→CORRIDOR | The Little Blue road leaves the river and crosses the divide (the "Coast of Nebraska" / 30-mi-ish dry ridge) to strike the **Platte** at Kearny. `ft_kearny.md`: post sits above the Platte floodplain, "Platte cottonwoods to the north." Most of the leg is Little Blue; the final divide stretch is the one dry-ish gap. | divide between Little Blue & Platte | corridor (with caveat: short dry divide) |
| ft_kearny → windlass_hill : Windlass Hill | CORRIDOR | **The Platte valley road.** From Kearny the road runs the south-bank flats beside the Platte / South Platte the whole way. Water trivially accessible — the river is the road's companion for ~300 mi. | — | **corridor** |
| windlass_hill → ash_hollow : Ash Hollow | POINT (the famous dry tableland) | `ash_hollow.md`: after crossing the South Platte, emigrants "climbed a long tableland… flat, dry, treeless, with alkali-tainted water if they found water at all. That 22-mile ridgeback between the South Platte and the hollow's rim." Windlass Hill is the descent OFF that dry tableland INTO Ash Hollow's cold spring. | Ash Hollow cold spring | keep-point — this stretch is the genuine dry tableland; Ash Hollow spring is the relief. **Do NOT corridor-flag windlass_hill/ash_hollow legs.** |
| ash_hollow → rachel_pattison_grave : Pattison Grave | CORRIDOR (poor quality) | `ash_hollow.md`: spring-fed; creek runs to North Platte ~2 mi off, river visible from hollow's lower end. Back on the North Platte valley. **Quality caveat:** 1849 cholera epicenter — Rachel Pattison died here June 1849; "sulphurous or brackish water available on much of the Platte route." | — | corridor (flag quality: cholera/muddy) |
| pattison_grave → north_platte_1 : N. Platte crossing (east) | CORRIDOR | River-kind ford; on the North Platte. | — | corridor |
| north_platte_1 → courthouse_rock : Courthouse & Jail | CORRIDOR | North Platte valley road continues; Pumpkin Creek / river flats. | — | corridor |
| courthouse_rock → chimney_rock : Chimney Rock | CORRIDOR | `chimney_rock.md`: trail runs the North Platte valley below the bluffs; river to the north the whole way. | — | corridor |
| chimney_rock → scotts_bluff : Scotts Bluff | CORRIDOR | North Platte valley; river beside the road (Mitchell Pass road rejoins the river). | — | corridor |
| scotts_bluff → robidoux_post : Robidoux Post | CORRIDOR/POINT | Robidoux Pass road climbs slightly off the river over the bluffs (spring at the pass), rejoins North Platte. | spring at Robidoux Pass | corridor |
| robidoux_post → ft_laramie : Fort Laramie | CORRIDOR | `ft_laramie.md`: fort at the fork of the Laramie & North Platte; road follows the North Platte the whole leg. | — | corridor |
| ft_laramie → register_cliff : Register Cliff | CORRIDOR | North Platte valley near Guernsey; river beside road. | — | corridor |
| register_cliff → guernsey_ruts : Guernsey Ruts | CORRIDOR | Same North Platte bench; ruts cut where the road hugs the river bluff. | — | corridor |
| guernsey_ruts → ft_caspar : Fort Caspar | CORRIDOR (with caveat) | North Platte valley road, ~114 mi, but the river meanders and the road cuts some dry benches/Black Hills spur. Mostly river-accessible; this is the LAST reliable river stretch before the alkali. | — | corridor |
| ft_caspar → north_platte_2 : N. Platte (west crossing) | CORRIDOR | River-kind ford at the Casper bridge; on the river. | — | corridor |
| **north_platte_2 → willow_springs : Willow Springs** | **DRY → POINT** | `sweetwater_1.md`: "From the final North Platte crossing at Bessemer Bend (Red Buttes), the trail left the river entirely and struck southwest through… the Emigrant Gap — dry, alkaline terrain with no drinkable water, 'stinking, toxic alkali waterholes,' dead cattle." Willow Springs (~mile 825) was "the intermediate water stop… famously degraded by 1849 from animal contamination." | **Willow Springs** (the one good spring on the dry haul) | keep-point — this is the classic ~30-mi dry/alkali drive. Willow Springs IS the named relief. **Leave dry/point, do not corridor.** |
| willow_springs → independence_rock : Independence Rock | DRY/POINT | Still on the alkali approach; saleratus lakes near here "like stagnant soap suds" (Pusey Graves 1850), undrinkable. The Sweetwater is reached just past the rock. | saleratus lakes (toxic, NOT potable) | leave dry until Sweetwater |
| independence_rock → devils_gate : Devil's Gate | CORRIDOR | The Sweetwater is now beside the road (Devil's Gate is the river cutting through granite). | — | corridor (Sweetwater begins) |
| devils_gate → martins_cove : Martin's Cove | CORRIDOR | On the Sweetwater's first bend, ~2 mi west of Devil's Gate (catalog §). | — | corridor |
| martins_cove → sweetwater_1 : Sweetwater River ford | CORRIDOR | `sweetwater_1.md`: the long Sweetwater Valley with **8–9 crossings**; "good grass on the banks… water actively pleasant." First crossing = the relief after the alkali haul. | — | **corridor** |
| sweetwater_1 → cheyenne_camp : Cheyenne Summer Camp | CORRIDOR (with alkali caveat) | Sweetwater valley road. **Caveat the task raised:** the poison saleratus/alkali sloughs sat NEAR the good river. Net: corridor-with-caveat — the Sweetwater itself was always good; the danger was animals drinking the adjacent alkali ponds, not lack of water. | — | corridor (flag: avoid adjacent alkali ponds) |
| cheyenne_camp → ice_slough : Ice Slough | CORRIDOR/POINT | Ice Slough is a named curiosity (ice under the sod) on the Sweetwater plain; river still near. | Ice Slough | corridor |
| ice_slough → south_pass : South Pass | CORRIDOR→POINT | Sweetwater followed nearly to its head, then the broad sage saddle of the Divide. Last Sweetwater crossing ("Burnt Ranch") is just short of the pass. | upper Sweetwater | corridor to the head, then point at the saddle |
| south_pass → pacific_springs : Pacific Springs | POINT | `south_pass.md`: Pacific Springs is the **first west-slope water** — a marshy spring just past the Divide, the named camp. Between the last Sweetwater and Pacific Springs is dry sage saddle. | **Pacific Springs** | keep-point |
| pacific_springs → parting_of_ways : Parting of the Ways | POINT/DRY | Dry sage tableland; the fork where the Sublette/Greenwood Cutoff (the *waterless* 50-mi cutoff) leaves the Fort Bridger road. The Bridger road (game default) drops toward the Little Sandy. | Little Sandy / Big Sandy ahead | keep-point |
| parting_of_ways → green_river : Green River crossing | POINT→CORRIDOR | Sandy-creek country (Little Sandy, Big Sandy) then the Green. The Sandys are discrete creek crossings; the Green is a major river. | Little Sandy, Big Sandy | corridor at the Green (point on the sage between) |
| green_river → big_hill : Big Hill | CORRIDOR | Road climbs out of the Green over the Bear River Divide toward Bear Valley; Big Hill is the steep descent INTO well-watered Bear Valley. | — | corridor (entering Bear valley) |
| big_hill → ft_bridger : Fort Bridger | POINT/CORRIDOR | `ft_bridger.md` geography: Bridger sits on **Black's Fork of the Green** — braided clear mountain streams, an island-meadow oasis. Road from Green follows Black's Fork in. (Note: catalog routes Big Hill *before* Bridger, but historically Big Hill is past Bridger on the Bear River leg — see Catalog Oddities.) | Black's Fork | corridor (Black's Fork) |
| ft_bridger → shoshone_camp : Shoshone Summer Camp | CORRIDOR | Bear River valley; `bear_river.md`: "the first mountain meadow country that reads as welcoming. Grass, willows, cottonwoods, cool clear water." Shoshone camp on the willow flats above the Bear. | — | **corridor** (Bear valley) |
| shoshone_camp → bear_river : Bear River crossing | CORRIDOR | `bear_river.md`: "open mountain valley — not a canyon… river meanders in broad loops through flat bottomland." River-kind ford. | — | corridor |
| bear_river → soda_springs : Soda Springs | CORRIDOR | `soda_springs.md` / `bear_river.md`: Bear River valley continues; Soda Springs = effervescent carbonated springs ON the Bear. Water everywhere (some mineral). | Soda/Steamboat springs (novelty) | corridor |
| soda_springs → ft_hall : Fort Hall | POINT→CORRIDOR | Road leaves the Bear, crosses the Portneuf divide (dry-ish sage), then drops to the **Snake/Portneuf bottomland**. `ft_hall.md`: fort is "a genuine oasis… cottonwood shade on a sagebrush plain," on the Snake River bottomland. | Portneuf River | corridor at Hall (point on the Portneuf divide) |
| **ft_hall → massacre_rocks : Gate of Death** | **RIM/CANYON begins** | `ft_hall.md` + `snake_three_island.md`: below Fort Hall the Snake runs in a **basalt canyon**; the road travels the sage plateau ABOVE it. **American Falls** (~10 mi past Hall) and the Gate-of-Death basalt narrows are the upper access points where the river is reachable. | **American Falls** (descent), Gate of Death narrows | RIM — add American Falls as a `waterSource` access point ~10 mi past Hall (see Snake section) |
| massacre_rocks → salmon_falls : Salmon Falls | **RIM/CANYON** | Catalog already flags `salmon_falls` `waterSource:true` (audit #1039 — 6 of 11 family wipes died on this 110-mi leg). `snake_three_island.md`: "the Snake ran in a canyon inaccessible from the plain above." Salmon Falls = Shoshone fishery, a known descent to the river. **Rock Creek** is the other named mid-stretch descent. | **Rock Creek** (~mid-leg descent), **Salmon Falls** (fishery descent — already flagged) | RIM — ADD Rock Creek as a `waterSource` access point between massacre_rocks and salmon_falls |
| salmon_falls → snake_three_island : Three Island Crossing | RIM→CORRIDOR (at the ford) | `snake_three_island.md`: wagons "descended a sandy, broken slope down to river level"; Thousand Springs visible pouring from the basalt opposite. Three Island = the best ford; river finally reachable. | Thousand Springs (opposite bank), Three Island ford | keep RIM; ford is the access |
| **snake_three_island → ft_boise : Fort Boise** | **CORRIDOR (north/wet route — game default)** | `snake_three_island.md`: "**North route (cross): the Boise River valley was lush and well-watered. Thousand Springs… The stock got good grass and water.**" `ft_boise.md`: "small HBC station by the Boise River. Cottonwoods… the water is good." The game assumes the crossing (north route) — so this leg is the **well-watered Boise River valley**, NOT the dry south alternate. | Boise River valley | **corridor** for the north route. (South alternate would be DRY — "dry, sandy, dusty… water access limited because the Snake ran in a canyon inaccessible from the plain above." Only relevant if a south-route choice is ever modeled.) |
| ft_boise → burnt_river_canyon : Burnt River Canyon | POINT→CORRIDOR | Snake crossing at old Fort Boise, then up the **Burnt River canyon**, whose road follows the creek through the gorge (catalog: "tortured zigzag through a brushy gorge"). The Burnt River itself is the water. | Burnt River creek | corridor (Burnt R. canyon road follows the creek) |
| burnt_river_canyon → flagstaff_hill : Flagstaff Hill | POINT | Flagstaff Hill is the ridge with the first Blue Mountains view — climbing OUT of Burnt River toward Baker Valley. Short dry climb. | — | keep-point |
| flagstaff_hill → farewell_bend : Farewell Bend | CORRIDOR (catalog ORDER WRONG) | Farewell Bend = the last camp ON THE SNAKE before the trail leaves it for good. **Historically Farewell Bend comes BEFORE Burnt River, not after Flagstaff Hill** — see Catalog Oddities. As placed, treat as a short leg; the bend is on the Snake (water present). | Snake River (Farewell Bend) | corridor — but FIX ORDER (see below) |
| farewell_bend → blue_mountains : Blue Mountains | POINT/CORRIDOR | Climb into the Blue Mountain foothills (Grande Ronde approach); Powder River / creek country — mountain streams reasonably frequent. | Powder R. / mountain creeks | corridor (mountain streams) |
| blue_mountains → grande_ronde : Grande Ronde Valley | CORRIDOR | `grande_ronde` terrain `forest`; the Grande Ronde is a well-watered mountain valley (Grande Ronde River, springs). | — | corridor |
| grande_ronde → whitman_mission : Whitman Mission | RIM/POINT (Blue Mtn crossing) then valley | Crossing the timbered Blue Mountains (mountain creeks) then DOWN to the Walla Walla. `whitman_mission.md`: mission on the Walla Walla River cottonwood corridor; "the only significant tree cover in the surrounding landscape," dry plateau otherwise. | Walla Walla River; Blue Mtn creeks | corridor at the river; the plateau approach is dry-ish point |
| whitman_mission → ft_walla_walla : Fort Walla Walla | POINT (dry plateau) | `whitman_mission.md` + `ft_walla_walla.md`: 22 mi down the Walla Walla to its mouth on the Columbia. The Walla Walla River corridor is followable, but the plateau benches are dry bunchgrass/sage. | Walla Walla River | corridor (river corridor) — but the wider Columbia plateau begins here |
| **ft_walla_walla → the_dalles : The Dalles** | **POINT (dry Columbia plateau)** | The road ran INLAND across the dry Columbia plateau, hitting water only at the named river crossings: **Umatilla, Willow Creek, John Day, Deschutes.** `whitman_mission.md` notes the parched plateau; the long benches between rivers are waterless sage. | **Umatilla R., Willow Creek, John Day R., Deschutes R.** | keep-point — ADD these 4 river crossings as `waterSource` access points across this 95-mi plateau leg (see Columbia section) |
| the_dalles → barlow_road : Barlow Road | CORRIDOR | Cascades forest; the Barlow Road climbs into wet timber (Mt Hood drainages, Sandy/Zigzag rivers). Abundant mountain water. | — | corridor |
| barlow_road → laurel_hill : Laurel Hill | CORRIDOR | Dense Cascades forest (catalog: Laurel Hill = worst Barlow descent); Zigzag River drainage, snowmelt streams everywhere. | — | corridor |
| laurel_hill → oregon_city : Oregon City | CORRIDOR | Down into the wet Willamette/Clackamas country; forest, rivers, rain. | — | corridor |

---

## Summary

### Class counts (54 travel legs, excluding the trailhead row)
- **CORRIDOR:** ~33 legs (Platte valley, Sweetwater valley, Bear valley, Boise
  River north route, Cascades forest, plus the Kansas/Blue creek-prairie).
- **RIM/CANYON:** 4 legs — the Snake plateau (ft_hall→massacre_rocks,
  massacre_rocks→salmon_falls, salmon_falls→three_island) plus the
  Blue-Mountain crossing into Whitman read partly as rim.
- **POINT:** ~13 legs — Kansas trailhead, the dry tableland into Ash Hollow,
  the North-Platte→Sweetwater alkali haul, South Pass saddle / Pacific Springs,
  Flagstaff Hill, and the Columbia plateau (Walla Walla→Dalles).
- **DRY:** 1–2 legs — the genuine dry/alkali drive **north_platte_2 →
  willow_springs → independence_rock** (Emigrant Gap / saleratus lakes). Willow
  Springs is the lone POINT relief inside it.

### Corridor list — legs that should get `waterCorridor = true`
The whole Platte run, the Sweetwater run, the Bear valley, the Boise (north
route), and the Cascades. Concretely, set the flag on the leg ENDING at each of:

- `windlass_hill` is the **exception inside the Platte run** — its leg is the
  dry tableland, so the Platte corridor should flag the legs ending at
  `ft_kearny` and resume at `rachel_pattison_grave` onward, NOT
  windlass_hill/ash_hollow.
- Platte corridor: legs ending at `ft_kearny`, `rachel_pattison_grave`,
  `north_platte_1`, `courthouse_rock`, `chimney_rock`, `scotts_bluff`,
  `robidoux_post`, `ft_laramie`, `register_cliff`, `guernsey_ruts`, `ft_caspar`,
  `north_platte_2`.
- Sweetwater corridor: legs ending at `devils_gate`, `martins_cove`,
  `sweetwater_1`, `cheyenne_camp`, `ice_slough` (caveat: adjacent alkali ponds).
- Bear valley corridor: legs ending at `big_hill`, `ft_bridger`,
  `shoshone_camp`, `bear_river`, `soda_springs`, `ft_hall`.
- Boise north-route corridor: leg ending at `ft_boise`; plus `burnt_river_canyon`.
- Cascades corridor: legs ending at `barlow_road`, `laurel_hill`, `oregon_city`.

### Legs that must NOT be corridor (keep the engine's dry/point treatment)
1. `windlass_hill` + `ash_hollow` — the 22-mi dry tableland off the South Platte.
2. `willow_springs` + `independence_rock` — the Emigrant Gap / alkali drive.
3. `pacific_springs`, `parting_of_ways` — South Pass dry saddle / cutoff country.
4. The three **Snake RIM legs** (ft_hall→massacre_rocks, →salmon_falls,
   →three_island) — keep as dry-with-discrete-access (see below).
5. `the_dalles` — the dry Columbia plateau.

### Snake access points to ADD as `waterSource` landmarks
The engine treats the Hall→Boise plateau as bone-dry desert except where a
`waterSource:true` landmark re-adds a descent. `salmon_falls` already carries
the flag (audit #1039). Two named historical descents are still missing:

1. **American Falls** — `waterSource:true` scenic landmark ~10 mi past Fort
   Hall (between `ft_hall` and `massacre_rocks`). The first reachable point on
   the Snake below Hall; a major falls and standard emigrant water/camp stop.
   Insert with `milesFromPrevious: ~10` after ft_hall, pushing massacre_rocks's
   mFP down ~35. Terrain `desert`, kind `landmark`.
2. **Rock Creek** — `waterSource:true` scenic landmark on the
   `massacre_rocks → salmon_falls` leg (~mid, roughly mile 1360). A tributary
   canyon emigrants descended into for water/grass; the named relief between
   Massacre Rocks and Salmon Falls. Insert with `milesFromPrevious: ~22`,
   reducing salmon_falls's mFP to ~23. Terrain `desert`, kind `landmark`.

Optionally **Thousand Springs** could anchor the salmon_falls→three_island leg,
but `salmon_falls`'s existing flag plus the Three Island ford already bracket
that 30-mi segment adequately.

### Columbia plateau access points to ADD (Walla Walla → The Dalles)
The 95-mi `ft_walla_walla → the_dalles` leg crosses dry plateau with water only
at four river crossings. If the engine treats this leg as desert, add as
`waterSource:true` scenic landmarks in order:
- **Umatilla River** (~25 mi past Walla Walla)
- **Willow Creek**
- **John Day River**
- **Deschutes River** (just east of The Dalles)

These are well-attested camps; without them the Dalles leg is a 95-mi dry
desert in the engine — the same failure class as the pre-#1039 Snake leg.

### Catalog corrections recommended

1. **Burnt River / Flagstaff Hill / Farewell Bend ORDER is historically wrong.**
   The catalog has: `ft_boise → burnt_river_canyon → flagstaff_hill →
   farewell_bend → blue_mountains`. Historically the sequence leaving the Snake
   is: **Farewell Bend** (last camp on the Snake) → **Burnt River Canyon** (up
   the gorge) → **Flagstaff Hill** (first Blue Mtn view into Baker Valley) →
   Blue Mountains. The catalog puts Farewell Bend AFTER both Burnt River and
   Flagstaff Hill, which reverses geography — Farewell Bend is where you LEAVE
   the Snake, so it must come first. **Recommend reorder to:**
   `ft_boise → farewell_bend → burnt_river_canyon → flagstaff_hill →
   blue_mountains`. (This also fixes water logic: Farewell Bend should be the
   last Snake-corridor camp BEFORE the Burnt River climb, not a dry desert leg
   stranded after Flagstaff Hill. Its terrain is `desert` in the catalog, which
   is defensible for the bend itself but the ordering is the real bug.)
   Confidence: HIGH on the historical ordering; this is well-established
   Franzwa/Haines geography.

2. **`farewell_bend` terrain.** Tagged `desert`; it sits on the Snake (water
   present). Once reordered before Burnt River, consider `river`/`prairie`
   flavor or a `waterSource` flag so it reads as the last good Snake camp.
   Confidence: MEDIUM.

3. **`ft_hall` elevation/terrain** is fine; just note it is the corridor→rim
   transition — the LAST easy-water landmark before the Snake canyon plateau.

---

## Confidence notes on contested calls

- **Platte = full corridor (Kearny→Caspar):** HIGH. The south-bank Platte road
  beside the river is the textbook corridor. The ONE real interior exception is
  the South-Platte→Ash-Hollow tableland (`windlass_hill`/`ash_hollow` legs),
  which `ash_hollow.md` explicitly calls a 22-mi waterless ridgeback. Water
  *quality* (cholera at Ash Hollow camps 1849; muddy/brackish Platte water) is
  an issue SEPARATE from access — flag it as a quality caveat, not a downgrade
  from corridor. Confidence on the quality caveat: HIGH (`ash_hollow.md`
  Pattison cholera; "sulphurous or brackish water on much of the Platte route").

- **North Platte → Sweetwater = DRY, not corridor:** HIGH. `sweetwater_1.md`
  is unambiguous — the trail "left the river entirely," Emigrant Gap had "no
  drinkable water," Pusey Graves hadn't slaked his thirst "since the Big Blue,
  nearly 700 miles back." Willow Springs is the single named relief and was
  fouled by 1849. This is the clearest DRY call on the trail.

- **Sweetwater alkali — corridor-with-caveat:** MEDIUM-HIGH. The poison
  saleratus ponds were NEAR the good Sweetwater, not instead of it. The river
  itself was always potable ("clear as crystal," Van Dorn 1849). So the leg is
  corridor; the caveat is that stock could die drinking the adjacent alkali
  ponds. This argues FOR corridor-with-caveat, exactly as the task framed it.

- **Snake Hall→Three Island = RIM/CANYON with named descents:** HIGH.
  `snake_three_island.md`: "the Snake ran in a canyon inaccessible from the
  plain above." Access only at American Falls, Rock Creek, Salmon Falls,
  Thousand Springs, Three Island ford. Audit #1039 already confirmed the
  engine-level danger (6/11 family wipes on the 110-mi leg). Adding American
  Falls + Rock Creek is the targeted fix.

- **Three Island → Fort Boise (north/wet route) = CORRIDOR:** HIGH for the
  north route the game assumes. `snake_three_island.md` explicitly: north route
  = "Boise River valley… lush and well-watered… good grass and water";
  `ft_boise.md` "the water is good." The SOUTH alternate would be DRY, but
  it's not the game's modeled route. Confidence the game's route is wet: HIGH.

- **Columbia plateau Walla Walla→Dalles = inland dry, water at crossings
  only:** MEDIUM-HIGH. No dedicated corpus doc for the four river crossings,
  but `whitman_mission.md` establishes the dry-plateau character ("dry
  bunchgrass… the only significant tree cover is the river corridor") and the
  Umatilla/Willow Creek/John Day/Deschutes crossing sequence is standard
  Barlow-era trail geography. Confidence on the four named rivers: HIGH (route
  geography); confidence they need engine `waterSource` flags depends on
  whether the engine currently treats this leg as desert — flagged as a
  recommendation to verify.

- **Kansas/Blue prairie = corridor-grade:** MEDIUM. It's creek-hopping rather
  than one continuous river, but the Blue/Little Blue valley roads DO follow
  rivers for long stretches and water is rarely more than a few miles off.
  Corridor-grade is defensible; the one honest POINT is the Little-Blue→Platte
  divide into Kearny (the "Coast of Nebraska" dry ridge).
