import { describe, expect, it } from 'vitest';
import { defaultStrings } from '../../../core/i18n/ui-strings';

import { resolveConfig } from '../../../core/config/resolve';
import type { DocsUserConfig } from '../../../core/config/schema';
import { createVirtualData } from '../../virtual/data';
import type { DocData } from '../../loader/schema';
import { devHrefs } from './hrefs';
import { inspectorHeadings, panelView } from './panel';

function site(user: Partial<DocsUserConfig> = {}) {
  return createVirtualData(resolveConfig({ name: 'Docs', locales: ['en', 'es'], ...user }), {
    base: '/repo',
    site: 'https://x.dev',
    trailingSlash: 'always',
    buildFormat: 'directory',
    publicDir: 'file:///site/public/',
  });
}

function doc(slug: string, locale: string): DocData {
  return {
    slug,
    locale,
    title: `${slug || 'Home'} ${locale}`,
    sourcePath: `${slug || 'index'}.md`,
  };
}
const data = [doc('', 'en'), doc('guide', 'en')];

function view(extra: Partial<Parameters<typeof panelView>[0]> = {}) {
  const config = extra.config ?? site();
  return panelView({
    config,
    data,
    hrefs: devHrefs(config),
    screen: 'overview',
    title: 'Resumen',
    ...extra,
  });
}

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

  it('el panel va en español; con español en el sitio, su cabecera y su pie también', () => {
    const config = site({ nav: [{ label: { en: 'Guide', es: 'Guía' }, slug: 'guide' }] });
    const built = view({ config });
    expect(built.lang).toBe('es');
    expect(built.strings).toBe(config.strings.es);
    expect(built.siteName).toBe('Docs');
    expect(built.homeHref).toBe('/repo/es/');
    expect(built.nav.map((entry) => entry.label)).toEqual(['Guía']);
    expect(built.hrefs).toEqual({});
  });

  it('sin español en el sitio, la interfaz sigue en español y los enlaces van a su idioma', () => {
    const config = createVirtualData(
      resolveConfig({ name: 'Docs', locales: ['en'], nav: [{ label: 'Guide', slug: 'guide' }] }),
      {
        base: '/repo',
        site: 'https://x.dev',
        trailingSlash: 'always',
        buildFormat: 'directory',
        publicDir: 'file:///site/public/',
      },
    );
    const built = view({ config });
    expect(built.lang).toBe('es');
    expect(built.strings).toEqual(defaultStrings.es);
    expect(built.homeHref).toBe('/repo/');
    expect(built.nav.map((entry) => entry.label)).toEqual(['Guide']);
  });

  it('sin analítica, sin consentimiento y sin enlace de edición, aunque el sitio los tenga', () => {
    const built = view({
      config: site({ gtmId: 'GTM-ABC123', editUrl: 'https://github.com/o/r/edit/main' }),
    });
    expect(built).not.toHaveProperty('gtmId');
    expect(built).not.toHaveProperty('privacyUrl');
    expect(built).not.toHaveProperty('editUrl');
  });

  it('se abre a ancho completo: tablas y vistas previas no caben en el de lectura', () => {
    const config = site({ layout: { width: 'reading' } });
    const built = view({ config });
    expect(built.layout.width).toBe('full');
    // El resto de la disposición (barras plegables, conmutadores) sigue siendo la del sitio.
    expect({ ...built.layout, width: config.layout.width }).toEqual(config.layout);
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
    const headings = inspectorHeadings({ fixes: 0, translations: true });
    expect(headings.map((heading) => heading.slug)).toEqual([
      'issues',
      'published',
      'translations',
      'schemas',
      'outline',
    ]);
    expect(headings.every((heading) => heading.depth === 2)).toBe(true);
  });

  it('«Qué arreglar» lleva cuántos problemas hay', () => {
    expect(inspectorHeadings({ fixes: 2, translations: true })[0]!.text).toBe('Qué arreglar (2)');
  });

  it('sin nada que arreglar no hay recuento', () => {
    expect(inspectorHeadings({ fixes: 0, translations: true })[0]!.text).toBe('Qué arreglar');
  });

  it('con un solo idioma no hay sección de traducciones', () => {
    const slugs = inspectorHeadings({ fixes: 0, translations: false }).map(
      (inspectorHeading) => inspectorHeading.slug,
    );
    expect(slugs).not.toContain('translations');
  });
});
