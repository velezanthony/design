import type { SeoPage } from '../core/seo-on-page/tree/types';

/**
 * Una página del árbol SEO con valores razonables, para probar la UI del panel sin pasar por
 * `buildSeoTree`: se sobrescribe solo lo que el test mira.
 */
export function seoPage(overrides: Partial<SeoPage> = {}): SeoPage {
  const slug = overrides.slug ?? 'guide';
  const locale = overrides.locale ?? 'en';
  return {
    slug,
    locale,
    title: 'Guide',
    kind: 'native',
    sourcePath: `${slug || 'index'}.md`,
    meta: {
      title: 'Guide | Site',
      titleLength: 12,
      description: 'A description of the guide.',
      descriptionSource: 'page',
      descriptionLength: 27,
      ogTitle: 'Guide',
      ogDescription: 'A description of the guide.',
      ogImageSource: 'none',
      canonical: `/repo/${slug}/`,
      noindex: false,
    },
    headings: [{ depth: 1, slug: 'guide', text: 'Guide' }],
    locales: [{ locale, status: 'present', url: `/repo/${slug}/` }],
    schemas: [],
    issues: [],
    ...overrides,
  };
}
