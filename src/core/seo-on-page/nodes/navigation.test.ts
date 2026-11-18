import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../config/resolve';
import type { Page } from '../../content/discovery';
import { navigationLinks } from './navigation';

const url = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' } as const;
const page = (slug: string, locale = 'en'): Page => ({
  slug,
  locale,
  title: slug || 'Home',
  kind: 'native',
  sourcePath: `${slug || 'index'}${locale === 'en' ? '' : `.${locale}`}.md`,
  body: '',
});
const links = (pages: Page[], user: Partial<Parameters<typeof resolveConfig>[0]> = {}) => {
  const config = resolveConfig({ ...user, name: 'X', locales: ['en', 'es'] });
  return navigationLinks(pages, config, url);
};
const targets = (map: ReturnType<typeof links>, slug: string, locale = 'en') =>
  (map.get(`${slug}\u0000${locale}`) ?? []).map((link) => `${link.slug}:${link.locale}`).sort();

describe('navigationLinks', () => {
  it('sin `nav`, la barra lateral de cada página enlaza a todas las demás de su idioma', () => {
    const map = links([page(''), page('guide'), page('install')]);
    expect(targets(map, 'guide')).toEqual([':en', 'install:en']);
  });

  it('una página no se cuenta a sí misma como destino', () => {
    const map = links([page(''), page('guide')]);
    expect(targets(map, 'guide')).not.toContain('guide:en');
  });

  it('cada idioma tiene su propia barra lateral', () => {
    const map = links([page('guide'), page('guide', 'es'), page('install', 'es')]);
    expect(targets(map, 'guide', 'es')).toEqual(['install:es']);
  });

  it('con secciones, una página solo ve la barra de la suya y la cabecera lleva al resto', () => {
    const map = links([page('guide'), page('api/a'), page('api/b'), page('faq')], {
      nav: [{ label: 'API', dir: 'api' }],
    });
    // `guide` no está en la sección `api`: llega a `api/a` por la cabecera, no a `api/b`.
    expect(targets(map, 'guide')).toEqual(['api/a:en', 'faq:en']);
    expect(targets(map, 'api/a')).toEqual(['api/b:en']);
  });

  it('una página del footer recibe enlace desde todas', () => {
    const map = links([page('guide'), page('legal'), page('api/a'), page('api/b')], {
      nav: [{ label: 'API', dir: 'api' }],
      footer: { links: [{ label: 'Legal', slug: 'legal' }] },
    });
    expect(targets(map, 'api/b')).toContain('legal:en');
  });

  it('un enlace https del footer no apunta a ninguna página', () => {
    const map = links([page('guide'), page('legal')], {
      footer: { links: [{ label: 'Web', href: 'https://x.dev' }] },
    });
    expect(targets(map, 'guide')).toEqual(['legal:en']);
  });
});
