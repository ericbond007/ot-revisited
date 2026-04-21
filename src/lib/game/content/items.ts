export type ItemCategory =
  | 'food'
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
}

export const ITEMS: Record<string, ItemMeta> = {
  flour:       { id: 'flour',       name: 'Flour',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 1 },
  beans:       { id: 'beans',       name: 'Beans',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 2 },
  bacon:       { id: 'bacon',       name: 'Bacon',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 3 },
  hardtack:    { id: 'hardtack',    name: 'Hardtack',     category: 'food', weightLbPerUnit: 1, foodDrawOrder: 4 },
  dried_fruit: { id: 'dried_fruit', name: 'Dried fruit',  category: 'food', weightLbPerUnit: 1, foodDrawOrder: 5 },
  pemmican:    { id: 'pemmican',    name: 'Pemmican',     category: 'food', weightLbPerUnit: 1, foodDrawOrder: 6 },
  sugar:       { id: 'sugar',       name: 'Sugar',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 7 },
  coffee:      { id: 'coffee',      name: 'Coffee',       category: 'food', weightLbPerUnit: 1, foodDrawOrder: 8 },
  tea:         { id: 'tea',         name: 'Tea',          category: 'food', weightLbPerUnit: 1, foodDrawOrder: 9 },

  ox: { id: 'ox', name: 'Ox', category: 'livestock', weightLbPerUnit: 0 },
  yoke: { id: 'yoke', name: 'Yoke', category: 'livestock', weightLbPerUnit: 15 },

  wagon:       { id: 'wagon',       name: 'Wagon',          category: 'wagon_part', weightLbPerUnit: 0 },
  wheel:       { id: 'wheel',       name: 'Spare wheel',    category: 'wagon_part', weightLbPerUnit: 50 },
  axle:        { id: 'axle',        name: 'Spare axle',     category: 'wagon_part', weightLbPerUnit: 60 },
  tongue:      { id: 'tongue',      name: 'Spare tongue',   category: 'wagon_part', weightLbPerUnit: 40 },
  canvas:      { id: 'canvas',      name: 'Canvas cover',   category: 'wagon_part', weightLbPerUnit: 30 },
  spare_plank: { id: 'spare_plank', name: 'Spare plank',    category: 'wagon_part', weightLbPerUnit: 8 },
  iron_scrap:  { id: 'iron_scrap',  name: 'Iron scrap',     category: 'wagon_part', weightLbPerUnit: 5 },

  rifle: { id: 'rifle', name: 'Rifle', category: 'weapon', weightLbPerUnit: 10 },
  bullets: { id: 'bullets', name: 'Bullets', category: 'ammo', weightLbPerUnit: 0.1 },
  rifle_cleaning_kit: { id: 'rifle_cleaning_kit', name: 'Rifle cleaning kit', category: 'tool', weightLbPerUnit: 2 },

  coat: { id: 'coat', name: 'Coat', category: 'clothing', weightLbPerUnit: 4 },
  boots: { id: 'boots', name: 'Boots', category: 'clothing', weightLbPerUnit: 3 },
  blanket: { id: 'blanket', name: 'Blanket', category: 'clothing', weightLbPerUnit: 5 },

  iron_toolkit: { id: 'iron_toolkit', name: 'Iron toolkit', category: 'tool', weightLbPerUnit: 20 },
  cookware: { id: 'cookware', name: 'Cookware', category: 'tool', weightLbPerUnit: 15 },
  rope: { id: 'rope', name: 'Rope', category: 'tool', weightLbPerUnit: 8 },
  shovel: { id: 'shovel', name: 'Shovel', category: 'tool', weightLbPerUnit: 5 },
  compass: { id: 'compass', name: 'Compass', category: 'tool', weightLbPerUnit: 0.5 },
  water_skin: { id: 'water_skin', name: 'Water skin', category: 'tool', weightLbPerUnit: 2 },
  ox_shoes: { id: 'ox_shoes', name: 'Ox shoes', category: 'tool', weightLbPerUnit: 2 },
  spyglass: { id: 'spyglass', name: 'Spyglass', category: 'tool', weightLbPerUnit: 2 },

  quinine: { id: 'quinine', name: 'Quinine', category: 'medicine', weightLbPerUnit: 0.2 },
  laudanum: { id: 'laudanum', name: 'Laudanum', category: 'medicine', weightLbPerUnit: 0.2 },
  calomel: { id: 'calomel', name: 'Calomel', category: 'medicine', weightLbPerUnit: 0.2 },
  bandages: { id: 'bandages', name: 'Bandages', category: 'medicine', weightLbPerUnit: 1 },
  herbal_poultice: { id: 'herbal_poultice', name: 'Herbal poultice', category: 'medicine', weightLbPerUnit: 0.5 },
  patent_medicine: { id: 'patent_medicine', name: 'Patent medicine', category: 'medicine', weightLbPerUnit: 0.5 },

  tobacco: { id: 'tobacco', name: 'Tobacco', category: 'comfort', weightLbPerUnit: 1 },
  whiskey: { id: 'whiskey', name: 'Whiskey', category: 'comfort', weightLbPerUnit: 4 },
  harmonica: { id: 'harmonica', name: 'Harmonica', category: 'comfort', weightLbPerUnit: 0.2 },
  fiddle: { id: 'fiddle', name: 'Fiddle', category: 'comfort', weightLbPerUnit: 3 },
  bible: { id: 'bible', name: 'Bible', category: 'comfort', weightLbPerUnit: 2 },

  moccasins: { id: 'moccasins', name: 'Moccasins', category: 'native_trade', weightLbPerUnit: 1 },
  buffalo_robe: { id: 'buffalo_robe', name: 'Buffalo robe', category: 'native_trade', weightLbPerUnit: 8 },
  beads: { id: 'beads', name: 'Trade beads / calico', category: 'native_trade', weightLbPerUnit: 2 }
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
