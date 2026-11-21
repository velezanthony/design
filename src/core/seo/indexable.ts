import type { Page } from '../content/discovery';
import { urlSlugOf } from '../content/slug';
import { pageUrl, type Availability, type UrlPolicy } from '../i18n/availability';

/** URLs de las páginas con `seo.noindex`: no van al sitemap ni a los alternates de sus gemelas. */
export function noindexUrls(pages: Page[], url: UrlPolicy): Set<string> {
  return new Set(
    pages
      .filter((page) => page.seo?.noindex)
      .map((page) => pageUrl(urlSlugOf(page), page.locale, url)),
  );
}

/** Disponibilidad sin las URLs excluidas; un grupo que se queda vacío desaparece. No muta. */
export function excludeNoindex(
  availability: Availability,
  excluded: ReadonlySet<string>,
): Availability {
  const result: Availability = new Map();
  for (const [slug, available] of availability) {
    const kept = Object.fromEntries(
      Object.entries(available).filter(([, href]) => href !== undefined && !excluded.has(href)),
    );
    if (Object.keys(kept).length > 0) result.set(slug, kept);
  }
  return result;
}
