import { ListingView, type ResolvedIndexes } from '../config/indexes';
import type { ListingFrontmatter } from '../config/schema';

/* El listado ya resuelto de una página: de qué carpeta, con qué disposición, cuántas entradas por
   página y qué portadas. Precedencia: el bloque `listing:` de su `_index.md` → `overrides` de su
   carpeta → `indexes` → valores por defecto. */

/** Disposiciones que se paginan: la lista es el árbol entero. */
type PagedLayout = Exclude<ListingView, typeof ListingView.LIST>;

/** Entradas por página de cada disposición paginada: las tarjetas de 12 en 12 (filas completas a 2 y a 3
    columnas) y la tabla de 10 en 10, la medida redonda de una tabla. La lista no se pagina. */
export const DEFAULT_PAGE_SIZES: Record<PagedLayout, number> = { table: 10, cards: 12 };

/** Opciones del selector «Por página» de cada disposición paginada. */
export const DEFAULT_PER_PAGE_OPTIONS: Record<PagedLayout, number[]> = {
  table: [10, 25, 50],
  cards: [12, 24, 48],
};

/** Un listado que se pagina (tabla o tarjetas). */
export interface PagedListingOptions {
  folder: string;
  layout: PagedLayout;
  /** Entradas por página de las rutas estáticas. */
  pageSize: number;
  /** Opciones del selector «Por página», ordenadas y con `pageSize` entre ellas. */
  perPageOptions: number[];
  /** Política de portadas: `true` pone la de la librería a quien no trae imagen. */
  covers: boolean;
}

/** El listado de una página: una lista (sin paginar) o uno paginado. */
export type ListingOptions =
  { folder: string; layout: typeof ListingView.LIST; covers: boolean } | PagedListingOptions;

/** ¿Se pagina este listado? */
export function isPagedListing(options: ListingOptions): options is PagedListingOptions {
  return options.layout !== ListingView.LIST;
}

/** Las opciones con el tamaño de las rutas estáticas siempre entre ellas, ordenadas y sin repetir. */
function withPageSize(options: readonly number[], pageSize: number): number[] {
  return [...new Set([...options, pageSize])].sort((left, right) => left - right);
}

/** Lo que necesita `resolveListing`. */
export interface ListingSource {
  folder: string;
  /** El bloque `listing:` de su `_index.md` (`{}` en una página generada). */
  own: ListingFrontmatter;
  indexes: ResolvedIndexes | undefined;
}

/** El listado de la carpeta `folder` con la precedencia `own` → `overrides` → `indexes` → valores por defecto. */
export function resolveListing({ folder, own, indexes }: ListingSource): ListingOptions {
  const override = indexes?.overrides[folder];
  const layout = own.layout ?? override?.layout ?? indexes?.layout ?? ListingView.LIST;
  const covers = own.covers ?? override?.covers ?? indexes?.covers ?? true;
  if (layout === ListingView.LIST) return { folder, layout, covers };
  const pageSize =
    own.pageSize ?? override?.pageSize ?? indexes?.pageSize ?? DEFAULT_PAGE_SIZES[layout];
  const options =
    own.perPageOptions ??
    override?.perPageOptions ??
    indexes?.perPageOptions ??
    DEFAULT_PER_PAGE_OPTIONS[layout];
  return { folder, layout, pageSize, perPageOptions: withPageSize(options, pageSize), covers };
}
