# Wagon Party Composition — Research & Design Collection

**Scope:** Hoosier Trail (Oregon Trail clone, 1843–1859). Historical wagon-party
composition, survival rates, outlier parties, and a gamified party-archetype
catalog for the 15-profession game engine.

**Sources:** in-repo research corpus at
`hoosierTrail-research/docs/historical-pass/` (primary-source excerpts —
Marcy 1859 *Prairie Traveler*, Frizzell 1852, Bryant 1846, Parkman 1849,
Palmer 1847, Hastings 1845; price/restock docs); the game's own
`content/bot-profiles.ts`, `content/trains.ts`, `content/professions.ts`,
`engine.ts`, and the `docs/audits/bot-detail-1031.md` sweep; plus the standard
emigration literature (Unruh, *The Plains Across*; Faragher, *Women and Men on
the Overland Trail*; Mattes, *The Great Platte River Road*).

> **Citation honesty:** the heavy aggregate statistics (Unruh's ~4% mortality,
> ~250–500k total emigrants, the ~10–20k grave estimate) come from my reading
> of the standard literature, not from a verbatim table in the in-repo corpus.
> The corpus confirms the *texture* (Frizzell counting fresh graves daily,
> Marcy's 50–70-man company rule, the 65/18/13/4 composition split the game
> already encodes). Treat the round numbers as literature-standard, the
> per-source quotes as corpus-verified.

---

## 1. Average composition by era

### The headline verdict on the 6-soul fixture

The game's test fixture — **4 adults + 2 children = 6 souls in one wagon** — is
**plausible but on the heavy/unusual side for a single wagon.** History's modal
*family wagon* was **2 adults + 3–5 children ≈ 5–7 souls**, but with only
**one or two adults**, not four. Four able adults in a single wagon reads as a
*partnership outfit* (two brothers + wives, or a man + hired hands) rather than
the typical nuclear family. So:

- As a count of souls (6), the fixture is **dead average.**
- As a *structure* (4 adults), it's **atypical** — most 6-soul wagons were
  2 adults + 4 children. The game's own `trains.ts` comment encodes this
  correctly: *"family wagons (60%) carried 4–6 souls (parents + 1–3 children)."*
- The game caps adults at 2–6 and lets children ride free of the adult cap
  (`engine.ts`: *"Size limits apply to ADULTS only — historical wagons commonly
  held 2 adults and 4–7 children (Sager 1844, Donner brothers 1846)"*). That's
  the right model.

**Recommendation:** keep 6 as a representative *soul count*, but the canonical
"typical family" fixture should be **2 adults + 4 children**, not 4 + 2. Reserve
4-adults for the explicitly-labeled partnership/mess archetypes.

### Era breakdown

| Era | Dominant composition | Typical party | Notes |
|---|---|---|---|
| **1843–48 Oregon family migration** | Family wagons, women & children present | Nuclear family, 1 wagon, **2 adults + 3–6 children ≈ 5–8 souls**; often 1–2 related families travelling together (the Sager, Donner-brother, Applegate pattern) | The "great migration" of 1843 (~875–1000 people, ~120 wagons) set the template. Women & children were a *majority* of souls. This is the game's home demographic. |
| **1849–52 California Gold Rush** | **Overwhelmingly male.** All-male "messes" / "companies" | 4–8 single men pooling into one wagon + a shared mess; joint-stock companies of dozens of wagons | 1849 was ~90%+ male. Men formed *messes* (cooking/cost-sharing units of 4–8) inside larger *companies*. Few families; the women present were wives of family heads (Sarah Royce 1849) or, increasingly, camp-bound businesswomen. |
| **1852 (peak + cholera)** | Mixed — families return in force, but cholera kills | Family wagons again common; trains 20–50 wagons | 1852 was the single largest year (~50k+ to CA, ~10k to OR). Also a catastrophic cholera year — Frizzell's diary is a near-daily grave count along the Platte. |
| **Mid-1850s (1853–59)** | Family-dominant, better-organized, fewer messes | Nuclear & extended families, milk cow behind every wagon; well-provisioned | By Marcy's 1859 guidebook the trail was a managed migration: organize into a 50–70-man company, elect a captain, sign articles of agreement. The "lone reckless man" had become the exception the guidebooks warned against. |

### Wagons-per-family and people-per-wagon

- **People per wagon:** the wagon was cargo, not a passenger coach. Everyone
  who could walk, walked (corpus `07-ox-team-harness.md`: *"riding in the wagon
  was rare… family members walked alongside"*). A wagon *belonged to* ~4–8
  people but carried mostly freight + the sick/infants. The 1849 mess packed
  4–8 men per wagon to split the ~$300/man outfit cost.
- **Wagons per family:** **one wagon per nuclear family** was standard. Wealthy
  outfits (Reed's "Pioneer Palace Car," Donner brothers) ran 2–3 wagons +
  hired teamsters. A second wagon was a wealth signal, not the norm.
- **Outfit economics** (corpus `06-prices.md`): single man ~$300 (Hastings
  1845); family of 4 ~$500–700 (Ware 1849); family of 7 ~$800 (Frizzell 1852);
  Marcy 1859 "$250–300 per man including team and wagon." This is *why* single
  men pooled into messes — one wagon + one ox team amortized across 4–8 men.

---

## 2. Survival rates

### Overall

- **Unruh's figure: ~4% trail mortality** across the wagon-emigration era
  (1840–1860) — roughly **6% on the worst cholera years, <2% in mild years.**
  Against an estimated 250,000–500,000 total emigrants, that's on the order of
  **10,000–20,000 graves** along the trail — the source of the "a grave every
  ~80 yards" / "10,000 dead" folk figures.
- **The "one in ten died" folk estimate is roughly double the scholarly rate.**
  It survives because (a) cholera years *felt* like that, and (b) the trail was
  literally lined with graves, so emigrants *perceived* far higher mortality
  than the aggregate. Frizzell (1852) counts fresh graves almost daily — the
  emotional reality behind the inflated folk number.
- **Arrived vs died vs turned back:** the overwhelming majority **arrived** —
  **>90%, likely ~95%+** reached Oregon/California/Utah. Turn-backs ("go-backs"
  / "gobacks") were a real but minority phenomenon, concentrated at the
  Missouri jumping-off when nerve failed, and after disasters. Most parties
  that started, finished.

### Cause of death (the reframe)

The killer was **disease, not Indians, not starvation.**

- **Cholera** dominated 1849–1855, especially along the lower Platte. It killed
  in *hours* — Frizzell: *"taken with the cholera, by drinking a draught of cold
  water from a spring… when he died, leaving a wife & one child."* Cold water +
  contaminated camps = the classic vector.
- Other big killers: **dysentery, "mountain fever" (typhoid), accidents**
  (drownings at fords, wagon-crush, accidental gunshot — the single most common
  *accidental* death was a man shot by his own or a companion's rifle), and
  **scurvy** late in the season.
- **Indian-caused deaths were a small fraction** (Unruh: emigrants killed far
  more Indians than vice-versa). The Donner/Whitman disasters loom large in
  memory but were statistical outliers.

### Did family parties die at different rates than all-male parties?

Yes, in opposite directions depending on the hazard:

- **Cholera/disease:** roughly *equal exposure* — it was a camp/water hazard, not
  a function of who you travelled with. But **families carried the demographic
  most likely to die from it: the very young and the very old.**
- **Children's mortality:** **the under-5 and infant cohort died at elevated
  rates** — dysentery, accidents (run over by wagon wheels was a recurring
  horror), and cholera hit them hardest. The Sager family (game profile) is the
  canonical case: *both parents* died, but the **seven children all survived** —
  inverse of the usual assumption.
- **All-male messes** carried no children or elderly, so their crude mortality
  skewed lower per-capita on disease — but they took **more accident/violence
  risk** (gunshots, brawls, reckless fords, scurvy from worse cooking) and were
  more prone to **disorganized splintering** mid-trail, which Marcy explicitly
  warns kills companies.
- **Net:** well-organized family trains (lots of hands, shared guard duty,
  women cooking properly) were *more survivable as units* than a loose mess of
  single men, even though any individual child was at higher personal risk.

### The game's bot gate vs history

The game's bot sweep (`docs/audits/bot-detail-1031.md`) shows the *best*
personas arriving only **~35–38%** (sunday_rester 38%, balanced 35%, faithful
36%), with most failures being **"stalled"** (53–57%) — running out of *calendar*
in the Cascades, not *dying*. Wipe rates are low (7–12%) except chaos (48%).

So when "~53% of 6-soul family wagons fail the bot gate," the failure mode is
**the bot couldn't finish in time**, not "history-grade mortality." This is a
**huge divergence from history**, which was **~95%+ arrival.** The reframe:

> History was *far* more survivable than the current bot can achieve. Real
> emigrants overwhelmingly arrived; the game's bots overwhelmingly stall in the
> mountains. The gap is a **game-difficulty artifact** (calendar pressure +
> bot pathing in the Cascades), not a historical truth. If the design goal is
> "feel period-authentic," arrival rates should be tuned *up* toward 60–90%
> for competent play, with death (not stalling) as the dramatic failure mode.

The `bot-detail-1031` finding #1 is explicit: stalled bots *traveled the entire
trail* and died on the clock at mile ~2050–2150 of 2195. That's a tuning knob
(day cap / Cascade pace / late-trail pacing), not a mortality model.

---

## 3. Outlier parties (historical)

### All-male '49er messes — the most important outlier for the game

- **Organization:** single men pooled into a **mess** (4–8 men sharing one
  wagon, one ox team, one cook-kit, splitting the ~$300/man outfit). Multiple
  messes federated into a **company** (joint-stock, sometimes incorporated, with
  printed bylaws). Marcy 1859 codifies the upper layer: **"From 50 to 70 men,
  properly armed and equipped"** per company, elect a captain, sign an
  **obligation binding each member to the captain's decisions** and to a common
  fund for replacing dead oxen.
- **Why it worked:** cost amortization + labor pooling (rotating guard,
  collective ford/repair). Marcy: *"the only way to resist depredations… much
  more efficiency… especially in crossing streams, repairing roads."*
- **Why it failed:** Marcy also warns these companies **splinter** — *"discords
  and dissensions sooner or later arose which invariably resulted in breaking up
  and separating the company."* The Bidwell-Bartleson party (1841, game profile)
  is the archetype: first wagons to California, **abandoned the wagons in
  Nevada, finished on foot and horseback.**

### Solo travelers (Joe Meek class)

- Real but rare, and almost always **experienced mountain men** — Joe Meek
  (game profile, 1840, beaver-trade collapse → Oregon → first US Marshal of
  Oregon Territory), Joel Palmer (1845, surveyed the Barlow Road), Jim Clyman.
  The guidebooks (Marcy, Ware) **explicitly warned against starting alone** —
  the game's `trains.ts` encodes this: solos are 4% at Independence but jump to
  20% mid-trail (the *survivor* solo: a leader whose family died of cholera,
  continuing alone — the "widow wagon / orphan wagon" Bryant and Helen Carpenter
  describe).

### Widows leading families — Tabitha Brown

- **Tabitha Brown (1846, game profile)** crossed at **age 66**, on foot through
  the Umpqua Mountains on the disastrous Applegate/Southern route, and went on to
  **found what became Pacific University.** Mapped in-game to the **teacher**
  profession. The widow-with-children wagon is well-attested: **Elizabeth Dixon
  Smith Geer** (corpus `03-diaries.md`) widowed on the trail with **seven
  children** — *"Now I know what none but widows know… how comfortless is a
  widow's life… without money or friends, and the care of seven children."*

### Women-led / women-present parties

- **Narcissa Whitman (1836)** and Eliza Spalding were among the **first white
  women over the Rockies** — proving the crossing was survivable for women, which
  unlocked the family migration. **Nancy Kelsey (1841, Bidwell party, game
  profile)** crossed at 18 with an infant — the lone woman in an all-male
  company. These are "first woman to do X" anchors, not a common composition.

### Sex-worker migration to the camps (Dave's "whore train")

This is **real, with caveats about the route:**

- The gold camps and boomtowns (San Francisco, Sacramento, Nevada City,
  Virginia City) pulled a wave of **prostitutes and madams** because the
  population was ~90% male with cash. Corpus `07-frontier-startups.md` names two:
  - **Belle Cora** — New Orleans → San Francisco 1849, opened a Sydney-Town
    parlor house: *"brought capital + fancy goods + a few dancing girls."*
    **Came by sea**, so trail-irrelevant.
  - **Eleanor Dumont ("Madame Mustache")** — Nevada City CA 1854. **Came
    overland**; corpus: *"her wagon was full of fancy dishes, gambling tables,
    and a piano."* She's the **defensible overland anchor.**
- **What's real:** madams *did* move overland with a small "stock" of women +
  capital + fancy goods (mirrors, liquor, gaming equipment, a piano) to set up
  in the camps. **What's gamified:** a clean "1 man + 5 working women in one
  wagon" is a *compression* of the real pattern (a madam + a few women + male
  teamsters/guards, often joining a larger train for safety). The game's whore
  profession (`+15 morale floor`, `$5–15/post`, `Share-the-Whore` camp action,
  `charisma 1` but **election-eligible** — the dossier even cites Dumont as "a
  respected camp figure even when reviled") makes this a legitimate, documented
  archetype rather than pure fantasy. Lean into it; flag the compression in the
  flavor text and you're period-defensible.

### Missionary parties

- **The Whitman party (1836, game profile)** — doctor-led (Marcus Whitman),
  small (the couple + Spaldings + helpers), first wagons west, ended in the 1847
  massacre. Methodist & Catholic mission parties (Jason Lee, the De Smet
  Jesuits) seeded the early trail. Small, well-funded, doctor/preacher-led.

### Freight / commercial outfits

- Not emigrants per se, but the **freight wagon** (Conestoga-class, large teams,
  professional teamsters, no families) ran supplies to the forts and camps.
  Corpus `06-wagon-anatomy.md`: *"almost no families used [Conestogas] for the
  trip; we use it as a carry-more/heavier/costs-more trade-off."* A pure-male
  teamster crew hauling trade goods — the **freight-crew archetype.**

### Extended-family trains

- The **Donner brothers (1846)** and the **Sager** clan are extended-family
  anchors: multiple related wagons travelling as one unit. The Donner family
  profile (George 62 + Tamzene 45 + 5 daughters) is the canonical large-family
  wagon; Tamzene was *"captain by acclamation… distributed food to others as
  their own stores ran low in the Sierra."*

---

## 4. Gamified archetype catalog

Difficulty tiers reflect the game's mechanics: **food scales with mouths**
(~1.5–2 lb/eater/day; children ~70% adult ration per corpus `08-post-restock.md`);
**children are weaker** (lower HP floor, can't drive/hunt/guard as able-bodies);
**professions carry load-bearing traits** — per the bot audit, **doctor**
(−30% condition damage), **teamster**, **hunter**, **scout** measurably *lift*
arrival; **whore, lawyer, banker, teacher, preacher, indian_trader, gunsmith,
merchant** are flavor/economy professions the bot "eats the average" on.

> Tiers: **Easy** (all able adults, ≥1 survival profession, few mouths) ·
> **Moderate** (typical family balance) · **Hard** (many child mouths, weak
> profession mix, or thin numbers) · **Brutal** (solo / pure-flavor crew).

| # | Archetype | Composition | Suggested professions | Historical anchor | Tier |
|---|---|---|---|---|---|
| 1 | **The '49er Mess** *(Dave's #1)* | 4–6 adults, all male, 0 children | doctor + hunter + teamster + blacksmith + scout (the survival stack) | All-male gold-rush mess; Marcy's 50–70-man company in miniature | **Easy** |
| 2 | **The Traditional Family** | 2 adults (M+F) + 4 children | farmer (lead) + doctor or teamster (spouse) | The modal 1850s Oregon family | **Moderate** |
| 3 | **The Widow's Wagon** | 1 adult female + 3–4 children | teacher (lead) | **Tabitha Brown 1846** / Elizabeth Dixon Smith Geer | **Hard** |
| 4 | **The Whore Train** *(Dave's #2)* | 1 male + 5 female | 1 teamster/scout/lawyer (the man) + 5 whore | Madam moving stock to the camps — **Eleanor Dumont "Madame Mustache," overland 1854** | **Hard** (great cash/morale economy, no doctor/hunter) |
| 5 | **The Preacher's Flock** | 2 adults + 2–3 children, or a small adult band | preacher (lead) + farmer + doctor | Methodist mission party; Sabbath-rester doctrine | **Moderate** |
| 6 | **The Doctor's Ambulance** | 2–4 adults, mixed | doctor (lead) + hunter + teamster | **Marcus Whitman / generous-doctor** — best disease survivability | **Easy** |
| 7 | **The Freight Crew** | 4–5 adults, all male | teamster + blacksmith + carpenter + gunsmith | Commercial freight outfit (Conestoga-class) hauling to the camps | **Easy** (heavy wagon = pace/cost trade) |
| 8 | **The Honeymoon Pair** | 2 adults (M+F), 0 children | any two; thematic banker + whore, or hunter + doctor | Ezra & Eliza Meeker 1852 (newlyweds, infant) | **Easy–Moderate** (2 mouths, but thin labor) |
| 9 | **The Extended Clan** | 4–6 adults + 4–6 children (max souls) | farmer + farmer + doctor + teamster | **Donner brothers / Sager clan** — big extended-family train | **Hard** (most mouths in the game) |
| 10 | **The Mountain Man** | 1 adult male, solo | hunter or scout | **Joe Meek 1840 / Joel Palmer 1845** | **Brutal** (solo, but best survival professions) |
| 11 | **The Rich Speculator** | 2–4 adults + children, 2–3 wagons of luxury | banker or lawyer (lead) | **James Reed 1846** — wealth, the "Pioneer Palace Car," litigious | **Moderate–Hard** (cash-rich, overloaded, low survival traits) |
| 12 | **The Unprepared '49er** | 2–4 adults, all male | banker + merchant + lawyer (no survival stack) | The greenhorn opportunist (chaos × banker in the sweep) | **Brutal** (cash but no doctor/hunter/teamster) |
| 13 | **The Trader's Outfit** | 2–3 adults | indian_trader (lead) + merchant + scout | Trade-post / Indian-trade outfit; barter economy play | **Moderate** (economy-focused, thin survival) |
| 14 | **The Schoolmarm's Wagon** | 2 adults + 3–4 children | teacher (lead) + preacher | **Tabitha Brown / John Bidwell (schoolteacher-turned-emigrant)** — kid-morale build | **Hard** (child-heavy, flavor professions) |

*(1–4 cover Dave's two explicit asks plus the family + widow staples; 5–14 fill
out the playful + historical spread.)*

---

## 5. The target question — a defensible arrival-rate ladder

**History sets the ceiling at ~95%+ arrival, with death (not turn-back) as the
rare failure.** The game should *not* mirror history's near-uniform success —
that's no game — but it should reframe failure away from the current "stall in
the Cascades 55% of the time" artifact toward **dramatic, party-shaped
mortality**. A defensible ladder, anchored to both history and the game's
profession mechanics:

> **Easy tier (optimal all-male crews / doctor's ambulance / freight): ~85–90%.**
> These have the full survival stack (doctor's −30% condition damage, hunter
> food, teamster pace) and few weak mouths — they should *usually* make it,
> matching the historical "well-organized company arrives" reality, with the
> ~10–15% loss coming from cholera-year spikes and accident RNG.
> **Moderate tier (traditional family / honeymoon / preacher): ~60–75%.** The
> modal demographic: enough hands and at least one survival profession, but more
> mouths and exposure. This is the game's "fair fight" — most runs succeed, a
> meaningful minority lose a member or stall.
> **Hard tier (widow's wagon / whore train / extended clan / schoolmarm):
> ~40–55%.** Child-heavy or survival-profession-thin: the food math and weak
> bodies bite, and a cholera year can be ruinous (the Sager outcome — leader
> dies, children scrape through — should be a *live* possibility, not a script).
> **Brutal tier (solo mountain man / unprepared '49er): ~25–40%.** Solo or
> no-survival-stack: history says these were the parties the guidebooks begged
> people not to attempt. Reward expert play (Meek's hunter/scout build should
> beat the greenhorn banker's by a wide margin), but keep the floor punishing.

The single most important calibration note: **the current ~35% top-line bot
arrival is below even the Hard tier and is driven by *stalling*, not death.**
Closing the Cascade-calendar gap (per `bot-detail-1031` finding #1) should be a
prerequisite to any archetype-difficulty tuning — otherwise every archetype
inherits the same "ran out of clock at mile 2100" artifact instead of its own
historically-shaped failure signature.
