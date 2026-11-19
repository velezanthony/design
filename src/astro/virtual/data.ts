import type { ResolvedConfig } from '../../core/config/resolve';
import { siteStrings, type UiStrings } from '../../core/i18n/ui-strings';
import type { Locale } from '../../core/i18n/locale';

/** Lo que Astro sabe y la integración no: viene de `astro.config`. */
export interface AstroSiteConfig {
  base: string;
  site: string;
  trailingSlash: 'always' | 'never' | 'ignore';
  buildFormat: 'directory' | 'file' | 'preserve';
  /** `public/` del consumidor como URL `file://` con barra final (para leer imágenes SEO). */
  publicDir: string;
  /** La raíz del proyecto como URL `file://` con barra final: de ahí cuelgan las rutas de las páginas (`sourcePath`, `entrypoint`). */
  root: string;
}

/** Contenido del módulo virtual (sus tipos para el consumidor están en `virtual.d.ts`). */
export interface VirtualConfig extends Omit<ResolvedConfig, 'ui'>, AstroSiteConfig {
  strings: Record<Locale, UiStrings>;
}

/** Datos serializables del módulo virtual; `ui` no viaja, va fusionado en `strings` solo para los idiomas del sitio. */
export function createVirtualData(config: ResolvedConfig, astro: AstroSiteConfig): VirtualConfig {
  const { ui, ...rest } = config;
  return { ...rest, ...astro, strings: siteStrings(ui, config.locales) };
}
