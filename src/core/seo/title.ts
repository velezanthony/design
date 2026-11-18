import { AUTHOR } from '../author';
import type { Label } from '../config/schema';
import type { Locale } from '../i18n/locale';

/** Sufijo del `<title>` por defecto: el nombre del autor, o `false` para quitarlo. */
export const DEFAULT_TITLE_SUFFIX = AUTHOR.name;

/** Separador entre título y sufijo en el `<title>`. Fijo: la librería decide el formato, no la config. */
export const TITLE_SEPARATOR = ' | ';

/** Cascada del sufijo página > sitio > librería; `false` en cualquier nivel corta la cascada, y un idioma ausente tampoco da sufijo. */
export function resolveTitleSuffix(
  page: Label | false | undefined,
  site: Label | false | undefined,
  locale: Locale,
): string | undefined {
  const chosen = page ?? site ?? DEFAULT_TITLE_SUFFIX;
  if (chosen === false) return undefined;
  return typeof chosen === 'string' ? chosen : chosen[locale];
}

/** `título | sufijo`; sin sufijo el título solo, y no se repite si el título ya ES el sufijo. */
export function composeTitle(title: string, suffix: string | undefined): string {
  if (suffix === undefined || title.trim() === suffix.trim()) return title;
  return `${title}${TITLE_SEPARATOR}${suffix}`;
}
