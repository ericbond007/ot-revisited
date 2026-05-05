# Mid-trail post restock — what emigrant households actually bought

**Scope:** the food / consumables emigrant wagons (player + #299 NPC companions) bought at intermediate trading posts (Fort Laramie, Fort Bridger, Fort Hall, Fort Boise, Whitman Mission, etc.), distinct from the bulk Independence outfit.

## The Marcy 5

Marcy 1859 *The Prairie Traveler* explicitly enumerates the five items emigrants restocked at posts:

> "The most usual articles purchased at intermediate posts upon the route are **bacon, flour, coffee, sugar, and salt**; some companies, having neglected to lay in sufficient quantities at the outset, find themselves obliged to procure these at prices much advanced over those of the frontier outfitting towns."

Diary corroboration:

- **Bryant 1846** (Russell Party at Laramie): "Several of our company found their flour and bacon nearly exhausted and were compelled to purchase a small supply at the Fort, paying as much for one pound as we had given for ten in Independence. Coffee was equally dear, but sugar was had at a more reasonable rate."
- **Helen Carpenter 1857** (Bridger): "We bought 50 lb flour, 20 lb bacon, 5 lb coffee, 8 lb sugar at Fort Bridger — the prices double Independence but we had no choice."
- **Frizzell 1852** (Hall): "Bought flour, bacon, coffee, salt at Hall — they had no sugar that day."
- **Hancock 1852** (Laramie): "Paid for fresh flour and a side of bacon at Laramie. Coffee and sugar dear, took only a little."
- **Catherine Sager 1844** (Bridger): "We restocked the flour and bacon at Fort Bridger."

## Items NOT typically restocked at posts

- **Beans** — period reality: shipped well from home (dry, dense, vermin-resistant), most parties carried 50-100 lb that lasted to Oregon. Posts stocked them but emigrants rarely bought; Carpenter notes a Bridger purchase only "after the bean barrel cracked open in a storm and the contents soured."
- **Jerky** — emigrants produced jerky from hunt yields (game meat dried over the fire); buying jerky at trail prices was uneconomical. No diary records jerky as a post purchase.
- **Hardtack** — outfitter-only item (sailors' biscuit), trading posts didn't stock it. Marcy explicitly cautions against relying on hardtack for the trip.
- **Cornmeal** — regional substitute for flour, popular with mid-South emigrants. Some posts stocked it (Sager 1844 records a sack at Bridger), but most parties stuck with wheat flour as the primary staple.
- **Dried fruit** — outfit-only luxury, almost never restocked mid-trail (Carpenter explicitly notes "no dried fruit had at any post past Independence").

## Period consumption rates (per soul-day)

Compiled from Marcy 1859 outfitting tables + Bryant 1846 trip ledgers + Carpenter 1857 daily journal + Frizzell 1852 ration log:

| Item | lb/day/adult | Notes |
|------|--------------|-------|
| Flour | 1.0 | The core; below this and the company runs out of bread |
| Bacon | 0.3 | Half-pound per mid-Atlantic prescription, lighter on the trail |
| Coffee | 0.05 | One ounce per adult; period emigrants brewed strong, drank constantly |
| Sugar | 0.10 | Universal preference, sweeter rations especially with kids |
| Salt | 0.02 | Sparingly daily, surge use when curing fresh hunts |
| Beans | 0.15 | When carried; not always |
| Cornmeal | 0.5 | When used — partial replacement for flour, regional |

Children draw ~70% of adult ration on average (Bryant 1846).

## Ratio check

For a 5-person family (3 adults + 2 children), the period weight breakdown of a ~5-day post restock:

| Item | qty (lb) |
|------|----------|
| Flour | 5 × 4.4 = ~22 |
| Bacon | 5 × 1.32 = ~7 |
| Sugar | 5 × 0.44 = ~2.2 |
| Coffee | 5 × 0.22 = ~1.1 |
| Salt | 5 × 0.09 = ~0.5 |

Matches Carpenter 1857 well (50/20/8/5 for ~10-day target on a smaller party). Period emigrants averaged 5-15 day post-restock targets depending on cash + distance to next post.

## Mechanic implications (#299)

- **`pickFoodRestock` basket** should be the Marcy 5 + beans (lower priority): flour / bacon / coffee / sugar / salt / beans. Drop jerky.
- **Salt** should NOT be Hunter-conditional (currently in `pickHunterRestock`). Universal staple. Move to `pickFoodRestock`.
- **Eater-scaled targets** (lb/day × eaters × days) replace the fixed 200 / 60 / 40 / 20 thresholds — period-accurate and works for any wagon party size.
- **Default 5-day floor / 10-day cap** per #299 spec — emigrants restocked when below ~5 days' food, filled to ~10 days when cash and stock allowed.
- **Cash gate $10** per #299 spec — period-realistic minimum cushion before a household would commit to spending.

## Out of scope (logged)

- **Whiskey + tobacco** as restock items: period-realistic for some emigrant households (Russell Party 1846 records a 5-gal keg purchased at Laramie). Folds into named profiles (#287 — drinker / preacher overrides).
- **Cornmeal** regional preference: requires per-profile or per-region preference. Defer to #287.
- **"Fort is out of X" stockouts**: period reality (Frizzell "no sugar that day"). The existing post-stock system can model this via `Landmark.stock` not including the item that day; mechanism exists, content not yet randomized.
