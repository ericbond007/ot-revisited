import type { Terrain } from '../types';

export interface RiverStats {
  depthFt: number;
  currentMph: number;
  ferryPrice: number;
}

// Narrow classification of trading-post flavor. Drives visual theming
// (accent color, glyph) in the trade UI and keeps room for future kinds
// (`native_post`, `road_ranch`, `ferry_crossing`, etc.). Purely cosmetic;
// no gameplay math reads this.
export type PostKind =
  | 'us_army'      // military quartermaster — navy accent
  | 'hbc'          // Hudson's Bay Company — dark green, British imports
  | 'mountain'     // isolated mountain man — rust / weathered
  | 'frontier'     // mixed fur-trade / emigrant hub — default rust
  | 'end_of_trail'; // luxurious last-chance — gold

export interface Landmark {
  id: string;
  name: string;
  milesFromPrevious: number;
  terrain: Terrain;
  kind: 'start' | 'trading_post' | 'landmark' | 'river' | 'end';
  // Present on river-kind landmarks. Per-river depth/current vary realistically
  // and drive Ford modal display + ford-action risk.
  river?: RiverStats;
  // Per-post trading inventory for trading_post landmarks. TradeModal filters
  // its buyable list against this. If undefined, the generic buyable list is
  // used as a fallback. Lists are historically flavored, not exhaustive — each
  // post had its own character (quartermaster basics at Kearny, HBC imports at
  // Hall, sparse at Bridger, end-of-trail luxuries at The Dalles, etc.).
  stock?: readonly string[];
  // Quantity multiplier on top of the per-category DEFAULT_STOCK_QTY —
  // a small mountain outpost like Bridger carries a fraction of what the
  // Laramie hub keeps in stock. Defaults to 1.0 when omitted.
  stockScale?: number;
  // Town services available at this post (#152). Hubs (Laramie, Hall,
  // Dalles) carry the full menu; outposts and road ranches carry
  // subsets. Empty / omitted = post is trade-only.
  services?: readonly ('blacksmith' | 'inn' | 'gambling' | 'brothel' | 'gossip' | 'guide')[];
  // Per-post inn rate override (USD/person/night). Defaults to the
  // global INN_DOLLARS_PER_PERSON_PER_NIGHT — only set on luxury posts.
  innNightlyRate?: number;
  // Post flavor — a narrow kind tag + a prose blurb shown at the top of the
  // Visit / Trade screens. Only populated on trading posts (today).
  postKind?: PostKind;
  blurb?: string;
  // Whether this post accepts goods from emigrants. Defaults to true.
  // Historically, U.S. Army quartermasters at forts like Kearny issued
  // supplies to soldiers — they did not buy from civilians. A future
  // `native_post` landmark kind will also use this when relations are
  // hostile (task #121).
  buysFromEmigrants?: boolean;
  // Year after which the post is no longer open (exclusive). Fort Hall
  // was abandoned by the HBC in 1856; parties arriving in 1857+ find
  // an empty stockade instead of a trading post. Consumers should check
  // `isLandmarkAbandoned(landmark, year)` rather than comparing directly.
  abandonedAfterYear?: number;
}

/**
 * True if the landmark's trading post has been abandoned by the time
 * the party arrives. Visit/Trade UI should gate on this; the stage
 * view switches flavor text.
 */
export function isLandmarkAbandoned(landmark: Landmark, year: number): boolean {
  return typeof landmark.abandonedAfterYear === 'number'
    && year > landmark.abandonedAfterYear;
}

export const LANDMARKS: readonly Landmark[] = [
  { id: 'independence',        name: 'Independence, MO',    milesFromPrevious: 0,   terrain: 'prairie',   kind: 'start' },
  { id: 'kansas_river',        name: 'Kansas River',        milesFromPrevious: 110, terrain: 'river',     kind: 'river',
    river: { depthFt: 3.0, currentMph: 2, ferryPrice: 3 } },
  { id: 'alcove_spring',       name: 'Alcove Spring',       milesFromPrevious: 40,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'big_blue_river',      name: 'Big Blue River',      milesFromPrevious: 30,  terrain: 'river',     kind: 'river',
    river: { depthFt: 2.5, currentMph: 1, ferryPrice: 2 } },
  { id: 'hollenberg_ranch',    name: 'Hollenberg Ranch',    milesFromPrevious: 40,  terrain: 'prairie',   kind: 'trading_post',
    // Private road ranch on Cottonwood Creek. Small sod-and-timber store
    // run by a German emigrant (Gerat Hollenberg). Mail stop later — for
    // now, just a handful of prairie staples and a few luxuries.
    postKind: 'frontier',
    stockScale: 0.5,
    services: ['gossip', 'inn', 'gambling', 'brothel'],
    blurb: "A sod-and-timber road ranch on Cottonwood Creek. A private store run by a German emigrant — prairie staples, a little whiskey, and whatever the last train didn't buy.",
    stock: [
      'flour', 'beans', 'bacon', 'hardtack',
      'bullets', 'bandages',
      'blanket',
      'ox_shoes', 'yoke', 'rope', 'spare_plank',
      'tobacco', 'whiskey'
    ] },
  { id: 'ft_kearny',           name: 'Fort Kearny',         milesFromPrevious: 80,  terrain: 'prairie',   kind: 'trading_post',
    // U.S. Army post. Quartermaster-issue basics — no luxuries.
    // Historical note: Army quartermasters issued to soldiers; they did
    // not buy goods from emigrants. Kearny is sell-only (for the player).
    postKind: 'us_army',
    buysFromEmigrants: false,
    stockScale: 1.0,
    services: ['gossip', 'blacksmith'],
    blurb: 'Soldiers drill at dawn; emigrants trade at dusk. The post quartermaster sets fair prices — no haggling, no luxuries, and he will not buy from you.',
    stock: [
      'flour', 'beans', 'bacon', 'hardtack',
      'bullets', 'bandages', 'quinine',
      'coat', 'blanket',
      'spare_plank', 'ox_shoes', 'yoke', 'rope', 'chicken', 'grain'
    ] },
  { id: 'ash_hollow',          name: 'Ash Hollow',          milesFromPrevious: 120, terrain: 'prairie',   kind: 'landmark' },
  { id: 'north_platte_1',      name: 'North Platte crossing (east)', milesFromPrevious: 60, terrain: 'river', kind: 'river',
    river: { depthFt: 2.5, currentMph: 2, ferryPrice: 4 } },
  { id: 'courthouse_rock',     name: 'Courthouse & Jail Rocks', milesFromPrevious: 70, terrain: 'prairie', kind: 'landmark' },
  { id: 'chimney_rock',        name: 'Chimney Rock',        milesFromPrevious: 25,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'scotts_bluff',        name: 'Scotts Bluff',        milesFromPrevious: 30,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'robidoux_post',       name: 'Robidoux Trading Post', milesFromPrevious: 10, terrain: 'prairie',  kind: 'trading_post',
    // Joseph Robidoux's post at Robidoux Pass, just south of Scotts Bluff.
    // A small fur-trader outfit — blacksmith services, moccasins, beads,
    // and whatever furs he's willing to spare.
    postKind: 'mountain',
    stockScale: 0.4,
    services: ['gossip', 'blacksmith'],
    blurb: "Joseph Robidoux's trading post at the pass south of Scotts Bluff. A fur-trader outfit with a working forge — moccasins, beads, and a few hard-won comforts.",
    stock: [
      'flour', 'bacon', 'jerky',
      'bullets', 'bandages',
      'coat', 'blanket',
      'ox_shoes', 'iron_scrap', 'rope', 'grain',
      'moccasins', 'buffalo_robe', 'beads',
      'tobacco'
    ] },
  { id: 'ft_laramie',          name: 'Fort Laramie',        milesFromPrevious: 40,  terrain: 'prairie',   kind: 'trading_post',
    // Fur-trade origin turned emigrant hub. The broadest selection on the
    // trail — and famously the highest prices.
    postKind: 'frontier',
    stockScale: 1.5,
    services: ['gossip', 'blacksmith', 'inn', 'gambling', 'brothel', 'guide'],
    blurb: 'A great adobe fort at the fork of the Laramie and North Platte. Last outpost before the Rockies — the broadest selection on the trail, and the steepest prices.',
    stock: [
      'flour', 'beans', 'bacon', 'hardtack', 'jerky', 'dried_fruit', 'coffee', 'tea',
      'bullets', 'bandages', 'quinine', 'laudanum', 'calomel', 'patent_medicine',
      'coat', 'boots', 'blanket',
      'wheel', 'axle', 'tongue', 'canvas', 'spare_plank', 'ox_shoes', 'yoke',
      'shovel', 'salt', 'rope', 'cookware', 'compass', 'water_skin', 'chicken', 'grain',
      'tobacco', 'whiskey', 'bible',
      'moccasins', 'buffalo_robe', 'beads'
    ] },
  { id: 'register_cliff',      name: 'Register Cliff',      milesFromPrevious: 12,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'guernsey_ruts',       name: 'Guernsey Ruts',       milesFromPrevious: 5,   terrain: 'prairie',   kind: 'landmark' },
  { id: 'north_platte_2',      name: 'North Platte (west crossing)', milesFromPrevious: 75, terrain: 'river', kind: 'river',
    river: { depthFt: 4.0, currentMph: 3, ferryPrice: 5 } },
  { id: 'willow_springs',      name: 'Willow Springs',      milesFromPrevious: 45,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'independence_rock',   name: 'Independence Rock',   milesFromPrevious: 35,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'devils_gate',         name: "Devil's Gate",        milesFromPrevious: 6,   terrain: 'mountains', kind: 'landmark' },
  { id: 'sweetwater_1',        name: 'Sweetwater River ford', milesFromPrevious: 40, terrain: 'river',    kind: 'river',
    river: { depthFt: 2.0, currentMph: 1, ferryPrice: 2 } },
  { id: 'ice_slough',          name: 'Ice Slough',          milesFromPrevious: 20,  terrain: 'prairie',   kind: 'landmark' },
  // South Pass is the broad sage flat saddle of the Continental Divide
  // — wagons rolled through, not over. Treat as prairie for travel
  // pacing despite the elevation. Same for the rolling sage country
  // out to Fort Bridger.
  { id: 'south_pass',          name: 'South Pass',          milesFromPrevious: 70,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'pacific_springs',     name: 'Pacific Springs',     milesFromPrevious: 5,   terrain: 'prairie',   kind: 'landmark' },
  { id: 'parting_of_ways',     name: 'Parting of the Ways', milesFromPrevious: 15,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'green_river',         name: 'Green River crossing', milesFromPrevious: 75, terrain: 'river',    kind: 'river',
    river: { depthFt: 4.5, currentMph: 4, ferryPrice: 8 } },
  { id: 'ft_bridger',          name: 'Fort Bridger',        milesFromPrevious: 65,  terrain: 'prairie',   kind: 'trading_post',
    // Jim Bridger's mountain post. Famously sparse — take what you can get.
    postKind: 'mountain',
    stockScale: 0.45,
    services: ['gossip', 'blacksmith'],
    blurb: "Jim Bridger's stockade is famously thin on stock. Moccasins, buffalo robes, and whatever the mountain men happened to bring in this week. Take what you can get.",
    stock: [
      'flour', 'bacon',
      'bullets', 'bandages',
      'blanket',
      'spare_plank', 'ox_shoes', 'iron_scrap', 'rope', 'grain',
      'moccasins', 'buffalo_robe'
    ] },
  { id: 'bear_river',          name: 'Bear River crossing', milesFromPrevious: 100, terrain: 'river',     kind: 'river',
    river: { depthFt: 3.0, currentMph: 2, ferryPrice: 4 } },
  { id: 'soda_springs',        name: 'Soda Springs',        milesFromPrevious: 35,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'ft_hall',             name: 'Fort Hall',           milesFromPrevious: 70,  terrain: 'prairie',   kind: 'trading_post',
    // Hudson's Bay Company (HBC — British fur-trade firm) post on the Snake.
    // Well-supplied with British imports via HBC supply lines (tea, quality
    // wool blankets, manufactured goods). California Trail splits here.
    // Historically HBC abandoned the post in 1856; parties arriving after
    // find an empty stockade. (Later briefly held by the US Army, but for
    // game purposes we treat it as closed.)
    postKind: 'hbc',
    abandonedAfterYear: 1856,
    stockScale: 1.1,
    services: ['gossip', 'blacksmith', 'inn', 'gambling', 'brothel', 'guide'],
    blurb: "A Hudson's Bay Company post on the Snake. British imports via HBC supply lines — tea, good wool blankets, manufactured goods. The California Trail splits here; half the wagons turn south.",
    stock: [
      'flour', 'beans', 'bacon', 'hardtack', 'jerky', 'dried_fruit', 'sugar', 'coffee', 'tea',
      'bullets', 'bandages', 'quinine', 'laudanum',
      'coat', 'boots', 'blanket',
      'wheel', 'axle', 'tongue', 'canvas', 'ox_shoes', 'yoke', 'grain',
      'salt', 'tobacco', 'whiskey', 'harmonica'
    ] },
  { id: 'snake_three_island',  name: 'Three Island Crossing', milesFromPrevious: 150, terrain: 'river',   kind: 'river',
    river: { depthFt: 5.0, currentMph: 3, ferryPrice: 6 } },
  { id: 'ft_boise',            name: 'Fort Boise',          milesFromPrevious: 130, terrain: 'desert',    kind: 'trading_post',
    // Small HBC station. Modest stock, not a major resupply.
    postKind: 'hbc',
    stockScale: 0.6,
    services: ['gossip', 'blacksmith'],
    blurb: 'A small HBC station by the Boise River. Cottonwoods, worn travelers, and a modest stock — not a major resupply, but the water is good.',
    stock: [
      'flour', 'bacon', 'dried_fruit',
      'bullets', 'bandages', 'quinine',
      'coat', 'blanket',
      'canvas', 'spare_plank', 'ox_shoes', 'grain',
      'moccasins', 'buffalo_robe'
    ] },
  { id: 'farewell_bend',       name: 'Farewell Bend',       milesFromPrevious: 95,  terrain: 'desert',    kind: 'landmark' },
  { id: 'blue_mountains',      name: 'Blue Mountains',      milesFromPrevious: 120, terrain: 'mountains', kind: 'landmark' },
  { id: 'grande_ronde',        name: 'Grande Ronde Valley', milesFromPrevious: 30,  terrain: 'forest',    kind: 'landmark' },
  { id: 'ft_walla_walla',      name: 'Fort Walla Walla',    milesFromPrevious: 40,  terrain: 'prairie',   kind: 'trading_post',
    // HBC river post. Basic but reliable stock. Native trade goods are a
    // specialty here (Walla Walla / Cayuse trade networks).
    postKind: 'hbc',
    stockScale: 0.7,
    services: ['gossip', 'blacksmith'],
    blurb: 'A lonely HBC outpost by the Columbia. Basic but reliable stock, and a specialty in Native trade goods — Walla Walla and Cayuse networks run through here.',
    stock: [
      'flour', 'beans', 'bacon',
      'bullets', 'bandages', 'quinine',
      'coat', 'blanket',
      'canvas', 'tongue', 'grain',
      'moccasins', 'buffalo_robe', 'beads'
    ] },
  { id: 'the_dalles',          name: 'The Dalles',          milesFromPrevious: 100, terrain: 'prairie',   kind: 'trading_post',
    // End-of-trail Columbia gorge town. Everything you forgot plus end-of-
    // trail comforts — fiddles, Bibles, nice boots. Prices are ruinous.
    postKind: 'end_of_trail',
    stockScale: 1.3,
    services: ['gossip', 'blacksmith', 'inn', 'gambling', 'brothel', 'guide'],
    innNightlyRate: 2,
    blurb: "A river-port town at the head of the Columbia gorge. End-of-trail chaos: everything you forgot, plus comforts for the final stretch — fiddles, Bibles, good boots. Prices are ruinous.",
    stock: [
      'flour', 'beans', 'bacon', 'hardtack', 'jerky', 'dried_fruit', 'sugar', 'coffee', 'tea',
      'bullets', 'bandages', 'quinine', 'laudanum', 'calomel', 'patent_medicine',
      'coat', 'boots', 'blanket',
      'wheel', 'axle', 'tongue', 'canvas', 'yoke',
      'cookware', 'rope', 'salt',
      'tobacco', 'whiskey', 'bible', 'harmonica', 'fiddle'
    ] },
  // Laurel Hill is dense Cascades forest — the Barlow Road's worst
  // stretch. Reclassed mountain → forest so the terrain descriptor
  // matches the visual + the forest mult (0.85) gives it bite.
  { id: 'laurel_hill',         name: 'Laurel Hill',         milesFromPrevious: 50,  terrain: 'forest',    kind: 'landmark' },
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
