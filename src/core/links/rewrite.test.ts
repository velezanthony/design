import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import type { UrlPolicy } from '../i18n/availability';
import { rewriteLinks, type PageIndex } from './rewrite';

const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' };

const page = (
  slug: string,
  locale: string,
  sourcePath: string,
  kind: Page['kind'] = 'native',
): Page => ({ slug, locale, title: slug, kind, sourcePath, body: '' });

const pages = [
  page('install', 'en', 'install.md'),
  page('install', 'es', 'install.es.md'),
  page('guide', 'en', 'guide.md'),
  page('index', 'es', 'index.es.md'),
  page('changelog', 'en', '../CHANGELOG.md', 'external'),
  page('changelog', 'es', '../CHANGELOG.es.md', 'external'),
  page('nested', 'es', 'guide/nested.es.md'),
  page('readme', 'en', '../README.md', 'external'),
];
const index: PageIndex = { pages, url };
const from = (sourcePath: string) => pages.find((p) => p.sourcePath === sourcePath)!;

describe('rewriteLinks', () => {
  it('reescribe un enlace a un hermano publicado por la URL de su página', () => {
    const result = rewriteLinks('Ver [cambios](./CHANGELOG.md).', from('../README.md'), index);
    expect(result.body).toBe('Ver [cambios](/repo/changelog/).');
    expect(result.errors).toEqual([]);
  });

  it('conserva el ancla y resuelve primero la gemela del mismo idioma', () => {
    const result = rewriteLinks('[r](./install.md#requisitos)', from('install.es.md'), index);
    expect(result.body).toBe('[r](/repo/es/install/#requisitos)');
    expect(result.refs).toEqual([
      { file: 'install.es.md', line: 1, slug: 'install', locale: 'es', anchor: 'requisitos' },
    ]);
  });

  it('si no hay gemela en el idioma, enlaza a la página que existe', () => {
    const result = rewriteLinks('[g](./guide.md)', from('index.es.md'), index);
    expect(result.body).toBe('[g](/repo/guide/)');
  });

  it('conserva el título del enlace', () => {
    const result = rewriteLinks('[i](./install.md "Instalar")', from('guide.md'), index);
    expect(result.body).toBe('[i](/repo/install/ "Instalar")');
  });

  it('un enlace a un archivo que no es página publicada es un error con archivo, línea y destino', () => {
    const body = 'uno\n\n[x](./missing.md)';
    const result = rewriteLinks(body, from('guide.md'), index);
    expect(result.body).toBe(body);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBe('guide.md');
    expect(result.errors[0].line).toBe(3);
    expect(result.errors[0].message).toContain('./missing.md');
  });

  it('agrega todos los enlaces rotos, no solo el primero', () => {
    const result = rewriteLinks('[a](./a.md)\n[b](./b.md)', from('guide.md'), index);
    expect(result.errors.map((e) => e.line)).toEqual([1, 2]);
  });

  it('ignora un enlace roto dentro de un bloque de código', () => {
    const body = ['```md', '[x](./missing.md)', '```'].join('\n');
    const result = rewriteLinks(body, from('guide.md'), index);
    expect(result.body).toBe(body);
    expect(result.errors).toEqual([]);
    expect(result.refs).toEqual([]);
  });

  it('ignora un enlace dentro de código en línea', () => {
    const body = 'usa `[x](./missing.md)` así';
    const result = rewriteLinks(body, from('guide.md'), index);
    expect(result.body).toBe(body);
    expect(result.errors).toEqual([]);
  });

  it('no toca URLs externas, absolutas del sitio ni mailto', () => {
    const body = '[a](https://x.dev/a.md) [b](/otra/b.md) [c](mailto:a@b.c) [d](//cdn.x/y.md)';
    const result = rewriteLinks(body, from('guide.md'), index);
    expect(result.body).toBe(body);
    expect(result.errors).toEqual([]);
  });

  it('un ancla de la misma página apunta a la propia página y no se reescribe', () => {
    const result = rewriteLinks('[arriba](#top)', from('install.es.md'), index);
    expect(result.body).toBe('[arriba](#top)');
    expect(result.refs).toEqual([
      { file: 'install.es.md', line: 1, slug: 'install', locale: 'es', anchor: 'top' },
    ]);
  });

  it('las imágenes no se tocan (las resuelve Astro)', () => {
    const body = '![logo](./missing.png)';
    const result = rewriteLinks(body, from('guide.md'), index);
    expect(result.body).toBe(body);
    expect(result.errors).toEqual([]);
  });

  it('reescribe también las definiciones de referencia', () => {
    const result = rewriteLinks('[i]: ./install.md#uso', from('guide.md'), index);
    expect(result.body).toBe('[i]: /repo/install/#uso');
  });

  it('un recurso que no es página solo vale si está publicado', () => {
    const withAssets: PageIndex = { ...index, assets: new Set(['docs/manual.pdf']) };
    const src = { ...page('doc', 'en', 'doc.md'), sourcePath: 'doc.md' };
    const ok = rewriteLinks('[m](./docs/manual.pdf)', src, withAssets);
    expect(ok.errors).toEqual([]);
    expect(ok.body).toBe('[m](./docs/manual.pdf)');
    const bad = rewriteLinks('[m](./docs/otro.pdf)', src, withAssets);
    expect(bad.errors).toHaveLength(1);
  });

  it('respeta trailingSlash never', () => {
    const never: PageIndex = { pages, url: { ...url, trailingSlash: 'never' } };
    const result = rewriteLinks('[i](./install.md)', from('guide.md'), never);
    expect(result.body).toBe('[i](/repo/install)');
  });

  describe('de una página nativa a un archivo external', () => {
    it('resuelve la ruta real del external a su URL en el idioma de la página que enlaza', () => {
      const es = rewriteLinks(
        '[c](../../../../CHANGELOG.md#cambios)',
        from('install.es.md'),
        index,
      );
      expect(es.errors).toEqual([]);
      expect(es.body).toBe('[c](/repo/es/changelog/#cambios)');
      expect(es.refs).toEqual([
        { file: 'install.es.md', line: 1, slug: 'changelog', locale: 'es', anchor: 'cambios' },
      ]);
      const en = rewriteLinks('[c](../../../../CHANGELOG.md)', from('install.md'), index);
      expect(en.body).toBe('[c](/repo/changelog/)');
    });

    it('funciona desde una carpeta anidada', () => {
      const result = rewriteLinks(
        '[c](../../../../../CHANGELOG.md)',
        from('guide/nested.es.md'),
        index,
      );
      expect(result.errors).toEqual([]);
      expect(result.body).toBe('[c](/repo/es/changelog/)');
    });

    it('sin gemela en el idioma, enlaza al external que sí existe', () => {
      const result = rewriteLinks('[r](../../../../README.md)', from('install.es.md'), index);
      expect(result.errors).toEqual([]);
      expect(result.body).toBe('[r](/repo/readme/)');
    });

    it('respeta trailingSlash never', () => {
      const never: PageIndex = { pages, url: { ...url, trailingSlash: 'never' } };
      const result = rewriteLinks('[c](../../../../CHANGELOG.md)', from('install.es.md'), never);
      expect(result.body).toBe('[c](/repo/es/changelog)');
    });

    it('un archivo que no es página ni recurso sigue siendo un error', () => {
      const result = rewriteLinks('[x](../../../../NOPE.md)', from('install.es.md'), index);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('../../../../NOPE.md');
    });

    it('un enlace https, incluso al propio sitio, ni se reescribe ni se valida', () => {
      const body = '[a](https://example.dev/repo/changelog/) [b](https://example.dev/nada.md)';
      const result = rewriteLinks(body, from('install.es.md'), index);
      expect(result.body).toBe(body);
      expect(result.errors).toEqual([]);
      expect(result.refs).toEqual([]);
    });
  });
});
