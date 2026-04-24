export interface PriceEntry {
  buy: number;
  sell: number;
}

export const PRICES: Record<string, PriceEntry> = {
  // Food
  flour:       { buy: 0.20, sell: 0.10 },
  beans:       { buy: 0.25, sell: 0.15 },
  bacon:       { buy: 0.40, sell: 0.30 },
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
  // A live laying hen — cheap at Independence, trickier to stock
  // mid-trail. Sell side low because posts rarely want more poultry.
  chicken:     { buy: 0.50, sell: 0.20 },

  // Wagon parts
  wheel:       { buy: 10.00, sell: 6.00 },
  axle:        { buy: 12.00, sell: 8.00 },
  tongue:      { buy: 8.00, sell: 5.00 },
  canvas:      { buy: 6.00, sell: 3.00 },
  spare_plank: { buy: 2.00, sell: 1.00 },
  iron_scrap:  { buy: 1.50, sell: 0.75 },

  // Weapons / ammo
  rifle:              { buy: 20.00, sell: 12.00 },
  bullets:            { buy: 2.00,  sell: 1.00 },
  rifle_cleaning_kit: { buy: 3.00,  sell: 1.50 },

  // Clothing
  coat:    { buy: 5.00, sell: 2.50 },
  boots:   { buy: 4.00, sell: 2.00 },
  blanket: { buy: 3.00, sell: 1.50 },

  // Tools
  iron_toolkit: { buy: 40.00, sell: 25.00 },
  cookware:     { buy: 8.00,  sell: 4.00 },
  rope:         { buy: 2.50,  sell: 1.20 },
  shovel:       { buy: 4.00,  sell: 2.00 },
  salt:         { buy: 1.50,  sell: 0.60 },
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

  // Comfort
  tobacco:   { buy: 1.00, sell: 0.50 },
  whiskey:   { buy: 2.50, sell: 1.20 },
  harmonica: { buy: 3.00, sell: 1.50 },
  fiddle:    { buy: 12.00, sell: 6.00 },
  bible:     { buy: 5.00, sell: 2.50 },

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
