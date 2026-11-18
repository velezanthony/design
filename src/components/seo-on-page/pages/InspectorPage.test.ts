import { describe, expect, it } from 'vitest';

import { renderDocument } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import { PANEL_LABELS } from '../labels';
import InspectorPage from './InspectorPage.astro';

/* La página solo recibe el modelo por props: se prueba sin datos ni Astro. */
function props(extra: Record<string, unknown> = {}) {
  return {
    view: {
      lang: 'es',
      head: [{ tag: 'title', attrs: {}, content: 'Inspector' }],
      siteName: 'Docs',
      homeHref: '/repo/',
      hrefs: {},
      strings: stringsFor('es'),
      sidebar: [],
      nav: [],
      current: '/repo/seo-on-page/pages/',
      headings: [],
      indexable: false,
      baseUrl: '/repo/',
      prose: false,
    },
    year: 2026,
    slug: 'guia',
    locale: 'es',
    pagesHref: '/repo/seo-on-page/pages/',
    prompts: [],
    failures: [],
    ...extra,
  };
}

describe('InspectorPage', () => {
  it('sin modelo dice que no existe esa página y enlaza a la tabla', async () => {
    const htmlDocument = await renderDocument(InspectorPage, props());
    const main = htmlDocument.querySelector('main')!;
    expect(main.textContent).toContain('No hay ninguna página con slug «guia» en «es».');
    expect(main.querySelector('a[href="/repo/seo-on-page/pages/"]')!.textContent).toContain(
      PANEL_LABELS.viewTable,
    );
  });
});
