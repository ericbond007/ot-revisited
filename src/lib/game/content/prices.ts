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
  bacon:       { buy: 0.40, sell: 0.30 },
  // Salt pork — heavier-cure, period barrel meat. Slightly above bacon.
  salt_pork:   { buy: 0.45, sell: 0.30 },
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
  axle:        { buy: 12.00, sell: 8.00 },
  tongue:      { buy: 8.00, sell: 5.00 },
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
  lead_balls:         { buy: 0.05,  sell: 0.025 },
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

  // Tools
  iron_toolkit: { buy: 40.00, sell: 25.00 },
  cookware:     { buy: 8.00,  sell: 4.00 },
  rope:         { buy: 2.50,  sell: 1.20 },
  shovel:       { buy: 4.00,  sell: 2.00 },
  salt:         { buy: 1.50,  sell: 0.60 },
  saleratus:    { buy: 0.20,  sell: 0.08 },
  lard:         { buy: 0.25,  sell: 0.10 },
  compass:      { buy: 8.00,  sell: 4.00 },
  water_skin:   { buy: 2.00,  sell: 1.00 },
  ox_shoes:     { buy: 1.00,  sell: 0.50 },
  spyglass:     { buy: 15.00, sell: 8.00 },

  // Medicine
  quinine:         { buy: 4.00, sell: 2.00 },
  laudanum:        { buy: 2.50, sell: 1.20 },
  calomel:         { buy: 2.00, sell: 1.00 },
  bandages:        { buy: 1.50, sell: 0.75 },
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
  harmonica: { buy: 3.00, sell: 1.50 },
  fiddle:    { buy: 12.00, sell: 6.00 },
  bible:     { buy: 5.00, sell: 2.50 },
  grandfather_clock: { buy: 50.00, sell: 25.00 },
  // Cheap to buy, brutal to haul — the prestige is in delivery (#148).
  anvil:             { buy:  5.00, sell:  3.00 },
  china_tea_set:     { buy: 25.00, sell: 12.00 },
  feather_mattress:  { buy: 15.00, sell:  7.00 },

  // Native trade goods
  moccasins:    { buy: 3.00, sell: 1.50 },
  buffalo_robe: { buy: 8.00, sell: 4.00 },
  beads:        { buy: 0.50, sell: 0.25 }
};

export function getPrice(item: string): PriceEntry {
  const p = PRICES[item];
  if (!p) throw new Error(`Unknown item for trade: ${item}`);
  return p;
}
