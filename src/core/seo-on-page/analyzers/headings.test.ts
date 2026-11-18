import { describe, expect, it } from 'vitest';
import type { HeadingNode } from '../tree/types';
import { analyzeHeadings } from './headings';

function heading(depth: number, text = `h${depth}`): HeadingNode {
  return { depth, slug: text, text };
}
function analyze(headings: HeadingNode[]) {
  return analyzeHeadings(
    { slug: 'a', locale: 'en', kind: 'native', sourcePath: 'docs/a.md' },
    headings,
  );
}

describe('analyzeHeadings', () => {
  it('estructura correcta: sin problemas', () => {
    expect(analyze([heading(1), heading(2), heading(3), heading(2)])).toEqual([]);
  });

  it('sin H1: error', () => {
    expect(analyze([heading(2), heading(3)])).toMatchObject([
      { kind: 'no-h1', severity: 'error', value: 0 },
    ]);
  });

  it('sin ningún encabezado también es «sin H1»', () => {
    expect(analyze([]).map((issue) => issue.kind)).toEqual(['no-h1']);
  });

  it('más de un H1: avisa con el recuento', () => {
    expect(analyze([heading(1), heading(2), heading(1)])).toMatchObject([
      { kind: 'multiple-h1', value: 2, limit: 1 },
    ]);
  });

  it('salto de nivel H2 → H4: avisa con el nivel al que se saltó', () => {
    const issues = analyze([heading(1), heading(2), heading(4, 'deep')]);
    expect(issues).toMatchObject([{ kind: 'heading-skip', value: 4 }]);
    expect(issues[0]?.message).toContain('deep');
  });

  it('subir de nivel (H4 → H2) no es un salto', () => {
    expect(analyze([heading(1), heading(2), heading(3), heading(4), heading(2)])).toEqual([]);
  });

  it('un salto por cada vez que ocurre, en orden', () => {
    const kinds = analyze([heading(1), heading(3), heading(4), heading(6)]).map(
      (issue) => issue.value,
    );
    expect(kinds).toEqual([3, 6]);
  });

  it('cada problema dice cómo arreglarlo, con el archivo y el encabezado concretos', () => {
    const [skip] = analyze([heading(1), heading(2), heading(4, 'deep')]);
    expect(skip!.fix).toContain('docs/a.md');
    expect(skip!.fix).toContain('«deep»');
    expect(skip!.fix).toContain('H3');
    expect(analyze([heading(2)])[0]!.fix).toContain('# Título');
    expect(analyze([heading(1), heading(1)])[0]!.fix).toContain('un solo `#`');
  });
});
