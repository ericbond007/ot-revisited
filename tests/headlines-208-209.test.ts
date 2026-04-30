import { describe, it, expect } from 'vitest';
import { HEADLINES } from '../src/lib/game/content/news-headlines';

describe('Ward Massacre headline (#208)', () => {
  const headline = HEADLINES.find((h) => h.id === 'ward_massacre');

  it('is registered', () => {
    expect(headline).toBeTruthy();
  });

  it('fires 1854-1856, September onward (so 1854 reading window opens after the actual event)', () => {
    expect(headline!.fromYear).toBe(1854);
    expect(headline!.toYear).toBe(1856);
    expect(headline!.fromMonth).toBe(9);
  });

  it('shifts Bannock -10 and Shoshone -5', () => {
    const effects = headline!.effects ?? [];
    expect(effects).toEqual([
      { kind: 'tribe_shift', tribeId: 'bannock', delta: -10 },
      { kind: 'tribe_shift', tribeId: 'shoshone', delta: -5 }
    ]);
  });
});

describe('Yakima War headline (#209)', () => {
  const headline = HEADLINES.find((h) => h.id === 'yakima_war');

  it('is registered', () => {
    expect(headline).toBeTruthy();
  });

  it('fires 1855-1858, November onward', () => {
    expect(headline!.fromYear).toBe(1855);
    expect(headline!.toYear).toBe(1858);
    expect(headline!.fromMonth).toBe(11);
  });

  it('shifts Walla Walla -12, Umatilla -8, Cayuse -5', () => {
    const effects = headline!.effects ?? [];
    expect(effects).toEqual([
      { kind: 'tribe_shift', tribeId: 'walla_walla', delta: -12 },
      { kind: 'tribe_shift', tribeId: 'umatilla', delta: -8 },
      { kind: 'tribe_shift', tribeId: 'cayuse', delta: -5 }
    ]);
  });
});
