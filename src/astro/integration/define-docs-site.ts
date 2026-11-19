import type { AstroUserConfig } from 'astro';
import { AstroError } from 'astro/errors';
import type { DocsUserConfig } from '../../core/config/schema';
import { docs } from './docs';

/** Origen de GitHub Pages del propietario. Es solo el valor por defecto: `options.site` lo cambia. */
export const DEFAULT_SITE = 'https://velezanthony.github.io';

export interface DocsSiteOptions {
  /** Ruta bajo la que se sirve el sitio, OBLIGATORIA (`/mi-repo` en página de proyecto; `'/'` para usuario u organización). */
  base: string;
  /** Origen absoluto del sitio (sitemap y URLs canónicas). Por defecto, el de GitHub Pages del propietario. */
  site?: string;
  /** Otra config de Astro, fusionada con la de la librería (`integrations` va después de `docs()`); `site` y `base` van en las opciones. */
  astro?: Omit<AstroUserConfig, 'site' | 'base'>;
}

/** Config de Astro de un sitio de docs, pura; `docs.config.mjs` se sigue importando desde `astro.config.mjs` para que la integración lo vigile. */
export function defineDocsSite(
  docsConfig: DocsUserConfig,
  options: DocsSiteOptions,
): AstroUserConfig {
  const base = options?.base;
  /* `//host/ruta` empieza por `/` pero es una URL relativa al protocolo, no una ruta. */
  if (typeof base !== 'string' || !base.startsWith('/') || base.startsWith('//')) {
    throw new AstroError(
      '`defineDocsSite` necesita una `base` válida.',
      `Pásala como \`{ base: '/mi-repo' }\` (o '/' en un sitio de usuario): empieza por '/' y es una ruta, no una URL. Recibido: ${JSON.stringify(base)}.`,
    );
  }
  const { integrations, ...rest } = options.astro ?? {};
  return {
    trailingSlash: 'always',
    ...rest,
    site: options.site ?? DEFAULT_SITE,
    base,
    integrations: [docs(docsConfig), ...(integrations ?? [])],
  };
}
