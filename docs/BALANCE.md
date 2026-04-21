# Balance Review Checklist

Ship v1 numbers are placeholders for playtesting. Work through this checklist after
logging 3-5 full journeys and note what feels off.

## Travel speed

- [ ] Does a normal journey reach Oregon City in 4-6 in-game months at moderate pace?
- [ ] Do grueling-pace runs feel meaningfully faster but punishing?
- [ ] Are mountain legs correctly 40-50% slower than prairie?
- [ ] Does running out of oxen strand the party as intended?

**Relevant constants:** `PACE_BASE_MILES` in `src/lib/game/systems/travel.ts`, `TERRAIN_MULTIPLIER` in the same file, `oxenSpeedFactor` in `src/lib/game/systems/oxen.ts`.

## Food & water

- [ ] Is starting food (500 lb) enough for ~40 days without foraging/hunting?
- [ ] Is Farmer's +100 lb starter + foraging worthwhile vs other professions?
- [ ] Does water run out in desert terrain if you don't top up at springs?

**Constants:** `FOOD_PER_PERSON` in `src/lib/game/systems/consumption.ts`, `FARMER_FORAGE_AT_REST` / `FARMER_CAMP_FORAGE` in the rest/camp actions.

## Health & morale

- [ ] Do condition daily damages feel tuned? Cholera at -10 HP/day means death in ~10 days without treatment — right feel?
- [ ] Does morale recovery keep up with passive decay? Bored long stretches should tank morale.
- [ ] Is wellness feedback loop meaningful or noise?

**Constants:** `CONDITIONS` in `content/conditions.ts`, morale thresholds in `systems/morale.ts`.

## Events

- [ ] Does the 30% per-day fire chance feel right? Too many? Too few?
- [ ] Do year-gated events (1849 Gold Rush, 1852 cholera) fire reliably when games span those years?
- [ ] Are event weights balanced — do storms fire more than they should?

**Constants:** `BASE_FIRE_CHANCE` in `systems/events.ts`, individual `weight` values in `content/events.ts`.

## Profession picks

- [ ] In a 6-person party, which profession combos feel strongest? Weakest? Any dead picks?
- [ ] Does the Whore's income feel like real money or trivial?
- [ ] Does the Doctor's pre-1854 boiling unlock matter vs just drinking coffee?
- [ ] Do Scout / Indian Trader / Preacher feel flavorful enough despite lighter mechanical footprints?

## Item catalog sanity

- [ ] Every item in `content/items.ts` should be referenced by at least one system rule. Re-audit.
- [ ] Any items added since Plan 3a that aren't in `PRICES`? The items-catalog test covers this — make sure it passes.

## Prices

- [ ] Is starting $300 + profession cash enough for meaningful pre-departure shopping?
- [ ] Are Fort Hall / The Dalles markups (later posts) tuned to create scarcity?
- [ ] Do Merchant / Banker bonuses actually compound into a real strategy?

## Journey outcomes

Over 10 playthroughs:

- How many arrive in Oregon City?
- How many wipe?
- How many strand?

Target rates for a balanced game: **40% arrive, 40% partial-party-arrive, 20% wipe/stranded** — adjust if outcomes are too forgiving or too brutal.
