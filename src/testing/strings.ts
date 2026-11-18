import { defaultStrings, mergeUiStrings, type UiStrings } from '../core/i18n/ui-strings';

/** Catálogo de UI de un idioma como lo recibiría un componente, con claves sobrescritas opcionales como haría el consumidor. */
export function stringsFor(locale: string, overrides: Partial<UiStrings> = {}): UiStrings {
  return mergeUiStrings(defaultStrings, { [locale]: overrides })[locale]!;
}
