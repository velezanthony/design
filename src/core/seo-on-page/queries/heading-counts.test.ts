import { describe, expect, it } from 'vitest';
import { headingCounts } from './heading-counts';

const h = (depth: number, text = `H${depth}`) => ({ depth, slug: text, text });

describe('headingCounts', () => {
  it('cuenta cuántos hay de cada nivel, de H1 a H6, y el total', () => {
    const counts = headingCounts([h(1), h(2), h(2), h(3), h(2)]);
    expect(counts.levels).toEqual([
      { depth: 1, count: 1 },
      { depth: 2, count: 3 },
      { depth: 3, count: 1 },
      { depth: 4, count: 0 },
      { depth: 5, count: 0 },
      { depth: 6, count: 0 },
    ]);
    expect(counts.total).toBe(5);
  });

  it('sin encabezados todo es cero', () => {
    const counts = headingCounts([]);
    expect(counts.total).toBe(0);
    expect(counts.levels.every((level) => level.count === 0)).toBe(true);
  });

  it('un nivel fuera de H1–H6 no rompe la cuenta del resto', () => {
    expect(headingCounts([h(1), h(9)]).total).toBe(1);
  });
});

describe('headingCounts · estado', () => {
  it('un H1 y sin saltos está bien', () => {
    expect(headingCounts([h(1), h(2), h(3)]).problems).toEqual([]);
  });

  it('sin H1 lo dice', () => {
    expect(headingCounts([h(2)]).problems).toEqual([{ kind: 'no-h1' }]);
  });

  it('con varios H1 dice cuántos', () => {
    expect(headingCounts([h(1), h(1)]).problems).toEqual([{ kind: 'multiple-h1', count: 2 }]);
  });

  it('un salto de nivel dice de dónde a dónde', () => {
    expect(headingCounts([h(1), h(2), h(4)]).problems).toEqual([{ kind: 'skip', from: 2, to: 4 }]);
  });

  it('subir de nivel al cerrar una sección no es un salto', () => {
    expect(headingCounts([h(1), h(2), h(3), h(4), h(2)]).problems).toEqual([]);
  });
});
