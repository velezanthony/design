import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../config/resolve';
import type { Page } from '../../content/discovery';
import { buildAvailability } from '../../i18n/availability';
import { resolvePolicies } from '../../i18n/translation-policy';
import { navigationLinks } from './navigation';
import { withConfig, type ConfigPart } from '../../../testing/config';

const url = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' } as const;
function page(slug: string, locale = 'en'): Page {
  return {
    slug,
    locale,
    title: slug || 'Home',
    kind: 'native',
    sourcePath: `${slug || 'index'}${locale === 'en' ? '' : `.${locale}`}.md`,
    body: '',
  };
}
function links(pages: Page[], user: ConfigPart = {}) {
  const config = resolveConfig(
    withConfig({ site: { name: 'X' }, i18n: { locales: ['en', 'es'] } }, user),
  );
  const availability = buildAvailability(pages, url);
  const { policies } = resolvePolicies(pages, config.translations.missing);
  return navigationLinks(pages, config, { url, availability, policies });
}
function targets(map: ReturnType<typeof links>, slug: string, locale = 'en') {
  return (map.get(`${slug}\u0000${locale}`) ?? [])
    .map((link) => `${link.slug}:${link.locale}`)
    .sort();
}

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
      content: { nav: [{ label: 'API', dir: 'api' }] },
    });
    // `guide` no está en la sección `api`: llega a `api/a` por la cabecera, no a `api/b`.
    expect(targets(map, 'guide')).toEqual(['api/a:en', 'faq:en']);
    expect(targets(map, 'api/a')).toEqual(['api/b:en']);
  });

  it('una página del footer recibe enlace desde todas', () => {
    const map = links([page('guide'), page('legal'), page('api/a'), page('api/b')], {
      site: { footer: { links: [{ label: 'Legal', slug: 'legal' }] } },
      content: { nav: [{ label: 'API', dir: 'api' }] },
    });
    expect(targets(map, 'api/b')).toContain('legal:en');
  });

  it('una página enlazada desde la barra lateral y el footer cuenta una vez', () => {
    const map = links([page('guide'), page('legal')], {
      site: { footer: { links: [{ label: 'Legal', slug: 'legal' }] } },
    });
    expect(targets(map, 'guide')).toEqual(['legal:en']);
  });

  it('un enlace https del footer no apunta a ninguna página', () => {
    const map = links([page('guide'), page('legal')], {
      site: { footer: { links: [{ label: 'Web', href: 'https://x.dev' }] } },
    });
    expect(targets(map, 'guide')).toEqual(['legal:en']);
  });
});
