# UI bot runner via Playwright (VK #1176)

**Status:** design complete, implementation **paused** until outfitter (#1172) and trade-screen reworks land.

**Goal:** a Playwright-driven bot runner that drives the actual SvelteKit UI — wizard → outfitter → travel → camp → landmark modals → arrival — clicking through real DOM. Complements the existing engine-direct bot (`src/lib/dev/bot/runner.ts`), it does not replace it. Catches DOM/modal/route/form-validation/render bugs the engine bot can't see.

**Pairs with:** [[#302]] `game/ai/` namespace (consumes the same persona decisions); [[#1174]] Storybook (component-level coverage, separate concern).

**Out of scope:** persona refactor itself ([[#302]] tracks that); CI integration; parallel workers; mobile viewport; pixel-diff snapshots.

## Goals — three modes from one tool

| Mode  | Use case                                  | Defaults                                          |
|-------|-------------------------------------------|---------------------------------------------------|
| smoke | Fast UI regression gate; runs each persona once; non-zero exit on wipe or hard-stop. | `--runs 1`, headless, full cross-checks |
| sweep | Statistical UI coverage compatible with the existing engine-bot sweep harness | `--runs 25 --personas all`, headless |
| debug | Single headed run for human-in-loop debugging; pauses on cross-check mismatch | `--runs 1 --headed --slow-mo 500 --persona <id>` |

Same binary, same run loop. Mode = flag bundle.

## Architecture

### Process layout

`scripts/ui-bot.ts` (tsx) — mirrors `scripts/bot.ts`. Owns CLI, argv, run loop. Drives Playwright's chromium directly via the `playwright` library (not `@playwright/test`). The bot's "is it passing" model fits a long stochastic simulation better than a test runner's flaky-test paradigm.

Bot **expects an already-running dev server** (`npm run dev` on `http://localhost:5173`). It does not manage server lifecycle. Errors out clearly if the base URL isn't reachable.

### State source — hybrid (DB decisions + DOM cross-checks)

On every tick:

1. **Decision:** bot reads the current slot row from `dev.db` via `better-sqlite3` (same machine, same DB file). Deserializes to `GameState`. Feeds through the existing `game/ai/` modules (`pickRestCampChain`, `pickHuntTarget`, `bundleCampActions`, `composeShoppingList`, `pickFordMethod`, etc.) to derive an intent. Zero duplication of bot logic — same code the engine bot uses.

2. **Translate:** intent → page-object method call (see page-object layer below).

3. **Click:** Playwright executes the click(s).

4. **Settle:** await a deterministic settling signal — most often `await page.waitForLoadState('networkidle')` followed by a slot-row-updated check (poll the DB until `updated_at` advances).

5. **Cross-check:** scrape a fixed set of UI fields, compare to the now-updated DB row. Mismatch → `console.error` + screenshot + append to `mismatches.log` → keep running.

The point of the cross-check is to surface a *list* of UI/DB disconnects in one run, not to abort on the first.

### Page-object layer (`scripts/ui-bot/pages/`)

Each page object owns the selectors and the intent-shaped methods for one screen. They also expose typed `scrape*()` methods for cross-check.

```
pages/
  WizardPage.ts       — depart form, premade-profile loader
  OutfitPage.ts       — buyQty steppers, wagon picker, depart  ⚠ pending #1172 rewrite
  PlayPage.ts         — Travel button, action bar, side panels (party/inventory/wagon)
  LandmarkModal.ts    — visit / trade / continue dispatcher
  EventModal.ts       — pending event resolver
  HuntModal.ts        — target + ammo + commit
  FordModal.ts        — depth/current readout + method picker
  TradeModal.ts       — trade interaction          ⚠ pending trade-screen rewrite
  CampScene.ts        — camp action chain commit
  EndScreen.ts        — arrival / wipe summary
```

`PageObject` interface:
- intent methods accept typed intent payloads (no string-stuffing): `outfit.buyItems(orders: BuyOrder[])`, `play.travel(days: number)`, `landmark.pickFordMethod(m: FordMethod)`
- `scrape*()` methods return typed slices: `play.scrapeStatusBar(): { day: number; miles: number; foodLb: number }`
- `assertReady()` waits for the page's defining element + asserts no error state

### Cross-check field set (v1)

Locked in `scripts/ui-bot/cross-check-spec.ts`. Adding a field is a one-line manifest edit.

| Field path                                | DOM source                                   |
|-------------------------------------------|----------------------------------------------|
| `state.day`                               | status bar day cell                          |
| `state.location.milesTraveled`            | status bar miles cell                        |
| `state.party[].hp`                        | party panel per-member hp                    |
| `state.party[].condition`                 | party panel per-member condition badge       |
| `state.morale`                            | party panel morale bar (aria-valuenow)       |
| `state.cash`                              | inventory panel cash                         |
| sum of food items by weight               | inventory panel food summary                 |
| `state.water.gallons`                     | inventory panel water summary                |
| ammo items (gunpowder, lead_balls, etc.)  | inventory panel ammo summary                 |
| `state.activeModal`                       | role=dialog present + matching `data-testid` |
| `state.pendingAction` button visibility   | action bar button enabled/disabled state     |

### Run loop

```
1. boot context (fresh storage state = fresh device cookie)
2. drive wizard + outfitter to depart  (or POST /dev/scenario/<id> to jump in)
3. while !endState && tick < 220:
     state = readSlot(db)
     intent = deriveIntent(state, persona, rng)
     await executeIntent(intent)
     await settle()
     await crossCheck()
     logTick(report)
4. classify outcome (arrived / wiped / stuck)
5. emit report
6. close context
```

### Determinism

- Bot's persona RNG seeded via `makeBotRng(seed)` (existing `game/ai` export).
- Engine seed is set at slot creation (via wizard form or `/dev/scenario`). Bot does not override it.
- Click sequence for `(persona, profession, seed)` is reproducible. Cross-check screenshots differ only when the UI changes.

## CLI surface

```fish
# Smoke — fast regression gate
npm run ui-bot smoke
  # 6 personas × 1 run, headless, full cross-checks, save mismatches only.
  # Exits non-zero if any run wipes or any hard-stop fires.

# Sweep — statistical coverage
npm run ui-bot sweep --runs 25 --personas all
  # Output schema-compatible with scripts/persona-profession-sweep.ts.

# Debug — single, headed
npm run ui-bot debug --persona pioneer --slow-mo 500 --headed
  # Pauses on cross-check mismatch (page.pause()).
```

Common flags: `--max-days 220`, `--timeout 60000`, `--db ./dev.db`, `--base-url http://localhost:5173`, `--persona <id>`, `--profession <id>`, `--seed <n>`, `--trace on|off`, `--video on|off`.

## Output artifacts — `.ui-bot/runs/<run-id>/`

```
report.json              # final BotRunReport (engine-bot shape + UI extensions)
ticks.ndjson             # 1 line / tick: { tick, day, intent, click, scrape, dbSnapshot }
mismatches.log           # NDJSON: { tick, field, ui, db, screenshotPath }
mismatches/<tick>.png    # per-mismatch screenshot
trace.zip                # Playwright trace (only when --trace on or any mismatch)
videos/run.webm          # only when --video on (off by default; large)
```

Sweep rollup: `.ui-bot/runs/<sweep-id>/summary.json` — matches the engine bot's sweep schema so `persona-profession-sweep.ts` ingests it.

`.gitignore` adds `.ui-bot/`.

## File layout (new)

```
scripts/ui-bot.ts                 # CLI entry
scripts/ui-bot/
  run-loop.ts                     # main bot loop
  db-reader.ts                    # slot row → GameState (better-sqlite3)
  cross-check.ts                  # DB ↔ DOM compare + report writer
  cross-check-spec.ts             # field manifest (see table above)
  intent-to-clicks.ts             # (GameState, intent) → page action
  artifacts.ts                    # report/log/screenshot writers
  pages/
    WizardPage.ts
    OutfitPage.ts                 # ⚠ blocked on #1172 rewrite
    PlayPage.ts
    LandmarkModal.ts
    EventModal.ts
    HuntModal.ts
    FordModal.ts
    TradeModal.ts                 # ⚠ blocked on trade-screen rewrite
    CampScene.ts
    EndScreen.ts
```

Edits to existing files:
- `package.json`: `"ui-bot": "tsx scripts/ui-bot.ts"`; add `playwright` as devDependency.
- `.gitignore`: add `.ui-bot/`.
- `src/routes/play/+page.svelte` and friends: add minimal `data-testid` attributes where current selectors are ambiguous. Small additive edit, no visual impact.

## Tests for the bot itself

Vitest unit tests, no browser:
- `cross-check.test.ts` — given a `GameState` and a `ScrapedFields` blob, returns the expected mismatch list.
- `intent-to-clicks.test.ts` — pure mapping; given `(GameState, intent)`, returns the page-object method name and args.
- `db-reader.test.ts` — round-trips a known fixture row.

Bot end-to-end behavior is its own integration test — running it *is* the test. No CI integration in v1.

`npm run verify` impact: none. `verify` continues to be `check + test`.

## Sequencing — why this is paused

Two upcoming reworks would invalidate `OutfitPage.ts` and `TradeModal.ts` selectors before they ship:

1. **#1172 — outfitter screen rework** (Claude Design handoff incoming). The current 1357-line `+page.svelte` is being redesigned end-to-end; building a page object against today's DOM would land stale on day one.
2. **Trade-screen rework** (in flight, ticket TBD if not already filed).

Implementation plan deferred until both reworks land. When they do, this spec is the entry point — re-invoke `superpowers:writing-plans` against this doc.

## Open questions (defer to implementation plan)

- **Run isolation:** v1 plan = serial runs sharing `dev.db` with per-run slot names (`ui-bot-<runId>`) and per-run browser contexts (fresh device cookies). Sweep parallelism (`--workers N`) is a v2 add.
- **Settle signal robustness:** `networkidle` may fire prematurely for SvelteKit's prefetch + idle revalidation. Fallback is polling `saves.updated_at` for the slot row, with a 30s timeout per click. Validate during implementation.
- **First scenarios under sweep:** which personas + seeds form the "smoke" set? Likely 6 representative personas × seed=42 — finalize when planning.
