import { describe, expect, it } from 'vitest';
import type { ListingTable } from '../../../core/seo-on-page/pages/listing/model';
import { render } from '../../../testing/render';
import PagesListing from './PagesListing.astro';

const page = {
  slug: 'guide',
  title: 'Guide',
  titleLength: 5,
  href: '/i/',
  tags: [],
  locales: [],
  issues: [],
  severity: undefined,
};
const entry = {
  slug: 'guide',
  locale: 'en',
  href: '/i/',
  title: 'Guide',
  titleLength: 5,
  descriptionSource: 'none' as const,
  descriptionLength: undefined,
  issues: [],
  tone: 'ok' as const,
};
const matrixRow = {
  slug: 'guide',
  title: 'Guide',
  href: '/i/',
  tags: [],
  cells: [{ locale: 'en', state: 'exists' as const }],
  hreflang: 'unpaired' as const,
  xDefault: undefined,
  complete: true,
};

/** Un marcador propio de cada tabla: así se sabe cuál se pintó. */
const marks = {
  page: 'tbody[data-page]',
  locale: 'tr[data-entry]',
  matrix: 'td[data-hreflang]',
  have: 'a[data-have-col]',
};

const tables: Record<keyof typeof marks, ListingTable> = {
  page: { view: 'page', rows: [page] },
  locale: { view: 'locale', rows: [entry] },
  matrix: { view: 'matrix', rows: [matrixRow], locales: ['en'], hreflang: true, complete: 1 },
  have: {
    view: 'have',
    rows: [],
    columns: [{ column: 'desc', href: '/t/', pressed: false, good: 0, total: 0 }],
    lacks: undefined,
  },
};

describe('PagesListing', () => {
  for (const view of Object.keys(marks) as (keyof typeof marks)[]) {
    it(`en la vista «${view}» pinta su tabla y ninguna otra`, async () => {
      const doc = await render(PagesListing, { table: tables[view] });
      for (const [other, selector] of Object.entries(marks)) {
        expect(doc.querySelector(selector) !== null, `${view} → ${other}`).toBe(other === view);
      }
    });
  }
});
