import { describe, expect, it } from 'vitest';
import { DocsError, DocsErrors } from '../errors';
import { resolveConfig } from '../config/resolve';
import {
  applyAnalytics,
  missingPrivacyUrlError,
  resolveAnalytics,
  resolvePrivacyUrls,
} from './resolve';

function fails(run: () => unknown): string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof DocsErrors) return error.errors.map((problem) => problem.describe());
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

  it('sin URL no hay enlace', () => {
    expect(resolvePrivacyUrls(undefined, locales, 'en')).toBeUndefined();
  });

  it('una cadena sirve para todos los idiomas', () => {
    expect(resolvePrivacyUrls('https://x.dev/p', locales, 'en')).toEqual({
      en: 'https://x.dev/p',
      es: 'https://x.dev/p',
    });
  });

  it('una etiqueta por idioma, con caída al idioma por defecto', () => {
    expect(resolvePrivacyUrls({ es: '/privacidad/', en: '/privacy/' }, locales, 'en')).toEqual({
      en: '/privacy/',
      es: '/privacidad/',
    });
    expect(resolvePrivacyUrls({ en: '/privacy/' }, locales, 'en')).toEqual({
      en: '/privacy/',
      es: '/privacy/',
    });
  });

  it('una etiqueta incompleta sin idioma por defecto ni respaldo falla nombrando el idioma', () => {
    const [message] = fails(() => resolvePrivacyUrls({ es: '/p/' }, ['en', 'es'], 'en'));
    expect(message).toContain('privacyUrl');
    expect(message).toContain('en');
  });
});

describe('missingPrivacyUrlError', () => {
  it('nombra `privacyUrl` y la analítica, y dice cómo arreglarlo', () => {
    const message = missingPrivacyUrlError().describe();
    expect(message).toContain('`privacyUrl`');
    expect(message).toContain('gtmId');
    expect(message).toContain('PUBLIC_GTM_ID');
  });
});

describe('applyAnalytics', () => {
  const site = { name: 'X', locales: ['en', 'es'] };

  it('sin ID ni privacyUrl: nada', () => {
    const config = applyAnalytics(resolveConfig(site), undefined);
    expect(config.gtmId).toBeUndefined();
    expect(config.privacyUrl).toBeUndefined();
  });

  it('ID del entorno y privacyUrl: analítica y enlace', () => {
    const config = applyAnalytics(resolveConfig({ ...site, privacyUrl: '/privacy/' }), 'GTM-ENV1');
    expect(config.gtmId).toBe('GTM-ENV1');
    expect(config.privacyUrl).toEqual({ en: '/privacy/', es: '/privacy/' });
  });

  it('ID de la config y privacyUrl por idioma: analítica y enlace de cada idioma', () => {
    const config = applyAnalytics(
      resolveConfig({
        ...site,
        gtmId: 'GTM-CONF1',
        privacyUrl: { en: '/privacy/', es: '/privacidad/' },
      }),
      undefined,
    );
    expect(config.gtmId).toBe('GTM-CONF1');
    expect(config.privacyUrl).toEqual({ en: '/privacy/', es: '/privacidad/' });
  });

  it('solo privacyUrl: el enlace del pie, sin analítica', () => {
    const config = applyAnalytics(resolveConfig({ name: 'X', privacyUrl: '/privacy/' }), undefined);
    expect(config.gtmId).toBeUndefined();
    expect(config.privacyUrl).toEqual({ en: '/privacy/' });
  });

  it('solo ID (de la config o del entorno): falla nombrando `privacyUrl`', () => {
    const [fromConfig] = fails(() =>
      applyAnalytics(resolveConfig({ ...site, gtmId: 'GTM-CONF1' }), undefined),
    );
    expect(fromConfig).toContain('privacyUrl');
    const [fromEnv] = fails(() => applyAnalytics(resolveConfig(site), 'GTM-ENV1'));
    expect(fromEnv).toContain('privacyUrl');
  });

  it('gtmId de la config gana al entorno', () => {
    const config = applyAnalytics(
      resolveConfig({ name: 'X', gtmId: 'GTM-CONF1', privacyUrl: '/p/' }),
      'GTM-ENV1',
    );
    expect(config.gtmId).toBe('GTM-CONF1');
  });

  it('con la analítica apagada quita el ID, pero conserva el enlace del pie', () => {
    const config = applyAnalytics(
      resolveConfig({ name: 'X', gtmId: 'GTM-CONF1', privacyUrl: '/p/' }),
      'GTM-ENV1',
      false,
    );
    expect(config.gtmId).toBeUndefined();
    expect(config.privacyUrl).toEqual({ en: '/p/' });
  });
});
