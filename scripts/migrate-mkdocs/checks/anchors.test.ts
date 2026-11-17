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

  it('desde una página traducida, un enlace a `x.md` se valida contra su gemela `x.es.md`', () => {
    /* mkdocs-static-i18n resuelve `commands.md` a la gemela del idioma de la página; la
       librería también. El id que importa es el del encabezado en español. */
    const files = new Map([
      ['index.es.md', md('# Inicio', '', '[c](users/commands.md#codigos-de-salida)')],
      ['users/commands.md', md('# Commands', '', '## Exit codes')],
      ['users/commands.es.md', md('# Comandos', '', '## Códigos de salida')],
    ]);
    const out = fixAccentAnchors(files);
    expect(out.files.get('index.es.md')).toContain('(users/commands.md#códigos-de-salida)');
  });

  it('en la página sin traducir sigue usando el fichero tal cual', () => {
    const files = new Map([
      ['index.md', md('# Home', '', '[c](users/commands.md#codigos-de-salida)')],
      ['users/commands.md', md('# Commands', '', '## Códigos de salida')],
      ['users/commands.es.md', md('# Comandos', '', '## Otra cosa')],
    ]);
    expect(fixAccentAnchors(files).files.get('index.md')).toContain('#códigos-de-salida');
  });

  it('si la gemela no existe, cae al fichero literal', () => {
    const files = new Map([
      ['index.es.md', md('# Inicio', '', '[c](b.md#qué-tal)', '[d](b.md#que-tal)')],
      ['b.md', md('# B', '', '## Qué tal')],
    ]);
    expect(fixAccentAnchors(files).files.get('index.es.md')).toContain('(b.md#qué-tal)');
  });
});
