// ============================================================================
// OUTFIT — data layer
// ============================================================================
// Wagon catalog, oxen pricing, focused item subset, default party state.
// Sourced verbatim from:
//   src/lib/game/content/wagons.ts
//   src/lib/game/content/starter-kit.ts
//   src/lib/game/content/outfitter.ts (subset)
//   src/lib/game/content/items.ts (subset)
// ============================================================================

// ---------- WAGONS ----------
window.OF_WAGONS = {
  light: {
    id: 'light',
    name: 'Light wagon',
    shortName: 'Light',
    price: 50,
    carryCapacity: 1500,
    baseSpeedMult: 1.10,
    optimalTeam: 2,
    minTeam: 1,
    chickenCap: 3,
    requiredYokes: 1,
    blurb: "A small farm wagon. Quick over flat ground, easy on a pair of oxen, tight on room. Cheapest option — and the fastest, if you pack light.",
    chip: 'Fastest',
    chipTone: 'good',
  },
  prairie_schooner: {
    id: 'prairie_schooner',
    name: 'Prairie schooner',
    shortName: 'Prairie',
    price: 100,
    carryCapacity: 2500,
    baseSpeedMult: 1.00,
    optimalTeam: 4,
    minTeam: 2,
    chickenCap: 5,
    requiredYokes: 2,
    blurb: "The classic Oregon Trail wagon. Arched canvas over a 4×10 ft bed, built for the crossing. What most emigrants took.",
    chip: 'Recommended',
    chipTone: 'rust',
  },
  heavy: {
    id: 'heavy',
    name: 'Heavy freighter',
    shortName: 'Heavy',
    price: 175,
    carryCapacity: 3500,
    baseSpeedMult: 0.85,
    optimalTeam: 6,
    minTeam: 4,
    chickenCap: 8,
    requiredYokes: 3,
    blurb: "A freight-class wagon with a Conestoga curved bed. Roomy enough for a small household; slow, and a full team eats. Many owners swapped down here.",
    chip: 'Roomiest',
    chipTone: 'neutral',
  },
};

window.OF_WAGON_ORDER = ['light', 'prairie_schooner', 'heavy'];

// ---------- OXEN ----------
// At Independence ~$25–$30/head. The wagon catalog's optimalTeam fields
// determine the picker bounds; we anchor on 6 starter oxen at default.
window.OF_OX_PRICE = 28;
window.OF_OX_MIN = 1;
window.OF_OX_MAX = 10;
window.OF_OX_DEFAULT = 6;

// ---------- ITEMS ----------
// Focused subset of outfitter.ts — most-visible categories. Names + categories
// match the game catalog. Weight + price calibrated against items.ts and prices.ts.
window.OF_ITEMS = {
  // ── Food (Marcy-5 staples + bonus) ──
  // `lot` = how many units the stepper bumps by default (e.g. flour sold by
  //         the 10-lb sack). `unit` is the period label shown in the row.
  // `bulk` = optional quick-add chip quantities (e.g. "+25" / "+50").
  flour:        { name: 'Flour',          cat: 'food',     w: 1.0,  buy: 0.05, icon: '🌾', tags: ['staple'], lot: 10, unit: '10-lb sack', bulk: [25, 50] },
  cornmeal:     { name: 'Cornmeal',       cat: 'food',     w: 1.0,  buy: 0.04, icon: '🌽', tags: ['staple'], lot: 10, unit: '10-lb sack', bulk: [25] },
  beans:        { name: 'Beans',          cat: 'food',     w: 1.0,  buy: 0.06, icon: '🫘', tags: ['staple'], lot: 5,  unit: 'peck (5 lb)', bulk: [25] },
  bacon:        { name: 'Bacon',          cat: 'food',     w: 1.0,  buy: 0.15, icon: '🥓', tags: ['staple'], lot: 1,  unit: 'lb', bulk: [10, 25] },
  salt_pork:    { name: 'Salt pork',      cat: 'food',     w: 1.0,  buy: 0.18, icon: '🥩', tags: ['staple'], lot: 1,  unit: 'lb', bulk: [10] },
  hardtack:     { name: 'Hardtack',       cat: 'food',     w: 0.5,  buy: 0.10, icon: '🍞', lot: 5,  unit: '5-lb tin' },
  dried_fruit:  { name: 'Dried fruit',    cat: 'food',     w: 0.5,  buy: 0.20, icon: '🍇', lot: 5,  unit: '5-lb sack' },
  sugar:        { name: 'Sugar',          cat: 'food',     w: 1.0,  buy: 0.12, icon: '🍯', lot: 5,  unit: '5-lb loaf' },
  coffee:       { name: 'Coffee',         cat: 'food',     w: 1.0,  buy: 0.18, icon: '☕' },
  tea:          { name: 'Tea',            cat: 'food',     w: 0.5,  buy: 0.50, icon: '🍵' },
  salt:         { name: 'Salt',           cat: 'food',     w: 1.0,  buy: 0.06, icon: '🧂' },
  saleratus:    { name: 'Saleratus',      cat: 'food',     w: 0.5,  buy: 0.20, icon: '🥄' },

  // ── Livestock & feed ──
  yoke:         { name: 'Yoke',           cat: 'livestock', w: 8.0,  buy: 2.50, icon: '🪵', tags: ['critical'] },
  ox_bow:       { name: 'Ox bow (spare)', cat: 'livestock', w: 3.0,  buy: 1.00, icon: '⚒️' },
  chicken:      { name: 'Chicken',        cat: 'livestock', w: 5.0,  buy: 0.50, icon: '🐔' },
  milk_cow:     { name: 'Milk cow',       cat: 'livestock', w: 0,    buy: 25.00, icon: '🐄' },
  grain:        { name: 'Grain (oats)',   cat: 'livestock', w: 1.0,  buy: 0.04, icon: '🌾' },

  // ── Wagon parts ──
  wheel:        { name: 'Spare wheel',    cat: 'wagon',    w: 30.0, buy: 8.00, icon: '⚙️' },
  axle:         { name: 'Spare axle',     cat: 'wagon',    w: 35.0, buy: 6.00, icon: '🪛' },
  tongue:       { name: 'Spare tongue',   cat: 'wagon',    w: 25.0, buy: 4.00, icon: '🪵' },
  canvas:       { name: 'Spare canvas',   cat: 'wagon',    w: 20.0, buy: 5.00, icon: '⛺' },
  spare_plank:  { name: 'Spare planks',   cat: 'wagon',    w: 8.0,  buy: 1.50, icon: '🪵' },
  tar_bucket:   { name: 'Tar bucket',     cat: 'wagon',    w: 6.0,  buy: 1.00, icon: '🪣' },

  // ── Weapons ──
  rifle:        { name: 'Rifle',          cat: 'weapons',  w: 8.0,  buy: 18.00, icon: '🔫', tags: ['critical'] },
  gunpowder:    { name: 'Gunpowder',      cat: 'weapons',  w: 1.0,  buy: 0.40, icon: '💥', lot: 1,  unit: 'lb', bulk: [10, 25] },
  lead_balls:   { name: 'Lead balls',     cat: 'weapons',  w: 0.05, buy: 0.03, icon: '⚪', lot: 25, unit: 'box of 25', bulk: [100, 250] },
  percussion_caps:{ name: 'Percussion caps', cat: 'weapons', w: 0.01, buy: 0.02, icon: '🎯', lot: 25, unit: 'tin of 25', bulk: [100, 250] },

  // ── Clothing ──
  coat:         { name: 'Coat',           cat: 'clothing', w: 3.0,  buy: 4.00, icon: '🧥', tags: ['per_soul'] },
  boots:        { name: 'Boots',          cat: 'clothing', w: 2.0,  buy: 3.50, icon: '👢', tags: ['per_soul'] },
  blanket:      { name: 'Wool blanket',   cat: 'clothing', w: 4.0,  buy: 2.50, icon: '🧣', tags: ['per_soul'] },
  tent:         { name: 'Tent',           cat: 'clothing', w: 20.0, buy: 7.00, icon: '⛺' },

  // ── Tools ──
  iron_toolkit: { name: 'Iron toolkit',   cat: 'tools',    w: 15.0, buy: 6.50, icon: '🛠️' },
  cookware:     { name: 'Cookware',       cat: 'tools',    w: 8.0,  buy: 3.00, icon: '🍳' },
  rope:         { name: 'Rope (50 ft)',   cat: 'tools',    w: 2.0,  buy: 0.50, icon: '🪢' },
  shovel:       { name: 'Shovel',         cat: 'tools',    w: 4.0,  buy: 1.50, icon: '🪏' },
  water_bag:    { name: 'Water bag',      cat: 'tools',    w: 1.0,  buy: 1.50, icon: '💧' },
  ox_shoes:     { name: 'Ox shoes',       cat: 'tools',    w: 1.0,  buy: 0.80, icon: '🐾' },
  compass:      { name: 'Compass',        cat: 'tools',    w: 0.3,  buy: 2.00, icon: '🧭' },
  spyglass:     { name: 'Spyglass',       cat: 'tools',    w: 1.0,  buy: 5.00, icon: '🔭' },

  // ── Medicine ──
  quinine:      { name: 'Quinine',        cat: 'medicine', w: 0.1,  buy: 1.50, icon: '💊' },
  laudanum:     { name: 'Laudanum',       cat: 'medicine', w: 0.1,  buy: 2.50, icon: '🧪' },
  calomel:      { name: 'Calomel',        cat: 'medicine', w: 0.1,  buy: 1.00, icon: '💊' },
  bandages:     { name: 'Bandages',       cat: 'medicine', w: 0.2,  buy: 0.40, icon: '🩹' },
  herbal_poultice: { name: 'Herbal poultice', cat: 'medicine', w: 0.2, buy: 0.80, icon: '🌿' },
  patent_medicine: { name: 'Patent medicine', cat: 'medicine', w: 0.2, buy: 1.20, icon: '🍶' },

  // ── Comfort ──
  tobacco:      { name: 'Tobacco',        cat: 'comfort',  w: 0.5,  buy: 0.50, icon: '🍂' },
  whiskey:      { name: 'Whiskey',        cat: 'comfort',  w: 2.0,  buy: 1.20, icon: '🥃' },
  harmonica:    { name: 'Harmonica',      cat: 'comfort',  w: 0.1,  buy: 1.00, icon: '🎶' },
  fiddle:       { name: 'Fiddle',         cat: 'comfort',  w: 1.5,  buy: 8.00, icon: '🎻' },
  bible:        { name: 'Bible',          cat: 'comfort',  w: 2.0,  buy: 2.50, icon: '📖' },
  primer:       { name: "Children's primer", cat: 'comfort', w: 0.5, buy: 1.00, icon: '📚' },

  // ── Native trade goods (#216) — Plains-trader pack ──
  mirror:       { name: 'Hand mirror',    cat: 'trade',    w: 0.2,  buy: 0.40, icon: '🪞' },
  vermilion:    { name: 'Vermilion',      cat: 'trade',    w: 0.05, buy: 0.80, icon: '🟥' },
  awl:          { name: 'Awl',            cat: 'trade',    w: 0.1,  buy: 0.30, icon: '🪡' },
  thimble:      { name: 'Thimble',        cat: 'trade',    w: 0.05, buy: 0.20, icon: '🪡' },
  calico:       { name: 'Calico cloth',   cat: 'trade',    w: 1.0,  buy: 0.60, icon: '🪡' },
  pocket_knife: { name: 'Pocket knife',   cat: 'trade',    w: 0.2,  buy: 0.80, icon: '🔪' },

  // ── Frontier-startup luxuries (#148, #277) ──
  // Heavy, expensive, arrival-prestige only.
  plow:           { name: 'Plow',                 cat: 'luxury', w: 75,  buy: 18.00, icon: '🚜', tags: ['prestige'] },
  seed_grain:     { name: 'Seed grain',           cat: 'luxury', w: 50,  buy: 8.00,  icon: '🌾', tags: ['prestige'] },
  fruit_tree_saplings: { name: 'Fruit saplings',  cat: 'luxury', w: 30,  buy: 12.00, icon: '🌳', tags: ['prestige'] },
  garden_seeds:   { name: 'Garden seeds',         cat: 'luxury', w: 2,   buy: 3.00,  icon: '🌱', tags: ['prestige'] },
  carpenter_chest:{ name: 'Carpenter chest',      cat: 'luxury', w: 80,  buy: 22.00, icon: '🪚', tags: ['prestige'] },
  medicine_chest: { name: 'Full medicine chest',  cat: 'luxury', w: 25,  buy: 14.00, icon: '🧰', tags: ['prestige'] },
  printing_press: { name: 'Printing press',       cat: 'luxury', w: 200, buy: 45.00, icon: '🗞️', tags: ['prestige'] },
  surveying_kit:  { name: 'Surveying kit',        cat: 'luxury', w: 20,  buy: 18.00, icon: '📐', tags: ['prestige'] },
  family_bible:   { name: 'Family bible',         cat: 'luxury', w: 8,   buy: 6.00,  icon: '📖', tags: ['prestige'] },
  silver_tea_service: { name: 'Silver tea service', cat: 'luxury', w: 12, buy: 30.00, icon: '🫖', tags: ['prestige'] },
  shelf_clock:    { name: 'Shelf clock',          cat: 'luxury', w: 15,  buy: 12.00, icon: '🕰️', tags: ['prestige'] },
  feather_mattress:{ name: 'Feather mattress',    cat: 'luxury', w: 40,  buy: 16.00, icon: '🛏️', tags: ['prestige'] },
  daguerreotype_case:{ name: 'Daguerreotype case', cat: 'luxury', w: 6,  buy: 20.00, icon: '🖼️', tags: ['prestige'] },
  sewing_chest:   { name: 'Sewing chest',         cat: 'luxury', w: 12,  buy: 9.00,  icon: '🧵', tags: ['prestige'] },
  lap_desk:       { name: 'Lap desk',             cat: 'luxury', w: 8,   buy: 7.00,  icon: '✍️', tags: ['prestige'] },
  grandfather_clock: { name: 'Grandfather clock', cat: 'luxury', w: 100, buy: 38.00, icon: '🕰️', tags: ['prestige'] },
  iron_strongbox: { name: 'Iron strongbox',       cat: 'luxury', w: 60,  buy: 16.00, icon: '🗃️', tags: ['prestige'] },
};

window.OF_CATEGORY_LABEL = {
  food:      'Provisions',
  livestock: 'Livestock & feed',
  wagon:     'Wagon parts',
  weapons:   'Powder & shot',
  clothing:  'Clothing & shelter',
  tools:     'Tools',
  medicine:  'Medicine',
  comfort:   'Comforts',
  trade:     'Trade goods',
  luxury:    'Frontier startup',
};
window.OF_CATEGORY_ORDER = ['food','livestock','wagon','weapons','clothing','tools','medicine','comfort','trade','luxury'];
window.OF_CATEGORY_SUB = {
  food:      'Marcy 1859 puts these at the top of every list.',
  livestock: 'Yokes hitch the team. A milk cow is luxury most skip.',
  wagon:     'Spares for when things break — and they will.',
  weapons:   'For hunting and emergencies. Stretch the powder.',
  clothing:  'One coat, blanket, boots per soul. Add a tent.',
  tools:     'Tools, cookware, and the gear of daily camp.',
  medicine:  'Fever, dysentery, broken bones. Carpenter 1857: "restock at every fort."',
  comfort:   'Whiskey for Bridger; a fiddle for the cold nights.',
  trade:     'Hand-mirrors, vermilion, calico — useful at every Plains crossing.',
  luxury:    'Useless on the trail. Counts toward your arrival score in Oregon.',
};

// ---------- PARTY ----------
window.OF_DEFAULT_PARTY = {
  leaderName: 'Ezra',
  partySize: 5, // includes leader; per-soul gear scales with this
  professions: ['farmer','doctor','carpenter','hunter','child'],
  cash: 400,       // BASE_KIT.cash
  startCash: 400,
  refundIfSkipKit: 500, // STARTER_KIT_REFUND
};

// ---------- BASE STARTER KIT (when toggle is on) ----------
// Adapted from BASE_KIT + per-soul gear additions in buildStarterKit().
// Yoke counts get added per wagon-model in the renderer.
window.OF_BASE_KIT = {
  // food
  flour: 600, beans: 80, bacon: 100, hardtack: 50, dried_fruit: 40,
  sugar: 25, coffee: 4, salt: 2, saleratus: 4,
  // medicine
  quinine: 4, calomel: 2, laudanum: 2, paregoric: 2, bandages: 8,
  // tools
  shovel: 1, cookware: 1, rope: 1,
  // weapons + camp
  rifle: 1, gunpowder: 30, lead_balls: 30, percussion_caps: 30, tent: 1,
  // per-soul (scaled in renderer; baseline 1 each, will be ×partySize)
  coat: 1, blanket: 1, boots: 1,
};

// ---------- HELPERS ----------
window.OF_money = function(n) {
  const v = Math.round(n * 100) / 100;
  return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2);
};

window.OF_money0 = function(n) {
  const v = Math.round(n);
  return (v < 0 ? '-$' : '$') + Math.abs(v).toString();
};

window.OF_itemWeight = function(id, qty) {
  return (window.OF_ITEMS[id]?.w ?? 0) * qty;
};

window.OF_totalWeight = function(inv) {
  return Object.entries(inv).reduce((s, [id, q]) => s + window.OF_itemWeight(id, q ?? 0), 0);
};

// Build the full starting inventory for a given party state.
//
//   includeKit: true  → BASE_KIT staples + per-soul gear + yokes
//   includeKit: false → empty (player will buy everything)
//
// Cash is set by the caller. Wagon model is added on top in either case
// (the wagon itself is a separate purchase line, but its requiredYokes
// are added here so the player can hitch the team).
window.OF_buildStarter = function(partySize, wagonId, includeKit) {
  const inv = {};
  const w = window.OF_WAGONS[wagonId];
  if (includeKit) {
    for (const [id, q] of Object.entries(window.OF_BASE_KIT)) {
      // per-soul items scale
      const meta = window.OF_ITEMS[id];
      if (meta && meta.tags && meta.tags.includes('per_soul')) {
        inv[id] = q * partySize;
      } else {
        inv[id] = q;
      }
    }
  }
  inv.yoke = (inv.yoke ?? 0) + (w?.requiredYokes ?? 0);
  return inv;
};

// Build a "pre-fill example" loadout — sensible mid-range top-up beyond the
// starter kit. Used by the "Pre-fill" tweak. Conservative, $80 of extras.
window.OF_examplePurchases = function(partySize) {
  return {
    flour: 100,
    bacon: 25,
    dried_fruit: 10,
    coffee: 4,
    bandages: 10,
    gunpowder: 10,
    lead_balls: 100,
    percussion_caps: 100,
    rope: 1,
    iron_toolkit: 1,
    water_bag: 4,
    spare_plank: 2,
    ox_shoes: 4,
    whiskey: 2,
  };
};

// ---------- BUNDLE PRESETS ----------
// Named loadouts the player can apply with one click. Player can adjust after.
// Each bundle has:
//   id, name, blurb (period citation), kit (item → qty), tone
// Bundles are ADDITIVE — applying one adds to whatever's already in basket.
// They assume the starter kit is on (so they augment, not duplicate, BASE_KIT).
window.OF_BUNDLES = [
  {
    id: 'marcy_topup',
    name: "Marcy's top-up",
    sub: '1859 · prudent',
    blurb: "Tops up the basics over Marcy 1859's recommended floor — extra powder, water bags, spare wheel.",
    cost: 32,
    icon: '📋',
    tone: 'rust',
    kit: {
      flour: 50,
      bacon: 20,
      gunpowder: 10,
      lead_balls: 100,
      percussion_caps: 100,
      water_bag: 4,
      ox_shoes: 6,
      rope: 1,
      iron_toolkit: 1,
      bandages: 8,
    },
  },
  {
    id: 'palmer_generous',
    name: "Palmer's generous",
    sub: '1845 · 4 souls × full ration',
    blurb: "Palmer 1845 prescribed lavish per-soul provisioning. Big food, big medicine, no luxuries.",
    cost: 96,
    icon: '🍞',
    tone: 'good',
    kit: {
      flour: 250,
      bacon: 60,
      beans: 40,
      sugar: 15,
      coffee: 6,
      dried_fruit: 25,
      hardtack: 30,
      quinine: 4,
      laudanum: 2,
      patent_medicine: 2,
      bandages: 16,
    },
  },
  {
    id: 'bryant_minimum',
    name: "Bryant's minimum",
    sub: '1846 · light & fast',
    blurb: "Bryant 1846 famously ran light — flour, bacon, rifle, powder, courage. Banks on hunting.",
    cost: 18,
    icon: '🐎',
    tone: 'neutral',
    kit: {
      flour: 40,
      bacon: 15,
      gunpowder: 15,
      lead_balls: 150,
      percussion_caps: 150,
      rope: 1,
      shovel: 1,
    },
  },
  {
    id: 'frontier_starter',
    name: 'Frontier starter',
    sub: 'Build a life in Oregon',
    blurb: "Plow, seed grain, fruit saplings, family bible. Doesn't help you survive — does set up Oregon.",
    cost: 47,
    icon: '🌳',
    tone: 'warn',
    kit: {
      plow: 1,
      seed_grain: 2,
      fruit_tree_saplings: 1,
      garden_seeds: 1,
      family_bible: 1,
    },
  },
  {
    id: 'hunter_pack',
    name: 'Hunter pack',
    sub: 'Heavy on powder & shot',
    blurb: "For parties that plan to live off the rifle. Triple ammo, spare rifle, light on staples.",
    cost: 38,
    icon: '🔫',
    tone: 'rust',
    kit: {
      gunpowder: 30,
      lead_balls: 300,
      percussion_caps: 300,
      rifle: 1,
      bacon: 10,
      hardtack: 15,
    },
  },
];

// Compute what a player's basket covers — coverage hints surface this in
// the UI ("Food: 38 days for 5 souls"). All formulas approximate, calibrated
// against Palmer 1845's per-adult guidance for a sanity check.
window.OF_computeCoverage = function(party, kit, basket) {
  const sum = (id) => (kit[id] ?? 0) + (basket[id] ?? 0);
  // Food: total cal-weight ÷ daily per soul. Palmer rough: 2 lb/day/soul.
  const foodIds = ['flour','cornmeal','beans','bacon','salt_pork','hardtack','dried_fruit','sugar','coffee'];
  const foodLbs = foodIds.reduce((s, id) => s + sum(id) * (window.OF_ITEMS[id]?.w ?? 0), 0);
  const dailyPerSoul = 2.0;
  const foodDays = party.partySize > 0 ? foodLbs / (party.partySize * dailyPerSoul) : 0;

  // Ammo: shots per ball.
  const shots = sum('lead_balls');

  // Clothing: per-soul coverage of coat/boots/blanket; reports the worst.
  const coatCov = sum('coat') / party.partySize;
  const blanketCov = sum('blanket') / party.partySize;
  const bootsCov = sum('boots') / party.partySize;
  const clothingCov = Math.min(coatCov, blanketCov, bootsCov);

  // Medicine: rough dose count of the major three.
  const medDoses = sum('quinine') + sum('laudanum') + sum('calomel') + sum('paregoric');

  // Wagon spares
  const spares = sum('wheel') + sum('axle') + sum('tongue');

  // Trade goods total qty
  const tradeQty = ['mirror','vermilion','awl','thimble','calico','pocket_knife'].reduce((s, id) => s + sum(id), 0);

  return {
    foodDays,
    shots,
    clothingCov,
    medDoses,
    spares,
    tradeQty,
  };
};
