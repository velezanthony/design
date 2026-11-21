import { describe, expect, it } from 'vitest';
import { formatListingDate } from './view';

describe('formatListingDate', () => {
  it('fecha media en el idioma, en UTC', () => {
    expect(formatListingDate('2026-11-21T23:30:00+00:00', 'es')).toBe('21 nov 2026');
    expect(formatListingDate('2026-11-21T23:30:00+00:00', 'en')).toBe('Nov 21, 2026');
  });
});
