import type { AstroIntegration } from 'astro';
import { resolveConfig, type ResolvedConfig } from '../../core/config/resolve';
import type { DocsUserConfig } from '../../core/config/schema';
import { extendMarkdownProcessor } from '../markdown/processor';
import { createVirtualConfigPlugin } from '../virtual/plugin';
import { toAstroError } from './errors';
import { designFonts } from './fonts';
import { buildPagefindIndex } from './pagefind';

/** Nombre con el que el loader localiza la integración en `ctx.config.integrations`. */
export const INTEGRATION_NAME = '@velezanthony/design';

export type { DocsUserConfig };

export interface DocsIntegration extends AstroIntegration {
  /** La config resuelta. Astro la descarta al validar `config.integrations`: ver `defineDocsConfig`. */
  resolvedConfig: ResolvedConfig;
}

/** `resolveConfig` con los errores del núcleo traducidos a `AstroError`. */
export function resolveConfigOrThrow(config: DocsUserConfig): ResolvedConfig {
  try {
    return resolveConfig(config);
  } catch (error) {
    throw toAstroError(error, 'La config de `@velezanthony/design` no es válida.');
  }
}

/**
 * Identidad tipada para `docs.config.mjs`: el consumidor declara la config UNA vez y se la pasa a
 * `docs()` (astro.config.mjs) y a `docsLoader()` (content.config.ts). Plan B del test #1: Astro
 * descarta las propiedades extra de la integración, así que el loader no puede leerla de ella.
 */
export const defineDocsConfig = (config: DocsUserConfig): DocsUserConfig => config;

export function docs(userConfig: DocsUserConfig): DocsIntegration {
  const resolvedConfig = resolveConfigOrThrow(userConfig);
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
