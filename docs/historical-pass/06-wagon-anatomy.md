# Wagon Anatomy

Period: 1840s–1860s. Sources: Marcy's *The Prairie Traveler* (1859), Joseph Ware's *The Emigrants' Guide to California* (1849), Joel Palmer's *Journal of Travels* (1845), Hansen Wheel & Wagon Shop (working replica builders), End of the Oregon Trail Interpretive Center, Britannica, Colonial Sense parts identification, OCTA.

The wagon is the emigrant's house, vault, and life raft. Picking it right and keeping it together over 2,000 miles was the single most consequential equipment decision a family made. This doc captures what an 1840s-50s prairie schooner *looked like* in enough detail to drive the visual rework.

---

## 1. Two wagon types — get this right first

The popular pop-history image fuses two distinct vehicles. They are not the same.

### Prairie schooner (the actual emigrant wagon)

- ~half the size of a Conestoga
- Bed: ~4 ft wide × 9–11 ft long × 2–3 ft deep (sources vary slightly)
- Empty weight ~1,300 lb; loaded up to ~2,000–2,500 lb
- Pulled by **4–6 oxen** (most common) or 6–10 mules
- Square-ended bed (no upturned bow/stern like a Conestoga)
- Cotton/duck canvas bonnet over 5–7 hickory bows, drawstring at front and rear
- Smaller wheels than Conestoga; iron-tired hardwood
- Designed for the Oregon/California Trail's terrain — rivers, mountain passes, narrow turns

This is what 95% of emigrants drove. **Our `prairie_schooner` model is the canonical one.**

### Conestoga (the freight wagon)

- Up to 28 ft long
- 5-foot-tall wheels (front smaller than rear for turning radius)
- Loaded up to 6 tons
- Pulled by 6–10 oxen
- Distinctive curved bed with raised ends — designed so cargo stayed centered when going up/downhill
- Upturned bonnet matching the bed curve (the visual reason "schooner" became the name for both — the Conestoga genuinely looks like a sailing ship)
- Used on the Santa Fe Trail, freight routes, and rare on Oregon Trail proper (too heavy — killed oxen by mile 1,300)

In our game, the `heavy` wagon model pattern-matches a Conestoga or near-Conestoga — large freight-style wagon. In reality almost no families used these for the trip; we use it as a "carry more / heavier / costs more" trade-off.

### Light wagon

A non-period-name in the game pointing to a smaller prairie schooner / farm wagon — single-yoke (2 ox) team, less cargo, less cost. Maps roughly to the "light wagon" emigrants might have started with thinking it was enough (and discovered halfway it wasn't).

---

## 2. Anatomy — the parts you'd see from the side

### Bed (the box)

- Rectangular wooden box, 4 ft × ~10 ft, ~3 ft deep on a prairie schooner
- Sides are flat plank walls (NOT the upturned curves of a Conestoga)
- Often painted Colonial Blue (1840s) or transitioning to green (1850s) — many were just plain unfinished wood
- Pinned-through tenon latches on the rear tailgate (1840s); simpler latches by 1850s
- Top sideboards on some models removable for versatility (1850s feature)

### Cover (the bonnet / canvas)

- Cotton duck canvas, sometimes oiled/waxed for water resistance, over **5–7 hickory bows** spaced evenly along the bed
- Drawstring closures at front and rear — pulled tight in storms, opened for ventilation in heat
- Bonnet typically extends 1–2 ft past the bed at front and rear for shade and weather
- Color: undyed off-white when fresh; weathered to gray/tan over the journey
- This is the most visually variable part — see **canvas wear states** doc

### Undercarriage

Front to back, what's underneath:

- **Tongue** (or pole): the long shaft sticking out the front, attached to the doubletree. The ox team's chain hooks here. 1840s = stiff-pole hitch (rigid). 1850s = drop pole (hinged, easier on the team).
- **Doubletree + singletrees**: the iron-bound crosspiece at the tongue tip with two pivoting singletrees, where the lead pair of oxen attach via chain (NOT the tongue directly — the team's pulling force transfers through the tree to the wagon)
- **Front axle assembly**: front wheels, hounds (the wishbone-shaped parts cradling the axle), king pin (lets the front axle pivot for steering)
- **Reach**: long timber connecting front and rear axles down the centerline
- **Bolsters**: wood crossbeams supporting the bed
- **Rear axle assembly**: rear wheels, fixed (no pivot)
- **Brake lever**: hand-cranked or foot-pressed wood-block-on-wheel brake, more common in 1850s; rare on early-1840s wagons

### Wheels

- Hardwood (maple, hickory, oak) with iron tires hammered on
- Front wheels typically smaller than rear (~3.5–4 ft front vs ~4.5–5 ft rear) for turning radius
- Spoked, with an iron-clad hub and lynch pin holding the wheel on the axle
- This is *the* part that breaks most often on the trail — every diary mentions wheel repair

### Brake (when present)

- Wooden block pressed against the rear wheel by a hand-cranked or foot-pressed lever from the driver's seat
- 1840s wagons mostly relied on chains, drag-shoes, and prayer; brake lever became standard mid-1850s

---

## 3. Side-of-wagon hardware (visible from the travel scene's POV)

Looking at the wagon from the side as the wagon scene shows it, you'd see:

| Position | Item |
|---|---|
| Front of bed (driver's-side end, near tongue) | **Jockey box** — toolbox, iron-banded, holding bolts, lynch pins, hammer, axe, jack, spare iron parts, shoeing tools |
| Side of wagon, mid-section | **Water keg(s)** — strapped to the side, often a 5-gallon barrel; sometimes two |
| Side of wagon | Optional: **tool rack** — shovel, axe handles |
| Side or rear bow | **Butter churn** — hung off the rear bow on a rope; the wagon's motion churned cream into butter during a travel day (period delight, accurate) |
| Rear axle, hanging | **Tar bucket** (a.k.a. "grease bucket") — wood pail of pine tar + animal tallow, used to grease hubs every ~20 miles. Always hangs from a hook on the rear axle |
| Rear of wagon | **Feed trough** — folded down for the team at evening; folds up against the wagon during travel |
| Rear of wagon, tied to | **Spare livestock** — milk cow tied to rear, sometimes spare ox |
| Side or rear, strapped | **Chicken coop** — wooden slat box, strapped to wagon side or rear bed |
| Hung off bows / canvas pockets | Inside-canvas items (firearms, gunpowder horn, food sacks) — not visible externally |

Accessory placement gets its own doc (08).

---

## 4. State-of-wear cues

Things that change over the journey, visible from outside:

- **Canvas color**: white-off → gray → tan-stained → patched-with-mismatched-cloth
- **Canvas integrity**: intact → small tears, hand-patched → larger rips, lashed shut
- **Wood**: clean → dust-covered → mud-streaked → sun-bleached / cracked (paint flaking off blue/green originals)
- **Iron**: shiny → rust-streaked
- **Wheels**: round → minor warp visible by mid-trail → broken-and-spliced wheel by late-trail (real diary detail — "Lo, our wheel split at noon")
- **Tongue / wagon body**: clean → scorched (from prairie fires they outran), gouged (from rocky-road incidents), patched

Detailed state-progression in doc 09.

---

## 5. Art-direction notes for the rework

What we want visible at the travel scene's render scale (~280–350 SVG units wide for the wagon at scene-scale 4×, so the wagon is dominant in the frame):

**Definitely visible:**
- Canvas bonnet (largest visual element — primary state communicator)
- Bows (5–7 hoops, indicating bonnet shape — visible silhouette through canvas)
- Bed shape (square-ended, NOT Conestoga-curved)
- Wheels (4 wheels — front smaller, rear larger; spokes visible)
- Tongue extending forward to the team
- Tar bucket dangling from rear axle (small but iconic)
- Driver's seat or seat bench at front

**Conditionally visible (when present in game state):**
- Butter churn hung off rear bow
- Water keg on side
- Chicken coop strapped to side/rear
- Milk cow tied to rear
- Driver figure (holding reins)
- Pail/feed trough at rear

**Probably not worth modeling at this scale:**
- Hand-forged hardware detail (linchpins, etc.)
- Stiff-pole vs drop-pole distinction
- Brake lever (only emerges 1850s; subtle visual)
- Side-board separation lines

**Period-correctness mistakes to avoid:**
- Don't draw a Conestoga (curved bed, raised ends) when the scene calls for a prairie schooner
- Don't put 6 oxen on a `light` wagon (would look wrong — light wagons used 2 yoke = 4 oxen max, often 2)
- Don't put the tar bucket on the front; it's always rear-axle
- Don't paint a brake lever on a 1840s-era wagon (anachronism)

---

## 6. Sources

| Source | What it provides |
|---|---|
| Marcy 1859, *The Prairie Traveler* | Period authoritative wagon-fitting / loading guide. [CPRR.org full text](https://cprr.org/Museum/Marcy_Prairie_Traveller.html) |
| Ware 1849, *Emigrants' Guide to California* | Earlier emigration handbook |
| Palmer 1847, *Journal of Travels* | First-hand 1845-46 emigrant account, including wagon condition notes |
| [Hansen Wheel & Wagon Shop](https://www.hansenwheel.com/blog/prairie-schooners-1840s-and-1850s/) | Modern working replica builder; specific 1840s vs 1850s construction details (rave-framed box, lynch pin axles, doubletree, drop pole evolution) |
| [End of the Oregon Trail: The Wagon](https://oregontrailcenter.org/the-wagon) | Bed/undercarriage/cover overview, materials |
| [Britannica — Prairie schooner](https://www.britannica.com/technology/prairie-schooner) | Dimensions, weight, team-size canonical numbers |
| [Britannica — Oregon Trail Wagons](https://www.britannica.com/topic/Oregon-Trail/Wagons) | Why prairie schooner > Conestoga for emigration |
| [Colonial Sense: Conestoga parts identification](http://www.colonialsense.com/Society-Lifestyle/Signs_of_the_Times/Conestoga_Wagon/Parts_Identification.php) | Detailed parts diagram (note: Conestoga, not schooner — useful for the parts that overlap) |
| [Wikipedia — Covered wagon](https://en.wikipedia.org/wiki/Covered_wagon) | General overview, type comparison |
| [Notes from the Frontier — What Pioneers Packed](https://www.notesfromthefrontier.com/post/what-pioneers-packed) | Loading + accessory placement |

Modern visual references — search "prairie schooner replica side view" for a stack of restored-wagon photos at Scotts Bluff NHS, End of the Oregon Trail Interpretive Center, and the Hansen Wheel & Wagon Shop. Bierstadt's *Oregon Trail* paintings give the period-painted aesthetic but compress proportions for composition; treat as mood reference, not blueprint.
