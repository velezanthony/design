import { readFileSync } from 'node:fs';
import type { AstroIntegration } from 'astro';
import { AstroError } from 'astro/errors';
import { resolveConfig, type ResolvedConfig } from '../../core/config/resolve';
import type { DocsUserConfig } from '../../core/config/schema';
import { codeThemes } from '../../ui/styles/code-themes';
import { createMarkdownEnv } from '../markdown/env';
import { extendMarkdownProcessor } from '../markdown/processor';
import { mergeLangAlias } from '../markdown/register';
import { createVirtualData } from '../virtual/data';
import { createVirtualConfigPlugin } from '../virtual/plugin';
import { addCompanions, COMPANIONS } from './companions';
import { toAstroError } from './errors';
import { assertNoFontConflict, designFonts } from './fonts';
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

/** Ruta de un contenedor del paquete (vive en `astro/routes/`, junto a esta carpeta). */
const route = (file: string) => new URL(`../routes/${file}`, import.meta.url);

/** Los `.d.ts` del módulo virtual, tal cual: `injectTypes` los copia al `.astro/` del consumidor. */
const virtualTypes = () =>
  readFileSync(new URL('../virtual/virtual.d.ts', import.meta.url), 'utf8');

export function docs(userConfig: DocsUserConfig): DocsIntegration {
  const resolvedConfig = resolveConfigOrThrow(userConfig);
  return {
    name: INTEGRATION_NAME,
    resolvedConfig,
    hooks: {
      'astro:config:setup': ({ config, updateConfig, injectRoute, logger }) => {
        if (!config.site) {
          throw new AstroError(
            'Falta `site` en la config de Astro.',
            'Defínelo en astro.config.mjs (`site: "https://tu-dominio.dev"`): lo necesitan el sitemap y las URLs canónicas.',
          );
        }
        const fonts = designFonts();
        assertNoFontConflict(config.fonts, fonts);
        addCompanions(config.integrations, INTEGRATION_NAME, COMPANIONS);
        const env = createMarkdownEnv(resolvedConfig, config.root, (message) =>
          logger.warn(message),
        );
        const { shikiConfig } = config.markdown;
        const langAlias = mergeLangAlias(shikiConfig?.langAlias);
        extendMarkdownProcessor(config.markdown.processor, env, langAlias);
        // Solo si el consumidor no eligió temas: los de la documentación van emparejados con los tokens.
        const hasThemes = Object.keys(shikiConfig?.themes ?? {}).length > 0;
        updateConfig({
          markdown: { shikiConfig: { langAlias, ...(hasThemes ? {} : { themes: codeThemes }) } },
          fonts,
          vite: {
            plugins: [
              createVirtualConfigPlugin(
                createVirtualData(resolvedConfig, {
                  base: config.base,
                  site: config.site,
                  trailingSlash: config.trailingSlash,
                  buildFormat: config.build.format,
                }),
              ),
            ],
          },
        });
        injectRoute({ pattern: '/[...slug]', entrypoint: route('doc.astro'), prerender: true });
        injectRoute({
          pattern: '/sitemap.xml',
          entrypoint: route('sitemap.xml.ts'),
          prerender: true,
        });
        injectRoute({ pattern: '/404', entrypoint: route('not-found.astro'), prerender: true });
        // Un idioma por defecto sin prefijo no tiene `/<idioma>/404/`: solo los demás.
        if (resolvedConfig.locales.length > 1) {
          injectRoute({
            pattern: '/[locale]/404',
            entrypoint: route('not-found.astro'),
            prerender: true,
          });
        }
      },
      // `injectTypes` solo existe en `astro:config:done`, no en `config:setup`.
      'astro:config:done': ({ injectTypes }) => {
        injectTypes({ filename: 'virtual.d.ts', content: virtualTypes() });
      },
      'astro:build:done': async ({ dir, logger }) => {
        await buildPagefindIndex(dir, logger);
      },
    },
  };
}
