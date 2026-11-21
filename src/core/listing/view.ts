import type { IndexLayout } from '../config/indexes';
import type { Locale } from '../i18n/locale';
import type { EntryCover } from './covers';
import type { ListingEntry, ListingSection } from './entries';

/* Lo que pinta el índice de una página: las entradas con su portada ya decidida, la paginación y el
   selector «Por página». */

/** Nombres de la query del selector «Por página»: `?por=18&pagina=2`. */
export const PER_PAGE_PARAM = 'por';
export const PAGE_PARAM = 'pagina';

/** Fecha de una entrada: formato medio del idioma, en UTC (la de un commit no depende de quién construye). */
export function formatListingDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(iso))
    .replace(/\./g, '');
}

/** Una entrada lista para pintar: su portada ya decidida. */
export interface IndexItem<C = EntryCover> extends Omit<ListingEntry, 'cover' | 'imageAlt'> {
  cover: C;
}

/** Las páginas de un tamaño del selector y sus URLs (la posición 0 es la página 1). */
export interface IndexSize {
  perPage: number;
  pages: number;
  hrefs: string[];
}

/** Todo lo que pinta el índice de una página. */
export interface IndexView<C = EntryCover> {
  layout: IndexLayout;
  /** Disposición lista: las secciones con sus grupos (vacío en las demás). */
  sections: ListingSection[];
  /** Tabla y tarjetas: las entradas, de la más reciente a la más antigua. En la página 1, todas (`all`); en las demás, solo las suyas. */
  items: IndexItem<C>[];
  /** `items` trae todas las entradas: sin JavaScript se ven las `perPage` primeras y el selector cambia cuántas. */
  all: boolean;
  /** Entradas por página de las rutas estáticas. */
  perPage: number;
  /** Opciones del selector «Por página» (vacío en la lista o con una sola opción útil). */
  perPageOptions: number[];
  /** Solo en la página 1: por cada opción, sus páginas y la URL de cada una (las del tamaño de la config son las estáticas). */
  sizes: IndexSize[];
  page: number;
  pages: number;
  /** Entradas de todo el listado. */
  total: number;
  /** URL de cada página del listado; la posición 0 es la página 1. */
  hrefs: string[];
  /** Encabezados que añade el listado (las secciones de la lista), para el índice de la página. */
  headings: { depth: number; slug: string; text: string }[];
  /** Desde la página 2: el título de la página y «Página n de m», en lugar del cuerpo. */
  heading?: { title: string; page: string };
}
