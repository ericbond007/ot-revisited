export type ItemCategory =
  | 'food'
  | 'feed'
  | 'livestock'
  | 'wagon_part'
  | 'weapon'
  | 'ammo'
  | 'clothing'
  | 'tool'
  | 'medicine'
  | 'comfort'
  | 'native_trade';

export interface ItemMeta {
  id: string;
  name: string;
  category: ItemCategory;
  weightLbPerUnit: number;
  foodDrawOrder?: number;
  // Short hover-tooltip description — what the item is / does / provides.
  description?: string;
}

export const ITEMS: Record<string, ItemMeta> = {
  // Fresh game meat spoils fast — foodDrawOrder 0 puts it ahead of every
  // other food in consumption so the party naturally eats it before it
  // rots. The spoilage system (systems/spoilage.ts) zeroes out remaining
  // meat after a few days via flags._gameMeatSpoilDay.
  game_meat:   { id: 'game_meat',   name: 'Game meat',    category: 'food', weightLbPerUnit: 1, foodDrawOrder: 0, description: 'Fresh kill from the hunt. Eaten first — spoils in a few days without curing.' },
  // Wild berries — foraged or dressed from a hunt site. Light, stackable,
  // small morale bump when eaten. foodDrawOrder 0.5 = after fresh meat but
  // before pantry staples.
  berries:     { id: 'berries',     name: 'Wild berries', category: 'food', weightLbPerUnit: 0.5, foodDrawOrder: 0.5, description: 'Currants, chokecherries, wild plums. Eaten fresh — small morale bump.' },
  // Fresh eggs from the wagon's chickens. Perishable in the spec but
  // kept simple for now — no spoil clock, just a steady trickle from
  // the coop. foodDrawOrder 0.75 = after berries, before flour.
  egg:         { id: 'egg',         name: 'Egg',          category: 'food', weightLbPerUnit: 0.1, foodDrawOrder: 0.75, description: 'Fresh from the coop. Breakfast staple on the trail — variety beats hardtack.' },
  // Fresh milk (#139) — daily yield from the wagon's milk cow. 1 unit
  // = 1 gallon; weight kept at 1 lb/unit as a rations-equivalent
  // abstraction (real milk is ~8 lb/gal, but the cow is metabolically
  // converting grass directly — the wagon never carries the full weight
  // because butter (#222) and consumption clear the pile daily). Spoils
  // in 2 days via the spoilage system. foodDrawOrder 0.6 places milk
  // between berries (0.5) and eggs (0.75) — period reality, families
  // drank it at every meal it was available.
  milk:        { id: 'milk',        name: 'Fresh milk',   category: 'food', weightLbPerUnit: 1, foodDrawOrder: 0.6, description: "Daily yield from the wagon's milk cow. Spoils in two days. Counts as a fresh nutrition group." },
  // Farmer's cheese (#139) — pressed from milk via the cheese_press
  // camp action. Period reality: 1 lb of cheese per gallon of milk
  // (Beecher 1846, Marcy 1859), shelf-stable for ~2 weeks at trail
  // temps when salted, longer in the cool wagon interior. We treat
  // it as fully shelf-stable — abstraction, but reasonable at
  // trail-journey timescale. foodDrawOrder 3 places it after fresh
  // food and bacon — eaten as a daily protein, not the first draw.
  cheese:      { id: 'cheese',      name: "Farmer's cheese", category: 'food', weightLbPerUnit: 1, foodDrawOrder: 3.1, description: "Pressed from milk in the cheese hoop. Salty, dense, keeps for weeks. A 'fresh' nutrition group for variety." },
  // Wagon-pail butter (#222) — passive on travel days when the party
  // owns a butter_crock + has ≥2 gal of fresh milk. The day's jostling
  // does the churn for free; emigrant diaries (Royce, Sager, Williams)
  // describe hanging the covered pail under the seat and finding
  // butter by evening. 2 gal milk → 1 lb butter, salted for shelf
  // life, eaten as a flavor staple on biscuits and johnnycakes.
  butter:      { id: 'butter',      name: 'Butter',       category: 'food', weightLbPerUnit: 1, foodDrawOrder: 2.5, description: "Churned by the wagon's bouncing on travel days. Salty, shelf-stable, heaven on hot biscuits. A 'fresh' nutrition group." },
  flour:       { id: 'flour',       name: 'Flour',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 1, description: 'Baseline staple. Eaten after fresh meat.' },
  // Cornmeal — period staple alongside (or instead of) wheat flour. Cheaper,
  // ground locally, the foundation of johnnycakes and cornbread on the trail.
  cornmeal:    { id: 'cornmeal',    name: 'Cornmeal',     category: 'food', weightLbPerUnit: 1, foodDrawOrder: 1.2, description: 'Ground corn. Cheaper than flour, makes johnnycakes and mush.' },
  beans:       { id: 'beans',       name: 'Beans',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 2, description: 'Shelf-stable protein. Keeps indefinitely.' },
  bacon:       { id: 'bacon',       name: 'Bacon',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 3, description: 'Salted pork. High-calorie, slow to spoil.' },
  // Salt pork — heavier-cure pork, packed in barrels. Distinct from bacon:
  // saltier, fattier, lasts longer in summer heat.
  salt_pork:   { id: 'salt_pork',   name: 'Salt pork',    category: 'food', weightLbPerUnit: 1, foodDrawOrder: 3.2, description: 'Heavy-cured pork from the barrel. Saltier than bacon, holds up better in summer.' },
  // Jerky sits at 3.5 so it reads between bacon and hardtack — a durable
  // staple meat protein. Cured from game_meat + salt (camp action TBD).
  jerky:       { id: 'jerky',       name: 'Jerky',        category: 'food', weightLbPerUnit: 0.5, foodDrawOrder: 3.5, description: 'Dried strips of cured meat. Lean, salty, lasts indefinitely.' },
  hardtack:    { id: 'hardtack',    name: 'Hardtack',     category: 'food', weightLbPerUnit: 1, foodDrawOrder: 4, description: 'Indestructible biscuit. Fills bellies, drags morale.' },
  // Dried fruit ate as a daily ration in the period — Marcy spec'd
  // 15-25 lb per adult precisely because it was eaten alongside the
  // bread and bacon, not last-resort. Draw order 1.5 puts it with the
  // staples (after flour, before beans) — emigrants ate stewed fruit
  // every meal. Audit pass #266 corrected this from a draw order of 5.
  dried_fruit: { id: 'dried_fruit', name: 'Dried fruit',  category: 'food', weightLbPerUnit: 1, foodDrawOrder: 1.5, description: 'Apples, peaches, plums. Eaten daily with the staples — wards off scurvy.' },
  // Dried salmon — Snake/Columbia fishery staple. Shoshone and Cayuse bands
  // dried thousands of salmon each summer on racks above the falls. Period
  // record: Nesmith 1843 "coming daily to sell dried salmon." Frizzell 1852
  // traded a Barlow knife for an 8-lb fish at these same falls. No spoil clock
  // — that is the entire point of the drying racks. foodDrawOrder 3.7 puts it
  // between jerky (3.5) and hardtack (4) — a durable protein staple.
  dried_salmon: { id: 'dried_salmon', name: 'Dried salmon', category: 'food', weightLbPerUnit: 1, foodDrawOrder: 3.7, description: 'Snake River salmon, split and dried on native racks. Keeps indefinitely. Traded at the fishery posts past Fort Hall.' },
  pemmican:    { id: 'pemmican',    name: 'Pemmican',     category: 'food', weightLbPerUnit: 1, foodDrawOrder: 6, description: 'Native-prepared dried meat + fat. Never spoils.' },
  // Period sugar — sold as conical loaves (a.k.a. "loaf" or "lump" sugar)
  // wrapped in blue paper, broken off with sugar-nips. Treated as the
  // generic sugar item; one pound per unit normalizes the loaves for
  // gameplay weight rather than the historical 4-5 lb cone.
  sugar:       { id: 'sugar',       name: 'Sugar',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 7, description: 'Loaf sugar — period cone form, broken off with nips. Small morale bump; preserves foraged berries.' },
  // Coffee + tea are NOT in the regular food draw — they're consumed
  // separately by applyHotDrinks (~1 lb per 5 brew-days). Daily brewing
  // gives a small morale lift and accidentally cuts waterborne-disease
  // odds because the water gets boiled.
  coffee:      { id: 'coffee',      name: 'Coffee',       category: 'food', weightLbPerUnit: 1, description: 'Boiled daily — small morale lift and −40% waterborne disease odds while you brew.' },
  tea:         { id: 'tea',         name: 'Tea',          category: 'food', weightLbPerUnit: 1, description: 'Boiled daily — small morale lift and −40% waterborne disease odds while you brew.' },

  ox: { id: 'ox', name: 'Ox', category: 'livestock', weightLbPerUnit: 0, description: 'Draft animal. Pulls the wagon. More oxen = faster travel and higher carry cap.' },
  yoke: { id: 'yoke', name: 'Yoke', category: 'livestock', weightLbPerUnit: 15, description: 'Harnesses the oxen to the wagon. Replaces broken yokes.' },
  // Ox bow (#215) — the steam-bent U-loop that fits up through the
  // yoke and around an ox's neck. Two per yoke; cracks under shear
  // load. Marcy 1859 explicitly prescribes 2 spares per wagon.
  ox_bow: { id: 'ox_bow', name: 'Ox bow', category: 'livestock', weightLbPerUnit: 5, description: 'Steam-bent hickory neck loop. Cracks under load — Marcy spec\'d 2 spares per wagon.' },
  // Picket pins + lariat (#221) — iron stakes driven into the ground,
  // long rope tying the lead ox so the team grazes a known radius.
  // Cuts the morning stray-search by 50%. Hobbles and a bell-ox were
  // the period alternatives; pins were the most universal kit.
  picket_pins: { id: 'picket_pins', name: 'Picket pins', category: 'livestock', weightLbPerUnit: 5, description: 'Iron stakes + 50 ft of rope. Tethers the team at night so they don\'t wander. Halves the morning stray-search.' },
  // Live chickens — carried in a coop strapped to the wagon bed.
  // Wagon-capped per model (light: 3 / prairie: 5 / heavy: 8). Lay
  // eggs daily. Can die to predator events or drown in rough fords.
  chicken: { id: 'chicken', name: 'Chicken', category: 'livestock', weightLbPerUnit: 3, description: 'Hen in a coop. Lays eggs daily while alive. Coop size limited by wagon model.' },
  // Milk cow (#139) — walks tethered behind the wagon, drinks at stream
  // crossings, grazes the same grass the oxen do. Weight 0 because the
  // cow carries herself. Pace tax (-5% per cow, capped at -10%) lives
  // in systems/travel.ts, not as wagon weight.
  milk_cow: { id: 'milk_cow', name: 'Milk cow', category: 'livestock', weightLbPerUnit: 0, description: 'Walks tethered behind the wagon. Yields milk daily based on grazing quality. Slows pace ~5% per head.' },

  // Grain / oats for draft teams. Mules need it every day. Oxen
  // subsist on prairie grass when grazing is good (prairie/forest
  // in growing season) but draw on grain when grass is thin —
  // mountains, desert, or fall/winter. 1 lb per animal per day.
  grain: { id: 'grain', name: 'Grain', category: 'feed', weightLbPerUnit: 1, description: 'Oats and corn for draft teams. 1 lb per animal per day. Mules eat it always; oxen draw on it when grazing is poor.' },

  wagon:       { id: 'wagon',       name: 'Wagon',          category: 'wagon_part', weightLbPerUnit: 0, description: 'Your home on wheels.' },
  wheel:       { id: 'wheel',       name: 'Spare wheel',    category: 'wagon_part', weightLbPerUnit: 50, description: 'Replace a broken wheel. Fully restores some wagon condition.' },
  axle:        { id: 'axle',        name: 'Spare axle',     category: 'wagon_part', weightLbPerUnit: 60, description: 'Rare but catastrophic failure. A spare saves the day.' },
  tongue:      { id: 'tongue',      name: 'Spare tongue',   category: 'wagon_part', weightLbPerUnit: 40, description: 'Connects wagon to the oxen. Breaks more often than you\'d think.' },
  canvas:      { id: 'canvas',      name: 'Canvas cover',   category: 'wagon_part', weightLbPerUnit: 30, description: 'Replace a torn cover. Otherwise weather damages supplies.' },
  spare_plank: { id: 'spare_plank', name: 'Spare plank',    category: 'wagon_part', weightLbPerUnit: 8, description: 'Patches minor wagon damage. Use the patch-with-planks camp action for +5 wagon condition.' },
  // Tar bucket — pine-tar grease for axle hubs. Every emigrant diary
  // mentions one swinging under the wagon. Cuts frame-decay rate by
  // 25% while in the inventory.
  tar_bucket:  { id: 'tar_bucket',  name: 'Tar bucket',     category: 'wagon_part', weightLbPerUnit: 5, description: 'Pine-tar axle dressing. Greases hubs to slow wagon wear by 25%. Consumed at ~one bucket per 500 miles of travel.' },

  // #182 hunt byproducts. Period emigrants pulled three things off a
  // big-game carcass besides meat: tallow (rendered fat — cooking
  // grease, candle/soap making, axle dressing), the prized "tongue +
  // hump" delicacy cuts, and the raw hide. Hides were rarely tanned on
  // the trail (3-week process); parties dried them flat and either
  // traded to natives / posts or used as rough wagon-canvas patches.
  // Tallow is rendered fat — used as cooking grease, candle stock,
  // and soap-making, NOT a daily ration. Period emigrants only ate it
  // straight when food ran out (mountain-man tradition). Draw order
  // 6.5 puts it after pemmican — last food drawn before starvation.
  // Audit pass #266 corrected this from a draw order of 5.
  tallow:      { id: 'tallow',      name: 'Tallow',       category: 'food', weightLbPerUnit: 1, foodDrawOrder: 6.5, description: 'Rendered animal fat. Cooking grease, candle stock, soap. Eaten straight only as a desperation calorie.' },
  prize_cut:   { id: 'prize_cut',   name: 'Prize cut',    category: 'food', weightLbPerUnit: 1, foodDrawOrder: 0.3, description: 'Tongue and hump, the choicest cuts of a big-game kill. A trail-side delicacy — emigrant diaries write about it with relish.' },
  raw_hide:    { id: 'raw_hide',    name: 'Raw hide',     category: 'native_trade', weightLbPerUnit: 10, description: 'Untreated dried hide. Tanning takes weeks; on the trail you stockpile rawhide for trade with natives or posts (or rough wagon repair).' },

  rifle: { id: 'rifle', name: 'Rifle', category: 'weapon', weightLbPerUnit: 10, description: 'Required for hunting. A second rifle lets two hunters work in parallel.' },

  // Period firearms ecosystem (#174). Caplock muzzle-loaders dominated
  // the trail era (1846-1859); each shot consumes a measure of black
  // powder, a cast lead ball, and a percussion cap. Caps are the
  // bottleneck — couldn't be made on the trail (fulminate of mercury
  // is hazardous chemistry), only bought at posts. Powder + lead are
  // renewable: powder by the keg, lead recast from pigs with a mold.
  gunpowder:       { id: 'gunpowder',       name: 'Gunpowder',       category: 'ammo', weightLbPerUnit: 0.016, description: '1 charge of black powder (≈110 grains). Consumed per shot. Sold by the canister at posts.' },
  lead_pig:        { id: 'lead_pig',        name: 'Pig of lead',     category: 'ammo', weightLbPerUnit: 5,     description: 'Raw lead bar (~5 lb). Cast into balls at camp using a bullet mold — one pig yields ~30 balls.' },
  lead_balls:      { id: 'lead_balls',      name: 'Lead balls',      category: 'ammo', weightLbPerUnit: 0.03,  description: 'Cast lead balls. Consumed per shot. Cast your own from pigs with a bullet mold, or buy ready-cast at posts.' },
  percussion_caps: { id: 'percussion_caps', name: 'Percussion caps', category: 'ammo', weightLbPerUnit: 0.0001, description: 'Brass caps containing fulminate of mercury — fitted on the rifle nipple to spark the powder. The bottleneck consumable: caps run out before powder or lead.' },
  bullet_mold:     { id: 'bullet_mold',     name: 'Bullet mold',     category: 'tool', weightLbPerUnit: 2,     description: 'Iron mold for casting lead balls from raw pigs. Required for the camp "Cast balls" action.' },

  rifle_cleaning_kit: { id: 'rifle_cleaning_kit', name: 'Rifle cleaning kit', category: 'tool', weightLbPerUnit: 2, description: 'Keeps rifles firing in rain / wet weather.' },

  // #197 fishing gear. Period emigrants commonly carried a hand-line +
  // hooks for ~$0.30; folding pole rods and seine nets were less common
  // but yielded much more. The Snake, Sweetwater, Bear, and Columbia
  // were stocked with cutthroat trout, salmon, and catfish — most
  // parties under-utilized this when game ran thin past Fort Hall.
  fishing_line: { id: 'fishing_line', name: 'Fishing line', category: 'tool', weightLbPerUnit: 0.2, description: 'Hand-line + bone hooks. Cheap and light — every party should carry one. Slow but steady at the camp action.' },
  fishing_rod:  { id: 'fishing_rod',  name: 'Fishing rod',  category: 'tool', weightLbPerUnit: 2,   description: 'Folding pole + line. Faster than a hand-line, better yield. Heavier but worth carrying past Fort Hall.' },
  fishing_net:  { id: 'fishing_net',  name: 'Fishing net',  category: 'tool', weightLbPerUnit: 8,   description: 'Seine net for group fishing. Heavy but the highest-yield gear at major rivers.' },

  // #1072 / #1193 — sewing kit. Durable (not consumed by mend_clothes).
  // Period anchor: Marcy 1859 *The Prairie Traveler* §"Housewife" — "Thread,
  // needles, beeswax for the thread, buttons, and an awl should be carried,
  // as the awl and buckskin will be found in constant requisition."
  // Packed in a small buckskin bag; weighs next to nothing.
  sewing_kit: { id: 'sewing_kit', name: 'Sewing kit', category: 'tool', weightLbPerUnit: 1, description: 'Thread, needles, beeswax, buttons, and an awl in a buckskin bag. "The awl and buckskin will be found in constant requisition." — Marcy, 1859' },

  coat: { id: 'coat', name: 'Coat', category: 'clothing', weightLbPerUnit: 4, description: 'Warmth +25 per person (one per body). Cuts ford-chill damage and cold-camp health loss.' },
  boots: { id: 'boots', name: 'Boots', category: 'clothing', weightLbPerUnit: 3, description: 'Warmth +15 per person. Helps most when wading into cold rivers.' },
  blanket: { id: 'blanket', name: 'Blanket', category: 'clothing', weightLbPerUnit: 5, description: 'Warmth +25 per person. Night chill mitigation when the fire goes out.' },
  // Canvas A-frame tent — pitched in ~10 minutes, sleeps 4-6, period
  // staple for parties that didn't sleep under wagons. Cuts wind and
  // rain enough to take the sting out of cold camps.
  tent: { id: 'tent', name: 'Tent', category: 'clothing', weightLbPerUnit: 35, description: 'Canvas A-frame. Cuts the cold-camp morale hit in half — wind, rain, and dust kept off the bedrolls.' },

  iron_toolkit: { id: 'iron_toolkit', name: 'Iron toolkit', category: 'tool', weightLbPerUnit: 20, description: 'Unlocks proper wagon repairs. Without it, repairs cost 2× the spare parts.' },
  cookware: { id: 'cookware', name: 'Cookware', category: 'tool', weightLbPerUnit: 15, description: 'Required to boil water (post-1854). Meals taste better, small morale bump.' },
  rope: { id: 'rope', name: 'Rope', category: 'tool', weightLbPerUnit: 8, description: 'Lower wagons down steep grades, secure loads, rescue fallen oxen.' },
  shovel: { id: 'shovel', name: 'Shovel', category: 'tool', weightLbPerUnit: 5, description: 'Enables well-digging, grave-digging, wagon extraction. Auto-digs firepit + latrine each camp.' },
  // Cheese press kit (#139) — wooden hoop, cheesecloth, rennet jar,
  // weight stones gathered at camp. Period dairying staple for
  // emigrant families with milk cows. One kit, many cheeses.
  cheese_press: { id: 'cheese_press', name: 'Cheese press', category: 'tool', weightLbPerUnit: 8, description: 'Hoop, cheesecloth, and rennet jar for pressing farmer\'s cheese. 2 gal milk → 2 lb cheese in a 2-hour camp action.' },
  // Butter crock (#222) — covered tin pail with paddle dasher mounted
  // in the lid. Hung under the wagon seat; the day's bouncing churns
  // cream into butter automatically. Period-perfect emigrant kitchen
  // gear, mentioned by name in dozens of trail diaries.
  butter_crock: { id: 'butter_crock', name: 'Butter crock', category: 'tool', weightLbPerUnit: 6, description: 'Covered tin pail with a paddle dasher in the lid. Hung in the wagon, churns 2 gal milk into 1 lb butter on every travel day.' },
  salt: { id: 'salt', name: 'Salt', category: 'tool', weightLbPerUnit: 1, description: 'Preserves fresh game meat. Multiplies curing speed, reduces spoilage loss during the jerk process.' },
  // Saleratus — sodium bicarbonate (period name for baking soda). Tiny
  // bag, big quality-of-life: leavens biscuits, settles upset stomachs,
  // counters alkali water sour. Period diaries mention it constantly.
  saleratus: { id: 'saleratus', name: 'Saleratus', category: 'tool', weightLbPerUnit: 0.5, description: 'Period baking soda. Leavens biscuits, settles stomachs, sweetens alkali water.' },
  // Soap (#269) — bar of lye soap. With 1+ bar in inventory the
  // wash_clothes camp action lifts cleanliness +50 instead of +30
  // (matches the bath-house single-visit boost) and consumes 1 bar.
  // Period reality: Frizzell 1852, Sarah Royce 1849 mention soap
  // running out by Fort Laramie; lye-soap making was a regular camp
  // chore — wood ash + tallow boiled down to a hard cake. The
  // make_soap camp action models the craft path (see camp-actions.ts).
  soap: { id: 'soap', name: 'Soap', category: 'tool', weightLbPerUnit: 0.5, description: 'Bar of lye soap. Wash clothes & bathe lifts cleanliness +50 instead of +30, consuming one bar.' },
  // Lard — rendered pork fat in a tin. Multi-use frontier staple:
  // cooking grease (every camp meal), axle dressing if you run out of
  // tar, skin salve for chapped hands and sunburn.
  lard: { id: 'lard', name: 'Lard', category: 'tool', weightLbPerUnit: 5, description: 'Rendered pork fat. Cooks meals, greases axles in a pinch, salves chapped skin.' },
  compass: { id: 'compass', name: 'Compass', category: 'tool', weightLbPerUnit: 0.5, description: 'Reduces the chance of being lost in storms or fog.' },
  // #1023 — water_bag is the generic catch-all for extra water carry,
  // not specifically a rubber bag. Pivoted from the original Goodyear-
  // bag framing because period emigrants on dry stretches packed
  // every container they had: rubber bags (1849+), auxiliary oak
  // kegs, gourds, bottles, tin canteens. Bidwell 1841 before
  // Humboldt Sink: "filled every keg, every gourd, every bottle we
  // had." Royce 1849 before the Forty-Mile Desert: "the men spent
  // the day binding extra kegs and bottles to the wagon." Carpenter
  // 1857 specifically at Hall: "two rubber bags at Hall, four
  // dollars apiece" — that's where the price anchor still lives.
  // Year-gating intentionally not enforced (#1019 deferred to the
  // continuous temperature model) — for a pre-1849 emigrant, the
  // same +5 gal abstracts as an extra keg or gourd assembly.
  water_bag: { id: 'water_bag', name: 'Water vessels', category: 'tool', weightLbPerUnit: 2, description: '+5 gal water carry cap each. Rubber bag, auxiliary keg, gourd, or bottle — period emigrants packed every vessel they could before dry stretches.' },
  ox_shoes: { id: 'ox_shoes', name: 'Ox / mule shoes', category: 'livestock', weightLbPerUnit: 2, description: 'Replace shoes that oxen or mules throw on rocky terrain. A Blacksmith or Teamster re-shoes them.' },
  spyglass: { id: 'spyglass', name: 'Spyglass', category: 'tool', weightLbPerUnit: 2, description: 'Reveals landmarks further ahead on the map. Helps with spotting game on hunts.' },

  quinine: { id: 'quinine', name: 'Quinine', category: 'medicine', weightLbPerUnit: 0.2, description: 'Treats fever, malaria, typhoid, cholera.' },
  laudanum: { id: 'laudanum', name: 'Laudanum', category: 'medicine', weightLbPerUnit: 0.2, description: 'Opium tincture. Treats pain, broken bones. Risk of dependency with heavy use.' },
  calomel: { id: 'calomel', name: 'Calomel', category: 'medicine', weightLbPerUnit: 0.2, description: 'Treats dysentery effectively — but mercury poisoning permanently lowers max health.' },
  bandages: { id: 'bandages', name: 'Bandages', category: 'medicine', weightLbPerUnit: 1, description: 'Treats wounds, snakebite, broken bones.' },
  herbal_poultice: { id: 'herbal_poultice', name: 'Herbal poultice', category: 'medicine', weightLbPerUnit: 0.5, description: 'Weaker than modern medicine. Foraged or Preacher-made.' },
  patent_medicine: { id: 'patent_medicine', name: 'Patent medicine', category: 'medicine', weightLbPerUnit: 0.5, description: 'Gamble: 50% heal / 35% nothing / 15% mild harm. Era-accurate snake oil.' },
  // Vinegar — sold in stoneware jugs (~1 gal, ~8 lb). Period
  // antiscorbutic and food preservative. Modest scurvy edge for parties
  // running out of dried fruit on long stretches.
  vinegar: { id: 'vinegar', name: 'Vinegar', category: 'medicine', weightLbPerUnit: 8, description: 'Stoneware jug. Wards off scurvy and preserves food when dried fruit runs thin.' },
  // Period medicine kit fill-out (#213). Each was a real wagon-chest
  // staple per Marcy / Gunn's Domestic Medicine. Mechanical role: gentler
  // alternatives to the harsh calomel + quinine tier. They list as
  // treatmentItems so events / future treat-action surfaces them.
  epsom_salts: { id: 'epsom_salts', name: 'Epsom salts', category: 'medicine', weightLbPerUnit: 0.5, description: 'Magnesium-sulfate crystals. Mild purgative for "bilious complaints" and a wound soak. Gentler than calomel.' },
  camphor: { id: 'camphor', name: 'Camphor', category: 'medicine', weightLbPerUnit: 0.2, description: 'Aromatic gum. Rubbed on the chest for colds; widely (mistakenly) carried as a cholera prophylactic.' },
  paregoric: { id: 'paregoric', name: 'Paregoric', category: 'medicine', weightLbPerUnit: 0.2, description: 'Camphorated opium tincture, weaker than laudanum. The era\'s standard for children\'s diarrhea and teething.' },
  hartshorn: { id: 'hartshorn', name: 'Hartshorn', category: 'medicine', weightLbPerUnit: 0.2, description: 'Smelling salts (ammonium carbonate). Revives faints; folk-applied to snakebite for nervous shock.' },
  dovers_powder: { id: 'dovers_powder', name: "Dover's powder", category: 'medicine', weightLbPerUnit: 0.2, description: 'Opium + ipecac. Induces sweating; given for fever — the period go-to for cholera, typhoid, measles.' },
  castor_oil: { id: 'castor_oil', name: 'Castor oil', category: 'medicine', weightLbPerUnit: 0.5, description: 'Vegetable purgative. The mild children\'s laxative; gentler than calomel for dysentery.' },

  tobacco: { id: 'tobacco', name: 'Tobacco', category: 'comfort', weightLbPerUnit: 1, description: 'Morale consumable. Also Native American trade currency.' },
  whiskey: { id: 'whiskey', name: 'Whiskey', category: 'comfort', weightLbPerUnit: 4, description: 'Morale bump. Small cold-exposure heal. Rare dependency risk.' },
  harmonica: { id: 'harmonica', name: 'Harmonica', category: 'comfort', weightLbPerUnit: 0.2, description: 'Unlocks the Entertain camp action — boosts morale.' },
  fiddle: { id: 'fiddle', name: 'Fiddle', category: 'comfort', weightLbPerUnit: 3, description: 'Larger morale bump than a harmonica. Keeps spirits up on long nights.' },
  bible: { id: 'bible', name: 'Bible', category: 'comfort', weightLbPerUnit: 2, description: '+2 passive morale while owned. Enables Preacher\'s camp service.' },
  // #317a — McGuffey's Eclectic Reader (1836-1879) was THE 1840s
  // schoolbook; ~$0.30 in period dollars, common emigrant load. Drives
  // the Teacher's daily morale bonus (the schoolmarm reading aloud at
  // camp) + the future Teach-the-kids camp action (#317c).
  primer: { id: 'primer', name: "McGuffey's Reader", category: 'comfort', weightLbPerUnit: 0.5, description: 'Schoolbook of letters and morals. With a Teacher in the party, restores +1 morale/day from camp lessons.' },
  // The grandfather clock is a luxury haul — useless on the trail, but
  // delivering it to Oregon City is a major prestige score bonus (#148).
  // 100 lb of solid walnut + brass eats real wagon capacity, so taking
  // one is a deliberate trade-off.
  grandfather_clock: { id: 'grandfather_clock', name: 'Grandfather clock', category: 'comfort', weightLbPerUnit: 100, description: 'Useless on the trail. Delivered to Oregon City: a massive prestige score bonus.' },
  // Anvil — the headline blacksmith haul. Settlers really did pack 80-100 lb
  // anvils to set up forges in Oregon. Cheap to buy, brutal to haul. Big
  // prestige bonus for delivery, just behind the grandfather clock.
  anvil: { id: 'anvil', name: 'Anvil', category: 'comfort', weightLbPerUnit: 80, description: 'A blacksmith\'s anvil. 80 lb of dead weight on the trail; a frontier livelihood at the end of it.' },
  // China tea set — porcelain service in a packing crate. Status item;
  // half the wagons that started with one buried it on the high plains.
  // Surviving sets are a major prestige delivery.
  china_tea_set: { id: 'china_tea_set', name: 'China tea set', category: 'comfort', weightLbPerUnit: 25, description: 'Porcelain service in a packing crate. Fragile, prestigious, and surprisingly heavy.' },
  // Feather mattress — bulky comfort haul. Common in early packing
  // lists, often abandoned at Independence Rock when wagons lightened.
  feather_mattress: { id: 'feather_mattress', name: 'Feather mattress', category: 'comfort', weightLbPerUnit: 40, description: 'Bulky comfort. Often abandoned at Independence Rock — the ones that arrive are prized.' },

  // #277 — Frontier-startup items. Not trail consumables — these are
  // the tools, seeds, books, and heirlooms emigrants packed for the
  // life waiting at the end of the trail. Heavy to haul, big arrival
  // score on delivery, each tied to an epilogue paragraph in the
  // arrival screen. Research grounded in `docs/historical-pass/07-frontier-startups.md`.
  // Buy-at-Independence only (mostly) — period reality, you couldn't
  // pick up a printing press at Fort Bridger.

  // Farmer's startup kit
  seed_grain:           { id: 'seed_grain',           name: 'Seed grain',           category: 'tool', weightLbPerUnit:  80, description: "Wheat / corn / oats / barley in tin cans, sealed with wax. Plants the first crop after arrival. Useless on the trail — pure delivery bonus." },
  fruit_tree_saplings:  { id: 'fruit_tree_saplings',  name: 'Fruit-tree saplings',  category: 'tool', weightLbPerUnit: 100, description: "Grafted apple / peach / cherry saplings rooted in soil-filled boxes. Henderson Luelling's 1847 wagon seeded the entire Willamette Valley fruit industry." },
  garden_seeds:         { id: 'garden_seeds',         name: 'Garden seeds',         category: 'tool', weightLbPerUnit:   5, description: 'Oilskin packets — potatoes, beans, peas, carrots, cabbage, turnips, onions, herbs. The kitchen garden of the new homestead.' },
  plow:                 { id: 'plow',                 name: 'Plow',                 category: 'tool', weightLbPerUnit:  60, description: 'Disassembled — moldboard, share, beam, handles. Breaks new ground when the wagons stop.' },
  fruit_vine_cuttings:  { id: 'fruit_vine_cuttings',  name: 'Fruit-vine cuttings',  category: 'tool', weightLbPerUnit:  20, description: 'Grape and hop cuttings rooted in damp moss. Grapes for wine, hops for beer.' },

  // Carpenter's startup kit — the tool chest builds the homestead and
  // every neighbor's barn that first year. Hancock 1852 Lane County
  // case study: 150 lb of tools, paid in beef, milk, lodging.
  carpenter_chest:      { id: 'carpenter_chest',      name: 'Carpenter chest',      category: 'tool', weightLbPerUnit: 120, description: "Felling axe, broadaxe, adze, rip + crosscut saws, planes, brace + bits, chisels, square, levels, nails. Hancock 1852: 'Built three buildings the first month.'" },

  // Doctor's startup kit
  medicine_chest:       { id: 'medicine_chest',       name: 'Fitted medicine chest', category: 'tool', weightLbPerUnit:  30, description: '30-60 vial fitted oak case — laudanum, calomel, quinine, ipecac, mercurial pills, blistering plasters, paregoric, jalap. The frontier physician\'s working tool.' },
  medical_books:        { id: 'medical_books',        name: 'Medical books',         category: 'comfort', weightLbPerUnit: 12, description: "Gunn's *Domestic Medicine*, Buchan, Eberle, anatomy atlas. The frontier doctor's library." },

  // Banker's / merchant's startup kit
  iron_strongbox:       { id: 'iron_strongbox',       name: 'Iron strongbox',        category: 'tool', weightLbPerUnit:  40, description: 'Lockable iron chest — ledgers, deeds, gold. The famous "Donner Party strongbox" was a banker\'s.' },
  gold_scales:          { id: 'gold_scales',          name: 'Gold scales',           category: 'tool', weightLbPerUnit:   3, description: "Apothecary's brass balance, calibrated to the grain. Indispensable after Sutter's strike." },
  trade_inventory:      { id: 'trade_inventory',      name: 'Trade-goods inventory', category: 'tool', weightLbPerUnit:  80, description: 'Bolts of calico, needles, knives, mirrors, beads, kettles. Seed inventory for a frontier mercantile.' },
  printing_press:       { id: 'printing_press',       name: 'Printing press',        category: 'tool', weightLbPerUnit: 200, description: "Lever press — Sam Brannan's *California Star* model. The territory's first newspaper rolls off this." },

  // Cross-cutting (any profession can carry, big claim-filing payoff)
  surveying_kit:        { id: 'surveying_kit',        name: 'Surveying kit',         category: 'tool', weightLbPerUnit:  60, description: 'Transit, chain, plumb. Files Donation Land Claims with proper boundaries; every fence line in the county follows these notes.' },

  // Heirloom layer — comfort category. Sentimental items with light
  // gameplay weight, real arrival-score weight.
  family_bible:         { id: 'family_bible',         name: 'Family Bible',          category: 'comfort', weightLbPerUnit: 12, description: "Large family edition — three generations of births recorded in the front. Distinct from the pocket Bible (the trail-flavor item)." },
  silver_tea_service:   { id: 'silver_tea_service',   name: 'Silver tea service',    category: 'comfort', weightLbPerUnit: 15, description: 'Wedding-gift heirloom — silver pot, sugar bowl, creamer, six cups. Lashed deep in the trunk for 2000 miles.' },
  shelf_clock:          { id: 'shelf_clock',          name: 'Shelf clock',           category: 'comfort', weightLbPerUnit: 25, description: "Smaller than a grandfather. Tick-tock in the parlor while the snow falls outside." },
  feather_pillows:      { id: 'feather_pillows',      name: 'Feather pillows',       category: 'comfort', weightLbPerUnit:  8, description: 'Set of four. Pairs with a feather mattress for the first soft sleep your children remember.' },
  sewing_chest:         { id: 'sewing_chest',         name: 'Sewing chest',          category: 'tool',    weightLbPerUnit: 20, description: 'Full kit + fabric stash — needles, thread, scissors, shears, thimbles, fabric bolts, button card. Frontier wives sewed everything from shirts to wagon canvas.' },
  daguerreotype_case:   { id: 'daguerreotype_case',   name: 'Daguerreotype case',    category: 'comfort', weightLbPerUnit:  1, description: 'Tinted glass-plate portraits in hinged morocco-leather case — the only picture of your mother that survived the trip.' },
  lap_desk:             { id: 'lap_desk',             name: 'Lap desk',              category: 'tool',    weightLbPerUnit:  8, description: 'Hinged writing-box with quills, ink, paper. Letters home went through this every Sunday.' },

  moccasins: { id: 'moccasins', name: 'Moccasins', category: 'native_trade', weightLbPerUnit: 1, description: 'Warmth +10 per person. Lightweight cold mitigation; pairs well with a coat.' },
  buffalo_robe: { id: 'buffalo_robe', name: 'Buffalo robe', category: 'native_trade', weightLbPerUnit: 8, description: 'Warmth +25 per person. Heavy but the warmest single item — indispensable in winter.' },
  beads: { id: 'beads', name: 'Trade beads / calico', category: 'native_trade', weightLbPerUnit: 2, description: 'Currency for trading with Native tribes.' },

  // #216 — Plains trader's pack. Marcy 1859 explicit list of trinkets
  // emigrants carried specifically for native trade. Catlin's accounts
  // and Frizzell / Royce diaries map the values:
  //   - mirror:       small hand mirror, dance regalia + adornment
  //   - vermilion:    mercury-sulfide red paint, most-prized item west
  //                   of the Missouri; warpaint and ceremonial use
  //   - awl:          iron sewing punch, replaced bone awls (high utility)
  //   - thimble:      brass/iron, hide-sewing utility + worn as pendants
  //   - calico:       printed cotton bolt (5 yards), dressmaking + regalia
  //   - pocket_knife: folding Barlow knife, universal utility
  // Yields better trade outcomes than tobacco/beads in the toll/trade
  // encounters that accept them; vermilion sits at the top of the
  // hierarchy.
  mirror:       { id: 'mirror',       name: 'Hand mirror',      category: 'native_trade', weightLbPerUnit: 0.3,  description: 'Small silvered glass. Highly prized — used in dance regalia and personal adornment. Trade good.' },
  vermilion:    { id: 'vermilion',    name: 'Vermilion',        category: 'native_trade', weightLbPerUnit: 0.2,  description: 'Mercury-sulfide red pigment for warpaint and ceremonial use. The most-prized trade item west of the Missouri.' },
  awl:          { id: 'awl',          name: 'Iron awl',         category: 'native_trade', weightLbPerUnit: 0.1,  description: 'Iron sewing punch. Replaces bone awls — a Shoshone woman will trade well for one.' },
  thimble:      { id: 'thimble',      name: 'Sewing thimble',   category: 'native_trade', weightLbPerUnit: 0.05, description: 'Brass thimble. Hide-sewing utility plus pendant value in regalia.' },
  calico:       { id: 'calico',       name: 'Calico cloth',     category: 'native_trade', weightLbPerUnit: 1,    description: 'Printed cotton, ~5 yards per bolt. Plains women make dresses and ceremonial garb.' },
  pocket_knife: { id: 'pocket_knife', name: 'Pocket knife',     category: 'native_trade', weightLbPerUnit: 0.1,  description: 'Folding Barlow knife. Universal utility — Frizzell traded one for an 8-lb salmon.' }
};

export function getItem(id: string): ItemMeta {
  const i = ITEMS[id];
  if (!i) throw new Error(`Unknown item: ${id}`);
  return i;
}

export function foodItemIds(): string[] {
  return Object.values(ITEMS)
    .filter((i) => i.category === 'food' && typeof i.foodDrawOrder === 'number')
    .sort((a, b) => (a.foodDrawOrder! - b.foodDrawOrder!))
    .map((i) => i.id);
}

/** #1642 — canonical food accounting. Everything the daily consumption
 *  engine will eat (= items carrying foodDrawOrder), summed in pounds.
 *  The AI layer previously kept two hand-typed subsets of this list
 *  (bundle.ts totalFoodLb, personas.ts foodOnHand) that had drifted
 *  from the catalog and from each other. */
export function foodLb(inventory: Record<string, number | undefined>): number {
  return foodItemIds().reduce((sum, id) => sum + (inventory[id] ?? 0), 0);
}

/** Shelf-stable subset: foodDrawOrder >= 1. Tier 0 is the spoils-fast
 *  shelf (berries / egg / game_meat / milk / prize_cut — the engine eats
 *  them first for exactly that reason), so planning horizons like the
 *  bot's hunt scheduling exclude them. */
export function shelfStableFoodIds(): string[] {
  return Object.values(ITEMS)
    .filter((i) => i.category === 'food' && (i.foodDrawOrder ?? -1) >= 1)
    .sort((a, b) => (a.foodDrawOrder! - b.foodDrawOrder!))
    .map((i) => i.id);
}

export function shelfStableFoodLb(inventory: Record<string, number | undefined>): number {
  return shelfStableFoodIds().reduce((sum, id) => sum + (inventory[id] ?? 0), 0);
}
