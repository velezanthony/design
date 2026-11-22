import type { ResolvedConfig, ResolvedI18n } from '../../core/config/resolve';
import { siteStrings, type UiStrings } from '../../core/i18n/ui-strings';
import type { Locale } from '../../core/i18n/locale';

/** Lo que Astro sabe y la integración no: viene de `astro.config`. */
export interface AstroSiteConfig {
  base: string;
  /** El `site` de Astro (la URL del sitio); se llama así para no chocar con el grupo `site` de la config. */
  siteUrl: string;
  trailingSlash: 'always' | 'never' | 'ignore';
  buildFormat: 'directory' | 'file' | 'preserve';
  /** `public/` del consumidor como URL `file://` con barra final (para leer imágenes SEO). */
  publicDir: string;
  /** La raíz del proyecto como URL `file://` con barra final: de ahí cuelgan las rutas de las páginas (`sourcePath`, `entrypoint`). */
  root: string;
}

/** Contenido del módulo virtual (sus tipos para el consumidor están en `virtual.d.ts`): la config resuelta, sin `i18n.ui`, más lo que sabe Astro y los textos ya fusionados. */
export interface VirtualConfig extends Omit<ResolvedConfig, 'i18n'>, AstroSiteConfig {
  i18n: Omit<ResolvedI18n, 'ui'>;
  strings: Record<Locale, UiStrings>;
}

/** Datos serializables del módulo virtual; `i18n.ui` no viaja, va fusionado en `strings` solo para los idiomas del sitio. */
export function createVirtualData(config: ResolvedConfig, astro: AstroSiteConfig): VirtualConfig {
  const { ui, ...i18n } = config.i18n;
  return { ...config, i18n, ...astro, strings: siteStrings(ui, i18n.locales) };
}
