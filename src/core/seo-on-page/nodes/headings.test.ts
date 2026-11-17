import { describe, expect, it } from 'vitest';
import { buildHeadingNodes } from './headings';

describe('buildHeadingNodes', () => {
  it('conserva el orden y los campos que da Astro', () => {
    const headings = [
      { depth: 1, slug: 'a', text: 'A' },
      { depth: 2, slug: 'b', text: 'B' },
    ];
    expect(buildHeadingNodes(headings)).toEqual(headings);
  });

  it('devuelve una copia: no comparte los objetos con la entrada', () => {
    const headings = [{ depth: 1, slug: 'a', text: 'A' }];
    const [node] = buildHeadingNodes(headings);
    expect(node).not.toBe(headings[0]);
  });
});
