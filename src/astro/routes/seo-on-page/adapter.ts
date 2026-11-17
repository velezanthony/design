import type { SeoInput, SeoPageInput } from '../../../core/seo-on-page/tree/input';
import { buildSeoTree } from '../../../core/seo-on-page/tree/build-tree';
import type { HeadingNode, SeoTree } from '../../../core/seo-on-page/tree/types';
import { readImageSizes } from '../../loader/images';
import { urlPolicyOf } from '../pages';
import type { DocData } from '../pages';
import { getDocs, renderDoc, type DocsEntry } from '../docs-collection';
import type { VirtualConfig } from '../../virtual/data';

/** Una entrada de la colección con sus encabezados ya resueltos. */
export interface SeoEntry {
  data: DocData;
  headings: HeadingNode[];
}

/**
 * Datos de la colección + config de Astro → entrada del análisis. Pura: no sabe de `astro:content`.
 * Del módulo virtual solo pasa lo que el SEO usa (se descartan `strings` y compañía), para que el
 * análisis no dependa de los textos de interfaz.
 */
export function seoInputOf(
  entries: readonly SeoEntry[],
  config: VirtualConfig,
  imageSizes?: SeoInput['imageSizes'],
): SeoInput {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { strings, ...seoConfig } = config;
  const pages = entries.map(({ data, headings }): SeoPageInput => ({
    slug: data.slug,
    locale: data.locale,
    title: data.title,
    kind: data.kind ?? 'native',
    sourcePath: data.sourcePath,
    ...(data.seo && { seo: data.seo }),
    ...(data.translations && { translations: data.translations }),
    headings,
  }));
  return { config: seoConfig, url: urlPolicyOf(config), pages, ...(imageSizes && { imageSizes }) };
}

/**
 * Encabezados de una entrada: los que el loader guardó al renderizar (`rendered.metadata`) o, si la
 * entrada no los trae, los que devuelve `render`. Son los mismos que pinta la página real.
 */
async function headingsOf(entry: DocsEntry): Promise<HeadingNode[]> {
  const stored = (entry as { rendered?: { metadata?: { headings?: HeadingNode[] } } }).rendered
    ?.metadata?.headings;
  return stored ?? (await renderDoc(entry)).headings;
}

/**
 * El único punto del panel que conoce `astro:content`: lee la colección con la que se genera el
 * sitio y devuelve el árbol del análisis. Sin rastreo ni HTML: lo que se analiza es lo que se publica.
 */
export async function loadSeoTree(config: VirtualConfig): Promise<SeoTree> {
  const docs = await getDocs();
  const entries = await Promise.all(
    docs.map(async (entry) => ({ data: entry.data, headings: await headingsOf(entry) })),
  );
  const sizes = await readImageSizes(
    [config.seo.image?.src, ...docs.map((entry) => entry.data.seo?.image?.src)].filter(
      (src) => src !== undefined,
    ),
    new URL(config.publicDir ?? 'file:///'),
  );
  return buildSeoTree(seoInputOf(entries, config, sizes));
}

/** Los datos de la colección tal cual, para que la cabecera y el pie del panel se resuelvan como los del sitio. */
export async function loadDocData(): Promise<DocData[]> {
  return (await getDocs()).map((entry) => entry.data);
}
