// Canonical concept → glyph dictionary. Originally ported verbatim
// from docs/handoff/brand/src/icon-dictionary.json. The brand handoff
// treats this as a contract: when a concept appears in UI code, use
// the listed glyph (via the typed `icon()` helper below) so drift
// between files becomes impossible.
//
// Categories below the original handoff bundle (post_kinds, professions,
// town_services, fauna, ford_methods, journey_menu, end_screen, status,
// trend) were added under #161 to cover decorative emojis the original
// handoff didn't enumerate but which the codebase already used as
// literals. They name what was already shipped — not new design — so
// adding them isn't a design decision, just a naming one. Genuinely
// new concepts still need to clear the brand revisit.

export const ICON = {
  actions: {
    travel: '🚶',
    rest:   '🏕️',
    hunt:   '🏹',
    ford:   '🛶',
    visit:  '🏛️',
    trade:  '💰',
    camp:   '⛺',
    menu:   '🤠'
  },
  stats: {
    day:     '📅',
    date:    '🗓️',
    leg:     '🧭',
    weather: '🌤️',
    pace:    '🐂',
    rations: '🍖',
    morale:  '🎵',
    health:  '❤️',
    cash:    '💵',
    water:   '💧'
  },
  weather_states: {
    clear:    '☀️',
    overcast: '☁️',
    rain:     '🌧️',
    storm:    '⛈️',
    snow:     '❄️',
    heat:     '🥵',
    fog:      '🌫️',
    frost:    '🌨️'
  },
  pace_options: {
    slow:     '🐢',
    moderate: '🐂',
    fast:     '🏃',
    grueling: '⚡'
  },
  rations_options: {
    meager:  '🥣',
    normal:  '🍽️',
    filling: '🍖'
  },
  inventory_categories: {
    food:         '🍖',
    feed:         '🌾',
    medicine:     '💊',
    weapon:       '🔫',
    ammo:         '🎯',
    tool:         '🔨',
    wagon_part:   '🛠️',
    livestock:    '🐂',
    clothing:     '🧥',
    comfort:      '🎁',
    native_trade: '🪶'
  },
  // Per-item overrides where the category default loses identity (#174).
  // The 4 ammo components + bullet_mold all rendered as 🎯 / 🔨 before;
  // these glyphs give each its own readable shape. Other categories can
  // grow this map as need arises (rich-per-item icons is logged as a
  // broader inventory-display follow-up).
  inventory_items: {
    gunpowder:       '💥',
    lead_pig:        '🍫',
    lead_balls:      '⚫',
    percussion_caps: '🪙',
    bullet_mold:     '🪩',
    // #182 hunt byproducts.
    tallow:          '🟡',
    prize_cut:       '🍖',
    raw_hide:        '🟫',
    // #197 fishing gear.
    fishing_line:    '🧵',
    fishing_rod:     '🎣',
    fishing_net:     '🕸️'
  },
  event_categories: {
    weather:    '🌩️',
    health:     '🏥',
    wagon:      '🛠️',
    encounter:  '👋',
    native:     '🪶',
    bandit:     '🔫',
    finds:      '🎯',
    historical: '📜',
    personal:   '💭'
  },
  people: {
    adult_male:   '👨',
    adult_female: '👩',
    child_male:   '👦',
    child_female: '👧',
    dog:          '🐕',
    dead:         '✝'
  },
  camp_scene: {
    moon:    '🌙',
    tent:    '⛺',
    fire:    '🔥',
    shelter: '🛖',
    ox:      '🐂'
  },
  // Trading-post flavor — paired with POST_THEME accent colors so the
  // header glyph and the panel tint visually agree.
  post_kinds: {
    us_army:      '🎖️',
    hbc:          '🦫',
    mountain:     '⛰️',
    frontier:     '🏪',
    end_of_trail: '✨'
  },
  // Profession glyphs — used by ProfessionPicker, party-detail badges,
  // outfit page, etc.
  professions: {
    banker:        '💰',
    farmer:        '🌾',
    carpenter:     '🔨',
    doctor:        '⚕️',
    blacksmith:    '⚒️',
    hunter:        '🏹',
    teamster:      '🐂',
    merchant:      '💼',
    whore:         '💋',
    scout:         '🧭',
    preacher:      '✝️',
    indian_trader: '🪶',
    gunsmith:      '🔫'
  },
  // Service icons in TownStage's service-card grid (round 1 + round 2).
  town_services: {
    blacksmith: '🔨',
    inn:        '🛏️',
    gambling:   '🎲',
    brothel:    '💋',
    gossip:     '📢',
    guide:      '🧭',
    store:      '🛍️',
    newspaper:  '📰'
  },
  // Hunt-modal target list + post-hunt resolution flavor.
  fauna: {
    small:  '🐇',  // rabbit / squirrel
    medium: '🦌',  // deer / antelope
    big:    '🦬',  // bison / elk
    forage: '🌿'   // berries / greens
  },
  // FordModal method picker. `river` is the post-cross flavor glyph
  // used by FordSummaryModal; `wait` is the hourglass for the
  // "camp until the water drops" branch.
  ford_methods: {
    ford:  '🥾',
    caulk: '🛶',
    ferry: '⛵',
    wait:  '⏳',
    river: '🏞️'
  },
  // Journey-menu items + dev scenario submit row.
  journey_menu: {
    save:     '💾',
    new:      '🆕',
    home:     '🏠',
    dev:      '🧪',
    scenario: '🎯'
  },
  // EndScreen + burial flavor.
  end_screen: {
    tombstone: '🪦',
    tree:      '🌲'
  },
  // Decorative status glyphs — leader stars, close buttons, warnings,
  // alert chips. Pulled into the dictionary so we own the names; the
  // glyphs themselves are typographic, not branded.
  status: {
    leader: '★',
    close:  '✕',
    warn:   '⚠',
    block:  '⛔',
    heart:  '❤',
    bolt:   '⚡'
  },
  // Trend arrows on rolling-history widgets (party-panel sparkline,
  // morale ribbon).
  trend: {
    up:   '▲',
    down: '▼',
    flat: '▬'
  },
  landmarks: {
    independence_mo:     '🏠',
    kansas_river:        '🌊',
    alcove_spring:       '💧',
    big_blue_river:      '🌊',
    ft_kearny:           '🏰',
    ash_hollow:          '🌳',
    north_platte_1:      '🌊',
    courthouse_rock:     '🏛️',
    chimney_rock:        '🗼',
    scotts_bluff:        '🏔️',
    ft_laramie:          '🏰',
    register_cliff:      '📜',
    guernsey_ruts:       '〰️',
    north_platte_2:      '🌊',
    independence_rock:   '🗿',
    devils_gate:         '⛰️',
    sweetwater_1:        '🌊',
    south_pass:          '⛰️',
    pacific_springs:     '💧',
    green_river:         '🌊',
    ft_bridger:          '🏰',
    bear_river:          '🌊',
    soda_springs:        '💧',
    ft_hall:             '🏰',
    snake_three_island:  '🌊',
    ft_boise:            '🏰',
    farewell_bend:       '🏞️',
    blue_mountains:      '🏔️',
    ft_walla_walla:      '🏰',
    the_dalles:          '🏞️',
    laurel_hill:         '🏔️',
    oregon_city:         '🏁'
  }
} as const;

export type IconCategory = keyof typeof ICON;
export type IconKey<C extends IconCategory> = keyof (typeof ICON)[C];

/** Type-safe concept → glyph lookup. Drift-proof: misspelled keys
 *  fail to compile. */
export function icon<C extends IconCategory>(category: C, key: IconKey<C>): string {
  return ICON[category][key] as string;
}
