import { defaultStrings, mergeUiStrings, type UiStrings } from '../core/i18n/ui-strings';

/**
 * Catálogo de UI de un idioma tal como lo recibiría un componente por props (`strings`): el del
 * paquete con, opcionalmente, claves sobrescritas como haría el consumidor desde `ui`.
 */
export function stringsFor(locale: string, overrides: Partial<UiStrings> = {}): UiStrings {
  return mergeUiStrings(defaultStrings, { [locale]: overrides })[locale]!;
}
