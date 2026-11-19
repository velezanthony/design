import { describe, expect, it } from 'vitest';
import { fixAnchors } from './anchors.ts';

function reportMarkdown(...lines: string[]) {
  return lines.join('\n') + '\n';
}

describe('fixAnchors', () => {
  it('repone los acentos que MkDocs quitaba de los ids (`catalogo` -> `catálogo`)', () => {
    const files = new Map([
      [
        'a.es.md',
        reportMarkdown('# A', '', 'Ver [el catálogo](b.es.md#el-catalogo-de-capacidades).'),
      ],
      ['b.es.md', reportMarkdown('# B', '', '## El catálogo de capacidades')],
    ]);
    const out = fixAnchors(files);
    expect(out.files.get('a.es.md')).toContain('(b.es.md#el-catálogo-de-capacidades)');
    expect(out.log).toContainEqual(expect.objectContaining({ kind: 'anchor', file: 'a.es.md' }));
  });

  it('resuelve las anclas del mismo fichero', () => {
    const files = new Map([
      ['a.md', reportMarkdown('# A', '', '[x](#qué-falta)', '', '## Qué falta')],
    ]);
    expect(fixAnchors(files).files.get('a.md')).toContain('(#qué-falta)');
    const stripped = new Map([
      ['a.md', reportMarkdown('# A', '', '[x](#que-falta)', '', '## Qué falta')],
    ]);
    expect(fixAnchors(stripped).files.get('a.md')).toContain('(#qué-falta)');
  });

  it('no toca las anclas que ya existen ni las que no tienen equivalente', () => {
    const files = new Map([['a.md', reportMarkdown('# A', '[x](#a) [y](#nada)')]]);
    expect(fixAnchors(files).files.get('a.md')).toBe(reportMarkdown('# A', '[x](#a) [y](#nada)'));
  });

  it('ignora encabezados y enlaces dentro de bloques de código', () => {
    const files = new Map([['a.md', reportMarkdown('# A', '```md', '## Qué', '```', '[x](#que)')]]);
    expect(fixAnchors(files).files.get('a.md')).toContain('(#que)');
  });

  it('numera los encabezados repetidos como github-slugger', () => {
    const files = new Map([['a.md', reportMarkdown('# A', '## Año', '## Año', '[x](#ano-1)')]]);
    expect(fixAnchors(files).files.get('a.md')).toContain('(#año-1)');
  });

  it('desde una página traducida, un enlace a `x.md` se valida contra su gemela `x.es.md`', () => {
    /* mkdocs-static-i18n resuelve `commands.md` a la gemela del idioma de la página; la
       librería también. El id que importa es el del encabezado en español. */
    const files = new Map([
      ['index.es.md', reportMarkdown('# Inicio', '', '[c](users/commands.md#codigos-de-salida)')],
      ['users/commands.md', reportMarkdown('# Commands', '', '## Exit codes')],
      ['users/commands.es.md', reportMarkdown('# Comandos', '', '## Códigos de salida')],
    ]);
    const out = fixAnchors(files);
    expect(out.files.get('index.es.md')).toContain('(users/commands.md#códigos-de-salida)');
  });

  it('en la página sin traducir sigue usando el fichero tal cual', () => {
    const files = new Map([
      ['index.md', reportMarkdown('# Home', '', '[c](users/commands.md#codigos-de-salida)')],
      ['users/commands.md', reportMarkdown('# Commands', '', '## Códigos de salida')],
      ['users/commands.es.md', reportMarkdown('# Comandos', '', '## Otra cosa')],
    ]);
    expect(fixAnchors(files).files.get('index.md')).toContain('#códigos-de-salida');
  });

  it('si la gemela no existe, cae al fichero literal', () => {
    const files = new Map([
      ['index.es.md', reportMarkdown('# Inicio', '', '[c](b.md#qué-tal)', '[d](b.md#que-tal)')],
      ['b.md', reportMarkdown('# B', '', '## Qué tal')],
    ]);
    expect(fixAnchors(files).files.get('index.es.md')).toContain('(b.md#qué-tal)');
  });
});

describe('fixAnchors: ids de MkDocs que no son los de la librería', () => {
  function fixed(text: string, options: { original?: string; style?: 'unicode' } = {}) {
    const files = new Map([['a.md', text]]);
    const originals = options.original ? new Map([['a.md', options.original]]) : undefined;
    return fixAnchors(files, originals, options.style).files.get('a.md')!;
  }

  it('los separadores seguidos se juntan en MkDocs y no en la librería (`a - b`)', () => {
    const out = fixed(reportMarkdown('# A', '', '## Uno - dos', '', '[x](#uno-dos)'));
    expect(out).toContain('(#uno---dos)');
  });

  it('un símbolo suelto entre palabras deja dos guiones en la librería (`a & b`)', () => {
    expect(fixed(reportMarkdown('# A', '## Tom & Jerry', '[x](#tom-jerry)'))).toContain(
      '(#tom--jerry)',
    );
  });

  it('los repetidos van con `_n` en MkDocs y con `-n` en la librería', () => {
    const out = fixed(reportMarkdown('# A', '## Uso', '## Uso', '[x](#uso_1)'));
    expect(out).toContain('(#uso-1)');
  });

  it('el `{ #id }` explícito apunta al id que la librería genera del texto', () => {
    const original = reportMarkdown('# A', '', '## Instalación { #install }', '', '[x](#install)');
    const converted = reportMarkdown('# A', '', '## Instalación', '', '[x](#install)');
    expect(fixed(converted, { original })).toContain('(#instalación)');
  });

  it('con un slugify unicode (pymdownx) solo cambia la numeración de los repetidos', () => {
    const text = reportMarkdown('# A', '## Qué es', '## Qué es', '[x](#qué-es) [y](#qué-es_1)');
    expect(fixed(text, { style: 'unicode' })).toContain('(#qué-es) [y](#qué-es-1)');
  });

  it('un `#` final pegado al texto es parte de él (`C#`), no un cierre ATX', () => {
    expect(fixed(reportMarkdown('# A', '## C#', '[x](#c)'))).toContain('(#c)');
  });

  it('el ancla que no es de MkDocs pero sí de la librería no se toca', () => {
    expect(fixed(reportMarkdown('# A', '## Qué es', '[x](#qué-es)'))).toContain('(#qué-es)');
  });
});
