# Food & Money on the Oregon Trail — Historical Research for VK #1284

A period-grounded read on how FOOD and MONEY actually worked for 1843–1859 emigrants,
weighted toward the *back half* of the trail (Fort Hall → Oregon City), as input to the
food-economy game slice (VK #1284).

Sources: research corpus at `~/projects/hoosierTrail-research/docs/historical-pass/`
(Palmer 1845/47, Marcy 1859, Ware 1849, Bryant 1846, Carpenter 1857, Frizzell 1852,
Nesmith 1843, Farnham 1839, Mattes' *Great Platte River Road*) + the emigrant literature.
Game numbers from `src/lib/game/content/{starter-kit,items,prices,landmarks}.ts` and
`src/lib/game/systems/consumption.ts`.

---

## Q1. Provisioning guidance vs. the game

### Period per-adult recommendations (~110-day / 5-month journey)

The two canonical lists (corpus `01-items.md`): **Ware 1849** (heavy — assumes you carry
everything) and **Marcy 1859** (leaner — assumes beef-on-the-hoof + game supplement).

| Staple | Ware 1849 (per adult) | Marcy 1859 (per adult) | Game BASE_KIT (whole wagon) |
|---|---|---|---|
| Flour | **200 lb** | 150 lb | 600 lb |
| Bacon / side pork | **150–200 lb** | 25 lb + beef on hoof | 100 lb |
| Coffee | 25–40 lb | 15 lb | 4 lb |
| Sugar | 25–50 lb | 25 lb | 25 lb |
| Beans | 25–50 lb | — | 80 lb |
| Dried fruit | 15–25 lb | — | 40 lb |
| Salt | 10–25 lb | listed | 2 lb |
| Hardtack | optional | listed | 50 lb |
| Saleratus | 5–10 lb | listed | 2 lb (4 units) |

### Per-person comparison — guide vs. game

The starter kit's own comment (`starter-kit.ts`) admits it is calibrated to **~60% of
Palmer 1845 scaled for a 4-soul party**. Total staple food ≈ **905 lb**. Dividing by a
4-adult reference family:

| Staple | Ware/Palmer per adult | Game per adult (905 lb ÷ 4) | Game vs. guide |
|---|---|---|---|
| Flour | 200 lb | 150 lb | 75% — close |
| Bacon | 150–200 lb | 25 lb | **13–17% — far under** |
| Coffee | 25–40 lb | 1 lb | **~3% — drastically under** |
| Sugar | 25–50 lb | 6.25 lb | ~15–25% — under |
| Salt | 10–25 lb | 0.5 lb | **~3% — drastically under** |
| Beans | 25–50 lb | 20 lb | ~50% — reasonable |
| Dried fruit | 15–25 lb | 10 lb | ~50% — reasonable |

**Verdict: the game is deliberately under-provisioned vs. period guidance, and the kit
comment says so explicitly.** This is a *design* choice (so post-restock stays a real
strategic decision, not optional) — but it has two period-fidelity tells worth noting:

1. **The flour:bacon ratio is inverted from reality.** Period emigrants over-carried fat
   (Ware spec'd *more* bacon than flour by weight; the 1849 jettison-pile lists are
   famously full of "piles of most beautiful bacon" — corpus `01-items.md` §9). The game
   carries 6× more flour than bacon. A late-trail wagon that ran out of *fat* (calorie
   density) before *flour* is the historically wrong failure mode.
2. **Coffee (4 lb) and salt (2 lb) are token amounts.** Marcy spec'd 15 lb coffee /
   adult; the game gives 1 lb. Salt was both a daily seasoning AND the curing agent for
   every fresh hunt — 0.5 lb/adult would not cure a single buffalo. (The game leans on the
   `salt` *tool* item for curing, which papers over this, but the staple quantity is far
   below period.)

Note also: the game models **2 lb/adult/day** at "normal" rations, child ×0.6
(`consumption.ts` `FOOD_PER_ADULT`). The period bread ration alone was ~1 lb flour/adult/day
plus ~0.3 lb bacon (corpus `08-post-restock.md`) ≈ 1.3+ lb of *staples* before fresh food,
so the game's 2 lb/adult is a reasonable all-in abstraction.

---

## Q2. Cash on the trail

### How much money emigrants carried (corpus `06-prices.md`, "Starter funds audit")

| Stratum | Period cash | Source |
|---|---|---|
| Wealthy banker / merchant | $1,500–3,000 | Hill 1849 ledgers; Sutter's Fort museum |
| Doctor | $800–1,500 | medical-practice records |
| Skilled tradesman | $400–700 | working savings; tools in lieu of cash |
| **Farmer (typical family)** | **$300–500** | letters home; Donner manifest |
| Common laborer | $100–200 | pooled, joined trains for wages |

Anchor: a laborer earned ~$1/day in 1849, so $5 ≈ a week's wages; a family-of-4 outfit at
Independence ran $400–600 all-in (Ware 1849; Marcy "$250–300/man including team + wagon").
**The game's $400 BASE_KIT cash sits squarely at the median farmer-family figure** — well
chosen. After buying the outfit, a family typically left Independence with only **modest
loose cash** ($50–150 in hand was common), which is why barter mattered so much late-trail.

### What cash actually bought on the trail

- **Ferries & tolls** — the single biggest recurring cash drain. North Platte/Mormon Ferry,
  Green River ferry, Snake fords, and (1846+) the **Barlow Road toll** ($5/wagon + ~10¢/head
  — corpus synthesis `05-synthesis.md`, listed as an unmodeled choice).
- **Blacksmithing / re-shoeing / repairs** at forts (Fort Kearny, Laramie, Bridger).
- **Fort provisions** — bacon/flour/coffee/sugar/salt ("the Marcy 5") at heavily marked-up
  prices, when stock existed.

### Were the late-trail HBC forts actually selling provisions? — Famously thin, but not empty

Fort Hall and Fort Boise were **Hudson's Bay Company** posts at the far end of a long
supply chain. Both were modest and frequently low on stock, but **could and did sell
provisions** when they had them:

- **Palmer 1845 at Fort Hall** (primary, corpus source `palmer_1847_…txt` ~line 1934):
  > "The garrison was supplied with flour, which had been procured from the settlements in
  > Oregon, and brought here on pack horses. They sold it to the emigrants for **twenty
  > dollars per cwt.**, taking cattle in exchange… an allowance was made of from five to
  > twelve dollars per head [of cattle]. They could not be prevailed upon to receive
  > anything in exchange for their goods or provisions, **excepting cattle or money.**"

  This is the canonical late-trail price anchor: **$20/cwt = $0.20/lb flour** at Hall in
  1845 — and they would take **lame cattle in trade** (5–12 $/head credit), not random
  goods.
- **Frizzell 1852 at Boise:** flour / bacon / coffee / salt available; **sugar was rare**,
  beans uncommon. The game encodes exactly this (`ft_boise` stock: flour/bacon/coffee/salt,
  no sugar; `stockScale: 0.6`, `priceMultiplier: 1.2`).
- **Bryant 1846 at Laramie:** flour/bacon "as much for one pound as we had given for ten in
  Independence" — i.e. **~10× Independence prices** mid-trail (corpus `08-post-restock.md`).
- **Bridger** was the gouge tier: Sage 1846 / Frizzell 1852 / Bryant 1848 all log
  exorbitant prices for the little he had (game: `priceMultiplier: 1.5`).
- **HBC policy actively discouraged emigration.** Capt. Grant at Hall showed arrivals the
  *abandoned wagons of the previous season* as "proof" wagons couldn't reach Oregon
  (corpus `ft_hall.md`). The fort was a lifeline AND a psychological gauntlet.

**Period-correct game prices** (corpus `06-prices.md`): flour $0.20/lb, bacon $0.40,
coffee $0.30, sugar $0.35 — all within the mid-trail-post band, with the four sparse
posts (Bridger 1.5×, Robidoux 1.3×, the Dalles 1.3×, Whitman 0.9×) carrying multipliers.

---

## Q3. Barter and the native food trade

### The salmon trade — a MAJOR late-trail calorie source

This is the strongest finding for late-trail food economy. The Snake/Columbia corridor was
one continuous indigenous fishery, and emigrants bought into it heavily:

- **Nesmith 1843, approaching Fort Boise** (primary, corpus `ft_boise.md`):
  > "Indians were in camp that evening; they had been seen for the last four or five days,
  > **coming daily to sell dried salmon.**"
- **Farnham 1839 at Boise:** feasted on "baked, boiled, fried, and broiled salmon" —
  salmon was the dietary staple of the post itself.
- **Drying racks "miles long" at Salmon Falls** (Shoshone fishery, mile ~1380). Diaries:
  a whole **8-lb salmon for a knife** (Frizzell 1852) or a few strings of beads (Royce
  1849). The game's `pocket_knife` description even cites this verbatim.
- **Palmer 1845 in the Grande Ronde / Walla Walla country** (corpus source): Cayuse and
  Nez Perce brought "wheat, corn, potatoes, peas, pumpkins, fish, &c." to trade for
  **cloth, calico, napkins, wearing apparel**, and would swap a horse for a cow at par.

**What emigrants traded for fish/food:** fishhooks & line, pocket/butcher knives, tobacco,
beads, vermilion, calico, brass trinkets (awls, thimbles, mirrors), and surplus
clothing — the small, light, high-value-to-natives goods (corpus `01-items.md` §8,
`06-prices.md`). Powder/lead/caps were also traded west of South Pass but were strategically
riskier to give away.

**Was it a major calorie source? Yes — for the Snake/Columbia leg specifically.** This is
the stretch where game is scarce (see Q4) and the salmon runs peak in late summer, exactly
when emigrants arrive (Aug–Sept). For many parties dried salmon bridged the gap between the
last fort and the Willamette settlements.

**Game status:** Already part-implemented. `encounter_native_salmon` (#239) fires
mile 1200–2050 with a friendly-tribe gate, trading fishing_line → 8 lb, tobacco → 5 lb,
or 2 beads → 4 lb of `game_meat` (3-day spoil clock, Indian-Trader profession bumps
yields). The `native_trade` item category and the Plains-trader pack (#216) exist. This is
the most period-faithful late-trail mechanic already in the game.

### Ox-swapping economics (2 worn for 1 fresh)

- **Palmer 1845 at Hall:** the HBC took **lame cattle in exchange** for flour at $5–12/head
  credit (worn animals fattened back up at the fort over winter for resale). The trade ran
  the other way too — emigrants swapped tired oxen + cash/cattle for fresh stock or horses
  ($15–25/horse).
- The general "**2 trail-worn oxen for 1 fresh**" exchange is the standard period read:
  a footsore ox is worth a fraction of a rested one, and the post (or a returning party)
  could recover the worn animal's value with rest. The game implements this as the
  `ox_swap` service (Fort Hall has it).
- The milk cow doubled as **backup ox** — diaries (Tabitha Brown, Carpenter) describe
  yoking a cow into the team to limp to the next post when an ox died (corpus
  `12-trail-cow-breeds.md`). The game's `milk_cow` is currently a dairy/morale animal only.

---

## Q4. Hunting reality by trail segment

**Hunting was front-loaded and never the primary food source.** The corpus is blunt
(`01-items.md` §4): *"most diaries report buffalo encountered briefly near the Platte;
emigrants ate far more bacon and beef-on-the-hoof than wild game."*

| Segment | Game availability |
|---|---|
| Platte / Plains (Kearny → Laramie) | **Buffalo country** — real but brief. Big herds, but most emigrants passed through the prime zone in days, not weeks. A single buffalo = hundreds of lb, but meat spoiled in days without curing (salt bottleneck). |
| Sweetwater / South Pass / Bridger | Antelope, occasional elk/deer — sparse, hard-won. |
| **Snake plains (Hall → Boise)** | **Barren.** Sagebrush desert, the Snake locked in an inaccessible canyon. The Snake buffalo herds had *already collapsed* by the 1840s–50s (corpus `ft_hall.md`). This is precisely the leg where parties starved — and exactly where the *salmon trade* (Q3) substitutes for hunting. |
| Blue Mtns / Columbia | Some deer/elk in the timber; fish dominant. |

**Quantification:** A plains buffalo yielded ~200–400 lb of usable meat, but a family could
only eat/cure a fraction before spoilage; the rest was wasted (a recurring diary lament).
Late-trail, hunting yielded near-zero on the Snake plains — the game correctly makes the
Hall→Boise leg the danger zone (audit #1039 notes 6 of 11 family-wagon dehydration wipes
died on this 110-mi leg). **Hunting should NOT be a reliable late-trail calorie lever** —
that's the salmon trade's job.

The game's `game_meat` (foodDrawOrder 0, 3-day spoil) + `salt`-driven curing → `jerky` +
fishing gear (`fishing_line`/`rod`/`net`, esp. valuable past Fort Hall per item comments)
already model this segmentation well.

---

## Q5. The walking larder (loose cattle / beef on the hoof)

- **Very common.** Corpus `01-items.md`: *"Many parties also drove a small herd (4–6 head)
  of beef cattle and one or two milk cows."* Marcy 1859 *assumed* beef-on-hoof in his lean
  ration list — that's why his bacon figure is only 25 lb/adult vs. Ware's 150–200.
- **Palmer 1845** records trains with **"about one thousand head of loose cattle"** (a large
  organized company) and constant cattle-hunting/straying delays (corpus source, many lines).
- **Slaughter timing:** beef cattle were killed progressively as the journey wore on and as
  grass thinned (a starving animal isn't worth driving). Late-trail, with grass gone, the
  loose herd was the meat reserve.
- **Eating the draft oxen in extremity: yes.** Palmer 1845 on the Barlow Road
  (corpus source ~line 3392): families "were expecting to rely upon their poor famished
  cattle… it would have been meagre diet… there was no certainty of having cattle long, as
  there was but little grass." And a crippled stray heifer "was slaughtered and the meat
  cured." Eating draft animals was the last-ditch calorie before relief arrived.

**Game status:** A loose beef herd / "walking larder" is **not modeled**. The milk cow
exists; emergency ox-slaughter does not.

---

## Q6. End-of-trail relief (1845–47)

The relief story is anchored by **Palmer 1845 himself** — he was *in* the Barlow party that
the first relief reached. This is a primary, first-person account (corpus source, lines
~2770–3470):

- **The crisis (Oct 1845):** Barlow's wagons attempted the Cascade crossing south of Mount
  Hood (the future Barlow Road) and got stranded as winter closed in, out of provisions,
  families reduced to relying on famished cattle.
- **How relief was organized:** the *first party out from the Dalles* carried word to
  **Oregon City** that emigrants were stuck crossing the Cascades and would need food. The
  settlements responded by **donation**:
  > "The good people of that place immediately **raised by donation about eleven hundred
  > pounds of flour, over one hundred pounds of sugar, some tea, &c.**, hired horses, and
  > the Messrs. Gilmore and Mr. Stewart volunteered to bring these articles to us."
- **Sold vs. given:** a hybrid — **given on credit, not charity, but at near cost.** "The
  only expense we were asked to defray was the hire of the horses" (~$40, hired from an
  Indian chief), "which brought the flour to **about four dollars per hundred**" — i.e.
  $0.04/lb, *Independence wholesale*, vs. the $0.20/lb gouge at Hall. "Those who had the
  means paid at once, and those who were unable to pay gave their **due bills**" (IOUs).
- **Distribution chaos:** relief parties leap-frogged the strung-out, starving families;
  Palmer's group repeatedly **gave away half their own provisions** to families they passed
  who had lost their food sacks (a loose horse destroying a provision sack is a recurring
  beat).

So: **organized ad-hoc from the settlements, brought by volunteers, food sold at cost on
credit (due-bills) to those who could pay, given outright to those who couldn't.** Not a
standing relief institution — a neighborly mobilization that became annual.

**Game status:** Not modeled. The synthesis doc (`05-synthesis.md`) lists a "going-back
party encounter" (eastbound family, cheap surplus supplies, news) as an unbuilt `[S]` TODO
— the relief party is its emotional inverse: a *westbound-from-settlements* rescue.

---

## Q7. Synthesis — ranked late-trail food-economy mechanisms

Ranked by historical weight × gameplay leverage for the Fort Hall → Oregon City leg, with
existing-code status and lb/day meaning for a 6-soul wagon.

**6-soul reference math** (4 adults + 2 children, "normal" rations, `consumption.ts`):
`4 × 2 lb + floor(2 × 2 × 0.6)` = **8 + 2 = 10 lb food/day**. A ~25-day Hall→Boise→Dalles
push at 10 lb/day ≈ **250 lb of food** must come from somewhere late-trail. That's the
budget every mechanism below feeds.

### Rank 1 — Native salmon/food trade (PARTLY EXISTS, strongest)
The single most historically-grounded late-trail calorie source on exactly the leg where
hunting fails. **Evidence:** Nesmith 1843 (daily salmon sellers), Frizzell 1852 (knife →
8-lb salmon), Palmer 1845 (Cayuse/Nez Perce produce + fish trade), miles-long drying racks.
**Game:** `encounter_native_salmon` (#239) already trades fishing_line/tobacco/beads → 4–8
lb game_meat. **6-soul meaning:** a single 8-lb salmon = ~0.8 days of food for the wagon —
so the encounter needs to fire *often enough* (and/or yield enough) to meaningfully dent the
250-lb budget. Today it's a one-fish nibble; to be a real economy lever it should be
repeatable across the whole Snake/Columbia corridor with scaling stock at the falls.
**Improvements:** add **dried salmon** as a shelf-stable native_trade food (distinct from
the 3-day-spoil fresh `game_meat`) so a party can *stock up* at Salmon Falls / the Dalles —
period-correct (the racks sold *dried* fish for the road, not just fresh).

### Rank 2 — Mid-trail post restock at gouge prices (EXISTS)
The cash lever. Buy the **Marcy 5** (flour/bacon/coffee/sugar/salt) at 6–10× Independence
prices when stock exists; HBC posts take **cattle in trade**. **Evidence:** Palmer 1845
($20/cwt flour, cattle exchange at Hall), Bryant 1846 (10× Laramie), Frizzell 1852 (sparse
Boise, no sugar). **Game:** post `stock` + `stockScale` + `priceMultiplier` + `barterPreferred`
all implemented; `ft_boise` and `ft_hall` stocks are period-calibrated. **6-soul meaning:**
at $0.20/lb flour a full 250-lb resupply ≈ $50 — a serious bite out of a $400-budget
family's residual cash, forcing the barter/sell-surplus decision. **Improvement:** wire
**"fort is out of X today"** stockouts (Frizzell "no sugar that day") — the mechanism exists
(`Landmark.stock` omission) but isn't randomized.

### Rank 3 — Ox / cattle barter & the walking larder (PARTLY EXISTS)
Cattle were liquid late-trail currency AND emergency food. **Evidence:** Palmer 1845 (lame
cattle → flour at $5–12/head; 2-worn-for-1-fresh logic), Marcy's ration list *assumes*
beef-on-hoof, Barlow-road families eating famished oxen. **Game:** `ox_swap` service exists
(Fort Hall); `milk_cow` exists as dairy only. **Missing:** a driven **beef herd** as a
"walking larder," and **emergency draft-ox slaughter** (eat the team to survive, at a brutal
pace penalty). **6-soul meaning:** one slaughtered ox ≈ 300+ lb beef ≈ a month of food for
the wagon — the ultimate last-resort calorie, paid for in future mobility. High-drama lever.

### Rank 4 — Hunting + fishing + curing (EXISTS, front-loaded)
Real on the Platte, near-useless on the Snake plains; salt-gated curing turns spoiling kills
into shelf-stable jerky. **Evidence:** corpus "ate far more bacon than game"; Snake-plains
barrenness. **Game:** `game_meat`/`jerky`/`salt`/fishing gear all present and correctly
segmented (fishing gear flagged valuable *past Fort Hall*). **6-soul meaning:** this should
*taper to near-zero* by Hall — and the design already does this, pushing the player toward
Rank 1 (salmon) instead. Leave it front-loaded; don't let late hunting trivialize the slice.

### Rank 5 — End-of-trail relief (NOT MODELED, narrative capstone)
The emotional payoff of the food slice: arrive starving on the Barlow Road / Columbia and a
settlement relief party brings flour at cost on a due-bill. **Evidence:** Palmer 1845
(1,100 lb flour + 100 lb sugar from Oregon City, $4/cwt via due-bills, give-to-the-destitute).
**Game:** absent; `05-synthesis.md` has a "going-back party" TODO as the nearest hook.
**6-soul meaning:** a scripted rescue that refills ~100–250 lb at near-zero price IF you
reach the Cascades alive but broke — the safety net that makes running the food economy
tight (rather than hoarding) survivable, and a period-perfect ending beat.

### One-line summary for the design
Late-trail, the calorie supply chain shifts from **hunting (Platte)** → **fort purchase +
cattle barter (Hall/Boise)** → **native salmon trade (Snake/Columbia)** → **settlement
relief (Cascades)**. The game already has the bones of #1–#4; the highest-leverage, most
period-faithful additions are **scaling the salmon trade into a real repeatable lever (+
dried-salmon shelf-stable food)** and **modeling cattle as both barter currency and an
emergency walking larder**.
