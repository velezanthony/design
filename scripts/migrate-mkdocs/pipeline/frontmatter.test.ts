import { describe, expect, it } from 'vitest';
import { cleanFrontmatter } from './frontmatter';

describe('cleanFrontmatter', () => {
  it('quita las claves que solo entiende MkDocs y deja el resto', () => {
    const out = cleanFrontmatter([
      '---',
      'title: A',
      'hide:',
      '  - toc',
      'search: false',
      '---',
      '# A',
    ]);
    expect(out.output).toEqual(['---', 'title: A', '---', '# A']);
    expect(out.log.map((entry) => entry.detail)).toEqual([
      'removed key hide',
      'removed key search',
    ]);
    expect(out.log[0]).toMatchObject({ kind: 'frontmatter', line: 3 });
  });

  it('si no queda nada, elimina el bloque entero y la línea en blanco que lo seguía', () => {
    expect(cleanFrontmatter(['---', 'hide:', '  - toc', '---', '', '# A']).output).toEqual(['# A']);
  });

  it('sin frontmatter o sin cierre no toca nada', () => {
    expect(cleanFrontmatter(['# A', '---']).output).toEqual(['# A', '---']);
    expect(cleanFrontmatter(['---', 'hide: x', '# A']).output).toEqual(['---', 'hide: x', '# A']);
    expect(cleanFrontmatter(['# A']).log).toEqual([]);
  });

  it('un valor de lista de una clave quitada se va con ella', () => {
    const out = cleanFrontmatter(['---', 'status: new', 'tags:', '- a', '---']);
    expect(out.output).toEqual(['---', 'tags:', '- a', '---']);
  });
});
