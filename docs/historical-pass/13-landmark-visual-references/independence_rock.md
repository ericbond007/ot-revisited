# Independence Rock (mile ~838, WY)

**Type:** Rock formation — massive Archean granite dome, "the Great Register of the Desert"
**Kind in code:** `landmark` (id `independence_rock`)
**Existing component:** `src/lib/ui/landmark-art/IndependenceRockArt.svelte`
**Vikunja child:** [#1103](https://projects.ericbond.net/tasks/1103)
**Period gates:** None — in active use throughout the 1824–1869 window; inscriptions accumulate across the period.

**Target depth:** 2500–3500 words. Heavy on diary excerpts, period art catalog, and atmosphere. The implementer should be able to FLUX-prompt without flipping back to source material every iteration.

---

## What it actually looked like (1843–1860)

Independence Rock sits in the open Sweetwater Valley of south-central Wyoming, roughly five to eight miles west of the first Sweetwater crossing, and about five miles east of Devil's Gate. The setting is high sage desert — flat to gently rolling valley floor, sage-silver on all sides, the river winding within a half-mile of the rock's base. There are no competing landforms of any height nearby. The granite dome emerges from the valley plain in total isolation, and that isolation is the entire visual point.

The dimensions are large enough to be disorienting in person. The rock stretches **1,900 feet along its longest axis** (north-to-south), **850 feet wide**, and rises **128 to 136 feet** above the surrounding terrain at its highest point — the sources vary slightly, with the Wyoming State Historic Site recording 128 feet, most modern estimates settling around 130–136 feet. The circumference of the base exceeds one mile. The total footprint is approximately **24 to 27 acres**. Period diarists who had just spent weeks crossing the flat Great Plains still had trouble comprehending its scale from the road, and consistently reached for animal metaphors: J. Goldsborough Bruff (July 26, 1849) wrote that the rock "at a distance looks like a huge whale"; other accounts describe "a great bowl turned upside down," "a mammoth egg," "a turtle," "a hippopotamus mired to its sides." The common thread is size plus roundness — a form organic and enormous.

The **silhouette is utterly unlike the formations they had seen since Fort Laramie**. Register Cliff (mile 670) was a sandstone escarpment, weathered yellow-cream. Chimney Rock (mile 580) was a reddish-clay apron with a spire. Scotts Bluff (mile 605) was stratified Brule clay and volcanic ash, layered like a geological cake. Independence Rock is **none of those things**: it is a gray Archean granite monolith, one piece, no layering, no spire, no stratification. The surface is smooth — extraordinarily so for a rock this size. A geological process called exfoliation, accelerated by Wyoming's relentless abrasive wind, polished the summit and upper slopes into curved, almost glassy sheets. Period accounts consistently describe the surface as smooth enough to write on without preparation, and dense enough that a chisel was a serious commitment. The granite's color in summer afternoon light is **pale silver-gray** — the base color family is roughly `#a8a39a` in midday diffuse light, warming toward `#c4b8a8` in strong side light, and darkening toward `#6b6259` in shadow and on the north face where lichen grows thickest. It is not the warm tan of the Platte-country rocks; this is a cooler, grayer stone, and that color contrast is a critical prompt cue for FLUX — the model must not warm the granite toward Chimney Rock's Brule palette.

The **arrival sequence** began several miles east, as the trail crested low sage ridges and the dome emerged ahead. Unlike Chimney Rock, which was visible for three days at diminishing distance, Independence Rock appeared with less ceremony — travelers were already in the Sweetwater Valley, already following the river, and the rock materialized ahead at perhaps 3–5 miles as a large gray hump on the valley floor, low and wide. From the east, the profile reads as a wide mound with a slightly flattened top, not a spire, not a tower — it reads at distance like a large hill, and then the trail gets closer and the hill doesn't shrink the way hills do, and then it keeps not shrinking, and then suddenly the wagons are at its base and it is filling the sky. The surprise was not the approach but the **moment of arrival**: the rock was bigger than the approach had suggested.

The camp was typically established at the rock's base or within a few hundred yards — many parties camped here for **one to three days**, not just a night, while emigrants climbed, carved, wrote letters, celebrated if they arrived on or near July 4, and rested. The Sweetwater River was within a half-mile, providing good water and grass for the stock. The immediate surroundings were classic Wyoming high desert: sagebrush and bunchgrass, some bunch willows along the river, no cottonwood canopy (cottonwoods were sparse throughout the Sweetwater Valley), the valley floor wide and open, and low granite hills in the distance to the south — the leading edge of the Granite Mountains range.

Period diary, **Father Pierre-Jean De Smet, SJ, 1840–1841**: *"It is the great register of the desert; the names of all the travelers who have passed by are there to be read, written in coarse characters; mine figures among them, as that of the first priest to reach this remote spot."*

De Smet was a Jesuit missionary working among the Flathead and Potawatomi peoples. He passed Independence Rock in 1840 on his first cross-country journey and returned in 1841, finding the rock already dense with inscriptions from the fur-trade era. His phrase "the great register of the desert" — often attributed to John C. Frémont, who popularized it in his widely-read 1843 expedition report — was De Smet's coinage. Both men's accounts circulated and reinforced each other; by the mid-1840s the name was standard.

Period diary, **J. Goldsborough Bruff, July 26, 1849**: *"Reached Independence Rock; at a distance looks like a huge whale. It is being painted and marked every way, all over, with names, dates, initials, &c — so that it was with difficulty I could find a place to inscribe it."*

Bruff was a Washington, D.C. engineer who commanded a company of California-bound gold-seekers in 1849. He was a meticulous recorder and a skilled draftsman; he made drawings of the rock and the inscriptions. His "difficulty finding a place to inscribe it" — in 1849, only nine years into the peak emigration period — indicates just how densely the rock's accessible surfaces had already been covered.

Period diary, **J.W. Nesmith, July 1843**: *"Facing the road, in all splendor of gun powder, tar and buffalo greese, may be seen the name of J. W Nesmith, from Maine, with an anchor."*

Nesmith traveled with the Great Emigration of 1843 — the first large wagon-train migration over the Oregon Trail, with approximately 1,000 people. He records climbing with a party of young men and women to paint names on the southeast face: "After breakfast, had the pleasure of waiting on five or six young ladies to pay a visit to Independence Rock," painting the women's names high on the face and his own beside them. The inscription materials he names — gunpowder mixed with tar, buffalo grease used as a binder — give precise visual information about what the lower face looked like: dark black or dark brown marks, varying in sharpness, some still wet-looking and shiny, others faded to gray.

---

## The July 4 deadline — the milestone that defined the rock's meaning

The psychological significance of Independence Rock in emigrant culture is inseparable from one date: **July 4**. Trail guides circulated in the late 1840s and 1850s recommended the landmark as a key timing checkpoint. A party arriving by Independence Day was on schedule to beat the autumn snows in the Cascade Range and Sierra Nevada — roughly 1,200 miles and twelve weeks of hard travel still ahead. A party arriving significantly after July 4 was potentially in jeopardy. The rock's name reinforced the association, though the naming origin predated the emigration: William Sublette is credited with naming it "Rock Independence" on July 4, 1830, when he led 81 men and 10 wagons to the Wind River and celebrated the holiday at the base.

The best-documented July 4 celebration at the rock is from 1847, when the pace of Mormon and Oregon-bound emigration had picked up dramatically after the 1846 setbacks. Two accounts:

**Robert Caufield, July 4, 1847**: *"On Independence Day this party fired a cannon from the top of the rock, and planted a flag there."*

**Hon. Ralph A. Geer, 1847**: *"We passed Independence Rock, on Sweetwater, on the 4th day of July, and hoisted the Stars and Stripes and fired the cannon on top of said rock at 12 o'clock that day."*

That cannon — dragged to the summit and fired at noon — is the single most vivid Independence Day image the rock generated. A second notable July 4 celebration: in 1862, Wyoming's first Masonic Lodge meeting was convened on the summit on July 4. Phoebe Judson, traveling in 1853, arrived at the rock on July 3 and spent the Fourth in celebration: the party dined on "a savory pie, made of sage hen and rabbit, with a rich gravy; and a crust, having been raised with yeast, was as light as a feather," then followed with fruitcake, pound cake, and sponge cake. Judson's account is a useful corrective to any assumption that the holiday was always celebrated with guns and spectacle — many parties had their private, domestic Fourth at the rock.

The emotional register of a late July 4 arrival — or worse, a July 20 arrival — is equally well documented. Polly Coon, arriving July 6, 1852, found the rock's camp still buzzing: "a multitude gathered around Rock Independence" with "a banner [that] still fluttered in the breeze" from the Fourth two days before. Daniel Budd (1852) recorded the density of the inscriptions in simple shock: "Thousands of names are engraved, & painted by all colors of paint."

The game must honor this deadline mechanic. Independence Rock is the one trail landmark where the game calendar matters visually — a party that arrives by July 4 should see flags, cannon smoke, celebration; a party arriving on July 10 sees the same rock with a diminished camp, no bunting, perhaps the remnants of fire rings. Both are historically accurate.

---

## The inscriptions — the Register itself

The density and variety of inscriptions at Independence Rock is the other defining feature. The rock's accessible lower surfaces — roughly the lower 20 feet of the base, wherever the granite was smooth enough to hold paint or sharp enough to chisel — were covered by the mid-1840s, and coverage extended higher on the south and southeast faces as the most accessible spots filled up. Some emigrants hired professional stonecutters who traveled with large companies specifically to carve names for a fee, producing neat, deep-chiseled letters that survive today where the surface has stayed sheltered. Others used whatever was to hand.

The inscription materials, from period accounts, fall into several categories:

- **Chiseled granite** — permanent where sheltered from direct rain and frost. Still readable today in alcoves and on west-facing sheltered surfaces. The most common surviving inscription type.
- **Axle grease and tar** — wagon axle grease was a pine-tar-and-hog-fat compound, dark brown to black, thick enough to paint onto a rough granite surface with a stick or brush. It adhered well in the short term. Over decades, it faded and flaked. Most axle-grease inscriptions are gone; some survive in deep alcoves. Rufus Sage, passing in 1842, noted the surface "covered with names of travelers, traders, trappers, and emigrants engraven upon it in almost every practicable part, for the distance of many feet above its base" — this count predates the peak emigration by seven years.
- **Buffalo grease and gunpowder** — buffalo fat mixed with black powder created a dark gray paste that could be painted on like axle grease. J.W. Nesmith names this mixture explicitly; it produced a distinctive dark-gray-black mark visible from distance. A name painted in buffalo-grease-and-gunpowder in 1843 would have been clearly legible in 1849 from fifty feet away.
- **Commercial paint** — some parties carried small quantities of paint, producing the most colorful inscriptions. Daniel Budd noted names "painted by all colors of paint" in 1852.
- **Advertisements** — by the 1850s, the rock had attracted commercial use: patent medicine advertisements ("Doan's Liniment" and similar products) painted in large letters on the lower face, visible from the trail. This is well-attested in period sources and represents a kind of early trail marketing.

The earliest confirmed inscription belongs to **M.K. Hugh, 1824** — a fur-trapper-era carving that predates the Oregon Trail by nearly twenty years. By 1840, when De Smet visited, the fur-trade names already covered the accessible surfaces enough to earn his "register" description. By 1849, Bruff couldn't find an empty spot. By 1852, Budd estimated thousands. Modern surveys count approximately **5,000 surviving inscriptions**, with the understanding that the painted ones — far more numerous in the 1840s and 1850s than the chiseled ones — have largely been lost to weathering.

For visual rendering: the **lower 20 feet of the south and southeast faces** should be treated as heavily marked — a dense palimpsest of writing that, from a distance of 50–100 feet, reads as a textured gray-brown band rather than individual legible letters. Closer in, individual characters become faintly readable, the carved ones deeper and darker than the stone, the painted ones varying from near-black (recent gunpowder-grease) to gray-tan (faded axle grease) to brick-red or blue (commercial paint). This is not graffiti-vandalism in visual texture — it reads as a geological layer of human activity, dense and varied and aged.

---

## Climbing the dome

Emigrants climbed the rock. This is attested in dozens of accounts. The ascent was not technical — the granite is smooth but the slope angle gentles toward the base, and the exfoliation ridges provide footing. The summit, at ~130 feet above the valley floor, provides an extraordinary panorama of the Sweetwater Valley: the winding river to the south and west, Devil's Gate visible four to five miles west (the river disappearing into a notch in the granite ridge), the valley floor spreading east with the emigrant road visible as a worn line in the sage, the Wind River Range on the northern horizon showing snowfields in July, and the low Granite Mountains to the south. The view from the top told emigrants what they had accomplished and what was still to come.

Curtis Edwin Bolton (1848) described a July 4 night summit: *"Some danced up on top of the rock where the band were. It was a clear night and full moon."* Music on the summit, dancing on the dome under a July full moon, with the valley spread below and the band carrying across the sage desert — this is the festival image of Independence Rock, and it is documented.

Rachel Woolley (1848): *"We heard so much of Independence Rock long before we got there...It is an immense rock with holes and crevices where the water is dripping cool and sparkling."*

Lydia Allen Rudd (1852): *"Came to independence rock about ten o'clock this morning...I saw my husbands name that he put on it 1849."* Three years earlier her husband had passed, inscribed his name, and continued. She read it now from the same spot. The rock as a link across time — across the years of the emigration — is as important as the July 4 deadline. Names carved in 1843 were still there in 1852. Families split by death, by year, by circumstance found each other's marks.

The climbing tradition also means there are **tiny human figures on the dome** in any historically accurate composition showing Independence Rock during the emigration period. This is not optional. On any summer day in June–August between roughly 1843 and 1865, some number of emigrants — a handful to dozens, depending on how many companies were camped — would have been visible ascending the rock, standing on various ledges, or scattered across the summit. This is a key compositional element that distinguishes Independence Rock from Chimney Rock (unclimbable) or Register Cliff (a cliff face, not a dome).

---

## Distinctive visual features

The cues a viewer must see to recognize this landmark. A generated image without these is wrong — discard the candidate.

- **Long, low, wide granite dome — not a spire, not a cliff, not a butte.** The silhouette is a gentle turtle-back curve: very wide (1,900 ft) relative to its height (130 ft), a roughly 14:1 width-to-height ratio. The horizon line cuts through the base of the dome; the sage plain is visible on both sides. If the model generates a spire, a cliff, or a mesa, it has failed.
- **Scale is enormous.** Independence Rock is fundamentally different in size from Chimney Rock (a narrow spire), Register Cliff (a sandstone escarpment), or Devil's Gate (a narrow canyon). A wagon at the base should read as roughly 1/15 to 1/20 the height of the rock — a tiny element against the gray wall. If wagons look close to the same scale as the rock, the scale is wrong.
- **Color: pale gray granite, not warm tan.** The rock is `#a8a39a` to `#c4b8a8` in light, `#6b6259` to `#7a6f68` in shadow. It is a cool gray, distinct from the warm Brule clay of the Platte-country formations. Lichen patches (darker gray-green, roughly `#5a6050`) appear on north-facing surfaces and lower-elevation sheltered spots. Do not warm the granite toward tan or brown — that is the Chimney Rock palette, wrong geology.
- **Smooth, rounded exfoliation surface.** No jagged edges, no horizontal stratification layers, no sharp columns. The surface is curved and polished, the way a water-worn river rock is rounded but at massive scale. Shallow curved fracture lines (exfoliation sheets) are the only surface detail.
- **Dense inscription band on the lower south and southeast faces.** A visible zone — lower 15–25 feet — where the rock surface is darker, textured, covered in marks. At painting/rendering scale this should read as a textured dark band, not blank granite. Do not attempt to render legible text; the texture and tonal difference is enough.
- **Sweetwater River winding within half a mile.** A thin bright ribbon, 30–50 feet wide, catching sky reflection in afternoon light, with low sage-grey banks and sparse willows. It is south or south-southwest of the rock, running roughly east-west through the valley.
- **Open Sweetwater Valley — sage prairie on all sides, low hills at distance.** No trees at the rock itself. No dramatic canyon walls (those are at Devil's Gate, 4–5 miles west). The valley floor is wide, the sky is the dominant visual element.
- **Tiny human figures on the dome.** Emigrants climbing and standing on the rock surface, visible at various elevations. The density ranges from a handful to dozens depending on how many companies were camped. On a July 4 at a busy year (1849–1855 peak), the summit could have had forty or more people. In other periods, three or four.
- **Emigrant wagon camp at the base.** Not a circle or fort — the camp was loose, spread around the south and east base. Multiple wagons, teams unyoked, tents if the party had them, cookfires. The camp at peak emigration was large — a major company might number 30–50 wagons; multiple companies camped simultaneously in busy years.

---

## Atmosphere and lighting

The Sweetwater Valley in July is high-desert summer: intense midday sun, very low humidity, blue sky that deepens toward violet at the zenith, afternoon cumulus buildups that rarely produce rain at ground level, cool nights. The sage is fully dry and silver-gray by July, not the green-gray of spring; the valley floor is ochre-brown bunchgrass and sage dust. The Sweetwater glints in afternoon light.

The rock itself changes color through the day. At dawn, it reads as a dark gray-blue silhouette against a warm eastern sky — the massive horizontal mass unlit, almost featureless. By mid-morning, light rakes across the exfoliation ridges and the south and southeast faces begin to glow a warm silver-gray; shadows pool in the curved surface depressions. Midday is the harshest moment — glare washes the surface toward near-white, shadows are minimal, the inscription band is hardest to read. Late afternoon is the canonical time: the low sun lights the south face warm and the north face goes into deep shadow, the exfoliation curves cast shadow lines that give the dome dimensional volume, and the inscription band on the lower southeast face reads clearly in raking light. This is the painter's hour.

The wind in the Sweetwater Valley is a constant presence, especially on the exposed summit. Diary accounts of climbing Independence Rock almost always mention wind — it dried the perspiration immediately, it made standing at the top feel exposed. Any July 4 flag planted on the summit would be taut and extended, not drooping. Cannon smoke fired from the summit would be immediately dispersed and carried east downwind.

Afternoon thunderstorms are possible but less common here than on the higher terrain further west. When a thunderstorm did hit, the dome provided no shelter — the summit was the first place lightning could reach, and emigrants who climbed during a storm had nowhere to go. Period accounts note this as a hazard. A storm variant should show the dome under a darkening sky, the emigrant camp at the base with some awnings or canvas windbreaks, the western horizon smudged with rain curtains.

---

## Period reference imagery

### William Henry Jackson — photographs, 1866 and ca. 1870–1929

- **What it shows:** Jackson photographed Independence Rock on multiple occasions. His earliest images, from 1866, show the rock from the south at roughly mid-day, with the dome dominating the frame. His later ca. 1929 gelatin silver print (held at BYU Special Collections) shows the rock from a similar angle, wider field of view. He also painted a watercolor of the rock with Devil's Gate in the background from memory in the 1930s.
- **Links:** [BYU Special Collections — Jackson print, 1929](http://archives.lib.byu.edu/repositories/14/archival_objects/114574); [Denver Public Library Digital Collections](https://digital.denverlibrary.org/nodes/view/1124641); [OCTA — Jackson print for sale](https://octa-trails.org/product/independence-rock-jackson-print/)
- **What it adds:** Ground-truth photography of the dome's silhouette, scale relationship to the valley, and the rock's color (the granite reads as pale mid-gray in black-and-white, consistent with its actual cool gray tone). Jackson was a bullwhacker on the trail in 1866 — he stood exactly where the emigrants stood. His perspective is from the trail road, at wagon-wheel height, looking northwest.
- **Blind spot:** Photos post-date the peak emigration period (peak 1843–1860). The rock's silhouette has not changed materially; the inscriptions have faded but are otherwise stable. The major anachronism in modern photos is the highway, parking lot, and interpretive signage — none of which existed in period.

### Sketch of ca. 1840 wagon train at Independence Rock — The Henry Ford Collection

- **What it shows:** An annotated period sketch depicting a wagon train encampment at the rock's base with the Sweetwater River and Devil's Gate visible behind. Shows the rock's relationship to the valley and the river; the wagon camp configuration.
- **Link:** [The Henry Ford — Sketch of circa 1840 Wagon Train at Independence Rock](https://www.thehenryford.org/collections-and-research/digital-collections/artifact/368416)
- **What it adds:** Camp layout reference; the wide valley composition with Devil's Gate as a visual waypoint in the background; the rock's horizontal dominance relative to the camp.
- **Blind spot:** Labeled "ca. 1840" but exact provenance uncertain; treat as a composition reference rather than a precision historical document.

### J. Goldsborough Bruff — drawings from 1849 journals

- **What it shows:** Bruff was a trained draftsman. His journals include multiple sketches of Independence Rock: a view from the east approach, a view from the rock's summit looking west toward Devil's Gate, and details of specific inscriptions. His summit view is the only documented period visual from the top of the dome.
- **Link:** [Beinecke Rare Book & Manuscript Library, Yale — Bruff journals](https://beinecke.library.yale.edu/collections/highlights/joseph-goldsborough-bruff-diaries-journals-and-notebooks); [Yale Digital Collections — Bruff diary](https://collections.library.yale.edu/catalog/9998775)
- **What it adds:** The rock's silhouette from the eastern approach — how it looked coming down the trail in 1849. The summit view of the valley west toward Devil's Gate. Inscription detail (specific names, letter styles). The overall density of the rock's south face, rendered by a careful draftsman.
- **Blind spot:** Bruff's style is detailed but not painterly. Color information must be inferred. His scale rendering is realistic but compressed for notebook size.

### Father Pierre-Jean De Smet — written accounts, 1840–1841

- **What it shows:** De Smet provides the earliest extended description of the rock as a named landmark, coining (or first documenting) the phrase "great register of the desert." His 1840 letter describes both the Indian pictographs and the emigrant/fur-trader names already present, and places himself in the tradition: "mine figures among them, as that of the first priest to reach this remote spot."
- **Link:** [WyoHistory.org — Independence Rock](https://www.wyohistory.org/encyclopedia/independence-rock) (secondary summary of De Smet's accounts)
- **What it adds:** Confirms the rock was already densely inscribed in 1840, four years before the Great Emigration. Establishes the rock as a multi-tradition register — Indian pictographs plus fur-trapper names plus missionary inscriptions, well before the wagon-train era.
- **Blind spot:** De Smet was writing letters and mission reports, not a travel journal in the mode of Bruff or Nesmith. Visual description is incidental to his religious purpose.

### John C. Frémont — 1843 expedition report

- **What it shows:** Frémont passed by Independence Rock on August 1, 1843, during his second expedition. His report, published in 1845, introduced the rock to a broad American readership. His verbatim description: *"Everywhere within six or eight feet of the ground, where the surface is sufficiently smooth, and in some places sixty or eighty feet above, the rock is inscribed with the names of travelers."*
- **What it adds:** Frémont's report was the period equivalent of a widely-read travel guide — it shaped every emigrant's expectations of what they would find. The specific mention of inscriptions reaching "sixty or eighty feet above" the base is crucial: names were not just at the accessible lower zone but had been painted or inscribed at considerable height, whether by very tall methods (stacking emigrants on each other, using poles) or simply by people standing on ledges partway up the dome. This detail belongs in any technically accurate rendering of the inscription band.
- **Note on attribution:** The "Great Register of the Desert" phrase is often attributed to Frémont. The primary evidence suggests De Smet coined it in 1840–1841; Frémont likely popularized it in his 1845 report. Both attributions are historically defensible; the phrase belongs to both.

### Rufus B. Sage — *Rocky Mountain Life* (1846), describing 1842 observations

- **What it shows:** Sage's chapter on Independence Rock — Chapter XIV in his 1846 book — provides the most detailed pre-emigration-peak description of the inscription surface: *"The surface is covered with the names of travelers, traders, trappers, and emigrants engraven upon it in almost every practicable part, for the distance of many feet above its base."*
- **What it adds:** Pre-peak confirmation that the rock was already densely inscribed in 1842, seven years before the 1849 gold rush crowds. Establishes the rock's character as a register predating the organized emigration, rooted in the fur-trade era.
- **Blind spot:** Sage's book is a prose narrative, not a journal. Some temporal compression and narrative license is expected.

### WyoHistory.org — Independence Rock encyclopedia entry

- **Link:** [WyoHistory.org — Independence Rock](https://www.wyohistory.org/encyclopedia/independence-rock)
- **What it adds:** Comprehensive secondary source with primary-diary citations for key figures: De Smet, Nesmith, Polly Coon, Martha Hecox, Daniel Budd. The single best one-stop secondary source for the rock's history and diary excerpts, with dates and attributions verified.

---

## Composition references from period art

Period imagery and diary accounts establish a consistent compositional language:

- **Wide horizontal composition** — the rock's 14:1 width-to-height ratio demands a landscape orientation with the dome spanning most of the horizontal frame. Unlike Chimney Rock, which is a vertical element in a horizontal landscape, Independence Rock IS the horizontal band. It should fill 60–70% of the horizontal frame width.
- **Low viewpoint, roughly eye-level from a wagon seat** — period sketches and Jackson's photos are all from the ground-level perspective of someone standing at the wagon road, looking north-northwest at the south face. The dome's curve rises from the sage plain and arcs overhead.
- **Sage prairie foreground** — the road and the sage flat between the trail and the rock's base. A distance of perhaps 200–400 yards of open ground between the viewer and the rock's south face. This open foreground is what creates the sense of scale; without it, the dome has no anchor.
- **Sweetwater River as a horizontal detail** — the river is present but subordinate, visible as a bright ribbon to the south (right or left edge of the frame depending on viewing angle), not a prominent compositional element. It should be there; it should not dominate.
- **Human figures on the dome** — period art universally includes figures climbing. Even at small scale — dots against the gray granite — they are essential for anchoring the rock's true dimensions. A dome with no figures reads as possibly a small hill; figures make it clear it is a 130-foot landmark.
- **Camp at the base** — wagons and tents at the rock's southern base, not a neat circle but a spread camp. A loose arrangement of 5–20 wagons, some facing various directions, canvas tops cream-gray in the light, a fire or two.
- **Sky dominant in upper third** — the valley is open and the sky is wide. Blue sky with high cumulus, or warming toward yellow-orange in late afternoon. The granite dome against a blue sky at late afternoon is the canonical Independence Rock image.

---

## FLUX prompt building blocks

Iterate against the **Distinctive visual features** checklist — a candidate that makes the rock too small, too spire-like, too tan, or without human figures on the dome gets discarded immediately. The single most common FLUX failure mode for this landmark is **scale collapse**: the model generates a plausible granite dome but sizes it as a low rocky hill rather than a 130-foot monolith dominating the valley. Use explicit scale cues in the prompt (wagons at the base "the size of insects," "rising 130 feet from the sage flat") and verify against the first candidate.

**Default (1843–1860, late afternoon, July — the canonical view):**
```
wide panoramic view of Independence Rock, Wyoming, massive gray granite dome rising 130 feet from the sage Sweetwater Valley, turtle-shaped monolith 1900 feet long dominating the composition horizontally, pale silver-gray Archean granite smoothed by wind, darker inscription band on lower south face covered in carved and painted emigrant names, five or six emigrant wagons with cream-white canvas tops camped at the base, tiny figures of pioneers visible ascending the granite dome surface, the Sweetwater River winding as a bright ribbon half a mile south through sage prairie, low granite hills in the far distance, dry sagebrush and bunchgrass valley floor foreground, afternoon light from the west casting shadow on the north face and warming the south face to golden-gray, wide blue Wyoming sky with high cumulus, period accurate 1849 Oregon Trail, painterly oil on canvas, wagons at the base appear tiny relative to the rock
```

**Variant — July 4 celebration (cannon smoke, flag on summit):**
```
Independence Rock Wyoming July 4th 1847, massive gray granite dome above the Sweetwater Valley, American flag planted on the summit streaming in the wind, white cannon smoke dissipating from the summit above a crowd of emigrants gathered at the base, twenty or more covered wagons circled near the rock, figures climbing the dome surface, a bonfire at the base, late afternoon light, the valley floor sage-silver, Sweetwater River glinting south, blue summer sky, painterly oil on canvas, period accurate 1847 Oregon Trail
```

**Variant — climbers on the dome (mid-day, name-carving scene):**
```
Oregon Trail emigrants climbing Independence Rock Wyoming 1850, massive smooth gray granite dome, a dozen pioneer figures at various elevations on the rock surface, some crouching to chisel or paint names, one couple near the summit looking west toward Devil's Gate, the sage Sweetwater Valley spread below them, the Sweetwater River visible a half mile south, emigrant wagons camped at the base appearing tiny, midday sun, blue sky, period accurate 1850, painterly oil on canvas
```

**Variant — storm (afternoon thunderhead):**
```
Independence Rock Wyoming under a building afternoon thunderstorm, massive gray granite dome against a dark violet-gray sky, storm light from the south illuminating the pale granite while shadow fills the valley, emigrant wagons at the base with canvas covers battened down, the sage plain silver in flat storm light, Sweetwater River visible south, rain curtain on the western horizon over Devil's Gate, period accurate 1850, painterly oil on canvas, dramatic storm light
```

**Variant — dawn (the July 4 morning, companies arriving):**
```
Independence Rock Wyoming dawn, gray granite dome in silhouette against pink-orange eastern sky, emigrant wagon train approaching along the Oregon Trail through silver sagebrush, the dome rising massive and dark from the valley floor, the Sweetwater River catching dawn light south of the rock, cool morning light, long shadows raking east across the sage, period accurate 1849 Oregon Trail, painterly oil on canvas
```

---

## Variants needed in-game

- **Default** 1843–1860 standard late-afternoon view — the primary backdrop
- **July 4 variant** — flag + cannon smoke + celebration camp — should trigger when the game calendar puts arrival at Independence Rock within one or two days of July 4
- **Late-arrival variant** — same rock, diminished camp, no bunting — for arrivals meaningfully after July 4; the "you're behind schedule" visual
- **Climbers variant** — mid-day light, visible figures on dome — an alternate framing for the "arrived" state that foregrounds the name-carving tradition
- **Weather variants** — storm and dawn, wired via the existing `BackdropPainting` weather hook
- No period gates required — the rock is in use throughout the 1824–1869 window; the July 4 deadline mechanic is what creates period-sensitive variants, not a construction/abandonment date.

---

## What NOT to render

Modern photos and tourist material introduce several hard anachronisms:

- **The Wyoming State Historic Site visitor infrastructure** — parking lot, paved Highway 220, interpretive signage, footpath with gravel, fence line, restroom building. None existed in period.
- **Post-period trail infrastructure** — Pony Express marker (post-1860), OCTA kiosk, modern commemorative plaques.
- **Lush greenery or trees near the rock** — there were no trees at the rock. No cottonwood canopy, no shade trees, no landscaped plantings. Sparse low willows were possible near the Sweetwater bank, half a mile away. The rock itself emerged from bare sage prairie.
- **A small or moderate-sized rock** — do not let the model interpret Independence Rock as a large boulder or a modest hill. This is a 130-foot monolith with a 1,900-foot base. If the compositional scale feels similar to Chimney Rock, it is wrong.
- **Warm tan or clay-brown granite** — the Brule clay palette of the Platte-country formations is wrong for this granite. The rock is gray and pale. If the model renders warm buff or sandy tan, discard the candidate.
- **A vertical or spire-like profile** — the silhouette is horizontal, rounded, dome-shaped. No spire, no tower, no column.
- **Railroad infrastructure** — the Union Pacific came through the Sweetwater Valley post-trail era; no tracks in period.
- **Modern graffiti** — period inscriptions were carved names and dates in period lettering styles. Modern aerosol-style tagging is anachronistic and visually wrong.
- **Barbed wire or fencing** — barbed wire is 1874+; no fencing in our window.

---

## Sources

| Source | What it provides |
|---|---|
| [WyoHistory.org — Independence Rock](https://www.wyohistory.org/encyclopedia/independence-rock) | Comprehensive secondary with primary diary citations: De Smet, Nesmith, Hecox, Coon, Budd |
| [Wikipedia — Independence Rock (Wyoming)](https://en.wikipedia.org/wiki/Independence_Rock_(Wyoming)) | Dimensions; Frémont quote; De Smet; geological description; Sublette 1830 naming |
| [Wyoming State Parks — Independence Rock](https://wyoparks.wyo.gov/index.php/about-independence-rock) | Official site: Rufus Sage quote; early inscription 1824; De Smet credit; Wyoming State Historic Site info |
| [BaldHiker — Visiting Independence Rock, WY](https://www.baldhiker.com/wyoming-independence-rock/) | Visual description; confirmed inscription dates (M.K. Hugh 1824, Hanna Snow 1844, etc.); exfoliation geology |
| [The Henry Ford — Sketch ca. 1840 Wagon Train at Independence Rock](https://www.thehenryford.org/collections-and-research/digital-collections/artifact/368416) | Period sketch: camp layout, valley context, Devil's Gate in background |
| [BYU Special Collections — William Henry Jackson photograph, 1929](http://archives.lib.byu.edu/repositories/14/archival_objects/114574) | Jackson period photography, ground-level perspective |
| [Beinecke / Yale — J. Goldsborough Bruff journals and drawings](https://beinecke.library.yale.edu/collections/highlights/joseph-goldsborough-bruff-diaries-journals-and-notebooks) | Primary: 1849 diary with drawings of the rock from multiple angles including summit view |
| [Theresa Hupp Author — Independence Day at Independence Rock](https://theresahuppauthor.com/blog/2012/07/04/independence-day-at-independence-rock/) | Robert Caufield and Ralph Geer 1847 cannon-firing July 4 accounts |
| [Deseret News 2003 — History lives on at Independence Rock](https://www.deseret.com/2003/7/4/19732944/history-lives-on-at-independence-rock/) | Rachel Woolley 1848; Curtis Bolton 1848 (moonlit dancing on summit); Lydia Rudd 1852; Phoebe Judson 1853 July 4 feast |
| [WhenInYourState — Wind-Polished Wyoming Rock](https://wheninyourstate.com/wyoming/the-wind-polished-wyoming-rock-where-ancient-tribes-and-pioneers-left-their-marks-for-centuries/) | Windfaceting geology; inscription methods; Sublette 1830 naming context; Masonic Lodge 1862 |
| [NPS — Independence Rock State Historic Site](https://www.nps.gov/places/000/independence-rock-state-historic-site.htm) | Official NPS summary; rock dimensions; landmark designation |
| [OCTA — Oregon Trail Mileposts](https://octa-trails.org/articles/oregon-trail-mileposts/) | Mileage calibration |
| Sage, Rufus B. *Rocky Mountain Life* (1846) | Primary: inscription density description, 1842 observations |
| Frémont, John C. *Report of the Exploring Expedition to the Rocky Mountains in the Year 1842* (1845) | Primary: "Everywhere within six or eight feet of the ground...inscribed with the names of travelers" |
| De Smet, Pierre-Jean. Letters and Sketches (1843) | Primary: "great register of the desert" coinage; earliest missionary visit |
| Nesmith, J.W. "Diary of the Emigration of 1843," *Quarterly of the Oregon Historical Society* 7:4 (1906) | Primary: inscription materials (gunpowder, tar, buffalo grease); climbing with women; 1843 Great Emigration |

---

## Notes / open questions

- **Scale is the primary FLUX failure mode.** The model almost certainly has seen more photographs of small granite outcrops than large granite domes. Generating a rock that reads as a modest hill rather than a 130-foot monolith is the most likely failure mode. Mitigation: explicit scale cues ("wagons appear the size of insects at the base," "rising 130 feet from the valley floor," "a 1,900-foot long dome"). May need 8–12 candidates before landing a correctly-scaled generation. Plan for candidate volume.
- **Color drift toward warm tan.** FLUX may default toward a warm sandstone palette because the Platte-country formations (which dominate early-trail imagery) are all warm tan. The prompt must explicitly specify "pale gray Archean granite, cool gray tone, not warm tan, not sandstone" to counteract this drift.
- **The inscription band is the second key visual element** after scale. If the model renders a blank gray granite dome, the most important human detail is missing. The inscription texture on the lower south face should be specified explicitly: "darker inscription band on the lower south face, covered in carved names and dates, visible as dark marks and textures."
- **De Smet vs. Frémont attribution:** Both are defensible as "namers" of the Great Register. For in-game text, using De Smet as the originator (1840) and Frémont as the popularizer (1845 report) is most historically accurate.
- **Earliest inscription:** The 1824 M.K. Hugh inscription and the alternate Fitzpatrick naming theory for the rock's name (also 1824) mean the fur-trade era is now tied to the inscription tradition — the rock was a register before it was a trail landmark. This could be game-interesting: the earliest inscriptions are fur-trade names, not emigrant names.
- **July 4 variants vs. calendar wiring:** The game already tracks the in-game date. The July 4 variant backdrop should trigger when the game date is July 3–5, while the standard backdrop triggers otherwise. A "late arrival" variant (after July 7–10) could carry visible narrative weight as a "you're behind schedule" visual signal.
- **Five vs. three emigrant comparison:** The landmark-art JSX (`IndependenceRockArt.svelte`) renders a celebration scene as the default. For the raster backdrop, the **approach** view (dome from the south, wagons at base, climbers on the rock) may be more compositionally clear than the celebration scene, which requires a closer framing to read the July 4 elements. Recommend default prompt as the approach/camp view; July 4 as an explicit variant.
- **Devil's Gate relationship:** Devil's Gate (mile 843) is 4–5 miles west and visible from the summit of Independence Rock. It should NOT appear in the default Independence Rock backdrop (two landmarks in one image is confusing for the player), but the summit view variant (climbers on dome looking west) could legitimately show it as a distant notch — this is the view Bruff drew in 1849.
