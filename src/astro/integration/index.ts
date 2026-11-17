import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { AstroError } from 'astro/errors';
import { applyAnalytics } from '../../core/analytics/resolve';
import type { UrlPolicy } from '../../core/i18n/availability';
import { resolveConfig, type ResolvedConfig } from '../../core/config/resolve';
import type { DocsUserConfig } from '../../core/config/schema';
import { DEFAULT_FAVICON_PATH } from '../../core/seo/favicon';
import { codeThemes } from '../../ui/styles/code-themes';
import { createMarkdownEnv } from '../markdown/env';
import { extendMarkdownProcessor } from '../markdown/processor';
import { mergeLangAlias } from '../markdown/register';
import { createVirtualData } from '../virtual/data';
import { createVirtualConfigPlugin } from '../virtual/plugin';
import { readAnalyticsEnv } from './analytics-env';
import { addCompanions, COMPANIONS } from './companions';
import { toAstroError } from './errors';
import { assertNoFontConflict, designFonts } from './fonts';
import { contentFsAllow } from './fs-allow';
import { buildPagefindIndex } from './pagefind';
import { SEO_ON_PAGE_ROUTES } from '../seo-on-page/hrefs';
import { assertNoRouteCollision } from './route-collisions';

/** Nombre con el que el loader localiza la integración en `ctx.config.integrations`. */
export const INTEGRATION_NAME = '@velezanthony/design';

export type { DocsUserConfig };
/** Valores cerrados de `translations.missing` (`MissingTranslation.LINK`); en el frontmatter son las mismas cadenas. */
export { MissingTranslation } from '../../core/i18n/translation-policy';
/** Valores cerrados de `layout` (`PanelState.COLLAPSED`, `LayoutWidth.FULL`). */
export { LayoutWidth, PanelState } from '../../core/config/layout';
/** Valores cerrados de los iconos de `nav` (`NavIcon.GITHUB`). */
export { NavIcon } from '../../core/config/nav';

export interface DocsIntegration extends AstroIntegration {
  /** La config resuelta. Astro la descarta al validar `config.integrations`: ver `defineDocsConfig`. */
  resolvedConfig: ResolvedConfig;
}

/** `resolveConfig` con los errores del núcleo traducidos a `AstroError`. */
/** Nombres con los que la documentación da por hecho que vive la config del sitio, en la raíz. */
const CONFIG_FILES = ['docs.config.mjs', 'docs.config.js', 'docs.config.ts'] as const;

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
/** Contenedor de una pantalla del panel SEO on page (vive en `astro/seo-on-page/`). */
const seoRoute = (file: string) => new URL(`../seo-on-page/${file}`, import.meta.url);

const virtualTypes = () =>
  readFileSync(new URL('../virtual/virtual.d.ts', import.meta.url), 'utf8');

/** `applyAnalytics` con los errores del núcleo traducidos a `AstroError`. */
function applyAnalyticsOrThrow(
  config: ResolvedConfig,
  envValue: string | undefined,
  url: UrlPolicy,
) {
  try {
    return applyAnalytics(config, envValue, url);
  } catch (error) {
    throw toAstroError(error, 'La analítica de `@velezanthony/design` no es válida.');
  }
}

export function docs(userConfig: DocsUserConfig): DocsIntegration {
  const resolvedConfig = resolveConfigOrThrow(userConfig);
  return {
    name: INTEGRATION_NAME,
    resolvedConfig,
    hooks: {
      'astro:config:setup': ({
        command,
        config,
        updateConfig,
        injectRoute,
        addWatchFile,
        logger,
      }) => {
        /* `astro.config.mjs` importa `docs.config.mjs`, pero Astro solo reinicia `dev` cuando cambia
           el propio astro.config, no lo que importa: sin esto, editar la config del sitio no tendría
           efecto hasta reiniciar a mano. Solo se vigila; el archivo lo carga el import del consumidor. */
        for (const file of CONFIG_FILES) {
          const url = new URL(file, config.root);
          if (existsSync(url)) addWatchFile(url);
        }
        if (!config.site) {
          throw new AstroError(
            'Falta `site` en la config de Astro.',
            'Defínelo en astro.config.mjs (`site: "https://tu-dominio.dev"`): lo necesitan el sitemap y las URLs canónicas.',
          );
        }
        // Analítica: el ID sale de la config o de PUBLIC_GTM_ID; sin ninguno no hay nada de nada.
        const siteConfig = applyAnalyticsOrThrow(
          resolvedConfig,
          readAnalyticsEnv(command, config.root),
          {
            base: config.base,
            trailingSlash: config.trailingSlash,
            defaultLocale: resolvedConfig.defaultLocale,
          },
        );
        assertNoRouteCollision(
          new URL('pages/', config.srcDir),
          resolvedConfig.locales,
          resolvedConfig.defaultLocale,
          resolvedConfig.privacy.page,
          command === 'dev',
        );
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
        // Una carpeta de contenido fuera del proyecto: Vite debe poder servir sus imágenes en dev.
        const allow = contentFsAllow(fileURLToPath(config.root), resolvedConfig.content);
        updateConfig({
          markdown: { shikiConfig: { langAlias, ...(hasThemes ? {} : { themes: codeThemes }) } },
          fonts,
          vite: {
            ...(allow.length > 0 && { server: { fs: { allow } } }),
            plugins: [
              createVirtualConfigPlugin(
                createVirtualData(siteConfig, {
                  base: config.base,
                  site: config.site,
                  trailingSlash: config.trailingSlash,
                  buildFormat: config.build.format,
                  publicDir: config.publicDir.href,
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
        injectRoute({
          pattern: DEFAULT_FAVICON_PATH,
          entrypoint: route('favicon.png.ts'),
          prerender: true,
        });
        injectRoute({ pattern: '/404', entrypoint: route('not-found.astro'), prerender: true });
        // Página de privacidad propia (opcional): la del idioma por defecto sin prefijo y la de cada otro.
        if (resolvedConfig.privacy.page) {
          injectRoute({
            pattern: '/[privacy]',
            entrypoint: route('privacy.astro'),
            prerender: true,
          });
          if (resolvedConfig.locales.length > 1) {
            injectRoute({
              pattern: '/[locale]/[privacy]',
              entrypoint: route('privacy-locale.astro'),
              prerender: true,
            });
          }
        }
        /* Panel SEO on page: SOLO con `astro dev`. Con `build` no se inyecta nada, así que ni sus
           rutas ni su código entran en el sitio publicado. `prerender: false` porque las pantallas
           leen la query de la URL (filtros, página elegida), que una ruta prerenderizada no ve. */
        if (command === 'dev') {
          for (const { pattern, file } of SEO_ON_PAGE_ROUTES) {
            injectRoute({ pattern, entrypoint: seoRoute(file), prerender: false });
          }
        }
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

export { defineDocsSite, type DocsSiteOptions } from './define-docs-site';
