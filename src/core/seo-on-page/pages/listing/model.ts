import type { Locale } from '../../../i18n/locale';
import { paginate, type Paginated } from '../../../shared/paginate';
import {
  EMPTY_FILTERS,
  parsePage,
  parsePerPage,
  SeoView,
  type HaveColumn,
  type SeoFilters,
  type ViewState,
} from '../../queries/url-filters';
import type { SeoTree } from '../../tree/types';
import type { PanelLinks } from '../links';
import { commonIssues, type CommonIssue } from './common';
import { entryRows, type EntryRow } from './entries';
import { HAVE_COLUMNS, haveCounts, haveRows, lacking, type HaveRow } from './have';
import { kindOptions, type KindOptions } from './kinds';
import { matrixRows, type MatrixRow } from './matrix';
import { pageRows, type PageRow } from './rows';
import { isInventoryView, selectListing } from './selection';
import { severityCounts, type SeverityCounts } from './severities';
import { ALL_SEVERITIES } from '../../severity';
import { slugsOf } from '../../tree/keys';

/** Lo que pinta la tabla según la vista; cada una trae sus filas, ya paginadas. */
export type ListingTable =
  | { view: 'page'; rows: PageRow[] }
  | { view: 'locale'; rows: EntryRow[] }
  | {
      view: 'matrix';
      rows: MatrixRow[];
      /** Los idiomas de la config, una columna cada uno. */
      locales: Locale[];
      /** Si el sitio tiene varios idiomas: con uno no hay hreflang que enseñar. */
      hreflang: boolean;
      /** Páginas (de todas las filtradas, no solo de esta página de la tabla) con todos sus idiomas. */
      complete: number;
    }
  | {
      view: 'have';
      rows: HaveRow[];
      /** Una por columna: su enlace alterna `lacks`, y `good / total` cuenta las páginas filtradas. */
      columns: {
        column: HaveColumn;
        href: string;
        pressed: boolean;
        good: number;
        total: number;
      }[];
      lacks: HaveColumn | undefined;
    };

export interface ListingModel {
  /** La vista pedida (y, en «Qué tiene», la columna por la que se filtra). */
  view: ViewState;
  /** Un enlace por vista, para el selector: conserva los filtros y vuelve a la página 1. */
  views: { view: SeoView; href: string; current: boolean }[];
  /** Los filtros EFECTIVOS (con el valor por defecto aplicado), los que ve el formulario. */
  filters: SeoFilters;
  /** La URL no nombra gravedad ni tipo: la vista por defecto oculta lo informativo. */
  defaulted: boolean;
  perPage: number;
  /** Con la vista por defecto, el enlace para ver también lo informativo; si no, nada. */
  showAllHref: string | undefined;
  form: {
    filters: SeoFilters;
    perPage: number;
    locales: Locale[];
    action: string;
    /** La casilla «Ocultar noindex»: si está marcada y cuántas páginas (slugs) noindex hay en el sitio. */
    noindex: { hidden: boolean; count: number };
    /** Las casillas del desplegable «Tipo de problema», con «Todos». */
    kinds: KindOptions;
    /** La vista en vigor: viaja oculta para que filtrar no la deshaga. */
    view: ViewState;
    /** La tabla sin filtros, en la misma vista y con el mismo tamaño: lo que hace «Limpiar». */
    clear: string;
    /** Lo que cuenta cada ficha de gravedad: entradas en «Por idioma», páginas en las demás. */
    severityCounts: Record<keyof SeverityCounts, number>;
  };
  /** Se enseñan una vez, no por fila; las vistas de inventario no los tienen. */
  common: { issues: CommonIssue[]; overviewHref: string };
  /** La tabla de la vista pedida, con las filas de la página actual. */
  table: ListingTable;
  footer: {
    /** Filtros escritos en la URL: en la vista por defecto sin `severity`, para que paginar no la haga explícita. */
    filters: SeoFilters;
    perPage: number;
    action: string;
    view: ViewState;
    /** Cuenta las filas de la vista: páginas (un slug en dos idiomas es una) o, en «Por idioma», entradas. */
    count: { from: number; to: number; total: number; overall: number };
    pagination: { page: number; pages: number; href: (page: number) => string };
  };
}

interface ListingInput {
  tree: SeoTree;
  /** La query de la URL: ahí viven filtros, página y tamaño. */
  params: URLSearchParams;
  /** Idiomas de la config del sitio, para el formulario y las insignias de cada fila. */
  locales: Locale[];
  /** El idioma de cuyo título y enlace se sirve la fila. */
  defaultLocale: Locale;
  links: Pick<PanelLinks, 'pages' | 'inspector' | 'overview'>;
}

/** Los filtros eligen PÁGINAS (basta una entrada que cumpla); las vistas por página, matriz y «Qué tiene» enseñan todos sus idiomas. */
export function listingModel({
  tree,
  params,
  locales,
  defaultLocale,
  links,
}: ListingInput): ListingModel {
  const { view, filters, defaulted, written, visible, matching, selected, byEntry, severities } =
    selectListing(tree, params);
  const perPage = parsePerPage(params);
  const inventory = isInventoryView(view.view);
  const common = inventory
    ? []
    : commonIssues(byEntry ? matching : selected, {
        ignore: filters.kinds,
        ...(severities && { severities }),
      });
  const commonKinds = common.map(({ kind }) => kind);
  function href(to: ViewState, page = 1) {
    return links.pages(written, page, perPage, to);
  }

  function tableOf(): { table: ListingTable; paging: Omit<Paginated<unknown>, 'rows'> } {
    const at = parsePage(params);
    switch (view.view) {
      case SeoView.LOCALE: {
        const all = entryRows(matching, {
          common: commonKinds,
          ...(severities && { severities }),
          inspector: links.inspector,
        });
        const { rows, ...paging } = paginate(all, at, perPage);
        return { table: { view: 'locale', rows }, paging };
      }
      case SeoView.MATRIX: {
        const matrix = matrixRows(selected, { locales, defaultLocale, inspector: links.inspector });
        const { rows, ...paging } = paginate(matrix.rows, at, perPage);
        return {
          table: {
            view: 'matrix',
            rows,
            locales,
            hreflang: matrix.hreflang,
            complete: matrix.complete,
          },
          paging,
        };
      }
      case SeoView.HAVE: {
        const all = haveRows(selected, { locales, defaultLocale, inspector: links.inspector });
        const counts = haveCounts(all);
        const { rows, ...paging } = paginate(lacking(all, view.lacks), at, perPage);
        return {
          table: {
            view: 'have',
            rows,
            lacks: view.lacks,
            columns: HAVE_COLUMNS.map((column) => {
              const pressed = view.lacks === column;
              return {
                column,
                pressed,
                href: href({ view: SeoView.HAVE, ...(!pressed && { lacks: column }) }),
                ...counts[column],
              };
            }),
          },
          paging,
        };
      }
      default: {
        const { rows, ...paging } = paginate(
          pageRows(selected, {
            locales,
            defaultLocale,
            common: commonKinds,
            ...(severities && { severities }),
            inspector: links.inspector,
          }),
          at,
          perPage,
        );
        return { table: { view: 'page', rows }, paging };
      }
    }
  }
  const { table, paging } = tableOf();

  const counts = severityCounts(visible.pages);
  const unit = byEntry ? 'entries' : 'pages';
  const action = links.pages();
  return {
    view,
    views: Object.values(SeoView).map((candidate) => ({
      view: candidate,
      href: href({ view: candidate }),
      current: candidate === view.view,
    })),
    filters,
    defaulted,
    perPage,
    showAllHref: defaulted
      ? links.pages({ ...filters, severities: ALL_SEVERITIES }, 1, perPage, view)
      : undefined,
    form: {
      filters,
      perPage,
      locales,
      action,
      noindex: {
        hidden: filters.hideNoindex,
        count: slugsOf(tree.pages.filter((entry) => entry.meta.noindex)).size,
      },
      kinds: kindOptions(visible, filters.kinds),
      view,
      clear: links.pages(EMPTY_FILTERS, 1, perPage, view),
      severityCounts: {
        error: counts.error[unit],
        warning: counts.warning[unit],
        info: counts.info[unit],
      },
    },
    common: { issues: common, overviewHref: links.overview() },
    table,
    footer: {
      filters: written,
      perPage,
      action,
      view,
      count: {
        from: paging.from,
        to: paging.to,
        total: paging.total,
        overall: byEntry ? visible.pages.length : slugsOf(visible.pages).size,
      },
      pagination: {
        page: paging.page,
        pages: paging.pages,
        href: (number) => href(view, number),
      },
    },
  };
}
