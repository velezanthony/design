import type { ResolvedConfig } from '../../core/config/resolve';
import { defaultStrings, mergeUiStrings, type UiStrings } from '../../core/i18n/ui-strings';
import type { Locale } from '../../core/i18n/locale';

/** Lo que Astro sabe y la integración no: viene de `astro.config`. */
export interface AstroSiteConfig {
  base: string;
  site: string;
  trailingSlash: 'always' | 'never' | 'ignore';
  buildFormat: 'directory' | 'file' | 'preserve';
  /** `public/` del consumidor como URL `file://` con barra final (para leer imágenes SEO). */
  publicDir: string;
}

/** Contenido del módulo virtual (sus tipos para el consumidor están en `virtual.d.ts`). */
export interface VirtualConfig extends Omit<ResolvedConfig, 'ui'>, AstroSiteConfig {
  strings: Record<Locale, UiStrings>;
}

/**
 * Datos serializables del módulo virtual. `ui` (los overrides) no viaja: va ya fusionado en
 * `strings`, solo para los idiomas del sitio, así los contenedores no vuelven a fusionar nada.
 */
export function createVirtualData(config: ResolvedConfig, astro: AstroSiteConfig): VirtualConfig {
  const { ui, ...rest } = config;
  const merged = mergeUiStrings(defaultStrings, ui);
  return {
    ...rest,
    ...astro,
    strings: Object.fromEntries(config.locales.map((locale) => [locale, merged[locale]])),
  };
}
