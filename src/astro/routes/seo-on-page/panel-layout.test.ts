import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../../core/config/resolve';
import type { DocsUserConfig } from '../../../core/config/schema';
import { renderDocument, text } from '../../../testing/render';
import DocsLayout from '../../../components/layouts/DocsLayout.astro';
import { createVirtualData } from '../../virtual/data';
import type { DocData } from '../../loader/schema';
import { devHrefs } from '../../views/seo-on-page/hrefs';
import { inspectorHeadings, panelView } from '../../views/seo-on-page/panel';

function site(user: Partial<DocsUserConfig> = {}) {
  return createVirtualData(resolveConfig({ name: 'Docs', locales: ['en', 'es'], ...user }), {
    base: '/repo',
    site: 'https://x.dev',
    trailingSlash: 'always',
    buildFormat: 'directory',
    publicDir: 'file:///site/public/',
    root: 'file:///site/',
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

/* Aquí y no en `views/`: ver el panel dentro del layout junta presentación (`components/`) y datos, y eso solo lo hace `routes/`. */
describe('DocsLayout alimentado por panelView', () => {
  function page() {
    const config = site({ gtmId: 'GTM-ABC123', privacyUrl: '/repo/privacy/' });
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
