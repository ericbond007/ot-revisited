# Wagon Accessories — Placement

Period: 1840s–1860s. Sources: Oregon Trail Center supplies + wagons pages, Notes from the Frontier "What Pioneers Packed", End of the Oregon Trail Interpretive Center, Hansen Wheel & Wagon Shop, Frizzell journal, Sager journals, Marcy 1859, BLM NHOTIC FAQ.

The wagon was a moving farm. What an emigrant family hung off, strapped to, or slung under their wagon was load-bearing on day-to-day life. This doc maps each currently-supported game item (and adjacent period accessories) to its historically-correct mounting location, so the SVG/raster wagon component can render them where the period eye expects.

---

## 1. Quick reference — what goes where

A side view of a loaded prairie schooner, items in their period-correct positions:

```
                     [bonnet]                              [bonnet]
              ╔═══════════════════════════════════════════════════╗
   ┌─cab──┐ ╔═╝                                                   ╚═╗
   │ seat │═╣                                                       ╠═  feed trough
   │      │═╣                                                       ╠═  (folds down)
[jockey   │═╣  bed (4×10 ft)                                        ╠═
 box]──┐  │ ╚════════════════════════════════════════════════════════╝
       │  │   [water keg]   [chicken coop]                  [milk pail/churn — under wagon, between axles]
       │  │       │  ●         │ ▢ ▢ │                          ●●
       │  │       └──┘         └─────┘                          
       │  │
   ()===========================================================()
       │           ↑ reach (axle-to-axle)              ↑ tar bucket
    front axle                                            (rear axle)
                                                                               
                                                          ╲ milk cow tethered to rear
```

Below: each item, period evidence, in-game state mapping, render position.

---

## 2. Tar bucket / grease bucket

**Where:** Hanging from a hook on the **rear axle**, between or just behind the rear wheels. Iconic and consistent across all period sources.

**What:** Wood pail (often oak, ~5–8 inch diameter) with a tight-fitting lid, holding a mix of pine tar + animal tallow. Used to grease wheel hubs every ~15–20 miles to prevent the linchpin axle from squealing or seizing. Lid was tight to keep flies and dust out.

**Why there:** Closest to the wheels that need greasing, lowest-down so spills don't ruin food/clothing, and out of the way of cargo loading. A diary detail: experienced emigrants kept the tar bucket *closed and stashed away from clothes* — pine tar stained anything it touched.

**Game state:** `inventory.tar` or implicit (currently consumed by wagon-condition events). Visual is constant — bucket always visible if wagon is "operational."

**Render:** Small dark wood pail with iron handle, hanging below the rear axle on a thin chain or rope, between/behind the rear wheels. Always present.

**Sources:** End of the Oregon Trail, Hansen Wheel & Wagon Shop, [Farm Collector — Wagon Tools](https://www.farmcollector.com/equipment/wagon-tools/), [Oregon Trail Center — The Wagon](https://oregontrailcenter.org/the-wagon).

---

## 3. Water keg / barrel

**Where:** **Strapped to the side of the wagon**, mid-section, often two kegs (one per side, or both on the same side). Some emigrants used a single 10–15 gallon barrel; others two 5-gallon kegs.

**What:** Wood-stave barrel/keg, hooped with iron or hickory bands, fitted with a wood plug or simple spigot at one end.

**Why there:** Reachable from the ground for refilling at creeks. On the side rather than rear because the rear is usually tied up with the milk cow and feed trough.

**Game state:** Water is currently a resource attribute, not an inventory item. Visual constant — at least one keg always rendered (assumes the family is carrying water like every emigrant did).

**Render:** Wood barrel with two visible iron bands, ~1/3 the height of the wagon bed, strapped vertically (or laid horizontally on a side rack) on the wagon's left side mid-section.

**Sources:** [Notes from the Frontier — What Pioneers Packed](https://www.notesfromthefrontier.com/post/what-pioneers-packed), [Oregon Trail Center — Supplies](https://oregontrailcenter.org/supplies).

---

## 4. Jockey box (toolbox)

**Where:** **At the front of the wagon body**, mounted to the front of the bed just behind the driver's seat (or directly under the seat). Iron-banded wood box.

**What:** Held wagon-repair tools: hammer, nails, axe, jack, spare lynch pins, spare hardware, blacksmithing-grade tools for emergency wheel/axle repair. The 1840s-style was sloped-sided with iron banding; later 1850s versions sometimes integrated into the seat.

**Why there:** Reachable from the seat (driver pops it open to grab a tool), out of the way of cargo, doesn't unbalance the wagon.

**Game state:** Tools/repair-supplies are currently abstract or one-off items. Visual constant — every wagon had one.

**Render:** Small wood box with iron bands across, positioned at the front of the bed just behind/below the driver's seat.

**Sources:** Hansen Wheel & Wagon Shop, [Colonial Sense — Conestoga parts](http://www.colonialsense.com/Society-Lifestyle/Signs_of_the_Times/Conestoga_Wagon/Parts_Identification.php).

---

## 5. Butter churn / milk pail (THE WAGON-CHURNED BUTTER TRICK)

**Where:** **Slung underneath the wagon bed**, between the front and rear axles, hanging from a rope or hook attached to a bow or the bed frame. NOT on the side (the bumping needs to be vertical to churn).

**Period detail and quote:** *"Milk could also be churned into butter by simply hanging it in pails beneath the bumpy wagon."* (Oregon Trail Center). *"After milking the cow, the buckets of milk were covered and hung under the wagon, and the jarring of the unsprung axle would churn the milk. At night, the fresh butter would be skimmed off."* (Notes from the Frontier).

The "butter churn" item the game tracks (`butter_churn`) is therefore typically a **covered milk pail**, not a dedicated dasher-churn (though some families brought a small dasher-churn too — used at camp). The visual on a moving wagon is a *covered pail dangling under the bed.*

**Game state:** `butter_churn` item presence + active milk cow → visible pail under wagon.

**Render:** Small covered wood pail with rope or chain hanging from the underside of the wagon, between the wheels, dangling ~1/3 of the way down toward the ground. Subtle swing animation tied to scrollX or t (like the team bob).

**Visual note:** This is one of the period details that *most* emigrants did and most contemporary covered-wagon depictions miss. Putting the pail under the wagon is a strong period-accuracy signal.

**Sources:** [Oregon Trail Center — Supplies](https://oregontrailcenter.org/supplies), [Notes from the Frontier — What Pioneers Packed](https://www.notesfromthefrontier.com/post/what-pioneers-packed). See also synthesis: [05-synthesis.md](05-synthesis.md) — wagon-churned butter as a *delightful real period detail.*

---

## 6. Chicken coop

**Where:** **Strapped to the side of the wagon** (right side commonly, the left being the bullwhacker's walking lane), or **strapped to the rear** at bed-height. Slat-sided wood box ~12–18 inch wide, with chickens visible through the slats.

**What:** Open-slat wood crate. Chickens were a mobile egg supply (and emergency protein when needed). They got fed scraps and grain from the wagon cargo.

**Why there:** Out of the way of cargo loading, accessible for daily egg collection, but a chicken coop hung on the side lateral-rocked too much and exhausted/killed chickens — period diaries note rear-mounted coops as gentler.

**Game state:** `inventory.chicken` count → coop appears when chickens > 0; coop size proportional to count (or fixed).

**Render:** Wood-slat box with chickens visible inside, strapped to the rear of the wagon (default) or right side. Subtle clucking-animation possible (later phase). Gone entirely when chicken count is 0.

**Sources:** [Notes from the Frontier — What Pioneers Packed](https://www.notesfromthefrontier.com/post/what-pioneers-packed), [Oregon Trail Center — Supplies](https://oregontrailcenter.org/supplies).

---

## 7. Milk cow

**Where:** **Tied to the rear of the wagon** with a 4–8 ft rope, walking behind the wagon during travel. *Not* in the team — a milk cow walked separately, at a slower pace if needed.

**What:** Small heifer or full milk cow. Provides fresh milk daily (which produces wagon-churned butter — see §5).

**Why tied behind:** Milk cow walks at her own pace, can't be yoked to a working ox team. Tied to the wagon means she follows the family. At night she's untied and grazes with the team.

**Game state:** `inventory.milk_cow` count → cow figure tied behind wagon; multi-cow case = small cluster (period emigrants who kept multiple cows tied them in a small string).

**Render:** Brown or brown-and-white cow figure, behind the wagon at rope's-end (~6–8 SVG units behind), walking alongside. Optional: a thin rope line from rear of wagon to her halter.

**Period accuracy note:** Cows on the trail were often mistaken for spare oxen by inattentive observers — the cow yoked alongside an ox precedent (Lewis & Clark) shows the reverse case. Visual: a tied cow walking behind the wagon should not look like she's pulling.

**Sources:** [Oregon Trail Center — Supplies](https://oregontrailcenter.org/supplies), [Notes from the Frontier — What Pioneers Packed](https://www.notesfromthefrontier.com/post/what-pioneers-packed).

---

## 8. Feed trough

**Where:** **At the rear of the wagon**, hinged to fold down at evening. When folded up against the wagon's rear, it serves as a partial tailgate; folded down, oxen and cow eat from it.

**What:** Wood trough, ~3–4 ft long, ~1 ft deep, fitted with hinges to the rear of the wagon bed.

**Game state:** Implicit — every wagon had one.

**Render:** Visible only as a small hinged element at the bottom of the rear wagon panel. Folded-up state during travel (default scene). Could be drawn as a thin horizontal wood strip across the rear of the wagon.

**Sources:** [Notes from the Frontier — What Pioneers Packed](https://www.notesfromthefrontier.com/post/what-pioneers-packed).

---

## 9. Axe + shovel + tool rack

**Where:** **Strapped or hooked on the side of the wagon** (left or right, often left near the bullwhacker for quick access). The axe was particularly important — emigrants used it constantly for firewood.

**What:** Single-bit axe, narrow shovel, sometimes an additional pickaxe or hatchet. Hung handle-up so the iron heads are visible.

**Game state:** Tools are implicit / consumed in repair events. Visual constant — every wagon carried at least an axe.

**Render:** Long handle visible against the wagon's side, with iron head visible at top or bottom, strapped to a side rail.

**Sources:** [Notes from the Frontier — What Pioneers Packed](https://www.notesfromthefrontier.com/post/what-pioneers-packed), [Marcy 1859 — Prairie Traveler](https://cprr.org/Museum/Marcy_Prairie_Traveller.html).

---

## 10. Bullwhip

**Where:** **Coiled and hooked** on the side of the wagon when not in use — typically on the left near the driver's seat, since the bullwhacker walks on the left side of the team.

**What:** 8–12 ft braided leather whip with wood handle. Visible only when carried by the driver (when the team is moving). When wagon is parked, hooked to a side hook.

**Game state:** Implicit — every wagon had one.

**Render:** Held by the driver figure when the team is moving; hooked to wagon side when paused. Could be omitted entirely at our render scale (whip is thin, hard to read).

**Sources:** [Notes from the Frontier — In Praise of Oxen](https://www.notesfromthefrontier.com/post/_oxen).

---

## 11. Other items (lower priority for v1)

| Item | Where | Game state | Notes |
|---|---|---|---|
| **Lantern** | Hooked on a side hook | Implicit | Only visible at dusk/night — not relevant since we dropped time-of-day cycling |
| **Spinning wheel** | Inside wagon (not visible) | Heirloom items in some games | Famously jettisoned at Independence Rock — not a moving-day visual |
| **Plow / heavy farming gear** | Strapped on top of bonnet, or inside | Implicit | Top-of-bonnet placement creates a distinctive "loaded" silhouette — worth modeling for narrative weight |
| **Salt pork barrel / flour barrel** | Inside wagon | Inventory food | Not externally visible |
| **Coop of any other livestock (rabbits, ducks)** | Side, like chickens | Rare, not in current game state | Not modeled |
| **Goat** (rare) | Tied to rear like cow | `goat` item if game adds it | Same render as milk cow but smaller |
| **Coffee pot / kettle hung from a bow** | Hung from the rear bow over the tailgate | Implicit camp item | Period detail; minor visual |

---

## 12. Loading order — what affects state cascades

Period reality: when the team gives out and the family has to lighten the wagon, things go off in a predictable order:
1. **Plow + heavy iron** — first to go (Independence Rock pile is famous for these)
2. **Spare furniture** — pianos, dressers, bedsteads
3. **Books and non-essentials**
4. **Some food** if the team is in real trouble
5. **Last to go**: the milk cow (income), the butter churn (food production), the tar bucket (without it, the wagon dies)

Visual implication: a wagon's *weight* is suggested by the silhouette being either bulgy/loaded or sleeker/lightened. As the journey progresses and the engine module runs lightening events (`#179`), the rendered wagon could shed visible top-of-bonnet items to communicate state.

---

## 13. Visibility priority for the render rework

When deciding which accessories to actually paint into raster variants vs SVG-overlay vs skip:

**Tier 1 — always-on visual identity:**
- Tar bucket (rear axle)
- Water keg (side, mid-section)
- Jockey box (front of bed)
- Driver figure (walking beside team for ox; seated for mules)

**Tier 2 — game-state-driven:**
- Butter churn / milk pail (under wagon — visible only if `inventory.butter_churn > 0` and `milk_cow > 0`)
- Chicken coop (rear or side — visible if `inventory.chicken > 0`)
- Milk cow (tied behind — visible if `inventory.milk_cow > 0`)

**Tier 3 — narrative / nice-to-have:**
- Axe / shovel on side rack
- Top-of-bonnet "loaded heavy" silhouette when wagon weight is high
- Feed trough at rear (constant, but small)

**Tier 4 — skip for v1:**
- Bullwhip (too thin at scale)
- Lantern (no longer time-of-day driven)
- Specific tool detail in jockey box

---

## 14. Sources

| Source | What it provides |
|---|---|
| [Notes from the Frontier — What Pioneers Packed](https://www.notesfromthefrontier.com/post/what-pioneers-packed) | Comprehensive list of side-hung items including water barrels, butter churn (under-wagon trick), shovel, axe, tar bucket, feed trough, chicken coop |
| [Oregon Trail Center — Supplies](https://oregontrailcenter.org/supplies) | Wagon-churned butter explanation, milk cow + chicken coop period practice |
| [Oregon Trail Center — The Wagon](https://oregontrailcenter.org/the-wagon) | Tar bucket position confirmation |
| [Hansen Wheel & Wagon Shop — Wagon Grease Bucket](https://www.hansenwheel.com/wagon-grease-bucket/) | Modern reproduction grease bucket photos |
| [Farm Collector — Early Wagon Tools](https://www.farmcollector.com/equipment/wagon-tools/) | Jockey box + tar bucket + tools details |
| [Wikipedia — Covered wagon](https://en.wikipedia.org/wiki/Covered_wagon) | General overview |
| [BLM NHOTIC FAQ — Wagons (PDF)](https://www.blm.gov/sites/default/files/learn_interp_nhotic_faqwagons.pdf) | Park Service FAQ, accessory placement |
| Marcy 1859, *The Prairie Traveler* — [CPRR.org full text](https://cprr.org/Museum/Marcy_Prairie_Traveller.html) | Period authoritative loading guide |
| Sager journals, Frizzell journal | Diary-attested daily-use placement details |
| [01-items.md](01-items.md) (existing project doc) | Covers item inventory; this doc complements with placement |
| [05-synthesis.md](05-synthesis.md) (existing project doc) | Wagon-churned butter as "real and delightful" period detail |
