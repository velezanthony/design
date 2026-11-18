import { describe, expect, it } from 'vitest';
import { estimateWidth } from './pixels';

describe('estimateWidth', () => {
  it('suma el ancho de cada carácter de una fuente tipo Arial: «Hello» a 20 px son ≈46 px', () => {
    // H 722 + e 556 + l 222 + l 222 + o 556 = 2278 milésimas de em → 45,56 px
    expect(estimateWidth('Hello', 'title')).toBe(46);
  });

  it('la descripción se mide a 14 px: la misma palabra ocupa menos que en el título', () => {
    // 2278 milésimas de em a 14 px → 31,9 px
    expect(estimateWidth('Hello', 'description')).toBe(32);
  });

  it('los caracteres estrechos ocupan menos que los anchos aunque haya los mismos', () => {
    expect(estimateWidth('iiiiiiiiii', 'title')).toBeLessThan(estimateWidth('WWWWWWWWWW', 'title'));
  });

  it('un acento mide lo que su letra base', () => {
    expect(estimateWidth('Migración', 'title')).toBe(estimateWidth('Migracion', 'title'));
  });

  it('un carácter fuera de la tabla (CJK, emoji) se estima ancho, nunca cero', () => {
    expect(estimateWidth('日', 'title')).toBe(20);
  });

  it('un texto vacío no mide nada', () => {
    expect(estimateWidth('', 'title')).toBe(0);
  });
});
