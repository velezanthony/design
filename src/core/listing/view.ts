import type { Locale } from '../i18n/locale';
import { translate, type UiStrings } from '../i18n/ui-strings';
import type { TocHeading } from '../navigation/toc-entries';
import { paginate } from '../shared/paginate';
import { coverFor, coverPattern, type CoverPattern, type EntryCover } from './covers';
import {
  isListingGroup,
  sortByUpdated,
  type Listing,
  type ListingEntry,
  type ListingNode,
} from './entries';
import { isPagedListing, type ListingOptions } from './options';
import type { ListingPosition } from './urls';

/* El modelo de vista de un listado: todo lo que pintan los componentes `Listing*`, ya derivado. Una
   lista pinta sus secciones; una tabla o unas tarjetas, las entradas de ESTA página, con su
   paginador y su selector «Por página». Las URLs llegan por el puerto `ListingHrefs`, que implementa
   `astro/` (base, idioma, barra final). */

/** Fecha de una entrada: formato medio del idioma, en UTC (la de un commit no depende de quién construye). */
export function formatListingDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(iso))
    .replace(/\./g, '');
}

/** Una fecha lista para pintar: ISO para `datetime` y la etiqueta en el idioma de la página. */
export interface DateView {
  iso: string;
  label: string;
}

/** Una página del árbol de una lista. */
export interface ListingTreeItem {
  slug: string;
  title: string;
  href: string;
  badge?: Locale;
  summary?: string;
  updated?: DateView;
}

/** Un grupo del árbol de una lista. */
export interface ListingTreeGroup {
  label: string;
  href?: string;
  items: ListingTreeNode[];
}

export type ListingTreeNode = ListingTreeItem | ListingTreeGroup;

export function isListingTreeGroup(node: ListingTreeNode): node is ListingTreeGroup {
  return 'items' in node;
}

/** Una sección de una lista (una de `nav`, o las páginas sin sección, sin etiqueta). */
export interface ListingViewSection {
  label?: string;
  id?: string;
  nodes: ListingTreeNode[];
}

/** Una entrada de una tabla o de unas tarjetas: su portada decidida (`C` es la forma de la imagen). */
export interface ListingItem<C = EntryCover> extends ListingTreeItem {
  path: string[];
  cover: C;
  /** Dibujo de la portada de la librería, estable por página. */
  pattern: CoverPattern;
}

/** Una opción del selector «Por página»: su tamaño y la URL de su página 1. */
export interface SizeChoice {
  size: number;
  href: string;
  current: boolean;
}

export type ListingView<C = EntryCover> =
  | { layout: 'list'; sections: ListingViewSection[]; headings: TocHeading[]; empty: boolean }
  | {
      layout: 'table' | 'cards';
      /** Solo las de esta página, de la más reciente a la más antigua. */
      items: ListingItem<C>[];
      total: number;
      range: { from: number; to: number };
      /** Si el tamaño actual tiene más de una página: las URLs de todas (la posición 0 es la 1). */
      pager?: { page: number; pages: number; hrefs: string[] };
      /** Si elegir tamaño cambia algo: más de una opción y no todo cabe en la más pequeña. */
      sizes?: SizeChoice[];
      /** Desde la página 2: el título de la página y «Página n de m», en lugar del cuerpo. */
      pageHeading?: { title: string; page: string };
    };

/** Puerto: la URL de una posición del listado (base, barra final e idioma los pone `astro/`). */
export interface ListingHrefs {
  at(position: ListingPosition): string;
}

/** Lo que necesita `buildListingView`. */
export interface ListingViewInput {
  listing: Listing;
  options: ListingOptions;
  /** La posición de la ruta; sin ella, la página 1 del tamaño por defecto. Una lista la ignora. */
  position?: ListingPosition;
  locale: Locale;
  strings: UiStrings;
  /** Título de la página del listado, para el encabezado desde la página 2. */
  title: string;
}

function dateOf(iso: string | undefined, locale: Locale): DateView | undefined {
  return iso === undefined ? undefined : { iso, label: formatListingDate(iso, locale) };
}

function treeItemOf(entry: ListingEntry, locale: Locale): ListingTreeItem {
  const updated = dateOf(entry.updated, locale);
  return {
    slug: entry.slug,
    title: entry.title,
    href: entry.href,
    ...(entry.badge && { badge: entry.badge }),
    ...(entry.summary !== undefined && { summary: entry.summary }),
    ...(updated && { updated }),
  };
}

function treeOf(nodes: ListingNode[], locale: Locale): ListingTreeNode[] {
  return nodes.map((node) =>
    isListingGroup(node)
      ? {
          label: node.label,
          ...(node.href !== undefined && { href: node.href }),
          items: treeOf(node.items, locale),
        }
      : treeItemOf(node, locale),
  );
}

/** El modelo de vista del listado en la posición pedida. */
export function buildListingView(input: ListingViewInput, hrefs: ListingHrefs): ListingView {
  const { listing, options, locale, strings, title } = input;
  if (!isPagedListing(options)) {
    const sections = listing.sections.map((section) => ({
      ...(section.label !== undefined && { label: section.label }),
      ...(section.id !== undefined && { id: section.id }),
      nodes: treeOf(section.nodes, locale),
    }));
    return {
      layout: 'list',
      sections,
      headings: sections.flatMap((section) =>
        section.id === undefined || section.label === undefined
          ? []
          : [{ depth: 2, slug: section.id, text: section.label }],
      ),
      empty: sections.length === 0,
    };
  }
  const position = input.position ?? { perPage: options.pageSize, page: 1 };
  const total = listing.entries.length;
  const paged = paginate(sortByUpdated(listing.entries), position.page, position.perPage);
  const items = paged.rows.map((entry): ListingItem => ({
    ...treeItemOf(entry, locale),
    path: entry.path,
    cover: coverFor(entry.cover, options.covers, entry.imageAlt),
    pattern: coverPattern(entry.slug),
  }));
  const [smallest] = options.perPageOptions;
  const choosable = options.perPageOptions.length > 1 && smallest !== undefined && total > smallest;
  return {
    layout: options.view,
    items,
    total,
    range: { from: paged.from, to: paged.to },
    ...(paged.pages > 1 && {
      pager: {
        page: paged.page,
        pages: paged.pages,
        hrefs: Array.from({ length: paged.pages }, (_item, index) =>
          hrefs.at({ perPage: position.perPage, page: index + 1 }),
        ),
      },
    }),
    ...(choosable && {
      sizes: options.perPageOptions.map((size) => ({
        size,
        href: hrefs.at({ perPage: size, page: 1 }),
        current: size === position.perPage,
      })),
    }),
    ...(paged.page > 1 && {
      pageHeading: {
        title,
        page: translate(strings, 'listing.pageOf', {
          page: String(paged.page),
          pages: String(paged.pages),
        }),
      },
    }),
  };
}
