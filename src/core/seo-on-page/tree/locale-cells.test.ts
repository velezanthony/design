import { describe, expect, it } from 'vitest';

import { localeCells } from './locale-cells';
import type { SeoLocaleEntry } from './types';

describe('localeCells', () => {
  it('da una celda por idioma configurado, en su orden', () => {
    const group = [
      { locale: 'es', status: 'present' },
      { locale: 'fr', status: 'missing', policy: 'fallback' },
      { locale: 'de', status: 'missing', policy: 'omit' },
    ] as unknown as SeoLocaleEntry[];
    expect(localeCells(group, ['en', 'es', 'fr', 'de'])).toEqual([
      { locale: 'en', state: 'missing' },
      { locale: 'es', state: 'exists' },
      { locale: 'fr', state: 'fallback' },
      { locale: 'de', state: 'omitted' },
    ]);
  });

  it('una falta con política de enlazar al original sigue siendo «missing»', () => {
    const group = [
      { locale: 'es', status: 'missing', policy: 'link' },
    ] as unknown as SeoLocaleEntry[];
    expect(localeCells(group, ['es'])).toEqual([{ locale: 'es', state: 'missing' }]);
  });
});
