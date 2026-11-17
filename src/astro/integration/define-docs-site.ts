import tailwindcss from '@tailwindcss/vite';
import type { AstroUserConfig } from 'astro';
import { AstroError } from 'astro/errors';
import { docs, type DocsUserConfig } from './index';

/** Origen de GitHub Pages del propietario. Es solo el valor por defecto: `options.site` lo cambia. */
export const DEFAULT_SITE = 'https://velezanthony.github.io';

export interface DocsSiteOptions {
  /**
   * Ruta bajo la que se sirve el sitio. OBLIGATORIA, sin valor por defecto: cada repo tiene la suya
   * (`/mi-repo` en una página de proyecto). `'/'` vale para un sitio de usuario u organización.
   */
  base: string;
  /** Origen absoluto del sitio (sitemap y URLs canónicas). Por defecto, el de GitHub Pages del propietario. */
  site?: string;
  /**
   * Cualquier otra config de Astro, que se FUSIONA con la de la librería: `integrations` y
   * `vite.plugins` se añaden DESPUÉS de `docs()` y de Tailwind; el resto de claves de `vite` se
   * fusionan en superficial; las demás claves de primer nivel pisan los valores por defecto.
   * `site` y `base` van en las opciones, no aquí.
   */
  astro?: Omit<AstroUserConfig, 'site' | 'base'>;
}

/**
 * Función pura que devuelve la config de Astro de un sitio de docs: `docs()`, Tailwind, `site`,
 * `base` y `trailingSlash: 'always'` (como sirve GitHub Pages los directorios). No carga archivos
 * ni toca globales: `docs.config.mjs` sigue importándose desde `astro.config.mjs`, así la
 * integración puede vigilarlo. `markdown.processor` no se protege aquí: `docs()` ya falla con un
 * mensaje claro si no es Sätteri.
 */
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
  const { vite, integrations, ...rest } = options.astro ?? {};
  return {
    trailingSlash: 'always',
    ...rest,
    site: options.site ?? DEFAULT_SITE,
    base,
    vite: { ...vite, plugins: [tailwindcss(), ...(vite?.plugins ?? [])] },
    integrations: [docs(docsConfig), ...(integrations ?? [])],
  };
}
