import { describe, expect, it } from 'vitest';
import {
  formatPrivacyDate,
  missingPrivacyLocales,
  privacyAvailability,
  privacyPageUrls,
  privacyRoutes,
  privacySlug,
} from './pages';

function url(defaultLocale: string, extra = {}) {
  return {
    base: '/repo',
    trailingSlash: 'always' as const,
    defaultLocale,
    ...extra,
  };
}

describe('privacySlug', () => {
  it('es → privacidad, en → privacy', () => {
    expect(privacySlug('es')).toBe('privacidad');
    expect(privacySlug('en')).toBe('privacy');
  });

  it('un idioma sin texto falla con un mensaje claro', () => {
    expect(() => privacySlug('fr')).toThrow(/fr/);
  });
});

describe('missingPrivacyLocales', () => {
  it('devuelve los idiomas sin texto', () => {
    expect(missingPrivacyLocales(['en', 'es'])).toEqual([]);
    expect(missingPrivacyLocales(['es', 'pt', 'fr'])).toEqual(['pt', 'fr']);
  });
});

describe('privacyPageUrls', () => {
  it('con es por defecto: sin prefijo en es y /en/ en inglés (como el portfolio)', () => {
    expect(privacyPageUrls(['es', 'en'], url('es'))).toEqual({
      es: '/repo/privacidad/',
      en: '/repo/en/privacy/',
    });
  });

  it('con en por defecto, el español lleva prefijo', () => {
    expect(privacyPageUrls(['en', 'es'], url('en'))).toEqual({
      en: '/repo/privacy/',
      es: '/repo/es/privacidad/',
    });
  });

  it('respeta la barra final', () => {
    expect(privacyPageUrls(['en'], url('en', { trailingSlash: 'never' }))).toEqual({
      en: '/repo/privacy',
    });
  });
});

describe('privacyAvailability', () => {
  it('es una sola entrada con una URL por idioma (hreflang entre ellas)', () => {
    const availability = privacyAvailability(['es', 'en'], url('es'));
    expect([...availability.values()]).toEqual([
      { es: '/repo/privacidad/', en: '/repo/en/privacy/' },
    ]);
  });
});

describe('privacyRoutes', () => {
  it('el idioma por defecto sin prefijo y el resto bajo [locale]', () => {
    expect(privacyRoutes(['es', 'en'], 'es')).toEqual({
      main: [{ params: { privacy: 'privacidad' } }],
      localized: [{ params: { locale: 'en', privacy: 'privacy' } }],
    });
  });

  it('monolingüe: sin rutas por idioma', () => {
    expect(privacyRoutes(['en'], 'en').localized).toEqual([]);
  });
});

describe('formatPrivacyDate', () => {
  it('escribe la fecha en el idioma de la página', () => {
    expect(formatPrivacyDate('es', '2026-11-17')).toBe('17 de noviembre de 2026');
    expect(formatPrivacyDate('en', '2026-11-17')).toBe('17 November 2026');
  });
});
