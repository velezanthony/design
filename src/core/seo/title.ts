import { AUTHOR } from '../author';
import type { Label } from '../config/schema';
import type { Locale } from '../i18n/locale';

/**
 * Sufijo del `<title>` cuando ni el sitio ni la página definen el suyo. Es una librería personal de
 * su autor: sus docs llevan su nombre salvo que decidan otra cosa (o `false` para quitarlo).
 */
export const DEFAULT_TITLE_SUFFIX = AUTHOR.name;

/** Separador entre título y sufijo en el `<title>`. Fijo: la librería decide el formato, no la config. */
export const TITLE_SEPARATOR = ' | ';

/**
 * Cascada del sufijo, campo a campo: página > sitio > librería. `false` en cualquier nivel significa
 * «sin sufijo» y corta la cascada (el de la página gana al del sitio, en ambos sentidos). Un `Label`
 * por idioma sin el idioma pedido tampoco da sufijo: mejor sin él que uno de otro idioma.
 */
export function resolveTitleSuffix(
  page: Label | false | undefined,
  site: Label | false | undefined,
  locale: Locale,
): string | undefined {
  const chosen = page ?? site ?? DEFAULT_TITLE_SUFFIX;
  if (chosen === false) return undefined;
  return typeof chosen === 'string' ? chosen : chosen[locale];
}

/**
 * `<title>` del head: `título | sufijo`. Sin sufijo, el título solo; y si el título ya ES el sufijo
 * (la portada suele llamarse como el sitio) tampoco se repite («SnakeORM | SnakeORM»).
 */
export function composeTitle(title: string, suffix: string | undefined): string {
  if (suffix === undefined || title.trim() === suffix.trim()) return title;
  return `${title}${TITLE_SEPARATOR}${suffix}`;
}
