import { resolveConfig, type ResolvedConfig } from '../core/config/resolve';
import type { DocsUserConfig } from '../core/config/schema';
import type { UrlPolicy } from '../core/i18n/availability';
import type { Locale } from '../core/i18n/locale';
import { orAstroError } from './errors';

/** Cómo se forman las URLs: `base` y barra final de Astro, idioma por defecto de la librería. */
export function urlPolicyOf(
  astro: Pick<UrlPolicy, 'base' | 'trailingSlash'>,
  defaultLocale: Locale,
): UrlPolicy {
  return { base: astro.base, trailingSlash: astro.trailingSlash, defaultLocale };
}

/** `resolveConfig` con los errores del núcleo traducidos a `AstroError`. */
export function resolveConfigOrThrow(config: DocsUserConfig): ResolvedConfig {
  return orAstroError('La config de `@velezanthony/design` no es válida.', () =>
    resolveConfig(config),
  );
}
