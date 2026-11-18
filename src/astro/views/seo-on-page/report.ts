import type { Locale } from '../../../core/i18n/locale';
import { selectListing } from '../../../core/seo-on-page/pages/listing/selection';
import { issuePrompt } from '../../../core/seo-on-page/report/prompt';
import type { ReportContext } from '../../../core/seo-on-page/report/report';
import {
  filterScope,
  localeScope,
  pageScope,
  siteScope,
  type ReportScope,
} from '../../../core/seo-on-page/report/scope';
import { reportTexts, type ReportText } from '../../../core/seo-on-page/report/texts';
import type { Issue, SeoPage, SeoTree } from '../../../core/seo-on-page/tree/types';
import { KIND_LABELS, REPORT_LABELS, reportFilterText } from '../../../core/seo-on-page/labels';

/** El sitio, tal como lo conoce la config: nombre e idiomas. */
export interface ReportSite {
  name: string;
  locales: readonly Locale[];
}

/** Lo que `ReportDialog` pinta: los alcances que se pueden elegir y el informe ya generado de cada uno. */
export interface ReportDialogModel {
  options: { value: string; title: string; sub?: string }[];
  initial: string;
  locales: Locale[];
  texts: Record<string, ReportText>;
}

function contextOf(tree: SeoTree, site: ReportSite): ReportContext {
  return {
    site: site.name,
    locales: site.locales,
    tree,
    kindLabels: KIND_LABELS,
  };
}

/** Une el alcance principal con «Un idioma» (si hay varios): cada pantalla manda al navegador solo los alcances que ofrece. */
function dialogOf(
  tree: SeoTree,
  site: ReportSite,
  /** `sub` recibe las páginas que cubre el informe ya generado (con `lacks=`, solo a las que les falta). */
  main: { name: string; scope: ReportScope; sub: (pages: number) => string },
): ReportDialogModel {
  const perLocale = site.locales.length > 1;
  const scopes: Record<string, ReportScope> = {
    [main.name]: main.scope,
    ...(perLocale &&
      Object.fromEntries(
        site.locales.map((locale) => [`locale:${locale}`, localeScope(tree, locale)]),
      )),
  };
  const texts = reportTexts(scopes, contextOf(tree, site));
  return {
    options: [
      {
        value: main.name,
        title: REPORT_LABELS.options[main.name as 'site'],
        sub: main.sub(texts[main.name]?.pages ?? 0),
      },
      ...(perLocale
        ? [{ value: 'locale', title: REPORT_LABELS.options.locale, sub: REPORT_LABELS.subs.locale }]
        : []),
    ],
    initial: main.name,
    locales: perLocale ? [...site.locales] : [],
    texts,
  };
}

/** Resumen: todo el sitio, o un idioma. */
export function overviewReport(tree: SeoTree, site: ReportSite): ReportDialogModel {
  const scope = siteScope(tree);
  return dialogOf(tree, site, {
    name: 'site',
    scope,
    sub: (pages) => REPORT_LABELS.subs.site(pages, site.locales),
  });
}

/** Páginas: lo que la tabla enseña con su URL (los mismos filtros y vista), o un idioma. */
export function listingReport(
  tree: SeoTree,
  params: URLSearchParams,
  site: ReportSite,
): ReportDialogModel {
  const selection = selectListing(tree, params);
  const label = reportFilterText(selection.filters, selection.view);
  const scope = filterScope(selection, label);
  return dialogOf(tree, site, {
    name: 'filter',
    scope,
    sub: (pages) => REPORT_LABELS.subs.filter(label, pages),
  });
}

/** Inspector: esta página con todos sus idiomas, o un idioma de todo el sitio. */
export function inspectorReport(tree: SeoTree, slug: string, site: ReportSite): ReportDialogModel {
  const scope = pageScope(tree, slug);
  const locales = site.locales.filter((locale) =>
    scope.entries.some((entry) => entry.locale === locale),
  );
  return dialogOf(tree, site, {
    name: 'page',
    scope,
    sub: () => REPORT_LABELS.subs.page(slug, locales),
  });
}

/** El prompt de cada problema de una entrada, en el orden dado (el del inspector). */
export function fixPrompts(
  tree: SeoTree,
  site: ReportSite,
  entry: SeoPage,
  issues: readonly Issue[],
): string[] {
  return issues.map((issue) =>
    issuePrompt({ site: site.name, entry, issue, tree, kindLabels: KIND_LABELS }),
  );
}
