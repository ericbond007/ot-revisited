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
  flour:       { id: 'flour',       name: 'Flour',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 1, description: 'Baseline staple. Eaten after fresh meat.' },
  beans:       { id: 'beans',       name: 'Beans',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 2, description: 'Shelf-stable protein. Keeps indefinitely.' },
  bacon:       { id: 'bacon',       name: 'Bacon',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 3, description: 'Salted pork. High-calorie, slow to spoil.' },
  // Jerky sits at 3.5 so it reads between bacon and hardtack — a durable
  // staple meat protein. Cured from game_meat + salt (camp action TBD).
  jerky:       { id: 'jerky',       name: 'Jerky',        category: 'food', weightLbPerUnit: 0.5, foodDrawOrder: 3.5, description: 'Dried strips of cured meat. Lean, salty, lasts indefinitely.' },
  hardtack:    { id: 'hardtack',    name: 'Hardtack',     category: 'food', weightLbPerUnit: 1, foodDrawOrder: 4, description: 'Indestructible biscuit. Fills bellies, drags morale.' },
  dried_fruit: { id: 'dried_fruit', name: 'Dried fruit',  category: 'food', weightLbPerUnit: 1, foodDrawOrder: 5, description: 'Cures scurvy. Small morale boost when eaten.' },
  pemmican:    { id: 'pemmican',    name: 'Pemmican',     category: 'food', weightLbPerUnit: 1, foodDrawOrder: 6, description: 'Native-prepared dried meat + fat. Never spoils.' },
  sugar:       { id: 'sugar',       name: 'Sugar',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 7, description: 'Small morale bump when eaten; preserves foraged berries.' },
  // Coffee + tea are NOT in the regular food draw — they're consumed
  // separately by applyHotDrinks (~1 lb per 5 brew-days). Daily brewing
  // gives a small morale lift and accidentally cuts waterborne-disease
  // odds because the water gets boiled.
  coffee:      { id: 'coffee',      name: 'Coffee',       category: 'food', weightLbPerUnit: 1, description: 'Boiled daily — small morale lift and −40% waterborne disease odds while you brew.' },
  tea:         { id: 'tea',         name: 'Tea',          category: 'food', weightLbPerUnit: 1, description: 'Boiled daily — small morale lift and −40% waterborne disease odds while you brew.' },

  ox: { id: 'ox', name: 'Ox', category: 'livestock', weightLbPerUnit: 0, description: 'Draft animal. Pulls the wagon. More oxen = faster travel and higher carry cap.' },
  yoke: { id: 'yoke', name: 'Yoke', category: 'livestock', weightLbPerUnit: 15, description: 'Harnesses the oxen to the wagon. Replaces broken yokes.' },
  // Live chickens — carried in a coop strapped to the wagon bed.
  // Wagon-capped per model (light: 3 / prairie: 5 / heavy: 8). Lay
  // eggs daily. Can die to predator events or drown in rough fords.
  chicken: { id: 'chicken', name: 'Chicken', category: 'livestock', weightLbPerUnit: 3, description: 'Hen in a coop. Lays eggs daily while alive. Coop size limited by wagon model.' },

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
  spare_plank: { id: 'spare_plank', name: 'Spare plank',    category: 'wagon_part', weightLbPerUnit: 8, description: 'Patches minor wagon damage. Cheaper than a full replacement.' },
  iron_scrap:  { id: 'iron_scrap',  name: 'Iron scrap',     category: 'wagon_part', weightLbPerUnit: 5, description: 'Salvaged metal. A Blacksmith can forge it into repairs.' },

  rifle: { id: 'rifle', name: 'Rifle', category: 'weapon', weightLbPerUnit: 10, description: 'Required for hunting. A second rifle lets two hunters work in parallel.' },
  bullets: { id: 'bullets', name: 'Bullets', category: 'ammo', weightLbPerUnit: 0.1, description: 'Consumed on every hunt. Runs out faster than you expect.' },
  rifle_cleaning_kit: { id: 'rifle_cleaning_kit', name: 'Rifle cleaning kit', category: 'tool', weightLbPerUnit: 2, description: 'Keeps rifles firing in rain / wet weather.' },

  coat: { id: 'coat', name: 'Coat', category: 'clothing', weightLbPerUnit: 4, description: 'Warmth +25 per person (one per body). Cuts ford-chill damage and cold-camp health loss.' },
  boots: { id: 'boots', name: 'Boots', category: 'clothing', weightLbPerUnit: 3, description: 'Warmth +15 per person. Helps most when wading into cold rivers.' },
  blanket: { id: 'blanket', name: 'Blanket', category: 'clothing', weightLbPerUnit: 5, description: 'Warmth +25 per person. Night chill mitigation when the fire goes out.' },

  iron_toolkit: { id: 'iron_toolkit', name: 'Iron toolkit', category: 'tool', weightLbPerUnit: 20, description: 'Unlocks proper wagon repairs. Without it, repairs cost 2× the spare parts.' },
  cookware: { id: 'cookware', name: 'Cookware', category: 'tool', weightLbPerUnit: 15, description: 'Required to boil water (post-1854). Meals taste better, small morale bump.' },
  rope: { id: 'rope', name: 'Rope', category: 'tool', weightLbPerUnit: 8, description: 'Lower wagons down steep grades, secure loads, rescue fallen oxen.' },
  shovel: { id: 'shovel', name: 'Shovel', category: 'tool', weightLbPerUnit: 5, description: 'Enables well-digging, grave-digging, wagon extraction. Auto-digs firepit + latrine each camp.' },
  salt: { id: 'salt', name: 'Salt', category: 'tool', weightLbPerUnit: 1, description: 'Preserves fresh game meat. Multiplies curing speed, reduces spoilage loss during the jerk process.' },
  compass: { id: 'compass', name: 'Compass', category: 'tool', weightLbPerUnit: 0.5, description: 'Reduces the chance of being lost in storms or fog.' },
  water_skin: { id: 'water_skin', name: 'Water skin', category: 'tool', weightLbPerUnit: 2, description: '+5 gal water carry cap each. A buffer for dry stretches — base cap is 20 gal.' },
  ox_shoes: { id: 'ox_shoes', name: 'Ox / mule shoes', category: 'livestock', weightLbPerUnit: 2, description: 'Replace shoes that oxen or mules throw on rocky terrain. A Blacksmith or Teamster re-shoes them.' },
  spyglass: { id: 'spyglass', name: 'Spyglass', category: 'tool', weightLbPerUnit: 2, description: 'Reveals landmarks further ahead on the map. Helps with spotting game on hunts.' },

  quinine: { id: 'quinine', name: 'Quinine', category: 'medicine', weightLbPerUnit: 0.2, description: 'Treats fever, malaria, typhoid, cholera.' },
  laudanum: { id: 'laudanum', name: 'Laudanum', category: 'medicine', weightLbPerUnit: 0.2, description: 'Opium tincture. Treats pain, broken bones. Risk of dependency with heavy use.' },
  calomel: { id: 'calomel', name: 'Calomel', category: 'medicine', weightLbPerUnit: 0.2, description: 'Treats dysentery effectively — but mercury poisoning permanently lowers max health.' },
  bandages: { id: 'bandages', name: 'Bandages', category: 'medicine', weightLbPerUnit: 1, description: 'Treats wounds, snakebite, broken bones.' },
  herbal_poultice: { id: 'herbal_poultice', name: 'Herbal poultice', category: 'medicine', weightLbPerUnit: 0.5, description: 'Weaker than modern medicine. Foraged or Preacher-made.' },
  patent_medicine: { id: 'patent_medicine', name: 'Patent medicine', category: 'medicine', weightLbPerUnit: 0.5, description: 'Gamble: 50% heal / 35% nothing / 15% mild harm. Era-accurate snake oil.' },

  tobacco: { id: 'tobacco', name: 'Tobacco', category: 'comfort', weightLbPerUnit: 1, description: 'Morale consumable. Also Native American trade currency.' },
  whiskey: { id: 'whiskey', name: 'Whiskey', category: 'comfort', weightLbPerUnit: 4, description: 'Morale bump. Small cold-exposure heal. Rare dependency risk.' },
  harmonica: { id: 'harmonica', name: 'Harmonica', category: 'comfort', weightLbPerUnit: 0.2, description: 'Unlocks the Entertain camp action — boosts morale.' },
  fiddle: { id: 'fiddle', name: 'Fiddle', category: 'comfort', weightLbPerUnit: 3, description: 'Larger morale bump than a harmonica. Keeps spirits up on long nights.' },
  bible: { id: 'bible', name: 'Bible', category: 'comfort', weightLbPerUnit: 2, description: '+2 passive morale while owned. Enables Preacher\'s camp service.' },

  moccasins: { id: 'moccasins', name: 'Moccasins', category: 'native_trade', weightLbPerUnit: 1, description: 'Warmth +10 per person. Lightweight cold mitigation; pairs well with a coat.' },
  buffalo_robe: { id: 'buffalo_robe', name: 'Buffalo robe', category: 'native_trade', weightLbPerUnit: 8, description: 'Warmth +25 per person. Heavy but the warmest single item — indispensable in winter.' },
  beads: { id: 'beads', name: 'Trade beads / calico', category: 'native_trade', weightLbPerUnit: 2, description: 'Currency for trading with Native tribes.' }
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
