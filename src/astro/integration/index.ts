import type { AstroIntegration } from 'astro';
import { extendMarkdownProcessor } from '../markdown/processor';
import { createVirtualConfigPlugin } from '../virtual/plugin';
import { designFonts } from './fonts';
import { buildPagefindIndex } from './pagefind';

/** Nombre con el que el loader localiza la integración en `ctx.config.integrations`. */
export const INTEGRATION_NAME = '@velezanthony/design';

/** Documento externo: un archivo del repo (p. ej. `../CHANGELOG.md`) servido como página. */
export interface ExternalDoc {
  slug: string;
  /** Relativa a la raíz del proyecto; puede salir con `../`. */
  file: string;
}

/* Forma provisional de la config; la sustituye `DocsUserConfig` de `core/config/schema.ts`. */
export interface DocsConfig {
  name: string;
  external?: ExternalDoc[];
}

export interface DocsIntegration extends AstroIntegration {
  /** La config resuelta. Astro la descarta al validar `config.integrations`: ver `defineDocsConfig`. */
  resolvedConfig: DocsConfig;
}

/**
 * Identidad tipada para `docs.config.mjs`: el consumidor declara la config UNA vez y se la pasa a
 * `docs()` (astro.config.mjs) y a `docsLoader()` (content.config.ts). Plan B del test #1: Astro
 * descarta las propiedades extra de la integración, así que el loader no puede leerla de ella.
 */
export const defineDocsConfig = (config: DocsConfig): DocsConfig => config;

export function docs(userConfig: DocsConfig): DocsIntegration {
  const resolvedConfig = userConfig;
  return {
    name: INTEGRATION_NAME,
    resolvedConfig,
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        extendMarkdownProcessor(config.markdown.processor);
        updateConfig({
          fonts: designFonts(),
          vite: {
            plugins: [
              createVirtualConfigPlugin({
                ...resolvedConfig,
                base: config.base,
                site: config.site,
                trailingSlash: config.trailingSlash,
              }),
            ],
          },
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        await buildPagefindIndex(dir, logger);
      },
    },
  };
}
