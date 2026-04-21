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

export function randomName(gender: 'male' | 'female', seed: number): string {
  const pool = gender === 'female' ? FEMALE_NAMES : MALE_NAMES;
  return pool[seed % pool.length];
}
