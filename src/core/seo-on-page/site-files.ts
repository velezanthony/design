import type { UrlPolicy } from '../i18n/availability';
import { DEFAULT_FAVICON_PATH, isLocalFavicon, resolveFavicon } from '../seo/favicon';
import { withBase } from '../shared/urls';

/** Los archivos de sitio que el panel enseña, en este orden. */
export type SiteFileId = 'sitemap' | 'robots' | 'llms' | 'favicon' | 'pagefind';

/** `generated`: la librería lo genera; `public`: lo pone el consumidor; también «no existe» o «tras la build». */
export type SiteFileState = 'generated' | 'present' | 'absent' | 'build-only';

export interface SiteFile {
  id: SiteFileId;
  /** Ruta tal como se muestra, sin `base`. */
  path: string;
  state: SiteFileState;
  /** Enlace para abrirlo en desarrollo (con `base`); sin él, no se puede abrir. */
  href?: string;
  /** Solo el sitemap: URLs que lleva. */
  urls?: number;
}

/** Hechos que el adaptador reúne (config y disco); aquí solo se interpretan. */
export interface SiteFilesFacts {
  url: UrlPolicy;
  sitemapUrls: number;
  /** `public/robots.txt` existe. */
  robots: boolean;
  /** `public/llms.txt` existe. */
  llms: boolean;
  /** El `favicon` de la config; sin él se usa el del paquete. */
  favicon?: string;
}

/** Archivo que el consumidor puede tener en `public/`: ausente es un estado, no una incidencia. */
function publicFile(id: 'robots' | 'llms', url: UrlPolicy, exists: boolean): SiteFile {
  const path = `/${id}.txt`;
  return exists
    ? { id, path, state: 'present', href: withBase(url.base, path) }
    : { id, path, state: 'absent' };
}

/** Las entradas del panel «Archivos del sitio», ya decididas: la UI solo las pinta. */
export function siteFiles(facts: SiteFilesFacts): SiteFile[] {
  const { url } = facts;
  const favicon = resolveFavicon(facts.favicon, url.base);
  const faviconPath =
    facts.favicon === undefined
      ? DEFAULT_FAVICON_PATH
      : isLocalFavicon(facts.favicon)
        ? `/${facts.favicon.replace(/^\/+/, '')}`
        : facts.favicon;
  return [
    {
      id: 'sitemap',
      path: '/sitemap.xml',
      state: 'generated',
      href: withBase(url.base, '/sitemap.xml'),
      urls: facts.sitemapUrls,
    },
    publicFile('robots', url, facts.robots),
    publicFile('llms', url, facts.llms),
    {
      id: 'favicon',
      path: faviconPath,
      state: facts.favicon === undefined ? 'generated' : 'present',
      href: favicon.href,
    },
    { id: 'pagefind', path: '/pagefind/', state: 'build-only' },
  ];
}
