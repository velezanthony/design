import { z } from 'astro/zod';
import { MissingTranslation } from '../i18n/translation-policy';
import { LayoutWidth, PanelState } from './layout';
import { defaultStrings, uiKeys, type UiKey } from '../i18n/ui-strings';

/* Texto traducible: una cadena para todos los idiomas o una por idioma. */
const LabelSchema = z.union([z.string(), z.record(z.string(), z.string())]);
export type Label = z.infer<typeof LabelSchema>;

/* Una imagen vive en `public/` (ruta absoluta del sitio) o es una URL https. */
const ImageSrcSchema = z
  .string()
  .regex(/^(\/(?!\/)|https:\/\/)/, 'Debe ser una ruta de `public/` (/og.png) o una URL https.');

/* Un favicon vive en `public/` (con o sin barra inicial) o es una URL https; nada de http ni otros esquemas. */
const FaviconSchema = z
  .string()
  .min(1)
  .refine(
    (favicon) =>
      favicon.startsWith('https://') ||
      !(favicon.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(favicon)),
    'Debe ser una ruta de `public/` (favicon.svg) o una URL https.',
  );

/** Valores permitidos de `MissingTranslation` como esquema: zod los lista en el mensaje de error. */
export const MissingTranslationSchema = z.enum(Object.values(MissingTranslation));

/** Valores permitidos de las columnas laterales y del ancho: zod los lista en el mensaje de error. */
export const PanelStateSchema = z.enum(Object.values(PanelState));
export const LayoutWidthSchema = z.enum(Object.values(LayoutWidth));

/** Override de SEO de una página: frontmatter `seo` (nativas) o `external[].seo` (externas). */
export const PageSeoOverrideSchema = z.strictObject({
  title: z.string().optional(),
  description: LabelSchema.optional(),
  image: z.strictObject({ src: ImageSrcSchema, alt: LabelSchema.optional() }).optional(),
  noindex: z.boolean().optional(),
});
export type PageSeoOverride = z.infer<typeof PageSeoOverrideSchema>;

/**
 * Entrada del sidebar: un slug o una sección `{ label, slug?, items }`. La portada se escribe
 * `'index'` (su slug interno es vacío). Un slug sin página hace fallar la carga.
 */
export type SidebarItem = string | { label: Label; slug?: string; items?: SidebarItem[] };

const SidebarItemSchema: z.ZodType<SidebarItem, SidebarItem> = z.lazy(() =>
  z.union([
    z.string(),
    z.strictObject({
      label: LabelSchema,
      slug: z.string().optional(),
      items: z.array(SidebarItemSchema).optional(),
    }),
  ]),
);

/* Esquema estricto de `ui`, generado desde las claves del catálogo: una clave desconocida falla. */
const UiLocaleSchema = z.strictObject(
  Object.fromEntries(uiKeys.map((key) => [key, z.string().optional()])) as Record<
    UiKey,
    z.ZodOptional<z.ZodString>
  >,
);

const ExternalDocSchema = z.strictObject({
  slug: z
    .string()
    .min(1)
    .refine(
      (slug) => !slug.startsWith('/') && !slug.endsWith('/'),
      'Sin barras al principio ni al final.',
    ),
  file: z
    .string()
    .refine(
      (file) => !/^[a-z][a-z0-9+.-]*:\/\//i.test(file),
      'Debe ser una ruta local, no una URL.',
    )
    .refine((file) => file.endsWith('.md'), 'Debe ser un archivo Markdown (.md).'),
  locales: z.array(z.string()).optional(),
  seo: PageSeoOverrideSchema.optional(),
  translations: MissingTranslationSchema.optional(),
});
export type ExternalDoc = z.infer<typeof ExternalDocSchema>;

/**
 * Esquema de la config pública `docs({...})`. Única fuente de verdad: `DocsUserConfig` sale de
 * aquí. Los valores por defecto los pone `resolveConfig`, no el esquema.
 */
export const DocsConfigSchema = z
  .strictObject({
    name: z.string().min(1),
    seo: z
      .strictObject({
        titleTemplate: z
          .string()
          .refine(
            (template) => template.includes('%s'),
            'Debe contener `%s` (el título de la página).',
          )
          .optional(),
        description: LabelSchema.optional(),
        image: z.strictObject({ src: ImageSrcSchema, alt: LabelSchema }).optional(),
      })
      .optional(),
    favicon: FaviconSchema.optional(),
    locales: z.array(z.string().min(1)).min(1).optional(),
    defaultLocale: z.string().optional(),
    translations: z.strictObject({ missing: MissingTranslationSchema.optional() }).optional(),
    ui: z.record(z.string(), UiLocaleSchema).optional(),
    external: z.array(ExternalDocSchema).optional(),
    sidebar: z.array(SidebarItemSchema).optional(),
    editUrl: z.string().optional(),
    repoRoot: z.string().optional(),
    privacyUrl: z
      .string()
      .regex(
        /^(https?:\/\/|\/)/,
        'Debe ser una URL absoluta (https://…) o una ruta del sitio (/privacidad).',
      )
      .optional(),
    gtmId: z.string().min(1).optional(),
    social: z.strictObject({ github: z.string().optional() }).optional(),
    layout: z
      .strictObject({
        sidebar: PanelStateSchema.optional(),
        toc: PanelStateSchema.optional(),
        width: LayoutWidthSchema.optional(),
        toggles: z.boolean().optional(),
      })
      .optional(),
  })
  .superRefine((config, ctx) => {
    const locales = config.locales ?? ['en'];
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    locales.forEach((locale, index) => {
      if (!(locale in defaultStrings)) {
        issue(
          ['locales', index],
          `El idioma «${locale}» no tiene textos de interfaz en el paquete (disponibles: ${Object.keys(defaultStrings).join(', ')}).`,
        );
      }
    });
    if (config.defaultLocale !== undefined && !locales.includes(config.defaultLocale)) {
      issue(
        ['defaultLocale'],
        `«${config.defaultLocale}» no está en \`locales\` (${locales.join(', ')}).`,
      );
    }
    for (const locale of Object.keys(config.ui ?? {})) {
      if (!locales.includes(locale)) {
        issue(['ui', locale], `«${locale}» no está en \`locales\` (${locales.join(', ')}).`);
      }
    }
    config.external?.forEach((entry, index) => {
      entry.locales?.forEach((locale, localeIndex) => {
        if (!locales.includes(locale)) {
          issue(
            ['external', index, 'locales', localeIndex],
            `«${locale}» no está en \`locales\` (${locales.join(', ')}).`,
          );
        }
      });
    });
    if (config.gtmId !== undefined && config.privacyUrl === undefined) {
      issue(['privacyUrl'], 'Es obligatoria cuando se define `gtmId`.');
    }
  });

/** Lo que escribe el consumidor en `docs({...})` / `defineDocsConfig({...})`. */
export type DocsUserConfig = z.input<typeof DocsConfigSchema>;
