import { describe, expect, it } from 'vitest';

import { defaultStrings } from '../core/i18n/ui-strings';
import { stringsFor } from './strings';

describe('stringsFor', () => {
  it('devuelve el catálogo por defecto del idioma', () => {
    expect(stringsFor('es')).toEqual(defaultStrings.es);
    expect(stringsFor('en')).toEqual(defaultStrings.en);
  });

  it('sobrescribe solo las claves indicadas, sin mutar el catálogo', () => {
    const strings = stringsFor('en', { 'toc.title': 'Contents' });
    expect(strings['toc.title']).toBe('Contents');
    expect(strings['edit.page']).toBe(defaultStrings.en?.['edit.page']);
    expect(defaultStrings.en?.['toc.title']).toBe('On this page');
  });
});
