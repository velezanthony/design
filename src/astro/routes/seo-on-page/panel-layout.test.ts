import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../../core/config/resolve';
import { renderDocument, text } from '../../../testing/render';
import DocsLayout from '../../../components/layouts/DocsLayout.astro';
import { createVirtualData } from '../../virtual/data';
import type { DocData } from '../../loader/schema';
import { devHrefs } from '../../views/seo-on-page/hrefs';
import { inspectorHeadings, panelView } from '../../views/seo-on-page/panel';
import { listingReport, overviewReport } from '../../views/seo-on-page/report';
import { overviewModel } from '../../../core/seo-on-page/pages/overview/model';
import { listingModel } from '../../../core/seo-on-page/pages/listing/model';
import InspectorPage from '../../../components/seo-on-page/pages/InspectorPage.astro';
import OverviewPage from '../../../components/seo-on-page/pages/OverviewPage.astro';
import PagesPage from '../../../components/seo-on-page/pages/PagesPage.astro';
import FooterProbe from '../../../testing/fixtures/FooterProbe.astro';
import { seoPage } from '../../../testing/seo-page';
import { withConfig, type ConfigPart } from '../../../testing/config';

function site(user: ConfigPart = {}) {
  return createVirtualData(
    resolveConfig(withConfig({ site: { name: 'Docs' }, i18n: { locales: ['en', 'es'] } }, user)),
    {
      base: '/repo',
      siteUrl: 'https://x.dev',
      trailingSlash: 'always',
      buildFormat: 'directory',
      publicDir: 'file:///site/public/',
      root: 'file:///site/',
    },
  );
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
    hrefs: devHrefs({ ...config, defaultLocale: config.i18n.defaultLocale }),
    screen: 'overview',
    title: 'Resumen',
    ...extra,
  });
}

/* Aquí y no en `views/`: ver el panel dentro del layout junta presentación (`components/`) y datos, y eso solo lo hace `routes/`. */
describe('DocsLayout alimentado por panelView', () => {
  function page() {
    const config = site({
      site: { analytics: { gtmId: 'GTM-ABC123', privacyUrl: '/repo/privacy/' } },
    });
    return renderDocument(
      DocsLayout,
      {
        ...view({ config, headings: inspectorHeadings({ fixes: 1, translations: true }) }),
        year: 2026,
      },
      { default: '<p>contenido</p>' },
    );
  }

  it('pinta cabecera, barra lateral con la pantalla actual y el contenido en <main>', async () => {
    const htmlDocument = await page();
    expect(htmlDocument.querySelector('header')).not.toBeNull();
    expect(htmlDocument.querySelector('main#main-content')).not.toBeNull();
    expect(text(htmlDocument.querySelector('main'))).toContain('contenido');
    expect(htmlDocument.querySelector('aside a[aria-current="page"]')!.getAttribute('href')).toBe(
      '/repo/seo-on-page/',
    );
  });

  it('no se indexa, ni en el head ni en Pagefind, y no carga analítica', async () => {
    const htmlDocument = await page();
    expect(htmlDocument.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe(
      'noindex',
    );
    expect(htmlDocument.querySelector('[data-pagefind-body]')).toBeNull();
    expect(htmlDocument.querySelector('[data-consent-banner]')).toBeNull();
  });

  it('«En esta página» lista las secciones del inspector', async () => {
    const htmlDocument = await page();
    expect(htmlDocument.querySelector('a[href="#published"]')).not.toBeNull();
    expect(htmlDocument.querySelector('a[href="#translations"]')).not.toBeNull();
  });
});

/* Las rutas del panel pasan el pie configurado (`components.Footer`) como la de docs: el módulo
   virtual solo lo importa `routes/`, y la pantalla lo reenvía al layout. */
describe('pantallas del panel con un pie propio (`Footer`)', () => {
  const config = site();
  const hrefs = devHrefs({ ...config, defaultLocale: config.i18n.defaultLocale });
  const tree = { pages: [seoPage({ slug: 'guide' })] };
  const reportSite = { name: config.site.name, locales: config.i18n.locales };

  function expectProbeFooter(htmlDocument: Document) {
    expect(htmlDocument.querySelectorAll('footer')).toHaveLength(1);
    expect(htmlDocument.querySelector('footer[data-footer-probe]')).not.toBeNull();
    expect(htmlDocument.querySelector('[data-footer-meta]')).toBeNull();
  }

  it('el resumen pinta el pie recibido en lugar del de la librería', async () => {
    const htmlDocument = await renderDocument(OverviewPage, {
      view: view({ config }),
      year: 2026,
      model: overviewModel(tree, {
        locales: config.i18n.locales,
        defaultLocale: config.i18n.defaultLocale,
        links: hrefs,
        siteFiles: [],
      }),
      locales: config.i18n.locales,
      failures: [],
      overrides: [],
      report: overviewReport(tree, reportSite),
      Footer: FooterProbe,
    });
    expectProbeFooter(htmlDocument);
  });

  it('la tabla de páginas pinta el pie recibido en lugar del de la librería', async () => {
    const params = new URLSearchParams();
    const htmlDocument = await renderDocument(PagesPage, {
      view: view({ config, screen: 'pages', title: 'Páginas' }),
      year: 2026,
      model: listingModel({
        tree,
        params,
        locales: config.i18n.locales,
        defaultLocale: config.i18n.defaultLocale,
        links: hrefs,
      }),
      failures: [],
      report: listingReport(tree, params, reportSite),
      Footer: FooterProbe,
    });
    expectProbeFooter(htmlDocument);
  });

  it('el inspector pinta el pie recibido, también cuando la página no existe', async () => {
    const htmlDocument = await renderDocument(InspectorPage, {
      view: view({ config, screen: 'pages', title: 'No existe' }),
      year: 2026,
      slug: 'nada',
      locale: 'en',
      pagesHref: hrefs.pages(),
      prompts: [],
      failures: [],
      Footer: FooterProbe,
    });
    expectProbeFooter(htmlDocument);
  });

  it('sin `Footer`, las pantallas siguen con el pie de la librería', async () => {
    const htmlDocument = await renderDocument(InspectorPage, {
      view: view({ config, screen: 'pages', title: 'No existe' }),
      year: 2026,
      slug: 'nada',
      locale: 'en',
      pagesHref: hrefs.pages(),
      prompts: [],
      failures: [],
    });
    expect(htmlDocument.querySelector('footer [data-footer-meta]')).not.toBeNull();
  });
});
