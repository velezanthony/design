import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { AstroError } from 'astro/errors';
import { applyAnalytics } from '../../core/analytics/resolve';
import type { UrlPolicy } from '../../core/i18n/availability';
import { resolveConfig, type ResolvedConfig } from '../../core/config/resolve';
import type { DocsUserConfig } from '../../core/config/schema';
import { DEFAULT_FAVICON_PATH } from '../../core/seo/favicon';
import {
  SITEMAP_FILE,
  SITEMAP_PAGES,
  SITEMAP_STYLESHEET_PATH,
  sitemapFiles,
} from '../../core/seo/sitemap';
import { codeThemes } from '../../ui/styles/code-themes';
import { createMarkdownEnv } from '../markdown/env';
import { extendMarkdownProcessor } from '../markdown/processor';
import { mergeLangAlias } from '../markdown/register';
import { createVirtualData } from '../virtual/data';
import { createVirtualConfigPlugin } from '../virtual/plugin';
import { readAnalyticsEnv } from './analytics-env';
import { urlPolicyOf } from '../config';
import { orAstroError } from '../errors';
import { assertNoFontConflict, designFonts } from './fonts';
import { contentFsAllow } from './fs-allow';
import { buildPagefindIndex } from './pagefind';
import { SEO_ON_PAGE_ROUTES } from '../views/seo-on-page/hrefs';
import { rememberClientRoutes, watchClientPages } from './client-pages';
import { clientRegistry } from '../data/client-registry';
import { addClientPagesToSitemap } from './client-sitemap';
import { overrideWarning, routeOverrides } from './route-overrides';

/** Nombre de la integración en `astro.config` (lo que Astro enseña en sus avisos). */
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

/** Nombres con los que la documentación da por hecho que vive la config del sitio, en la raíz. */
const CONFIG_FILES = ['docs.config.mjs', 'docs.config.js', 'docs.config.ts'] as const;

/** `resolveConfig` con los errores del núcleo traducidos a `AstroError`. */
export function resolveConfigOrThrow(config: DocsUserConfig): ResolvedConfig {
  return orAstroError('La config de `@velezanthony/design` no es válida.', () =>
    resolveConfig(config),
  );
}

/**
 * Identidad tipada para `docs.config.mjs`: el consumidor declara la config UNA vez y se la pasa a
 * `docs()` (astro.config.mjs) y a `docsLoader()` (content.config.ts). Plan B del test #1: Astro
 * descarta las propiedades extra de la integración, así que el loader no puede leerla de ella.
 */
export function defineDocsConfig(config: DocsUserConfig): DocsUserConfig {
  return config;
}

/** Ruta de un contenedor del paquete (vive en `astro/pages/`, junto a esta carpeta). */
function route(file: string) {
  return new URL(`../pages/${file}`, import.meta.url);
}

/** Los `.d.ts` del módulo virtual, tal cual: `injectTypes` los copia al `.astro/` del consumidor. */
function virtualTypes() {
  return readFileSync(new URL('../virtual/virtual.d.ts', import.meta.url), 'utf8');
}

/** `applyAnalytics` con los errores del núcleo traducidos a `AstroError`. */
function applyAnalyticsOrThrow(
  config: ResolvedConfig,
  envValue: string | undefined,
  url: UrlPolicy,
) {
  return orAstroError('La analítica de `@velezanthony/design` no es válida.', () =>
    applyAnalytics(config, envValue, url),
  );
}

export function docs(userConfig: DocsUserConfig): DocsIntegration {
  const resolvedConfig = resolveConfigOrThrow(userConfig);
  const sitemap = sitemapFiles(resolvedConfig.sitemap.include);
  // Dónde se publica, para el sitemap del build; lo fija `astro:config:setup`.
  let published = { site: '', base: '/' };
  // Si el sitio sustituye el sitemap, el build no le añade nada: ese fichero ya no es nuestro.
  let ownSitemap = true;
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
          urlPolicyOf(config, resolvedConfig.defaultLocale),
        );
        // El sitio puede sustituir páginas de la librería con las suyas: se avisa, y las rutas
        // exactas que ya son suyas no se inyectan (Astro no registra dos para la misma URL).
        const overrides = routeOverrides(new URL('pages/', config.srcDir), {
          locales: resolvedConfig.locales,
          defaultLocale: resolvedConfig.defaultLocale,
          privacyPage: resolvedConfig.privacy.page,
          seoOnPage: command === 'dev',
          sitemapIndex: sitemap.index,
        });
        clientRegistry().overrides = overrides;
        const warning = overrideWarning(overrides);
        if (warning) logger.warn(warning);
        const theirs = new Set(overrides.map(({ route }) => `/${route}`));
        function own(pattern: string) {
          return !theirs.has(pattern);
        }
        ownSitemap = own(`/${sitemap.pages}`);
        published = { site: config.site, base: config.base };
        const fonts = designFonts();
        assertNoFontConflict(config.fonts, fonts);
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
        if (own(`/${SITEMAP_FILE}`))
          injectRoute({
            pattern: `/${SITEMAP_FILE}`,
            entrypoint: route('sitemap.xml.ts'),
            prerender: true,
          });
        // Con otros sitemaps del dominio, `sitemap.xml` es su índice y las páginas propias van aparte.
        if (sitemap.index && own(`/${SITEMAP_PAGES}`)) {
          injectRoute({
            pattern: `/${SITEMAP_PAGES}`,
            entrypoint: route('sitemap-pages.xml.ts'),
            prerender: true,
          });
        }
        if (own(SITEMAP_STYLESHEET_PATH))
          injectRoute({
            pattern: SITEMAP_STYLESHEET_PATH,
            entrypoint: route('sitemap.css.ts'),
            prerender: true,
          });
        if (own(DEFAULT_FAVICON_PATH))
          injectRoute({
            pattern: DEFAULT_FAVICON_PATH,
            entrypoint: route('favicon.png.ts'),
            prerender: true,
          });
        if (own('/404')) {
          injectRoute({ pattern: '/404', entrypoint: route('not-found.astro'), prerender: true });
        }
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
            injectRoute({ pattern, entrypoint: route(`seo-on-page/${file}`), prerender: false });
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
      // Las páginas que el cliente añade en `src/pages/`, para el panel SEO y el sitemap.
      'astro:routes:resolved': ({ routes }) => rememberClientRoutes(routes),
      'astro:server:setup': ({ server }) => watchClientPages(server),
      // `injectTypes` solo existe en `astro:config:done`, no en `config:setup`.
      'astro:config:done': ({ injectTypes }) => {
        injectTypes({ filename: 'virtual.d.ts', content: virtualTypes() });
      },
      'astro:build:done': async ({ dir, pages, logger }) => {
        await buildPagefindIndex(dir, logger);
        if (!ownSitemap) return;
        const added = await addClientPagesToSitemap({
          dir,
          pages,
          ...published,
          pagesFile: sitemap.pages,
        });
        if (added > 0) logger.info(`sitemap: ${added} páginas de src/pages/`);
      },
    },
  };
}

export { defineDocsSite, type DocsSiteOptions } from './define-docs-site';
