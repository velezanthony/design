import { DocsError } from '../errors';
import { trimBase } from '../shared/urls';

/** Código de idioma del sitio (`en`, `es`, `pt-BR`…). Es configurable, por eso es una cadena. */
export type Locale = string;

/* Un sufijo de idioma tiene forma de código: dos letras y, opcionalmente, una región. Así `v1.2.md`
   o `api.config.md` no se confunden con `x.es.md`. */
const LOCALE_SUFFIX = /^(.*)\.([a-z]{2}(?:-[A-Za-z0-9]{2,8})?)\.md$/;

/**
 * Separa el sufijo de idioma de una ruta relativa: `guide/install.es.md` →
 * `{ stem: 'guide/install', locale: 'es' }`. Sin sufijo es el idioma por defecto. Un sufijo con forma
 * de idioma que no está configurado falla: nunca se trata como parte del slug.
 */
export function splitLocale(
  relPath: string,
  locales: Locale[],
  defaultLocale: Locale,
): { stem: string; locale: Locale } {
  const match = LOCALE_SUFFIX.exec(relPath);
  if (!match) return { stem: relPath.replace(/\.md$/, ''), locale: defaultLocale };
  const [, stem, locale] = match;
  if (!locales.includes(locale)) {
    throw new DocsError(`El sufijo de idioma «${locale}» de «${relPath}» no está configurado.`, {
      file: relPath,
      hint: `Idiomas configurados: ${locales.join(', ')}. Añade «${locale}» a \`locales\` o renombra el archivo.`,
    });
  }
  return { stem, locale };
}

/**
 * Idioma de una ruta servida: el primer segmento tras `base` si es un idioma configurado (segmento
 * completo) y, si no, el idioma por defecto. Sirve a la 404 en sitio, que corre en el navegador.
 */
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
