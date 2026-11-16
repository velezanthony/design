import { describe, expect, it } from 'vitest';

import { contrast, luminance } from './contrast';

describe('luminance', () => {
  it('es 1 para el blanco y 0 para el negro', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
    expect(luminance('#000000')).toBeCloseTo(0, 5);
  });

  it('acepta #rgb y #rrggbbaa (el alfa se ignora)', () => {
    expect(luminance('#fff')).toBeCloseTo(luminance('#ffffff'), 8);
    expect(luminance('#ffffff80')).toBeCloseTo(luminance('#ffffff'), 8);
  });
});

describe('contrast', () => {
  it('blanco sobre negro es 21:1, sin importar el orden', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('un color sobre sí mismo es 1:1', () => {
    expect(contrast('#336699', '#336699')).toBeCloseTo(1, 8);
  });

  it('un par conocido: #767676 sobre blanco es 4.54:1', () => {
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});
