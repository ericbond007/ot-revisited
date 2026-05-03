# Trade-Post Resale Price Audit (#276)

Period: 1840s–1860s. The buy/sell numbers in `src/lib/game/content/prices.ts` were originally set by feel during plan 3a. With #216 (Plains-trader pack), #239 (salmon trade), and the #242–#253 landmark batch landing more native-trade items and trading-post variety, this pass walks every entry against period sources and corrects the worst outliers without rebalancing the whole economy.

## Methodology

**Sources used.** Marcy *Prairie Traveler* (1859) — Army quartermaster price lists; Palmer *Journal* (1847) — outfitting at St. Joseph; Ware *Emigrant's Guide to California* (1849) — Independence outfitter prices; Frizzell *Across the Plains to California in 1852*; Sage *Rocky Mountain Life* (1846); Catlin *Letters and Notes* (1841) — native trade goods; OCTA archives; NPS *End of the Oregon Trail Interpretive Center* outfitting data.

**Reference frame.** A common laborer in 1849 earned roughly $1/day; a skilled tradesman $1.50–$2/day. So $5 ≈ five days' wages. A typical 1849 family-of-four outfit at Independence ran $400–$600 all-in. We anchor against that scale rather than modern equivalents.

**Tier framework (period reality).**

| Tier | Markup vs wholesale | Examples |
|---|---|---|
| Wholesale (Missouri-River jobber) | 1× | Marcy 1859 quartermaster lists |
| Independence outfitter | 3–5× | Ware 1849 emigrant list |
| Mid-trail post (Laramie, Hall) | 6–10× | Frizzell 1852, Sage 1846 |
| Sparse mountain post (Bridger, Robidoux) | 8–15× | Bridger 1849 price-gouging records |

Our model collapses all of this into one `buy` price plus a post-specific `stockScale` quantity multiplier. The numbers below target **mid-trail post** as the canonical price — reasonable for the median game-time encounter.

**Buy/sell margin target.** Period markup on resale was steep both ways: a post would buy a player's surplus at 30–60% of its sell price. Our target ratio is **1.8–2.5×** sell-to-buy. Below 1.5× reads as a generous fence; above 3× reads as exploitative.

## Per-category audit

### Food staples

| Item | Current buy | Period reference | Decision |
|---|---|---|---|
| flour | $0.20/lb | Independence $0.04–0.06/lb; trail post $0.10–0.15/lb | Plausible at trail-post tier. **Keep.** |
| cornmeal | $0.10/lb | Half of flour, often locally milled | **Keep.** |
| beans | $0.25/lb | Independence $0.05–0.08/lb; trail $0.15–0.25/lb | Plausible. **Keep.** |
| bacon | $0.40 buy / $0.30 sell | Independence $0.08–0.12/lb; trail $0.30–0.50/lb | Buy plausible; **sell margin too thin (1.33×) — cut sell to $0.20.** |
| salt_pork | $0.45 / $0.30 | Period premium over bacon | **Cut sell to $0.22** (margin parity). |
| hardtack | $0.15 | Marcy lists at $0.10/lb | **Keep.** |
| dried_fruit | $0.60 | Period $0.15–0.30/lb at outfitter; up to $1 mid-trail | **Keep.** |
| pemmican | $0.80 | Native trade good — high-energy density | **Keep.** |
| jerky | $0.65 | Premium shelf-stable meat | **Keep.** |
| coffee | $1.50 | Independence green beans $0.20–0.40/lb; Bridger 1849 charged $1+/lb | High but defensible at trail post. **Keep.** |
| tea | $1.00 | Luxury import via St. Louis | **Keep.** |
| sugar | $0.35 | Independence $0.10–0.15/lb | **Keep** (trail markup). |

### Wagon parts

| Item | Current buy | Period reference | Decision |
|---|---|---|---|
| wheel | $10.00 | Independence $4–6; trail $15–25 | Mid-trail tier — **keep.** |
| axle | $12.00 | Independence $3–5; trail post $6–10 | **High — drop buy to $7, sell to $4.** |
| tongue | $8.00 | Independence $2–3; trail $4–6 | **High — drop buy to $5, sell to $2.50.** |
| canvas | $6.00 | Cover took ~25 yd at $0.10–0.20/yd = $2.50–5 | Wagon-cover-equivalent unit, **keep.** |
| spare_plank | $2.00 | Sawn boards plentiful | **Keep.** |
| tar_bucket | $1.50 | Pine-tar standard $0.50–1 | **Keep** (mid-tier). |

### Tools

| Item | Current buy | Period reference | Decision |
|---|---|---|---|
| iron_toolkit | $40.00 | Marcy lists full kit at $15–25 | **High — drop buy to $25, sell to $15.** |
| cookware | $8.00 | Dutch oven + kettle + skillet $5–10 | **Keep.** |
| rope | $2.50 | 50ft hemp $1–2 | Plausible. **Keep.** |
| shovel | $4.00 | Period $1–2 | **High — drop buy to $2.50, sell to $1.20.** |
| salt | $1.50 | 5–lb bag $0.30–0.50 | **Plausible** if interpreted as 5-lb sack equiv. **Keep.** |
| saleratus | $0.20 | Period staple, cheap | **Keep.** |
| soap | $0.50 (#269) | Marcy 1859 lists 5¢/bar wholesale; outfitter 8–10× | **Keep.** |
| lard | $0.25 | Independence $0.10/lb | Plausible. **Keep.** |
| compass | $8.00 | Pocket compass $2–5 | **High — drop buy to $4, sell to $2.** |
| water_skin | $2.00 | Sewn leather skin or 5-gal keg $1.50–3 | **Keep.** |
| ox_shoes | $1.00 | Iron shoes per ox $0.50–1 | **Keep.** |
| spyglass | $15.00 | Refracting glass $10–25 | **Keep.** |

### Weapons & ammo

| Item | Current buy | Period reference | Decision |
|---|---|---|---|
| rifle | $20.00 | Plain percussion $12–18; Hawken $25–40 | Mid-tier. **Keep.** |
| gunpowder (per charge, 0.016 lb) | $0.04 | Marcy 1859 lists 1-lb canister $1.00–2.00 ≈ $0.016–0.032/charge | Plausible (mid-trail). **Keep.** |
| lead_pig (5 lb) | $1.50 | $0.06–0.10/lb wholesale × 5 = $0.30–0.50; trail markup brings it to $1.00–2.00 | **Keep.** |
| lead_balls (per ball) | $0.05 | Commercially cast $1/100 = $0.01/ball | **High — drop buy to $0.02, sell to $0.01.** Casting your own from a pig stays the better economics. |
| percussion_caps | $0.01 | $0.50/100 = $0.005/cap wholesale; trail $0.01–0.02 | **Keep.** |
| bullet_mold | $1.50 | Iron mold $1–2 | **Keep.** |
| rifle_cleaning_kit | $3.00 | Brush + rod + oil $1–3 | **Keep.** |

### Clothing

| Item | Current buy | Period reference | Decision |
|---|---|---|---|
| coat | $5.00 | Wool overcoat $4–8 | **Keep.** |
| boots | $4.00 | Heavy boots $3–5 | **Keep.** |
| blanket | $3.00 | HBC point-blanket $2–4 | **Keep.** |
| tent | $8.00 | Marcy 1859 priced canvas A-frame $5–10 | **Keep.** |

### Livestock

| Item | Current buy | Period reference | Decision |
|---|---|---|---|
| yoke | $6.00 | Wood ox-yoke $2–3 at Independence; trail $5–8 | **Keep.** |
| ox_bow | $2.00 | Bow staves $0.50–1.50 | Plausible. **Keep.** |
| picket_pins | $1.50 | Iron pins $0.50–1 each | Slight markup, fine. **Keep.** |
| chicken | $0.50 | Live hen $0.25–0.50 | **Keep.** |
| milk_cow | $25.00 | Period $20–40 | **Keep.** |
| grain | $0.15/lb | $5/100 lb at Independence; mid-trail $0.15–0.25 | **Keep.** |

### Medicine

| Item | Current buy | Period reference | Decision |
|---|---|---|---|
| quinine | $4.00 | Sulfate $1–2/oz; bottle $3–5 | Plausible. **Keep.** |
| laudanum | $2.50 | 4-oz bottle $1–3 | **Keep.** |
| calomel | $2.00 | Mercury chloride $1–2 | **Keep.** |
| bandages | $1.50 | Cloth scraps were nearly free; boxed $0.50–1 | **High — drop buy to $0.75, sell to $0.30.** Reflects the period reality that any clean cloth could be torn into bandages. |
| herbal_poultice | $1.00 | Foraged or Preacher-made | **Keep.** |
| patent_medicine | $3.00 | Bitter / opium-laced bottles $1–3 | **Keep.** |
| vinegar | $1.00 | $0.25/gal wholesale; trail $0.50–1 | Plausible. **Keep.** |
| epsom_salts | $0.50 | Cheap purgative | **Keep.** |
| camphor | $1.50 | Imported gum $1–3 | **Keep.** |
| paregoric | $1.20 | Opium tincture $1–2 | **Keep.** |
| hartshorn | $0.80 | Smelling salts $0.50–1 | **Keep.** |
| dovers_powder | $1.80 | Compounded fever-sweat $1–3 | **Keep.** |
| castor_oil | $0.40 | Cheap purgative | **Keep.** |

### Comfort

| Item | Current buy | Period reference | Decision |
|---|---|---|---|
| tobacco | $1.00/lb | Plug $0.50–1.50/lb | **Keep.** |
| whiskey | $2.50/gal | $0.50/gal wholesale; trail $1–3 | **Keep.** |
| harmonica | $3.00 | $0.50–1.50 (German imports) | **High — drop buy to $1.50, sell to $0.75.** |
| fiddle | $12.00 | Plain fiddle $5–15 | **Keep.** |
| bible | $5.00 | American Bible Society pocket edition $1–2; family Bible $3–5 | **High — drop buy to $2, sell to $1.** Pocket edition is the trail standard. |
| grandfather_clock | $50.00 | Family-heirloom price; intended as the headline luxury (#148) | **Keep** — gameplay weight outranks period accuracy here. |
| anvil | $5.00 | Marcy 1859 advised against carrying one — most got jettisoned | Cheap-to-buy / heavy-to-haul is a deliberate trap. **Keep.** |
| china_tea_set | $25.00 | Period import luxury | **Keep.** |
| feather_mattress | $15.00 | Best-quality bed $10–20 | **Keep.** |

### Native trade goods

| Item | Current buy | Period reference | Decision |
|---|---|---|---|
| moccasins | $3.00 | Plains-pair $1–2; trade-store $2–4 | **Keep.** |
| buffalo_robe | $8.00 | Tanned robe $5–10 | **Keep.** |
| beads (per string) | $0.50 | Catlin 1841: $0.10–0.25/string | **High — drop buy to $0.30, sell to $0.15.** Brings the going rate closer to Catlin's notes. |
| mirror | $0.50 | Trade-store small mirror $0.25–0.50 | **Keep.** |
| vermilion (per oz) | $1.00 | $1–2/oz (mercury sulfide, controlled) | **Keep.** |
| awl | $0.20 | $0.05–0.10 each | Slight markup. **Keep.** |
| thimble | $0.15 | $0.05–0.10 each | Slight markup. **Keep.** |
| calico (5-yd bolt) | $2.00 | Bolt $1–2 | **Keep.** |
| pocket_knife | $0.50 | Plain folder $0.25–0.75 | **Keep.** |

### Hunt byproducts

| Item | Current buy | Period reference | Decision |
|---|---|---|---|
| tallow | $0.30 | Rendered fat $0.10–0.20/lb | Slight markup. **Keep.** |
| prize_cut | $0.50 | Choice cuts (tongue, hump) — premium delicacy | **Keep.** |
| raw_hide | $1.00 | Untanned hide $0.50–1 | **Keep.** |

### Fishing gear (#197)

| Item | Current buy | Period reference | Decision |
|---|---|---|---|
| fishing_line | $0.30 | Hand-line $0.30 (matches Marcy) | **Keep.** |
| fishing_rod | $1.50 | Folding pole $1–3 | **Keep.** |
| fishing_net | $4.00 | Seine net $3–6 | **Keep.** |

### Dairy (#139, #222)

| Item | Current buy | Period reference | Decision |
|---|---|---|---|
| milk (per gal) | $0.30 | Surplus dairy $0.15–0.30/gal | **Keep.** |
| cheese | $0.50/lb | Farmer's cheese $0.20–0.50/lb | **Keep.** |
| butter | $0.40/lb | Period dairy $0.20–0.50/lb | **Keep.** |
| cheese_press | $3.00 | Hoop + cloth + rennet jar $2–4 | **Keep.** |
| butter_crock | $2.50 | Tin pail with dasher $1.50–3 | **Keep.** |

## Corrections applied this PR

Surgical changes only — every other entry stayed at its current value because the audit found it within the historical band for our mid-trail-post tier. Eight items moved:

| Item | Old (buy/sell) | New (buy/sell) | Reason |
|---|---|---|---|
| bacon | 0.40 / 0.30 | 0.40 / 0.20 | Margin too thin (1.33×) — bring sell down |
| salt_pork | 0.45 / 0.30 | 0.45 / 0.22 | Same margin parity as bacon |
| axle | 12.00 / 8.00 | 7.00 / 4.00 | Period mid-trail $6–10; was running double |
| tongue | 8.00 / 5.00 | 5.00 / 2.50 | Period $2–3 at Independence, $4–6 trail |
| iron_toolkit | 40.00 / 25.00 | 25.00 / 15.00 | Marcy 1859 listed at $15–25 |
| shovel | 4.00 / 2.00 | 2.50 / 1.20 | Period $1–2 |
| compass | 8.00 / 4.00 | 4.00 / 2.00 | Period pocket $2–5 |
| lead_balls | 0.05 / 0.025 | 0.02 / 0.01 | Commercial cast $1/100 = $0.01/ball |
| bandages | 1.50 / 0.75 | 0.75 / 0.30 | Cloth scraps were nearly free |
| harmonica | 3.00 / 1.50 | 1.50 / 0.75 | German imports $0.50–1.50 |
| bible | 5.00 / 2.50 | 2.00 / 1.00 | American Bible Society pocket edition $1–2 |
| beads (string) | 0.50 / 0.25 | 0.30 / 0.15 | Catlin 1841 $0.10–0.25 |

Casting lead from a pig stays the better economics: pig $1.50 / 5 lb / 0.03 lb-per-ball ≈ 167 balls per pig at $0.009/ball cast. Buying ready-cast at $0.02 stays a 2.2× convenience markup over home-casting.

## What this audit deliberately did NOT change

- **Trail-tier markups.** The current `buy` is treated as a single mid-trail price; per-post variation is handled by `stockScale`. A future task could split this into Independence vs. mid-trail vs. mountain-post tiers (it would let Bridger gouge ~2× without us having to write per-post overrides). Logged as a follow-up consideration; out of scope for this audit.
- **Game-feel anchors.** `grandfather_clock` ($50) and `china_tea_set` ($25) intentionally read as expensive — they're the headline luxuries for the score-on-arrival mechanic (#148). `coffee` ($1.50/lb) and `whiskey` ($2.50/gal) are at the upper end of period plausibility but the gameplay friction is the point.
- **Native-trade ratios.** With the exception of `beads`, native-trade items (#216) all read true against Catlin / Sage / Frizzell references. The 6-string beads price for the Shoshone bull-boat (#238) was set against this audit's adjusted bead price.

## Sources cited

- **Marcy, R.B.** *The Prairie Traveler.* New York: Harper & Brothers, 1859. Quartermaster price lists, outfitting recommendations, anti-anvil advice.
- **Palmer, J.** *Journal of Travels Over the Rocky Mountains, to the Mouth of the Columbia River.* Cincinnati: J.A. & U.P. James, 1847. St. Joseph outfitter prices.
- **Ware, J.** *The Emigrant's Guide to California.* St. Louis: J. Halsall, 1849. Independence outfitter prices.
- **Frizzell, L.** *Across the Plains to California in 1852.* Diary references to mid-trail prices.
- **Sage, R.** *Rocky Mountain Life.* Boston: Wentworth, 1846. Bridger / mountain-post observations.
- **Catlin, G.** *Letters and Notes on the Manners, Customs, and Condition of the North American Indians.* London, 1841. Trade-good values.
- **OCTA archives** — Oregon-California Trails Association.
- **NPS End of the Oregon Trail Interpretive Center** — outfitting cost reconstructions.
