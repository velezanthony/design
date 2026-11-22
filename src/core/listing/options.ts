import { folderSettings, ListingView, type ResolvedFolders } from '../config/folders';

/* El listado ya resuelto de una página: de qué carpeta, con qué vista, cuántas entradas por página y
   qué portadas. Cada ajuste sale de `folders` (`folderSettings`: la carpeta declarada más cercana,
   luego `'*'`, luego el valor por defecto); sin tamaño declarado, el de la vista. */

/** Vistas que se paginan: la lista es el árbol entero. */
type PagedLayout = Exclude<ListingView, typeof ListingView.LIST>;

/** Entradas por página de cada vista paginada: las tarjetas de 12 en 12 (filas completas a 2 y a 3
    columnas) y la tabla de 10 en 10, la medida redonda de una tabla. La lista no se pagina. */
export const DEFAULT_PAGE_SIZES: Record<PagedLayout, number> = { table: 10, cards: 12 };

/** Opciones del selector «Por página» de cada vista paginada. */
export const DEFAULT_PER_PAGE_OPTIONS: Record<PagedLayout, number[]> = {
  table: [10, 25, 50],
  cards: [12, 24, 48],
};

/** Un listado que se pagina (tabla o tarjetas). */
export interface PagedListingOptions {
  folder: string;
  view: PagedLayout;
  /** Entradas por página de las rutas estáticas. */
  pageSize: number;
  /** Opciones del selector «Por página», ordenadas y con `pageSize` entre ellas. */
  perPageOptions: number[];
  /** Política de portadas: `true` pone la de la librería a quien no trae imagen. */
  covers: boolean;
}

/** El listado de una página: una lista (sin paginar) o uno paginado. */
export type ListingOptions =
  { folder: string; view: typeof ListingView.LIST; covers: boolean } | PagedListingOptions;

/** ¿Se pagina este listado? */
export function isPagedListing(options: ListingOptions): options is PagedListingOptions {
  return options.view !== ListingView.LIST;
}

/** Las opciones con el tamaño de las rutas estáticas siempre entre ellas, ordenadas y sin repetir. */
function withPageSize(options: readonly number[], pageSize: number): number[] {
  return [...new Set([...options, pageSize])].sort((left, right) => left - right);
}

/** Lo que necesita `resolveListing`. */
export interface ListingSource {
  folder: string;
  folders: ResolvedFolders;
}

/** El listado de la carpeta `folder` con sus ajustes efectivos de `folders` (heredados por hoja). */
export function resolveListing({ folder, folders }: ListingSource): ListingOptions {
  const { listing } = folderSettings(folders, folder);
  const view = listing.view.value;
  const covers = listing.covers.value;
  if (view === ListingView.LIST) return { folder, view, covers };
  const pageSize = listing.pageSize.value ?? DEFAULT_PAGE_SIZES[view];
  const options = listing.perPageOptions.value ?? DEFAULT_PER_PAGE_OPTIONS[view];
  return { folder, view, pageSize, perPageOptions: withPageSize(options, pageSize), covers };
}
