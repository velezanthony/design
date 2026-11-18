import type { Locale } from '../../../i18n/locale';
import type { SiteFile } from '../../site-files';
import { summarize, type SeoSummary } from '../../queries/summary';
import { EMPTY_FILTERS } from '../../queries/url-filters';
import { ALL_SEVERITIES, isActionable } from '../../severity';
import { severityCounts } from '../listing/severities';
import { IssueKind, IssueSeverity, type SeoTree } from '../../tree/types';
import type { PanelLinks } from '../links';
import { coverage, type Coverage } from './coverage';
import { indexing, type Indexing } from './indexing';
import type { Certainty } from '../../certainty';
import { fixPriorities, type FixPriority } from './priorities';

export interface OverviewModel {
  kpis: {
    /** Páginas sin errores ni avisos ÷ total: la UI puede enseñar la cuenta («35 ÷ 38») y el porcentaje. */
    health: SeoSummary['health'];
    /** Páginas (slugs) y entradas (página + idioma). */
    pages: { pages: number; entries: number };
    /** Una por idioma de la config, con sus entradas. */
    locales: { locale: Locale; entries: number }[];
    /** Páginas con error o aviso (una vez cada una); sin problemas, sin enlace. */
    problems: {
      pages: number;
      errors: number;
      warnings: number;
      entries: number;
      href: string | undefined;
    };
    /** Lo informativo: son mejoras, no fallos. */
    info: {
      pages: number;
      entries: number;
      kinds: IssueKind[];
      href: string | undefined;
    };
  };
  /** Los tipos de problema por lo que conviene arreglar antes, cada uno con su enlace a la tabla. */
  priorities: (FixPriority & { href: string })[];
  footer: {
    /** Las páginas con errores o avisos y el enlace a la tabla; sin ellas, nada. */
    problems: { pages: number; href: string } | undefined;
    /** La tabla con todas las páginas, informativas y limpias incluidas. */
    all: string;
  };
  /** Sin tarjeta con un solo idioma. */
  coverage: (Coverage & { href: string }) | undefined;
  indexing: Indexing;
  schemas: SeoSummary['schemas'];
  /** Una fila por tipo con incidencias (mismo orden que «qué arreglar»), y los que están a cero. */
  kinds: {
    rows: {
      kind: IssueKind;
      severity: IssueSeverity;
      pages: number;
      percent: number;
      certainty: Certainty;
      href: string;
    }[];
    clean: IssueKind[];
  };
  files: SiteFile[];
}

interface OverviewInput {
  /** Idiomas de la config, en su orden. */
  locales: readonly Locale[];
  defaultLocale: Locale;
  links: Pick<PanelLinks, 'pages' | 'inspector' | 'overview'>;
  /** Los archivos del sitio que reunió el adaptador (disco y config); aquí solo se interpretan. */
  siteFiles: SiteFile[];
}

/** Los enlaces llegan hechos porque el núcleo no forma URLs; ver `PanelLinks`. */
export function overviewModel(tree: SeoTree, input: OverviewInput): OverviewModel {
  const { locales, defaultLocale, links, siteFiles } = input;
  const summary = summarize(tree);
  const counts = severityCounts(tree.pages);
  const problemPages = summary.health.total - summary.health.healthy;
  const problemEntries = tree.pages.filter((page) =>
    page.issues.some((issue) => isActionable(issue.severity)),
  ).length;

  const priorities = fixPriorities(tree, { locales, inspector: links.inspector });
  function kindHref(kind: IssueKind) {
    return links.pages({ ...EMPTY_FILTERS, kinds: [kind] });
  }

  const cover = coverage(tree, { locales, defaultLocale, inspector: links.inspector });
  // El sitemap de la ruta suma las páginas de privacidad, que no son del árbol: se restan.
  const sitemap = siteFiles.find((file) => file.id === 'sitemap');
  const privacyUrls = siteFiles.find((file) => file.id === 'privacy')?.links?.length ?? 0;
  const matrix = cover?.rows ?? [];
  const fallbacks = matrix
    .flatMap((row) => row.cells)
    .filter((cell) => cell.state === 'fallback').length;

  return {
    kpis: {
      health: summary.health,
      pages: { pages: summary.health.total, entries: summary.total },
      locales: locales.map((locale) => ({
        locale,
        entries: tree.pages.filter((page) => page.locale === locale).length,
      })),
      problems: {
        pages: problemPages,
        errors: counts.error.pages,
        warnings: counts.warning.pages,
        entries: problemEntries,
        href: problemPages > 0 ? links.pages() : undefined,
      },
      info: {
        pages: counts.info.pages,
        entries: counts.info.entries,
        kinds: Object.values(IssueKind).filter((kind) =>
          tree.pages.some((page) =>
            page.issues.some(
              (issue) => issue.kind === kind && issue.severity === IssueSeverity.INFO,
            ),
          ),
        ),
        href:
          counts.info.pages > 0
            ? links.pages({ ...EMPTY_FILTERS, severities: [IssueSeverity.INFO] })
            : undefined,
      },
    },
    priorities: priorities.map((priority) => ({ ...priority, href: kindHref(priority.kind) })),
    footer: {
      problems: problemPages > 0 ? { pages: problemPages, href: links.pages() } : undefined,
      all: links.pages({ ...EMPTY_FILTERS, severities: ALL_SEVERITIES }),
    },
    coverage: cover && {
      ...cover,
      href: links.pages(undefined, undefined, undefined, { view: 'matrix' }),
    },
    indexing: indexing(tree, {
      sitemapUrls: Math.max(0, (sitemap?.urls ?? 0) - privacyUrls),
      fallbacks,
    }),
    schemas: summary.schemas,
    kinds: {
      rows: priorities.map(({ kind, severity, pages, percent, certainty }) => ({
        kind,
        severity,
        pages,
        percent,
        certainty,
        href: kindHref(kind),
      })),
      clean: Object.values(IssueKind).filter((kind) => summary.byKind[kind] === 0),
    },
    files: siteFiles,
  };
}
