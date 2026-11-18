import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { satteri } from '@astrojs/markdown-satteri';
import type { AstroIntegrationLogger } from 'astro';
import { AstroError } from 'astro/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHIKI_LANG_ALIAS } from '../markdown/code-languages';
import { clientRegistry } from '../data/client-registry';
import { docs, INTEGRATION_NAME } from './index';
import { MissingTranslation } from '../../core/i18n/translation-policy';

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as AstroIntegrationLogger;

/** Contexto falso de `astro:config:setup` (la integración principal de Starlight se prueba igual). */
function setupContext(
  processor: { name: string },
  shikiConfig: object = {},
  overrides: Record<string, unknown> = {},
) {
  const updateConfig = vi.fn((partial: unknown) => partial);
  const injectTypes = vi.fn();
  const injectRoute = vi.fn();
  const integrations: { name: string }[] = [{ name: INTEGRATION_NAME }];
  return {
    updateConfig,
    injectTypes,
    injectRoute,
    integrations,
    context: {
      config: {
        base: '/repo',
        site: 'https://x.dev',
        trailingSlash: 'always',
        build: { format: 'directory' },
        root: new URL('file:///site/'),
        srcDir: new URL('file:///site/src/'),
        publicDir: new URL('file:///site/public/'),
        markdown: { processor, shikiConfig },
        integrations,
        ...overrides,
      },
      command: 'build',
      updateConfig,
      injectTypes,
      injectRoute,
      logger,
    } as never,
  };
}

async function runSetup(
  processor: { name: string },
  shikiConfig: object = {},
  userConfig: Parameters<typeof docs>[0] = { name: 'x' },
  overrides: Record<string, unknown> = {},
) {
  const integration = docs(userConfig);
  const setup = setupContext(processor, shikiConfig, overrides);
  await integration.hooks['astro:config:setup']?.(setup.context);
  return { integration, ...setup };
}

/** Datos que la integración registra en el módulo virtual (los lee del plugin de Vite). */
async function virtualData(userConfig: Parameters<typeof docs>[0], overrides = {}) {
  const { updateConfig } = await runSetup(satteri(), {}, userConfig, overrides);
  const partial = updateConfig.mock.calls
    .map(([p]) => p as { vite?: { plugins?: { load: { handler: () => string } }[] } })
    .find((p) => p.vite);
  const source = partial?.vite?.plugins?.[0].load.handler() ?? '';
  return JSON.parse(source.replace(/^export default /, '').replace(/;$/, ''));
}

describe('docs(): identidad y config', () => {
  it('se identifica con INTEGRATION_NAME y expone su config resuelta', () => {
    const integration = docs({ name: 'x', external: [{ slug: 'changelog', file: '../C.md' }] });
    expect(integration.name).toBe(INTEGRATION_NAME);
    expect(integration.resolvedConfig.external).toEqual([{ slug: 'changelog', file: '../C.md' }]);
  });

  it('cada llamada devuelve su propia config', () => {
    expect(docs({ name: 'a' }).resolvedConfig.name).toBe('a');
    expect(docs({ name: 'b' }).resolvedConfig.name).toBe('b');
  });
});

describe('astro:config:setup: processor de Markdown', () => {
  it('extiende EN SITIO el processor Sätteri: activa directivas y empuja los plugins al final', async () => {
    const processor = satteri({ mdastPlugins: [{ name: 'del-consumidor', text() {} }] });
    const options = processor.options;
    await runSetup(processor);
    expect(options.features.directive).toBe(true);
    const names = options.mdastPlugins.map((p) => (p as { name: string }).name);
    expect(names[0]).toBe('del-consumidor');
    expect(names.at(-1)).toBe('restore-directives');
  });

  it('sirve un processor Sätteri sin plugins previos', async () => {
    const processor = satteri();
    await runSetup(processor);
    expect(processor.options.features.directive).toBe(true);
    // Plugins de admoniciones, pestañas, tablas… y restoreDirectives al final.
    expect(processor.options.mdastPlugins.length).toBeGreaterThan(1);
    expect(processor.options.mdastPlugins.at(-1)).toMatchObject({ name: 'restore-directives' });
  });

  it('un processor que no es Sätteri falla con un AstroError accionable', async () => {
    const error = await runSetup({ name: 'remark' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AstroError);
    expect(error).toMatchObject({
      message: expect.stringContaining('Sätteri'),
      hint: expect.stringContaining('markdown.processor'),
    });
  });
});

describe('astro:config:setup: fuentes y módulo virtual', () => {
  it('añade IBM Plex Sans y Mono con updateConfig({ fonts })', async () => {
    const { updateConfig } = await runSetup(satteri());
    const partial = updateConfig.mock.calls
      .map(([p]) => p as { fonts?: { name: string }[] })
      .find((p) => p.fonts);
    expect(partial?.fonts?.map((f) => f.name)).toEqual(['IBM Plex Sans', 'IBM Plex Mono']);
  });

  it('registra un plugin de Vite con el módulo virtual', async () => {
    const { updateConfig } = await runSetup(satteri());
    const partial = updateConfig.mock.calls
      .map(([p]) => p as { vite?: { plugins?: { name: string }[] } })
      .find((p) => p.vite);
    expect(partial?.vite?.plugins?.map((p) => p.name)).toContain(
      'velezanthony-design-virtual-config',
    );
  });
});

describe('astro:config:setup: Shiki', () => {
  const shikiOf = async (processorShiki: object) => {
    const { updateConfig } = await runSetup(satteri(), processorShiki);
    return updateConfig.mock.calls
      .map(([p]) => p as { markdown?: { shikiConfig?: Record<string, unknown> } })
      .find((p) => p.markdown?.shikiConfig)?.markdown?.shikiConfig;
  };

  it('añade los alias de lenguajes de la librería', async () => {
    expect((await shikiOf({}))?.langAlias).toEqual(SHIKI_LANG_ALIAS);
  });

  it('fusiona con los alias del consumidor, y el suyo manda', async () => {
    const merged = (await shikiOf({ langAlias: { foo: 'js', django: 'html' } }))?.langAlias;
    expect(merged).toEqual({ ...SHIKI_LANG_ALIAS, django: 'html', foo: 'js' });
  });

  it('fija los temas claro/oscuro emparejados si el consumidor no puso los suyos', async () => {
    expect((await shikiOf({ themes: {} }))?.themes).toEqual({
      light: 'github-light-default',
      dark: 'github-dark-default',
    });
  });

  it('no pisa los temas del consumidor (no los incluye en su updateConfig)', async () => {
    const mine = { light: 'min-light', dark: 'min-dark' };
    expect(await shikiOf({ themes: mine })).not.toHaveProperty('themes');
  });
});

describe('astro:config:setup: validación', () => {
  it('sin `site` en la config de Astro falla con un AstroError que lo nombra', async () => {
    const error = await runSetup(satteri(), {}, { name: 'x' }, { site: undefined }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AstroError);
    expect(error).toMatchObject({
      message: expect.stringContaining('site'),
      hint: expect.stringContaining('astro.config'),
    });
  });

  /** El título del `AstroError` es genérico; el detalle (campo + motivo) va en la pista. */
  const hintOf = (build: () => unknown) => {
    try {
      build();
    } catch (error) {
      expect(error).toBeInstanceOf(AstroError);
      return (error as AstroError).hint ?? '';
    }
    throw new Error('no ha fallado');
  };

  it('una opción de `ui` mal escrita falla nombrando su ruta legible', () => {
    const hint = hintOf(() =>
      docs({ name: 'x', locales: ['en', 'es'], ui: { es: { 'search.placeholdr': 'x' } } } as never),
    );
    expect(hint).toContain('ui.es.search.placeholdr');
  });

  it('un valor cerrado inválido nombra el campo y lista los valores', () => {
    const hint = hintOf(() => docs({ name: 'x', translations: { missing: 'hide' } } as never));
    expect(hint).toContain('translations.missing');
    for (const value of ['link', 'omit', 'fallback']) expect(hint).toContain(value);
  });
});

describe('astro:config:setup: módulo virtual', () => {
  it('serializa la config validada con base, site, trailingSlash y build.format', async () => {
    const data = await virtualData({ name: 'Docs', locales: ['en', 'es'] });
    expect(data).toMatchObject({
      name: 'Docs',
      locales: ['en', 'es'],
      defaultLocale: 'en',
      base: '/repo',
      site: 'https://x.dev',
      trailingSlash: 'always',
      buildFormat: 'directory',
      publicDir: 'file:///site/public/',
    });
    expect(data.translations).toEqual({ missing: MissingTranslation.LINK });
  });

  it('lleva el catálogo fusionado por idioma, con los textos del consumidor encima', async () => {
    const data = await virtualData({
      name: 'x',
      locales: ['en', 'es'],
      ui: { es: { 'search.placeholder': 'Buscar aquí' } },
    });
    expect(Object.keys(data.strings)).toEqual(['en', 'es']);
    expect(data.strings.es['search.placeholder']).toBe('Buscar aquí');
    expect(data.strings.en['search.placeholder']).not.toBe('Buscar aquí');
    expect(data.strings.es['theme.toggle']).toEqual(expect.any(String));
  });

  it('un monolingüe solo lleva su idioma y la política base elegida', async () => {
    const data = await virtualData({
      name: 'x',
      translations: { missing: MissingTranslation.FALLBACK },
    });
    expect(Object.keys(data.strings)).toEqual(['en']);
    expect(data.translations.missing).toBe('fallback');
  });

  it('inyecta los tipos del módulo virtual con injectTypes', async () => {
    const integration = docs({ name: 'x' });
    const injectTypes = vi.fn();
    await integration.hooks['astro:config:done']?.({ injectTypes } as never);
    expect(injectTypes).toHaveBeenCalledTimes(1);
    const { filename, content } = injectTypes.mock.calls[0][0] as {
      filename: string;
      content: string;
    };
    expect(filename).toMatch(/\.d\.ts$/);
    expect(content).toContain("declare module 'virtual:@velezanthony/design/config'");
    expect(content).toContain('buildFormat');
  });
});

describe('astro:config:setup: fusión de config', () => {
  it('una fuente del consumidor con el mismo cssVariable falla con un mensaje accionable', async () => {
    const error = await runSetup(
      satteri(),
      {},
      { name: 'x' },
      { fonts: [{ name: 'Mine', cssVariable: '--font-plex-sans' }] },
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AstroError);
    expect(error).toMatchObject({
      message: expect.stringContaining('--font-plex-sans'),
      hint: expect.any(String),
    });
  });

  it('una fuente del consumidor con otro cssVariable no es conflicto', async () => {
    await expect(
      runSetup(
        satteri(),
        {},
        { name: 'x' },
        { fonts: [{ name: 'Mine', cssVariable: '--font-m' }] },
      ),
    ).resolves.toBeDefined();
  });
});

describe('astro:config:setup: páginas del consumidor', () => {
  it('una `src/pages/index.astro` sustituye la portada: no falla, avisa con el fichero', async () => {
    const root = mkdtempSync(join(tmpdir(), 'design-setup-'));
    try {
      mkdirSync(join(root, 'src/pages'), { recursive: true });
      writeFileSync(join(root, 'src/pages/index.astro'), '');
      vi.mocked(logger.warn).mockClear();
      await runSetup(
        satteri(),
        {},
        { name: 'x' },
        { srcDir: pathToFileURL(join(root, 'src') + '/') },
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('src/pages/index.astro'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('astro:config:setup: el panel SEO on page y las páginas del consumidor', () => {
  /* El panel solo existe en dev, así que solo ahí puede sustituirlo una página del repo. Las
     sustituciones tienen sus tests; estos aseguran que la integración les pasa el modo. */
  async function setupWithPage(command: 'dev' | 'build') {
    const root = mkdtempSync(join(tmpdir(), 'design-seo-'));
    try {
      mkdirSync(join(root, 'src/pages/seo-on-page'), { recursive: true });
      writeFileSync(join(root, 'src/pages/seo-on-page/index.astro'), '');
      const setup = setupContext(satteri(), {}, { srcDir: pathToFileURL(join(root, 'src') + '/') });
      const run = async () =>
        docs({ name: 'x' }).hooks['astro:config:setup']?.({
          ...(setup.context as object),
          command,
          addWatchFile: vi.fn(),
        } as never);
      vi.mocked(logger.warn).mockClear();
      await run();
      return vi
        .mocked(logger.warn)
        .mock.calls.map(([message]) => String(message))
        .join('\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it('en dev, una página del repo en /seo-on-page/ sustituye al panel y lo avisa', async () => {
    expect(await setupWithPage('dev')).toContain('src/pages/seo-on-page/index.astro');
  });

  it('en build no hay panel, así que esa página no sustituye nada', async () => {
    expect(await setupWithPage('build')).not.toContain('seo-on-page');
  });
});

describe('astro:config:setup: rutas inyectadas', () => {
  const routesOf = async (userConfig: Parameters<typeof docs>[0]) => {
    const { injectRoute } = await runSetup(satteri(), {}, userConfig);
    return injectRoute.mock.calls.map(
      ([route]) => route as { pattern: string; entrypoint: string | URL; prerender?: boolean },
    );
  };
  const entry = (route: { entrypoint: string | URL }) => String(route.entrypoint);

  it('inyecta la página de docs, el sitemap y su hoja, el favicon y la 404', async () => {
    const routes = await routesOf({ name: 'x' });
    expect(routes.map((r) => r.pattern)).toEqual([
      '/[...slug]',
      '/sitemap.xml',
      '/_design/sitemap.css',
      '/_design/favicon.png',
      '/404',
    ]);
    expect(entry(routes[0])).toMatch(/pages\/doc\.astro$/);
    expect(entry(routes[1])).toMatch(/pages\/sitemap\.xml\.ts$/);
    expect(entry(routes[2])).toMatch(/pages\/sitemap\.css\.ts$/);
    expect(entry(routes[3])).toMatch(/pages\/favicon\.png\.ts$/);
    expect(entry(routes[4])).toMatch(/pages\/not-found\.astro$/);
  });

  it('con varios idiomas añade /[locale]/404 con el mismo contenedor', async () => {
    const routes = await routesOf({ name: 'x', locales: ['en', 'es'] });
    expect(routes.map((r) => r.pattern)).toEqual([
      '/[...slug]',
      '/sitemap.xml',
      '/_design/sitemap.css',
      '/_design/favicon.png',
      '/404',
      '/[locale]/404',
    ]);
    expect(entry(routes[5])).toBe(entry(routes[4]));
  });

  it('con sitemaps incluidos, inyecta también el sitemap de páginas', async () => {
    const routes = await routesOf({ name: 'x', sitemap: { include: ['/lib/sitemap.xml'] } });
    const pages = routes.find((r) => r.pattern === '/sitemap-pages.xml');
    expect(pages && entry(pages)).toMatch(/pages\/sitemap-pages\.xml\.ts$/);
    expect((await routesOf({ name: 'x' })).map((r) => r.pattern)).not.toContain(
      '/sitemap-pages.xml',
    );
  });

  it('todas las rutas se prerenderizan', async () => {
    const routes = await routesOf({ name: 'x', locales: ['en', 'es'] });
    expect(routes.every((r) => r.prerender === true)).toBe(true);
  });
});

describe('astro:config:setup: panel SEO on page (solo en desarrollo)', () => {
  /** Rutas inyectadas con el comando de Astro dado. */
  const routesFor = async (command: 'dev' | 'build') => {
    const integration = docs({ name: 'x', locales: ['en', 'es'] });
    const { context, injectRoute } = setupContext(satteri());
    await integration.hooks['astro:config:setup']?.({ ...(context as object), command } as never);
    return injectRoute.mock.calls.map(
      ([route]) => route as { pattern: string; entrypoint: string | URL; prerender?: boolean },
    );
  };

  it('con `astro build` no inyecta ninguna ruta del panel', async () => {
    const routes = await routesFor('build');
    expect(routes.filter((route) => route.pattern.includes('seo-on-page'))).toEqual([]);
    expect(routes.filter((route) => String(route.entrypoint).includes('seo-on-page'))).toEqual([]);
  });

  it('con `astro dev` inyecta resumen, tabla e inspector, sin prerenderizar (leen la query)', async () => {
    const routes = (await routesFor('dev')).filter((route) =>
      route.pattern.includes('seo-on-page'),
    );
    expect(routes.map((route) => route.pattern)).toEqual([
      '/seo-on-page',
      '/seo-on-page/pages',
      '/seo-on-page/page',
    ]);
    expect(routes.map((route) => String(route.entrypoint).split('/').at(-1))).toEqual([
      'overview.astro',
      'pages.astro',
      'page.astro',
    ]);
    expect(routes.every((route) => route.prerender === false)).toBe(true);
  });

  it('en dev el resto de rutas siguen siendo las mismas', async () => {
    const dev = (await routesFor('dev')).filter((route) => !route.pattern.includes('seo-on-page'));
    expect(dev.map((route) => route.pattern)).toEqual(
      (await routesFor('build')).map((route) => route.pattern),
    );
  });
});

describe('astro:config:setup: página de privacidad', () => {
  afterEach(() => vi.unstubAllEnvs());
  const routesOf = async (userConfig: Parameters<typeof docs>[0]) => {
    const { injectRoute } = await runSetup(satteri(), {}, userConfig);
    return injectRoute.mock.calls.map(([route]) => route as { pattern: string; entrypoint: URL });
  };
  const patterns = async (userConfig: Parameters<typeof docs>[0]) =>
    (await routesOf(userConfig)).map((r) => r.pattern);

  it('por defecto no se inyecta ninguna ruta de privacidad', async () => {
    expect(await patterns({ name: 'x', locales: ['es', 'en'] })).not.toContain('/[privacy]');
  });

  it('`page: false` tampoco', async () => {
    const all = await patterns({ name: 'x', locales: ['es', 'en'], privacy: { page: false } });
    expect(all.some((p) => p.includes('[privacy]'))).toBe(false);
  });

  it('`page: true` inyecta la página por defecto y la de cada otro idioma, prerenderizadas', async () => {
    const routes = await routesOf({ name: 'x', locales: ['es', 'en'], privacy: { page: true } });
    const privacy = routes.filter((r) => r.pattern.includes('[privacy]'));
    expect(privacy.map((r) => r.pattern)).toEqual(['/[privacy]', '/[locale]/[privacy]']);
    expect(privacy.map((r) => String(r.entrypoint).split('/').at(-1))).toEqual([
      'privacy.astro',
      'privacy-locale.astro',
    ]);
    expect(privacy.every((r) => (r as { prerender?: boolean }).prerender === true)).toBe(true);
  });

  it('monolingüe: solo la ruta del idioma por defecto', async () => {
    const all = await patterns({ name: 'x', privacy: { page: true } });
    expect(all).toContain('/[privacy]');
    expect(all).not.toContain('/[locale]/[privacy]');
  });

  it('el enlace de privacidad del módulo virtual apunta a la página local, con la base', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'GTM-ENV0001');
    const data = await virtualData({ name: 'x', locales: ['es', 'en'], privacy: { page: true } });
    expect(data.privacyUrl).toEqual({ es: '/repo/privacidad/', en: '/repo/en/privacy/' });
  });

  it('sin `page` el enlace sigue siendo el del portfolio', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'GTM-ENV0001');
    const data = await virtualData({ name: 'x', locales: ['es', 'en'] });
    expect(data.privacyUrl.es).toBe('https://velezanthony.github.io/privacidad/');
  });
});

describe('astro:config:setup: analítica desde el entorno', () => {
  afterEach(() => vi.unstubAllEnvs());
  const two = { name: 'x', locales: ['en', 'es'] };

  it('sin PUBLIC_GTM_ID no hay gtmId ni enlace de privacidad', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', '');
    const data = await virtualData(two);
    expect(data.gtmId).toBeUndefined();
    expect(data.privacyUrl).toBeUndefined();
  });

  it('con PUBLIC_GTM_ID activa la analítica y la privacidad del portfolio por idioma', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', ' GTM-ENV0001 ');
    const data = await virtualData(two);
    expect(data.gtmId).toBe('GTM-ENV0001');
    expect(data.privacyUrl).toEqual({
      en: 'https://velezanthony.github.io/en/privacy/',
      es: 'https://velezanthony.github.io/privacidad/',
    });
  });

  it('el gtmId de la config gana al entorno y su privacyUrl por idioma se respeta', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'GTM-ENV0001');
    const data = await virtualData({
      ...two,
      gtmId: 'GTM-CONF001',
      privacyUrl: { en: '/privacy/', es: '/privacidad/' },
    });
    expect(data.gtmId).toBe('GTM-CONF001');
    expect(data.privacyUrl).toEqual({ en: '/privacy/', es: '/privacidad/' });
  });

  it('un ID con formato inválido rompe la construcción con un AstroError', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'G-NOPE');
    const error = await virtualData(two).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AstroError);
    expect(String((error as AstroError).hint)).toContain('GTM-XXXXXXX');
  });

  it('con analítica y un idioma sin política posible falla', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'GTM-ENV0001');
    const error = await virtualData({
      ...two,
      privacyUrl: { es: '/privacidad/' },
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AstroError);
    expect(String((error as AstroError).hint)).toContain('en');
  });
});

describe('astro:config:setup: vigilar docs.config', () => {
  /* `astro.config.mjs` importa `docs.config.mjs`, pero Astro solo reinicia `dev` cuando cambia el
     propio astro.config: sin `addWatchFile`, editar la config del sitio no tendría efecto. */
  async function watched(files: string[]) {
    const dir = mkdtempSync(join(tmpdir(), 'design-watch-'));
    for (const file of files) writeFileSync(join(dir, file), 'export default {};\n');
    const addWatchFile = vi.fn();
    const setup = setupContext(satteri(), {}, { root: pathToFileURL(`${dir}/`) });
    await docs({ name: 'x' }).hooks['astro:config:setup']?.({
      ...(setup.context as object),
      addWatchFile,
    } as never);
    rmSync(dir, { recursive: true, force: true });
    return addWatchFile.mock.calls.map(([url]) => basename(fileURLToPath(url as URL)));
  }

  it('vigila docs.config.mjs si existe en la raíz', async () => {
    expect(await watched(['docs.config.mjs'])).toEqual(['docs.config.mjs']);
  });

  it('vigila también las variantes .js y .ts que existan', async () => {
    expect(await watched(['docs.config.js', 'docs.config.ts'])).toEqual([
      'docs.config.js',
      'docs.config.ts',
    ]);
  });

  it('sin archivo de config no vigila nada (config escrita en astro.config)', async () => {
    expect(await watched([])).toEqual([]);
  });
});

describe('astro:config:setup: contenido fuera del proyecto', () => {
  /* Vite solo sirve en dev lo que está bajo la raíz del workspace: sin `server.fs.allow`, las
     imágenes de `../docs` darían 403 en `astro dev`. La función que calcula las carpetas tiene sus
     tests; este comprueba que la integración de verdad la aplica. */
  function viteAllow(updateConfig: ReturnType<typeof vi.fn>) {
    return updateConfig.mock.calls
      .map(([partial]) => partial as { vite?: { server?: { fs?: { allow?: string[] } } } })
      .find((partial) => partial.vite)?.vite?.server?.fs?.allow;
  }

  it('con content fuera de la raíz, deja que Vite sirva esa carpeta', async () => {
    const { updateConfig } = await runSetup(satteri(), {}, { name: 'x', content: '../docs' });
    expect(viteAllow(updateConfig)).toContain('/docs');
  });

  it('con content dentro del proyecto, no toca server.fs.allow', async () => {
    const { updateConfig } = await runSetup(satteri(), {}, { name: 'x' });
    expect(viteAllow(updateConfig)).toBeUndefined();
  });
});

describe('astro:config:setup: rutas que el sitio sustituye', () => {
  const site = () => {
    const root = mkdtempSync(join(tmpdir(), 'design-site-'));
    for (const file of ['index.astro', '404.astro', 'sitemap.xml.ts']) {
      mkdirSync(join(root, 'src', 'pages'), { recursive: true });
      writeFileSync(join(root, 'src', 'pages', file), '');
    }
    return root;
  };

  it('no falla: avisa de cuáles sustituye y no inyecta las rutas exactas que ya son suyas', async () => {
    const root = site();
    try {
      vi.mocked(logger.warn).mockClear();
      const { injectRoute } = await runSetup(
        satteri(),
        {},
        { name: 'x' },
        {
          srcDir: pathToFileURL(`${root}/src/`),
        },
      );
      const patterns = injectRoute.mock.calls.map(
        ([route]) => (route as { pattern: string }).pattern,
      );
      expect(patterns).toContain('/[...slug]');
      expect(patterns).not.toContain('/sitemap.xml');
      expect(patterns).not.toContain('/404');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Tu sitio sustituye 3 rutas de @velezanthony/design'),
      );
      // El panel las enseña: quedan en el registro que comparte con la integración.
      expect(clientRegistry().overrides?.map(({ route }) => route)).toEqual([
        'sitemap.xml',
        'index',
        '404',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
