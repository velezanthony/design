import { satteri } from '@astrojs/markdown-satteri';
import type { AstroIntegrationLogger } from 'astro';
import { AstroError } from 'astro/errors';
import { describe, expect, it, vi } from 'vitest';
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
        publicDir: new URL('file:///site/public/'),
        markdown: { processor, shikiConfig },
        integrations,
        ...overrides,
      },
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
  it('se identifica con INTEGRATION_NAME y expone la config para el loader', () => {
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

  it('añade los alias django→jinja y pycon→python', async () => {
    expect((await shikiOf({}))?.langAlias).toEqual({ django: 'jinja', pycon: 'python' });
  });

  it('fusiona con los alias del consumidor, y el suyo manda', async () => {
    const merged = (await shikiOf({ langAlias: { foo: 'js', django: 'html' } }))?.langAlias;
    expect(merged).toEqual({ django: 'html', pycon: 'python', foo: 'js' });
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

describe('astro:config:setup: rutas inyectadas', () => {
  const routesOf = async (userConfig: Parameters<typeof docs>[0]) => {
    const { injectRoute } = await runSetup(satteri(), {}, userConfig);
    return injectRoute.mock.calls.map(
      ([route]) => route as { pattern: string; entrypoint: string | URL; prerender?: boolean },
    );
  };
  const entry = (route: { entrypoint: string | URL }) => String(route.entrypoint);

  it('inyecta la página de docs, el sitemap y la 404', async () => {
    const routes = await routesOf({ name: 'x' });
    expect(routes.map((r) => r.pattern)).toEqual(['/[...slug]', '/sitemap.xml', '/404']);
    expect(entry(routes[0])).toMatch(/routes\/doc\.astro$/);
    expect(entry(routes[1])).toMatch(/routes\/sitemap\.xml\.ts$/);
    expect(entry(routes[2])).toMatch(/routes\/not-found\.astro$/);
  });

  it('con varios idiomas añade /[locale]/404 con el mismo contenedor', async () => {
    const routes = await routesOf({ name: 'x', locales: ['en', 'es'] });
    expect(routes.map((r) => r.pattern)).toEqual([
      '/[...slug]',
      '/sitemap.xml',
      '/404',
      '/[locale]/404',
    ]);
    expect(entry(routes[3])).toBe(entry(routes[2]));
  });

  it('todas las rutas se prerenderizan', async () => {
    const routes = await routesOf({ name: 'x', locales: ['en', 'es'] });
    expect(routes.every((r) => r.prerender === true)).toBe(true);
  });
});
