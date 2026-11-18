import { describe, expect, it } from 'vitest';
import { applyAnalytics } from '../../core/analytics/resolve';
import { resolveConfig } from '../../core/config/resolve';
import { createVirtualData } from '../virtual/data';
import { privacyRoutes, privacyView } from './privacy';

const site = (privacy: object = { page: true }, extra: object = {}) => {
  const resolved = resolveConfig({
    name: 'Docs',
    locales: ['es', 'en'],
    privacy,
    ...extra,
  } as never);
  return createVirtualData(
    applyAnalytics(resolved, 'GTM-ENV0001', {
      base: '/repo',
      trailingSlash: 'always',
      defaultLocale: resolved.defaultLocale,
    }),
    {
      base: '/repo',
      site: 'https://x.dev',
      trailingSlash: 'always',
      buildFormat: 'directory',
      publicDir: 'file:///site/public/',
    },
  );
};

describe('privacyRoutes', () => {
  it('el idioma por defecto sin prefijo y el resto bajo [locale]', () => {
    expect(privacyRoutes(site())).toEqual({
      main: [{ params: { privacy: 'privacidad' } }],
      localized: [{ params: { locale: 'en', privacy: 'privacy' } }],
    });
  });
});

describe('privacyView', () => {
  it('idioma por defecto: título, contenido y responsable por defecto', () => {
    const view = privacyView({ locale: undefined, cfg: site() });
    expect(view.lang).toBe('es');
    expect(view.head[0]).toMatchObject({ content: 'Política de privacidad | Anthony Velez Tapia' });
    expect(JSON.stringify(view.sections)).toContain('Anthony Velez Tapia');
    expect(view.updated.iso).toBe('2026-11-17');
    expect(view.homeHref).toBe('/repo/');
  });

  it('otro idioma: su texto, su home y su selector de idioma', () => {
    const view = privacyView({ locale: 'en', cfg: site() });
    expect(view.lang).toBe('en');
    expect(view.sections[0]?.title).toBe('Who runs this site');
    expect(view.homeHref).toBe('/repo/en/');
    expect(view.hrefs).toEqual({ es: '/repo/privacidad/', en: '/repo/en/privacy/' });
  });

  it('usa el responsable de la config', () => {
    const view = privacyView({
      locale: 'en',
      cfg: site({ page: true, controller: { name: 'Ada Test', email: 'ada@test.dev' } }),
    });
    expect(JSON.stringify(view.sections)).toContain('mailto:ada@test.dev');
  });

  it('es indexable: canonical y hreflang, sin noindex', () => {
    const { head } = privacyView({ locale: 'en', cfg: site() });
    expect(head.some((h) => h.attrs['name'] === 'robots')).toBe(false);
    expect(head).toContainEqual({
      tag: 'link',
      attrs: { rel: 'canonical', href: 'https://x.dev/repo/en/privacy/' },
    });
    const alternates = head.filter((h) => h.attrs['rel'] === 'alternate');
    expect(alternates.map((h) => [h.attrs['hreflang'], h.attrs['href']])).toEqual([
      ['es', 'https://x.dev/repo/privacidad/'],
      ['en', 'https://x.dev/repo/en/privacy/'],
      ['x-default', 'https://x.dev/repo/privacidad/'],
    ]);
  });

  it('el footer enlaza a esta misma página (local) y lleva el consentimiento', () => {
    const view = privacyView({ locale: 'es', cfg: site() });
    expect(view.privacyUrl).toBe('/repo/privacidad/');
    expect(view.gtmId).toBe('GTM-ENV0001');
  });
});
