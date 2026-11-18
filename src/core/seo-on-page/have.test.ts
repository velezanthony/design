import { describe, expect, it } from 'vitest';

import { HAVE_CELLS, isGood, LACKS_PHRASES, type HaveState } from './have';
import { HaveColumn } from './queries/url-filters';

describe('isGood', () => {
  it.each<[HaveState, boolean]>([
    ['own', true],
    ['ok', true],
    ['site', false],
    ['partial', false],
    ['missing', false],
    ['no', false],
  ])('%s cuenta como «lo tiene»: %s', (state, expected) => {
    expect(isGood({ state })).toBe(expected);
  });
});

describe('columnas de «Qué tiene»', () => {
  it('cada columna tiene su celda y su frase de lo que falta', () => {
    for (const column of Object.values(HaveColumn)) {
      expect(HAVE_CELLS[column]).toBeTypeOf('function');
      expect(LACKS_PHRASES[column]).toBeTruthy();
    }
  });
});
