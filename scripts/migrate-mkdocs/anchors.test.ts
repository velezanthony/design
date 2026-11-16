import { describe, expect, it } from 'vitest';
import { fixAccentAnchors } from './anchors';

const md = (...lines: string[]) => lines.join('\n') + '\n';

describe('fixAccentAnchors', () => {
  it('repone los acentos que MkDocs quitaba de los ids (`catalogo` -> `catálogo`)', () => {
    const files = new Map([
      ['a.es.md', md('# A', '', 'Ver [el catálogo](b.es.md#el-catalogo-de-capacidades).')],
      ['b.es.md', md('# B', '', '## El catálogo de capacidades')],
    ]);
    const out = fixAccentAnchors(files);
    expect(out.files.get('a.es.md')).toContain('(b.es.md#el-catálogo-de-capacidades)');
    expect(out.log).toContainEqual(expect.objectContaining({ kind: 'anchor', file: 'a.es.md' }));
  });

  it('resuelve las anclas del mismo fichero', () => {
    const files = new Map([['a.md', md('# A', '', '[x](#qué-falta)', '', '## Qué falta')]]);
    expect(fixAccentAnchors(files).files.get('a.md')).toContain('(#qué-falta)');
    const stripped = new Map([['a.md', md('# A', '', '[x](#que-falta)', '', '## Qué falta')]]);
    expect(fixAccentAnchors(stripped).files.get('a.md')).toContain('(#qué-falta)');
  });

  it('no toca las anclas que ya existen ni las que no tienen equivalente', () => {
    const files = new Map([['a.md', md('# A', '[x](#a) [y](#nada)')]]);
    expect(fixAccentAnchors(files).files.get('a.md')).toBe(md('# A', '[x](#a) [y](#nada)'));
  });

  it('ignora encabezados y enlaces dentro de bloques de código', () => {
    const files = new Map([['a.md', md('# A', '```md', '## Qué', '```', '[x](#que)')]]);
    expect(fixAccentAnchors(files).files.get('a.md')).toContain('(#que)');
  });

  it('numera los encabezados repetidos como github-slugger', () => {
    const files = new Map([['a.md', md('# A', '## Año', '## Año', '[x](#ano-1)')]]);
    expect(fixAccentAnchors(files).files.get('a.md')).toContain('(#año-1)');
  });
});
