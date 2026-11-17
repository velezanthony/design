import { describe, expect, it } from 'vitest';

import { resolveConfig } from '../../core/config/resolve';
import { createVirtualData } from '../virtual/data';
import { notFoundRoutes, notFoundView } from './not-found-view';

const site = (locales: string[], ui = {}) =>
  createVirtualData(resolveConfig({ name: 'Docs', locales, ui }), {
    base: '/repo',
    site: 'https://x.dev',
    trailingSlash: 'always',
    buildFormat: 'directory',
  });

describe('notFoundRoutes', () => {
  it('uno por idioma que no es el de defecto', () => {
    expect(notFoundRoutes(site(['en', 'es']))).toEqual([{ params: { locale: 'es' } }]);
    expect(notFoundRoutes(site(['es', 'en']))).toEqual([{ params: { locale: 'en' } }]);
  });

  it('monolingüe: ninguna', () => {
    expect(notFoundRoutes(site(['en']))).toEqual([]);
  });
});

describe('notFoundView', () => {
  const cfg = site(['en', 'es'], { es: { 'notFound.title': 'Perdido' } });

  it('/404 (idioma por defecto): head noindex sin canonical y plantillas del resto', () => {
    const view = notFoundView(undefined, cfg);
    expect(view.lang).toBe('en');
    expect(view.head[0]).toMatchObject({
      tag: 'title',
      content: expect.stringContaining('Page not found'),
    });
    expect(view.head.some((h) => h.attrs['name'] === 'robots')).toBe(true);
    expect(view.head.some((h) => h.attrs['rel'] === 'canonical')).toBe(false);
    expect(view.head.some((h) => h.attrs['hreflang'])).toBe(false);
    expect(view.others.map((o) => o.lang)).toEqual(['es']);
    expect(view.others[0]).toMatchObject({ title: 'Perdido · Docs', homeHref: '/repo/es/' });
    expect(view.swap).toEqual({ base: '/repo/', locales: ['en', 'es'], defaultLocale: 'en' });
    expect(view.homeHref).toBe('/repo/');
  });

  it('el título del idioma sustituido lleva la plantilla, igual que su propia /es/404/', () => {
    const swapped = notFoundView(undefined, cfg).others[0]?.title;
    const own = notFoundView('es', cfg).head[0];
    expect(own).toMatchObject({ tag: 'title' });
    expect(swapped).toBe(own?.content);
    expect(swapped).toContain('Perdido');
    expect(swapped).not.toBe('Perdido');
  });

  it('/es/404/: su idioma directamente, sin plantillas ni sustitución', () => {
    const view = notFoundView('es', cfg);
    expect(view.lang).toBe('es');
    expect(view.strings['notFound.title']).toBe('Perdido');
    expect(view.others).toEqual([]);
    expect(view.swap).toBeUndefined();
    expect(view.homeHref).toBe('/repo/es/');
  });

  it('monolingüe: sin plantillas ni sustitución', () => {
    const view = notFoundView(undefined, site(['en']));
    expect(view.others).toEqual([]);
    expect(view.swap).toBeUndefined();
  });
});
