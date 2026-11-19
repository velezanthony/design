import type { ResolvedConfig } from '../config/resolve';
import type { Availability, UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import { resolveFavicon } from './favicon';
import { serializeJsonLd } from './json-ld';
import type { ResolvedMeta } from './meta';
import { composeTitle } from './title';
import { withBase } from '../shared/urls';

/** Una etiqueta de `<head>` como dato; `Head.astro` solo la pinta. */
export interface HeadConfig {
  tag: 'title' | 'meta' | 'link' | 'script';
  attrs: Record<string, string>;
  /** Texto de `title`; en `script`, el JSON ya serializado y escapado (se inserta tal cual). */
  content?: string;
}

export type PageKind = 'page' | 'fallback';

/** Valores de `og:type` que usa la librería. */
export type OgType = 'article' | 'website';

/** Lo que el head necesita saber de la página que se renderiza. */
export interface PageData {
  kind: PageKind;
  slug: string;
  /** Idioma de la ruta (también en las de reserva, aunque el contenido sea de otro). */
  locale: Locale;
  /** URL de esta página con base, como en `Availability`. */
  url: string;
  /** Solo en `fallback`: URL (con base) del original, hacia la que apunta el `canonical`. */
  canonical?: string;
  /** `og:type`; por defecto `article`, que es lo que es una página de docs. */
  ogType?: OgType;
}

function meta(key: 'name' | 'property', name: string, content: string): HeadConfig {
  return {
    tag: 'meta',
    attrs: { [key]: name, content },
  };
}

/** `og:locale` del mapa de la config; sin él, `pt-BR` → `pt_BR`. */
function ogLocale(locale: Locale, map: Record<Locale, string> | undefined) {
  return map?.[locale] ?? locale.replace('-', '_');
}

/** Etiquetas del `<head>` como datos puros; canonical y alternates salen de las páginas reales, y `og:image` es absoluta salvo que ya sea https. */
export function buildHead(
  resolved: ResolvedMeta,
  page: PageData,
  availability: Availability,
  site: URL,
  config: Pick<ResolvedConfig, 'locales' | 'defaultLocale' | 'name' | 'favicon' | 'ogLocales'>,
  url: Pick<UrlPolicy, 'base'>,
): HeadConfig[] {
  function absolute(path: string) {
    return new URL(path, site).href;
  }
  const isPage = page.kind === 'page';
  const canonicalPath = isPage ? page.url : page.kind === 'fallback' ? page.canonical : undefined;
  const canonical = canonicalPath === undefined ? undefined : absolute(canonicalPath);
  const noindex = resolved.noindex || !isPage;
  const available = isPage && !noindex ? (availability.get(page.slug) ?? {}) : {};
  const languages = config.locales.filter((locale) => available[locale] !== undefined);

  // El mismo título completo en `<title>`, `og:title` y `twitter:title`.
  const fullTitle = composeTitle(resolved.title, resolved.titleSuffix);
  const tags: HeadConfig[] = [{ tag: 'title', attrs: {}, content: fullTitle }];
  tags.push({ tag: 'link', attrs: { rel: 'icon', ...resolveFavicon(config.favicon, url.base) } });
  if (resolved.description) tags.push(meta('name', 'description', resolved.description));
  if (canonical) tags.push({ tag: 'link', attrs: { rel: 'canonical', href: canonical } });
  if (noindex) tags.push(meta('name', 'robots', 'noindex'));

  if (languages.length > 1) {
    for (const locale of languages) {
      tags.push({
        tag: 'link',
        attrs: { rel: 'alternate', hreflang: locale, href: absolute(available[locale] ?? '') },
      });
    }
    const fallback = available[config.defaultLocale];
    if (fallback) {
      tags.push({
        tag: 'link',
        attrs: { rel: 'alternate', hreflang: 'x-default', href: absolute(fallback) },
      });
    }
  }

  tags.push(meta('property', 'og:title', fullTitle));
  if (resolved.description) tags.push(meta('property', 'og:description', resolved.description));
  if (canonical) tags.push(meta('property', 'og:url', canonical));
  tags.push(
    meta('property', 'og:type', page.ogType ?? 'article'),
    meta('property', 'og:site_name', config.name),
    meta('property', 'og:locale', ogLocale(page.locale, config.ogLocales)),
  );
  if (languages.length > 1) {
    for (const locale of languages.filter((candidate) => candidate !== page.locale)) {
      tags.push(meta('property', 'og:locale:alternate', ogLocale(locale, config.ogLocales)));
    }
  }

  const { image } = resolved;
  const imageUrl =
    image &&
    (image.src.startsWith('https://') ? image.src : absolute(withBase(url.base, image.src)));
  if (image && imageUrl) {
    tags.push(meta('property', 'og:image', imageUrl));
    if (image.width !== undefined)
      tags.push(meta('property', 'og:image:width', String(image.width)));
    if (image.height !== undefined)
      tags.push(meta('property', 'og:image:height', String(image.height)));
    tags.push(meta('property', 'og:image:alt', image.alt));
  }

  tags.push(
    meta('name', 'twitter:card', image ? 'summary_large_image' : 'summary'),
    meta('name', 'twitter:title', fullTitle),
  );
  if (resolved.description) tags.push(meta('name', 'twitter:description', resolved.description));
  if (image && imageUrl) {
    tags.push(
      meta('name', 'twitter:image', imageUrl),
      meta('name', 'twitter:image:alt', image.alt),
    );
  }

  // Un bloque por schema; las reservas y la 404 también (el sitio decide con `schema: false`).
  for (const schema of resolved.schemas) {
    tags.push({
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      content: serializeJsonLd(schema),
    });
  }
  return tags;
}
