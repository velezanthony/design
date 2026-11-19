import type { SeoInput, SeoPageInput } from '../../../core/seo-on-page/tree/input';
import { CONTENT_METADATA_KEY } from '../../../core/seo-on-page/nodes/content';
import { siteFiles, type SiteFile } from '../../../core/seo-on-page/site-files';
import { routePath, type ClientPage } from '../../../core/seo/client-pages';
import { clientSitemapEntries } from '../../../core/seo/sitemap';
import { loadClientPages, type ClientPages } from '../client-pages';
import { clientRegistry } from '../../registry';
import { buildSeoTree } from '../../../core/seo-on-page/tree/build-tree';
import type {
  HeadingNode,
  PageImage,
  PageLink,
  SeoTree,
} from '../../../core/seo-on-page/tree/types';
import { readPublic } from '../../loader/images';
import { urlPolicyOf } from '../../config';
import { pageOf, sitemapXml } from '../../views/pages';
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

/** Colección + config de Astro → entrada del análisis; solo pasa lo que el SEO usa del módulo virtual. */
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
  return {
    config: seoConfig,
    url: urlPolicyOf(config, config.defaultLocale),
    pages,
    ...(imageSizes && { imageSizes }),
  };
}

/** Encabezados guardados por el loader (`rendered.metadata`) o, si faltan, los de `render`. */
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

/** Lo que necesita una pantalla del panel, con la colección leída UNA vez; las páginas ilegibles vuelven en `failures`. */
export async function loadPanel(
  config: VirtualConfig,
  origin: string,
): Promise<{
  /** Los datos de la colección, para la cabecera, el pie y el enlace de edición. */
  docs: DocData[];
  tree: SeoTree;
  client: ClientPage[];
  failures: ClientPages['failures'];
  /** Los ficheros del sitio que sustituyen rutas de la librería, con la ruta tal como se visita. */
  overrides: { file: string; path: string }[];
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
    overrides: (clientRegistry().overrides ?? []).map(({ file, route }) => ({
      file,
      path: routePath(route),
    })),
    hrefs: devHrefs(urlPolicyOf(config, config.defaultLocale)),
  };
}

/** Archivos de sitio del panel: el sitemap de dev, y `robots.txt`/`llms.txt` del `public/` del consumidor. */
export async function loadSiteFiles(
  config: VirtualConfig,
  docs: DocData[],
  client: ClientPage[] = [],
): Promise<SiteFile[]> {
  const publicDir = new URL(config.publicDir);
  async function exists(file: string) {
    return (await readPublic(publicDir, file)) !== undefined;
  }
  const sitemap = sitemapXml(docs, config, clientSitemapEntries(client, new URL(config.site)));
  return siteFiles({
    url: urlPolicyOf(config, config.defaultLocale),
    sitemapUrls: sitemap.split('<loc>').length - 1,
    robots: await exists('/robots.txt'),
    llms: await exists('/llms.txt'),
    ...(config.favicon !== undefined && { favicon: config.favicon }),
  });
}
