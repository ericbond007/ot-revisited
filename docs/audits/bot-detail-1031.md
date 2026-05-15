# Bot audit — post-#1031 (2026-05-14)

## Coverage

Sweep (`scripts/persona-profession-sweep.ts`) already runs:

- **10 personas**: 4 base (`cautious`, `balanced`, `aggressive`, `chaos`) + 6 named (`sunday_rester`, `pace_pusher`, `hoarder`, `generous`, `faithful`, `drinker`).
- **15 professions**: `banker`, `farmer`, `carpenter`, `doctor`, `blacksmith`, `hunter`, `teamster`, `merchant`, `whore`, `scout`, `preacher`, `indian_trader`, `gunsmith`, `teacher`, `lawyer`.
- **150 cells × 40 runs/cell = 6,000 runs** per sweep at the standard `--runs 40` setting.

Named personas are first-class — they appear in the per-cell matrix and in the per-persona summary table.

## Per-persona arrival (post-#1031, 40 runs/cell)

| Persona | Arrived | Wiped | Stalled | Avg days | Avg miles |
|---|---|---|---|---|---|
| sunday_rester | 38% | 7% | 55% | 210 | 2036 |
| balanced | 35% | 9% | 56% | 210 | 2019 |
| faithful | 36% | 11% | 53% | 208 | 2003 |
| drinker | 36% | 9% | 55% | 210 | 2022 |
| generous | 34% | 9% | 57% | 210 | 2009 |
| hoarder | 26% | 12% | 63% | 211 | 1972 |
| cautious | 20% | 12% | 68% | 212 | 1964 |
| pace_pusher | 14% | 10% | 76% | 215 | 1780 |
| aggressive | 10% | 10% | 81% | 215 | 1786 |
| chaos | 0% | 48% | 52% | 194 | 1229 |

## Day-by-day action breakdown (10 representative cells)

Each cell ran one seeded run to terminal outcome. Day counts add up to total days; "moving" = travel + eventDay.

| Cell | Days | Outcome | Mi | Travel | Event | Rest | FindWater | Hunt | Ford | Post | Mi/move |
|---|---|---|---|---|---|---|---|---|---|---|---|
| drinker × hunter | 195 | arrived | 2208 | 107 | 37 | 24 | 5 | 0 | 8 | 14 | **15.33** |
| sunday_rester × teamster | 205 | arrived | 2195 | 108 | 39 | 27 | 8 | 1 | 8 | 14 | **14.93** |
| hoarder × scout | 205 | arrived | 2203 | 114 | 33 | 23 | 8 | 5 | 8 | 14 | **14.99** |
| cautious × doctor | 220 | stalled | 2082 | 104 | 29 | 39 | **23** | 3 | 8 | 14 | 15.65 |
| balanced × farmer | 220 | stalled | 2173 | 123 | 38 | 29 | 6 | 2 | 8 | 14 | 13.50 |
| faithful × preacher | 220 | stalled | 2119 | 115 | 40 | 28 | 12 | 3 | 8 | 14 | 13.67 |
| generous × merchant | 220 | stalled | 2066 | 122 | 27 | 31 | 11 | 7 | 8 | 14 | 13.87 |
| pace_pusher × carpenter | 220 | stalled | 1882 | 129 | 41 | 20 | 11 | 0 | 8 | 11 | 11.07 |
| aggressive × lawyer | 220 | stalled | 1607 | 113 | 38 | 25 | **26** | 0 | 8 | 10 | 10.64 |
| chaos × banker | 220 | stalled | 1565 | 90 | 25 | 23 | **48** | 12 | 17 | 10 | 13.61 |

## Findings

### 1. Stalled bots are stalling AT THE END

The stalling personas aren't getting stuck somewhere on the Plains — they're hitting the Cascades (Barlow Road, Laurel Hill, mile ~2050-2150) with the calendar running out. Oregon City is at mile 2195. The Mt Hood crossing is a 100-mile slog through mountain terrain (slow-going multiplier) that eats the last 30-40 days for the 11-13 mi/move personas.

Stalled-at-the-end positions in the audit:
- balanced × farmer: mile 2173 (Oregon City zone, 22 mi short)
- faithful × preacher: mile 2119 (Laurel Hill)
- cautious × doctor: mile 2082 (Barlow Road)
- generous × merchant: mile 2066 (Barlow Road)

These bots traveled the *entire trail* — they just couldn't squeeze the last 100 miles into the day cap.

### 2. FindWater is a real calendar tax

Aggressive personas spend **26** days finding water. Chaos spends **48**. Cautious spends **23**.

Compare to balanced (6 days), drinker (5), sunday_rester (8) — the personas that actually arrive. The arriving bots aren't burning calendar on water rescues; the stalled bots are.

Reads:
- Aggressive's `water_bag` stocking + dehydration tolerance still leaves them short — possibly because aggressive doesn't rest much, so the rest-day water-chain piggyback doesn't help them.
- Chaos's random behaviour drives way more water failures.
- Cautious's 23-day water-rest count is partly the D2 desert threshold bump (0.25 in desert) — more triggers in dry country.

Possible D-something here: aggressive (low rest cadence) needs water management on travel days, not via rest-with-water-chain. A separate slim "drink the bag" action that doesn't burn a full day?

### 3. Pace_pusher trades pace for moving days

Pace_pusher: 170 moving days but only **11.07 mi/move**. Lowest mi/move of any persona.

The plan-ahead change (#1031) bought slightly higher arrival (14% vs 13%) by accepting more moderate-pace days. The persona is moving every day it can; it just isn't covering ground fast. The bottleneck isn't moving-day count, it's per-day yield in mountains/desert.

### 4. Chaos is doing its job — fuzz coverage, 0% arrival

Chaos's 48 findWater days, 17 fords, 12 hunts is exactly the "exercise weird paths" pattern. The 48% wipe rate is on-purpose. Don't optimize for chaos arrival.

### 5. Profession does matter — but not as much as persona

Within a persona, profession swings ±10-20% arrival (e.g., balanced × doctor 80% vs balanced × banker 15%). But persona dominates: chaos × *anything* is 0%, sunday_rester × *anything healthy* is 30-100%.

Profession bonuses that lift arrival rate:
- **doctor** — condition damage softening; raises every persona by 10-20pp
- **teamster** — earlier ox-fatigue rest trigger; pace_pusher / aggressive
- **hunter** — food security; mid-tier lift
- **scout** — water/forage finds; mid-tier lift

Professions that suppress arrival:
- **whore**, **lawyer**, **banker**, **teacher** — no engine-loadbearing trait; bot eats the average

## Proposed canonical test suite

Ten "headline" cells we run as the gold-standard regression suite — each anchored to a real period archetype. The full 150-cell sweep stays in place for comprehensive coverage; this is the curated short list for narrative dashboards, NPC archetype seeding, and quick-iteration sweeps.

| # | Persona | Profession | Archetype / Period Anchor |
|---|---|---|---|
| 1 | cautious | farmer | **Tabitha Brown 1846** — Methodist widow, Oregon farmer family |
| 2 | balanced | farmer | **The typical 1850s family** — most common Oregon-bound demographic |
| 3 | aggressive | lawyer | **James Reed 1846** — rich/ambitious, Hastings Cutoff push |
| 4 | chaos | banker | **The unprepared '49er** — gold-rush opportunist trying Oregon |
| 5 | sunday_rester | preacher | **Whitman missionaries 1836** — strict Sabbath, Sager protection |
| 6 | pace_pusher | carpenter | **Hastings 1845** — promoted his shortcut on speed grounds |
| 7 | hoarder | merchant | **Outfit-heavy emigrant** — left Independence overloaded |
| 8 | generous | doctor | **Marcus Whitman** — gave away medicine on the trail |
| 9 | faithful | preacher | **Methodist circuit rider 1850s** — Sabbath + scripture-driven choices |
| 10 | drinker | hunter | **Mountain-man turned emigrant** — Bridger/Walker archetype |

**Coverage:** all 4 base + all 6 named personas. 9 distinct professions (preacher used twice — the religious archetypes). Spans the period demographic.

If we want to slim further for an in-game "rival wagon" pool: items 1, 2, 5, 9, 10 are the demographic mainstream; 3, 6, 7 are the speed/wealth outliers; 4, 8 are the unusual ones.
