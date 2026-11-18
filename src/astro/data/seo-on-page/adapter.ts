import type { SeoInput, SeoPageInput } from '../../../core/seo-on-page/tree/input';
import { CONTENT_METADATA_KEY } from '../../../core/seo-on-page/nodes/content';
import { siteFiles, type SiteFile } from '../../../core/seo-on-page/site-files';
import type { ClientPage } from '../../../core/seo/client-pages';
import { clientSitemapEntries } from '../../../core/seo/sitemap';
import { loadClientPages, type ClientPages } from '../client-pages';
import { clientRegistry, type ClientRegistry } from '../client-registry';
import { buildSeoTree } from '../../../core/seo-on-page/tree/build-tree';
import type {
  HeadingNode,
  PageImage,
  PageLink,
  SeoTree,
} from '../../../core/seo-on-page/tree/types';
import { readImageSizes, readPublic } from '../../loader/images';
import { pageOf, sitemapXml, urlPolicyOf } from '../../views/pages';
import type { DocData } from '../../loader/schema';
import { getDocs, renderDoc, type DocsEntry } from '../docs-collection';
import type { VirtualConfig } from '../../virtual/data';

/** Una entrada de la colección con sus encabezados ya resueltos. */
export interface SeoEntry {
  data: DocData;
  headings: HeadingNode[];
  /** Lo que el cuerpo enlaza y muestra; sin ello (la entrada no lo trae) el análisis no lo juzga. */
  links?: PageLink[];
  images?: PageImage[];
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
  const pages = entries.map(({ data, headings, links, images }): SeoPageInput => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { body, order, ...page } = pageOf(data);
    return { ...page, headings, ...(links && { links }), ...(images && { images }) };
  });
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

/** Lo que el loader guardó del cuerpo de la entrada (enlaces e imágenes); `undefined` si no lo trae. */
function contentOf(entry: DocsEntry): { links?: PageLink[]; images?: PageImage[] } {
  const stored = (entry as { rendered?: { metadata?: Record<string, unknown> } }).rendered
    ?.metadata?.[CONTENT_METADATA_KEY] as { links: PageLink[]; images: PageImage[] } | undefined;
  return stored ?? {};
}

/**
 * El único punto del panel que conoce `astro:content`: lee la colección con la que se genera el
 * sitio y devuelve el árbol del análisis. Sin rastreo ni HTML: lo que se analiza es lo que se publica.
 * Las páginas que el cliente añade en `src/pages/` (`loadClientPages`) se suman ya leídas.
 */
export async function loadSeoTree(
  config: VirtualConfig,
  client: ClientPage[] = [],
): Promise<SeoTree> {
  const docs = await getDocs();
  const entries = await Promise.all(
    docs.map(async (entry) => ({
      data: entry.data,
      headings: await headingsOf(entry),
      ...contentOf(entry),
    })),
  );
  const sizes = await readImageSizes(
    [config.seo.image?.src, ...docs.map((entry) => entry.data.seo?.image?.src)].filter(
      (src) => src !== undefined,
    ),
    new URL(config.publicDir),
  );
  return buildSeoTree({ ...seoInputOf(entries, config, sizes), client });
}

/**
 * El árbol del panel con todo lo que publica el sitio: la colección y las páginas que el cliente
 * añade en `src/pages/`, que se piden al servidor de desarrollo en el que corre el propio panel. Las
 * que no se pudieron leer vuelven aparte, para avisar en pantalla en vez de que desaparezcan.
 */
export async function loadPanelTree(
  config: VirtualConfig,
  origin: string,
): Promise<{
  tree: SeoTree;
  /** Las páginas de `src/pages/` ya leídas, para quien las necesite además del árbol. */
  client: ClientPage[];
  failures: ClientPages['failures'];
  overrides: NonNullable<ClientRegistry['overrides']>;
}> {
  const { pages, failures } = await loadClientPages({
    origin,
    site: config.site,
    base: config.base,
  });
  return {
    tree: await loadSeoTree(config, pages),
    client: pages,
    failures,
    overrides: clientRegistry().overrides ?? [],
  };
}

/** Los datos de la colección tal cual, para que la cabecera y el pie del panel se resuelvan como los del sitio. */
export async function loadDocData(): Promise<DocData[]> {
  return (await getDocs()).map((entry) => entry.data);
}

/**
 * Los archivos de sitio del panel. Las URLs del sitemap son las mismas que sirve en dev, con las
 * páginas de `src/pages/`; `robots.txt` y `llms.txt` se buscan en el `public/` del consumidor.
 */
export async function loadSiteFiles(
  config: VirtualConfig,
  client: ClientPage[] = [],
): Promise<SiteFile[]> {
  const publicDir = new URL(config.publicDir);
  const exists = async (file: string) => (await readPublic(publicDir, file)) !== undefined;
  const sitemap = sitemapXml(
    await loadDocData(),
    config,
    clientSitemapEntries(client, new URL(config.site)),
  );
  return siteFiles({
    url: urlPolicyOf(config),
    locales: config.locales,
    sitemapUrls: sitemap.split('<loc>').length - 1,
    robots: await exists('/robots.txt'),
    llms: await exists('/llms.txt'),
    privacyPage: config.privacy.page,
    ...(config.favicon !== undefined && { favicon: config.favicon }),
  });
}
