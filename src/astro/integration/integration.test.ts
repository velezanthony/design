import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { satteri } from '@astrojs/markdown-satteri';
import type { AstroIntegrationLogger } from 'astro';
import { AstroError } from 'astro/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHIKI_LANG_ALIAS } from '../markdown/code-languages';
import { clientRegistry } from '../registry';
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
    .map(([update]) => update as { vite?: { plugins?: { load: { handler: () => string } }[] } })
    .find((update) => update.vite);
  const source = partial?.vite?.plugins?.[0]?.load.handler() ?? '';
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
    const names = options.mdastPlugins.map((mdastPlugin) => (mdastPlugin as { name: string }).name);
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
    const error = await runSetup({ name: 'remark' }).catch((caught: unknown) => caught);
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
      .map(([update]) => update as { fonts?: { name: string }[] })
      .find((update) => update.fonts);
    expect(partial?.fonts?.map((font) => font.name)).toEqual(['IBM Plex Sans', 'IBM Plex Mono']);
  });

  it('registra un plugin de Vite con el módulo virtual', async () => {
    const { updateConfig } = await runSetup(satteri());
    const partial = updateConfig.mock.calls
      .map(([update]) => update as { vite?: { plugins?: { name: string }[] } })
      .find((update) => update.vite);
    expect(partial?.vite?.plugins?.map((plugin) => plugin.name)).toContain(
      'velezanthony-design-virtual-config',
    );
  });
});

describe('astro:config:setup: Tailwind', () => {
  function pluginNames(update: { vite?: { plugins?: unknown[] } }): string[] {
    return (update.vite?.plugins ?? []).flat().map((plugin) => (plugin as { name: string }).name);
  }

  it('registra el plugin de Tailwind: la librería es la dueña del CSS', async () => {
    const { updateConfig } = await runSetup(satteri());
    const partial = updateConfig.mock.calls
      .map(([update]) => update as { vite?: { plugins?: unknown[] } })
      .find((update) => update.vite);
    expect(pluginNames(partial!).some((name) => name.startsWith('@tailwindcss/vite'))).toBe(true);
  });

  it('no lo repite si el sitio ya lo registró', async () => {
    const { updateConfig } = await runSetup(
      satteri(),
      {},
      { name: 'x' },
      {
        vite: { plugins: [{ name: '@tailwindcss/vite:scan' }] },
      },
    );
    const partial = updateConfig.mock.calls
      .map(([update]) => update as { vite?: { plugins?: unknown[] } })
      .find((update) => update.vite);
    expect(pluginNames(partial!).some((name) => name.startsWith('@tailwindcss/vite'))).toBe(false);
  });
});

describe('astro:config:setup: Shiki', () => {
  async function shikiOf(processorShiki: object) {
    const { updateConfig } = await runSetup(satteri(), processorShiki);
    return updateConfig.mock.calls
      .map(([update]) => update as { markdown?: { shikiConfig?: Record<string, unknown> } })
      .find((update) => update.markdown?.shikiConfig)?.markdown?.shikiConfig;
  }

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
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(AstroError);
    expect(error).toMatchObject({
      message: expect.stringContaining('site'),
      hint: expect.stringContaining('astro.config'),
    });
  });

  /** El título del `AstroError` es genérico; el detalle (campo + motivo) va en la pista. */
  function hintOf(build: () => unknown) {
    try {
      build();
    } catch (error) {
      expect(error).toBeInstanceOf(AstroError);
      return (error as AstroError).hint ?? '';
    }
    throw new Error('no ha fallado');
  }

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
      root: 'file:///site/',
    });
    expect(data.translations).toEqual({ missing: MissingTranslation.LINK, declared: false });
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
    const { filename, content } = injectTypes.mock.calls[0]?.[0] as {
      filename: string;
      content: string;
    };
    expect(filename).toMatch(/\.d\.ts$/);
    expect(content).toContain("declare module 'virtual:@velezanthony/design/config'");
    expect(content).toContain('buildFormat');
    expect(content).toContain("declare module 'virtual:@velezanthony/design/components/Footer'");
  });
});

describe('astro:config:setup: componentes propios (`components`)', () => {
  type VitePlugin = {
    name: string;
    resolveId: { filter: { id: RegExp }; handler: () => string };
    load: { filter: { id: RegExp }; handler: () => string };
  };

  /** El plugin de Vite del módulo virtual del pie que registra la integración. */
  async function footerPlugin(userConfig: Parameters<typeof docs>[0], overrides = {}) {
    const { updateConfig } = await runSetup(satteri(), {}, userConfig, overrides);
    const plugins = updateConfig.mock.calls
      .map(([update]) => update as { vite?: { plugins?: VitePlugin[] } })
      .flatMap((update) => update.vite?.plugins ?? []);
    const plugin = plugins.find((candidate) => candidate.name === 'velezanthony-design-footer');
    if (!plugin) throw new Error('no se registró el plugin del pie');
    return plugin;
  }

  /** Raíz de proyecto temporal con un pie propio en `src/SiteFooter.astro`. */
  function projectWithFooter() {
    const root = mkdtempSync(join(tmpdir(), 'footer-'));
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src/SiteFooter.astro'), '<footer>Propio</footer>');
    return root;
  }

  it('el id virtual del pie se resuelve a un id interno de Vite', async () => {
    const plugin = await footerPlugin({ name: 'x' });
    const id = 'virtual:@velezanthony/design/components/Footer';
    expect(plugin.resolveId.filter.id.test(id)).toBe(true);
    expect(plugin.resolveId.filter.id.test(`${id}/otro`)).toBe(false);
    expect(plugin.load.filter.id.test(plugin.resolveId.handler())).toBe(true);
  });

  it('sin `components`, el módulo reexporta el DocsFooter del paquete', async () => {
    const source = (await footerPlugin({ name: 'x' })).load.handler();
    expect(source).toMatch(/^export \{ default \} from ".*DocsFooter\.astro";$/);
  });

  it('con `components.Footer`, reexporta el archivo del sitio', async () => {
    const root = projectWithFooter();
    const plugin = await footerPlugin(
      { name: 'x', components: { Footer: './src/SiteFooter.astro' } },
      { root: pathToFileURL(`${root}/`) },
    );
    expect(plugin.load.handler()).toBe(
      `export { default } from ${JSON.stringify(join(root, 'src/SiteFooter.astro'))};`,
    );
  });

  it('un `components.Footer` que no existe falla con un AstroError que lo nombra', async () => {
    const root = projectWithFooter();
    const error = await runSetup(
      satteri(),
      {},
      { name: 'x', components: { Footer: './src/Nope.astro' } },
      { root: pathToFileURL(`${root}/`) },
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AstroError);
    expect(error).toMatchObject({
      message: expect.stringContaining('components.Footer'),
      hint: expect.stringContaining(join(root, 'src/Nope.astro')),
    });
  });

  it('un `components.Footer` que no es .astro falla al validar la config', () => {
    function attempt() {
      return docs({ name: 'x', components: { Footer: './src/Footer.tsx' } });
    }
    expect(attempt).toThrow(AstroError);
    try {
      attempt();
    } catch (error) {
      expect((error as AstroError).hint).toContain('components.Footer');
    }
  });

  it('un componente desconocido en `components` falla al validar la config', () => {
    function attempt() {
      return docs({ name: 'x', components: { Header: './src/Header.astro' } } as never);
    }
    expect(attempt).toThrow(AstroError);
    try {
      attempt();
    } catch (error) {
      expect((error as AstroError).hint).toContain('components.Header: opción desconocida.');
    }
  });
});

describe('astro:config:setup: fusión de config', () => {
  it('una fuente del consumidor con el mismo cssVariable falla con un mensaje accionable', async () => {
    const error = await runSetup(
      satteri(),
      {},
      { name: 'x' },
      { fonts: [{ name: 'Mine', cssVariable: '--font-plex-sans' }] },
    ).catch((caught: unknown) => caught);
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
      async function run() {
        return docs({ name: 'x' }).hooks['astro:config:setup']?.({
          ...(setup.context as object),
          command,
          addWatchFile: vi.fn(),
        } as never);
      }
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
  async function routesOf(userConfig: Parameters<typeof docs>[0]) {
    const { injectRoute } = await runSetup(satteri(), {}, userConfig);
    return injectRoute.mock.calls.map(
      ([route]) => route as { pattern: string; entrypoint: string | URL; prerender?: boolean },
    );
  }
  function entry(route: { entrypoint: string | URL } | undefined) {
    return String(route?.entrypoint);
  }

  it('inyecta la página de docs, el sitemap y su hoja, y el favicon', async () => {
    const routes = await routesOf({ name: 'x' });
    expect(routes.map((route) => route.pattern)).toEqual([
      '/[...slug]',
      '/sitemap.xml',
      '/_design/sitemap.css',
      '/_design/favicon.png',
    ]);
    expect(entry(routes[0])).toMatch(/routes\/doc\.astro$/);
    expect(entry(routes[1])).toMatch(/routes\/sitemap\.xml\.ts$/);
    expect(entry(routes[2])).toMatch(/routes\/sitemap\.css\.ts$/);
    expect(entry(routes[3])).toMatch(/routes\/favicon\.png\.ts$/);
  });

  it('con varios idiomas las rutas son las mismas: la 404 y la privacidad son del sitio', async () => {
    const single = await routesOf({ name: 'x' });
    const multiple = await routesOf({ name: 'x', locales: ['en', 'es'] });
    expect(multiple.map((route) => route.pattern)).toEqual(single.map((route) => route.pattern));
  });

  it('con sitemaps incluidos, inyecta también el sitemap de páginas', async () => {
    const routes = await routesOf({ name: 'x', sitemap: { include: ['/lib/sitemap.xml'] } });
    const pages = routes.find((route) => route.pattern === '/sitemap-pages.xml');
    expect(pages && entry(pages)).toMatch(/routes\/sitemap-pages\.xml\.ts$/);
    expect((await routesOf({ name: 'x' })).map((route) => route.pattern)).not.toContain(
      '/sitemap-pages.xml',
    );
  });

  it('todas las rutas se prerenderizan', async () => {
    const routes = await routesOf({ name: 'x', locales: ['en', 'es'] });
    expect(routes.every((route) => route.prerender === true)).toBe(true);
  });
});

describe('astro:config:setup: panel SEO on page (solo en desarrollo)', () => {
  /** Rutas inyectadas con el comando de Astro dado. */
  async function routesFor(command: 'dev' | 'build') {
    const integration = docs({ name: 'x', locales: ['en', 'es'] });
    const { context, injectRoute } = setupContext(satteri());
    await integration.hooks['astro:config:setup']?.({ ...(context as object), command } as never);
    return injectRoute.mock.calls.map(
      ([route]) => route as { pattern: string; entrypoint: string | URL; prerender?: boolean },
    );
  }

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

describe('astro:config:setup: analítica desde el entorno', () => {
  afterEach(() => vi.unstubAllEnvs());
  const two = { name: 'x', locales: ['en', 'es'] };
  const withPrivacy = { ...two, privacyUrl: { en: '/privacy/', es: '/privacidad/' } };

  it('sin PUBLIC_GTM_ID ni privacyUrl no hay gtmId ni enlace de privacidad', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', '');
    const data = await virtualData(two);
    expect(data.gtmId).toBeUndefined();
    expect(data.privacyUrl).toBeUndefined();
  });

  it('con PUBLIC_GTM_ID y privacyUrl activa la analítica y el enlace de cada idioma', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', ' GTM-ENV0001 ');
    const data = await virtualData(withPrivacy);
    expect(data.gtmId).toBe('GTM-ENV0001');
    expect(data.privacyUrl).toEqual({ en: '/privacy/', es: '/privacidad/' });
  });

  it('solo privacyUrl: el enlace del pie, sin analítica', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', '');
    const data = await virtualData(withPrivacy);
    expect(data.gtmId).toBeUndefined();
    expect(data.privacyUrl).toEqual({ en: '/privacy/', es: '/privacidad/' });
  });

  it('el gtmId de la config gana al entorno', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'GTM-ENV0001');
    const data = await virtualData({ ...withPrivacy, gtmId: 'GTM-CONF001' });
    expect(data.gtmId).toBe('GTM-CONF001');
  });

  it('un ID con formato inválido rompe la construcción con un AstroError', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'G-NOPE');
    const error = await virtualData(two).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AstroError);
    expect(String((error as AstroError).hint)).toContain('GTM-XXXXXXX');
  });

  describe('un ID sin privacyUrl', () => {
    async function setupFor(command: 'dev' | 'build', userConfig: Parameters<typeof docs>[0]) {
      const setup = setupContext(satteri());
      vi.mocked(logger.warn).mockClear();
      await docs(userConfig).hooks['astro:config:setup']?.({
        ...(setup.context as object),
        command,
      } as never);
      return setup;
    }
    function source(setup: ReturnType<typeof setupContext>) {
      return setup.updateConfig.mock.calls
        .map(([update]) => update as { vite?: { plugins?: { load: { handler: () => string } }[] } })
        .find((update) => update.vite)
        ?.vite?.plugins?.[0]?.load.handler();
    }

    it('en build falla nombrando `privacyUrl`, venga el ID de la config o del entorno', async () => {
      vi.stubEnv('PUBLIC_GTM_ID', '');
      const fromConfig = await setupFor('build', { ...two, gtmId: 'GTM-CONF001' }).catch(
        (caught: unknown) => caught,
      );
      expect(fromConfig).toBeInstanceOf(AstroError);
      expect(String((fromConfig as AstroError).hint)).toContain('privacyUrl');
      vi.stubEnv('PUBLIC_GTM_ID', 'GTM-ENV0001');
      const fromEnv = await setupFor('build', two).catch((caught: unknown) => caught);
      expect(fromEnv).toBeInstanceOf(AstroError);
      expect(String((fromEnv as AstroError).hint)).toContain('privacyUrl');
    });

    it('en dev avisa nombrando `privacyUrl` y arranca sin analítica', async () => {
      vi.stubEnv('PUBLIC_GTM_ID', '');
      const setup = await setupFor('dev', { ...two, gtmId: 'GTM-CONF001' });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('privacyUrl'));
      expect(source(setup)).not.toContain('gtmId');
    });

    it('en dev con el ID en el entorno también avisa y no carga analítica', async () => {
      vi.stubEnv('PUBLIC_GTM_ID', 'GTM-ENV0001');
      const setup = await setupFor('dev', two);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('privacyUrl'));
      expect(source(setup)).not.toContain('gtmId');
    });

    it('en dev, con privacyUrl no avisa y la analítica sigue activa', async () => {
      vi.stubEnv('PUBLIC_GTM_ID', 'GTM-ENV0001');
      const setup = await setupFor('dev', withPrivacy);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(source(setup)).toContain('GTM-ENV0001');
    });

    it('en dev, un gtmId mal formado sigue siendo un error aunque falte privacyUrl', async () => {
      vi.stubEnv('PUBLIC_GTM_ID', '');
      await expect(setupFor('dev', { ...two, gtmId: 'nope' })).rejects.toBeInstanceOf(AstroError);
    });
  });

  describe('con un PUBLIC_GTM_ID inválido en dev', () => {
    async function devSetup(userConfig: Parameters<typeof docs>[0]) {
      const setup = setupContext(satteri());
      vi.mocked(logger.warn).mockClear();
      await docs(userConfig).hooks['astro:config:setup']?.({
        ...(setup.context as object),
        command: 'dev',
      } as never);
      return setup;
    }

    it('avisa con el nombre de la variable y no tumba el servidor', async () => {
      vi.stubEnv('PUBLIC_GTM_ID', 'G-NOPE');
      await devSetup(two);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('PUBLIC_GTM_ID'));
      expect(logger.warn).toHaveBeenCalledWith(expect.not.stringContaining('G-NOPE'));
    });

    it('la analítica queda desactivada', async () => {
      vi.stubEnv('PUBLIC_GTM_ID', 'G-NOPE');
      const { updateConfig } = await devSetup(two);
      const source = updateConfig.mock.calls
        .map(([update]) => update as { vite?: { plugins?: { load: { handler: () => string } }[] } })
        .find((update) => update.vite)
        ?.vite?.plugins?.[0]?.load.handler();
      expect(source).not.toContain('gtmId');
    });

    it('un gtmId inválido en la config sigue siendo un error', async () => {
      await expect(devSetup({ ...two, gtmId: 'nope' })).rejects.toBeInstanceOf(AstroError);
    });
  });

  it('con un idioma sin política posible falla nombrando el idioma', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'GTM-ENV0001');
    const error = await virtualData({
      ...two,
      privacyUrl: { es: '/privacidad/' },
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AstroError);
    expect(String((error as AstroError).hint)).toContain('en');
  });
});

describe('astro:config:setup: vigilar docs.config', () => {
  /* `astro.config.mjs` importa `docs.config.mjs`, pero Astro solo reinicia `dev` cuando cambia el
     propio astro.config: sin `addWatchFile`, editar la config del sitio no tendría efecto. */
  async function watched(files: string[]) {
    const directory = mkdtempSync(join(tmpdir(), 'design-watch-'));
    for (const file of files) writeFileSync(join(directory, file), 'export default {};\n');
    const addWatchFile = vi.fn();
    const setup = setupContext(satteri(), {}, { root: pathToFileURL(`${directory}/`) });
    await docs({ name: 'x' }).hooks['astro:config:setup']?.({
      ...(setup.context as object),
      addWatchFile,
    } as never);
    rmSync(directory, { recursive: true, force: true });
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
  /* Sin `server.fs.allow`, Vite daría 403 en las imágenes de `../docs`; aquí se comprueba que la integración lo aplica. */
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
  function site() {
    const root = mkdtempSync(join(tmpdir(), 'design-site-'));
    for (const file of ['index.astro', 'sitemap.xml.ts']) {
      mkdirSync(join(root, 'src', 'pages'), { recursive: true });
      writeFileSync(join(root, 'src', 'pages', file), '');
    }
    return root;
  }

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
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Tu sitio sustituye 2 rutas de @velezanthony/design'),
      );
      // El panel las enseña: quedan en el registro que comparte con la integración.
      expect(clientRegistry().overrides?.map(({ route }) => route)).toEqual([
        'index',
        'sitemap.xml',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
