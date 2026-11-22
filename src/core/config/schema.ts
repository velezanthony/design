import { z } from 'astro/zod';
import {
  staticDestinationsOverlap,
  staticFolderProblem,
  type StaticFolder,
} from '../content/static-folders';
import { ContentSchema } from './content';
import { DEFAULT_LOCALES, I18nSchema, notInLocales } from './i18n';
import { SiteSchema } from './site';

/* La config pública: tres grupos (`site`, `i18n`, `content`), cada uno con su esquema en su módulo.
   Aquí se componen y se valida lo que cruza grupos (los idiomas que nombran `site` y `content`, las
   carpetas estáticas). Los valores por defecto los pone `resolveConfig`. */

export { type ExternalDoc, type SidebarItem, NavIconSchema } from './content';
export { type ComponentsConfig, LayoutWidthSchema, PanelStateSchema } from './site';
export {
  type JsonLd,
  type Label,
  type PageSeoOverride,
  MissingTranslationSchema,
  PageSeoOverrideSchema,
} from './shared-schemas';

/** Esquema de la config pública y fuente de `DocsUserConfig`. */
export const DocsConfigSchema = z
  .strictObject({
    /** Cómo se ve y se presenta el sitio. Obligatorio: lleva el nombre. */
    site: SiteSchema,
    /** Idiomas y textos. */
    i18n: I18nSchema.optional(),
    /** Qué páginas hay y cómo se navega. */
    content: ContentSchema.optional(),
  })
  .superRefine((config, context) => {
    const locales = config.i18n?.locales ?? DEFAULT_LOCALES;
    function issue(path: (string | number)[], message: string) {
      return context.addIssue({ code: 'custom', path, message });
    }
    for (const locale of Object.keys(config.site.seo?.ogLocales ?? {})) {
      if (!locales.includes(locale)) {
        issue(['site', 'seo', 'ogLocales', locale], notInLocales(locale, locales));
      }
    }
    const privacyUrl = config.site.analytics?.privacyUrl;
    if (typeof privacyUrl === 'object') {
      for (const locale of Object.keys(privacyUrl)) {
        if (!locales.includes(locale)) {
          issue(['site', 'analytics', 'privacyUrl', locale], notInLocales(locale, locales));
        }
      }
    }
    config.content?.external?.forEach((entry, index) => {
      entry.locales?.forEach((locale, localeIndex) => {
        if (!locales.includes(locale)) {
          issue(
            ['content', 'external', index, 'locales', localeIndex],
            notInLocales(locale, locales),
          );
        }
      });
    });
    validateStaticFolders(config.content?.static ?? [], locales, issue);
  });

/** Lo que escribe el consumidor en `docs({...})` / `defineDocsConfig({...})`. */
export type DocsUserConfig = z.input<typeof DocsConfigSchema>;

/** Forma de cada carpeta estática y que sus destinos no se pisen entre sí. */
function validateStaticFolders(
  folders: readonly StaticFolder[],
  locales: readonly string[],
  issue: (path: (string | number)[], message: string) => void,
): void {
  folders.forEach((folder, index) => {
    const problem = staticFolderProblem(folder, locales);
    if (problem) {
      issue(['content', 'static', index], problem);
      return;
    }
    const clash = folders
      .slice(0, index)
      .findIndex((other) => staticDestinationsOverlap(other.to, folder.to));
    if (clash !== -1) {
      issue(
        ['content', 'static', index, 'to'],
        `«${folder.to}» se solapa con «${folders[clash]!.to}» (content.static[${clash}].to): dos carpetas no pueden publicarse en el mismo sitio.`,
      );
    }
  });
}
