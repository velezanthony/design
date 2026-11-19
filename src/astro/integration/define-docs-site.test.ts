import { AstroError } from 'astro/errors';
import { describe, expect, it } from 'vitest';
import { defineDocsConfig, INTEGRATION_NAME } from './index';
import { DEFAULT_SITE, defineDocsSite } from './define-docs-site';

const docsConfig = defineDocsConfig({ name: 'T' });

describe('defineDocsSite: valores por defecto', () => {
  const config = defineDocsSite(docsConfig, { base: '/repo' });

  it('pone el origen por defecto, la base y la barra final', () => {
    /* El literal, no `DEFAULT_SITE`: comparar con la propia constante no detectaría que cambie. */
    expect(config.site).toBe('https://velezanthony.github.io');
    expect(config.base).toBe('/repo');
    expect(config.trailingSlash).toBe('always');
  });

  it('registra la integración con la config del sitio', () => {
    expect(config.integrations).toHaveLength(1);
    expect(config.integrations?.[0]).toMatchObject({ name: INTEGRATION_NAME });
  });

  it('no registra Tailwind: lo hace `docs()`', () => {
    expect((config.vite?.plugins ?? []).flat()).toHaveLength(0);
  });

  it('permite cambiar el origen', () => {
    expect(defineDocsSite(docsConfig, { base: '/r', site: 'https://example.dev' }).site).toBe(
      'https://example.dev',
    );
  });
});

describe('defineDocsSite: base', () => {
  it('admite "/" (sitio de usuario u organización)', () => {
    expect(defineDocsSite(docsConfig, { base: '/' }).base).toBe('/');
  });

  it.each([undefined, '', 'repo', 'https://x.dev/repo', '//x.dev/repo'])(
    'rechaza la base %j con un error claro',
    (base) => {
      // @ts-expect-error: se prueba justo el caso de un JS sin tipos
      expect(() => defineDocsSite(docsConfig, { base })).toThrow(AstroError);
    },
  );

  it('falla si no hay opciones', () => {
    // @ts-expect-error: `options` es obligatorio
    expect(() => defineDocsSite(docsConfig)).toThrow(AstroError);
  });
});

describe('defineDocsSite: reglas de fusión con `astro`', () => {
  const marker = { name: 'marker' };
  const extraIntegration = { name: 'extra', hooks: {} };

  it('añade integraciones DESPUÉS de docs()', () => {
    const config = defineDocsSite(docsConfig, {
      base: '/r',
      astro: { integrations: [extraIntegration] },
    });
    expect(
      config.integrations?.map((integration) => (integration as { name: string }).name),
    ).toEqual([INTEGRATION_NAME, 'extra']);
  });

  it('añade los plugins de Vite del sitio y fusiona el resto de claves de vite', () => {
    const config = defineDocsSite(docsConfig, {
      base: '/r',
      astro: { vite: { plugins: [marker], logLevel: 'warn' } },
    });
    const plugins = config.vite?.plugins ?? [];
    expect(plugins).toEqual([marker]);
    expect(config.vite?.logLevel).toBe('warn');
  });

  it('el resto de claves de primer nivel se añaden o pisan los valores por defecto', () => {
    const config = defineDocsSite(docsConfig, {
      base: '/r',
      astro: { trailingSlash: 'never', devToolbar: { enabled: false } },
    });
    expect(config.trailingSlash).toBe('never');
    expect(config.devToolbar).toEqual({ enabled: false });
  });

  it('`site` y `base` salen siempre de las opciones, no de `astro`', () => {
    const config = defineDocsSite(docsConfig, {
      base: '/r',
      // @ts-expect-error: el tipo las excluye; en JS plano llegarían igual
      astro: { base: '/otra', site: 'https://otra.dev' },
    });
    expect(config.base).toBe('/r');
    expect(config.site).toBe(DEFAULT_SITE);
  });

  it('no muta lo que recibe', () => {
    const astro = { integrations: [extraIntegration], vite: { plugins: [marker] } };
    defineDocsSite(docsConfig, { base: '/r', astro });
    expect(astro.integrations).toHaveLength(1);
    expect(astro.vite.plugins).toHaveLength(1);
  });
});
