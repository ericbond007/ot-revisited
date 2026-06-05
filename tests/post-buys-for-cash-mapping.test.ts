import { describe, it, expect } from 'vitest';
import { getLandmark, postBuysForCash } from '../src/lib/game/content/landmarks';

describe('historical cash-payout mapping', () => {
  it('always-cash posts pay at any year', () => {
    for (const id of ['ft_kearny', 'hollenberg_ranch', 'rock_creek_station', 'ft_caspar', 'the_dalles']) {
      expect(postBuysForCash(getLandmark(id), 1860)).toBe(true);
    }
  });
  it('Fort Laramie flips to cash in 1849', () => {
    expect(postBuysForCash(getLandmark('ft_laramie'), 1848)).toBe(false);
    expect(postBuysForCash(getLandmark('ft_laramie'), 1849)).toBe(true);
  });
  it('Fort Bridger flips to cash in 1858', () => {
    expect(postBuysForCash(getLandmark('ft_bridger'), 1857)).toBe(false);
    expect(postBuysForCash(getLandmark('ft_bridger'), 1858)).toBe(true);
  });
  it('barter-only posts never pay cash', () => {
    for (const id of ['robidoux_post', 'ft_hall', 'ft_boise', 'ft_walla_walla', 'whitman_mission', 'cheyenne_camp', 'shoshone_camp']) {
      expect(postBuysForCash(getLandmark(id), 1860)).toBe(false);
    }
  });
});
