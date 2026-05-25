import type { Terrain } from '../types';

export interface RiverStats {
  depthFt: number;
  currentMph: number;
  ferryPrice: number;
  // #238 Optional native-run ferry. If present and the named tribe is
  // friendly enough (attitude ≥ NATIVE_FERRY_MIN_ATTITUDE), the ford
  // modal offers a 5th method: bull-boat / raft across for `priceQty`
  // of `priceItem`. Period reality: Frizzell 1852 / Sage 1846 record
  // Shoshone bull-boats on the Green River — three buffalo hides sewn
  // over a willow frame, paid for in beads or a knife.
  nativeFerry?: {
    tribeId: string;
    priceItem: string;
    priceQty: number;
    /** Plain-English flavor for the ford-method sublabel. */
    blurb: string;
  };
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
  | 'end_of_trail' // luxurious last-chance — gold
  | 'native'       // tribal seasonal camp — earth tones, teepee glyph (#202)
  | 'mission';     // missionary aid station — pale steel-blue, cross glyph (#206)

export interface Landmark {
  id: string;
  name: string;
  milesFromPrevious: number;
  terrain: Terrain;
  /** #1019 — Optional altitude in feet for the continuous temperature
   *  model. When undefined, `systems/temperature.ts` falls back to a
   *  terrain default (prairie 1500, forest 2500, desert 3500,
   *  mountains 6500, river 1000). Override only where the landmark is
   *  meaningfully off-baseline (South Pass 7400, Independence Rock
   *  6000, Walla Walla 700, Oregon City 50, etc.). */
  elevationFt?: number;
  kind: 'start' | 'trading_post' | 'landmark' | 'river' | 'end';
  // Present on river-kind landmarks. Per-river depth/current vary realistically
  // and drive Ford modal display + ford-action risk.
  river?: RiverStats;
  // #1039 — scenic landmark that sits on a year-round water source the
  // party can reach to refill the cask, even though it isn't a trading
  // post or a ford. Period reality: the Snake River ran beside the
  // Hall→Boise trail the whole way but in a deep canyon; emigrants
  // could only get down to it at known descents (Salmon Falls fishery,
  // American Falls). Diaries describe these as the watering stops that
  // made the Snake desert survivable. Engine treats the leg as bone-dry
  // desert otherwise; this flag re-adds the historical access points.
  // Refill fires when the party PASSES the scenic landmark (it doesn't
  // pause the UI like a post/ford does).
  waterSource?: boolean;
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
  services?: readonly ('blacksmith' | 'inn' | 'gambling' | 'brothel' | 'gossip' | 'guide' | 'bath_house' | 'ox_swap')[];
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
  // Per-post buyer gating (#204). Categories the post will not buy
  // from emigrants. Empty / omitted = the post buys all categories.
  // Period: a road ranch like Hollenberg sold flour and corn — it
  // didn't deal in fur-trade specialty (raw hides, buffalo robes,
  // beads, native trade goods). Mountain-man and HBC posts WERE the
  // fur trade and bought everything. The army post is gated upstream
  // by buysFromEmigrants:false so this map can stay narrow.
  excludeBuyCategories?: readonly string[];
  // Year after which the post is no longer open (exclusive). Fort Hall
  // was abandoned by the HBC in 1856; parties arriving in 1857+ find
  // an empty stockade instead of a trading post. Consumers should check
  // `isLandmarkAbandoned(landmark, year)` rather than comparing directly.
  abandonedAfterYear?: number;
  // Year before which the post does not yet exist (exclusive). Rock
  // Creek Station opened in 1857; pre-1857 starts see open prairie at
  // that mile. Same gate semantics as `abandonedAfterYear` — treated
  // by `isLandmarkAbandoned` as "not yet built" in the gate.
  abandonedBeforeYear?: number;
  // #276 follow-up — per-post buy/sell multiplier on the canonical
  // PRICES table. 1.0 = mid-trail tier (Laramie / Hall / Walla Walla
  // baseline). >1 = gouge tier (Bridger 1.5, Dalles 1.3 end-of-trail,
  // Robidoux 1.3 mountain-trader, Boise 1.2 sparse HBC). <1 = charity
  // (Whitman 0.9 mission). Applies symmetrically: a 1.5× post charges
  // 50% more on player buys AND pays 50% more on player sells, holding
  // the markup ratio constant. Defaults to 1.0 when omitted.
  priceMultiplier?: number;
  // Tribe affiliation for native trading-post landmarks (#202). Drives
  // tribe-attitude gating: a hostile tribe's camp turns up empty/avoided,
  // wary trades work but at worse rates, friendly+ trades flow normally.
  // Read by isLandmarkAccessible() and the tribe-aware visit/trade flows.
  tribeId?: string;
  // #915 — Items the post pays a +15% premium for when bartered. Period
  // anchors: HBC at Boise prized buffalo robes (Carpenter 1857); Bridger
  // preferred fresh meat + horses (Hastings 1845); mission stations
  // wanted fresh game the farm couldn't supply (Whitman). Reads applied
  // by `systems/barter.ts:quoteBarter`.
  barterPreferred?: readonly string[];
  // #915 — Items the post discounts by −40% if it'll take them at all.
  // Bryant 1846 on Bridger refusing whiskey: "double the rate of any
  // other staple." Per-post moral / stocking quirks.
  barterRefused?: readonly string[];
  // #915 — When explicitly false, the post runs cash-only (Mormon
  // ferries, contract operations). Default true — every fort + mission +
  // road ranch pre-1860 ran barter, per Bryant / Royce / Carpenter.
  barterEnabled?: boolean;
}

/**
 * True if the landmark's trading post has been abandoned by the time
 * the party arrives. Visit/Trade UI should gate on this; the stage
 * view switches flavor text.
 */
export function isLandmarkAbandoned(landmark: Landmark, year: number): boolean {
  if (typeof landmark.abandonedAfterYear === 'number' && year > landmark.abandonedAfterYear) {
    return true;
  }
  if (typeof landmark.abandonedBeforeYear === 'number' && year < landmark.abandonedBeforeYear) {
    return true;
  }
  return false;
}

/**
 * For native trading-post landmarks (#202): true if the affiliated
 * tribe is hostile (attitude < 21). When hostile, the camp is empty
 * — band has fled / war is on — and trade is unavailable. Stage view
 * shows a "camp avoided" flavor instead of the usual visit affordances.
 *
 * Returns false (accessible) for non-native posts and for posts
 * without a tribeId.
 */
export function isNativeCampHostile(
  landmark: Landmark,
  attitude: number
): boolean {
  if (landmark.postKind !== 'native') return false;
  if (!landmark.tribeId) return false;
  return attitude < 21;
}

// #1040 — Historical mileage pass. Every `milesFromPrevious` was
// re-anchored so the cumulative distance from Independence matches the
// canonical Oregon Trail figures. Sources: Gregory Franzwa, "Maps of
// the Oregon Trail" (1982, the mile-by-mile standard); NPS Oregon
// National Historic Trail; Aubrey Haines, "Historic Sites Along the
// Oregon Trail"; OCTA mileage tables. Anchor cumulative miles:
//   Fort Kearny 319 · Chimney Rock 492 · Fort Laramie 650 ·
//   Independence Rock 815 · South Pass 915 (Continental Divide) ·
//   Fort Bridger 1040 · Soda Springs 1145 · Fort Hall 1290 ·
//   Fort Boise 1570 · Whitman Mission 1830 · The Dalles 1950 ·
//   Oregon City 2170 (canonical total).
// Pre-pass the trail was 2195 mi and bloated the mid-section by up to
// +127 mi at South Pass (then compressed the Columbia leg to
// compensate) — emigrants ground through ~125 phantom mid-trail miles.
// Landmark ORDER is unchanged here; the massacre_rocks/ft_hall and
// north_platte_2/martins_cove geographic-sequence quirks are tracked
// separately (#1040 follow-up) since re-ordering touches event anchors.
export const LANDMARKS: readonly Landmark[] = [
  { id: 'independence_mo',     name: 'Independence, MO',    milesFromPrevious: 0,   terrain: 'prairie',   kind: 'start' },
  // #242 — Lone Elm Campground (mile ~40, KS). The first overnight
  // stop out of Independence; the place where a hundred wagons would
  // pull into a half-circle, organize officers, and figure out how to
  // travel together. Period diaries describe the chaos: oxen mixed up,
  // cattle scattered, dogfights, lost children. Just a single elm tree
  // for shade, hence the name. We keep it as a flavor landmark for
  // now — arrival event with the company-organizing vignette is a
  // follow-up.
  { id: 'lone_elm_campground', name: 'Lone Elm Campground', milesFromPrevious: 40,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'kansas_river',        name: 'Kansas River',        milesFromPrevious: 60,  terrain: 'river',     kind: 'river',
    river: { depthFt: 3.0, currentMph: 2, ferryPrice: 3 } },
  // #243 — Vieux's Crossing on the Vermillion (mile ~145, KS). Louis
  // Vieux ran a toll bridge across the Vermillion 1840s+. Iconic 1849
  // cholera cemetery sprung up around the crossing — diary after diary
  // mentions the line of fresh graves on the rise above the toll. The
  // year-gated cholera flavor event is a follow-up.
  { id: 'vieux_crossing',      name: "Vieux's Crossing",    milesFromPrevious: 24,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'alcove_spring',       name: 'Alcove Spring',       milesFromPrevious: 24,  terrain: 'prairie',   kind: 'landmark' },
  // Alcove Spring sits at the Big Blue ford; the named camp and the
  // crossing are essentially collocated. 5 mi covers wagons rolling
  // down from the spring to the river bank.
  { id: 'big_blue_river',      name: 'Big Blue River',      milesFromPrevious: 2,   terrain: 'river',     kind: 'river',
    river: { depthFt: 2.5, currentMph: 1, ferryPrice: 2 } },
  { id: 'hollenberg_ranch',    name: 'Hollenberg Ranch',    milesFromPrevious: 30,  terrain: 'prairie',   kind: 'trading_post',
    // Private road ranch on Cottonwood Creek. Small sod-and-timber store
    // run by a German emigrant (Gerat Hollenberg). Mail stop later — for
    // now, just a handful of prairie staples and a few luxuries.
    postKind: 'frontier',
    stockScale: 0.5,
    // Road ranch — sells food, lodging, simple supplies. Doesn't deal
    // in fur-trade specialty.
    excludeBuyCategories: ['native_trade'],
    services: ['gossip', 'inn', 'gambling', 'brothel'],
    blurb: "A sod-and-timber road ranch on Cottonwood Creek. A private store run by a German emigrant — prairie staples, a little whiskey, and whatever the last train didn't buy.",
    stock: [
      'flour', 'beans', 'bacon', 'hardtack',
      'gunpowder', 'lead_pig', 'lead_balls', 'percussion_caps', 'bandages',
      'blanket',
      'ox_shoes', 'yoke', 'ox_bow', 'picket_pins', 'rope', 'spare_plank',
      'tobacco', 'whiskey'
    ] },
  // #244 — Rock Creek Station (mile ~230, NE). 1857+ road ranch on
  // the Little Blue / Rock Creek crossing. Hickok shootout site (the
  // McCanles affair) is 1861 — the post predates that by four years.
  // Year-gated abandonedBeforeYear: 1857 so pre-1857 starts see open
  // prairie. Sparse stock — frontier ranch, not a hub.
  { id: 'rock_creek_station',  name: 'Rock Creek Station',  milesFromPrevious: 27,  terrain: 'prairie',   kind: 'trading_post',
    postKind: 'frontier',
    abandonedBeforeYear: 1857,
    stockScale: 0.4,
    services: ['gossip', 'inn'],
    blurb: "A sod-roofed ranch on the Rock Creek crossing. Whiskey, lodging, and the kind of grim hospitality that produced the McCanles shootout in '61. The proprietor watches you with one hand near the rifle.",
    stock: [
      'flour', 'bacon', 'jerky', 'hardtack',
      'gunpowder', 'lead_balls', 'percussion_caps', 'bandages',
      'rope', 'tobacco', 'whiskey'
    ] },
  { id: 'ft_kearny',           name: 'Fort Kearny',         milesFromPrevious: 112, terrain: 'prairie',   elevationFt: 2200, kind: 'trading_post',
    // U.S. Army post. Quartermaster-issue basics — no luxuries.
    // Historical note: Army quartermasters issued to soldiers; they did
    // not buy goods from emigrants. Kearny is sell-only (for the player).
    postKind: 'us_army',
    buysFromEmigrants: false,
    stockScale: 1.0,
    services: ['gossip', 'blacksmith'],
    blurb: 'Soldiers drill at dawn; emigrants trade at dusk. The post quartermaster sets fair prices — no haggling, no luxuries, and he will not buy from you.',
    stock: [
      // Marcy 5 (period: standard Army-quartermaster issue + sale to
      // emigrants per Bryant 1846): flour / bacon / coffee / sugar / salt.
      // Hardtack OK here — Army issue ration, distinct from civilian
      // ship's-biscuit which was outfitter-only (Hancock 1852: "no
      // hardtack west of St. Joseph" was the civilian context).
      'flour', 'cornmeal', 'beans', 'bacon', 'salt_pork', 'hardtack', 'coffee', 'sugar', 'salt', 'saleratus',
      'gunpowder', 'lead_pig', 'lead_balls', 'percussion_caps', 'bandages', 'quinine',
      'coat', 'blanket', 'tent',
      'spare_plank', 'tar_bucket', 'ox_shoes', 'yoke', 'ox_bow', 'picket_pins', 'rope', 'chicken', 'grain',
      'lard'
    ] },
  // #245 — Windlass Hill (mile ~510, NE). The steep descent INTO Ash
  // Hollow from the high tableland. Wagons were rope-lowered down the
  // 25° grade — teams unhitched, wheels locked, log skids dragged
  // behind. Period diaries describe taking three to four hours per
  // wagon. The ox-fatigue / wagon-damage descent mechanic is a
  // follow-up; for now, just a flavor landmark before Ash Hollow.
  { id: 'windlass_hill',       name: 'Windlass Hill',       milesFromPrevious: 92, terrain: 'mountains', kind: 'landmark' },
  { id: 'ash_hollow',          name: 'Ash Hollow',          milesFromPrevious: 2,   terrain: 'prairie',   kind: 'landmark' },
  // #246 — Rachel Pattison's grave (mile ~516, NE). 1849 cholera
  // death — a 19-year-old bride from Iowa, buried with a sandstone
  // marker that still stands. The most-photographed grave on the
  // trail. Year-gated arrival event with the cholera vignette is a
  // follow-up; for now just a passing landmark.
  { id: 'rachel_pattison_grave', name: "Rachel Pattison's Grave", milesFromPrevious: 2, terrain: 'prairie', kind: 'landmark' },
  { id: 'north_platte_1',      name: 'North Platte crossing (east)', milesFromPrevious: 30, terrain: 'river', kind: 'river',
    river: { depthFt: 2.5, currentMph: 2, ferryPrice: 4 } },
  { id: 'courthouse_rock',     name: 'Courthouse & Jail Rocks', milesFromPrevious: 27, terrain: 'prairie', kind: 'landmark' },
  { id: 'chimney_rock',        name: 'Chimney Rock',        milesFromPrevious: 20,  terrain: 'prairie',   elevationFt: 4200, kind: 'landmark' },
  { id: 'scotts_bluff',        name: 'Scotts Bluff',        milesFromPrevious: 20,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'robidoux_post',       name: 'Robidoux Trading Post', milesFromPrevious: 6, terrain: 'prairie',  kind: 'trading_post',
    // Joseph Robidoux's post at Robidoux Pass, just south of Scotts Bluff.
    // A small fur-trader outfit — blacksmith services, moccasins, beads,
    // and whatever furs he's willing to spare.
    postKind: 'mountain',
    stockScale: 0.4,
    // #276 Mountain trader — 30% above mid-trail tier.
    priceMultiplier: 1.3,
    services: ['gossip', 'blacksmith'],
    blurb: "Joseph Robidoux's trading post at the pass south of Scotts Bluff. A fur-trader outfit with a working forge — moccasins, beads, and a few hard-won comforts.",
    stock: [
      'flour', 'bacon', 'jerky',
      'gunpowder', 'lead_pig', 'lead_balls', 'percussion_caps', 'bandages',
      'coat', 'blanket',
      'ox_shoes', 'rope', 'grain',
      'moccasins', 'buffalo_robe', 'beads',
      'tobacco',
      // Robidoux was a fur trader — kept the small trinkets in stock.
      'mirror', 'awl', 'thimble', 'pocket_knife'
    ] },
  { id: 'ft_laramie',          name: 'Fort Laramie',        milesFromPrevious: 132,  terrain: 'prairie',   elevationFt: 4300, kind: 'trading_post',
    // Fur-trade origin turned emigrant hub. The broadest selection on the
    // trail — and famously the highest prices.
    postKind: 'frontier',
    stockScale: 1.5,
    services: ['gossip', 'blacksmith', 'inn', 'gambling', 'brothel', 'guide', 'bath_house', 'ox_swap'],
    // #915 — Laramie's fur-trade origins meant a permanent appetite
    // for robes + hides for the eastbound shipments. Bryant 1846 +
    // Sage 1846 both record bartering hides + jerky for staples here.
    barterPreferred: ['buffalo_robe', 'raw_hide', 'game_meat', 'jerky'],
    blurb: 'A great adobe fort at the fork of the Laramie and North Platte. Last outpost before the Rockies — the broadest selection on the trail, and the steepest prices.',
    stock: [
      // Marcy 5 (period: Bryant 1846 + Carpenter 1857 record all five
      // bought at Laramie). Sugar added — Carpenter 1857 specifically.
      // Hardtack / jerky / dried_fruit removed: outfitter-only or
      // homemade per period diaries — Hancock 1852 "no hardtack west
      // of St. Joseph", Carpenter 1857 "no dried fruit had at any post
      // past Independence", emigrants made their own jerky from hunts.
      'flour', 'cornmeal', 'beans', 'bacon', 'salt_pork', 'coffee', 'sugar', 'tea',
      'gunpowder', 'lead_pig', 'lead_balls', 'percussion_caps', 'bullet_mold', 'bandages', 'quinine', 'laudanum', 'calomel', 'patent_medicine', 'vinegar',
      'epsom_salts', 'camphor', 'paregoric', 'hartshorn', 'dovers_powder', 'castor_oil',
      'coat', 'boots', 'blanket', 'tent',
      'wheel', 'axle', 'tongue', 'canvas', 'spare_plank', 'tar_bucket', 'ox_shoes', 'yoke', 'ox_bow', 'picket_pins',
      'shovel', 'salt', 'saleratus', 'soap', 'lard', 'rope', 'cookware', 'compass', 'water_bag', 'chicken', 'milk_cow', 'cheese_press', 'butter_crock', 'grain',
      'tobacco', 'whiskey', 'bible',
      'anvil', 'china_tea_set', 'feather_mattress', 'grandfather_clock',
      'moccasins', 'buffalo_robe', 'beads',
      'mirror', 'vermilion', 'awl', 'thimble', 'calico', 'pocket_knife'
    ] },
  // Register Cliff sits ~60 mi past Laramie near present-day Guernsey.
  // The wagon ruts at Guernsey are a couple miles further along.
  { id: 'register_cliff',      name: 'Register Cliff',      milesFromPrevious: 3,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'guernsey_ruts',       name: 'Guernsey Ruts',       milesFromPrevious: 3,   terrain: 'prairie',   kind: 'landmark' },
  // #247 — Mormon Ferry / Fort Caspar (mile ~810, WY). Brigham Young's
  // Mormons opened a ferry on the North Platte west crossing in 1847
  // and ran it until a bridge replaced it in 1853. The Army built
  // Fort Caspar at the same site in 1855 to protect the bridge. We
  // model it as a small Army post abandonedBeforeYear: 1855 so pre-
  // 1855 parties see open ground (and pay the river ferry as before),
  // 1855+ get a quartermaster stop. The era-gated ferry-vs-bridge
  // pricing on north_platte_2 itself is a follow-up.
  { id: 'ft_caspar',           name: 'Fort Caspar',         milesFromPrevious: 114,  terrain: 'prairie',   kind: 'trading_post',
    postKind: 'us_army',
    abandonedBeforeYear: 1855,
    buysFromEmigrants: false,
    stockScale: 0.6,
    services: ['gossip', 'blacksmith'],
    blurb: 'A two-acre Army post at the bridge over the North Platte. Sutler row, a forge, and a sergeant who eyes every wagon. The Mormons used to run a ferry here; the soldiers now charge a toll on the bridge.',
    stock: [
      'flour', 'cornmeal', 'beans', 'bacon', 'salt_pork', 'hardtack',
      'gunpowder', 'lead_balls', 'percussion_caps', 'bandages', 'quinine',
      'coat', 'blanket',
      'spare_plank', 'ox_shoes', 'rope', 'tobacco'
    ] },
  // #248 — Martin's Cove (mile ~855, WY). Site of the 1856 Mormon
  // handcart disaster — the Martin Company was caught by an October
  // blizzard and 56 of 576 died of exposure at the cove. Memorial
  // landmark. Year-gated cold-weather arrival vignette is a follow-up.
  { id: 'martins_cove',        name: "Martin's Cove",       milesFromPrevious: 30,  terrain: 'mountains', kind: 'landmark' },
  // North Platte west crossing was at the Casper area; with ft_caspar
  // and Martin's Cove inserted, the remaining stretch is short.
  { id: 'north_platte_2',      name: 'North Platte (west crossing)', milesFromPrevious: 8, terrain: 'river', kind: 'river',
    river: { depthFt: 4.0, currentMph: 3, ferryPrice: 5 } },
  { id: 'willow_springs',      name: 'Willow Springs',      milesFromPrevious: 4,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'independence_rock',   name: 'Independence Rock',   milesFromPrevious: 3,  terrain: 'prairie',   elevationFt: 6000, kind: 'landmark' },
  { id: 'devils_gate',         name: "Devil's Gate",        milesFromPrevious: 5,   terrain: 'mountains', kind: 'landmark' },
  { id: 'sweetwater_1',        name: 'Sweetwater River ford', milesFromPrevious: 10, terrain: 'river',    kind: 'river',
    river: { depthFt: 2.0, currentMph: 1, ferryPrice: 2 } },
  // Cheyenne summer camp on the Sweetwater plains (#202). Cheyenne
  // bands ranged the high country south of the Black Hills west to
  // the Powder and Wind River basins; summer camps near the Sweetwater
  // would have been a normal sight to a passing wagon. Trade is
  // hide-for-robe at a favorable rate — Cheyenne women tanned the
  // finest robes on the plains.
  { id: 'cheyenne_camp',       name: 'Cheyenne Summer Camp', milesFromPrevious: 30, terrain: 'prairie',   kind: 'trading_post',
    postKind: 'native',
    tribeId: 'cheyenne',
    stockScale: 0.4,
    services: ['gossip'],
    blurb: 'A Cheyenne band has set up summer lodges along the Sweetwater. Smoke curls from a dozen teepees; horses graze in the willows. The women bring out finished robes and moccasins; the men squat at the fire and watch.',
    stock: [
      'buffalo_robe', 'moccasins', 'pemmican',
      'beads', 'blanket', 'jerky'
    ],
    excludeBuyCategories: ['wagon_part', 'tool'] },
  { id: 'ice_slough',          name: 'Ice Slough',          milesFromPrevious: 20,  terrain: 'prairie',   kind: 'landmark' },
  // South Pass is the broad sage flat saddle of the Continental Divide
  // — wagons rolled through, not over. Treat as prairie for travel
  // pacing despite the elevation. Same for the rolling sage country
  // out to Fort Bridger.
  { id: 'south_pass',          name: 'South Pass',          milesFromPrevious: 35,  terrain: 'prairie',   elevationFt: 7400, kind: 'landmark' },
  { id: 'pacific_springs',     name: 'Pacific Springs',     milesFromPrevious: 3,   terrain: 'prairie',   kind: 'landmark' },
  { id: 'parting_of_ways',     name: 'Parting of the Ways', milesFromPrevious: 7,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'green_river',         name: 'Green River crossing', milesFromPrevious: 50, terrain: 'river',    kind: 'river',
    river: {
      depthFt: 4.5, currentMph: 4, ferryPrice: 8,
      // Shoshone bull-boat — Sage 1846, Frizzell 1852. Beads were the
      // common currency on the Green; six strings was the going rate.
      nativeFerry: { tribeId: 'shoshone', priceItem: 'beads', priceQty: 6, blurb: 'Shoshone bull-boat — three hides on a willow frame, six strings of beads' }
    } },
  // #249 — Big Hill (mile ~1140, ID). The steep descent into Bear
  // Valley — teams doubled, wagons rough-locked with chains and log
  // skids. Period diaries describe it as "the worst hill we have yet
  // seen." Ox-fatigue / wagon-damage descent mechanic is a follow-up;
  // for now, scenic landmark only.
  { id: 'big_hill',            name: 'Big Hill',            milesFromPrevious: 35,  terrain: 'mountains', kind: 'landmark' },
  { id: 'ft_bridger',          name: 'Fort Bridger',        milesFromPrevious: 30,  terrain: 'prairie',   elevationFt: 6700, kind: 'trading_post',
    // Jim Bridger's mountain post. Famously sparse — take what you can get.
    postKind: 'mountain',
    stockScale: 0.45,
    // #276 Bridger 1849 was the period gouge-king — 50% above mid-trail.
    // Period sources: Sage 1846, Frizzell 1852, Bryant 1848 all
    // remark on Bridger's exorbitant prices for what little he had.
    priceMultiplier: 1.5,
    services: ['gossip', 'blacksmith', 'ox_swap'],
    // #915 — Bridger valued meat + hides above all (Hastings 1845
    // notes him buying fresh game at near-cash). Refused whiskey —
    // Bryant 1846 records it specifically.
    barterPreferred: ['game_meat', 'jerky', 'pemmican', 'buffalo_robe', 'raw_hide'],
    barterRefused: ['whiskey'],
    blurb: "Jim Bridger's stockade is famously thin on stock. Moccasins, buffalo robes, and whatever the mountain men happened to bring in this week. Take what you can get.",
    stock: [
      // Marcy 5 (period: Carpenter 1857 explicit "50 lb flour, 20 lb
      // bacon, 5 lb coffee, 8 lb sugar at Fort Bridger"). Salt + beans
      // added for the universal staples Sage 1846 records there.
      // Famously thin overall — kept the basket short.
      'flour', 'bacon', 'beans', 'coffee', 'sugar', 'salt', 'saleratus',
      'gunpowder', 'lead_pig', 'lead_balls', 'percussion_caps', 'bandages',
      'blanket',
      'spare_plank', 'ox_shoes', 'rope', 'grain', 'water_bag',
      'moccasins', 'buffalo_robe',
      // Bridger's specialty per Marcy 1859 — fur-trade beads and trinkets.
      'beads', 'mirror', 'vermilion', 'awl', 'thimble', 'calico', 'pocket_knife'
    ] },
  // Shoshone summer camp on the upper Bear River (#202). Washakie's
  // Eastern Shoshone wintered around Wind River and rode south for the
  // summer hunt — Bear River valley was the regular gathering. Trade
  // is excellent: Washakie's people maintained warm relations with
  // emigrants from the Lewis & Clark generation onward.
  { id: 'shoshone_camp',       name: 'Shoshone Summer Camp', milesFromPrevious: 45, terrain: 'prairie',   kind: 'trading_post',
    postKind: 'native',
    tribeId: 'shoshone',
    stockScale: 0.5,
    services: ['gossip'],
    blurb: 'A Shoshone camp spreads across the willow flats above the Bear. Children play around the lodges; an old man works rawhide on a frame in the shade. Washakie himself nods a greeting as you ride in.',
    stock: [
      'buffalo_robe', 'moccasins', 'pemmican',
      'beads', 'blanket', 'jerky', 'tobacco'
    ],
    excludeBuyCategories: ['wagon_part', 'tool'] },
  { id: 'bear_river',          name: 'Bear River crossing', milesFromPrevious: 10,  terrain: 'river',     kind: 'river',
    river: { depthFt: 3.0, currentMph: 2, ferryPrice: 4 } },
  { id: 'soda_springs',        name: 'Soda Springs',        milesFromPrevious: 50,  terrain: 'prairie',   elevationFt: 5800, kind: 'landmark' },
  // #250 — Massacre Rocks (mile ~1290, ID). Pre-1862 just "Gate of
  // Death" — a narrow basalt gap on the Snake where ambushes were
  // feared. After the 1862 Shoshone-Bannock attacks killed 10
  // emigrants the name stuck. Year-aware ambush flavor is a follow-up.
  { id: 'massacre_rocks',      name: 'Massacre Rocks',      milesFromPrevious: 100,   terrain: 'mountains', kind: 'landmark' },
  { id: 'ft_hall',             name: 'Fort Hall',           milesFromPrevious: 45,  terrain: 'prairie',   elevationFt: 4500, kind: 'trading_post',
    // Hudson's Bay Company (HBC — British fur-trade firm) post on the Snake.
    // Well-supplied with British imports via HBC supply lines (tea, quality
    // wool blankets, manufactured goods). California Trail splits here.
    // Historically HBC abandoned the post in 1856; parties arriving after
    // find an empty stockade. (Later briefly held by the US Army, but for
    // game purposes we treat it as closed.)
    postKind: 'hbc',
    abandonedAfterYear: 1856,
    stockScale: 1.1,
    services: ['gossip', 'blacksmith', 'inn', 'gambling', 'brothel', 'guide', 'ox_swap'],
    // #915 — HBC's eastbound shipments needed buffalo robes + hides;
    // Hall was a primary collection point (Carpenter 1857 records
    // trading robes for British wool blankets here). Refused whiskey:
    // HBC company policy under Pemberton.
    barterPreferred: ['buffalo_robe', 'raw_hide', 'pemmican', 'game_meat'],
    barterRefused: ['whiskey'],
    blurb: "A Hudson's Bay Company post on the Snake. British imports via HBC supply lines — tea, good wool blankets, manufactured goods. The California Trail splits here; half the wagons turn south.",
    stock: [
      // Marcy 5 + beans (period: HBC supply lines kept Hall the
      // best-stocked emigrant post on the trail). Hardtack / jerky /
      // dried_fruit removed — outfitter-only or homemade per period
      // diaries (Carpenter 1857: "no dried fruit past Independence").
      'flour', 'beans', 'bacon', 'sugar', 'coffee', 'tea', 'salt', 'saleratus',
      'gunpowder', 'lead_pig', 'lead_balls', 'percussion_caps', 'bullet_mold', 'bandages', 'quinine', 'laudanum',
      'epsom_salts', 'camphor', 'paregoric',
      'coat', 'boots', 'blanket', 'tent',
      'wheel', 'axle', 'tongue', 'canvas', 'ox_shoes', 'yoke', 'ox_bow', 'picket_pins', 'grain', 'milk_cow', 'cheese_press', 'butter_crock',
      'soap', 'tobacco', 'whiskey', 'harmonica',
      // #1021 — water_bag (rubber bag, 1849+). Period: Carpenter 1857
      // "two rubber bags at Hall, four dollars apiece." THE post for
      // the Snake desert push.
      'water_bag',
      // HBC supply lines kept abundant Plains trade goods on hand.
      'beads', 'mirror', 'vermilion', 'awl', 'thimble', 'calico', 'pocket_knife'
    ] },
  // #251 — Salmon Falls (mile ~1450, ID). Shoshone fishery on the
  // upper Snake — bands speared and dried thousands of salmon every
  // summer. Period emigrants traded knives, beads, and tobacco for
  // fresh fish. The salmon-trade encounter (#239) already covers the
  // gameplay; this entry is the geographic anchor.
  // #963 audit fix: terrain was 'river' but kind is 'landmark' (scenic
  // Snake-River waterfall, not a ford). 'river' terrain has milesPerDay
  // multiplier 0 — fine for kind:'river' fords where the bot uses ford()
  // to bypass, broken for a kind:'landmark' the bot walks past. Bot
  // would freeze on arrival (mile 1343) and never advance. Snake-basin
  // southern Idaho is sage desert; 'desert' is correct.
  // #1039 — waterSource: Salmon Falls IS the Snake River (a major
  // waterfall + Shoshone salmon fishery). Frizzell 1852 and the #239
  // salmon-trade encounter both have emigrants camped here watering
  // and trading for fish. Modeling it as bone-dry desert was the bug
  // behind the Hall→Boise dehydration-wipe cluster (audit #1039: 6 of
  // 11 family-wagon dehydration wipes died on this 110-mi leg with no
  // water access). The descent to the falls is the historical relief.
  { id: 'salmon_falls',        name: 'Salmon Falls',        milesFromPrevious: 90, terrain: 'desert',    kind: 'landmark', waterSource: true },
  { id: 'snake_three_island',  name: 'Three Island Crossing', milesFromPrevious: 30, terrain: 'river',   kind: 'river',
    river: {
      depthFt: 5.0, currentMph: 3, ferryPrice: 6,
      // Bannock / Shoshone bands at the crossing helped emigrants float
      // wagons. Period reality: Frizzell 1852 paid "a knife and a few
      // strings of beads" for the lift; we settle on 4 beads + 1 lb
      // tobacco — pricier than the Green because the Snake is wider.
      nativeFerry: { tribeId: 'shoshone', priceItem: 'beads', priceQty: 4, blurb: 'Bannock-Shoshone raft — 4 strings of beads' }
    } },
  { id: 'ft_boise',            name: 'Fort Boise',          milesFromPrevious: 160, terrain: 'desert',    elevationFt: 2100, kind: 'trading_post',
    // Small HBC station. Modest stock, not a major resupply.
    postKind: 'hbc',
    stockScale: 0.6,
    services: ['gossip', 'blacksmith'],
    // #915 — HBC at Boise prized buffalo robes for the eastbound run
    // (Carpenter 1857: "got 50 lb flour for one prime robe"). Fresh
    // meat traded above market — desert station with limited hunting.
    barterPreferred: ['buffalo_robe', 'raw_hide', 'game_meat', 'jerky'],
    blurb: 'A small HBC station by the Boise River. Cottonwoods, worn travelers, and a modest stock — not a major resupply, but the water is good.',
    stock: [
      // Marcy 5 partial (period: Frizzell 1852 records flour / bacon /
      // coffee / salt at Boise; sugar rare, beans uncommon). Dried fruit
      // removed — outfitter-only past Independence per Carpenter 1857.
      'flour', 'bacon', 'coffee', 'salt', 'saleratus',
      'gunpowder', 'lead_pig', 'lead_balls', 'percussion_caps', 'bandages', 'quinine',
      'coat', 'blanket',
      'canvas', 'spare_plank', 'ox_shoes', 'grain', 'water_bag',
      'moccasins', 'buffalo_robe'
    ] },
  // #252 — Burnt River Canyon (mile ~1680, OR). Tortured zigzag
  // through a brushy gorge — diaries describe oxen hung up on snags,
  // wagons banged off rocks, repeated unyokings. Wagon-damage / ox-
  // fatigue penalty mechanic is a follow-up.
  { id: 'burnt_river_canyon',  name: 'Burnt River Canyon',  milesFromPrevious: 50,  terrain: 'mountains', kind: 'landmark' },
  // #253 — Flagstaff Hill (mile ~1720, OR). First view of the Blue
  // Mountains for westbound emigrants. Some parties cried at the
  // sight; others built cairns. A morale-bump arrival event is a
  // follow-up.
  { id: 'flagstaff_hill',      name: 'Flagstaff Hill',      milesFromPrevious: 30,  terrain: 'mountains', kind: 'landmark' },
  { id: 'farewell_bend',       name: 'Farewell Bend',       milesFromPrevious: 10,  terrain: 'desert',    kind: 'landmark' },
  // Blue Mountains landmark fires when wagons enter the foothills, ~60
  // mi west of Farewell Bend; the actual crossing into Grande Ronde
  // takes another ~50 mi over the divide.
  { id: 'blue_mountains',      name: 'Blue Mountains',      milesFromPrevious: 60,  terrain: 'mountains', kind: 'landmark' },
  { id: 'grande_ronde',        name: 'Grande Ronde Valley', milesFromPrevious: 25,  terrain: 'forest',    kind: 'landmark' },
  // Methodist mission at Waiilatpu, headwaters of the Walla Walla. Marcus
  // + Narcissa Whitman ran it as both medical aid and a layover for
  // emigrants — Marcus was a physician, the farm produced wheat /
  // peas / potatoes / corn, and the dairy ran cheese + butter. Period
  // reality (#206): a real emigrant lifeline 1843-1847, then destroyed
  // in the November 1847 massacre — abandonedAfterYear gates the post
  // mode and triggers ruin styling for later parties. Sparse on dry
  // goods and ammunition — the Whitmans were missionaries, not traders.
  { id: 'whitman_mission',     name: 'Whitman Mission',     milesFromPrevious: 85,  terrain: 'prairie',   elevationFt: 800, kind: 'trading_post',
    postKind: 'mission',
    abandonedAfterYear: 1847,
    stockScale: 0.5,
    // #276 Mission charity pricing — 10% below mid-trail tier.
    priceMultiplier: 0.9,
    services: ['gossip', 'inn', 'blacksmith'],
    innNightlyRate: 1,
    // #915 — Mission farm produced wheat / dairy / vegetables but not
    // game; fresh meat from emigrant hunts traded at a premium
    // (Whitman's letters 1845-46 note welcoming venison + bison).
    // Refused whiskey — Methodist station, alcohol prohibited.
    barterPreferred: ['game_meat', 'jerky', 'pemmican', 'buffalo_robe'],
    barterRefused: ['whiskey'],
    blurb: "Waiilatpu mission station on the Walla Walla. Marcus and Narcissa Whitman keep wheat, peas, potatoes, and beef from the farm; cheese and butter from the dairy. Dr. Whitman tends the sick when there's a doctor's call. Sparse on dry goods — they're missionaries, not traders.",
    stock: [
      // Farm produce — the whole point of stopping at Whitman's.
      // Bacon added: Whitman butchered cattle from the mission herd
      // (Sager 1844 records bacon there). Sugar added: Narcissa kept
      // a barrel for tea ceremonies and traded modest amounts to
      // emigrants. Dried fruit kept here uniquely (orchard farm-produced
      // — the one place past Independence to find it per Carpenter 1857).
      'flour', 'beans', 'bacon', 'sugar', 'dried_fruit', 'salt', 'saleratus', 'lard',
      'milk_cow', 'butter', 'cheese',
      // Light medical — Marcus had a kit, not a pharmacy.
      'bandages', 'quinine', 'laudanum',
      // Smithy basics — Marcus did limited iron work.
      'ox_shoes', 'rope', 'spare_plank',
      // Modest comfort — Narcissa made coffee and tea for stops.
      'coffee', 'tea',
      // The Bible was the one thing they had in abundance.
      'bible'
    ] },
  // Fort Walla Walla sat ~25 mi west of the mission, on the Columbia
  // (the HBC post, not the later Army fort of the same name).
  { id: 'ft_walla_walla',      name: 'Fort Walla Walla',    milesFromPrevious: 25,  terrain: 'prairie',   elevationFt: 700, kind: 'trading_post',
    // HBC river post. Basic but reliable stock. Native trade goods are a
    // specialty here (Walla Walla / Cayuse trade networks).
    postKind: 'hbc',
    stockScale: 0.7,
    services: ['gossip', 'blacksmith'],
    blurb: 'A lonely HBC outpost by the Columbia. Basic but reliable stock, and a specialty in Native trade goods — Walla Walla and Cayuse networks run through here.',
    stock: [
      'flour', 'beans', 'bacon',
      'gunpowder', 'lead_pig', 'lead_balls', 'percussion_caps', 'bandages', 'quinine',
      'coat', 'blanket',
      'canvas', 'tongue', 'grain',
      'moccasins', 'buffalo_robe', 'beads'
    ] },
  { id: 'the_dalles',          name: 'The Dalles',          milesFromPrevious: 95, terrain: 'prairie',   elevationFt: 100, kind: 'trading_post',
    // End-of-trail Columbia gorge town. Everything you forgot plus end-of-
    // trail comforts — fiddles, Bibles, nice boots. Prices are ruinous.
    postKind: 'end_of_trail',
    stockScale: 1.3,
    // #276 End-of-trail markup — 30% above mid-trail tier (the blurb
    // says "prices are ruinous" but until now they matched Laramie).
    priceMultiplier: 1.3,
    services: ['gossip', 'blacksmith', 'inn', 'gambling', 'brothel', 'guide', 'bath_house'],
    innNightlyRate: 2,
    blurb: "A river-port town at the head of the Columbia gorge. End-of-trail chaos: everything you forgot, plus comforts for the final stretch — fiddles, Bibles, good boots. Prices are ruinous.",
    stock: [
      'flour', 'beans', 'bacon', 'hardtack', 'jerky', 'dried_fruit', 'sugar', 'coffee', 'tea',
      'gunpowder', 'lead_pig', 'lead_balls', 'percussion_caps', 'bullet_mold', 'bandages', 'quinine', 'laudanum', 'calomel', 'patent_medicine',
      'epsom_salts', 'camphor', 'paregoric', 'dovers_powder', 'castor_oil',
      'coat', 'boots', 'blanket', 'tent',
      'wheel', 'axle', 'tongue', 'canvas', 'yoke', 'ox_bow', 'picket_pins',
      'cookware', 'rope', 'salt', 'soap', 'milk_cow', 'cheese_press', 'butter_crock',
      'tobacco', 'whiskey', 'bible', 'harmonica', 'fiddle'
    ] },
  // Barlow Road junction — the toll road south around Mt. Hood, the
  // overland alternative to rafting the Columbia. Sam Barlow opened it
  // in 1846; this entry marks the trail decision point just past The
  // Dalles. Laurel Hill is the steepest descent on the road itself.
  { id: 'barlow_road',         name: 'Barlow Road',         milesFromPrevious: 20,  terrain: 'forest',    kind: 'landmark' },
  // Laurel Hill is dense Cascades forest — the Barlow Road's worst
  // stretch. Reclassed mountain → forest so the terrain descriptor
  // matches the visual + the forest mult (0.85) gives it bite.
  { id: 'laurel_hill',         name: 'Laurel Hill',         milesFromPrevious: 60,  terrain: 'forest',    kind: 'landmark' },
  { id: 'oregon_city',         name: 'Oregon City',         milesFromPrevious: 140,  terrain: 'forest',    elevationFt: 50, kind: 'end' }
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
