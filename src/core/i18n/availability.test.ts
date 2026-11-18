import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import { buildAvailability, pageUrl, type UrlPolicy } from './availability';

function policy(extra: Partial<UrlPolicy> = {}): UrlPolicy {
  return {
    base: '/',
    trailingSlash: 'always',
    defaultLocale: 'en',
    ...extra,
  };
}

function page(slug: string, locale: string): Page {
  return {
    slug,
    locale,
    title: slug,
    kind: 'native',
    body: '',
    sourcePath: `${slug}.md`,
  };
}

describe('pageUrl', () => {
  it('el idioma por defecto va sin prefijo y los demás con prefijo', () => {
    expect(pageUrl('install', 'en', policy())).toBe('/install/');
    expect(pageUrl('install', 'es', policy())).toBe('/es/install/');
  });

  it('con español por defecto, es va sin prefijo y en con prefijo', () => {
    expect(pageUrl('install', 'es', policy({ defaultLocale: 'es' }))).toBe('/install/');
    expect(pageUrl('install', 'en', policy({ defaultLocale: 'es' }))).toBe('/en/install/');
  });

  it('respeta la base, con o sin barra final', () => {
    expect(pageUrl('install', 'en', policy({ base: '/repo' }))).toBe('/repo/install/');
    expect(pageUrl('install', 'es', policy({ base: '/repo/' }))).toBe('/repo/es/install/');
  });

  it('la portada es la raíz del idioma', () => {
    expect(pageUrl('', 'en', policy({ base: '/repo' }))).toBe('/repo/');
    expect(pageUrl('', 'es', policy({ base: '/repo' }))).toBe('/repo/es/');
  });

  it('`never` quita la barra final, salvo en la raíz', () => {
    const never = policy({ trailingSlash: 'never', base: '/repo' });
    expect(pageUrl('install', 'en', never)).toBe('/repo/install');
    expect(pageUrl('', 'es', never)).toBe('/repo/es');
    expect(pageUrl('', 'en', policy({ trailingSlash: 'never' }))).toBe('/');
  });

  it('`ignore` equivale a `always`', () => {
    expect(pageUrl('install', 'en', policy({ trailingSlash: 'ignore' }))).toBe('/install/');
  });
});

describe('buildAvailability', () => {
  it('lista, por slug, los idiomas reales y su URL', () => {
    const availability = buildAvailability(
      [page('install', 'en'), page('install', 'es'), page('changelog', 'en')],
      policy(),
    );
    expect(availability.get('install')).toEqual({ en: '/install/', es: '/es/install/' });
    expect(availability.get('changelog')).toEqual({ en: '/changelog/' });
    expect(availability.has('es-only')).toBe(false);
  });
});
