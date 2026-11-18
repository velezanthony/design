import { DocsError } from '../errors';
import { trimBase } from '../shared/urls';

/** Código de idioma del sitio (`en`, `es`, `pt-BR`…). Es configurable, por eso es una cadena. */
export type Locale = string;

/* Un sufijo de idioma tiene forma de código: dos letras y, opcionalmente, una región. Así `v1.2.md`
   o `api.config.md` no se confunden con `x.es.md`. */
const LOCALE_SUFFIX = /^(.*)\.([a-z]{2}(?:-[A-Za-z0-9]{2,8})?)\.md$/;

/** Separa el sufijo de idioma (`install.es.md`); sin sufijo es el idioma por defecto y uno no configurado falla. */
export function splitLocale(
  relativePath: string,
  locales: Locale[],
  defaultLocale: Locale,
): { stem: string; locale: Locale } {
  const [, stem, locale] = LOCALE_SUFFIX.exec(relativePath) ?? [];
  if (stem === undefined || locale === undefined) {
    return { stem: relativePath.replace(/\.md$/, ''), locale: defaultLocale };
  }
  if (!locales.includes(locale)) {
    throw new DocsError(
      `El sufijo de idioma «${locale}» de «${relativePath}» no está configurado.`,
      {
        file: relativePath,
        hint: `Idiomas configurados: ${locales.join(', ')}. Añade «${locale}» a \`locales\` o renombra el archivo.`,
      },
    );
  }
  return { stem, locale };
}

/** Archivo de un idioma: el idioma por defecto es el archivo tal cual; los demás, `x.<idioma>.md`. */
export function localizedPath(stemPath: string, locale: Locale, defaultLocale: Locale): string {
  return locale === defaultLocale ? stemPath : stemPath.replace(/\.md$/, `.${locale}.md`);
}

/** Lo contrario de `localizedPath`: `x.es.md` → `x.md`. */
export function stripLocale(path: string, locale: Locale, defaultLocale: Locale): string {
  const suffix = `.${locale}.md`;
  if (locale === defaultLocale || !path.endsWith(suffix)) return path;
  return `${path.slice(0, -suffix.length)}.md`;
}

/** Idioma de una ruta servida: el primer segmento tras `base` si está configurado; lo usa la 404 en el navegador. */
export function localeFromPath(
  pathname: string,
  base: string,
  locales: Locale[],
  defaultLocale: Locale,
): Locale {
  const prefix = trimBase(base);
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return defaultLocale;
  const [segment] = pathname.slice(prefix.length).split('/').filter(Boolean);
  return segment !== undefined && locales.includes(segment) ? segment : defaultLocale;
}
