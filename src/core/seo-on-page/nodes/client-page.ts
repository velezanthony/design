import type { JsonLd } from '../../config/schema';
import type { Locale } from '../../i18n/locale';
import type { MissingTranslation } from '../../i18n/translation-policy';
import type { ClientPage } from '../../seo/client-pages';
import type { ResolvedSchema } from '../../seo/json-ld';
import type { MetaNode, SeoLocaleEntry, SeoPageFacts } from '../tree/types';
import { trimBase } from '../../shared/urls';

interface ClientContext {
  locales: readonly Locale[];
  defaultLocale: Locale;
  /** La política del sitio para los idiomas que faltan: la página no declara la suya. */
  missing: MissingTranslation;
  base: string;
}

/** La ruta sin la base ni las barras de los extremos: el slug, como en la documentación. */
function slugOf(path: string, base: string) {
  return path.slice(trimBase(base).length).replace(/^\/+|\/+$/g, '');
}

/** `<html lang="en-US">` cuenta como `en`; un idioma que no es de la config, como el por defecto. */
function localeOf(lang: string | undefined, context: ClientContext): Locale {
  if (!lang) return context.defaultLocale;
  const short = lang.toLowerCase().split('-')[0]!;
  return (
    context.locales.find((locale) => locale === lang || locale === short) ?? context.defaultLocale
  );
}

function isObject(value: unknown): value is JsonLd {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function metaOf(page: ClientPage): MetaNode {
  const { head } = page;
  const title = head.title ?? '';
  const description = head.description;
  const ogDescription = head.og.description ?? description;
  return {
    title,
    titleLength: title.length,
    ...(description !== undefined && { description, descriptionLength: description.length }),
    descriptionSource: description === undefined ? 'none' : 'page',
    ogTitle: head.og.title ?? title,
    ...(ogDescription !== undefined && { ogDescription }),
    ...(head.og.image && { ogImage: head.og.image }),
    ogImageSource: head.og.image ? 'page' : 'none',
    canonical: head.canonical ? new URL(head.canonical).pathname : page.path,
    noindex: head.noindex,
  };
}

/** Se lee del `<head>`, sin frontmatter; los otros idiomas se reconocen por `hreflang` y comparten el slug del idioma por defecto. */
export function clientFacts(pages: readonly ClientPage[], context: ClientContext): SeoPageFacts[] {
  return pages.map((page) => {
    const { head } = page;
    const locale = localeOf(head.lang, context);
    const declared = new Map(head.alternates.map(({ hreflang, href }) => [hreflang, href]));
    const main = declared.get(context.defaultLocale);
    const slug = slugOf(main ? new URL(main).pathname : page.path, context.base);
    const locales = context.locales.map((other): SeoLocaleEntry => {
      if (other === locale) return { locale: other, status: 'present', url: page.path };
      const href = declared.get(other);
      return href
        ? { locale: other, status: 'present', url: new URL(href).pathname }
        : { locale: other, status: 'missing', policy: context.missing, declared: false };
    });
    const schemas: ResolvedSchema[] = head.jsonLd
      .flat()
      .filter(isObject)
      .map((schema) => ({ schema, source: 'page' }));
    return {
      slug,
      locale,
      title: head.headings.find(({ depth }) => depth === 1)?.text ?? head.title ?? slug,
      kind: 'client',
      sourcePath: page.entrypoint,
      meta: metaOf(page),
      headings: head.headings,
      schemas,
      locales,
      policy: context.missing,
    };
  });
}
