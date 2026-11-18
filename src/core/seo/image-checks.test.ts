import { describe, expect, it } from 'vitest';
import { checkImage } from './image-checks';

const KB = 1024;

describe('checkImage', () => {
  it('1200×630 y 120 KB: ningún aviso', () => {
    expect(checkImage({ width: 1200, height: 630, bytes: 120 * KB })).toEqual([]);
  });

  it('avisa de una proporción lejos de 1,91:1', () => {
    const warnings = checkImage({ width: 1000, height: 1000, bytes: 100 * KB });
    expect(warnings.map((warning) => warning.code)).toEqual(['aspect']);
    expect(warnings[0].message).toContain('1000×1000');
  });

  it('tolera ±2 % de proporción', () => {
    expect(checkImage({ width: 1200, height: 620, bytes: KB })).toEqual([]);
    expect(
      checkImage({ width: 1200, height: 600, bytes: KB }).map((warning) => warning.code),
    ).toEqual(['aspect']);
  });

  it('avisa de más de 300 KB', () => {
    const warnings = checkImage({ width: 1200, height: 630, bytes: 400 * KB });
    expect(warnings.map((warning) => warning.code)).toEqual(['size']);
    expect(warnings[0].message).toContain('300 KB');
  });

  it('300 KB exactos pasan y un byte más avisa', () => {
    expect(checkImage({ width: 1200, height: 630, bytes: 300 * KB })).toEqual([]);
    expect(checkImage({ width: 1200, height: 630, bytes: 300 * KB + 1 })).toHaveLength(1);
  });

  it('los dos avisos a la vez', () => {
    expect(checkImage({ width: 500, height: 500, bytes: 500 * KB })).toHaveLength(2);
  });

  it('una dimensión cero es una proporción inválida, no una excepción', () => {
    expect(
      checkImage({ width: 1200, height: 0, bytes: KB }).map((warning) => warning.code),
    ).toEqual(['aspect']);
  });
});
