# Canvas + Wear Progression

Period: 1840s–1860s. Sources: Britannica prairie-schooner entry, Oregon Trail Center "The Wagon" + supplies pages, Homestead.org Oregon Trail life article, NPS "Wagons on the Trails", Frontier Life blog, Sager journals, Frizzell journal, Joel Palmer 1845, Marcy 1859.

The wagon's appearance changes dramatically over a 2,000-mile journey. Diaries describe wagons starting fresh-painted in Independence and arriving at Oregon City patched together "like a beggar's coat." This doc captures the progression so the rendered wagon visibly tells the player how rough the trip has been.

---

## 1. Canvas (the bonnet) — material and starting state

### What it was

Cotton canvas (often "duck cloth" — heavy, tightly-woven cotton) was the dominant material. Some emigrants bought **heavy sailcloth**; some wove their own from **linen** at home. Almost all were **double-thickness** at the top for rain shedding. Most were **oiled** or **waxed** for water resistance — beeswax or linseed oil applied to the cloth before departure.

Some emigrants painted slogans on the side: "Oregon or Bust", "California or Damn Sure", or political slogans. (Period-accurate but anachronistic for our generic schooner — skip unless we want a modifier.)

### Color when fresh

- **Off-white / cream** if undyed cotton or linen (the most common)
- **Tan / oiled** if oil-treated (slight amber tint from linseed)
- **Bright white** if heavily-bleached sailcloth (less common, more expensive)
- **Painted bright colors** on a few flashy parties (rare; period-attested but uncommon — skip for game)

The "white" of "white-bonneted prairie schooners crossing the plains" is mostly off-white-to-cream, not snow white.

### Construction

- Stretched over **5–7 hickory bows** (steamed and bent into U-curves)
- **Drawstring closures** at front and rear — pulled tight in storms, opened for ventilation in heat
- **Cantilevered** front and rear — bonnet extends 1–2 ft past the bed for shade and rain shed
- Tied to the bed sides with rope or canvas ties

---

## 2. Wear progression — five stops

Map of the journey ÷ stages. State changes happen *gradually*, but for game-render purposes we group into five discrete stops. Each stop describes the visual signature.

### Stop 0 — fresh / Independence outfit

**When:** First 100 miles out of Independence/St. Joseph (so basically only the start of the game).

**Visual signature:**
- Bonnet **bright off-white**, drawn tight with crisp drawstring at both ends
- Wood **clean**, possibly **painted Colonial Blue** (1840s) or **green** (1850s) — many were unpainted bare wood
- **Iron shiny** with no rust
- **No dust accumulation** anywhere
- **No patches**
- Wheels round, clean, spokes fresh

**Diary cue:** Frizzell describing the parting at Independence — "all looked very gay and bright" before the first dust storm.

### Stop 1 — dusty / Plains crossing (Independence → Fort Laramie)

**When:** Roughly 0–700 miles in. The first major stage.

**Visual signature:**
- Bonnet now **tan-gray** from dust, no longer crisp off-white
- **Lower 1/3 of wagon body** caked with dried mud streaks from creek fords
- **Wheel hubs** brown with dust + tar grease
- **Iron tires** still shiny on the contact surface (constantly polished by ground); rest of iron starting **dull**
- Bonnet **still intact** — no patches yet, drawstrings working
- Wood **paint** if any starting to look dusty but not flaking

**Diary cue:** Sager journals describe the Platte River corridor dust. Many diaries note the dust caking on everything within the first weeks.

### Stop 2 — worn / Fort Laramie → South Pass

**When:** ~700–1,200 miles in. The shift from plains to mountains.

**Visual signature:**
- Bonnet **gray-tan**, with **first small patches** — mismatched scraps of calico, linen, or other canvas sewn on with rough stitches
- **2–4 visible patches** on the bonnet, irregular shapes, not on a regular pattern
- **Drawstrings replaced** or knotted-and-spliced where original cord broke
- Wood **paint flaking** if originally painted; bare wood **sun-bleached**
- **Iron rust streaks** from rivets and hardware
- **Wheels** have had at least one repair — visible mismatched spoke or splint on the rim
- **Mud + dust** layered on lower body, partly washed off and partly re-applied

**Diary cue:** Frizzell at South Pass: "our wagon is a sorry sight." Joel Palmer: detailed wheel-repair narratives.

### Stop 3 — ragged / South Pass → Snake River

**When:** ~1,200–1,700 miles in. Late-trail stage, oxen tiring, repairs frequent.

**Visual signature:**
- Bonnet **patchwork** — multiple patches of different fabrics including **calico flowered prints** (women would sacrifice dress fabric for repairs), **canvas scraps**, **even leather pieces** for high-wear corners
- **6–10 visible patches**, some overlapping, some failing
- Bonnet **sagging** between bows (rope ties stretched/broken)
- **Larger holes** still partially open in places (no fabric to spare)
- Bed wood **clearly weathered** — bleached, cracked, paint mostly flaked off
- **Iron heavily rusted** in spots, rust runs down the wood
- **Wheel repairs visible** — multiple splints, possibly a wheel showing a homemade rim section
- **Tongue / brake** may show repair (period-correct: tongue breaks were common)
- **Caked grime** on lower body — no longer washed off, just builds

**Diary cue:** Sager: "every wagon a different shade of gray and tan." Marcy: late-trail wagons are "a hospital of broken parts pretending to roll."

### Stop 4 — failing / Snake River → Oregon City

**When:** Final 300–500 miles. Survival mode.

**Visual signature:**
- Bonnet **mostly patches** — original canvas now a minority of the visible surface area
- **Some bows visible through holes** — fabric gone in places, exposing the hickory hoops
- Bonnet may be **partly removed** — top stripped to reduce weight or because it failed irreparably; only the **front and rear half-bonnets** remain
- Wood **scorched, gouged, splinted** — fire damage from prairie fires they outran, axe gouges from forced clearings
- **Iron rusted dark brown**, paint long gone
- **Wheels** held together with metal bands, spliced spokes, bolted-on hardware-store-grade replacements
- **Tongue** may be a replacement (whitewood, lighter color than original, no paint)
- The wagon **looks like it's barely held together** — and it is

**Diary cue:** Joel Palmer describing the descent down the Barlow Road: families abandoning wagons that couldn't make it. The arrival photos that exist are unanimous: tattered, scorched, glorious.

---

## 3. Game-state mapping

The game's existing `wagon.condition` (0–100) is the most natural input. Map condition → wear stop:

| Condition | Stop | Description |
|---|---|---|
| 100 | 0 — fresh | Just outfitted |
| 99–80 | 1 — dusty | Plains stage |
| 79–55 | 2 — worn | First patches |
| 54–30 | 3 — ragged | Multi-patch quilt |
| 29–1 | 4 — failing | Held together by hope |
| 0 | (broken — game over) | — |

We could also drive wear off **miles traveled** rather than condition (since condition fluctuates with repairs), but condition is the cleaner signal for "how rough has it been."

A simpler model: **canvas state** independent from **wagon body state**:
- `canvasState`: clean / patched / ragged / mostly-gone
- `wagonState`: clean / dusty / weathered / failing

These can advance somewhat independently (a cared-for wagon body still has a beat-up canvas after a hailstorm; patched canvas with a fresh wagon body if they had a workshop stop). Phase 2 idea — for v1, drive both off `wagon.condition`.

---

## 4. Specific repair/wear visual cues to include

Things that turn up over the journey — paint these in for the patched/ragged stops:

- **Mismatched fabric patches** — irregular shapes, sometimes with visible stitching
- **Calico print patches** — flower-print fabric on the canvas (the woman's dress sacrificed for repair) — strong period detail
- **Drawstring knots** at the front and rear — visible knot bumps where cord was spliced
- **Bonnet sag** between bows — the canvas isn't taut anymore
- **Wheel splints** — wood pieces lashed to a damaged spoke
- **Tongue splice** — visible mismatched-wood join in the tongue
- **Iron rust streaks** — orange/brown vertical streaks running down the wood from hardware
- **Charred patches** — small burned areas from cooking-fire embers or prairie fires
- **Mud caking** on lower 1/3 — layered, not washed
- **Sun-bleached wood** — silvering of unpainted wood after sun exposure
- **Paint flake** — visible peeling of any original paint

---

## 5. What canvas color represents

Canvas color is a fast visual proxy for emotional state of the journey:

- **Off-white** = optimism, fresh start
- **Tan-gray** = the trail is real now, there's work to do
- **Yellow-tan with patches** = we've been at this a long time, we're tired
- **Mostly-patches** = we're going to make it but we won't look pretty
- **Half-gone** = this trip is destroying us, but we're still moving

This is the single most communicative visual element on the wagon. Get it right.

---

## 6. Render approach (preview for format-decision doc)

Given Dave's preference for **option 2 (all-raster painted)** or **option 4 (SVG + raster pattern fills)**:

### If option 2 (all-raster):
Generate **5 paintings per wagon model × 5 wear stops = 25 base raster images**. The condition-stop combos are independent of canvas state vs wagon-body state in this mode (we'd need to bake everything into one painting per condition stop).

To break out canvas separately from body: 5 wagon-body paints × 5 canvas paints = 25 layered paints, blended at runtime via SVG `<image>` stacking. More work but more flexible.

### If option 4 (SVG + raster pattern fills):
- Wagon body is SVG with raster pattern fills (canvas weave, weathered wood texture)
- Wear is SVG-overlaid: patches as SVG `<path>` shapes filled with pattern; rust streaks as SVG `<path>` strokes; drawstring knots as SVG `<circle>` elements
- Canvas state and body state are independent SVG layer groups, toggled by game state
- 1 base SVG + N pattern fills + 5 wear-overlay configurations = much fewer assets, much more code

The wear progression is a strong argument for **option 4**. State-driven visual change is exactly what SVG layering excels at. The painterly raster fills give the painterly look without baking 25 raster images.

But **option 2** is also viable if Dave wants painterly fidelity over flexibility — at the cost of variant generation work.

This decision lives in doc / task #38 (format decision) — to be locked after all four research docs (06–09) are written, which is now.

---

## 7. Sources

| Source | What it provides |
|---|---|
| [Britannica — Prairie schooner](https://www.britannica.com/technology/prairie-schooner) | Canvas material (cotton/duck), naming origin, double-thickness at top |
| [Oregon Trail Center — The Wagon](https://oregontrailcenter.org/the-wagon) | Bonnet construction, drawstring closures, oil treatment, cantilevered ends |
| [Oregon Trail Center — Supplies](https://oregontrailcenter.org/supplies) | Beeswax/linseed oil waterproofing, sailcloth alternative |
| [Homestead.org — Covered Wagons Heading West](https://www.homestead.org/homesteading-history/covered-wagons-heading-west-life-on-the-oregon-trail/) | Painted slogans + waterproofing variants |
| [Frontier Life — Oregon Trail Wagon Basics](https://www.frontierlife.net/blog/2020/5/20/oregon-trail-wagons-basics) | Wear in service, canvas customization |
| [NPS — Wagons on the Trails](https://www.nps.gov/articles/000/wagons-on-the-trails.htm) | Wagon types, official Park Service article |
| Sager journals | First-hand wear progression accounts |
| Frizzell journal | South Pass condition observations |
| Joel Palmer 1845, *Journal of Travels* | Wagon repair narratives |
| Marcy 1859, *The Prairie Traveler* — [CPRR.org](https://cprr.org/Museum/Marcy_Prairie_Traveller.html) | Period repair guidance and condition expectations |
| [iStock — Oregon Trail Covered Wagon photos](https://www.istockphoto.com/photos/oregon-trail-covered-wagon) | Modern living-history photo references for visual reference |

Modern visual references — search for "covered wagon arrival Oregon City patched", "wagon train 1850s photo", "prairie schooner replica condition trail end" for living-history reenactment photos showing late-trail wear. Currier & Ives mid-trail prints are conservative on the wear (idealized); diary descriptions are the more honest source.
