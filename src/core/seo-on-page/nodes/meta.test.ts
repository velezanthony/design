import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../config/resolve';
import type { SeoPageInput } from '../tree/input';
import { buildMetaNode } from './meta';

const url = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' } as const;
const page = (extra: Partial<SeoPageInput> = {}): SeoPageInput => ({
  slug: 'install',
  locale: 'en',
  title: 'Install',
  kind: 'native',
  sourcePath: 'install.md',
  headings: [],
  ...extra,
});

describe('buildMetaNode', () => {
  it('el título final lleva el sufijo del sitio y su longitud se mide sobre él', () => {
    const config = resolveConfig({ name: 'Design', seo: { titleSuffix: 'Design' } });
    const node = buildMetaNode(page(), config, url);
    expect(node.title).toBe('Install | Design');
    expect(node.titleLength).toBe('Install | Design'.length);
    expect(node.ogTitle).toBe('Install');
  });

  it('el seo.title de la página manda y sin sufijo el título va solo', () => {
    const config = resolveConfig({ name: 'Design', seo: { titleSuffix: false } });
    const node = buildMetaNode(page({ seo: { title: 'Instalar ya' } }), config, url);
    expect(node.title).toBe('Instalar ya');
  });

  it('descripción de la página: origen «page»', () => {
    const config = resolveConfig({ name: 'D', seo: { description: 'Del sitio' } });
    const node = buildMetaNode(page({ seo: { description: 'De la página' } }), config, url);
    expect(node).toMatchObject({
      description: 'De la página',
      descriptionSource: 'page',
      descriptionLength: 'De la página'.length,
      ogDescription: 'De la página',
    });
  });

  it('descripción heredada: origen «site»', () => {
    const config = resolveConfig({ name: 'D', seo: { description: 'Del sitio' } });
    const node = buildMetaNode(page(), config, url);
    expect(node).toMatchObject({ description: 'Del sitio', descriptionSource: 'site' });
  });

  it('una página con la misma frase que el sitio sigue siendo «page»', () => {
    const config = resolveConfig({ name: 'D', seo: { description: 'Igual' } });
    const node = buildMetaNode(page({ seo: { description: 'Igual' } }), config, url);
    expect(node.descriptionSource).toBe('page');
  });

  it('sin descripción en ningún nivel: origen «none» y sin campos de descripción', () => {
    const node = buildMetaNode(page(), resolveConfig({ name: 'D' }), url);
    expect(node.descriptionSource).toBe('none');
    expect(node).not.toHaveProperty('description');
    expect(node).not.toHaveProperty('descriptionLength');
  });

  it('canonical con base e idioma, y noindex del override', () => {
    const config = resolveConfig({ name: 'D', locales: ['en', 'es'] });
    const node = buildMetaNode(page({ locale: 'es', seo: { noindex: true } }), config, url);
    expect(node.canonical).toBe('/repo/es/install/');
    expect(node.noindex).toBe(true);
  });

  it('og:image: la de la página con el alt por defecto y el tamaño leído', () => {
    const config = resolveConfig({ name: 'D' });
    const sizes = new Map([['/og.png', { width: 1200, height: 630 }]]);
    const node = buildMetaNode(page({ seo: { image: { src: '/og.png' } } }), config, url, sizes);
    expect(node.ogImage).toEqual({ src: '/og.png', alt: 'Install', width: 1200, height: 630 });
  });
});
