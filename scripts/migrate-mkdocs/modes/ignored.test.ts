import { describe, expect, it } from 'vitest';
import { ignoredByMigrator } from './ignored.ts';
import { parseMkdocs } from './mkdocs.ts';

function warnings(yaml: string) {
  return ignoredByMigrator(parseMkdocs(yaml)).join('\n');
}

describe('ignoredByMigrator', () => {
  it('un mkdocs.yml mínimo no da avisos', () => {
    expect(ignoredByMigrator(parseMkdocs('nav:\n  - A: a.md\n'))).toEqual([]);
  });

  it('avisa del tema de Material y de los CSS y scripts propios', () => {
    const text = warnings(
      'theme:\n  name: material\n  palette: []\nextra_css: [a.css]\nextra_javascript: [a.js]\nhooks: [h.py]\n',
    );
    expect(text).toContain('theme');
    expect(text).toContain('extra_css');
    expect(text).toContain('extra_javascript');
    expect(text).toContain('hooks');
  });

  it('nombra cada dato del sitio que no se copia y a dónde va', () => {
    const text = warnings('site_name: X\nsite_url: https://x.dev/\nrepo_url: https://g.com/o/r\n');
    expect(text).toContain('site_name');
    expect(text).toContain('site_url');
    expect(text).toContain('repo_url');
  });

  it('un docs_dir distinto de docs lo dice', () => {
    expect(warnings('docs_dir: content\n')).toContain('docs_dir');
    expect(warnings('docs_dir: docs\n')).not.toContain('docs_dir');
  });

  it('los plugins que traduce o sustituye no avisan; los demás, sí', () => {
    const quiet = warnings('plugins:\n  - search\n  - i18n:\n      languages: []\n');
    expect(quiet).not.toContain('plugin');
    const text = warnings(
      'plugins:\n  - search\n  - macros\n  - redirects:\n      redirect_maps: {}\n',
    );
    expect(text).toContain('plugin «macros»');
    expect(text).toContain('plugin «redirects»');
    expect(text).not.toContain('«search»');
  });

  it('mkdocstrings remite a --api', () => {
    expect(warnings('plugins:\n  - mkdocstrings\n')).toContain('--api');
  });

  it('i18n con una estructura que no es de sufijos avisa', () => {
    const text = warnings('plugins:\n  - i18n:\n      docs_structure: folder\n');
    expect(text).toContain('docs_structure');
  });

  it('las extensiones de Markdown que no convierte avisan; las que sí, no', () => {
    const text = warnings(
      'markdown_extensions:\n  - admonition\n  - toc:\n      permalink: true\n  - footnotes\n  - pymdownx.tasklist\n',
    );
    expect(text).toContain('footnotes');
    expect(text).toContain('pymdownx.tasklist');
    expect(text).not.toContain('«admonition»');
    expect(text).not.toContain('«toc»');
  });

  it('avisa de los ajustes de validación y de lo que queda fuera del nav', () => {
    const text = warnings('validation: {anchors: warn}\nnot_in_nav: |\n  x.md\nstrict: true\n');
    expect(text).toContain('validation');
    expect(text).toContain('not_in_nav');
  });

  it('un exclude_docs con `!` avisa: la semántica de la negación no es la misma', () => {
    expect(warnings('exclude_docs: |\n  src/\n  !src/keep.md\n')).toContain('!');
  });
});
