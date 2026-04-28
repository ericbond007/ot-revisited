// Curated historical headlines that emigrants might have read in
// trail-era newspapers (Missouri Republican, Saint Joseph Gazette,
// New York Tribune, Liberty Banner, etc.). Each entry is year-gated —
// the player only sees headlines current with their journey year.
//
// Used by the "Read newspaper" town action: picks 2-4 historical
// headlines plus 1-2 dynamic gossip items, interleaves them, and
// fires `addNews` for each. The Gold Rush headline (`gold_sutters`)
// flips the `_californiaUnlocked` flag — the future California leg
// branching (#175) reads that flag.
//
// Effects are stored as plain descriptors (`HeadlineEffect`) rather
// than function references so this module stays a pure data file —
// no circular import on the news system, JSON-friendly for tests.

export type HeadlineEffect =
  | { kind: 'california_unlock' }
  | { kind: 'tribe_shift'; tribeId: string; delta: number };

export interface NewsHeadline {
  /** Stable slug — recorded in flags._headlinesRead so a paper isn't
   *  re-served at the next post. */
  id: string;
  /** The headline text as it would appear in a period broadsheet. */
  text: string;
  /** Source paper + city + period style ("Missouri Republican, June 1849"). */
  dateline: string;
  /** First year this headline appears (inclusive). */
  fromYear: number;
  /** Last year this headline appears (inclusive). */
  toYear: number;
  /** Earliest month within fromYear (1-12). Optional. */
  fromMonth?: number;
  /** Latest month within toYear (1-12). Optional. */
  toMonth?: number;
  /** Optional world-state hooks fired once when the player reads this
   *  headline. Multiple effects allowed (e.g. Fort Laramie Treaty
   *  shifts several tribes). Resolved in systems/news.ts. */
  effects?: HeadlineEffect[];
}

export const HEADLINES: NewsHeadline[] = [
  // --- 1846: Mexican War, Mormon exodus, Donner ---
  {
    id: 'mex_war_declared',
    text: 'WAR WITH MEXICO. Congress Authorizes Volunteers; Polk Calls Up the Militia.',
    dateline: 'Washington — May 1846',
    fromYear: 1846, toYear: 1847, fromMonth: 5
  },
  {
    id: 'mormon_exodus',
    text: 'The Saints Quit Nauvoo. Brigham Young Leads the Faithful Westward.',
    dateline: 'Nauvoo — March 1846',
    fromYear: 1846, toYear: 1847
  },
  {
    id: 'donner_depart',
    text: 'Reed-Donner Party Bound for California by the Hastings Cutoff.',
    dateline: 'Independence — April 1846',
    fromYear: 1846, toYear: 1846, fromMonth: 4
  },
  {
    id: 'oregon_treaty',
    text: 'Oregon Treaty Settles the Forty-Ninth Parallel. War with Britain Averted.',
    dateline: 'Washington — June 1846',
    fromYear: 1846, toYear: 1847, fromMonth: 6
  },

  // --- 1847: Donner aftermath, Mormons reach Utah, Whitman ---
  {
    id: 'donner_recovered',
    text: 'Survivors of the Donner Party Recovered. Tales of Ghastly Winter in the Sierras.',
    dateline: 'San Francisco — March 1847',
    fromYear: 1847, toYear: 1848, fromMonth: 3
  },
  {
    id: 'this_is_the_place',
    text: '"This Is the Place." Mormons Reach the Great Salt Lake.',
    dateline: 'Utah Territory — July 1847',
    fromYear: 1847, toYear: 1848, fromMonth: 7
  },
  {
    id: 'scott_vera_cruz',
    text: 'Gen. Scott Takes Vera Cruz. The Halls of Montezuma Beckon.',
    dateline: 'Mexico — March 1847',
    fromYear: 1847, toYear: 1847, fromMonth: 3
  },
  {
    id: 'whitman_massacre',
    text: 'Whitman Mission Massacre. Cayuse Warriors Slay Doctor and Wife at Waiilatpu.',
    dateline: 'Oregon Country — December 1847',
    fromYear: 1847, toYear: 1850, fromMonth: 12,
    effects: [{ kind: 'tribe_shift', tribeId: 'cayuse', delta: -15 }]
  },

  // --- 1848: Treaty + Gold ---
  {
    id: 'guadalupe_hidalgo',
    text: 'Treaty of Guadalupe Hidalgo. Mexico Cedes California, New Mexico, and the Southwest.',
    dateline: 'Mexico — February 1848',
    fromYear: 1848, toYear: 1849, fromMonth: 2
  },
  {
    id: 'gold_sutters',
    text: 'GOLD! at Sutter\'s Mill. Reports From California Beyond Belief — Streams Said to Run Yellow.',
    dateline: 'San Francisco — January 1848',
    fromYear: 1848, toYear: 1851, fromMonth: 8,
    effects: [{ kind: 'california_unlock' }]
  },
  {
    id: 'wisconsin_state',
    text: 'Wisconsin Admitted to the Union. Thirty Stars on the Flag.',
    dateline: 'Washington — May 1848',
    fromYear: 1848, toYear: 1848, fromMonth: 5
  },

  // --- 1849: Gold Rush peak, cholera, Taylor ---
  {
    id: 'forty_thousand',
    text: 'Forty Thousand Bound for California. The Trail Cannot Hold Them All.',
    dateline: 'Independence — March 1849',
    fromYear: 1849, toYear: 1850, fromMonth: 3
  },
  {
    id: 'cholera_1849',
    text: 'CHOLERA Sweeps the Trail. Hundreds Buried From the Missouri to the Platte. Boil Your Water.',
    dateline: 'Saint Louis — June 1849',
    fromYear: 1849, toYear: 1850, fromMonth: 5, toMonth: 9
  },
  {
    id: 'taylor_inaugurated',
    text: 'Zachary Taylor Inaugurated. The Hero of Buena Vista Takes the Oath.',
    dateline: 'Washington — March 1849',
    fromYear: 1849, toYear: 1849, fromMonth: 3
  },

  // --- 1850: Compromise, Taylor dies ---
  {
    id: 'taylor_dead',
    text: 'PRESIDENT TAYLOR DEAD. Fillmore Takes the Oath at Midnight.',
    dateline: 'Washington — July 1850',
    fromYear: 1850, toYear: 1851, fromMonth: 7
  },
  {
    id: 'california_state',
    text: 'California Admitted as a Free State. Compromise of 1850 Passes.',
    dateline: 'Washington — September 1850',
    fromYear: 1850, toYear: 1851, fromMonth: 9
  },
  {
    id: 'fugitive_slave',
    text: 'Fugitive Slave Act Signed Into Law. Northern Outrage Mounts.',
    dateline: 'Washington — September 1850',
    fromYear: 1850, toYear: 1852, fromMonth: 9
  },

  // --- 1851: Fort Laramie Treaty, Uncle Tom's Cabin ---
  {
    id: 'ft_laramie_treaty',
    text: 'Treaty Signed at Fort Laramie. Plains Tribes Pledge Safe Passage to Emigrants.',
    dateline: 'Fort Laramie — September 1851',
    fromYear: 1851, toYear: 1853, fromMonth: 9,
    effects: [
      { kind: 'tribe_shift', tribeId: 'sioux', delta: 5 },
      { kind: 'tribe_shift', tribeId: 'cheyenne', delta: 5 }
    ]
  },
  {
    id: 'uncle_tom_serial',
    text: '"Uncle Tom\'s Cabin." Mrs. Stowe\'s Tale Stirs the Republic.',
    dateline: 'Washington — June 1851',
    fromYear: 1851, toYear: 1853, fromMonth: 6
  },

  // --- 1852-1853 ---
  {
    id: 'pierce_elected',
    text: 'Franklin Pierce Elected President. Whigs Routed at the Polls.',
    dateline: 'Washington — November 1852',
    fromYear: 1852, toYear: 1853, fromMonth: 11
  },
  {
    id: 'oregon_record',
    text: 'Oregon-Bound Wagons at Record Number. Independence Outfitters Cannot Keep Pace.',
    dateline: 'Independence — May 1852',
    fromYear: 1852, toYear: 1852, fromMonth: 4, toMonth: 7
  },
  {
    id: 'gadsden_purchase',
    text: 'Gadsden Purchase Negotiated. New Mexico Border to Move South.',
    dateline: 'Washington — December 1853',
    fromYear: 1853, toYear: 1854, fromMonth: 12
  },

  // --- 1854: Kansas-Nebraska, Grattan Affair ---
  {
    id: 'kansas_nebraska',
    text: 'Kansas-Nebraska Act Passed. The Slavery Question Reopens — Bloodshed Feared in the Territories.',
    dateline: 'Washington — May 1854',
    fromYear: 1854, toYear: 1856, fromMonth: 5
  },
  {
    id: 'grattan_affair',
    text: 'Lieutenant Grattan and His Men Slain Near Fort Laramie. The Plains in Turmoil.',
    dateline: 'Fort Laramie — August 1854',
    fromYear: 1854, toYear: 1855, fromMonth: 8,
    effects: [{ kind: 'tribe_shift', tribeId: 'sioux', delta: -12 }]
  },
  {
    id: 'cholera_1854',
    text: 'Cholera Returns to the Trail. Saint Louis Doctors Warn Against Bad Water.',
    dateline: 'Saint Louis — June 1854',
    fromYear: 1854, toYear: 1854, fromMonth: 5, toMonth: 9
  },

  // --- 1855-1856: Bleeding Kansas, Harney, Brown ---
  {
    id: 'harney_ash_hollow',
    text: 'General Harney Crushes the Sioux at Ash Hollow.',
    dateline: 'Nebraska — September 1855',
    fromYear: 1855, toYear: 1856, fromMonth: 9,
    effects: [{ kind: 'tribe_shift', tribeId: 'sioux', delta: -8 }]
  },
  {
    id: 'bleeding_kansas',
    text: 'Border Ruffians Cross Into Kansas. Free-State Settlers Take Up Arms.',
    dateline: 'Kansas — March 1855',
    fromYear: 1855, toYear: 1857, fromMonth: 3
  },
  {
    id: 'hbc_quits_hall',
    text: 'Hudson\'s Bay Company Abandons Fort Hall. Stockade Stands Empty on the Snake.',
    dateline: 'Snake River — June 1856',
    fromYear: 1856, toYear: 1858, fromMonth: 6
  },
  {
    id: 'sumner_caned',
    text: 'Senator Sumner Caned on the Senate Floor. Kansas Comes to Washington.',
    dateline: 'Washington — May 1856',
    fromYear: 1856, toYear: 1856, fromMonth: 5
  },

  // --- 1857-1859 ---
  {
    id: 'dred_scott',
    text: 'Dred Scott Decision. Supreme Court Denies Citizenship to Men of African Descent.',
    dateline: 'Washington — March 1857',
    fromYear: 1857, toYear: 1858, fromMonth: 3
  },
  {
    id: 'buchanan_inaug',
    text: 'James Buchanan Inaugurated. Pledges Peace with the South.',
    dateline: 'Washington — March 1857',
    fromYear: 1857, toYear: 1857, fromMonth: 3
  },
  {
    id: 'lincoln_douglas',
    text: 'Lincoln and Douglas Debate. Illinois Race Watched Nationwide.',
    dateline: 'Illinois — August 1858',
    fromYear: 1858, toYear: 1859, fromMonth: 8
  },
  {
    id: 'pikes_peak',
    text: 'Pike\'s Peak or Bust! Gold Reported in the Rocky Mountain Diggings.',
    dateline: 'Saint Joseph — May 1859',
    fromYear: 1859, toYear: 1860, fromMonth: 5
  },
  {
    id: 'pony_express',
    text: 'Pony Express to Run. Eight Days from Saint Joseph to Sacramento, By God.',
    dateline: 'Saint Joseph — December 1859',
    fromYear: 1859, toYear: 1861, fromMonth: 12
  }
];

/** Filter HEADLINES to those visible in the player's current month. */
export function eligibleHeadlines(year: number, month: number): NewsHeadline[] {
  return HEADLINES.filter((h) => {
    if (year < h.fromYear || year > h.toYear) return false;
    if (year === h.fromYear && h.fromMonth && month < h.fromMonth) return false;
    if (year === h.toYear && h.toMonth && month > h.toMonth) return false;
    return true;
  });
}
