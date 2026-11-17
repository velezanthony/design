import { describe, expect, it } from 'vitest';
import type { HeadingNode } from '../tree/types';
import { analyzeHeadings } from './headings';

const h = (depth: number, text = `h${depth}`): HeadingNode => ({ depth, slug: text, text });
const analyze = (headings: HeadingNode[]) => analyzeHeadings({ slug: 'a', locale: 'en' }, headings);

describe('analyzeHeadings', () => {
  it('estructura correcta: sin problemas', () => {
    expect(analyze([h(1), h(2), h(3), h(2)])).toEqual([]);
  });

  it('sin H1: error', () => {
    expect(analyze([h(2), h(3)])).toMatchObject([{ kind: 'no-h1', severity: 'error', value: 0 }]);
  });

  it('sin ningún encabezado también es «sin H1»', () => {
    expect(analyze([]).map((issue) => issue.kind)).toEqual(['no-h1']);
  });

  it('más de un H1: avisa con el recuento', () => {
    expect(analyze([h(1), h(2), h(1)])).toMatchObject([
      { kind: 'multiple-h1', value: 2, limit: 1 },
    ]);
  });

  it('salto de nivel H2 → H4: avisa con el nivel al que se saltó', () => {
    const issues = analyze([h(1), h(2), h(4, 'deep')]);
    expect(issues).toMatchObject([{ kind: 'heading-skip', value: 4 }]);
    expect(issues[0].message).toContain('deep');
  });

  it('subir de nivel (H4 → H2) no es un salto', () => {
    expect(analyze([h(1), h(2), h(3), h(4), h(2)])).toEqual([]);
  });

  it('un salto por cada vez que ocurre, en orden', () => {
    const kinds = analyze([h(1), h(3), h(4), h(6)]).map((issue) => issue.value);
    expect(kinds).toEqual([3, 6]);
  });
});
