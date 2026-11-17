import { describe, expect, it } from 'vitest';

import { resolveConfig } from '../../core/config/resolve';
import type { DocsUserConfig } from '../../core/config/schema';
import { renderDocument, text } from '../../testing/render';
import DocsLayout from '../../ui/layouts/DocsLayout.astro';
import { createVirtualData } from '../virtual/data';
import type { DocData } from '../routes/pages';
import { devHrefs } from './hrefs';
import { inspectorHeadings, panelView } from './panel-view';

const site = (user: Partial<DocsUserConfig> = {}) =>
  createVirtualData(resolveConfig({ name: 'Docs', locales: ['en', 'es'], ...user }), {
    base: '/repo',
    site: 'https://x.dev',
    trailingSlash: 'always',
    buildFormat: 'directory',
  });

const doc = (slug: string, locale: string): DocData => ({
  slug,
  locale,
  title: `${slug || 'Home'} ${locale}`,
  sourcePath: `${slug || 'index'}.md`,
});
const data = [doc('', 'en'), doc('guide', 'en')];

const view = (extra: Partial<Parameters<typeof panelView>[0]> = {}) => {
  const cfg = extra.cfg ?? site();
  return panelView({
    cfg,
    data,
    hrefs: devHrefs(cfg),
    screen: 'overview',
    title: 'Resumen',
    ...extra,
  });
};

describe('panelView', () => {
  it('el <title> lleva la pantalla y el nombre del panel, y la página nunca se indexa', () => {
    const { head, indexable } = view();
    expect(head).toContainEqual({ tag: 'title', attrs: {}, content: 'Resumen · SEO on page' });
    expect(head).toContainEqual({ tag: 'meta', attrs: { name: 'robots', content: 'noindex' } });
    expect(indexable).toBe(false);
  });

  it('la barra lateral es la navegación del panel y marca la pantalla actual', () => {
    const overview = view();
    expect(overview.sidebar).toEqual([
      {
        label: 'SEO on page',
        items: [
          { label: 'Resumen', slug: 'seo-on-page', href: '/repo/seo-on-page/' },
          { label: 'Páginas', slug: 'seo-on-page/pages', href: '/repo/seo-on-page/pages/' },
        ],
      },
    ]);
    expect(overview.current).toBe('/repo/seo-on-page/');
    expect(view({ screen: 'pages', title: 'Páginas' }).current).toBe('/repo/seo-on-page/pages/');
  });

  it('la cabecera y el pie son los del sitio, en su idioma por defecto', () => {
    const cfg = site({ nav: [{ label: 'Guía', slug: 'guide' }] });
    const built = view({ cfg });
    expect(built.lang).toBe('en');
    expect(built.siteName).toBe('Docs');
    expect(built.homeHref).toBe('/repo/');
    expect(built.nav.map((entry) => entry.label)).toEqual(['Guía']);
    expect(built.strings).toBe(cfg.strings.en);
    expect(built.layout).toBe(cfg.layout);
    expect(built.hrefs).toEqual({});
  });

  it('sin analítica, sin consentimiento y sin enlace de edición, aunque el sitio los tenga', () => {
    const built = view({
      cfg: site({ gtmId: 'GTM-ABC123', editUrl: 'https://github.com/o/r/edit/main' }),
    });
    expect(built).not.toHaveProperty('gtmId');
    expect(built).not.toHaveProperty('privacyUrl');
    expect(built).not.toHaveProperty('editUrl');
  });

  it('el contenido va sin prosa: el panel trae su propio marcado', () => {
    expect(view().prose).toBe(false);
  });

  it('pasa los encabezados que se le dan, para «En esta página»', () => {
    const headings = [{ depth: 2, slug: 'a', text: 'A' }];
    expect(view({ headings }).headings).toEqual(headings);
    expect(view().headings).toEqual([]);
  });
});

describe('inspectorHeadings', () => {
  it('son las secciones del inspector, en su orden y a nivel 2', () => {
    const headings = inspectorHeadings();
    expect(headings.map((heading) => heading.slug)).toEqual([
      'published',
      'previews',
      'issues',
      'schemas',
      'outline',
      'translations',
    ]);
    expect(headings.every((heading) => heading.depth === 2)).toBe(true);
  });
});

describe('DocsLayout alimentado por panelView', () => {
  const page = () => {
    const cfg = site({ gtmId: 'GTM-ABC123', privacyUrl: '/repo/privacy/' });
    return renderDocument(
      DocsLayout,
      { ...view({ cfg, headings: inspectorHeadings() }), year: 2026 },
      { default: '<p>contenido</p>' },
    );
  };

  it('pinta cabecera, barra lateral con la pantalla actual y el contenido en <main>', async () => {
    const doc = await page();
    expect(doc.querySelector('header')).not.toBeNull();
    expect(doc.querySelector('main#main-content')).not.toBeNull();
    expect(text(doc.querySelector('main'))).toContain('contenido');
    expect(doc.querySelector('aside a[aria-current="page"]')!.getAttribute('href')).toBe(
      '/repo/seo-on-page/',
    );
  });

  it('no se indexa, ni en el head ni en Pagefind, y no carga analítica', async () => {
    const doc = await page();
    expect(doc.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe('noindex');
    expect(doc.querySelector('[data-pagefind-body]')).toBeNull();
    expect(doc.querySelector('[data-consent-banner]')).toBeNull();
  });

  it('«En esta página» lista las secciones del inspector', async () => {
    const doc = await page();
    expect(doc.querySelector('a[href="#published"]')).not.toBeNull();
    expect(doc.querySelector('a[href="#translations"]')).not.toBeNull();
  });
});
