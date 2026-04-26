// Canonical concept → glyph dictionary, ported verbatim from
// docs/handoff/brand/src/icon-dictionary.json. The brand handoff
// treats this as a contract: when a concept appears in UI code,
// use the listed glyph (via the typed `icon()` helper below) so
// drift between files becomes impossible.
//
// Adding new entries is a designer decision — don't extend this
// table unilaterally. If a UI surface needs a glyph that isn't
// listed, leave the literal in place and flag it for the brand
// revisit (TODO #161).

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
    pace:    '🐂',
    rations: '🍖',
    morale:  '🎵',
    health:  '❤️',
    cash:    '💵',
    water:   '💧'
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
  landmarks: {
    independence:        '🏠',
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
