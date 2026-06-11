# Food economy slice (#1284) — guide-shaped kit, salmon trade, ox slaughter

**Problem.** The #1281 water merge exposed that the food economy was balanced
around attrition: with dehydration fixed, 6/6 survivors out-eat provisioning
that deaths used to subsidize (gate: starvation 1,248 deaths/2,500 runs; train
personas 19% arrivals vs 44% levers-alone). The historical research
(appendix: `2026-06-10-food-economy-research.md`) shows the kit is both lean
(~60% of Palmer) and the wrong SHAPE (bacon 6:1 under flour — period emigrants
over-carried fat and abandoned bacon, never flour), and that the real late-trail
calorie sources were the native salmon trade and cattle-as-larder, not hunting
(Snake buffalo had collapsed by the 1840s — hunting stays front-loaded).

**Decisions (Dave, 2026-06-10):** scope = kit + salmon + larder (Q1 opt 1);
kit = ~85–90% of trip needs, guide-shaped, +cash bump, custom-kit stays free
choice (Q2 synthesis); salmon = fishery posts AND roadside encounters (Q3
opt 3); slaughter = camp action AND starvation event prompt (Q4); purchasable
beef cattle → #1321; relief parties → #1322.

## 1. Starter kit — guide-shaped, ~85–90% of trip needs

`BASE_KIT.inventory` (4-soul family scale; current → new, lb):

| item | now | new | note |
|---|---|---|---|
| flour | 600 | 700 | 175/adult (Palmer 200) |
| bacon | 100 | 320 | 80/adult — fixes the inverted fat ratio |
| cornmeal | 0 | 80 | grain variety (diet groups), period cheap |
| beans | 80 | 110 | |
| hardtack | 50 | 80 | |
| dried_fruit | 40 | 70 | scurvy-aware guides pushed this |
| sugar | 25 | 60 | |
| coffee | 4 | 10 | the waterborne-0.6× + morale payload |
| salt | 2 | 12 | enables curing a full ox (§3) + hunts (#122) |

Total staples ~901 → ~1,442 lb. `BASE_KIT.cash` 400 → 500 (outfit budget
stays honest; full Palmer was rejected partly because it broke the bankroll).
Medium wagon: 2,500 lb capacity, currently ~45% loaded → ~67% with the new
kit — verify with a load-percent assertion test and confirm no overload
mechanic triggers at game start. `STARTER_KIT_REFUND` recalibrates to the
new kit's replacement value (same formula, new numbers). Custom-kit screen
unchanged — going lean stays a deliberate player choice.

Rationale recorded for the future: ~85–90% (kit + typical hunting/forage ≈
trip needs) means a CLEAN run only brushes the late-trail economy, while
normal losses (theft, spoilage, river dunkings, delays, extra mouths fed via
train share) pull most runs into it. Scarcity lives in the loss channels and
the custom-kit slider, not in a secretly-short default.

## 2. Salmon trade — both surfaces

**New item `dried_salmon`:** food, protein nutrition group, shelf-stable
(no spoil clock — that is the point of the drying racks), priced ~bacon-tier.

**Fishery posts:** `salmon_falls` converts from scenic waterSource landmark to
`kind: 'trading_post'` — a NATIVE fishery post: `stock: ['dried_salmon', ...]`
(+ native_trade goods), generous dried-salmon stockScale, **barter-preferred**
(period: a knife for an 8-lb salmon — cash-poor bands wanted goods), and
**attitude-gated** via the #121 relations system: hostile regional attitude
closes the post (no trade screen), wary reduces stock/raises prices, friendly
full. Keeps its waterSource top-off. `the_dalles` (already a post) and
`whitman_mission` add dried_salmon to stock. Flavor text marks these as native
fisheries, not company forts. NPC parity is FREE here: `applyNpcPostRestock`
already fires at trading posts, so NPC wagons restock at the fishery too.

**Roadside band encounter:** on the Snake/Columbia corridor legs (Fort Hall →
The Dalles, the same leg set as the #1281 audit), a daily chance (~8–12%,
tuned at the gate; spikes ×2–3 within a leg of a fishery landmark) that a
band hails the wagon offering dried salmon. Opens the existing barter/trade
modal with a small offer (10–30 lb dried salmon, scaled by attitude); cash
accepted at a worse rate than goods. Hostile attitude → encounter doesn't
fire (historically: they simply didn't come in). Uses the existing encounter
plumbing (#127) + quoteBarter/settleTrade; rng-isolated per the daily-steps
sub-rng rule if it rolls inside the tick.

**Bots/game-ai:** persona surface `shouldBuySalmon(state)`-equivalent folded
into the existing post-shopping basket (dried_salmon joins pickFoodRestock
candidates) + an encounter-accept rule: accept when food-on-hand < ~10 days,
barter from a surplus-goods priority list (persona-flavored: hoarder pays
cash before parting with goods, generous trades freely). Both mandatory axes:
NPC parity via post restock (above); game-ai surfaces named here.

## 3. Ox slaughter — action + starvation event

**Camp action `slaughter_ox`:**
- Availability: ≥1 live ox AND live-team-after-slaughter ≥ the wagon's #107
  yoke minimum (cannot strand yourself), shovel/knife not required (period:
  every wagon had butchering tools).
- Effect: kills the WEAKEST live ox (lowest health, then highest fatigue) →
  ~325 lb `game_meat` on the standard spoil clock + a log line with the ox's
  name. Cure via the existing salt + `cure_meat` action — the §1 salt supply
  is sized so one full ox can be put up as jerky.
- Cost is implicit and real: team redundancy and pace (fewer oxen = slower,
  no spare when one dies later).

**Starvation event prompt:** when total food hits 0 and a slaughterable ox
exists (above the yoke minimum), fire a one-shot-per-spell event modal
("The flour sack is empty. Old Bright looks back at you.") with choices:
slaughter now / hold out. Mirrors the #1279 spell pattern (re-arms when food
recovers then empties again). No new mechanic — it surfaces the §3 action so
no player starves not knowing the lever exists.

**NPC parity:** in `tickNpcWagon`, auto-slaughter fires BEFORE
`maybeCannibalize` — same trigger family (food 0), same yoke-minimum guard.
Ends the current ordering where NPC families eat their dead beside healthy
oxen. Synth bridge: oxen + inventory already round-trip; no new fields.

**Bot surface:** persona `shouldSlaughterOx(state)` — default true at
food-on-hand < ~5 days with a spare ox above minimum; aggressive/pace_pusher
hold out longer (team = speed), cautious earlier.

## 4. Gates

- BEFORE = current master (water #260 + levers #259 in), bot-stats-250 +
  leg-pacing, 250×10, same seeds. AFTER targets:
  - train-persona arrivals recover toward levers-alone levels (balanced ≥
    ~40%; sunday_rester/generous/faithful/drinker/hoarder all materially up
    from the 14–22% post-water floor);
  - starvation death share collapses; dehydration stays fixed (≤ ~400);
    nothing new craters; chaos still wipes.
- Full `npm run verify`; wagon-load assertion (§1); spine/order rules for any
  tick-adjacent wiring (the encounter must not shift the shared rng stream —
  sub-rng).
- Watch-for: slaughter making oxen a free food battery (bots slaughtering
  down to minimum routinely) — if the gate shows it, raise the bot trigger
  threshold, not the meat yield.

## 5. Out of scope

- Purchasable beef cattle (walking larder) — #1321.
- Relief parties (Palmer 1845 Barlow rescue) — #1322.
- Winter wall — #1304. Fort price/stock changes — none (research: already
  period-calibrated). Hunting yield changes — none (must stay front-loaded).
- UI beyond reusing existing trade/encounter/camp-action surfaces; fishery
  art = GAP follow-up in Icons/Backgrounds.
