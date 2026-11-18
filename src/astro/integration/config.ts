import type { DocsUserConfig } from '../../core/config/schema';

/** Nombres con los que la documentación da por hecho que vive la config del sitio, en la raíz. */
export const CONFIG_FILES = ['docs.config.mjs', 'docs.config.js', 'docs.config.ts'] as const;

/** Identidad tipada para `docs.config.mjs`: se pasa a `docs()` y a `docsLoader()` porque Astro descarta las propiedades extra de la integración. */
export function defineDocsConfig(config: DocsUserConfig): DocsUserConfig {
  return config;
}
