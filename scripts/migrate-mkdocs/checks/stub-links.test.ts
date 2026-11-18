import { describe, expect, it } from 'vitest';
import { findStubLinks } from './stub-links';

function reportMarkdown(...lines: string[]) {
  return lines.join('\n') + '\n';
}
const stubs = [{ file: 'contributing.md', include: 'CONTRIBUTING.md' }];

describe('findStubLinks', () => {
  it('encuentra los enlaces a un stub y propone la ruta real al fichero incluido', () => {
    const files = new Map([
      [
        'contributors/engineering.md',
        reportMarkdown('# E', '', 'Mira [guía](../contributing.md#pr).'),
      ],
    ]);
    expect(findStubLinks(files, stubs)).toEqual([
      {
        file: 'contributors/engineering.md',
        line: 3,
        href: '../contributing.md#pr',
        suggestion: '../../CONTRIBUTING.md#pr',
      },
    ]);
  });

  it('desde la raíz de docs/ la ruta sube un solo nivel', () => {
    const files = new Map([['index.md', reportMarkdown('[c](contributing.md)')]]);
    expect(findStubLinks(files, stubs)[0].suggestion).toBe('../CONTRIBUTING.md');
  });

  it('el fichero incluido puede estar en una subcarpeta del repo', () => {
    const files = new Map([['index.md', reportMarkdown('[c](a.md)')]]);
    const found = findStubLinks(files, [{ file: 'a.md', include: 'meta/A.md' }]);
    expect(found[0].suggestion).toBe('../meta/A.md');
  });

  it('ignora enlaces a otras páginas, externos y los de código', () => {
    const files = new Map([
      [
        'index.md',
        reportMarkdown(
          '[a](other.md) [b](https://x.dev/contributing.md)',
          '`[c](contributing.md)`',
          '```',
          '[d](contributing.md)',
          '```',
        ),
      ],
    ]);
    expect(findStubLinks(files, stubs)).toEqual([]);
  });

  it('sin stubs no hay nada que buscar', () => {
    expect(findStubLinks(new Map([['a.md', reportMarkdown('[x](b.md)')]]), [])).toEqual([]);
  });

  it('el propio stub no cuenta como origen', () => {
    const files = new Map([['contributing.md', reportMarkdown('--8<-- "CONTRIBUTING.md"')]]);
    expect(findStubLinks(files, stubs)).toEqual([]);
  });
});
