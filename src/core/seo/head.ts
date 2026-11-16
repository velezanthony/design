import type { ResolvedConfig } from '../config/resolve';
import type { Availability, UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import { applyTitleTemplate, type ResolvedMeta } from './meta';

/** Una etiqueta de `<head>` como dato; `Head.astro` solo la pinta. */
export interface HeadConfig {
  tag: 'title' | 'meta' | 'link';
  attrs: Record<string, string>;
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

const meta = (key: 'name' | 'property', name: string, content: string): HeadConfig => ({
  tag: 'meta',
  attrs: { [key]: name, content },
});

/** `pt-BR` → `pt_BR`, el formato de `og:locale`. */
const ogLocale = (locale: Locale) => locale.replace('-', '_');

/**
 * Etiquetas del `<head>` de una página como datos puros. El `canonical` y los alternates salen de
 * la disponibilidad de páginas REALES (`av` ya sin las `noindex`): una ruta de reserva apunta a su
 * original, una 404 no tiene canonical y ninguna de las dos emite hreflang. `og:image` es absoluta
 * (`site` + `base` + `src`) salvo que ya sea una URL https.
 */
export function buildHead(
  resolved: ResolvedMeta,
  page: PageData,
  av: Availability,
  site: URL,
  cfg: Pick<ResolvedConfig, 'locales' | 'defaultLocale' | 'name'>,
  url: Pick<UrlPolicy, 'base'>,
): HeadConfig[] {
  const absolute = (path: string) => new URL(path, site).href;
  const isPage = page.kind === 'page';
  const canonicalPath = isPage ? page.url : page.kind === 'fallback' ? page.canonical : undefined;
  const canonical = canonicalPath === undefined ? undefined : absolute(canonicalPath);
  const noindex = resolved.noindex || !isPage;
  const available = isPage && !noindex ? (av.get(page.slug) ?? {}) : {};
  const languages = cfg.locales.filter((locale) => available[locale] !== undefined);

  const tags: HeadConfig[] = [
    {
      tag: 'title',
      attrs: {},
      content: applyTitleTemplate(resolved.titleTemplate, resolved.title),
    },
  ];
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
    const fallback = available[cfg.defaultLocale];
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
    meta('property', 'og:site_name', cfg.name),
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
    (image.src.startsWith('https://')
      ? image.src
      : absolute(`${url.base.replace(/\/+$/, '')}${image.src}`));
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
  return tags;
}
