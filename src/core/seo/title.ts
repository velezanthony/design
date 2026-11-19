import type { Label } from '../config/schema';
import type { Locale } from '../i18n/locale';

/** Separador entre título y sufijo en el `<title>`. Fijo: la librería decide el formato, no la config. */
export const TITLE_SEPARATOR = ' | ';

/** Cascada del sufijo página > sitio (la config ya lo rellena con `name`); `false` en cualquier nivel corta la cascada, y un idioma ausente tampoco da sufijo. */
export function resolveTitleSuffix(
  page: Label | false | undefined,
  site: Label | false,
  locale: Locale,
): string | undefined {
  const chosen = page ?? site;
  if (chosen === false) return undefined;
  return typeof chosen === 'string' ? chosen : chosen[locale];
}

/** `título | sufijo`; sin sufijo el título solo, y no se repite si el título ya ES el sufijo. */
export function composeTitle(title: string, suffix: string | undefined): string {
  if (suffix === undefined || title.trim() === suffix.trim()) return title;
  return `${title}${TITLE_SEPARATOR}${suffix}`;
}
