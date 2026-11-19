import { describe, expect, it } from 'vitest';
import { tocEntries } from './toc-entries';

function heading(depth: number, slug: string) {
  return { depth, slug, text: slug.toUpperCase() };
}

describe('tocEntries', () => {
  it('solo cuentan los H2 y H3: el H1 es el título y los H4 serían ruido', () => {
    const headings = [
      heading(1, 't'),
      heading(2, 'a'),
      heading(3, 'b'),
      heading(4, 'c'),
      heading(2, 'd'),
    ];
    expect(tocEntries(headings).map((entry) => entry.slug)).toEqual(['a', 'b', 'd']);
  });

  it('con menos de 3 entradas no hay índice: no aportaría nada', () => {
    expect(tocEntries([heading(2, 'a'), heading(2, 'b')])).toEqual([]);
    expect(tocEntries([])).toEqual([]);
  });

  it('con 3 o más, todas', () => {
    expect(tocEntries([heading(2, 'a'), heading(2, 'b'), heading(3, 'c')])).toHaveLength(3);
  });
});

describe('tocEntries: profundidad máxima', () => {
  const headings = [
    heading(2, 'a'),
    heading(3, 'b'),
    heading(4, 'c'),
    heading(5, 'd'),
    heading(2, 'e'),
    heading(2, 'f'),
  ];

  it('con 2 solo quedan los H2', () => {
    expect(tocEntries(headings, 2).map((entry) => entry.slug)).toEqual(['a', 'e', 'f']);
  });

  it('con 4 entran también los H4', () => {
    expect(tocEntries(headings, 4).map((entry) => entry.slug)).toEqual(['a', 'b', 'c', 'e', 'f']);
  });

  it('el mínimo de tres se cuenta sobre lo que queda tras filtrar', () => {
    expect(tocEntries(headings.slice(0, 3), 3)).toEqual([]);
  });
});
