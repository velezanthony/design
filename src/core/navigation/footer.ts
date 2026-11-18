import { AUTHOR } from '../author';
import { isFooterPage, type FooterLink, type FooterPage } from '../config/footer';
import type { ResolvedConfig } from '../config/resolve';
import type { Label } from '../config/schema';
import { DocsError, formatPath } from '../errors';
import type { UiStrings } from '../i18n/ui-strings';
import { resolveLabel } from './label';
import { buildSidebarFor, type NavContext } from './nav-sidebar';
import { flatten } from './sidebar';
import { toSidebarSlug, HOME_SIDEBAR_SLUG } from './sidebar-slugs';

/** Autor por defecto del footer: quien mantiene el paquete. `author: false` lo quita. */
export const DEFAULT_AUTHOR = {
  name: AUTHOR.shortName,
  href: AUTHOR.url,
} as const;

/** Un enlace de la derecha del footer ya resuelto para un idioma. */
export interface FooterEntry {
  label: string;
  href: string;
  external: boolean;
}

/** Lo que `DocsFooter` pinta además del copyright, la privacidad y el control de cookies. */
export interface FooterView {
  license?: { label: string; href?: string };
  author?: { name: string; href: string };
  /** Primero los propios, luego repositorio e «informar de un error». */
  links: FooterEntry[];
}

/** Lo que el footer necesita de la config. */
export type FooterSource = Pick<ResolvedConfig, 'footer' | 'social'>;

/** Destino de un enlace del footer a una página en el idioma de `context`; `undefined` si no tiene (política `omit`). */
function footerPageHref(link: FooterPage, context: NavContext): string | undefined {
  const slug = toSidebarSlug(link.slug);
  return flatten(buildSidebarFor(context, (candidate) => candidate === slug))[0]?.href;
}

/** Los destinos de los enlaces del footer que son páginas del sitio (los https quedan fuera). */
export function footerPageHrefs(
  links: readonly FooterLink[] | undefined,
  context: NavContext,
): string[] {
  return (links ?? []).filter(isFooterPage).flatMap((link) => footerPageHref(link, context) ?? []);
}

/** Footer de una página en el idioma de `context`; quita el enlace sin destino (política `omit`) en vez de dejarlo roto. */
export function buildFooter(
  source: FooterSource,
  context: NavContext,
  strings: UiStrings,
): FooterView {
  const { footer, social } = source;
  const { locale } = context;
  const defaultLocale = context.config.defaultLocale;
  function label(value: Label) {
    return resolveLabel(value, locale, defaultLocale);
  }

  const custom = (footer?.links ?? []).flatMap((link): FooterEntry[] => {
    const text = label(link.label);
    if (!isFooterPage(link)) return [{ label: text, href: link.href, external: true }];
    const href = footerPageHref(link, context);
    return href === undefined ? [] : [{ label: text, href, external: false }];
  });

  const repo = social?.github?.replace(/\/+$/, '');
  const derived: FooterEntry[] = repo
    ? [
        { label: strings['footer.repository'], href: repo, external: true },
        { label: strings['footer.report'], href: `${repo}/issues/new`, external: true },
      ]
    : [];

  const { license } = footer ?? {};
  const author = footer?.author === undefined ? DEFAULT_AUTHOR : footer.author;
  return {
    ...(license !== undefined && {
      license:
        typeof license === 'string'
          ? { label: license }
          : { label: label(license.label), href: license.href },
    }),
    ...(author && { author: { name: author.name, href: author.href } }),
    links: [...custom, ...derived],
  };
}

/** Un error por enlace a una página inexistente; lo que se juzga sin páginas lo valida el esquema. */
export function validateFooter(
  links: readonly FooterLink[],
  pageSlugs: ReadonlySet<string>,
): DocsError[] {
  return links.flatMap((link, index): DocsError[] => {
    if (!isFooterPage(link) || pageSlugs.has(toSidebarSlug(link.slug))) return [];
    return [
      new DocsError(
        `${formatPath(['footer', 'links', index, 'slug'])}: no hay ninguna página con el slug «${link.slug}».`,
        { hint: `Revisa el slug o créala. La portada se escribe '${HOME_SIDEBAR_SLUG}'.` },
      ),
    ];
  });
}
