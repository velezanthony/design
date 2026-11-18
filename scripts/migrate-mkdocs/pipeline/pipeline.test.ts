import { describe, expect, it } from 'vitest';
import { runPipeline } from './pipeline';

function reportMarkdown(...lines: string[]) {
  return lines.join('\n') + '\n';
}

const page = reportMarkdown(
  '---',
  'hide:',
  '  - toc',
  '---',
  '',
  '# Guía { #guia }',
  '',
  ':material-book: Empieza por [el catálogo](catalogo.md#el-catalogo).',
  '',
  '!!! warning "Ojo"',
  '',
  '    Cuidado con `!!! note` en código.',
  '',
  '=== "npm"',
  '',
  '    ```',
  '    $ npm i',
  '    ```',
  '',
  '=== "pnpm"',
  '',
  '    ```sh',
  '    pnpm add x',
  '    ```',
);
const catalog = reportMarkdown('# Catálogo', '', '## El catálogo');

describe('runPipeline', () => {
  const files = new Map([
    ['guia.md', page],
    ['catalogo.md', catalog],
  ]);

  it('compone las unidades: frontmatter, bloques, texto corrido y anclas', () => {
    const out = runPipeline(files);
    expect(out.files.get('guia.md')).toBe(
      reportMarkdown(
        '# Guía',
        '',
        'Empieza por [el catálogo](catalogo.md#el-catálogo).',
        '',
        ':::warning[Ojo]',
        'Cuidado con `!!! note` en código.',
        ':::',
        '',
        '::::tabs',
        ':::tab[npm]',
        '```console',
        '$ npm i',
        '```',
        ':::',
        ':::tab[pnpm]',
        '```sh',
        'pnpm add x',
        '```',
        ':::',
        '::::',
      ),
    );
    expect(out.files.get('catalogo.md')).toBe(catalog);
  });

  it('los enlaces relativos `.md` se quedan: la librería los resuelve sola', () => {
    expect(runPipeline(files).files.get('guia.md')).toContain('(catalogo.md#');
  });

  it('registra por fichero lo convertido, incluidas las anclas', () => {
    const kinds = runPipeline(files).log['guia.md']?.map((entry) => entry.kind);
    expect(kinds).toEqual(
      expect.arrayContaining([
        'frontmatter',
        'heading-id',
        'icon',
        'anchor',
        'admonition',
        'tabs',
        'code-language',
      ]),
    );
    expect(runPipeline(files).log['catalogo.md']).toBeUndefined();
  });

  it('una página convertida del todo no deja restos', () => {
    expect(runPipeline(files).leftovers).toEqual([]);
  });

  it('un resto que la conversión no entiende se informa con su línea de la salida', () => {
    const out = runPipeline(
      new Map([['a.md', reportMarkdown('# A', '', '===+ "Abierta"', '', '    x')]]),
    );
    expect(out.leftovers).toEqual([
      { file: 'a.md', line: 3, kind: 'tab', preview: '===+ "Abierta"' },
    ]);
  });

  it('un stub de snippet ni se convierte ni cuenta como resto', () => {
    const stub = reportMarkdown('# Cambios', '', '--8<-- "CHANGELOG.md"');
    const out = runPipeline(new Map([['changelog.md', stub]]));
    expect(out.files.get('changelog.md')).toBe(stub);
    expect(out.stubs).toEqual([{ file: 'changelog.md', include: 'CHANGELOG.md' }]);
    expect(out.leftovers).toEqual([]);
  });

  it('conserva CRLF y la ausencia de salto final', () => {
    const crlf = '!!! note "N"\r\n\r\n    x';
    const out = runPipeline(new Map([['a.md', crlf]]));
    expect(out.files.get('a.md')).toBe(':::note[N]\r\nx\r\n:::');
  });

  it('un reescritor de enlaces opcional se aplica por fichero', () => {
    const out = runPipeline(new Map([['a.md', reportMarkdown('[x](y.md)')]]), {
      rewriteHref: (file) => (href) => `${file}:${href}`,
    });
    expect(out.files.get('a.md')).toBe(reportMarkdown('[x](a.md:y.md)'));
  });

  it('es idempotente: convertir lo ya convertido no cambia nada', () => {
    const once = runPipeline(files).files;
    expect(runPipeline(once).files).toEqual(once);
  });

  it('avisa de los enlaces a un stub, con la ruta real que los sustituiría', () => {
    const out = runPipeline(
      new Map([
        ['contributing.md', reportMarkdown('--8<-- "CONTRIBUTING.md"')],
        ['users/a.md', reportMarkdown('# A', '', '[c](../contributing.md)')],
      ]),
    );
    expect(out.stubLinks).toEqual([
      {
        file: 'users/a.md',
        line: 3,
        href: '../contributing.md',
        suggestion: '../../CONTRIBUTING.md',
      },
    ]);
  });
});
