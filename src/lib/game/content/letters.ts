// Letters from home — rare delivery at major trading posts. Period
// emigrants wrote constantly about mail in their diaries: a letter
// from back east could buoy a struggling party for days, or sink it
// for a week. We model that as a one-time-per-post pull from a curated
// pool, with a morale delta tuned to the news.
//
// Tone mix: ~40% good news, ~25% mixed/neutral, ~35% bad — average
// slightly positive. Bad news skews larger in absolute morale impact
// because grief carries further than joy. None of these letters fire
// world-state effects (no tribe shifts, no flag flips); they're pure
// flavor + morale, deliberately.
//
// Senders are generic family-from-back-east — no party-member
// personalization yet, so the letter reads as if any leader could be
// the recipient.

export type LetterTone = 'good' | 'mixed' | 'bad';

export interface LetterTemplate {
  /** Stable slug — recorded in flags._lettersRead so a letter isn't
   *  dealt twice over a long campaign. */
  id: string;
  /** Author of the letter, period style ("Your sister Mary",
   *  "Your father, in his own hand"). */
  sender: string;
  /** Where the letter was posted from, period dateline. */
  origin: string;
  /** Body text — period prose, 40-80 words. */
  body: string;
  /** Closing salutation. */
  closing: string;
  /** Net morale delta when the letter is read. */
  moraleDelta: number;
  tone: LetterTone;
}

export const LETTERS: LetterTemplate[] = [
  // --- Good news ---
  {
    id: 'sister_baby',
    sender: 'Your sister Mary',
    origin: 'Independence, Missouri',
    body: "Dearest, the Lord has been merciful — I was delivered of a healthy daughter the second week of May, and we have called her after our mother. Henry says she has your nose. The whole household is well; we miss you sorely and pray for the trail every Sunday.",
    closing: 'Your loving sister, Mary',
    moraleDelta: 6,
    tone: 'good'
  },
  {
    id: 'brother_doctor',
    sender: 'Your brother William',
    origin: 'St. Louis, Missouri',
    body: 'The exams are passed at last, and the College has seen fit to call me Doctor. I begin next month at the dispensary on Locust Street. You always said I would; I write because I want you to know it before anyone else.',
    closing: 'Your devoted brother, William',
    moraleDelta: 5,
    tone: 'good'
  },
  {
    id: 'good_harvest',
    sender: 'Your aunt Hannah',
    origin: 'Boonville',
    body: "The corn is the tallest in three years and the wheat shall be in by August Lord willing. Uncle is fattening the hogs against winter and there will be enough for all. Take heart out there — God is with His people in field and on trail alike.",
    closing: 'Yours in faith, Aunt Hannah',
    moraleDelta: 4,
    tone: 'good'
  },
  {
    id: 'engagement',
    sender: 'Your cousin Eleanor',
    origin: 'Lexington, Kentucky',
    body: "I write in haste — I am to be married Christmas-time to Mr. Thomas Reed, whom you will remember from the Davis wedding. Father gave his blessing yesterday. I can scarcely believe my hand is steady enough to write it.",
    closing: 'With breathless joy, Eleanor',
    moraleDelta: 5,
    tone: 'good'
  },
  {
    id: 'minister',
    sender: 'Your father',
    origin: 'Vincennes, Indiana',
    body: "The new minister has come and he is a good steady man, of the old Methodist sort. The congregation has taken to him. Your mother sends her love. We pray for you each evening at supper.",
    closing: 'Your father, in his own hand',
    moraleDelta: 4,
    tone: 'good'
  },

  // --- Mixed ---
  {
    id: 'mother_unwell',
    sender: 'Your sister Esther',
    origin: 'Cincinnati, Ohio',
    body: "Mother is bedridden these last weeks but the doctor has hopes. Anna's wedding was small — just the family — but pretty. The orchard came in well. Mother asks after you every day; I read her your last letter twice.",
    closing: 'Your sister, Esther',
    moraleDelta: 1,
    tone: 'mixed'
  },
  {
    id: 'dog_died',
    sender: 'Your brother Henry',
    origin: 'Springfield, Illinois',
    body: "The farm is well, the bull calved a heifer, and the hands are content. I am sorry to write that old Brownie passed in February — peaceful in the barn straw, no suffering. We buried him under the willow. You'd have wanted to know.",
    closing: 'Yours, Henry',
    moraleDelta: 1,
    tone: 'mixed'
  },
  {
    id: 'brother_mormon',
    sender: 'Your mother',
    origin: 'Quincy, Illinois',
    body: "Caleb has gone west with the Mormon train. He came home only to gather his things and would not be reasoned with. We do not know where he is or if we will see him again. Pray for him as I do, every night.",
    closing: 'Your devoted mother',
    moraleDelta: -1,
    tone: 'mixed'
  },

  // --- Bad news ---
  {
    id: 'father_cholera',
    sender: 'Your sister Ruth',
    origin: 'Saint Joseph, Missouri',
    body: "It is hard to write the words. Father took the cholera in March and was gone in two days. He bore it well and asked after you in his last hour. The minister came; he is buried in the churchyard with his people. Mother holds up but she is much aged.",
    closing: 'Your sister, Ruth',
    moraleDelta: -8,
    tone: 'bad'
  },
  {
    id: 'brother_drowned',
    sender: 'Your father',
    origin: 'Liberty, Missouri',
    body: "I write you with the heaviest heart. Young Samuel slipped from the millpond ice in February and was lost before any could reach him. The whole town turned out for the burying. I cannot say more. Forgive my short hand.",
    closing: 'Your grieving father',
    moraleDelta: -7,
    tone: 'bad'
  },
  {
    id: 'barn_fire',
    sender: 'Your uncle Josiah',
    origin: 'Hannibal, Missouri',
    body: "There has been a fire in the night and the barn is gone with most of the harvest. None were hurt, thank Providence, but the loss is heavy and the winter will be lean. Do not let this trouble you out there — we shall manage as we always have.",
    closing: 'Your uncle, Josiah',
    moraleDelta: -5,
    tone: 'bad'
  },
  {
    id: 'mother_begs',
    sender: 'Your mother',
    origin: 'Lexington, Kentucky',
    body: "I beg you to consider turning back, even now. The doctor says my heart is failing and I do not believe I shall see another spring. Whatever is in Oregon cannot be worth the dread of never seeing your face again. Forgive me — I had to write it.",
    closing: 'Your loving mother',
    moraleDelta: -4,
    tone: 'bad'
  }
];
