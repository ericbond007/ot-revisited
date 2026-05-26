# Fort Caspar / Platte Bridge Station — Landmark Visual Reference

**Vikunja task:** [#1099](https://projects.ericbond.net/tasks/1099)
**Trail mile:** ~810 (last upper North Platte crossing, present-day Casper WY)
**Game landmark id:** `ft_caspar` — typed `trading_post`
**Component status:** NONE — needs new `src/lib/ui/landmark-art/FortCasparArt.svelte` + registry entry in `LandmarkArt.svelte`
**Default rendering (1843–1860 window):** Guinard Bridge / Platte Bridge Station era, 1859–1860
**Year-gated alternates:** ferry era 1847–1852, Reshaw's Bridge era 1853–1858
**Pre-1847 state:** no landmark to render — open ford, player sees river scene only

---

## Why this landmark is unlike any other in the trail set

Every other landmark in the 1843–1860 game window has one stable identity. Fort Caspar does not. The site went through four distinct physical states during the game window, and the name "Fort Caspar" itself post-dates the window entirely — the fort was renamed in August 1865 after Lt. Caspar Collins was killed, a full three years after our game ends. What the player sees at this map node depends entirely on which year they are traveling.

The implementer needs year-gated rendering. Four states:

| Year range | Site identity | Renderable? |
|---|---|---|
| 1843–1846 | Open ford / Bessemer Bend | No landmark; show river |
| 1847–1852 | Mormon Ferry (Upper Platte Ferry) | Yes — ferry state |
| 1853–1858 | Reshaw's Bridge (Richard's Bridge) | Yes — bridge state |
| 1859–1860 | Guinard's Bridge + Platte Bridge Station | Yes — default state |

The "Fort Caspar Museum" reconstruction in modern Casper depicts the 1863–1865 military fort. **Do not use the museum reconstruction as a visual reference for any game-window state.** It shows a stockaded army post that did not exist until 1862 at earliest, and the full fort expansion did not happen until 1865. The museum's replica bridge and ferry are also anachronistic if used for the pre-military states.

---

## State 1 — Open Ford / Bessemer Bend (pre-1847)

### Historical context

Before the Mormon pioneer company arrived in June 1847, there was no permanent structure at the last upper Platte crossing. The primary fur-trade-era ford was at Bessemer Bend (Red Buttes Crossing), located about six miles upstream from the later bridge sites near present-day Evansville/Casper. Emigrants used this ford — or improvised — from the trail's earliest wagon years onward.

The terrain at this crossing was defined by the landmark that named it. Warren Ferris (fur trapper, 1830) described the Red Buttes as **"two high cherry-red points of rock, separated by the river."** The sandstone here is a deep brick red, part of the Casper geological formation — red-ochre to rust-red, brighter than Scotts Bluff sandstone, more saturated than the pale tan of Register Cliff.

Lt. John C. Frémont documented the July 1842 crossing in scientific detail: *"There was two hundred feet breadth of water at this time in the bed... the channels were generally three feet deep, and there were large angular rocks on the bottom."* He added that the ford was **"the best"** despite its challenges — but that was in late July, low water. June crossings were another matter.

Jim Clyman, traveling in June 1846, found the river *"not to be fordable"* at all. With thirty wagons backed up, parties resorted to *"poor material they had to make rafts"* — wagon boxes caulked with tar, cottonwood logs lashed together, improvised dugouts. This was the state of the crossing for the game's earliest years.

### What the player sees (no landmark rendered)

Pre-1847 is the "no landmark" state. The player arrives at the map node and sees the **river itself** — the North Platte at this crossing. The appropriate scene elements for a river-crossing event, not a settlement scene:

- Wide, pale gray-tan river, shallower and braided in late season, deep and swift in early summer
- Low cottonwood groves on both banks — the cottonwoods are the only vertical element in an otherwise horizontal landscape
- Red Buttes visible to the southwest: two blunt rust-red sandstone formations rising perhaps 200 feet above the sage flat
- Opposite bank: sagebrush plain stretching to the horizon, gray-green sage, ochre soil
- Sky: high Wyoming blue, near-colorless at the zenith, warm at the horizon

**This state needs no FLUX prompt.** It can reuse the river-crossing scene assets or show a generic river-ford event card. Do not invent a structure here.

---

## State 2 — Mormon Ferry (1847–1852)

### Historical context

Brigham Young's pioneer company arrived at the North Platte on June 13, 1847, 151 people strong. After six days of frustrating experimentation with wagon-box boats and improvised rafts — *"William Woodsworth was carried downstream nearly two miles before rescue"* on Day 4 — they settled on a ferry design.

Orson Pratt described it in his journal: *"We made two large cottonwood canoes [like pontoons], and placing them parallel to each other, a few feet asunder, firmly pinned on cross pieces and flat slabs running lengthwise of the canoes, and having attached a rudder and oars, with a little iron work, they had a boat of sufficient strength to carry over the loaded wagons."* The canoes were approximately 25 feet long.

Young left nine men behind to operate the ferry commercially. Wilford Woodruff recorded on June 16, 1847: *"President Young thought it wisdom to leave a number of the brethren here & keep a ferry until our Company Came up. Emigrants will pay for ferrying $1.50 cts per wagon."*

Tolls:
- Non-Mormons: $3 cash, or $1.50 in provisions at Iowa/Missouri prices
- Mormons: fees set by camp councils, often free or subsidized
- By 1850: George Shepard (California-bound) recorded paying $4 per wagon

The Mormon men returned to the site each summer through 1852. By 1849, the first year of the California Gold Rush, they added a blacksmith operation at the crossing — traffic had grown from a few thousand (1848) to 25,000 (1849). The ferry location was approximately where Wyoming Boulevard's bridge now crosses between Casper and Mills — near the modern Fort Caspar site, on the south bank.

The site during ferry operations: two hollowed cottonwood pontoons, rope and pulleys evolved into the design by later seasons (eventually capable of a five-minute crossing), a small camp of tents and perhaps one rough cabin on the south bank for the operators, a rope-and-stake mooring on the north bank. No stockade, no permanent buildings beyond what the ferrymen constructed for themselves season to season. The ferry was rendered obsolete in 1852 when Reshaw's Bridge opened.

### Visual character — ferry era

The ferry site is **minimal infrastructure against a wide river**. The visual center is the ferry platform itself — two dark cottonwood dugout hulls, sun-bleached wood planking across them, a rope trailing upstream to a mooring stake. One or two ferrymen with poles or oars. A wagon mid-crossing, the oxen nervous, the driver standing on the wagon tongue.

South bank: a rough camp. Canvas lean-to or a single low log cabin with a dirt-and-sod roof. A firepit. Stacked provisions from toll payments — flour sacks, sides of bacon. Possibly a temporary corral of cut brush for oxen waiting their turn. No fences, no formal road — just tracks in the river silt.

The river here is wide and swift, pale greenish-gray in early summer melt, tea-brown in late season. The cottonwood gallery forest is dense on both banks — these are the cottonwoods the ferrymen used for their dugouts; by the early 1850s the biggest trees nearest the crossing had been harvested and the bank looked more scraped.

Background: the Red Buttes are visible to the southwest, 6 miles upstream, but not dominating the view from the ferry site — more of a horizon marker. Immediately behind the south-bank camp, the terrain rises into sage-covered hills.

### FLUX prompt — ferry era (1847–1852)

```
Watercolor painting, Oregon Trail emigrant crossing, 1847, flat light, Missouri River school style. Mormon flatboat ferry on the upper North Platte River in Wyoming high desert. Two cottonwood dugout canoe pontoons lashed side-by-side with rough-plank deck, a single covered wagon mid-crossing, canvas bonnet yellowed, oxen standing in shallow water at bow. Two frontier ferrymen with long poles guide the raft against a rope strung to the far bank. South bank: small log-and-canvas camp, flour sacks stacked against a lean-to, firepit. North bank: sage flat stretching to a pale horizon. Wide braided river, pale gray-green water. Cottonwood gallery forest on both banks, leaves silver-green. July morning light, pale blue Wyoming sky, red sandstone bluffs barely visible on the far horizon. Earthy palette: raw linen white #F5F0E8, river gray-green #8FA88A, sage gray-green #7A8C70, cottonwood bark gray #9E9080, canvas yellow-white #E8DFC0, red sandstone horizon #8B3A2A.
```

---

## State 3 — Reshaw's Bridge (1853–1858)

### Historical context

John Baptiste Richard (1810–1875) was a St. Charles, Missouri-born French-American mountain man and trader — described by Francis Parkman (who met him in 1846) as *"a little, swarthy, black-eyed Frenchman... his black curling hair... parted in the middle of his head, fell below his shoulders... he wore a frock of smoked deerskin, gaily ornamented with porcupine quills."* English-speaking emigrants heard his French surname as "Reshaw" — and so the bridge was named.

Construction began in the fall of 1852, at a site in present-day Evansville, approximately six miles east (downstream) of the later Guinard Bridge location — important: **Reshaw's Bridge and the later Guinard/Fort Caspar bridge are at different locations on the river.** The bridge that the game labels "ft_caspar" was always the upper crossing (Guinard site), not Reshaw's lower site. Reshaw's Bridge is the competition that ran concurrently for several years.

For the game's purposes: **if the player arrives 1853–1858, they encounter the Guinard site operating as a ferry OR they could be routed to Reshaw's Bridge.** The historical reality was that both the remaining ferry operation AND Reshaw's Bridge competed for traffic. By 1853–1854, Reshaw's Bridge had largely absorbed the traffic. The game likely routes the player to Reshaw's Bridge for 1853–1858, since it was the dominant crossing and a famous landmark.

Bridge specifications from contemporary accounts (J.R. Bradway, June 1853; Dr. John Smith, July 1853; Joseph McKnight, also 1853):
- Length: over 800 feet (some sources say 1,000 feet — Reshaw may have given a round number)
- Width: 15–18 feet
- Construction: heavy wooden piers in diamond shape, 30–40 feet apart, filled with rocks for ballast; cross-timbered before rock added. Deck: 4-inch hand-sawn planks, hand-fit and spiked to span logs. Heavy railing with extra bracing at each pier. Iron bolts held all components together. North abutment used an existing sandstone cliff as the anchor; south end met sloping prairie.
- Lumber: hauled from the Caspar Mountains, 7 miles south
- Cost: ~$40,000

Tolls fluctuated with river level: $8 per wagon at June high water (1853); $6 by early July as the river dropped and fording became easier again. By July 1853, approximately 3,000 wagons had crossed in a single season — Richard's bridge carried 50,000 emigrants in 1853 alone, the peak emigrant year.

The settlement that grew up around the bridge by 1856–1859 was substantial. J. Robert Brown (1856) noted *"about thirty lodges belonging to the Crows and Sioux"* nearby and counted *"several very good log buildings here; these are used as a store, dwelling houses for the traders, blacksmith shop, etc."* By 1859, travelers recorded *"15 or 20 comfortable log homes that stood nearby."* Richard employed over 20 Indian women producing buckskin clothing and moccasins for emigrants and Colorado miners.

The military arrived at the Reshaw site in November 1855 (4th Artillery, 6th and 10th Infantry), establishing Fort Clay (January 1856), renamed Camp Davis (February–June 1856), then Camp Payne (1858–1859). This military presence at the *lower* (Reshaw) bridge is distinct from the later military occupation of the *upper* (Guinard) bridge.

Sir Richard Burton passed through in August 1860 and found whiskey being served *"on ice"* at Richard's store — the first ice Burton had seen in weeks. He called the establishment an *"indispensable store,—the tête-de-pont"* (the bridgehead). Burton was traveling on Guinard's Bridge by then, and found conditions there more rustic; at Richard's, a kind of frontier luxury had emerged.

### Visual character — Reshaw's Bridge era

This is the most visually dramatic of the pre-fort states. The bridge itself is the dominant feature: a long, low wooden trestle spanning a wide river, the diamond-shaped piers dark and water-stained, the deck planking pale weathered wood. The bridge is functional-industrial for its era — nothing elegant about it, just massive timber engineering. At high water (June), the river surface is close to the deck level; at low water (July–August), the drop from deck to water is visible.

South end (south bank, where emigrants arrived): the cluster of log buildings. A trading store in the largest building — probably two rooms, log-chinked, with a plank porch and a hand-painted sign or a banner, maybe a flagpole. Next to it, a blacksmith shop (stone forge, bellows, tools hanging outside). Smaller log cabins as dwellings — some with sod roofs. The 30 Sioux and Crow lodges mentioned in 1856 diary accounts: conical tipis in a cluster set back from the trading post, 100–200 yards upstream.

The ground around the trading post: churned to dust and mud by wagon traffic, scattered with the debris of thousands of crossings — broken wheel spokes, discarded rope, ox bones, empty barrels.

Background: the Caspar Mountains to the south, low blue-gray ridges 7 miles away. Sagebrush flats extending east and west. The North Platte river bends here, so the view looking from the south bank shows the bridge foreshortened slightly, the opposite (north) bank low sagebrush prairie.

### FLUX prompt — Reshaw's Bridge era (1853–1858)

```
Oil painting style, Oregon Trail historical scene, high Wyoming desert, 1856. Reshaw's Bridge crossing the upper North Platte River: long low timber trestle bridge, 800 feet, heavy diamond-shaped log piers filled with river rock, pale weathered plank deck, wooden railing. A wagon train of three covered wagons mid-crossing, oxen plodding. South bank foreground: cluster of rough log trading post buildings, largest has plank porch and crude painted sign, smaller blacksmith shop with stone chimney smoking. Twenty Sioux tipis in the middle distance, upstream. Churned dust and wagon debris in foreground. North bank: flat sagebrush prairie. Caspar Mountains low on the southern horizon, blue-gray. Late afternoon light, long shadows across the bridge. Palette: weathered timber gray #9E9080, river gray-brown #7A8070, sage flat ochre-green #A09060, log building raw umber #6B4F30, tipi pale hide #D4C090, chimney smoke white-gray, mountain silhouette slate blue #4A5A70.
```

---

## State 4 — Guinard's Bridge / Platte Bridge Station (1859–1860) — DEFAULT

### Historical context

Louis Guinard (born Quebec, c. 1820–1821; naturalized U.S. citizen) was a former business associate of John Richard. In fall 1859, working independently, he began construction of a new bridge at the old Mormon Ferry crossing site — **upstream from Reshaw's Bridge**, at the location that would later become Fort Caspar. The bridge was complete in time for the 1860 emigrant season.

Bridge specifications from Richard Burton's 1860 account and contemporary records:
- Length: 810 feet (not counting approaches), some accounts say 1,000 feet including ramps
- Width: 17 feet
- Construction: 28 wooden cribbens (crib-work piers) filled with rock and gravel, supporting a heavy timber deck
- Cost: $40,000–$60,000 (accounts vary; Burton recorded $40,000)

Burton, traveling by Overland Stage in August 1860, described the station: *"It was also built of timber at an expense of $40,000 about a year ago by Louis Guenot [Guinard]."* He departed Richard's establishment (six miles downstream) and stopped at Guinard's as the Overland Stage overnight stop — the Platte Bridge Station already functioning as the central node of the crossing economy by 1860.

The Pony Express chose Guinard's Bridge for its April 1860 inaugural run — a decisive blow to Reshaw's Bridge business. The Overland Stage contract followed. By October 1861, the Pacific Telegraph Company added a telegraph office at the site, and the crossing became a node on the transcontinental telegraph line. The Army arrived in 1861 with a small detachment, formalizing as Platte Bridge Station in June 1862.

For the game's 1859–1860 window, the site presents as:
- The bridge itself (primary visual anchor)
- Guinard's trading post / stage station — a cluster of log and timber buildings on the south bank
- The telegraph line arriving from the east in 1861 (borderline for the window's end)
- A small Pony Express relay corral
- No military stockade yet — that comes 1862+

Contemporary sketch records: C. Moellman (bugler, 11th Ohio Cavalry) sketched the post in 1863, when the Army was already established. Jesse Playford (11th Kansas Cavalry) made watercolor illustrations. These are the closest period depictions — but they are 1863, two years into military occupation. Use them for bridge proportions and general orientation; the 1859–1860 civilian station would have been smaller, without the military structures.

**The 1936 WPA reconstruction at the modern Fort Caspar Museum site was based on these 1863 sketches and Collins's 1863 plan of the post.** The reconstruction represents the military fort of 1863–1865, NOT the civilian trading post / Pony Express station of 1859–1860. The game should NOT render the reconstruction's palisade stockade for the 1859–1860 default state.

### Visual character — Guinard Bridge / Platte Bridge Station era (DEFAULT)

This is the most architecturally rich and paintable state for FLUX generation.

**The bridge** is the defining visual. At 810–1,000 feet, it is the largest human-built structure any Oregon Trail emigrant had seen since leaving Missouri. The crib piers are massive — square timber log frames filled with river gravel, dark with water staining at the base, bare sun-bleached wood above the waterline. The deck is wide enough for a wagon with room to spare on both sides. The railing is heavy timber. Looking down the bridge from the south approach, the perspective is a long vanishing-point corridor of planks and railings, the north bank a mile away in emotional terms.

**South bank complex:**
- The bridge tollhouse / stage station: a low log building, one story, with a covered porch facing the bridge approach road. Possibly a second story or a loft, maybe a simple false front. Log-chinked construction — visible between the horizontal logs. An overland stage coach either departing or waiting in the yard.
- Trading post / store: adjacent building, probably the larger of the two. A hitching rail. Possibly a canvas awning over the porch to shade goods displayed outside. Emigrants would stop here to buy flour, bacon, whiskey, moccasins.
- Blacksmith shed: open-sided, stone forge, anvil visible.
- Corral: split-rail or rope-and-post, Pony Express horses inside. Small, near the bridge.
- Stacked supplies: barrels, sacks of flour, bales of hay in the open air, the trading stock of a high-traffic station.
- Telegraph poles: possibly in frame for 1860, fully strung by 1861. A single line of poles stretching east along the river.

**The river at the crossing:** in July (peak traffic), the North Platte is lower — perhaps 6–8 feet below the bridge deck at the piers. Pale gray-brown water, braided channels visible from the bridge. Cottonwood gallery forest dense on both banks immediately at the water's edge, thinning to open sage within 50 yards. The cottonwood leaves in July are dark green; by late August, yellow-gold begins.

**Background:** the Caspar Mountains to the south — low, rounded, blue-gray in afternoon haze. The North Platte valley is wide here, rimmed by low bluffs to the north. The sky is vast Wyoming blue. No mountains dominate this view; this is basin country between Fort Laramie's high plains and the Sweetwater approach to South Pass.

**Light:** afternoon light from the southwest is the default orientation (emigrant trains arrived from the east, so the scene is typically viewed looking north or northwest toward the bridge). The bridge deck catches warm afternoon light; the south face of the crib piers is in shadow; the river surface reflects sky color, cool blue-gray.

### What NOT to render — Guinard Bridge default state

- The WPA-reconstructed military stockade — post-1862, post-game-window
- Corner blockhouses — these were added 1862+
- Earthwork rifle pits — added 1865 in response to Indian raids
- Large garrison of soldiers — by 1859, a small Army presence at most; no permanent barracks yet
- Fort Caspar sign or name — the site was not called Fort Caspar until August 1865
- The name "Platte Bridge Station" — technically not applied until 1862; in 1859–1860 it was simply "Guinard's Bridge" or the Overland Stage stop

### FLUX prompt — Guinard's Bridge / Platte Bridge Station era (1859–1860) — DEFAULT

```
Luminous oil painting, American West, Oregon Trail landmark, 1860, afternoon light. Upper North Platte River crossing at Guinard's Bridge, Wyoming Territory. Massive timber trestle bridge, 800 feet long, 17 feet wide, heavy log crib piers filled with river rock, pale sun-bleached plank deck and wooden railing receding in perspective to far bank. A covered wagon approaching the south bridge entrance, oxen plodding, driver on foot. South bank: log trading post building with covered porch, hitching rail, barrels stacked outside; adjacent log stage station with a waiting Overland Stage coach, four horses in harness; open-sided blacksmith shed with stone chimney smoking; split-rail Pony Express corral with two horses; single telegraph pole line stretching east. Cottonwood gallery trees dense at riverbank, dark green leaves. Sage flat beyond, ochre and gray-green. Caspar Mountains on southern horizon, low blue-gray ridgeline. Wide Wyoming sky, high blue. Afternoon light from southwest, warm on bridge deck and building faces, cool river reflection below. Palette: weathered bridge timber pale ash #C8BFA8, river gray-brown #8A8070, cottonwood green #4A6840, sage flat #8A8A60, log building raw sienna #8B5A30, sky blue #7A9AB0, mountain silhouette #5A6878, dust foreground #C8A870.
```

---

## Landscape palette — shared across all states

The North Platte crossing at Casper occupies a specific ecological zone: the transition from the high alkali plains east of the Laramie Range into the upper Platte basin. The visual vocabulary is consistent across all four states:

| Element | Color description | Approximate hex |
|---|---|---|
| Sage flat | Gray-green, desaturated | `#8A8A60` |
| Alkali soil | Pale yellow-tan, almost white in direct sun | `#D4C89A` |
| North Platte river | Pale gray-brown, braided, never blue | `#8A8070` |
| Red Buttes (upstream) | Deep brick red, Casper Formation sandstone | `#8B3A2A` |
| Caspar Mountains (S horizon) | Blue-gray slate, low | `#5A6878` |
| Cottonwood foliage (July) | Dark olive-green | `#4A6840` |
| Cottonwood foliage (Aug–Sep) | Yellow-gold | `#C8A030` |
| Log building timber | Raw sienna to gray-brown | `#8B5A30–#7A6850` |
| Wyoming sky | High blue, cool at zenith, warm at horizon | `#7A9AB0` |
| Bridge/dock planking | Sun-bleached pale ash | `#C8BFA8` |
| Wagon canvas | Off-white to yellow-tan | `#E8DFC0` |

**What is NOT in this palette:** lush green grass (this is not Fort Laramie's cottonwood grove; the crossing is in open high-desert basin), blue mountains in the near distance (the Caspar Mountains are too low and too far), snow (trail season is May–September and no snowpack visible at this elevation in summer).

---

## Diary excerpts

**Frémont, July 1842 (pre-ford era):** *"There was two hundred feet breadth of water at this time in the bed... the channels were generally three feet deep, and there were large angular rocks on the bottom."* — Lt. John C. Frémont, *Report of the Exploring Expedition to the Rocky Mountains*, 1843. On the Red Buttes ford. Confirms: rocky bottom, multi-channel, depth variable. Pre-bridge era crossing reality.

**Woodruff, June 1847 (ferry construction):** *"President Young thought it wisdom to leave a number of the brethren here & keep a ferry until our Company Came up. Emigrants will pay for ferrying $1.50 cts per wagon."* — Wilford Woodruff journal, June 16, 1847. First commercial operation decision, recorded the day the ferry was commissioned. Confirms: the site was a deliberate business decision, not just charity.

**Pratt, June 1847 (ferry description):** *"We made two large cottonwood canoes [like pontoons], and placing them parallel to each other, a few feet asunder, firmly pinned on cross pieces and flat slabs running lengthwise of the canoes... they had a boat of sufficient strength to carry over the loaded wagons."* — Orson Pratt journal, June 1847. The best construction description we have of the ferry. Confirms: double-pontoon design, rough plank deck, practical rather than elegant.

**Hardy, June 1850 (ferry era danger):** *"Two men were drowned yesterday & it is said 19 have been drowned in the last 11 days."* — Francis Hardy, June 10, 1850. The ferry reduced but did not eliminate drowning risk; high-water season of 1850 was particularly deadly. Confirms: crossing remained genuinely dangerous even with the ferry operating.

**Brown, 1856 (Reshaw's Bridge community):** *"About thirty lodges belonging to the Crows and Sioux"* nearby, with *"several very good log buildings here; these are used as a store, dwelling houses for the traders, blacksmith shop, etc."* — J. Robert Brown, 1856. Best contemporary description of the Reshaw site settlement at its height. Confirms: mixed-race community, tipis alongside log buildings, multi-function trading post.

**Burton, August 1860 (Guinard's Bridge):** *"It was also built of timber at an expense of $40,000 about a year ago by Louis Guenot."* And on the ice served at Richard's store: *"the first he had seen in weeks."* — Sir Richard Francis Burton, *The City of the Saints*, 1862 (retrospective of 1860 travels). Confirms: Guinard's Bridge was newly built in 1859, Richard's establishment had achieved a degree of frontier luxury, both were operating simultaneously in 1860.

---

## Source notes and what I could not verify

**Verified:**
- Mormon Ferry dates, construction, personnel, and tolls: multiple primary sources (Woodruff, Pratt, Young's instructions of June 18, 1847) corroborated by WyoHistory.org and Church History sources
- Reshaw's Bridge location (6 miles downstream/east of Fort Caspar site), construction date (fall 1852/spring 1853), dimensions, and toll amounts: WyoHistory.org encyclopedia entry with primary source citations (Bradway, Smith, McKnight)
- Guinard's Bridge construction date (fall 1859, open for 1860 season), dimensions (810–1000 ft), cost ($40,000–$60,000): Burton 1860 + WyoHistory sources agree
- Frémont's 1842 crossing description and Red Buttes geology: NPS and WyoHistory sources
- Clyman's 1846 "not fordable" account: WyoHistory Red Buttes article
- The 1936 WPA reconstruction reflects 1863–1865 military fort, NOT pre-military states: multiple sources confirm

**Unverified / flagged for Dave:**
- **Reshaw's Bridge length is inconsistently reported.** WyoHistory says "over 800 feet long and 18 feet wide" in one article, "1,000 feet" in another summary. The detailed construction account (McKnight) says 23 piers at 30–40 feet apart, which gives roughly 690–920 feet — consistent with "over 800 feet." The "1,000 feet" figure appears to be rounded (possibly including the south approach ramp). Guinard's Bridge at 810–1,000 feet is similarly imprecise. Both bridges were probably in the 800–900 foot range of actual river span. I've used the conservative figures in the prompts.
- **Exactly when the Mormon Ferry became obsolete is slightly ambiguous.** Most sources say 1852 (when Reshaw's Bridge opened). The Wikipedia Fort Caspar article says the ferry was "relocated to different spot in North Casper" in 1849 — this may refer to a competing ferry operation at a different river location, not the end of the original ferry. I could not fully reconcile this. For game purposes: the Mormon Ferry is the 1847–1852 state; by 1853 Reshaw's Bridge dominates.
- **Whether a concurrent ferry still operated at the Guinard site during 1853–1858** (between Reshaw's Bridge opening and Guinard's Bridge construction) is unclear. Some emigrant companies may have continued using a rope ferry at the upper crossing even while most traffic used Reshaw's Bridge. This is historically ambiguous enough that the game can simplify to "Reshaw era 1853–1858" without depicting a concurrent ferry.
- **The Moellman sketch (1863) and Collins plan (1863)** are the best contemporary visual records of the site. Both are in archival collections (American Heritage Center, University of Wyoming; Colorado State University Library). Neither is publicly viewable online in high resolution. The reconstruction at the Fort Caspar Museum was based on these; the museum's reconstructed bridge section is the only period-plausible physical reference available to the public, but it depicts the 1862+ military era.

---

## Implementation notes for FortCasparArt.svelte

The implementer should use `trailYear` (or equivalent game state) to gate which state renders:

```typescript
// Pseudo-logic — adapt to actual game state API
if (trailYear < 1847) return <FordScene />; // no landmark, river crossing scene
if (trailYear <= 1852) return <FerryState />;   // Mormon Ferry
if (trailYear <= 1858) return <ReshawState />;  // Reshaw's Bridge
return <GuinardState />;                         // Guinard / Platte Bridge Station (default)
```

The `GuinardState` (1859–1860) is the default and should be the primary FLUX-generated backdrop. Ferry and Reshaw states need separate backdrops — use the prompts in this document. The pre-1847 ford state can use a generic river/ford scene with no human structures.

The game marks this node `trading_post`. All four states that show a structure (ferry, Reshaw, Guinard) are trade-capable locations. The pre-1847 ford state should still allow the player to buy from passing traders or use provisions, but there is no fixed trading post to render.

---

## Sources

| Source | What it provides |
|---|---|
| [WyoHistory — Crossing the North Platte River](https://www.wyohistory.org/encyclopedia/crossing-north-platte-river) | Primary narrative covering all four crossing eras; emigrant diary excerpts |
| [WyoHistory — Reshaw's Bridge](https://www.wyohistory.org/encyclopedia/reshaws-bridge) | Detailed bridge construction, toll records, community description, Burton visit |
| [WyoHistory — Fort Caspar](https://www.wyohistory.org/encyclopedia/fort-caspar) | Military era detail; 1936 reconstruction basis |
| [WyoHistory — Red Buttes](https://www.wyohistory.org/encyclopedia/red-buttes) | Ferris description of Red Buttes; Frémont 1842 crossing; landscape |
| [WyoHistory — Battles of Platte Bridge Station and Red Buttes](https://www.wyohistory.org/encyclopedia/battles-platte-bridge-station-and-red-buttes) | Moellman sketch reference; 1865 battle description |
| [Legends of America — Fort Caspar](https://www.legendsofamerica.com/wy-fortcaspar/) | General history; Guinard's trading post description |
| [Legends of America — John Baptiste Richard](https://www.legendsofamerica.com/john-baptiste-richard/) | Parkman's 1846 description of Richard; bridge and trading post details |
| [Fort Caspar Museum / City of Casper](https://www.casperwy.gov/explore/fort_caspar_museum/history.php) | Reconstruction history; period documentation basis |
| [Fort Caspar Wikipedia / Platte Bridge Station](https://en.wikipedia.org/wiki/Fort_Caspar) | Timeline; bridge specs; Louis Guinard biographical detail |
| [NPS — Bessemer Bend National Historic Site](https://www.nps.gov/places/000/bessemer-bend-national-historic-site.htm) | Pre-1847 ford; landscape description; Red Buttes geographic context |
| [Cowboy State Daily — North Platte River Ferry Tale](https://cowboystatedaily.com/2024/10/12/the-american-west-a-north-platte-river-ferry-tale/) | Ferry construction details; Wilford Woodruff and Orson Pratt quotes |
| [Church News — Pioneers ferry across North Platte](https://www.thechurchnews.com/1997/6/14/23252121/pioneers-ferry-across-north-platte/) | Six-day crossing narrative; Snow and Woodruff quotes |
| [OCTA / WyoHistory — Oregon Trail Wyoming travel](https://www.wyohistory.org/travel/oregon-trail) | General trail context and landmark sequence |
| Sir Richard Francis Burton, *The City of the Saints* (1862) | Burton's 1860 visit description — $40,000 bridge, ice at Richard's store |
| Orson Pratt journals, June 1847 | Ferry construction description (cottonwood pontoons) |
| Wilford Woodruff journal, June 16, 1847 | Ferry toll decision quote |
| Lt. John C. Frémont, *Report of the Exploring Expedition* (1843) | 1842 Red Buttes ford depth and width measurements |
| Jim Clyman, 1846 diary | "Not fordable" quote; 30 wagons backed up at Red Buttes |
