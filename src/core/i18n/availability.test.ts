import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import {
  buildAvailability,
  localePrefix,
  pageUrl,
  pageUrlOf,
  type UrlPolicy,
} from './availability';

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

describe('buildAvailability: `slug` propio', () => {
  it('agrupa por identidad (el archivo) y da a cada idioma su URL traducida', () => {
    const availability = buildAvailability(
      [
        { ...page('tutoriales/instalacion', 'es'), sourcePath: 'tutoriales/instalacion.md' },
        {
          ...page('tutoriales/instalacion', 'en'),
          sourcePath: 'tutoriales/instalacion.en.md',
          urlSlug: 'tutorials/installation',
        },
      ],
      policy({ defaultLocale: 'es', base: '/repo' }),
    );
    expect([...availability.keys()]).toEqual(['tutoriales/instalacion']);
    expect(availability.get('tutoriales/instalacion')).toEqual({
      es: '/repo/tutoriales/instalacion/',
      en: '/repo/en/tutorials/installation/',
    });
  });
});

describe('pageUrlOf', () => {
  const url = policy({ defaultLocale: 'es', base: '/repo' });

  it('sin `urlSlug`, la URL sale de la identidad', () => {
    expect(pageUrlOf(page('tutoriales/instalacion', 'es'), url)).toBe(
      '/repo/tutoriales/instalacion/',
    );
  });

  it('con `urlSlug`, la URL es la suya con el prefijo de su idioma', () => {
    expect(
      pageUrlOf(
        { ...page('tutoriales/instalacion', 'en'), urlSlug: 'tutorials/installation' },
        url,
      ),
    ).toBe('/repo/en/tutorials/installation/');
  });
});

describe('localePrefix', () => {
  it('el idioma por defecto no lleva prefijo', () => {
    expect(localePrefix('es', 'es')).toBe('');
  });

  it('los demás idiomas llevan su código', () => {
    expect(localePrefix('en', 'es')).toBe('en');
  });
});
