import { describe, expect, it } from 'vitest';
import { parseMkdocs } from './mkdocs.ts';

const MKDOCS = [
  'site_name: Demo',
  'markdown_extensions:',
  '  - pymdownx.emoji:',
  '      emoji_index: !!python/name:material.extensions.emoji.twemoji',
  'exclude_docs: |',
  '  drafts/',
  '  ',
  '  skip.md',
  'nav:',
  '  - Home: index.md',
  '',
].join('\n');

describe('parseMkdocs', () => {
  it('ignora las etiquetas !!python/name, que yaml no conoce', () => {
    const parsed = parseMkdocs(MKDOCS);
    expect(parsed.nav).toEqual([{ Home: 'index.md' }]);
  });

  it('parte exclude_docs en patrones sin líneas vacías ni espacios', () => {
    expect(parseMkdocs(MKDOCS).excludePatterns).toEqual(['drafts/', 'skip.md']);
  });

  it('sin exclude_docs no hay patrones', () => {
    expect(parseMkdocs('nav: []\n').excludePatterns).toEqual([]);
  });
});

describe('parseMkdocs: idiomas y ajustes', () => {
  const i18n = [
    'plugins:',
    '  - search',
    '  - i18n:',
    '      docs_structure: suffix',
    '      fallback_to_default: true',
    '      languages:',
    '        - locale: en',
    '          default: true',
    '        - locale: es',
    '          nav_translations:',
    '            Guide: Guía',
    '',
  ].join('\n');

  it('lee los idiomas con el por defecto y las traducciones del nav', () => {
    const parsed = parseMkdocs(i18n);
    expect(parsed.languages).toEqual([
      { locale: 'en', default: true, navTranslations: {} },
      { locale: 'es', default: false, navTranslations: { Guide: 'Guía' } },
    ]);
    expect(parsed.fallbackToDefault).toBe(true);
  });

  it('sin i18n no hay idiomas ni reserva', () => {
    const parsed = parseMkdocs('nav: []\n');
    expect(parsed.languages).toEqual([]);
    expect(parsed.fallbackToDefault).toBe(false);
  });

  it('`docs_dir` por defecto es docs', () => {
    expect(parseMkdocs('nav: []\n').docsDir).toBe('docs');
    expect(parseMkdocs('docs_dir: .\n').docsDir).toBe('.');
  });

  it('los comentarios de `exclude_docs` no son patrones', () => {
    const text = 'exclude_docs: |\n  # una nota\n  dist/\n';
    expect(parseMkdocs(text).excludePatterns).toEqual(['dist/']);
  });

  it('un `toc.slugify` propio (pymdownx) cambia el estilo de ids; el de Python no', () => {
    const custom = [
      'markdown_extensions:',
      '  - toc:',
      '      slugify: !!python/object/apply:pymdownx.slugs.slugify { kwds: { case: lower } }',
      '',
    ].join('\n');
    expect(parseMkdocs(custom).slugStyle).toBe('unicode');
    expect(parseMkdocs('markdown_extensions:\n  - toc:\n      permalink: true\n').slugStyle).toBe(
      'python-markdown',
    );
    const builtIn =
      'markdown_extensions:\n  - toc:\n      slugify: !!python/name:markdown.extensions.toc.slugify\n';
    expect(parseMkdocs(builtIn).slugStyle).toBe('python-markdown');
  });
});
