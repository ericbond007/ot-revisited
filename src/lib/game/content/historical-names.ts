export const MALE_NAMES = [
  'John', 'William', 'James', 'Thomas', 'George', 'Samuel', 'Henry', 'Joseph',
  'Ezra', 'Amos', 'Elijah', 'Caleb', 'Isaac', 'Asa', 'Jedediah', 'Silas',
  'Nathaniel', 'Abraham', 'Jonas', 'Hiram', 'Obadiah', 'Enoch'
];

export const FEMALE_NAMES = [
  'Mary', 'Sarah', 'Rebecca', 'Martha', 'Abigail', 'Elizabeth', 'Hannah',
  'Ruth', 'Esther', 'Charity', 'Prudence', 'Temperance', 'Patience',
  'Susannah', 'Margaret', 'Catherine', 'Rachel', 'Lydia', 'Phoebe'
];

// Children pulled from the same era; biased toward common given names so they
// don't clash with the Old-Testament-heavy adult pool.
export const MALE_CHILD_NAMES = [
  'Tommy', 'Jed', 'Will', 'Sam', 'Eli', 'Jonah', 'Levi', 'Asa',
  'Ben', 'Frank', 'Ned', 'Charlie'
];

export const FEMALE_CHILD_NAMES = [
  'Annie', 'Sally', 'Bess', 'Polly', 'Nan', 'Cora', 'Lottie', 'Hattie',
  'Maggie', 'Tillie', 'Ada', 'Lou'
];

export function randomName(gender: 'male' | 'female', seed: number): string {
  const pool = gender === 'female' ? FEMALE_NAMES : MALE_NAMES;
  return pool[seed % pool.length];
}

export function randomChildName(gender: 'male' | 'female', seed: number): string {
  const pool = gender === 'female' ? FEMALE_CHILD_NAMES : MALE_CHILD_NAMES;
  return pool[seed % pool.length];
}
