import type { ListingFrontmatter, PageSeoOverride } from '../config/schema';
import type { MissingTranslation } from '../i18n/translation-policy';
import type { Page, PageKind } from './discovery';

/* Una página tal como la guarda el loader en la colección (`DocData`), vuelta a `Page` del núcleo. Se
   describe aquí por su forma, sin depender de Astro: el núcleo no conoce el esquema de la colección. */

/** Lo que el núcleo lee de una entrada de la colección (`DocData` cumple esta forma). */
export interface StoredPage {
  slug: string;
  urlSlug?: string;
  locale: string;
  title: string;
  /** Sin él, nativa (el valor por defecto del esquema). */
  kind?: PageKind;
  sourcePath: string;
  order?: number;
  seo?: PageSeoOverride;
  translations?: MissingTranslation;
  listing?: ListingFrontmatter;
  /** Lo que se guarda del bloque `index` (la portada guardada se queda en los datos: la lee la vista del listado). */
  index?: { summary?: string; imageAlt?: string; cover?: unknown };
}

/** `Page` del núcleo a partir de los datos de la colección; el cuerpo no se arrastra. */
export function pageOf(item: StoredPage): Page {
  const index = entryIndexOf(item);
  return {
    slug: item.slug,
    ...(item.urlSlug !== undefined && { urlSlug: item.urlSlug }),
    locale: item.locale,
    title: item.title,
    kind: item.kind ?? 'native',
    sourcePath: item.sourcePath,
    body: '',
    ...(item.order !== undefined && { order: item.order }),
    ...(item.seo && { seo: item.seo }),
    ...(item.translations && { translations: item.translations }),
    ...(item.listing && { listing: item.listing }),
    ...(index && { index }),
  };
}

/** El bloque `index` que entiende el núcleo; la portada guardada se queda en los datos (la lee la vista del índice). */
function entryIndexOf(item: StoredPage): Page['index'] {
  const { summary, imageAlt } = item.index ?? {};
  if (summary === undefined && imageAlt === undefined) return undefined;
  return {
    ...(summary !== undefined && { summary }),
    ...(imageAlt !== undefined && { imageAlt }),
  };
}

export function pagesOf(data: readonly StoredPage[]): Page[] {
  return data.map(pageOf);
}
