// Flavor-text registry.
//
// Each key maps to an array of variant strings. The engine picks one by seeded
// rng so the same journey reads consistently on replay, but different journeys
// (or different events of the same kind on the same journey) read differently.
//
// This is NOT i18n — there's no locale layer. It's a one-to-many map:
// "this event has these possible flavor lines, pick one."
//
// Naming convention: '<event_id>.body' for the event's prose body,
//                    '<event_id>.<choice_id>.<outcome>' for log variants.

import type { Rng } from '../rng';

export const TEXT_POOLS: Record<string, readonly string[]> = {
  // --- Weather ---
  'weather_storm.body': [
    'Dark clouds gather and the rain comes down in sheets.',
    'A low rumble rolls across the prairie; the sky goes black, then opens.',
    'Lightning forks across the horizon and the storm finds you on open ground.'
  ],
  'weather_heat.body': [
    'The sun beats down mercilessly. Water stores dwindle fast.',
    'Heat shimmers off the trail. Even the oxen labor for breath.',
    'Not a cloud, not a breath of wind. The water barrel sweats.'
  ],
  'weather_fog.body': [
    'Visibility drops to nothing.',
    "A wall of grey rolls in from the west — you can't see ten paces.",
    'The trail vanishes into the mist. The lead ox snorts uneasily.'
  ],
  'weather_snow.body': [
    'A chill bite in the air and snowflakes on the pass.',
    'The first flakes drift down at dusk. By morning the trail is white.',
    'Snow comes early this year. The breath of the oxen hangs in the air.'
  ],
  'weather_flood.body': [
    'Swollen creeks overflow into the trail.',
    'Spring melt has turned every gully into a torrent.',
    "The trail is underwater in three places. You'll have to find a way around."
  ],

  // --- Wagon / livestock ---
  'wagon_wheel.body': [
    'A spoke gives way, then the whole rim.',
    'A sickening crack — the rim splits clean across.',
    'The wheel shudders, splinters, and collapses into the dust.'
  ],
  'ox_lame.body': [
    'One of the oxen is favoring a hoof.',
    "The lead ox limps. There's a pebble lodged in the cleft of its hoof.",
    'You notice one of the team holding back, weight off the right foreleg.'
  ],
  'ox_shoe.body': [
    'The rocky terrain took a toll.',
    'A sharp crack on the rocks — and the iron shoe goes spinning.',
    'You hear the metal clatter as a shoe gives way on the stony ground.'
  ],
  'wagon_tongue.body': [
    'A crack, then a splinter. The oxen halt.',
    'The yoke pulls hard against the pole and the wood gives with a snap.',
    'A buried root catches the tongue at full draft. It splits.'
  ],
  'wagon_canvas.body': [
    'A gust of wind rips a seam.',
    'The canvas snaps loud as a rifle shot — a long tear opens along the bow.',
    'Wind catches a loose flap and the cover tears down the side.'
  ],
  'ox_wander.body': [
    'Tracks lead into the brush.',
    'You wake to find the gate open and one ox gone. Hoofprints lead north.',
    'A coyote yip in the night, and by dawn one of the team has wandered.'
  ],
  'wagon_stuck.body': [
    'A soft patch of trail turned to muck under the wheels. The oxen strain against the yoke; nothing budges.',
    'The wheels sink past the rim in black mud. The team strains and falters.',
    'A sinkhole — disguised as level ground until the front wheels found it.'
  ],

  // --- Health ---
  'health_cholera.body': [
    'The river here smells off. Someone got sick at the last wagon train.',
    'Bloated cattle carcasses rot in the shallows upstream. The water has a sheen.',
    'A scrawled note on a stake: WATER FOUL — TWO DEAD. The river still runs clear-looking.'
  ],
  'health_snake.body': [
    'A camp-gatherer reaches into the brush and recoils, clutching their hand.',
    'A dry rattle from the rocks — and a yelp. Someone steps back too late.',
    'Gathering kindling at dusk, a hand finds something cold and coiled.'
  ],
  'historical_cholera_1852.body': [
    '1852 is a cruel year. Graves line the way.',
    'Half the parties on the trail this season have lost someone to cholera.',
    'Hand-lettered crosses appear every few hundred yards. Always the same disease.'
  ],

  // --- Finds ---
  'find_berries.body': [
    'Dark-purple berries hang heavy on the bushes.',
    'A whole hillside of brambles, thick with ripe fruit.',
    'The kids would call it a feast — handfuls of dark berries on every branch.'
  ],
  'find_cache.body': [
    'A sealed barrel and a small wooden chest, left by a party that moved on quickly.',
    'A cached supply, maybe abandoned in a hurry. The seal is still intact.',
    'Someone pressed on lighter than they came. Their loss.'
  ],
  'find_spring.body': [
    'Water bubbles up from between the rocks.',
    'A clear spring runs cold from a crack in the cliff. The oxen smell it first.',
    'Sweet water, ice cold even in the heat. Worth filling every vessel.'
  ],

  // --- Encounters ---
  'encounter_emigrants.body': [
    'Fellow travelers bound the same direction. They stop to swap news.',
    'Another wagon train pulls up alongside for the noon halt — chatter all around.',
    'Wagons pass in the other direction, their drivers full of advice (some of it useful).'
  ],
  'encounter_abandoned.body': [
    'Tipped over, split at the tongue. Scattered possessions lie in the grass.',
    'A wagon rests on its side off the track. Whatever happened, it was sudden.',
    'Half-burned, half-stripped — but still some good iron and timber to be had.'
  ],
  'encounter_child.body': [
    'A small figure sits crying beside the trail. Separated from another party.',
    'A barefoot child, maybe seven, stares at you from the grass — alone.',
    'You hear sniffling from a thicket. A boy, lost from his folks somewhere ahead.'
  ],
  'historical_mormon.body': [
    'A line of men, women, and children pushing and pulling handcarts westward.',
    'Mormon emigrants on foot, dragging their lives in two-wheeled carts.',
    'A handcart company plods past, singing a hymn as they go.'
  ],
  'historical_pony.body': [
    'A rider thunders past, bags bulging with mail. He shouts news of the east.',
    'A Pony Express rider blows by at full gallop, kicking dust over the camp.',
    'Hooves drum the road behind you — a relay rider, mail bags slapping his thighs.'
  ],

  // --- Personal ---
  'personal_quarrel.body': [
    'Tensions boil over. Harsh words pass between party members.',
    'A dispute about rations turns into shouting. Someone stomps off into the dusk.',
    "Old grievances surface around the fire and don't quietly go back down."
  ],
  'personal_prayer.body': [
    'Someone leads a short prayer at the campfire.',
    'A quiet voice asks for grace before the meal. The others bow their heads.',
    'A psalm rises up from the cookfire. Even the oxen seem to listen.'
  ],
  'personal_burial.body': [
    'The party halts to lay the dead to rest. A proper grave gives the living a moment of grace before pressing on.',
    "A grim camp. The shovel comes out (if there is one). Someone says what they remember.",
    'You stop where the trail allows. The ground is hard but the work has to be done.'
  ],

  // --- Historical ---
  'historical_donner.body': [
    'A returning traveler tells a chilling story of a party caught in the mountains last winter.',
    'Around the fire someone whispers about the Donner family. Everyone listens.',
    "An old hand spits and says, 'Don't you be late at South Pass. Not ever.'"
  ],
  'historical_gold.body': [
    'Travelers speak excitedly of nuggets as big as walnuts picked straight out of the streams.',
    "A drunk emigrant grabs your sleeve: 'California! GOLD! You're going the wrong way!'",
    "Word from the east: the streams of California are paved with the stuff. Half the trail is now bound south."
  ]
};

/**
 * Pick a text variant by key. Throws on unknown key.
 *
 * Pass `fallback` to opt out of the throw — useful while migrating events
 * incrementally so an unmigrated event doesn't crash the engine.
 */
export function pickText(key: string, rng: Rng, fallback?: string): string {
  const pool = TEXT_POOLS[key];
  if (!pool || pool.length === 0) {
    if (fallback !== undefined) return fallback;
    throw new Error(`text-pool: no entries for key "${key}"`);
  }
  return rng.pick(pool);
}

/**
 * Format a template like "Found {qty} lb of {item}." with values.
 * Missing keys render as the empty string. Numbers stringify naturally.
 */
export function formatText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = values[k];
    return v === undefined ? '' : String(v);
  });
}
