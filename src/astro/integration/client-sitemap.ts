import { readFile, writeFile } from 'node:fs/promises';
import { builtClientPages, type ClientPage } from '../../core/seo/client-pages';
import { readHead } from '../../core/seo/html-head';
import { appendToSitemap, clientSitemapEntries, SITEMAP_PAGES } from '../../core/seo/sitemap';
import { clientRegistry, type ClientRegistry } from '../data/client-registry';
import { trimBase } from '../../core/shared/urls';

interface Built {
  /** La carpeta del build (`dist/`). */
  dir: URL;
  /** Las páginas generadas, como las da `astro:build:done` (`cv/`, sin la base). */
  pages: { pathname: string }[];
  site: string;
  base: string;
  /** `sitemap.xml` es un índice (hay `sitemap.include`): las páginas van en `sitemap-pages.xml`. */
  index: boolean;
}

const readIfExists = (url: URL) => readFile(url, 'utf8').catch(() => undefined);

/** El HTML de una página generada, con `build.format` de carpetas (`cv/index.html`) o de ficheros (`cv.html`). */
async function builtHtml(dir: URL, pathname: string): Promise<string | undefined> {
  const folder = pathname === '' || pathname.endsWith('/') ? pathname : `${pathname}/`;
  return (
    (await readIfExists(new URL(`${folder}index.html`, dir))) ??
    (await readIfExists(new URL(`${pathname.replace(/\/$/, '')}.html`, dir)))
  );
}

/**
 * `astro:build:done`: añade al sitemap que generó la librería las páginas del cliente
 * (`src/pages/`), leídas del HTML que se acaba de generar con el mismo `readHead` que usa el panel.
 * Solo entran las indexables y canónicas de sí mismas. Devuelve cuántas añadió.
 */
export async function addClientPagesToSitemap(
  built: Built,
  registry: ClientRegistry = clientRegistry(),
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
  const entries = clientSitemapEntries(pages, new URL(built.site));
  if (entries.length === 0) return 0;
  const file = new URL(built.index ? SITEMAP_PAGES : 'sitemap.xml', built.dir);
  const xml = await readIfExists(file);
  if (xml === undefined) return 0;
  await writeFile(file, appendToSitemap(xml, entries));
  return entries.length;
}
