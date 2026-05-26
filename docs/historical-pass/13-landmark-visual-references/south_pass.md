# South Pass (mile 950, WY)

**Type:** Mountain pass — Continental Divide crossing; broad, treeless sage saddle
**Kind in code:** `landmark` (id `south_pass`)
**Existing component:** `src/lib/ui/landmark-art/SouthPassArt.svelte`
**Vikunja child:** [#1108](https://projects.ericbond.net/tasks/1108)
**Period gates:** None — in our 1843–1860 window the crossing was the established primary route. The Ezra Meeker monument (1906) postdates the period entirely and must not appear.

**Target depth:** ~2000 words. The central challenge here is not visual abundance but visual subtlety: the entire prompt-engineering problem is rendering a landmark whose chief characteristic is that it does not look like a landmark. Every section should build toward that FLUX strategy.

---

## What it actually looked like (1843–1860)

South Pass sits at roughly 7,412–7,440 ft elevation (sources vary by a few feet — see Notes) in what is today Fremont County, Wyoming, approximately 35 miles southwest of Lander. It is the lowest practicable crossing of the Continental Divide between Mexico and Canada, and its practicability is precisely the problem: the "pass" is a 20-mile-wide, nearly level saddle of sagebrush plain. There is no notch. There are no cliffs. The trail does not thread between walls of stone. It rolls across what feels like an extension of the high-plains prairie emigrants had been crossing for weeks — which is why so many of them didn't know they'd crossed the spine of a continent until they reached the first westward-flowing creek, three miles ahead.

The terrain context is defined by two distant ranges that frame the saddle from north and south. To the **north**, the Wind River Range rises to nearly 14,000 ft — a jagged blue-white saw of snowcapped granite peaks, atmospheric and remote, visible for upwards of 100 miles along the Sweetwater approach. Emigrants called them the "Shining Mountains." To the **south**, the Oregon Buttes (two flat-topped mesa hills and a smaller conical knob, cresting at 8,612 ft) rise out of the high desert, distinctive enough to serve as a navigation landmark for days before and after the crossing. These two bookends — Wind Rivers north, Oregon Buttes south — are the principal visual elements that identify the location. The pass itself, the ground you stand on when you cross the divide, looks like nothing in particular.

The vegetation is nearly uniform: **Wyoming big sagebrush** (*Artemisia tridentata* subsp. *wyomingensis*), growing 2–4 ft high in a dense low carpet of silvery grey-green across every flat and gentle slope. No trees. Not a single one, unless a lone gnarled limber pine survives on some east-facing microslope miles off the trail — emigrants noted this specifically, because they had been burning buffalo chips since the Platte and the absence of even shrub-scale wood was complete. The ground between sagebrush plants is pale sandy soil and sparse dryland grasses, occasionally broken by cushion forbs and low annual flowers in June and July. Where the trail had been heavily used by 1850, the sagebrush was not so much cleared as beaten down and rutted — emigrants described the track as detectable mainly by *absence* of the bushes, not by any worn earthen highway.

The **arrival sequence** at South Pass is the inverse of every other landmark on the trail. Chimney Rock is visible for three days before you reach it. South Pass offers nothing — no spire on the horizon, no fort, no river crossing to telegraph your progress. The emigrant simply crests a long gentle slope out of the Sweetwater valley (itself more felt than seen, as the gradient is so slight), rolls across 20 miles of open sage plain, and eventually notices that the small streams beside the trail are running the wrong direction: west instead of east. That first west-flowing water — **Pacific Springs**, a marshy seep about three miles past the official culminating point — is the functional announcement that the divide has been crossed. Many diaries record the discovery there rather than at the divide itself.

**John C. Frémont, Report of the Exploring Expedition to the Rocky Mountains, 1842** (official U.S. Army report, widely distributed):
*"The ascent had been so gradual, that, with all the intimate knowledge possessed by Carson, who had made the country his home for seventeen years, we were obliged to watch very closely to find the place at which we had reached the culminating point."*

Frémont also described the approach terrain: *"It will be remembered that wagons pass this road only once or twice a year, which is by no means sufficient to break down the stubborn roots of the innumerable artemisia bushes. A partial absence of these is often the only indication of the track; and the roughness produced by their roots in many places gives the road the character of one newly opened in a wooded country."*

**Edwin Bryant, *What I Saw in California*, 1846** (describing the July crossing by mule party):
*"The ascent to the Pass is so gradual, that but for our geographical knowledge… we should not have been conscious that we had ascended to, and were standing upon the summit of the Rocky Mountains — the backbone… of the North American Continent."*

**Lorenzo Sawyer, 1850** (California-bound forty-niner):
*"Most emigrants had a mistaken idea of South Pass, supposing it to be a narrow defile in the Rocky Mountains walled by perpendicular rocks hundreds of feet high, when in fact the pass is a valley some 20 miles wide."*

This consistent note of anti-climax and corrected expectation runs through the diary literature like a refrain. The diarists were not disappointed in the crossing itself — they understood its strategic importance — but they were repeatedly struck by the gap between the imagined Alpine drama and the actual rolling sage plain.

**Pacific Springs camp** (three miles west of the divide, the standard night camp): the spring was an extensive marsh in a low depression, fed by seeps rather than a flowing stream. The ground was "very miry" and dangerous for livestock. Grass was poor and alkaline. By 1850 the camp was heavily overcrowded during peak emigration season, with "camps covered all round" and dead oxen whose "gasses...rendered it very disagreeable." The camp is not scenic in any conventional sense — a small dark boggy depression in the middle of an otherwise open plain, surrounded on all sides by sage.

---

## Distinctive visual features

The cues that define a correct South Pass image. A generated image without these is wrong — discard it.

- **No dramatic mountain-pass topography at the crossing point** — this is the first and most critical check. If FLUX renders a narrow gorge, a notch between peaks, switchbacks, or cliffs, the candidate is wrong. Discard immediately. The crossing is a wide level plain.
- **Wind River Range on the NORTH horizon** — snowcapped peaks, deeply blue-grey in atmospheric distance, sawtooth silhouette extending across the upper-left frame. These are the visual anchor. Without them, the image is unlocated generic sage prairie. They should read as *distant* (not dominant — the mountains are 20+ miles away and several thousand feet above) but clearly snowcapped even in summer. Their color in summer atmosphere: cool blue-grey `#6b7f99` to deeper indigo-slate `#4a5c73` at the base, snow as off-white `#e8edf2` with blue shadow fills `#b8c8d8`.
- **Oregon Buttes on the SOUTH horizon** — two flat-topped table mesas and a conical hill, reading as reddish-brown to tawny mesa silhouettes `#8c6a45` against the southern sky. They are shorter on the horizon than the Wind Rivers, less dramatic, but distinctive for their flat tops. Their presence anchors the south frame.
- **Sagebrush plain dominant in the middle ground and foreground** — low, roughly uniform, 2–3 ft high, grey-green `#7a8c6a` to silver-green `#8a9e80`, with a bluish bloom at distance that gives the whole plain a dusty, muted, slightly silvery quality `#8fa0a0`. No trees anywhere in frame. The sage is dense enough to read as a texture, not individual plants.
- **Big sky — sky dominant** — roughly 55–65% of frame is sky. This is the most important compositional rule. The openness of South Pass is *vertical*, not horizontal: the sky is the landscape. High cumulus or altocumulus in summer; clean blue at the zenith, building towers over the Wind Rivers. The sky proportion is what communicates both the elevation and the exposure.
- **Wagon ruts readable in the middle ground** — by 1850 the ruts were worn 2–3 ft deep in the soft soil and sagebrush root zone; by 1860 they were wide braided tracks. They should read as parallel lines receding west — the line heading toward the horizon (the Pacific) — but not as dramatic canyons like Guernsey. Two parallel tracks through sage, heading west-northwest.
- **Pronghorn antelope in distance (optional but period-correct)** — small pale specks in the middle-to-far distance. William Henry Jackson's 1866 sketch specifically depicts hunters shooting at fleeing pronghorn near the pass.
- **No single structural anchor at the crossing point itself** — this is the negative-space cue. There is no rock, no gate, no river, no building. The visual center of the image is empty sage plain. The drama, such as it is, comes from what's on the horizon.

---

## Atmosphere and lighting

South Pass sits at 7,400+ ft in high-altitude dry air above the Wyoming Basin. The atmosphere is exceptionally clear — significantly more so than the Platte valley. Wind is constant and often strong; emigrants noted that fires were difficult to maintain on the exposed saddle. The relative humidity is low even in July, and the air carries that crystalline high-altitude character that makes distant peaks appear closer than they are during morning and farther in the afternoon haze.

**Morning** is the best lighting moment for the Wind River silhouette: the peaks are lit pink-gold against a clear blue sky, the sage plain is still in the cool flat light of early day, and the wagon ruts catch low-angle raking light that makes them visible as linear shadows. Emigrants typically left the Sweetwater camps before dawn and reached the pass by mid-morning, which means early-to-mid-morning is the historically correct arrival time.

**Midday** is the least photogenic: the sun is directly overhead, the sage goes flat and washed-out, the Wind Rivers lose their drama against a bleached sky. This is not the target lighting.

**Late afternoon** brings long shadows across the sage, the Wind Rivers go blue-purple, and the Oregon Buttes catch warm amber light. The sky to the west over the Pacific drainage opens into a dramatic gradient. This is a workable secondary lighting state.

**Storm light** is particularly striking because of the contrast: a towering cumulonimbus can build against the Wind Rivers in the afternoon, producing a grey-blue-violet curtain behind the snowcaps while the sage plain in the foreground is still sunlit and dusty-gold. The emigrants feared these storms — the pass is entirely exposed, lightning is dangerous, and hail was a recurrent hazard. Frémont's party encountered "a severe storm of hail" on their 1842 crossing. This variant has strong visual contrast potential.

**Night camp at Pacific Springs**: not a common game-state need, but if used, the scene would be a small dark marshy depression with a handful of campfires casting orange-yellow light on the sage, a vast black sky above, and the Wind Rivers barely readable as darker silhouettes against a star-dense sky.

The **sage itself** shifts color through the day. In morning direct light it is warm grey-green `#7a8c6a` with yellow undertones. At midday it bleaches toward silver `#a8b8a0`. In late afternoon shadow it deepens toward blue-green `#5a7060`. The dusty quality of the high-desert sage, with its fine silvery hairs and volatile aromatic oils that produce a pungent scent in the heat, reads at distance as a cool blue-grey wash across the plain — unlike the warmer tan of grass prairie or the deeper green of timber country.

---

## Period reference imagery

### John C. Frémont / Charles Preuss — expedition cartography and report engravings (1842–1845)

- **What it shows:** Frémont's official report (published 1843–1845, 10,000 copies printed) included maps and some engravings. Charles Preuss was the expedition cartographer and produced detailed maps of the pass region. The maps show South Pass in its correct geographic relationship to the Wind River Range and the Oregon Buttes.
- **Link:** [Library of Congress — Map of an exploring expedition, 1842](https://www.loc.gov/item/96688042/)
- **What it adds:** Primary evidence that contemporaries understood South Pass as a wide, open, feature-free gap. The maps' lack of dramatic topographic relief at the pass itself is itself a document.
- **Blind spot:** Maps are not pictorial. The engravings in the report focus more on specific camps and formations than on the open saddle. Preuss was not a landscape artist.

### William Henry Jackson — sketch *South Pass* (from 1866 experience, published later)

- **What it shows:** Wagons strung along the trail with the transcontinental telegraph line visible; Oregon Buttes prominent on the southern horizon; pronghorn hunters in the middle ground shooting at fleeing antelope. Jackson based this on his 1866 crossing as a freight bullwhacker at age 23.
- **Link:** [William Henry Jackson Collection, Scotts Bluff National Monument / WyoHistory.org](https://www.wyohistory.org/encyclopedia/south-pass)
- **What it adds:** The single most important period-adjacent reference for the pass's visual character. Jackson was both an eyewitness to the trail era (his 1866 crossing was before the railroad and during the emigrant traffic's final years) and a trained visual artist. The sketch establishes: Oregon Buttes on the south horizon, flat sage plain, telegraph line (which dates it to 1861+, so strictly post-our-period — omit the telegraph poles from 1843–1860 backdrops), and pronghorn.
- **Blind spot:** The telegraph line is 1861 and the sketch is based on 1866 memory — technically outside the 1843–1860 window. Omit the telegraph poles. The wagon scale and landscape composition remain accurate for the earlier period.

### Alfred Jacob Miller — Wind River Mountains paintings (1837 expedition with Sir William Drummond Stewart)

- **What it shows:** Miller was the only Euro-American artist to reach the Wind River Range before the emigrant period. His watercolors and oils depict the Wind River peaks from various angles — lakes in the foreground, sawtooth skyline, summer snowfields. He did not paint the South Pass saddle itself (his party traveled north of the emigrant route to reach the rendezvous at Horse Creek), but his Wind River paintings establish the appearance of the range from the south and southwest.
- **Link:** Walters Art Museum, Baltimore; Buffalo Bill Center of the West, Cody; Joslyn Art Museum, Omaha. Miller online catalogue: [alfredjacobmiller.com](https://alfredjacobmiller.com/artworks/wind-river-country/)
- **What it adds:** The Wind River Range silhouette. Miller's paintings show the distinctive sawtooth profile of the peaks (Fremont Peak, Gannett Peak area) with summer snowfields from broadly the same compass direction emigrants would have seen them from the trail. Atmospheric treatment shows the peaks as deep blue-grey at distance with bright white snowfields.
- **Blind spot:** Miller was painting from the *north* side of the Wind Rivers and from high mountain valleys — not from the open sage plain to the south. Angle and atmospheric depth will differ. Use for silhouette shape and peak color reference, not for the low-angle view from the trail.

### NPS/BLM — modern photographs of South Pass National Historic Landmark

- **Link:** [National Park Service — South Pass](https://www.nps.gov/places/000/south-pass.htm); [Wyoming SHPO](https://wyoshpo.wyo.gov/index.php/programs/national-register/wyoming-listings/view-full-list/569-south-pass-national-historic-landmark)
- **What it shows:** Current state of the pass. The landscape has changed very little since the 1850s by BLM assessment — the sagebrush plain, the wagon ruts, the Wind Rivers to the north, the Oregon Buttes to the south are all in the same condition. Modern photos are therefore a reliable guide to terrain, vegetation color, sky proportion, and horizon composition.
- **What it adds:** Color reference for the sage (the bluish silver-green wash), confirmation of sky proportion (sky-dominant compositions are universal in modern photography from this location), and evidence that the ruts are still visible as surface features.
- **Blind spot:** Modern photos may show Highway 28, power lines, vehicles, and the BLM access road. Strip all of these. The Ezra Meeker 1906 granite monument must not appear.

### Emigrant diary illustrations — Frederick Piercy (1853)

- **What it shows:** Piercy's illustrated Mormon emigrant guide (*Route from Liverpool to Great Salt Lake Valley*, 1855) includes engravings of major trail landmarks including scenes near the pass region.
- **What it adds:** Compositional approach of a period artist working from direct observation in 1853 — within our window.
- **Blind spot:** Piercy was a Mormon guide illustrator, so his compositions emphasized practical information for his audience more than scenic drama. The pass itself may not be specifically depicted (most of his Wyoming work focuses on the Sweetwater landmarks — Independence Rock, Devil's Gate). Verify before relying on it for pass-specific composition.

---

## Composition references from period art

Jackson's sketch is the primary compositional guide and its decisions should govern the FLUX approach:

- **Sky dominant** — Jackson gives roughly 60% of the frame to sky. The sage plain occupies a wide low band. The horizon line sits at the lower third of the frame. This is correct and should be preserved.
- **Wagon train as a linear mid-ground element** — wagons are strung left-to-right along the trail, reading as a horizontal narrative element rather than as architectural scale reference. The scale is tiny: individual wagons are small against the open sky.
- **Oregon Buttes as southern anchor** — placed in the lower-right or lower-center of the landscape zone, not dominant but present and distinctive.
- **The Wind River Range implied more than explicit** — in Jackson's composition, the wind rivers are not the primary focus. They read as a background condition. The sky and the open space are the subject.
- **Foreground is sage and ruts** — textured sage in the foreground, the trail ruts reading as two parallel lines converging toward the vanishing point (west).
- **No close elements creating vertical drama** — there are no trees, no rock faces, no wagons close to the picture plane. Everything is mid-to-far ground. This is counter-intuitive for FLUX prompting (the model wants foreground subjects) and must be explicitly managed.

---

## FLUX prompt building blocks

The **core challenge** for all South Pass prompts is keeping FLUX from hallucinating a dramatic mountain-pass notch. The model's training has saturated it with the Rocky Mountain pass aesthetic — narrow defiles, cliff walls, switchbacks, alpine drama. South Pass is the explicit *negation* of that aesthetic. Every prompt must actively counteract the default.

**Default (1843–1860, fair weather, mid-morning — historically correct arrival time):**
```
horizon-vista of South Pass Continental Divide Wyoming, wide sagebrush plain, gentle treeless saddle, no mountain peaks at crossing, Wind River Range distant snowcapped silhouette on north horizon, Oregon Buttes flat-top mesas south horizon, parallel wagon ruts through sagebrush heading west, sky dominant 60 percent of frame, small wagon train distant mid-ground, painterly oil on canvas, period accurate 1850, clear high-altitude morning light
```

**Variant — storm (afternoon thunderhead building against Wind Rivers):**
```
horizon-vista of South Pass Wyoming, wide sagebrush plain, gentle treeless saddle, Wind River Range north horizon, towering cumulonimbus behind snowcapped peaks, storm light, sunlit sage plain foreground, dark grey-violet sky behind mountains, wagon train tiny in mid-ground, painterly oil on canvas, period accurate 1850
```

**Variant — dawn (cold pink light, Wind Rivers catching first alpenglow):**
```
horizon-vista of South Pass Wyoming, wide sagebrush plain, treeless Continental Divide saddle, Wind River Range glowing pink-gold at dawn north horizon, Oregon Buttes silhouette south, wagon ruts in sage foreground, vast pale dawn sky dominant, small emigrant campfire smoke rising mid-ground, painterly oil on canvas, period accurate 1850, dawn alpenglow
```

**Variant — winter (snow on the sage; hypothetical game state):**
```
horizon-vista of South Pass Wyoming, wide sage plain under thin snow, treeless Continental Divide saddle, Wind River Range white north horizon, grey overcast sky dominant, shallow snow over sagebrush, pale muted palette, painterly oil on canvas, period accurate 1850
```

**Negative prompt tokens to include in all variants (tell FLUX what NOT to generate):**
```
no narrow gorge, no cliff walls, no dramatic peaks at crossing, no switchbacks, no mountain notch, no pine trees, no buildings at pass, no monument, no road signs, no highway, no power lines
```

---

## Variants needed in-game

- **Default** 1843–1860 standard mid-morning view — wide sage plain, Wind Rivers north, wagon ruts west
- **Weather variant — storm** — afternoon thunderhead against Wind Rivers; wired via `BackdropPainting` weather hook
- **Weather variant — snow** — for winter game-states; thin snow on sage plain
- **Pacific Springs camp view (optional)** — if the game distinguishes the divide crossing (south_pass) from the camp (pacific_springs) as two separate landmark events, Pacific Springs needs its own backdrop: a small marshy depression in sage, low boggy ground, campfire smoke, no dramatic features. The current landmark list in `04-landmarks.md` treats south_pass and pacific_springs as sequential stops (#37 and #38) — the component might want two variants, or pacific_springs gets its own file.
- No `abandonedBeforeYear` / `abandonedAfterYear` gates apply.

---

## What NOT to render

Modern photos and default FLUX behavior will produce several wrong things:

- **Any dramatic mountain-pass notch or gorge** — the most common FLUX failure mode. South Pass is not a narrow gap; it is a wide open plain. Reject any candidate with cliff walls or switchbacks at the crossing point.
- **Pine trees or significant timber** — the pass is entirely treeless. A single distant conifer on a hillside might exist at the edges of the saddle; no forest, no tree line at the crossing.
- **The Ezra Meeker granite monument (1906)** — a common landmark in modern South Pass photos. This stone pillar monument was placed in 1906 by Meeker on his commemorative wagon trip — it postdates our period by 45 years. Do not render.
- **BLM road signs, interpretive panels, parking area** — the BLM facility at South Pass includes modern signage and pullouts. Not period-appropriate.
- **Wyoming Highway 28** — the paved road crossing the divide postdates the period.
- **Power/telegraph lines** — telegraph line was built 1861, outside the 1843–1860 window (though just barely for the 1860 end). Omit.
- **South Pass City gold-rush buildings** — the gold rush settlement of South Pass City (1868–1872) is three miles away and entirely postdates the period. No mine headframes, no cabin clusters.
- **Snow at the crossing point** — emigrants crossed in summer (May–September). Snow on the *Wind River peaks* is correct year-round; snow on the *sage plain* at the crossing is not period-correct for the standard game state (though it's fine for the winter variant).
- **Dramatic foreground elements** — no rocks, no trees, no cliff edges framing the foreground. The foreground is sage and wagon ruts. Resist the temptation to add visual interest at the picture plane.

---

## Sources

- [Wyoming State Historic Preservation Office — South Pass National Historic Landmark](https://wyoshpo.wyo.gov/index.php/programs/national-register/wyoming-listings/view-full-list/569-south-pass-national-historic-landmark)
- [WyoHistory.org — South Pass](https://www.wyohistory.org/encyclopedia/south-pass)
- [WyoHistory.org — Pacific Springs](https://www.wyohistory.org/encyclopedia/pacific-springs)
- [WyoHistory.org — South Pass missionaries (Whitman/Spalding)](https://www.wyohistory.org/encyclopedia/south-pass-missionaries)
- [NPS — South Pass](https://www.nps.gov/places/000/south-pass.htm)
- [NPS — South Pass Oregon Buttes](https://www.nps.gov/places/000/south-pass-oregon-buttes.htm)
- [GeoWyo — South Pass Geology](https://www.geowyo.com/south-pass.html)
- [California Trail Interpretive Center — South Pass](https://www.californiatrailcenter.org/south-pass/)
- [Alfred Jacob Miller Online Catalogue — Wind River Country](https://alfredjacobmiller.com/artworks/wind-river-country/)
- [WyoHistory.org — Alfred Jacob Miller](https://www.wyohistory.org/encyclopedia/artist-and-fur-trade-wyoming-paintings-alfred-jacob-miller)
- [Library of Congress — Frémont expedition map, 1842](https://www.loc.gov/item/96688042/)
- [Project Gutenberg — Frémont, *Report of the Exploring Expedition to the Rocky Mountains*, 1845](https://www.gutenberg.org/files/9294/9294-h/9294-h.htm)
- Bryant, Edwin. *What I Saw in California* (1848 / 1846 journey) — available via [Internet Archive](https://archive.org/details/whatisawincalifoin00brya)
- Frémont, John C. *Report of the Exploring Expedition to the Rocky Mountains in the Year 1842, and to Oregon and North California in the Years 1843–44* (1845) — available via [Internet Archive](https://archive.org/details/reportofexplorin00frem_1)
- Wikipedia: [South Pass (Wyoming)](https://en.wikipedia.org/wiki/South_Pass_(Wyoming)) — good primary sourcing on elevation debate and emigrant statistics
- OCTA — Oregon-California Trails Association mile-marker and diary references

---

## Notes / open questions

### The elevation dispute

South Pass's exact elevation is contested in the literature, with figures ranging from 7,412 ft (USGS Pacific Springs quadrangle) to 7,440 ft (2006 BLM GPS, ±3 ft) to 7,490 ft (Frémont's 1843 barometric measurement) to 7,550 ft (Wyoming Highway 28 divide, 2.5 miles northwest — a different point). For our purposes, the game UI should use **7,412 ft** (USGS ground truth) but the discrepancy is harmless for visual rendering.

### Where exactly is the summit?

Trail historian Paul Henderson noted that the Meeker monument (1906) stands "twenty feet west of the actual culminating height." Gregory Franzwa's research found the USGS located the precise point "less than fifty feet" from where Meeker placed his marker. This is a historical curiosity, not a visual one: the "summit" is indistinguishable from its surroundings regardless of which specific square foot you stand on.

### The "negative-space" FLUX challenge — addressed head-on

This is the hardest prompt-engineering problem in the landmark series. FLUX's training corpus is saturated with dramatic mountain pass imagery: Donner Pass, Brenner Pass, Alpine cols, Himalayan notches. The model's statistical center of gravity for "mountain pass" is vertical drama. South Pass is the explicit negation of that center of gravity.

Expected failure modes:
1. **The notch hallucination** — FLUX renders a narrow gap between cliff walls. This will be the most common failure. The negative prompt list above should suppress it, but expect to iterate 4–8 candidates before landing a clean result.
2. **Peak intrusion** — FLUX puts mountains *at* the crossing, not *on the horizon*. The prompt phrase "no mountain peaks at crossing" and "Wind River Range distant on north horizon" (with "distant" doing critical work) helps, but watch for this.
3. **Foreground over-dramatization** — FLUX adds boulders, dramatic rock formations, or a dramatic wagon close-up to the foreground to compensate for the compositional emptiness. The right foreground is sage and ruts.
4. **The tree problem** — at 7,400 ft in Wyoming, FLUX wants to add conifers. There are none.

**Recommended iteration strategy**: Start with the negative prompts active from generation 1. Try a LoRA strength that de-emphasizes landscape drama. Consider prompting "Wyoming Basin high desert" rather than "Rocky Mountains" for the biome token — the Wyoming Basin (which South Pass technically borders) implies flat, open, semi-arid terrain rather than alpine drama.

The **Wind River Range** is the one visual element that does provide drama, but it must stay on the horizon. The compositional grammar is: vast sky + distant snowcapped range (small) + flat sage plain (dominant) + small wagon ruts. The range is a background note, not the subject.

If the negative-space framing continues to confound the model after 8+ candidates, consider a compositional workaround: frame from the perspective of someone *looking west* from the summit, so the Wind Rivers are behind (and not in frame), and the visual is entirely the westward sage plain under a big sky — the "you didn't know you'd crossed it" view. This may be easier to generate cleanly and is also historically evocative.

### Pacific Springs as a separate scene

The current `04-landmarks.md` lists south_pass (#37) and pacific_springs (#38) as consecutive stops. Their visual character is quite different: south_pass is an open plain, pacific_springs is a small boggy depression in the same plain. If the game triggers different backdrop states for these two stops, Pacific Springs needs its own visual treatment — the marshy seep, poor grass, campfire smoke, sage surrounding a low dark wet depression. It would use much the same sky and Wind River background but with the foreground fundamentally different (wet, dark, miry rather than open and dry). This does not require a separate research doc but the implementer should be aware of the scene difference.

### No known period paintings of the pass itself

Unlike Chimney Rock, Scotts Bluff, or Independence Rock — landmarks that attracted artists specifically — South Pass generated almost no dedicated period paintings. It was too undramatic to attract the Romanticist gaze. Alfred Jacob Miller was in the region in 1837 but painted the Wind River Mountains from the north, not the pass from the south. Frémont's 1842 report engravings don't include a specific pass panorama. The Jackson sketch (1866, from memory) is the closest thing to a period-adjacent visual document. This means the implementer has *more* creative latitude than at most landmarks — but also less error-correction ability. There is no Miller or Piercy original to check against. The diary quotes are the primary constraint; the visual must match what the words describe.
