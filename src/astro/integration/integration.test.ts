import { satteri } from '@astrojs/markdown-satteri';
import type { AstroIntegrationLogger } from 'astro';
import { AstroError } from 'astro/errors';
import { describe, expect, it, vi } from 'vitest';
import { docs, INTEGRATION_NAME } from './index';

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as AstroIntegrationLogger;

/** Contexto falso de `astro:config:setup` (la integración principal de Starlight se prueba igual). */
function setupContext(processor: { name: string }, shikiConfig: object = {}) {
  const updateConfig = vi.fn((partial: unknown) => partial);
  const injectTypes = vi.fn();
  return {
    updateConfig,
    injectTypes,
    context: {
      config: {
        base: '/repo',
        site: 'https://x.dev',
        root: new URL('file:///site/'),
        markdown: { processor, shikiConfig },
      },
      updateConfig,
      injectTypes,
      logger,
    } as never,
  };
}

async function runSetup(processor: { name: string }, shikiConfig: object = {}) {
  const integration = docs({ name: 'x' });
  const { context, updateConfig } = setupContext(processor, shikiConfig);
  await integration.hooks['astro:config:setup']?.(context);
  return { integration, updateConfig };
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
