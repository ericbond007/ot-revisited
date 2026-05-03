export interface PriceEntry {
  buy: number;
  sell: number;
}

export const PRICES: Record<string, PriceEntry> = {
  // Food
  flour:       { buy: 0.20, sell: 0.10 },
  // Cornmeal — period prices ran half of wheat flour, often locally milled.
  cornmeal:    { buy: 0.10, sell: 0.05 },
  beans:       { buy: 0.25, sell: 0.15 },
  // #276 Sell margin tightened from 0.30 → 0.20 (audit found 1.33×
  // sell-to-buy too generous against the period 1.8–2.5× target).
  bacon:       { buy: 0.40, sell: 0.20 },
  // Salt pork — heavier-cure, period barrel meat. Slightly above bacon.
  // #276 Sell tightened to match bacon margin.
  salt_pork:   { buy: 0.45, sell: 0.22 },
  hardtack:    { buy: 0.15, sell: 0.08 },
  dried_fruit: { buy: 0.60, sell: 0.35 },
  pemmican:    { buy: 0.80, sell: 0.45 },
  // Jerky is premium shelf-stable meat — priced between bacon and pemmican.
  jerky:       { buy: 0.65, sell: 0.40 },
  // Fresh game meat is highly perishable; kept here so the sell-what-you-got
  // path works but priced low (and posts won't usually stock it).
  game_meat:   { buy: 0.30, sell: 0.10 },
  berries:     { buy: 0.40, sell: 0.20 },
  egg:         { buy: 0.10, sell: 0.05 },
  sugar:       { buy: 0.35, sell: 0.20 },
  coffee:      { buy: 1.50, sell: 0.80 },
  tea:         { buy: 1.00, sell: 0.60 },

  // Livestock
  yoke:        { buy: 6.00, sell: 3.00 },
  ox_bow:      { buy: 2.00, sell: 0.80 },
  picket_pins: { buy: 1.50, sell: 0.60 },
  // A live laying hen — cheap at Independence, trickier to stock
  // mid-trail. Sell side low because posts rarely want more poultry.
  chicken:     { buy: 0.50, sell: 0.20 },
  // Feed
  grain:       { buy: 0.15, sell: 0.06 },

  // Wagon parts
  wheel:       { buy: 10.00, sell: 6.00 },
  // #276 Period mid-trail $6–10; was running double. Brought down.
  axle:        { buy: 7.00,  sell: 4.00 },
  // #276 Period $2–3 at Independence, $4–6 trail; was running 2-3×.
  tongue:      { buy: 5.00,  sell: 2.50 },
  canvas:      { buy: 6.00, sell: 3.00 },
  spare_plank: { buy: 2.00, sell: 1.00 },
  tar_bucket:  { buy: 1.50, sell: 0.50 },

  // Hunt byproducts — primarily sell-side at posts; #182.
  tallow:             { buy: 0.30, sell: 0.15 },
  prize_cut:          { buy: 0.50, sell: 0.30 },
  raw_hide:           { buy: 1.00, sell: 0.60 },

  // Weapons / ammo
  rifle:              { buy: 20.00, sell: 12.00 },
  gunpowder:          { buy: 0.04,  sell: 0.02 },
  lead_pig:           { buy: 1.50,  sell: 0.75 },
  // #276 Period commercially-cast was $1/100 = $0.01/ball; was 5×.
  // Casting from a pig stays the better economics.
  lead_balls:         { buy: 0.02,  sell: 0.01 },
  percussion_caps:    { buy: 0.01,  sell: 0.005 },
  bullet_mold:        { buy: 1.50,  sell: 0.75 },
  rifle_cleaning_kit: { buy: 3.00,  sell: 1.50 },

  // #197 fishing gear.
  fishing_line:       { buy: 0.30,  sell: 0.15 },
  fishing_rod:        { buy: 1.50,  sell: 0.75 },
  fishing_net:        { buy: 4.00,  sell: 2.00 },

  // Clothing
  coat:    { buy: 5.00, sell: 2.50 },
  boots:   { buy: 4.00, sell: 2.00 },
  blanket: { buy: 3.00, sell: 1.50 },
  tent:    { buy: 8.00, sell: 4.00 },

  // Livestock — milk cow (#139). Period reality: a milk cow in 1840s
  // Missouri ran $20-30; mid-trail posts charged a premium.
  milk_cow: { buy: 25.00, sell: 12.00 },
  // Fresh milk — sold by the gallon. Surplus could be traded at posts
  // when oxen had grazing and the wagon was overstocked, though more
  // often it was churned to butter (#222 follow-up) for shelf life.
  milk:     { buy: 0.30, sell: 0.10 },
  // Farmer's cheese — shelf-stable dairy. Posts will buy from the player.
  cheese:   { buy: 0.50, sell: 0.20 },
  // Cheese press kit — wooden hoop + cheesecloth + rennet jar.
  cheese_press: { buy: 3.00, sell: 1.50 },
  // Wagon butter — pricier than fresh milk, less than cheese. Period-
  // accurate trade goods slot.
  butter:   { buy: 0.40, sell: 0.15 },
  // Butter crock kit — tin pail with a paddle dasher in the lid.
  butter_crock: { buy: 2.50, sell: 1.20 },

  // Tools
  // #276 Marcy 1859 listed full kit at $15–25; was running $40 (high).
  iron_toolkit: { buy: 25.00, sell: 15.00 },
  cookware:     { buy: 8.00,  sell: 4.00 },
  rope:         { buy: 2.50,  sell: 1.20 },
  // #276 Period shovel was $1–2; was running $4.
  shovel:       { buy: 2.50,  sell: 1.20 },
  salt:         { buy: 1.50,  sell: 0.60 },
  saleratus:    { buy: 0.20,  sell: 0.08 },
  // #269 Lye soap. Per Marcy 1859 — "soap, 5¢ a bar" wholesale; emigrant
  // outfitters charged 8-10× markup at Independence and more on the trail.
  soap:         { buy: 0.50,  sell: 0.20 },
  lard:         { buy: 0.25,  sell: 0.10 },
  // #276 Period pocket compass was $2–5; was running $8.
  compass:      { buy: 4.00,  sell: 2.00 },
  water_skin:   { buy: 2.00,  sell: 1.00 },
  ox_shoes:     { buy: 1.00,  sell: 0.50 },
  spyglass:     { buy: 15.00, sell: 8.00 },

  // Medicine
  quinine:         { buy: 4.00, sell: 2.00 },
  laudanum:        { buy: 2.50, sell: 1.20 },
  calomel:         { buy: 2.00, sell: 1.00 },
  // #276 Period bandages were nearly free (cloth scraps) or boxed
  // $0.50–1; was running $1.50.
  bandages:        { buy: 0.75, sell: 0.30 },
  herbal_poultice: { buy: 1.00, sell: 0.50 },
  patent_medicine: { buy: 3.00, sell: 1.50 },
  vinegar:         { buy: 1.00, sell: 0.40 },
  // Period medicine kit fill-out (#213). Pricing tracks Marcy / 1850s
  // Missouri-River outfitter rates: gentle purgatives cheap, opiate
  // derivatives mid-tier, fever-sweat compounds (Dover's) priciest.
  epsom_salts:     { buy: 0.50, sell: 0.20 },
  camphor:         { buy: 1.50, sell: 0.70 },
  paregoric:       { buy: 1.20, sell: 0.55 },
  hartshorn:       { buy: 0.80, sell: 0.35 },
  dovers_powder:   { buy: 1.80, sell: 0.85 },
  castor_oil:      { buy: 0.40, sell: 0.18 },

  // Comfort
  tobacco:   { buy: 1.00, sell: 0.50 },
  whiskey:   { buy: 2.50, sell: 1.20 },
  // #276 German imports $0.50–1.50 period; was running $3.
  harmonica: { buy: 1.50, sell: 0.75 },
  fiddle:    { buy: 12.00, sell: 6.00 },
  // #276 American Bible Society pocket edition $1–2 period; was $5.
  bible:     { buy: 2.00, sell: 1.00 },
  grandfather_clock: { buy: 50.00, sell: 25.00 },
  // Cheap to buy, brutal to haul — the prestige is in delivery (#148).
  anvil:             { buy:  5.00, sell:  3.00 },
  china_tea_set:     { buy: 25.00, sell: 12.00 },
  feather_mattress:  { buy: 15.00, sell:  7.00 },

  // Native trade goods
  moccasins:    { buy: 3.00, sell: 1.50 },
  buffalo_robe: { buy: 8.00, sell: 4.00 },
  // #276 Catlin 1841: $0.10–0.25/string; was running $0.50.
  beads:        { buy: 0.30, sell: 0.15 },

  // #216 trade goods — Plains-trader prices. Vermilion most expensive
  // (mercury sulfide was a controlled chemical), calico mid-range
  // (5-yard bolt), small metal goods cheap.
  mirror:       { buy: 0.50, sell: 0.20 },
  vermilion:    { buy: 1.00, sell: 0.40 },
  awl:          { buy: 0.20, sell: 0.10 },
  thimble:      { buy: 0.15, sell: 0.05 },
  calico:       { buy: 2.00, sell: 0.80 },
  pocket_knife: { buy: 0.50, sell: 0.20 }
};

export function getPrice(item: string): PriceEntry {
  const p = PRICES[item];
  if (!p) throw new Error(`Unknown item for trade: ${item}`);
  return p;
}
