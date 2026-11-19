import { describe, expect, it } from 'vitest';
import { formatConfigModule, suggestConfig } from './config-suggestion.ts';
import { parseMkdocs } from './mkdocs.ts';

function suggest(yaml: string) {
  return suggestConfig(parseMkdocs(yaml));
}

const I18N = [
  'plugins:',
  '  - i18n:',
  '      fallback_to_default: true',
  '      languages:',
  '        - locale: en',
  '          default: true',
  '        - locale: es',
  '          nav_translations:',
  '            Guide: Guía',
  '',
].join('\n');

describe('suggestConfig: idiomas', () => {
  it('toma los idiomas y el de por defecto de i18n, y la reserva de `fallback_to_default`', () => {
    const { config } = suggest(I18N);
    expect(config).toMatchObject({
      locales: ['en', 'es'],
      defaultLocale: 'en',
      translations: { missing: 'fallback' },
    });
  });

  it('sin i18n no declara idiomas', () => {
    const { config } = suggest('nav: []\n');
    expect(config).not.toHaveProperty('locales');
    expect(config).not.toHaveProperty('translations');
  });

  it('con i18n sin `fallback_to_default` no pide `fallback`', () => {
    const { config } = suggest(I18N.replace('fallback_to_default: true', 'build: true'));
    expect(config).not.toHaveProperty('translations');
  });
});

describe('suggestConfig: nav', () => {
  it('una página de primer nivel es un elemento `slug`; `x/index` colapsa a `x`', () => {
    const { config } = suggest('nav:\n  - Home: index.md\n  - Overview: dev/index.md\n');
    expect(config.nav).toEqual([
      { label: 'Home', slug: 'index' },
      { label: 'Overview', slug: 'dev' },
    ]);
  });

  it('un grupo es una sección solo con `sidebar` y la etiqueta por idioma', () => {
    const { config } = suggest(
      I18N + 'nav:\n  - Guide:\n      - A: g/a.md\n      - Deep:\n          - B: g/b.md\n',
    );
    expect(config.nav).toEqual([
      {
        label: { en: 'Guide', es: 'Guía' },
        sidebar: ['g/a', { label: 'Deep', items: ['g/b'] }],
      },
    ]);
  });

  it('una etiqueta igual en todos los idiomas es un texto', () => {
    const { config } = suggest(I18N + 'nav:\n  - Home: index.md\n');
    expect(config.nav).toEqual([{ label: 'Home', slug: 'index' }]);
  });

  it('una URL de primer nivel es un enlace y una dentro de un grupo se avisa', () => {
    const { config, notes } = suggest(
      'nav:\n  - Code: https://github.com/o/r\n  - G:\n      - Ext: https://x.dev\n      - A: a.md\n',
    );
    expect(config.nav).toEqual([
      { label: 'Code', href: 'https://github.com/o/r' },
      { label: 'G', sidebar: ['a'] },
    ]);
    expect(notes.join('\n')).toContain('https://x.dev');
  });

  it('una ruta suelta sin título se etiqueta con su nombre', () => {
    const { config } = suggest('nav:\n  - getting-started.md\n');
    expect(config.nav).toEqual([{ label: 'Getting started', slug: 'getting-started' }]);
  });
});

describe('suggestConfig: ficheros de fuera de docs/', () => {
  const yaml = [
    'docs_dir: .',
    'nav:',
    '  - Home: README.md',
    '  - Users:',
    '      - Start: docs/users/start.md',
    '      - Changelog: CHANGELOG.md',
    '      - Providers: src/providers/README.md',
    '      - Views: src/views/README.md',
    '',
  ].join('\n');

  it('con `docs_dir: .` lo de `docs/` es nativo y el resto se publica con `external`', () => {
    const { config, externals } = suggest(yaml);
    expect(config.nav).toEqual([
      { label: 'Home', slug: 'readme' },
      {
        label: 'Users',
        sidebar: ['users/start', 'changelog', 'providers/readme', 'views/readme'],
      },
    ]);
    expect(externals).toEqual([
      { slug: 'readme', file: '../README.md' },
      { slug: 'changelog', file: '../CHANGELOG.md' },
      { slug: 'providers/readme', file: '../src/providers/README.md' },
      { slug: 'views/readme', file: '../src/views/README.md' },
    ]);
    expect(config.external).toEqual(externals);
  });

  it('con `docs_dir: docs` no hay externos', () => {
    expect(suggest('nav:\n  - A: a.md\n').externals).toEqual([]);
    expect(suggest('nav:\n  - A: a.md\n').config).not.toHaveProperty('external');
  });
});

describe('suggestConfig: exclude', () => {
  it('copia `exclude_docs` sin los comentarios', () => {
    const { config } = suggest('exclude_docs: |\n  # nota\n  drafts/\n  *.local.md\n');
    expect(config.exclude).toEqual(['drafts/', '*.local.md']);
  });

  it('con `docs_dir` distinto de docs no lo copia: sus patrones son de otra carpeta', () => {
    const { config, notes } = suggest('docs_dir: .\nexclude_docs: |\n  dist/\n');
    expect(config).not.toHaveProperty('exclude');
    expect(notes.join('\n')).toContain('exclude_docs');
  });
});

describe('formatConfigModule', () => {
  it('es un módulo con la config por defecto y una cabecera que dice de dónde sale', () => {
    const text = formatConfigModule(suggest('nav:\n  - Home: index.md\n'));
    expect(text).toContain('mkdocs.yml');
    expect(text).toContain('export default {');
    expect(text).toContain('"slug": "index"');
  });
});
