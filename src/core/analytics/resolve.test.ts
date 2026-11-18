import { describe, expect, it } from 'vitest';
import { DocsError, DocsErrors } from '../errors';
import { resolveConfig } from '../config/resolve';
import {
  applyAnalytics,
  DEFAULT_PRIVACY_URLS,
  resolveAnalytics,
  resolvePrivacyUrls,
} from './resolve';

function fails(run: () => unknown): string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof DocsErrors) return error.errors.map((e) => e.describe());
    if (error instanceof DocsError) return [error.describe()];
    throw error;
  }
  return [];
}

describe('resolveAnalytics', () => {
  it.each([undefined, '', '   ', '\n'])('sin valor (%j) no hay analítica', (value) => {
    expect(resolveAnalytics(value, undefined)).toBeUndefined();
  });

  it('un ID válido del entorno la activa, recortado', () => {
    expect(resolveAnalytics('GTM-ABC123', undefined)).toBe('GTM-ABC123');
    expect(resolveAnalytics('  GTM-ABC123 \n', undefined)).toBe('GTM-ABC123');
  });

  it('la config gana al entorno', () => {
    expect(resolveAnalytics('GTM-ENV1', 'GTM-CONF1')).toBe('GTM-CONF1');
  });

  it('una config en blanco cae al entorno', () => {
    expect(resolveAnalytics('GTM-ENV1', '  ')).toBe('GTM-ENV1');
  });

  it.each(['G-ABC123', 'gtm-abc123', 'GTM-%%', 'GTM-AB C', 'UA-123-4', 'GTM-ABC-1'])(
    'un ID con formato inválido (%s) falla con un error claro que no repite el valor',
    (bad) => {
      const [message] = fails(() => resolveAnalytics(bad, undefined));
      expect(message).toContain('PUBLIC_GTM_ID');
      expect(message).toContain('GTM-XXXXXXX');
      expect(message).not.toContain(bad);
    },
  );

  it('un ID inválido en la config nombra `gtmId`', () => {
    const [message] = fails(() => resolveAnalytics(undefined, 'nope'));
    expect(message).toContain('`gtmId`');
    expect(message).not.toContain('nope');
  });
});

describe('resolvePrivacyUrls', () => {
  const locales = ['en', 'es'];

  it('sin analítica y sin URL no hay enlace', () => {
    expect(resolvePrivacyUrls(undefined, false, locales, 'en')).toBeUndefined();
  });

  it('una cadena sirve para todos los idiomas', () => {
    expect(resolvePrivacyUrls('https://x.dev/p', false, locales, 'en')).toEqual({
      en: 'https://x.dev/p',
      es: 'https://x.dev/p',
    });
  });

  it('una etiqueta por idioma, con caída al idioma por defecto', () => {
    expect(
      resolvePrivacyUrls({ es: '/privacidad/', en: '/privacy/' }, true, locales, 'en'),
    ).toEqual({ en: '/privacy/', es: '/privacidad/' });
    expect(resolvePrivacyUrls({ en: '/privacy/' }, true, locales, 'en')).toEqual({
      en: '/privacy/',
      es: '/privacy/',
    });
  });

  it('con analítica y sin URL usa la del portfolio de cada idioma', () => {
    expect(resolvePrivacyUrls(undefined, true, locales, 'en')).toEqual({
      en: 'https://velezanthony.github.io/en/privacy/',
      es: 'https://velezanthony.github.io/privacidad/',
    });
    expect(DEFAULT_PRIVACY_URLS.es).toBe('https://velezanthony.github.io/privacidad/');
  });

  it('con analítica y un idioma sin URL posible falla nombrándolo', () => {
    const [message] = fails(() => resolvePrivacyUrls(undefined, true, ['en', 'fr'], 'en'));
    expect(message).toContain('privacyUrl');
    expect(message).toContain('fr');
  });

  it('una etiqueta incompleta sin idioma por defecto ni respaldo falla', () => {
    const [message] = fails(() => resolvePrivacyUrls({ es: '/p/' }, true, ['en', 'es'], 'en'));
    expect(message).toContain('en');
  });
});

describe('applyAnalytics', () => {
  it('sin ID en entorno ni config: nada de analítica y sin enlace de privacidad', () => {
    const cfg = applyAnalytics(resolveConfig({ name: 'X', locales: ['en', 'es'] }), undefined);
    expect(cfg.gtmId).toBeUndefined();
    expect(cfg.privacyUrl).toBeUndefined();
  });

  it('con ID en el entorno: gtmId y privacidad por defecto del portfolio', () => {
    const cfg = applyAnalytics(resolveConfig({ name: 'X', locales: ['en', 'es'] }), 'GTM-ENV1');
    expect(cfg.gtmId).toBe('GTM-ENV1');
    expect(cfg.privacyUrl).toEqual({
      en: 'https://velezanthony.github.io/en/privacy/',
      es: 'https://velezanthony.github.io/privacidad/',
    });
  });

  it('privacyUrl explícita sin analítica se mantiene (enlace de footer)', () => {
    const cfg = applyAnalytics(resolveConfig({ name: 'X', privacyUrl: '/privacy/' }), undefined);
    expect(cfg.gtmId).toBeUndefined();
    expect(cfg.privacyUrl).toEqual({ en: '/privacy/' });
  });

  it('gtmId de la config gana al entorno', () => {
    const cfg = applyAnalytics(resolveConfig({ name: 'X', gtmId: 'GTM-CONF1' }), 'GTM-ENV1');
    expect(cfg.gtmId).toBe('GTM-CONF1');
  });
});

describe('applyAnalytics: página de privacidad propia', () => {
  const url = { base: '/repo', trailingSlash: 'always' as const, defaultLocale: 'es' };
  function page(extra = {}) {
    return resolveConfig({
      name: 'X',
      locales: ['es', 'en'],
      privacy: { page: true },
      ...extra,
    });
  }

  it('con `page: true` el enlace apunta a la página local, también sin analítica', () => {
    const cfg = applyAnalytics(page(), undefined, url);
    expect(cfg.gtmId).toBeUndefined();
    expect(cfg.privacyUrl).toEqual({ es: '/repo/privacidad/', en: '/repo/en/privacy/' });
  });

  it('con `page: true` y analítica gana la local al portfolio', () => {
    const cfg = applyAnalytics(page(), 'GTM-ENV1', url);
    expect(cfg.privacyUrl).toEqual({ es: '/repo/privacidad/', en: '/repo/en/privacy/' });
  });

  it('una `privacyUrl` explícita gana a la página local', () => {
    const cfg = applyAnalytics(page({ privacyUrl: 'https://x.dev/p/' }), 'GTM-ENV1', url);
    expect(cfg.privacyUrl).toEqual({ es: 'https://x.dev/p/', en: 'https://x.dev/p/' });
  });

  it('con `page: false` sigue enlazando al portfolio (comportamiento actual)', () => {
    const cfg = applyAnalytics(
      resolveConfig({ name: 'X', locales: ['es', 'en'], privacy: { page: false } }),
      'GTM-ENV1',
      url,
    );
    expect(cfg.privacyUrl).toEqual({
      es: 'https://velezanthony.github.io/privacidad/',
      en: 'https://velezanthony.github.io/en/privacy/',
    });
  });

  it('sin política de URLs usa base `/` y barra final', () => {
    const cfg = applyAnalytics(page(), undefined);
    expect(cfg.privacyUrl).toEqual({ es: '/privacidad/', en: '/en/privacy/' });
  });
});
