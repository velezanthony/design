import { readFile, writeFile } from 'node:fs/promises';
import { builtClientPages, type ClientPage } from '../../../core/seo/client-pages';
import { readHead } from '../../../core/seo/html-head';
import { appendToSitemap, clientSitemapEntries } from '../../../core/seo/sitemap';
import { lastModifiedDates } from '../../data/last-modified';
import { clientRegistry, type ClientRegistry } from '../../registry';
import { trimBase } from '../../../core/shared/urls';

interface Built {
  /** La carpeta del build (`dist/`). */
  dir: URL;
  /** Las páginas generadas, como las da `astro:build:done` (`cv/`, sin la base). */
  pages: { pathname: string }[];
  site: string;
  base: string;
  /** El fichero con las páginas propias (`sitemapFiles`). */
  pagesFile: string;
  /** La raíz del proyecto (ruta de disco): de ahí cuelgan los archivos de las páginas. */
  root: string;
}

/** Fecha por archivo, que es lo que `lastmod` necesita; inyectable para probar sin git. */
type DatesOf = (root: string, files: string[]) => Promise<Map<string, string>>;

async function readIfExists(url: URL) {
  return readFile(url, 'utf8').catch(() => undefined);
}

/** El HTML de una página generada, con `build.format` de carpetas (`cv/index.html`) o de ficheros (`cv.html`). */
async function builtHtml(directory: URL, pathname: string): Promise<string | undefined> {
  const folder = pathname === '' || pathname.endsWith('/') ? pathname : `${pathname}/`;
  return (
    (await readIfExists(new URL(`${folder}index.html`, directory))) ??
    (await readIfExists(new URL(`${pathname.replace(/\/$/, '')}.html`, directory)))
  );
}

/** `astro:build:done`: añade al sitemap las páginas del cliente indexables y canónicas de sí mismas, leídas del HTML generado. */
export async function addClientPagesToSitemap(
  built: Built,
  registry: ClientRegistry = clientRegistry(),
  datesOf: DatesOf = lastModifiedDates,
): Promise<number> {
  const refs = builtClientPages(
    built.pages.map(({ pathname }) => pathname),
    registry.routes,
    built.base,
  );
  const pages: ClientPage[] = [];
  for (const ref of refs) {
    const pathname = ref.path.slice(trimBase(built.base).length + 1);
    const html = await builtHtml(built.dir, pathname);
    if (html) pages.push({ ...ref, head: readHead(html, new URL(ref.path, built.site)) });
  }
  const dates = await datesOf(
    built.root,
    pages.map(({ entrypoint }) => entrypoint),
  );
  const entries = clientSitemapEntries(pages, new URL(built.site), dates);
  if (entries.length === 0) return 0;
  const file = new URL(built.pagesFile, built.dir);
  const xml = await readIfExists(file);
  if (xml === undefined) return 0;
  await writeFile(file, appendToSitemap(xml, entries));
  return entries.length;
}
