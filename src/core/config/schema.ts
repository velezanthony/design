import { z } from 'astro/zod';
import { MissingTranslation } from '../i18n/translation-policy';
import { LayoutWidth, PanelState } from './layout';
import type { FooterConfig, FooterLink } from './footer';
import { NavIcon, type NavItem } from './nav';
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

/** Valores permitidos de los iconos de `nav`: zod los lista en el mensaje de error. */
export const NavIconSchema = z.enum(Object.values(NavIcon));

/* Un item de `nav` se lee con una forma plana y se valida en `superRefine`: con una unión de tres
   objetos zod solo diría «Invalid input» en `nav[1]`; así cada fallo lleva su ruta (`nav[1].href`). */
const NavItemSchema = z.strictObject({
  label: LabelSchema,
  dir: z.string().optional(),
  sidebar: z.array(SidebarItemSchema).optional(),
  slug: z.string().min(1).optional(),
  href: z.string().optional(),
  icon: NavIconSchema.optional(),
}) as unknown as z.ZodType<NavItem, NavItem>;

/* Igual que `nav`: forma plana y validación en `superRefine` para que cada fallo lleve su ruta
   (`footer.links[1].href`). */
const FooterLinkSchema = z.strictObject({
  label: LabelSchema,
  slug: z.string().min(1).optional(),
  href: z.string().optional(),
}) as unknown as z.ZodType<FooterLink, FooterLink>;

const FooterSchema = z.strictObject({
  license: z
    .union([z.string().min(1), z.strictObject({ label: LabelSchema, href: z.string() })])
    .optional(),
  author: z
    .union([z.literal(false), z.strictObject({ name: z.string().min(1), href: z.string() })])
    .optional(),
  links: z.array(FooterLinkSchema).optional(),
}) as unknown as z.ZodType<FooterConfig, FooterConfig>;

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
    nav: z.array(NavItemSchema).optional(),
    footer: FooterSchema.optional(),
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
    validateNavShape(config.nav ?? [], issue);
    validateFooterShape(config.footer, issue);
    if (config.gtmId !== undefined && config.privacyUrl === undefined) {
      issue(['privacyUrl'], 'Es obligatoria cuando se define `gtmId`.');
    }
  });

/** Lo que escribe el consumidor en `docs({...})` / `defineDocsConfig({...})`. */
export type DocsUserConfig = z.input<typeof DocsConfigSchema>;

/** Lo que se puede juzgar de `nav` sin conocer las páginas: forma de cada item, https y solape de dirs. */
function validateNavShape(
  nav: readonly NavItem[],
  issue: (path: (string | number)[], message: string) => void,
): void {
  const dirs: { dir: string; index: number }[] = [];
  nav.forEach((raw, index) => {
    // Forma plana (ver `NavItemSchema`): se mira por claves, no por el tipo discriminado.
    const item = raw as {
      dir?: string;
      slug?: string;
      href?: string;
      sidebar?: unknown;
      icon?: unknown;
    };
    const kinds = (['dir', 'slug', 'href'] as const).filter((key) => item[key] !== undefined);
    if (kinds.length !== 1) {
      issue(
        ['nav', index],
        'Debe ser una sección (`dir`), una página (`slug`) o un enlace (`href`), solo una de las tres.',
      );
      return;
    }
    if (item.sidebar !== undefined && item.dir === undefined) {
      issue(['nav', index, 'sidebar'], 'Solo una sección (`dir`) tiene `sidebar`.');
    }
    if (item.icon !== undefined && item.href === undefined) {
      issue(['nav', index, 'icon'], 'Solo un enlace (`href`) tiene `icon`.');
    }
    if (item.href !== undefined && !item.href.startsWith('https://')) {
      issue(['nav', index, 'href'], 'Debe ser una URL https (https://…).');
    }
    if (item.dir !== undefined) {
      if (item.dir === '' || item.dir.startsWith('/') || item.dir.endsWith('/')) {
        issue(
          ['nav', index, 'dir'],
          'Carpeta sin barras al principio ni al final (users, no /users/).',
        );
        return;
      }
      const clash = dirs.find((other) => overlaps(other.dir, item.dir!));
      if (clash) {
        issue(
          ['nav', index, 'dir'],
          `«${item.dir}» se solapa con «${clash.dir}» (nav[${clash.index}].dir): una página no puede ser de dos secciones.`,
        );
      }
      dirs.push({ dir: item.dir, index });
    }
  });
}

/** Dos carpetas se solapan si son la misma o una cuelga de la otra (`users` y `users/guide`). */
const overlaps = (a: string, b: string): boolean =>
  a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);

const HTTPS = 'Debe ser una URL https (https://…).';

/** Lo que se puede juzgar del `footer` sin conocer las páginas: forma de cada enlace y https. */
function validateFooterShape(
  footer: FooterConfig | undefined,
  issue: (path: (string | number)[], message: string) => void,
): void {
  if (!footer) return;
  const { license, author } = footer;
  if (typeof license === 'object' && !license.href.startsWith('https://')) {
    issue(['footer', 'license', 'href'], HTTPS);
  }
  if (author && !author.href.startsWith('https://')) issue(['footer', 'author', 'href'], HTTPS);
  footer.links?.forEach((raw, index) => {
    // Forma plana (ver `FooterLinkSchema`): se mira por claves, no por el tipo discriminado.
    const link = raw as { slug?: string; href?: string };
    if ((link.slug === undefined) === (link.href === undefined)) {
      issue(
        ['footer', 'links', index],
        'Debe ser una página (`slug`) o un enlace (`href`), solo uno de los dos.',
      );
      return;
    }
    if (link.href !== undefined && !link.href.startsWith('https://')) {
      issue(['footer', 'links', index, 'href'], HTTPS);
    }
  });
}
