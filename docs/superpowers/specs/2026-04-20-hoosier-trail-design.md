# Hoosier Trail — Design Spec

**Date:** 2026-04-20
**Status:** v1 design, approved for implementation planning
**Stack:** SvelteKit + SQLite + Drizzle, self-hostable

---

## 1. Overview

Hoosier Trail is a browser-based, single-player replica of the original Oregon Trail. A party of 2–6 travelers leaves Independence, Missouri between March and June of a chosen year (1841–1869) and attempts to reach Oregon City before winter. The game is turn-based day-tick logic under the hood, with animated wagon travel and choice-driven events on top. Styling is old-western "dusty 32-bit" pixel art.

### 1.1 Goals
- A polished single-player experience across desktop browsers and Z Fold 4 Firefox (unfolded).
- Historical grounding for all content (trail landmarks, events, professions, items, prices) sourced from Wikipedia and primary journals.
- Every piece of inventory or profession gear has a real mechanical effect — no decorative items.
- Choice-driven mechanics throughout; no action / skill / timing mini-games.
- Save game state across sessions; explicit save slots plus autosave.

### 1.2 Non-goals (v1)
- Multiplayer, simultaneous co-op, or PvP — never in scope.
- User accounts or cross-device save (deferred to v2).
- California Trail split, multiple starting cities, or minor road-ranch stops (v2 content expansion).
- Action-based mini-games for any activity.
- Mobile layouts other than Z Fold 4 unfolded (~884 CSS px). Standard narrow phone layouts are not a target.

### 1.3 v1 scope summary
- Single trail: Independence → Oregon City, fixed route.
- Party of 2–6 adults, chosen before departure from 13 profession archetypes.
- ~31 named trail stops (9 trading posts + 15 landmarks + 7 river crossings).
- ~60–80 unique random events, each with 2–4 choices.
- Save system: local, device-cookie-keyed, 5 named slots + autosave.
- Animated wagon travel on a parchment-style regional map.

---

## 2. Tech Stack & Architecture

### 2.1 Stack
- **Framework:** SvelteKit (single framework for routing, SSR, API routes, and UI).
- **Language:** TypeScript.
- **Database:** SQLite, single file on disk.
- **ORM:** Drizzle (type-safe, lightweight, SQLite-native).
- **Styling:** Svelte-scoped CSS + a small global theme (dusty western palette variables).
- **Icons / graphics:** Pixel-art PNG sprites (initially AI-generated or free-licensed Kenney assets; replaced with custom art over time). Emoji allowed as provisional placeholders only, flagged for replacement.
- **Audio (stretch):** optional western soundtrack and UI sounds, free-licensed.

### 2.2 Deployment
- **Phase 1:** User self-hosts a single Node.js process on their own machine (`node build`). SQLite file lives next to the binary.
- **Phase 2:** Optional deploy to a free host (Fly.io free tier, Cloudflare Pages + Workers, or similar). Stack is portable — no cloud-specific APIs.

### 2.3 Project structure
```
/
├─ src/
│  ├─ routes/              # SvelteKit pages & API endpoints
│  │  ├─ +page.svelte              # landing / new game / load
│  │  ├─ new/+page.svelte          # party setup wizard
│  │  ├─ play/+page.svelte         # main game screen
│  │  ├─ api/saves/+server.ts      # save/load endpoints
│  │  └─ api/game/+server.ts       # game-action endpoints (turn tick, events)
│  ├─ lib/
│  │  ├─ game/                     # pure game logic (engine)
│  │  │  ├─ engine.ts              # turn advancement, event firing
│  │  │  ├─ systems/               # per-system modules (morale, health, travel, etc.)
│  │  │  ├─ content/               # static data: professions, items, landmarks, events
│  │  │  └─ rng.ts                 # seeded RNG for deterministic replays
│  │  ├─ db/                       # Drizzle schema + client
│  │  ├─ components/               # reusable UI (map, party panel, event modal)
│  │  └─ assets/                   # sprites, icons, fonts
│  └─ app.html
├─ static/                 # public assets
├─ drizzle/                # migrations
├─ scripts/                # seed scripts, data importers
└─ package.json
```

### 2.4 Design principle: game logic is pure
All game rules live in `src/lib/game/` as pure functions. The database is a persistence layer only. This makes the engine testable without a DB and lets us replay saves deterministically with a seeded RNG. System modules (`systems/travel.ts`, `systems/health.ts`, etc.) each expose a clear interface; the engine composes them.

---

## 3. Data Model

### 3.1 Persistence tables (SQLite via Drizzle)

```ts
// devices — identifies a browser until phase-2 account migration
devices {
  id: uuid (primary)
  created_at: timestamp
}

// saves — one row per save slot per device
saves {
  id: uuid (primary)
  device_id: uuid (fk devices.id)
  slot_name: text              // "Autosave" or user-named, unique per device
  created_at: timestamp
  updated_at: timestamp
  game_state: jsonb            // full game state serialized
  summary: text                // "Day 42 · June 14, 1848 · Near Ft. Laramie"
}

// indexes
create unique index ux_saves_device_slot on saves(device_id, slot_name);
```

Phase 2 adds `users` and `accounts` tables, plus a `user_id` column on `saves` populated during migration. Device-keyed saves continue to work during the transition.

### 3.2 Game state (serialized as `game_state` JSON)

```ts
GameState {
  seed: string                   // RNG seed — deterministic replay
  day: number                    // days since departure
  date: { year: number; month: number; day: number }
  location: {
    trailPosition: number        // 0.0–1.0 along trail
    nextLandmarkId: string
    previousLandmarkId: string | null
    milesTraveled: number
    terrain: TerrainType         // prairie | forest | desert | mountains | river
  }
  party: PartyMember[]           // 1–6 alive + dead members
  wagon: {
    condition: number            // 0–100
    carryCapacity: number
  }
  oxen: Ox[]                     // each has health, shod status
  inventory: Record<ItemId, number>   // item id → count
  cash: number
  resources: {
    water: number                // gallons
    waterCap: number             // from skins + wagon
  }
  morale: number                 // 0–100 party-wide
  pace: 'slow' | 'moderate' | 'fast' | 'grueling'
  rations: 'meager' | 'normal' | 'filling'
  eventLog: LogEntry[]           // most recent 100 shown in UI
  flags: Record<string, boolean> // "boilingUnlocked", "metPreacherAt1849", etc.
  completed: boolean
  outcome: 'in-progress' | 'arrived' | 'wiped' | 'stranded'
}

PartyMember {
  id: string
  name: string
  profession: ProfessionId
  isLeader: boolean
  age: number                    // v1: all adults 18–65
  health: number                 // 0–100
  conditions: Condition[]        // cholera, dysentery, broken leg, exhaustion, etc.
  dead: boolean
  deathCause?: string
  deathDay?: number
}
```

### 3.3 Static content (code-bundled, not in DB)
- Professions (13) — `src/lib/game/content/professions.ts`
- Items — `src/lib/game/content/items.ts`
- Landmarks & trading posts — `src/lib/game/content/landmarks.ts`
- Random events — `src/lib/game/content/events.ts`
- Diseases & conditions — `src/lib/game/content/conditions.ts`

All content is plain TypeScript data so it's versioned with the code.

---

## 4. Game Loop

### 4.1 Turn model
- Logic is strictly **turn-based in days.** Time advances in discrete day ticks.
- The UI presents travel as a smooth animation: wagon sprite moves along the map's dotted trail between events/stops. When an event fires, animation pauses and a modal appears.
- One "turn" = the player clicks an action (Travel / Rest / Hunt / Camp) and a number of days advance depending on the action and any events that interrupt.

### 4.2 Travel action sequence
1. Player clicks **Travel**.
2. Engine advances days one at a time until: (a) an event fires, (b) a landmark is reached, (c) the player clicks "Stop travel."
3. Each day:
   - Consume food: `alive_members × lb/person/day` (scales with party size and rations setting)
   - Consume water: `alive_members × gallons/person/day` (also scales with party size)
   - Apply fatigue to each ox (scaled by pace, terrain, load)
   - Apply health changes (condition progression, morale coupling)
   - Roll for random event (weighted by terrain, season, year, recent events, party state)
   - Update trail position (miles covered = base speed × pace multiplier × oxen-health factor × terrain factor)
4. When an event fires or landmark reached: pause, present modal, resolve via choice, resume (or stop).

### 4.3 Camp action
- Overnight setup (~8 hours of in-game time consumed; day passes).
- **Fire and firepit** (see §5.11): if shovel owned, a proper firepit is dug automatically (no extra action). Without a shovel, a flat fire is built with minor fire-spread risk. A fire provides warmth (frostbite prevention), enables cooking, and lets you boil water.
- **Triggers at every camp:** meal cooking (morale bump vs raw rations), Farmer auto-foraging (+10–30 lb food, season & terrain dependent), Preacher's camp service if Bible owned (small morale + chance of health bump), passive healing accelerated by morale, oxen fatigue recovery.
- Required to boil water (with cookware + fire) for purification (pre-1854 or always post-1854).

### 4.4 Rest action
- 1–7 days configurable. Party is stationary, full healing rate, oxen fatigue recovers, Farmer forages once per rest period, Whore earns income if at a post.

### 4.5 Pace settings
| Pace | Miles/day (base) | Effect |
|---|---|---|
| Slow | 12 | low fatigue, low food burn |
| Moderate | 18 | baseline |
| Fast | 24 | +fatigue, +morale drain, +ox shoe wear |
| Grueling | 30 | heavy fatigue, high morale drain, injury risk |

### 4.6 Rations settings
| Rations | lb/person/day | Effect |
|---|---|---|
| Meager | 1 | -health, -morale |
| Normal | 2 | baseline |
| Filling | 3 | +morale, +healing |

---

## 5. Core Systems

### 5.1 Morale (party-wide, 0–100)
- **Effects:** modifies passive healing rate (see table §5.2), modifies event outcome distributions (low morale → worse rolls).
- **Desertion is a last resort, historically rare.** Only at morale = 0 does any member consider turning back, and even then it's a 2%/day roll. A realistic Oregon Trail party didn't desert — the trail was behind them too. Expect most playthroughs to never see desertion. The mechanic exists as a floor on suffering, not a common consequence.
- **Drop triggers:** hunger, disease, deaths, long unbroken travel, extreme weather, low food rations, dangerous events.
- **Rise triggers:** reaching landmarks, successful hunts, good food, Preacher's camp service, Whore passive, music (Entertain camp action), foraged berry finds, buffalo liver feast.

### 5.2 Health (per-character, 0–100)
- Each party member has Health 0–100 and a list of active Conditions.
- **Death:** Health reaches 0 → dead. Party loses that profession's bonus, morale hit (reduced if Preacher + burial dug with shovel).
- **Passive healing rate** is modified by morale:

| Morale | Passive healing multiplier |
|---|---|
| 80–100 | ×1.25 |
| 60–79 | ×1.10 |
| 40–59 | ×1.00 |
| 20–39 | ×0.90 |
| 0–19 | ×0.75 |

- **Wellness feedback loop:** when all members are >70 health, morale recovers +1 bonus per day.

### 5.3 Conditions (diseases, injuries, states)

Severity tuned for playability: historically cholera could kill in hours-to-days, but in game we want more window for player response. All daily-damage values are gameplay tuned, not historically exact.

| Condition | Onset trigger | Effect | Treatment |
|---|---|---|---|
| Cholera | contaminated water, low sanitation | -10 health/day, contagious | Quinine + rest; quarantine slows spread |
| Dysentery | bad food, heat | -3 health/day | Calomel (effective, minor permanent health cap drop) or rest |
| Typhoid | contaminated food/water, year-variable | -5 health/day | Quinine + rest |
| Measles | outbreak events, mostly 1846+ | -3 health/day, contagious | Rest; Doctor halves duration |
| Exhaustion | grueling pace, low morale | -2 health/day, -1 morale/day, slow healing | Rest in camp |
| Broken leg | falls, random events | slows party unless loaded on wagon (see below) | Bandages + laudanum + rest |
| Snakebite | desert/prairie terrain event | -15 immediate damage + -5/day | Bandages + laudanum, fast treatment saves |
| Frostbite | cold weather without coats/blankets/fire | -3 health/day, limb-loss risk if prolonged | Warmth: fire + blankets/coats (see §5.11) |
| Scurvy | prolonged low-fruit diet | -1 health/day + morale drop | Dried fruit resolves |

**Broken leg — wagon loading option.** A member with a broken leg can be loaded onto the wagon instead of walking. Effect: they contribute +150 lb to wagon load (treated as cargo weight). Benefits: no party-wide slowdown from the immobile member. Drawbacks: heavier wagon = slightly slower speed + more wagon wear + their recovery is marginally faster (bedrest). Always preferable to leaving them immobile on foot.

### 5.4 Water resource
- Daily tickdown: `alive_members × 1 gallon/person/day` at normal rations (scales with party size).
- Sources: rivers, springs, trading posts; wells dug at dry camps (see §5.11).
- **Water skins** increase carry capacity — buffer for dry stretches (desert, heat waves).
- **Purification:**
  - Pre-1854: boiling unlocked only if a Doctor is in the party OR a "wise traveler" event grants the knowledge.
  - Post-1854: boiling always available to any party with cookware + fire.
  - Coffee or tea in supplies: water-borne disease risk drops 40% (accidental purification).

### 5.5 Hunting / Gathering
Choice-driven, no mini-game. The Hunt action covers both hunting and pure gathering — the mode is determined by how many rifles the party owns.

- **Step 1 — Party composition:**
  - **0 rifles** → "Hunt" becomes **Gather only.** 1–2 people forage for berries, herbs, and occasional windfall finds. Half-day activity. Yield depends on terrain/season. No bullets consumed.
  - **1 rifle, 1 person** → solo hunt (baseline yield, baseline carry cap).
  - **1 rifle, 2 people** → one hunts, one gathers. Hunting yield same as solo; gatherer returns with berries/herbs; combined carry cap ≈ 1.5× baseline (less meat spoils en route).
  - **2 rifles, 2 people** → parallel hunting, both roll for game. Combined carry cap ≈ 1.8× baseline. Best yield.
- **Step 2 — Target** (skip if gather-only): Small game (rabbits/birds, low ammo, low yield, high success), Medium game (deer/antelope, balanced), Big game (buffalo/bear, high ammo, high yield, small injury risk).
- **Step 3 — Ammo commit** (skip if gather-only): Light 5 / Moderate 10 / Heavy 20 bullets.
- **Outcome** depends on: Hunter profession (+20%), Gunsmith stacking bonus, terrain, season, ammo, bounded RNG.
- **Carry cap on meat:** oxen × distance × weather × (hunters + gatherers). Excess spoils before reaching camp.

### 5.6 River fording
- Crossings: Blue, North Platte (multiple), Sweetwater (multiple), Green, Bear, Snake (Three Island is iconic), Columbia.
- **Each crossing is a decision screen:** shown depth, current, width, weather, ferry availability, ferry price.
- **Options (availability contextual):**
  - **Ford** — fast, free. Risks drown oxen / lose supplies / lose people if too deep or swift.
  - **Caulk & float wagon** — slower, supplies usually safe. Risk: wagon flips or drifts.
  - **Hire ferry** — safe, costs $2–$8 (year-dependent, historical prices). Only at crossings with operators.
  - **Wait for water to drop** — each "wait" = 1 day, treated as a camp/rest day at the river (passive healing, ox fatigue recovery, Farmer forages, plus a chance to catch fish or gather berries/herbs from the riverbank). Only actually reduces water level if weather is clearing.
- **Scout passive:** finds shallower fords, warns of swift currents before you commit.
- Post-ford chill mechanic deferred to v2 (Task #16) — v1 fords have no wetness-based health penalty.

### 5.7 Wagon & livestock maintenance

**Wagon condition 0–100.** Drops from: events, travel stress (rough terrain + grueling pace accelerate), weather, river crossings. Low condition → more wagon-event frequency; below 20 → risk of catastrophic failure forcing abandonment.

**Repairs — tiered by severity:**
- **Full replacement** (wheel, axle, tongue, canvas, yoke): requires the specific spare part + iron toolkit. At camp (cheap time cost) or at a trading post (cash cost, no parts needed).
- **Incremental / patch repair:** small damage (cracked spoke, loose tire, frayed cover) resolved with a **spare plank** and rope + toolkit. Cheaper than a full replacement but only works on low-severity damage; skipping patch repairs accelerates decline to the full-replacement threshold.
- **Jury-rig** (no toolkit): 2× spare-part cost, half durability. Last resort.
- **Carpenter passive:** all repairs faster / cheaper / use fewer spare parts.

**Oxen — each ox has two stats:**
- **Health (0–100):** depletes from overwork, disease, injuries, and abuse. Recovers slowly with rest + good grass + water. At 0 → ox dies.
- **Fatigue (0–100):** rises from daily travel (scaled by pace, terrain, load). Recovers with rest and camp time. High fatigue → lower effective pulling power + accelerated health drop.

Dead oxen reduce pulling capacity. Need minimum 2 healthy oxen to move the wagon. (Mules deferred to v2 — see Task #14 — so oxen are the only draft animals in v1.)

**Ox shoes:** each ox wears shoes. Rocky terrain → "ox threw a shoe" event (common in mountains). Shoeless ox: -15% speed, higher fatigue; eventually lame (immobile). Re-shoe requires ox shoes + toolkit; Blacksmith = quality (2× duration); Teamster = normal speed/duration; anyone else = 2× time, half durability.

**Wagon load:** <1500 lb = baseline. Heavier loads reduce travel speed and accelerate wagon wear proportional to overload. (No morale penalty — the party just moves slower.)

### 5.8 Trading posts
- Buy and sell items at prices scaled by remoteness and year.
- **Year modifiers:** 1849 Gold Rush +15–25% on food/livestock, 1869 railroad era -10% (oversupply, declining traffic).
- **Profession modifiers on trade:** see §6.1 for definitions. Merchant and Banker both buff buy AND sell (professions sourcing capital negotiate both sides); Blacksmith gains a scrap-salvage mechanic instead of price discounts (see §6.1).
- **Native trade menu** (Indian Trader unlock at: Fort Laramie, Fort Hall, Green River, Fort Walla Walla): pemmican, moccasins, buffalo robes in exchange for tobacco/beads/calico.

### 5.9 Random events
- One event rolled every 1–3 travel days on average (density configurable per-terrain/season).
- Weights adjusted by: terrain, season, year, recent-event dampener (no back-to-back disasters), party state.
- **Categories:** Weather, Health outbreak, Wagon/livestock, Chance encounters, Native American, Bandits, Finds/windfalls, Historical/year-gated, Personal/moral.
- **Each event** has 2–4 choices, each resolving against party stats + bounded RNG → text outcome + state changes.
- Target catalog size v1: **60–80 unique events.**

### 5.10 Unconventional health boosts
- **Hot springs stop** (Soda Springs): +health + morale, ~1 day cost, unrepeatable.
- **Buffalo liver feast:** after big-game hunt. +20 health whole party, +morale. 8% sickness risk, 0% if Doctor present.
- **Foraged medicinal herbs:** Farmer/Preacher forage willow bark (fever), yarrow (wounds) during rest.
- **Native healer:** Indian Trader unlocks shaman healing at certain landmarks, effective on specific ailments.
- **Patent medicines** (trading post RNG): 50% heal / 35% nothing / 15% mild harm.
- **Landmark milestones:** Chimney Rock, Independence Rock, South Pass → morale + small health bump.
- **Preacher's camp service:** fires every time you camp (Bible owned + Preacher alive). Small chance of party morale + health boost.
- **Music around the campfire** (with harmonica or fiddle): "Entertain" camp action, morale boost accelerating passive healing.

### 5.11 Fire, warmth & shovel-enabled actions

**Fire** enables several systems:
- **Warmth:** a lit fire eliminates frostbite damage for the camp night (combined with blankets/coats, caps frostbite progression).
- **Cooking:** turns raw food into cooked food → small morale bump.
- **Boiling water:** purification (see §5.4), requires cookware + fire.

**Firewood is not an inventory item.** Fire almost always succeeds — the party keeps an implicit wood buffer carried from travel through wooded terrain. Rare failure only in severe combined conditions (storm + dry-terrain run + buffer depleted). When fire fails that night: no cooking, no warmth, no boiling, minor morale hit. Deeper firewood mechanic deferred to v2 (Task #15).

**Shovel-enabled camp actions.** Each camp has a ~12-hour budget. Players can chain multiple shovel actions in one camp as long as total hours fit. Overflow queues to the next camp.

| Action | Time cost | Effect |
|---|---|---|
| Firepit | auto (free) | Safer fire. Without shovel → small fire-spread event roll. |
| Latrine | auto (free) | Small hygiene bonus — reduces disease-onset rolls for the next 1–2 days. |
| Dig wagon out of mud/snow | 4 hr | Resolves "wagon stuck" events with less condition damage. |
| Dig grave | 2 hr | Reduces morale hit on party-member death. |
| Dig well (emergency) | 4–6 hr | Dry camps with 0 water: 40% chance of finding 30–50 gal of usable water. |

**Without a shovel:** no firepit (fire-spread risk), no latrine (+disease roll), no emergency well (must travel to water or die of thirst), "wagon stuck" events cost more condition, full death morale hit.

---

## 6. Profession Catalog (13)

All professions: one chosen per party member. Duplicates allowed with diminishing-return stacking on passive bonuses.

### 6.1 Profession definitions

| Profession | Starting gear | Passive (while alive) |
|---|---|---|
| **Banker** | +$800 cash | Better prices on both sides: −10% buy prices, +10% sell prices at all trading posts; reduces cash lost to theft events by 50% (he knows how to hide a stash) |
| **Farmer** | +100 lb food | −5% food consumed/day; auto-forage at rest/camp (+10–30 lb food, season & terrain dependent) |
| **Carpenter** | 2 axles, 2 wheels | Wagon repairs faster, fewer spare parts consumed |
| **Doctor** | 2 quinine, 4 laudanum, 4 bandages | Lower disease onset, faster recovery; safe buffalo liver prep; unlocks water boiling pre-1854 |
| **Blacksmith** | Iron toolkit, 10 ox shoes | Quality re-shoeing (shoes last 2× duration); salvages scrap from broken iron items (wheel hubs, axle bits, tools) → scrap reduces cost of the next matching repair by 20–40% |
| **Hunter** | Rifle, 30 bullets | +20% meat per hunt |
| **Teamster** | +1 ox, 1 yoke, 4 ox shoes | Oxen fatigue slower → faster travel; can re-shoe at normal speed/quality without Blacksmith |
| **Merchant** | 50 lb trade goods (tobacco, beads) | −15% buy prices, +20% sell prices (both sides, larger swing than Banker) |
| **Whore** | $100 cash, 20 lb comfort supplies (tobacco/whiskey/tea) | +15% morale floor, +1 morale per rest night; $5–15/trading-post stop; 1 trail rumor per post |
| **Scout** | Compass, 2 water skins, spyglass | Landmark distance reveals further ahead; better river-ford outcomes; weather prediction 1–2 days out |
| **Preacher** | Bible, shovel, 10 herbal poultices | Reduced morale hit from deaths; camp service fires every camp (small morale + chance of health boost); chance to convert bad events to minor morale gains |
| **Indian Trader** | 30 lb trinkets/trade goods, 2 pemmican | Native encounter events become tradeable vs hostile; unlocks Native trade menu at select posts |
| **Gunsmith** | Rifle cleaning kit, 15 bullets, second rifle | Rifles don't fail in rain/wet weather; +20% to Hunter's yield (stacks); better outcomes in defense events |

**On Banker vs Merchant price bonuses:** Banker is the "money-savvy gentleman" — smaller % swing but includes theft resistance and pure cash bonus. Merchant is the "haggler" — larger price swing but no theft protection. Different archetypes, both valuable. They stack if you run both.

### 6.2 Party setup rules
- Leader chosen first (name + profession); rest of party 1–5 companions.
- **Min: 2 adults. Max: 6.** Smaller party = less food burn, fewer stacked bonuses, more death-fragility.
- Leader has no mechanical distinction — just the named character you play as.
- Duplicate professions stack passive bonuses with diminishing returns (2 Doctors better than 1, but less than 2× effect).
- Starting cash = $300 base + sum of profession cash bonuses.
- Starting gear = base kit + union of profession starting gear.

**Auto-populated names:** when the player adds a party member, their name field auto-fills from a pool of historically-accurate 1840s–60s American names (John, James, William, Ezra, Amos, Elijah, Samuel, Mary, Sarah, Rebecca, Martha, Abigail, etc. — drawn from actual OT-era census records and journals). Players can edit or clear to type their own. Gender-consistent for Whore (female-only per profession). Names never repeat within a single party.

### 6.3 Children (phase 2)
- Tracked as Task #11. Phase 2 allows children in the party (different food consumption, no profession, different disease susceptibility, morale events around births/deaths, possible school events).

---

## 7. Item Catalog

Every item has a mechanical hook. Catalog organized by category.

### 7.1 Food (daily consumable; spoilage varies)
| Item | Function |
|---|---|
| Flour | baseline daily food staple |
| Bacon | high-calorie, salted (slow spoil) |
| Beans | shelf-stable protein |
| Hardtack | long-lasting, low morale |
| Sugar | small morale bump; preserves foraged berries |
| Coffee | morale + accidentally purifies water (pre-1854) |
| Tea | same as coffee |
| Dried fruit | morale + prevents scurvy |
| Pemmican | Native trade goods; ultra shelf-stable, never spoils |

### 7.2 Livestock
| Item | Function |
|---|---|
| Ox | pulls wagon; more oxen → higher carry cap + speed; each tracks health + fatigue |
| Yoke | replaces broken yoke (wagon event) |

(Mules deferred to v2 — Task #14.)

### 7.3 Wagon parts
| Item | Function |
|---|---|
| Wheel | replaces broken wheel (full replacement) |
| Axle | replaces broken axle (full replacement, rare + severe) |
| Tongue | replaces broken wagon tongue (full replacement, common) |
| Canvas cover | replaces damaged canvas (weather) |
| Spare plank | patch repair for small wagon damage (cracked spokes, loose tires, frayed cover) — cheaper tier than full replacement |
| Iron scrap | acquired by Blacksmith from broken iron items; reduces cost of the next matching metal repair by 20–40% |

### 7.4 Weapons / ammo
| Item | Function |
|---|---|
| Rifle | required for hunting + defense; second rifle enables parallel hunting |
| Bullets | consumed in hunting and defense events |
| Rifle cleaning kit | prevents rifle failure in rain / wet weather |

### 7.5 Clothing
| Item | Function |
|---|---|
| Coat | reduces cold-weather health loss |
| Boots | reduces fatigue on rough terrain |
| Blanket | reduces night chill (winter camp) |

(Clothing layering + post-ford chill mechanic deferred to v2 — Task #16.)

### 7.6 Tools
| Item | Function |
|---|---|
| Iron toolkit | unlocks full wagon repairs |
| Cookware | meal morale + required to boil water post-1854 |
| Rope | lower wagons on steep grades, secure loads, rescue fallen ox, brake wheel on descents |
| Shovel | reduces death morale hit; dig out mud/snow; dig well at dry camp; dig fire pits/latrines |
| Compass | reduces "lost in storm/fog" events |
| Water skins | +water carry capacity |
| Ox shoes | replace thrown shoes |
| Spyglass | reveals landmarks further on map, boosts hunting spot chance, earlier weather warnings |

### 7.7 Medicine
| Item | Function |
|---|---|
| Quinine | treats fever / malaria |
| Laudanum | treats pain / broken bones; rare dependency on repeat use |
| Calomel | treats dysentery; minor permanent health-cap penalty (historical mercury toxicity) |
| Bandages | treats wounds, snakebite, broken bones |
| Herbal poultice | weaker disease/wound treatment; foraged or Preacher-starter |
| Patent medicine | RNG: 50% heal / 35% nothing / 15% mild harm |

### 7.8 Comfort / morale
| Item | Function |
|---|---|
| Tobacco | morale consumable + Native trade currency |
| Whiskey | morale + small cold-exposure heal; rare dependency |
| Harmonica | unlocks "Entertain" camp action |
| Fiddle | larger morale bump than harmonica |
| Bible | +2 passive morale while owned; enables Preacher's Sunday service |

### 7.9 Native trade goods
| Item | Function |
|---|---|
| Moccasins | +cold protection; reduces bandit-alert rolls |
| Buffalo robe | best cold protection, warm sleep |
| Beads / calico | currency for Native tribe barter |

---

## 8. Trail Content

### 8.1 Trading posts (v1, 9 stops)
1. **Independence, MO** — start, best selection
2. **Fort Kearny** — US Army post, fair prices
3. **Fort Laramie** — iconic major fort, +30%
4. **Fort Bridger** — est. 1843, mountain-country supplies
5. **Fort Hall** — California split later (phase 2)
6. **Fort Boise** — remote
7. **Fort Walla Walla** — Columbia River post
8. **The Dalles** — end of wagon trail traditionally, +50%
9. **Oregon City** — arrival

### 8.2 Landmarks (15 stops — events & morale moments, not trading posts)
Alcove Spring · Ash Hollow (cemetery morale event) · Courthouse / Jail Rock · **Chimney Rock** (major morale milestone) · Scotts Bluff · Register Cliff (real Wyoming landmark — emigrants carved names into the sandstone, thousands still visible today; flavor event: "add your party's names to the cliff") · Guernsey Ruts · **Independence Rock** (July 4 celebration event if arrive by then) · Devil's Gate · **South Pass** (Continental Divide milestone + winter-pace warning) · Pacific Springs · **Soda Springs** (hot springs health boost) · Farewell Bend · Blue Mountains crossing (difficult terrain event) · Laurel Hill (Barlow Road — steep descent; rope required or wagon takes heavy damage).

### 8.3 River crossings (7 decision events)
Blue · North Platte (multiple fords) · Sweetwater (multiple) · Green · Bear · Snake (including Three Island Crossing) · Columbia.

### 8.4 Year/month-gated historical events
Already specified in §5.9; key entries:
- 1846+ Donner Party cautionary rumor
- 1849+ Gold Rush traffic, price inflation, California split
- 1852 peak cholera year (double density)
- 1856–60 Mormon handcart encounter
- 1860–61 Pony Express rider
- 1861–65 Civil War news
- 1864+ Sand Creek fallout → tilt Native encounters hostile
- 1869 railroad-era end-of-era mood
- March–May Platte/Kansas flooding
- July 4 Independence Rock celebration
- August–September peak buffalo herds (+40% hunt yield)
- September+ early-snow mountain warnings

### 8.5 Phase 2 content expansions (Task #13)
- 8–12 minor stops (road ranches, named ferry operators, smaller military posts, Native trade sites), year-gated.
- California Trail split at Fort Hall / Parting of the Ways.
- Alt start cities: St. Joseph, Council Bluffs, Westport Landing.

---

## 9. UX / Screens

### 9.1 Visual style
- **Palette:** dusty 32-bit western — burnt orange (#c96a2a), dusty tan (#e8c89a), deep wood (#3d2817), muted sage, bone.
- **Typography:** monospace body (old-typewriter feel); pixel-font headers for game titles.
- **Assets:** pixel art sprites (16/32-bit-inspired), hand-drawn landmark icons on the parchment map.

### 9.2 Landing / entry screens
- **Landing:** title, "New Game" / "Load Game" / "Settings".
- **Load Game:** list of 5 named slots + autosave. Each slot preview shows: **leader's name**, day number, in-game date, current location. (e.g., "Ezra's party · Day 42 · June 14, 1848 · Near Ft. Laramie")

### 9.3 New-game party setup
- Wizard-style: leader → companions (1–5) → start conditions (year/month) → starter-kit review → depart.
- Each party-member step: name, profession picker (13 cards with summary).
- Summary screen shows merged starter kit before "Depart."
- Phase 2 toggle: "Build your own kit" (Task #12) + "Bring children" (Task #11).

### 9.4 Main play screen — desktop
```
┌─────────────────────────────────────┬────────────────┐
│                              [⛶]   │   PARTY        │
│       [ MAP — parchment region      │   STATS        │
│         with wagon sprite + trail ] │   INVENTORY    │
│                                     │   (collapsible)│
│                                     ├────────────────┤
│                                     │   ACTIONS      │
│                                     │   Travel Rest  │
│                                     │   Hunt  Camp   │
│                                     │   [context]    │
├─────────────────────────────────────┴────────────────┤
│   EVENT LOG — Day 12 · Approaching Ft. Kearny...     │
└──────────────────────────────────────────────────────┘
```
- Header bar: title, current date, day number, pace indicator, ☰ menu (Party · Inventory · Save · Settings).
- Map is the focal area; wagon sprite animates along trail.
- Event modals overlay the map when fired.
- **Fullscreen map toggle** in the upper-right corner of the map (⛶ icon): click to expand the map to fill the viewport (side panels + event log collapse). Same icon in fullscreen mode collapses it back. Works on both desktop and Z Fold 4 unfolded.

### 9.5 Main play screen — Z Fold 4 unfolded (~884×780)
Same zone composition as desktop, just:
- Stats column trimmed to 170px.
- Action row stretches to 5-column grid, each button ≥44px tall (touch targets).
- Deep inventory lives in a modal (reached via ☰).
- Single responsive breakpoint at 900px separates desktop from Z Fold unfolded.

### 9.6 Action bar rules
- **Always visible (4 primary):** Travel · Rest · Hunt · Camp.
- **Context-aware (appear when relevant):** Trade (near a post), Ford (at a river), etc.
- **☰ menu (secondary):** Party details · Inventory · Save · Settings.

### 9.7 Map
- Style: regional top-down geography (rivers, mountains, grasslands) rendered on aged parchment background with hand-drawn landmarks.
- Wagon sprite bobs and moves along a dotted trail between landmarks.
- Landmarks are clickable (preview name, distance, type).
- Scout profession + spyglass reveals more landmarks ahead.

### 9.8 Event modal
- Full-screen on mobile, centered overlay on desktop.
- Event title, 1–3 paragraph flavor text (historical when possible), 2–4 choice buttons.
- Choice outcomes shown as result modal: text + stat deltas displayed inline.

---

## 10. Save Model

### 10.1 Phase 1 (v1)
- Each browser receives a persistent device cookie (UUID) on first visit.
- SQLite `saves` table keyed on `(device_id, slot_name)`.
- **Continuous autosave** after every significant action (day tick, event resolved, trade closed) → writes to `Autosave` slot.
- **5 named slots** — user can save-as, overwrite, delete, load.
- No account required. Saves live on the user's self-hosted server.

### 10.2 Phase 2
- Email/password (or passkey / magic link) accounts.
- `user_id` column added to `saves`; device-keyed saves migrated on first login.
- First login on a new device: "Merge existing local saves into account?" prompt.
- No game-logic changes — purely auth + key-column plumbing.

---

## 11. Pre-implementation Tasks and Phase 2 Roadmap

**Pre-implementation (before v1 coding):**
- **Task #10 —** Profession + item balance review pass: audit every starter item maps to a system rule; stress-test profession combinations for dominant strategies and dead picks.

**Phase 2 (after v1 ships):**
- **Task #11 —** Children in party, bundled with setup flow.
- **Task #12 —** Custom starter kit builder (cash budget + shopping screen).
- **Task #13 —** Expand trail content: road ranches, minor posts, ferry operators (year-gated).
- **Task #14 —** Mules as alternative draft animals (acquisition + differentiated stats).
- **Task #15 —** Deepen fire / firewood mechanics (explicit resource, failure events, gather action).
- **Task #16 —** Clothing rework + river-ford chill mechanic (layered clothing, wetness state, dry-at-camp flow).
- User accounts + cross-device save (see §10.2).
- California Trail split at Fort Hall / Parting of the Ways.
- Alt start cities (St. Joseph, Council Bluffs, Westport Landing).
- Optional audio (period-appropriate soundtrack, UI sounds).

---

## 12. Open Questions & Balance Review Checklist

### 12.1 To resolve during implementation + playtesting
- Food consumption rate (2 lb/person/day baseline) — validate feels right.
- Starting cash ($300 + profession bonuses) — enough for meaningful choices at first post, not too much.
- Event density (1–3 days avg between events) — tune for engagement.
- Travel speed (12–30 miles/day by pace) — tune for a 4–6 in-game-month completion.
- Disease onset probabilities — historical vs playable balance.
- Sell-back percentages — validate they don't trivialize trading.

### 12.2 Audit checklist (before coding complete)
- [ ] Every item in the catalog is referenced by at least one system rule.
- [ ] Every profession's starting gear has a mechanical hook.
- [ ] Every condition has at least one treatment path.
- [ ] Every landmark has either shopping, an event, or a milestone hook (no empty stops).
- [ ] No dominant-strategy party compositions (all-Farmers, all-Doctors).
- [ ] Every profession has a run where it's a top pick and a run where it's situational.
- [ ] Mixed-profession synergies play meaningfully (Preacher + Whore morale combo, Scout + Indian Trader safe-passage combo, Hunter + Gunsmith parallel hunting).
- [ ] Mobile layout (Z Fold 4 unfolded) tested in Firefox before launch.
- [ ] Year-gated events only trigger in their window.
- [ ] Month-gated hazards trigger reliably when traveling through that month.

---

## 13. Success Criteria (v1)

The spec is done when a player can:
- Start a new game with a 2–6 member party across 13 professions.
- Depart Independence on any year 1841–1869, month March–June.
- Travel the trail through 9 trading posts, 15 landmarks, 7 river crossings.
- Encounter 60–80 unique events across 9 categories, including year/month-gated content.
- Manage water, food, morale, health, wagon condition, and oxen through choice-driven mechanics.
- Reach Oregon City — or fail trying.
- Save progress across 5 named slots + autosave; load on the same device at a later session.
- Play on desktop and Z Fold 4 Firefox (unfolded) without UI friction.

---
