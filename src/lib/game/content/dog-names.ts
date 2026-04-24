// Historical-feeling dog names for the Oregon Trail era. Drawn from
// period journals + common 19th-century farm dog names. Not every
// name is era-specific but all read as "a family dog from the 1840s".

export const DOG_NAMES: readonly string[] = [
  'Shep',      'Rex',      'Duke',     'Jack',
  'Lady',      'Bella',    'Lucy',     'Sam',
  'Scout',     'Buddy',    'Old Blue', 'Boss',
  'Jasper',    'Tip',      'Queenie',  'Ranger',
  'Molly',     'Pete',     'Major',    'Biscuit',
  'Traveler',  'Lucky',    'Patch',    'Sandy',
  'Rover',     'Buster',   'Gus',      'Cap',
  'Maggie',    'Tippy',    'Charlie',  'Trooper'
];

/** Pick a name from the list using the given rng. Safe if rng exhausts. */
export function randomDogName(rng: { int(min: number, max: number): number }): string {
  return DOG_NAMES[rng.int(0, DOG_NAMES.length - 1)];
}
