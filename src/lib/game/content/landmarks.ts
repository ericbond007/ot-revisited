import type { Terrain } from '../types';

export interface Landmark {
  id: string;
  name: string;
  milesFromPrevious: number;
  terrain: Terrain;
  kind: 'start' | 'trading_post' | 'landmark' | 'river' | 'end';
}

export const LANDMARKS: readonly Landmark[] = [
  { id: 'independence',        name: 'Independence, MO',    milesFromPrevious: 0,   terrain: 'prairie',   kind: 'start' },
  { id: 'kansas_river',        name: 'Kansas River',        milesFromPrevious: 110, terrain: 'river',     kind: 'river' },
  { id: 'alcove_spring',       name: 'Alcove Spring',       milesFromPrevious: 40,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'big_blue_river',      name: 'Big Blue River',      milesFromPrevious: 30,  terrain: 'river',     kind: 'river' },
  { id: 'ft_kearny',           name: 'Fort Kearny',         milesFromPrevious: 120, terrain: 'prairie',   kind: 'trading_post' },
  { id: 'ash_hollow',          name: 'Ash Hollow',          milesFromPrevious: 120, terrain: 'prairie',   kind: 'landmark' },
  { id: 'north_platte_1',      name: 'North Platte crossing (east)', milesFromPrevious: 60, terrain: 'river', kind: 'river' },
  { id: 'courthouse_rock',     name: 'Courthouse & Jail Rocks', milesFromPrevious: 70, terrain: 'prairie', kind: 'landmark' },
  { id: 'chimney_rock',        name: 'Chimney Rock',        milesFromPrevious: 25,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'scotts_bluff',        name: 'Scotts Bluff',        milesFromPrevious: 30,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'ft_laramie',          name: 'Fort Laramie',        milesFromPrevious: 50,  terrain: 'prairie',   kind: 'trading_post' },
  { id: 'register_cliff',      name: 'Register Cliff',      milesFromPrevious: 12,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'guernsey_ruts',       name: 'Guernsey Ruts',       milesFromPrevious: 5,   terrain: 'prairie',   kind: 'landmark' },
  { id: 'north_platte_2',      name: 'North Platte (west crossing)', milesFromPrevious: 75, terrain: 'river', kind: 'river' },
  { id: 'independence_rock',   name: 'Independence Rock',   milesFromPrevious: 80,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'devils_gate',         name: "Devil's Gate",        milesFromPrevious: 6,   terrain: 'mountains', kind: 'landmark' },
  { id: 'sweetwater_1',        name: 'Sweetwater River ford', milesFromPrevious: 40, terrain: 'river',    kind: 'river' },
  { id: 'south_pass',          name: 'South Pass',          milesFromPrevious: 90,  terrain: 'mountains', kind: 'landmark' },
  { id: 'pacific_springs',     name: 'Pacific Springs',     milesFromPrevious: 5,   terrain: 'mountains', kind: 'landmark' },
  { id: 'green_river',         name: 'Green River crossing', milesFromPrevious: 90, terrain: 'river',    kind: 'river' },
  { id: 'ft_bridger',          name: 'Fort Bridger',        milesFromPrevious: 65,  terrain: 'mountains', kind: 'trading_post' },
  { id: 'bear_river',          name: 'Bear River crossing', milesFromPrevious: 100, terrain: 'river',     kind: 'river' },
  { id: 'soda_springs',        name: 'Soda Springs',        milesFromPrevious: 35,  terrain: 'mountains', kind: 'landmark' },
  { id: 'ft_hall',             name: 'Fort Hall',           milesFromPrevious: 70,  terrain: 'mountains', kind: 'trading_post' },
  { id: 'snake_three_island',  name: 'Three Island Crossing', milesFromPrevious: 150, terrain: 'river',   kind: 'river' },
  { id: 'ft_boise',            name: 'Fort Boise',          milesFromPrevious: 130, terrain: 'desert',    kind: 'trading_post' },
  { id: 'farewell_bend',       name: 'Farewell Bend',       milesFromPrevious: 95,  terrain: 'desert',    kind: 'landmark' },
  { id: 'blue_mountains',      name: 'Blue Mountains',      milesFromPrevious: 120, terrain: 'mountains', kind: 'landmark' },
  { id: 'ft_walla_walla',      name: 'Fort Walla Walla',    milesFromPrevious: 70,  terrain: 'mountains', kind: 'trading_post' },
  { id: 'the_dalles',          name: 'The Dalles',          milesFromPrevious: 100, terrain: 'mountains', kind: 'trading_post' },
  { id: 'laurel_hill',         name: 'Laurel Hill',         milesFromPrevious: 50,  terrain: 'mountains', kind: 'landmark' },
  { id: 'oregon_city',         name: 'Oregon City',         milesFromPrevious: 55,  terrain: 'forest',    kind: 'end' }
];

export function getLandmark(id: string): Landmark {
  const found = LANDMARKS.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown landmark: ${id}`);
  return found;
}

export function nextLandmarkAfter(id: string): Landmark | null {
  const idx = LANDMARKS.findIndex((l) => l.id === id);
  if (idx < 0 || idx >= LANDMARKS.length - 1) return null;
  return LANDMARKS[idx + 1];
}
