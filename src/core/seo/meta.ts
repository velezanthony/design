import type { ResolvedConfig } from '../config/resolve';
import type { Label, PageSeoOverride } from '../config/schema';
import type { Locale } from '../i18n/locale';
import { resolveTitleSuffix } from './title';

/** Base SEO del sitio: la de la config ya con los valores por defecto. */
export type SeoBase = ResolvedConfig['seo'];

/** Metadatos de una página tras la cascada. `width`/`height` los rellena el adaptador al leer la imagen. */
export interface ResolvedMeta {
  title: string;
  description?: string;
  image?: { src: string; alt: string; width?: number; height?: number };
  noindex: boolean;
  /** Sufijo ya resuelto para el idioma de la página; sin él, el `<title>` es solo el título. */
  titleSuffix?: string;
}

/** Valor de un `Label` en un idioma; `undefined` si el `Label` por idioma no lo trae. */
function labelFor(label: Label | undefined, locale: Locale): string | undefined {
  return typeof label === 'string' || label === undefined ? label : label[locale];
}

/**
 * Cascada SEO campo a campo: override de la página > base > derivado (el H1 para el título; nada
 * para la descripción; el sufijo del título cierra con el de la librería). La imagen es una unidad: si la página trae `src` sin `alt`, el `alt` es el
 * título de la PÁGINA, nunca el de la imagen base. `seo.title` solo afecta al head.
 */
export function resolveMeta(
  base: SeoBase,
  override: PageSeoOverride | undefined,
  page: { title: string },
  locale: Locale,
): ResolvedMeta {
  const description = labelFor(override?.description, locale) ?? labelFor(base.description, locale);
  const source = override?.image ?? base.image;
  const image = source && {
    src: source.src,
    alt: labelFor(source.alt, locale) ?? page.title,
  };
  const titleSuffix = resolveTitleSuffix(override?.titleSuffix, base.titleSuffix, locale);
  return {
    title: override?.title ?? page.title,
    ...(description !== undefined && { description }),
    ...(image && { image }),
    noindex: override?.noindex ?? false,
    ...(titleSuffix !== undefined && { titleSuffix }),
  };
}

/** Dimensiones leídas de las imágenes locales, por su `src` (las https no figuran). */
export type ImageSizes = ReadonlyMap<string, { width: number; height: number }>;

/** Completa `width`/`height` de la imagen con las dimensiones leídas, si se conocen. */
export function withImageSize(meta: ResolvedMeta, sizes: ImageSizes): ResolvedMeta {
  const size = meta.image && sizes.get(meta.image.src);
  if (!meta.image || !size) return meta;
  return { ...meta, image: { ...meta.image, width: size.width, height: size.height } };
}
