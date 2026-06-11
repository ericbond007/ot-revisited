# Food Economy (#1284) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `docs/superpowers/specs/2026-06-10-food-economy-design.md` — guide-shaped starter kit, salmon trade (fishery post + roadside encounter), ox slaughter (action + starvation prompt + NPC parity).

**Architecture:** Content-heavy (starter-kit, items, prices, landmarks) + one camp action + one event + one encounter + NPC/persona wiring. No engine-spine changes; any tick-adjacent rng must be sub-rng-isolated.

**Workspace:** `/home/eric/projects/hoosierTrail-1284-food`, bookmark `feat/1284-food-economy`, base master `dbee096e` (water #260 + levers #259 in).

**BEFORE baseline:** `/tmp/bot-stats-combined.md` (250×10 on exactly this master content). Gate targets in spec §4.

---

### Task 1: Starter kit rebalance

**Files:** `src/lib/game/content/starter-kit.ts`; tests (find kit-pinning tests via `grep -rl "BASE_KIT\|starter" tests/`); new load assertion in `tests/food-economy-1284.test.ts`.

- [ ] Failing tests first in `tests/food-economy-1284.test.ts`: (a) kit staple totals match the spec §1 table exactly (item-by-item asserts + 1,442 total); (b) cash === 500; (c) wagon-load assertion: a fresh `createInitialState` family wagon's total inventory weight ≤ 75% of the medium wagon's 2,500 lb capacity AND no overload/impairment state at day 1 (find how load% is computed — wagon.ts / item weights).
- [ ] Apply spec §1 table to `BASE_KIT.inventory` (update the Palmer comment block: now ~87% guide-shaped, cite the research appendix + the inverted-fat-ratio finding); `cash: 400 → 500`; recompute `STARTER_KIT_REFUND` per its existing formula/comment against the new kit value.
- [ ] Full verify. Outfit/kit/refund-pinning tests re-baseline with one-line justifications; bot/persona tests may shift broadly (richer start) — justify or STOP if inexplicable.

### Task 2: `dried_salmon` + fishery posts

**Files:** `src/lib/game/content/items.ts`, `prices.ts`, `landmarks.ts`; check `src/lib/game/systems/indian-relations.ts` (or wherever #121 attitudes live) for the post-gating hook; tests in `tests/food-economy-1284.test.ts`.

- [ ] Failing tests: dried_salmon exists (food category, protein nutrition group, NO spoil clock — check how spoilage exempts items), priced ~bacon-tier; `salmon_falls.kind === 'trading_post'` with dried_salmon in stock + waterSource retained; the_dalles + whitman_mission stock includes dried_salmon; attitude gate: hostile regional attitude → post trade unavailable (find the existing #121 trade-gating predicate and reuse — write the test against whatever surface exists).
- [ ] Implement. salmon_falls entry gains kind/stock/stockScale/barterPreferred (check the field name used by barter — grep barterPreferred) + native-fishery blurb; mileage/order untouched; landmark icon registry: salmon_falls already has art — verify kind change doesn't break its art binding; trail-total-miles invariant test must stay green.
- [ ] Check `applyNpcPostRestock` picks up salmon_falls automatically (it gates on kind === 'trading_post'); add dried_salmon to the bot `pickFoodRestock` candidate list (src/lib/game/ai/shopping.ts).
- [ ] Full verify + 3-run bot smoke (no explosion at the converted landmark).

### Task 3: Roadside salmon-band encounter

**Files:** `src/lib/game/content/encounters.ts` (study the existing salmon encounter at ~line 935 + the #127 encounter plumbing first), persona accept-rule in `src/lib/game/ai/` (follow how existing encounter choices route through personas); tests.

- [ ] Failing tests: on a Fort Hall→The Dalles corridor leg with friendly/neutral attitude, the encounter can fire (deterministic seed) and accepting transfers dried_salmon for goods/cash via quoteBarter/settleTrade; hostile attitude → never fires (loop a bounded seed set); chance spikes near fishery landmarks (statistical: fire-rate over N seeds higher within 1 leg of salmon_falls than mid-corridor — keep N small + bounded).
- [ ] Implement per spec §2: daily ~8–12% on corridor legs ×2–3 near fisheries, offer 10–30 lb scaled by attitude, cash at a worse rate than goods, hostile = silent. Use the existing encounter infrastructure; if the roll happens inside tick flow, derive a sub-rng (`makeRng(\`salmon:\${seed}:\${day}\`)`) — never the shared stream.
- [ ] Bot accept rule: accept when food-on-hand < ~10 days; barter priority list persona-flavored (hoarder cash-first, generous goods-first) — smallest reasonable implementation, document choices.
- [ ] Full verify; persona/encounter tests re-baseline with justification.

### Task 4: Ox slaughter — action, event, NPC parity, bot surface

**Files:** `src/lib/game/actions/camp-actions.ts` (slaughter_ox — follow an existing action's shape), `src/lib/game/content/events.ts` or the events bank (starvation prompt — follow the #1279 spell pattern for re-arming), `src/lib/game/systems/npc-engine.ts` (auto-slaughter before maybeCannibalize), `src/lib/game/ai/personas.ts` (shouldSlaughterOx), tests.

- [ ] Failing tests: action kills the weakest live ox (lowest health, tie → highest fatigue) → +325 game_meat with spoil clock set; unavailable at/below the #107 yoke minimum (find the minTeam source); event fires once per food-0 spell when a slaughterable ox exists, re-arms after refood (mirror #1279 crisisAskedDay pattern — use a day-stamp flag); NPC wagon at food 0 with spare ox slaughters BEFORE cannibalizing (assert corpse untouched + meat added); NPC at yoke minimum does NOT slaughter.
- [ ] Implement. Bot surface: default trigger food < ~5 days + spare above minimum; aggressive/pace_pusher hold to ~3 days, cautious ~7 — wire into the rest/camp-bundle path the way existing food actions elect.
- [ ] Full verify.

### Task 5: Gates + ship (controller)

- [ ] Full verify; AFTER runs: `bot-stats-250` + `leg-pacing-1280` (250×10) vs `/tmp/bot-stats-combined.md`. Spec §4 targets: balanced ≥ ~40%, train personas materially up from the 14–22% floor, starvation share collapses, dehydration ≤ ~400, no new craters; watch-for: routine bot slaughter-to-minimum (dial = bot threshold).
- [ ] PR (design summary, both gate tables, re-baseline list, research citation), Opus whole-branch review, CI, merge, VK #1284 close (+#1280 note: re-measure late-trail rest spiral), GAP art follow-up for the fishery-post variant if needed, workspace cleanup.

## Self-review
- Spec §1→T1, §2→T2+T3, §3→T4, §4→T5, §5 fenced. Types/names consistent (dried_salmon, slaughter_ox, shouldSlaughterOx). T2 before T3 (item dependency); T4 independent; T1 first (cheapest, broad re-baselines land early).
