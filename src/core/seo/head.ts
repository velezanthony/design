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

export type PageKind = 'page' | 'fallback' | 'notFound';

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
}

function meta(key: 'name' | 'property', name: string, content: string): HeadConfig {
  return {
    tag: 'meta',
    attrs: { [key]: name, content },
  };
}

/** `pt-BR` → `pt_BR`, el formato de `og:locale`. */
function ogLocale(locale: Locale) {
  return locale.replace('-', '_');
}

/**
 * Etiquetas del `<head>` de una página como datos puros. El `canonical` y los alternates salen de
 * la disponibilidad de páginas REALES (`availability` ya sin las `noindex`): una ruta de reserva apunta a su
 * original, una 404 no tiene canonical y ninguna de las dos emite hreflang. `og:image` es absoluta
 * (`site` + `base` + `src`) salvo que ya sea una URL https. El JSON-LD que declaran el sitio y la
 * página se emite tal cual, un `<script>` por schema; sin declarar nada no se emite ninguno.
 */
export function buildHead(
  resolved: ResolvedMeta,
  page: PageData,
  availability: Availability,
  site: URL,
  config: Pick<ResolvedConfig, 'locales' | 'defaultLocale' | 'name' | 'favicon'>,
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

  const tags: HeadConfig[] = [
    {
      tag: 'title',
      attrs: {},
      content: composeTitle(resolved.title, resolved.titleSuffix),
    },
  ];
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

  tags.push(meta('property', 'og:title', resolved.title));
  if (resolved.description) tags.push(meta('property', 'og:description', resolved.description));
  if (canonical) tags.push(meta('property', 'og:url', canonical));
  tags.push(
    meta('property', 'og:type', 'article'),
    meta('property', 'og:site_name', config.name),
    meta('property', 'og:locale', ogLocale(page.locale)),
  );
  if (languages.length > 1) {
    for (const locale of languages.filter((candidate) => candidate !== page.locale)) {
      tags.push(meta('property', 'og:locale:alternate', ogLocale(locale)));
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
    meta('name', 'twitter:title', resolved.title),
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
