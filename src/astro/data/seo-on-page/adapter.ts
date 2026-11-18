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
import { readPublic } from '../../loader/images';
import { pageOf, sitemapXml, urlPolicyOf } from '../../views/pages';
import type { DocData } from '../../loader/schema';
import { getDocs, renderDoc, type DocsEntry } from '../docs-collection';
import { siteImageSizes } from '../image-sizes';
import { devHrefs, type DevHrefs } from '../../views/seo-on-page/hrefs';
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

/** El árbol del análisis con la colección y las páginas de `src/pages/` ya leídas: lo que se publica. */
export async function loadSeoTree(
  config: VirtualConfig,
  docs: readonly DocsEntry[],
  client: ClientPage[] = [],
): Promise<SeoTree> {
  const entries = await Promise.all(
    docs.map(async (entry) => ({
      data: entry.data,
      headings: await headingsOf(entry),
      ...contentOf(entry),
    })),
  );
  const sizes = await siteImageSizes(
    config,
    docs.map((entry) => entry.data.seo?.image?.src),
  );
  return buildSeoTree({ ...seoInputOf(entries, config, sizes), client });
}

/**
 * Todo lo que necesita una pantalla del panel, con la colección leída UNA vez. Las páginas de
 * `src/pages/` que no se pudieron leer vuelven en `failures`, para avisar en pantalla.
 */
export async function loadPanel(
  config: VirtualConfig,
  origin: string,
): Promise<{
  /** Los datos de la colección, para la cabecera, el pie y el enlace de edición. */
  docs: DocData[];
  tree: SeoTree;
  client: ClientPage[];
  failures: ClientPages['failures'];
  overrides: NonNullable<ClientRegistry['overrides']>;
  hrefs: DevHrefs;
}> {
  const entries = await getDocs();
  const { pages, failures } = await loadClientPages({
    origin,
    site: config.site,
    base: config.base,
  });
  return {
    docs: entries.map((entry) => entry.data),
    tree: await loadSeoTree(config, entries, pages),
    client: pages,
    failures,
    overrides: clientRegistry().overrides ?? [],
    hrefs: devHrefs(urlPolicyOf(config)),
  };
}

/**
 * Los archivos de sitio del panel. Las URLs del sitemap son las mismas que sirve en dev, con las
 * páginas de `src/pages/`; `robots.txt` y `llms.txt` se buscan en el `public/` del consumidor.
 */
export async function loadSiteFiles(
  config: VirtualConfig,
  docs: DocData[],
  client: ClientPage[] = [],
): Promise<SiteFile[]> {
  const publicDir = new URL(config.publicDir);
  const exists = async (file: string) => (await readPublic(publicDir, file)) !== undefined;
  const sitemap = sitemapXml(docs, config, clientSitemapEntries(client, new URL(config.site)));
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
