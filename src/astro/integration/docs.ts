import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { AstroError } from 'astro/errors';
import type { ResolvedConfig } from '../../core/config/resolve';
import type { DocsUserConfig } from '../../core/config/schema';
import { sitemapFiles } from '../../core/seo/sitemap';
import { codeThemes } from '../../components/styles/code-themes';
import { resolveConfigOrThrow } from '../config';
import { clientRegistry } from '../registry';
import { createMarkdownEnv } from '../markdown/env';
import { extendMarkdownProcessor } from '../markdown/processor';
import { mergeLangAlias } from '../markdown/register';
import { routesFor } from '../routes/routes';
import { createVirtualData } from '../virtual/data';
import { createVirtualConfigPlugin } from '../virtual/plugin';
import { applyAnalyticsForCommand, readAnalyticsEnv } from './analytics-env';
import { runBuildDone } from './build/build-done';
import { rememberClientRoutes, watchClientPages } from './client-pages';
import { CONFIG_FILES } from './config';
import { assertNoFontConflict, designFonts } from './fonts';
import { contentFsAllow } from './fs-allow';
import { overrideWarning, routeOverrides } from './route-overrides';
import { siteThemeAlias } from './site-theme';

/** Nombre de la integración en `astro.config` (lo que Astro enseña en sus avisos). */
export const INTEGRATION_NAME = '@velezanthony/design';

export interface DocsIntegration extends AstroIntegration {
  /** La config resuelta. Astro la descarta al validar `config.integrations`: ver `defineDocsConfig`. */
  resolvedConfig: ResolvedConfig;
}

/** Ruta de un contenedor del paquete (vive en `astro/routes/`, junto a esta carpeta). */
function route(file: string) {
  return new URL(`../routes/${file}`, import.meta.url);
}

/** Los `.d.ts` del módulo virtual, tal cual: `injectTypes` los copia al `.astro/` del consumidor. */
function virtualTypes() {
  return readFileSync(new URL('../virtual/virtual.d.ts', import.meta.url), 'utf8');
}

export function docs(userConfig: DocsUserConfig): DocsIntegration {
  const resolvedConfig = resolveConfigOrThrow(userConfig);
  const sitemap = sitemapFiles(resolvedConfig.sitemap.include);
  // Dónde se publica, para el sitemap del build; lo fija `astro:config:setup`.
  let published = { site: '', base: '/', root: '' };
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
        /* Astro no reinicia `dev` al cambiar lo que importa `astro.config.mjs`: se vigila `docs.config.mjs` para que editarlo surta efecto. */
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
        // Analítica: el ID sale de la config o de PUBLIC_GTM_ID y exige `privacyUrl`; sin ID, `privacyUrl` es solo el enlace del pie.
        const siteConfig = applyAnalyticsForCommand(
          command,
          resolvedConfig,
          readAnalyticsEnv(command, config.root),
          (message) => logger.warn(message),
        );
        // El sitio puede sustituir páginas de la librería con las suyas: se avisa, y las rutas
        // exactas que ya son suyas no se inyectan (Astro no registra dos para la misma URL).
        const routeOptions = {
          locales: resolvedConfig.locales,
          defaultLocale: resolvedConfig.defaultLocale,
          seoOnPage: command === 'dev',
          sitemapIndex: sitemap.index,
        };
        const overrides = routeOverrides(new URL('pages/', config.srcDir), routeOptions);
        clientRegistry().overrides = overrides;
        const warning = overrideWarning(overrides);
        if (warning) logger.warn(warning);
        const theirs = new Set(overrides.map(({ route }) => `/${route}`));
        function own(pattern: string) {
          return !theirs.has(pattern);
        }
        ownSitemap = own(`/${sitemap.pages}`);
        published = { site: config.site, base: config.base, root: fileURLToPath(config.root) };
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
            // `theme.css` importa este especificador al final: así el CSS del sitio entra en su misma compilación.
            resolve: { alias: [siteThemeAlias(fileURLToPath(config.root), resolvedConfig.theme)] },
            ...(allow.length > 0 && { server: { fs: { allow } } }),
            plugins: [
              createVirtualConfigPlugin(
                createVirtualData(siteConfig, {
                  base: config.base,
                  site: config.site,
                  trailingSlash: config.trailingSlash,
                  buildFormat: config.build.format,
                  publicDir: config.publicDir.href,
                  root: config.root.href,
                }),
              ),
            ],
          },
        });
        for (const { pattern, file, prerender } of routesFor(routeOptions)) {
          if (own(pattern)) injectRoute({ pattern, entrypoint: route(file), prerender });
        }
      },
      // Las páginas que el cliente añade en `src/pages/`, para el panel SEO y el sitemap.
      'astro:routes:resolved': ({ routes }) => rememberClientRoutes(routes),
      'astro:server:setup': ({ server }) => watchClientPages(server),
      // `injectTypes` solo existe en `astro:config:done`, no en `config:setup`.
      'astro:config:done': ({ injectTypes }) => {
        injectTypes({ filename: 'virtual.d.ts', content: virtualTypes() });
      },
      'astro:build:done': ({ dir, pages, logger }) =>
        runBuildDone({ dir, pages, logger, ...published, pagesFile: sitemap.pages, ownSitemap }),
    },
  };
}
