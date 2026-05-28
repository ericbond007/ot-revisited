// ============================================================================
// TRADE POST — data layer
// ============================================================================
// Three posts lifted verbatim from src/lib/game/content/landmarks.ts. Stock,
// blurbs, accent, priceMultiplier, barterPreferred/barterRefused match the
// repo. Item catalog is a focused subset (~14 items) chosen so every
// scenario is visible: preferred barter item, refused item, out-of-stock,
// player-owned-only (sell side), Marcy-5 staples, mountain-trade specialty.
// ============================================================================

// ---------- ITEMS (id → name, category, weight, buy, sell) ----------
// Prices sourced from src/lib/game/content/prices.ts mid-trail tier.
window.TP_ITEMS = {
  flour:           { name: 'Flour',           cat: 'food',         w: 1.0,  buy: 0.10, sell: 0.05, icon: '🌾' },
  bacon:           { name: 'Bacon',           cat: 'food',         w: 1.0,  buy: 0.20, sell: 0.10, icon: '🥓' },
  beans:           { name: 'Beans',           cat: 'food',         w: 1.0,  buy: 0.08, sell: 0.04, icon: '🫘' },
  coffee:          { name: 'Coffee',          cat: 'food',         w: 1.0,  buy: 0.40, sell: 0.20, icon: '☕' },
  sugar:           { name: 'Sugar',           cat: 'food',         w: 1.0,  buy: 0.25, sell: 0.12, icon: '🍯' },
  jerky:           { name: 'Jerky',           cat: 'food',         w: 0.5,  buy: 0.35, sell: 0.18, icon: '🥩' },
  pemmican:        { name: 'Pemmican',        cat: 'food',         w: 0.5,  buy: 0.45, sell: 0.22, icon: '🥩' },
  game_meat:       { name: 'Game meat',       cat: 'food',         w: 1.0,  buy: 0.30, sell: 0.15, icon: '🍖' },

  gunpowder:       { name: 'Gunpowder',       cat: 'ammo',         w: 1.0,  buy: 0.50, sell: 0.25, icon: '💥' },
  lead_balls:      { name: 'Lead balls',      cat: 'ammo',         w: 0.05, buy: 0.04, sell: 0.02, icon: '⚪' },
  percussion_caps: { name: 'Percussion caps', cat: 'ammo',         w: 0.01, buy: 0.02, sell: 0.01, icon: '🎯' },

  bandages:        { name: 'Bandages',        cat: 'medicine',     w: 0.1,  buy: 0.50, sell: 0.25, icon: '🩹' },
  quinine:         { name: 'Quinine',         cat: 'medicine',     w: 0.05, buy: 2.00, sell: 1.00, icon: '💊' },
  laudanum:        { name: 'Laudanum',        cat: 'medicine',     w: 0.1,  buy: 3.00, sell: 1.50, icon: '🧪' },

  blanket:         { name: 'Wool blanket',    cat: 'clothing',     w: 4.0,  buy: 3.00, sell: 1.50, icon: '🧣' },
  coat:            { name: 'Coat',            cat: 'clothing',     w: 3.0,  buy: 5.00, sell: 2.50, icon: '🧥' },
  moccasins:       { name: 'Moccasins',       cat: 'clothing',     w: 0.5,  buy: 1.50, sell: 0.75, icon: '👞' },

  ox_shoes:        { name: 'Ox shoes',        cat: 'wagon_part',   w: 1.0,  buy: 1.20, sell: 0.60, icon: '⚒️' },
  rope:            { name: 'Rope',            cat: 'wagon_part',   w: 2.0,  buy: 0.80, sell: 0.40, icon: '🪢' },
  spare_plank:     { name: 'Spare plank',     cat: 'wagon_part',   w: 8.0,  buy: 1.50, sell: 0.75, icon: '🪵' },

  buffalo_robe:    { name: 'Buffalo robe',    cat: 'native_trade', w: 8.0,  buy: 6.00, sell: 3.00, icon: '🦬' },
  raw_hide:        { name: 'Raw hide',        cat: 'native_trade', w: 6.0,  buy: 3.00, sell: 1.50, icon: '🪨' },
  beads:           { name: 'Glass beads',     cat: 'native_trade', w: 0.1,  buy: 0.50, sell: 0.25, icon: '📿' },

  whiskey:         { name: 'Whiskey',         cat: 'comfort',      w: 2.0,  buy: 1.50, sell: 0.75, icon: '🥃' },
  tobacco:         { name: 'Tobacco',         cat: 'comfort',      w: 0.5,  buy: 0.60, sell: 0.30, icon: '🍂' },
};

window.TP_CATEGORY_LABEL = {
  food:         'Food',
  ammo:         'Ammunition',
  medicine:     'Medicine',
  clothing:     'Clothing',
  wagon_part:   'Wagon parts',
  native_trade: 'Trade goods',
  comfort:      'Comfort',
};

window.TP_CATEGORY_ORDER = ['food', 'ammo', 'medicine', 'clothing', 'wagon_part', 'native_trade', 'comfort'];

// ---------- POSTS ----------
// barterPreferred = +15%; barterRefused = -40%; priceMultiplier applies
// symmetrically to buy and sell. Stock pruned to the items above.

window.TP_POSTS = {
  ft_laramie: {
    id: 'ft_laramie',
    name: 'Fort Laramie',
    postKind: 'frontier',
    accent: '#b86a42',
    accentDark: '#7a4326',
    tag: 'Frontier post',
    mile: 650,
    blurb: "A great adobe fort at the fork of the Laramie and North Platte. Last outpost before the Rockies — the broadest selection on the trail, and the steepest prices.",
    priceMultiplier: 1.0,
    barterPreferred: ['buffalo_robe', 'raw_hide', 'game_meat', 'jerky'],
    barterRefused: [],
    barterEnabled: true,
    buysFromEmigrants: true,
    stock: {
      flour: 80, bacon: 60, beans: 40, coffee: 30, sugar: 20,
      gunpowder: 12, lead_balls: 200, percussion_caps: 500,
      bandages: 15, quinine: 8, laudanum: 4,
      blanket: 8, coat: 5,
      ox_shoes: 10, rope: 12, spare_plank: 6,
      buffalo_robe: 3, beads: 30,
      whiskey: 8, tobacco: 14,
    },
    refusalLine: "The post refuses that line — try Bridger.",
  },

  ft_bridger: {
    id: 'ft_bridger',
    name: 'Fort Bridger',
    postKind: 'mountain',
    accent: '#8a5a2a',
    accentDark: '#5a3a18',
    tag: 'Mountain outpost',
    mile: 1040,
    blurb: "Jim Bridger's stockade is famously thin on stock. Moccasins, buffalo robes, and whatever the mountain men happened to bring in this week. Take what you can get.",
    priceMultiplier: 1.5,
    barterPreferred: ['game_meat', 'jerky', 'pemmican', 'buffalo_robe', 'raw_hide'],
    barterRefused: ['whiskey'],
    barterEnabled: true,
    buysFromEmigrants: true,
    stock: {
      flour: 25, bacon: 14, beans: 12, coffee: 6, sugar: 4,
      gunpowder: 4, lead_balls: 80, percussion_caps: 200,
      bandages: 4,
      blanket: 3,
      ox_shoes: 6, rope: 4, spare_plank: 2,
      moccasins: 12, buffalo_robe: 8, beads: 40,
    },
    refusalLine: "Bridger waves it off — \"take that to Hall, friend.\"",
  },

  ft_hall: {
    id: 'ft_hall',
    name: 'Fort Hall',
    postKind: 'hbc',
    accent: '#2f7a52',
    accentDark: '#1f5a3f',
    tag: "Hudson's Bay Co.",
    mile: 1290,
    blurb: "A Hudson's Bay Company post on the Snake. British imports via HBC supply lines — tea, good wool blankets, manufactured goods. The California Trail splits here; half the wagons turn south.",
    priceMultiplier: 1.0,
    barterPreferred: ['buffalo_robe', 'raw_hide', 'pemmican', 'game_meat'],
    barterRefused: ['whiskey'],
    barterEnabled: true,
    buysFromEmigrants: true,
    stock: {
      flour: 60, bacon: 30, beans: 35, coffee: 18, sugar: 24,
      gunpowder: 8, lead_balls: 150, percussion_caps: 400,
      bandages: 12, quinine: 10, laudanum: 6,
      blanket: 14, coat: 8,
      ox_shoes: 8, rope: 8, spare_plank: 4,
      moccasins: 6, beads: 50,
      tobacco: 10,
    },
    refusalLine: "The factor declines — \"trade that downriver, not here.\"",
  },
};

// ---------- PARTY STATE ----------
// Realistic mid-trail party. Inventory holds:
//  - Marcy-5 staples
//  - Some buffalo robes (from a hunt — barter currency at HBC/Bridger)
//  - Some whiskey (refused at Bridger/Hall — drives the refusal flavor)
//  - Sold-only items the post may not carry

window.TP_DEFAULT_PARTY = {
  cash: 142,
  weightCap: 1800,
  inventory: {
    flour: 90,
    bacon: 22,
    beans: 14,
    coffee: 3,
    jerky: 18,
    game_meat: 8,
    gunpowder: 3,
    lead_balls: 60,
    percussion_caps: 120,
    bandages: 4,
    blanket: 3,
    spare_plank: 1,
    ox_shoes: 2,
    rope: 2,
    buffalo_robe: 2,
    raw_hide: 1,
    whiskey: 2,
    tobacco: 3,
  },
  leaderName: 'Ezra',
  partySize: 5,
  day: 71,
};

// ---------- BARTER CONSTANTS (from src/lib/game/systems/barter.ts) ----------
window.TP_BARTER = {
  RATE_FLOOR: 0.5,
  RATE_CEIL: 1.05,
  POST_PREF_BONUS: 0.15,
  POST_REJECT_PENALTY: 0.40,
};

// ---------- HELPERS ----------
window.TP_itemWeight = function(id, qty) {
  return (window.TP_ITEMS[id]?.w ?? 0) * qty;
};

window.TP_totalInvWeight = function(inv) {
  return Object.entries(inv).reduce((s, [id, q]) => s + window.TP_itemWeight(id, q ?? 0), 0);
};

// Pure rate calculation, mirrors barter.ts:quoteBarter()
window.TP_quoteBarter = function(post, giveId, giveQty, recvId, recvQty) {
  if (!post || !giveId || !recvId || giveQty <= 0 || recvQty <= 0) {
    return { rate: 0, fair: false, giveVal: 0, recvVal: 0 };
  }
  const give = window.TP_ITEMS[giveId];
  const recv = window.TP_ITEMS[recvId];
  if (!give || !recv) return { rate: 0, fair: false, giveVal: 0, recvVal: 0 };
  const mult = post.priceMultiplier ?? 1.0;
  const preferred = new Set(post.barterPreferred ?? []);
  const refused = new Set(post.barterRefused ?? []);
  let giveVal = give.sell * mult * giveQty;
  const recvVal = recv.buy * mult * recvQty;
  let modifier = 1.0;
  if (preferred.has(giveId)) modifier *= (1 + window.TP_BARTER.POST_PREF_BONUS);
  if (refused.has(giveId)) modifier *= (1 - window.TP_BARTER.POST_REJECT_PENALTY);
  const adjusted = giveVal * modifier;
  const rate = recvVal > 0 ? adjusted / recvVal : 0;
  const fair = (post.barterEnabled !== false)
    && rate >= window.TP_BARTER.RATE_FLOOR
    && rate <= window.TP_BARTER.RATE_CEIL;
  return { rate, fair, giveVal: adjusted, recvVal, preferred: preferred.has(giveId), refused: refused.has(giveId) };
};

// Pretty money — always 2dp, $ prefix.
window.TP_money = function(n) {
  const v = Math.round(n * 100) / 100;
  return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2);
};
