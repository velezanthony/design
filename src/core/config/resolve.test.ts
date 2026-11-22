import { describe, expect, it } from 'vitest';
import { DocsErrors } from '../errors';
import { MissingTranslation } from '../i18n/translation-policy';
import { resolveConfig, type ResolvedConfig } from './resolve';
import type { DocsUserConfig } from './schema';
import { withConfig } from '../../testing/config';

/** Mensajes de error de una config inválida. */
function messages(input: unknown): string[] {
  try {
    resolveConfig(input as never);
  } catch (error) {
    if (error instanceof DocsErrors) return error.errors.map((problem) => problem.describe());
    throw error;
  }
  return [];
}

describe('resolveConfig: content', () => {
  it('por defecto la carpeta de contenido es `src/content/docs`', () => {
    expect(resolveConfig({ site: { name: 'X' } }).content.dir).toBe('src/content/docs');
  });

  it('se normaliza lo declarado: `../docs/` -> `../docs`', () => {
    expect(resolveConfig({ site: { name: 'X' }, content: { dir: '../docs/' } }).content.dir).toBe(
      '../docs',
    );
    expect(resolveConfig({ site: { name: 'X' }, content: { dir: './docs//' } }).content.dir).toBe(
      'docs',
    );
  });

  it.each(['https://x.dev/docs', '/abs/docs', '', '.'])(
    '«%s» falla nombrando `content`',
    (value) => {
      expect(messages({ site: { name: 'X' }, content: { dir: value } }).join('\n')).toContain(
        'content',
      );
    },
  );
});

describe('resolveConfig: valores por defecto', () => {
  it('config mínima: solo nombre', () => {
    const config = resolveConfig({ site: { name: 'Design' } });
    expect(config.site.name).toBe('Design');
    expect(config.i18n.locales).toEqual(['en']);
    expect(config.i18n.defaultLocale).toBe('en');
    expect(config.i18n.missing).toBe(MissingTranslation.LINK);
    expect(config.i18n.missingDeclared).toBe(false);
    expect(config.content.external).toEqual([]);
    expect(config.site.seo.titleSuffix).toBe('Design');
    expect(config.site.seo.sitemap).toEqual({ include: [] });
  });

  it('`exclude` vale una lista vacía por defecto y se conserva si se declara', () => {
    expect(resolveConfig({ site: { name: 'X' } }).content.exclude).toEqual([]);
    expect(
      resolveConfig({ site: { name: 'X' }, content: { exclude: ['drafts/'] } }).content.exclude,
    ).toEqual(['drafts/']);
  });

  it('conserva los sitemaps que se incluyen en el índice', () => {
    const config = resolveConfig({
      site: { name: 'X', seo: { sitemap: { include: ['/lib/sitemap.xml'] } } },
    });
    expect(config.site.seo.sitemap.include).toEqual(['/lib/sitemap.xml']);
  });

  it('el idioma por defecto es el primero de `locales`', () => {
    expect(
      resolveConfig({ site: { name: 'X' }, i18n: { locales: ['es', 'en'] } }).i18n.defaultLocale,
    ).toBe('es');
  });

  it('respeta lo declarado', () => {
    const config = resolveConfig({
      site: {
        name: 'X',
        seo: { titleSuffix: 'X', description: { en: 'Docs', es: 'Documentación' } },
      },
      i18n: { locales: ['en', 'es'], defaultLocale: 'es', missing: 'omit' },
    });
    expect(config.i18n.defaultLocale).toBe('es');
    expect(config.i18n.missing).toBe('omit');
    expect(config.i18n.missingDeclared).toBe(true);
    expect(config.site.seo.titleSuffix).toBe('X');
    expect(config.site.seo.description).toEqual({ en: 'Docs', es: 'Documentación' });
  });

  it('no muta la entrada', () => {
    const input = { site: { name: 'X' }, i18n: { locales: ['en', 'es'] } };
    const before = structuredClone(input);
    resolveConfig(input);
    expect(input).toEqual(before);
  });
});

describe('resolveConfig: validación', () => {
  it('el idioma por defecto debe estar en los idiomas: nombra `defaultLocale`', () => {
    const [message] = messages({
      site: { name: 'X' },
      i18n: { locales: ['en'], defaultLocale: 'es' },
    });
    expect(message).toContain('defaultLocale');
  });

  it('un idioma sin textos de UI en el paquete falla nombrando `locales[i]`', () => {
    expect(messages({ site: { name: 'X' }, i18n: { locales: ['en', 'fr'] } })[0]).toContain(
      'locales[1]',
    );
  });

  it('valor cerrado inválido: ruta `translations.missing` y valores permitidos', () => {
    const [message] = messages({ site: { name: 'X' }, i18n: { missing: 'hide' } });
    expect(message).toContain('i18n.missing');
    for (const allowed of ['link', 'omit', 'fallback']) expect(message).toContain(allowed);
  });

  it('el nombre es obligatorio', () => {
    expect(messages({})[0]).toContain('site');
    expect(messages({ site: {} })[0]).toContain('site.name');
  });

  it('una opción desconocida se rechaza nombrándola (p. ej. el `description` antiguo)', () => {
    expect(messages({ site: { name: 'X', description: 'viejo' } })[0]).toContain(
      'site.description: opción desconocida',
    );
  });

  it('agrega todos los errores', () => {
    expect(
      messages({ site: { description: 'x' }, i18n: { missing: 'hide' } }).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('`gtmId` ya no exige `privacyUrl`: la integración la completa o falla según el entorno', () => {
    expect(messages({ site: { name: 'X', analytics: { gtmId: 'GTM-1' } } })).toEqual([]);
  });

  it('`privacyUrl` acepta una cadena o una etiqueta por idioma', () => {
    expect(
      messages({ site: { name: 'X', analytics: { privacyUrl: 'https://x.dev/privacy' } } }),
    ).toEqual([]);
    expect(
      messages({
        site: { name: 'X', analytics: { privacyUrl: { en: '/privacy/', es: '/privacidad/' } } },
        i18n: { locales: ['en', 'es'] },
      }),
    ).toEqual([]);
  });

  it('`privacyUrl` por idioma valida cada URL y los idiomas', () => {
    expect(
      messages({ site: { name: 'X', analytics: { privacyUrl: { en: 'privacy' } } } })[0],
    ).toContain('privacyUrl.en');
    expect(
      messages({
        site: { name: 'X', analytics: { privacyUrl: { es: '/privacidad/' } } },
        i18n: { locales: ['en'] },
      })[0],
    ).toContain('privacyUrl.es');
  });

  it('`external[].file` no puede ser una URL remota', () => {
    const [message] = messages({
      site: { name: 'X' },
      content: { external: [{ slug: 'a', file: 'https://x.dev/a.md' }] },
    });
    expect(message).toContain('external[0].file');
  });

  it('`external[].locales` solo admite idiomas del sitio', () => {
    const [message] = messages({
      site: { name: 'X' },
      i18n: { locales: ['en'] },
      content: { external: [{ slug: 'a', file: 'a.md', locales: ['es'] }] },
    });
    expect(message).toContain('external[0].locales[0]');
  });

  it('`external[].translations` inválido nombra `external[i].translations`', () => {
    expect(
      messages({
        site: { name: 'X' },
        content: { external: [{ slug: 'a', file: 'a.md', translations: 'x' }] },
      })[0],
    ).toContain('external[0].translations');
  });
});

describe('resolveConfig: `ui`', () => {
  it('acepta overrides de claves conocidas en idiomas del sitio', () => {
    const config = resolveConfig({
      site: { name: 'X' },
      i18n: { locales: ['en', 'es'], ui: { es: { 'search.placeholder': 'Buscar en Design' } } },
    });
    expect(config.i18n.ui).toEqual({ es: { 'search.placeholder': 'Buscar en Design' } });
  });

  it('clave desconocida: ruta completa `ui.es.<clave>`', () => {
    const [message] = messages({
      site: { name: 'X' },
      i18n: { locales: ['en', 'es'], ui: { es: { 'search.placeholdr': 'x' } } },
    });
    expect(message).toContain('ui.es.search.placeholdr');
  });

  it('idioma fuera de `locales`: ruta `ui.fr`', () => {
    const [message] = messages({
      site: { name: 'X' },
      i18n: { locales: ['en', 'es'], ui: { fr: { 'search.placeholder': 'x' } } },
    });
    expect(message).toContain('ui.fr');
  });
});

describe('resolveConfig: privacidad', () => {
  it('las claves `privacy.page` y `privacy.controller` ya no existen: son opciones desconocidas', () => {
    expect(messages({ site: { name: 'X' }, privacy: { page: true } })[0]).toContain(
      'privacy: opción desconocida',
    );
  });

  it('privacyUrl acepta una URL o una por idioma, y rechaza un idioma que no está en `locales`', () => {
    expect(
      resolveConfig({ site: { name: 'X', analytics: { privacyUrl: '/privacy/' } } }).site.analytics
        .privacyUrl,
    ).toBe('/privacy/');
    expect(
      messages({ site: { name: 'X', analytics: { privacyUrl: { es: '/privacidad/' } } } })[0],
    ).toContain('privacyUrl.es');
  });
});

describe('resolveConfig: folders', () => {
  it('sin `folders`, un mapa vacío: ninguna carpeta tiene índice generado', () => {
    expect(resolveConfig({ site: { name: 'X' } }).content.folders).toEqual({ declared: {} });
  });

  it.each([
    [{ '*': { listing: { view: 'grid' } } }, "folders['*'].listing.view"],
    [{ a: { listing: { pageSize: 0 } } }, 'folders.a.listing.pageSize'],
    [{ a: { listing: { pageSize: 2.5 } } }, 'folders.a.listing.pageSize'],
    [{ a: { listing: { covers: 'yes' } } }, 'folders.a.listing.covers'],
    [{ a: { listing: { generate: 'yes' } } }, 'folders.a.listing.generate'],
    [{ a: { listing: { layout: 'list' } } }, 'folders.a.listing.layout'],
    [{ a: { listing: { perPageOptions: [] } } }, 'folders.a.listing.perPageOptions'],
    [{ a: { listing: { perPageOptions: [9, 0] } } }, 'folders.a.listing.perPageOptions[1]'],
    [{ 'a/b': { tree: { show: 'tree' } } }, "folders['a/b'].tree.show"],
  ])('%j falla nombrando %s', (folders, path) => {
    expect(messages({ site: { name: 'X' }, content: { folders } }).join('\n')).toContain(path);
  });
});

/* La config resuelta tiene la misma forma que la pública (`site`, `i18n`, `content`), con los valores
   por defecto puestos. Una fila por fila de la tabla antigua → nueva de la arquitectura. */
describe('resolveConfig: misma forma que la config pública', () => {
  const base = { site: { name: 'Sitio' } };
  it.each([
    ['site.name', base, (config: ResolvedConfig) => config.site.name, 'Sitio'],
    [
      'site.favicon',
      { site: { name: 'S', favicon: 'f.svg' } },
      (config: ResolvedConfig) => config.site.favicon,
      'f.svg',
    ],
    [
      'site.theme',
      { site: { name: 'S', theme: 'a.css' } },
      (config: ResolvedConfig) => config.site.theme,
      'a.css',
    ],
    [
      'site.social',
      { site: { name: 'S', social: { github: 'g' } } },
      (config: ResolvedConfig) => config.site.social,
      { github: 'g' },
    ],
    [
      'site.components',
      { site: { name: 'S', components: { Footer: './F.astro' } } },
      (config: ResolvedConfig) => config.site.components,
      { Footer: './F.astro' },
    ],
    [
      'site.footer',
      { site: { name: 'S', footer: { author: false } } },
      (config: ResolvedConfig) => config.site.footer,
      { author: false },
    ],
    [
      'site.layout',
      { site: { name: 'S', layout: { width: 'full' } } },
      (config: ResolvedConfig) => config.site.layout.width,
      'full',
    ],
    [
      'site.seo.titleSuffix',
      { site: { name: 'S', seo: { titleSuffix: false } } },
      (config: ResolvedConfig) => config.site.seo.titleSuffix,
      false,
    ],
    [
      'site.seo.description',
      { site: { name: 'S', seo: { description: 'D' } } },
      (config: ResolvedConfig) => config.site.seo.description,
      'D',
    ],
    [
      'site.seo.ogLocales',
      { site: { name: 'S', seo: { ogLocales: { en: 'en_GB' } } } },
      (config: ResolvedConfig) => config.site.seo.ogLocales,
      { en: 'en_GB' },
    ],
    [
      'site.seo.sitemap',
      { site: { name: 'S', seo: { sitemap: { include: ['/x.xml'] } } } },
      (config: ResolvedConfig) => config.site.seo.sitemap,
      { include: ['/x.xml'] },
    ],
    [
      'site.analytics.gtmId',
      { site: { name: 'S', analytics: { gtmId: 'GTM-1', privacyUrl: '/p' } } },
      (config: ResolvedConfig) => config.site.analytics.gtmId,
      'GTM-1',
    ],
    [
      'site.analytics.privacyUrl',
      { site: { name: 'S', analytics: { privacyUrl: '/p' } } },
      (config: ResolvedConfig) => config.site.analytics.privacyUrl,
      '/p',
    ],
    [
      'i18n.locales',
      withConfig(base, { i18n: { locales: ['es', 'en'] } }),
      (config: ResolvedConfig) => config.i18n.locales,
      ['es', 'en'],
    ],
    [
      'i18n.defaultLocale',
      withConfig(base, { i18n: { locales: ['es', 'en'], defaultLocale: 'en' } }),
      (config: ResolvedConfig) => config.i18n.defaultLocale,
      'en',
    ],
    [
      'i18n.missing',
      withConfig(base, { i18n: { missing: 'omit' } }),
      (config: ResolvedConfig) => [config.i18n.missing, config.i18n.missingDeclared],
      ['omit', true],
    ],
    [
      'i18n.ui',
      withConfig(base, { i18n: { ui: { en: { 'search.placeholder': 'Go' } } } }),
      (config: ResolvedConfig) => config.i18n.ui,
      { en: { 'search.placeholder': 'Go' } },
    ],
    [
      'content.dir',
      withConfig(base, { content: { dir: './docs/' } }),
      (config: ResolvedConfig) => config.content.dir,
      'docs',
    ],
    [
      'content.exclude',
      withConfig(base, { content: { exclude: ['x/'] } }),
      (config: ResolvedConfig) => config.content.exclude,
      ['x/'],
    ],
    [
      'content.external',
      withConfig(base, { content: { external: [{ slug: 'a', file: 'a.md' }] } }),
      (config: ResolvedConfig) => config.content.external,
      [{ slug: 'a', file: 'a.md' }],
    ],
    [
      'content.static',
      withConfig(base, { content: { static: [{ from: 'c', to: 'cov' }] } }),
      (config: ResolvedConfig) => config.content.static,
      [{ from: 'c', to: 'cov' }],
    ],
    [
      'content.editUrl',
      withConfig(base, { content: { editUrl: 'https://e' } }),
      (config: ResolvedConfig) => config.content.editUrl,
      'https://e',
    ],
    [
      'content.repoRoot',
      withConfig(base, { content: { repoRoot: '..' } }),
      (config: ResolvedConfig) => config.content.repoRoot,
      '..',
    ],
    [
      'content.nav',
      withConfig(base, { content: { nav: [{ label: 'G', dir: 'g' }] } }),
      (config: ResolvedConfig) => config.content.nav,
      [{ label: 'G', dir: 'g' }],
    ],
    [
      'content.sidebar',
      withConfig(base, { content: { sidebar: ['a'] } }),
      (config: ResolvedConfig) => config.content.sidebar,
      ['a'],
    ],
    [
      'content.folders',
      withConfig(base, { content: { folders: { '*': { tree: { depth: 2 } } } } }),
      (config: ResolvedConfig) => config.content.folders,
      { declared: { '*': { tree: { depth: 2 } } } },
    ],
  ])('%s', (_row, input, read, expected) => {
    expect(read(resolveConfig(input as DocsUserConfig))).toEqual(expected);
  });

  it('sin `i18n` ni `content`, los valores por defecto de siempre', () => {
    const config = resolveConfig(base);
    expect(config).toEqual({
      site: {
        name: 'Sitio',
        layout: { sidebar: 'open', toc: 'open', width: 'reading', toggles: true, tocDepth: 3 },
        seo: { titleSuffix: 'Sitio', sitemap: { include: [] } },
        analytics: {},
      },
      i18n: {
        locales: ['en'],
        defaultLocale: 'en',
        missing: 'link',
        missingDeclared: false,
        ui: {},
      },
      content: {
        dir: 'src/content/docs',
        exclude: [],
        external: [],
        folders: { declared: {} },
      },
    });
  });
});
