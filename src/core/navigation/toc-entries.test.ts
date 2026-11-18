import { describe, expect, it } from 'vitest';
import { tocEntries } from './toc-entries';

const h = (depth: number, slug: string) => ({ depth, slug, text: slug.toUpperCase() });

describe('tocEntries', () => {
  it('solo cuentan los H2 y H3: el H1 es el título y los H4 serían ruido', () => {
    const headings = [h(1, 't'), h(2, 'a'), h(3, 'b'), h(4, 'c'), h(2, 'd')];
    expect(tocEntries(headings).map((entry) => entry.slug)).toEqual(['a', 'b', 'd']);
  });

  it('con menos de 3 entradas no hay índice: no aportaría nada', () => {
    expect(tocEntries([h(2, 'a'), h(2, 'b')])).toEqual([]);
    expect(tocEntries([])).toEqual([]);
  });

  it('con 3 o más, todas', () => {
    expect(tocEntries([h(2, 'a'), h(2, 'b'), h(3, 'c')])).toHaveLength(3);
  });
});
