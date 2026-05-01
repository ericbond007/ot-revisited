import { describe, it, expect } from 'vitest';
import { ITEMS } from '../src/lib/game/content/items';
import { PRICES } from '../src/lib/game/content/prices';
import { CONDITIONS } from '../src/lib/game/content/conditions';
import { OUTFITTER_BUYABLES } from '../src/lib/game/content/outfitter';
import { LANDMARKS } from '../src/lib/game/content/landmarks';

const NEW_MEDICINES = [
  'epsom_salts',
  'camphor',
  'paregoric',
  'hartshorn',
  'dovers_powder',
  'castor_oil'
] as const;

describe('#213 medicine kit fill-out', () => {
  it('all six new items exist with the medicine category', () => {
    for (const id of NEW_MEDICINES) {
      expect(ITEMS[id], `missing item: ${id}`).toBeDefined();
      expect(ITEMS[id].category).toBe('medicine');
      expect(ITEMS[id].name).toBeTruthy();
      expect(ITEMS[id].description).toBeTruthy();
    }
  });

  it('all six have buy/sell prices', () => {
    for (const id of NEW_MEDICINES) {
      const p = PRICES[id];
      expect(p, `missing price: ${id}`).toBeDefined();
      expect(p.buy).toBeGreaterThan(0);
      expect(p.sell).toBeGreaterThan(0);
      expect(p.sell).toBeLessThan(p.buy);
    }
  });

  it('all six are available at the initial Independence outfitter', () => {
    for (const id of NEW_MEDICINES) {
      expect(OUTFITTER_BUYABLES).toContain(id);
    }
  });

  it('epsom salts + paregoric + castor oil offer gentler dysentery alternatives', () => {
    const dysentery = CONDITIONS.dysentery;
    expect(dysentery.treatmentItems).toContain('epsom_salts');
    expect(dysentery.treatmentItems).toContain('paregoric');
    expect(dysentery.treatmentItems).toContain('castor_oil');
    // Calomel still listed so existing event flows don't break.
    expect(dysentery.treatmentItems).toContain('calomel');
  });

  it("Dover's powder + camphor join cholera treatments", () => {
    const cholera = CONDITIONS.cholera;
    expect(cholera.treatmentItems).toContain('dovers_powder');
    expect(cholera.treatmentItems).toContain('camphor');
    expect(cholera.treatmentItems).toContain('quinine');
  });

  it("Dover's powder also treats typhoid + measles", () => {
    expect(CONDITIONS.typhoid.treatmentItems).toContain('dovers_powder');
    expect(CONDITIONS.measles.treatmentItems).toContain('dovers_powder');
  });

  it('hartshorn joins snakebite treatments (folk-remedy)', () => {
    expect(CONDITIONS.snakebite.treatmentItems).toContain('hartshorn');
  });

  it('Fort Laramie stocks the full new medicine line', () => {
    const laramie = LANDMARKS.find((l) => l.id === 'ft_laramie');
    expect(laramie?.stock).toBeDefined();
    for (const id of NEW_MEDICINES) {
      expect(laramie!.stock!).toContain(id);
    }
  });

  it('The Dalles stocks the new medicines (sans hartshorn-only-snakebite filler)', () => {
    const dalles = LANDMARKS.find((l) => l.id === 'the_dalles');
    expect(dalles?.stock).toBeDefined();
    expect(dalles!.stock!).toContain('epsom_salts');
    expect(dalles!.stock!).toContain('dovers_powder');
  });
});
