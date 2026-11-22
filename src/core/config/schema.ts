import { z } from 'astro/zod';
import { contentDirProblem } from '../content/content-dir';
import {
  staticDestinationsOverlap,
  staticFolderProblem,
  type StaticFolder,
} from '../content/static-folders';
import { MissingTranslation } from '../i18n/translation-policy';
import { FoldersSchema } from './folders';
import { LayoutWidth, PanelState } from './layout';
import type { FooterConfig, FooterLink } from './footer';
import { NavIcon, type NavItem } from './nav';
import { defaultStrings, uiKeys, type UiKey } from '../i18n/ui-strings';

/* Texto traducible: una cadena para todos los idiomas o una por idioma. */
const LabelSchema = z.union([z.string(), z.record(z.string(), z.string())]);
export type Label = z.infer<typeof LabelSchema>;

/** URL absoluta o ruta del sitio: lo que puede enlazar el aviso de consentimiento. */
const PrivacyUrlSchema = z
  .string()
  .regex(
    /^(https?:\/\/|\/)/,
    'Debe ser una URL absoluta (https://…) o una ruta del sitio (/privacidad).',
  );

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

/** Sufijo del `<title>`: texto (o uno por idioma), o `false` para no llevar ninguno. */
const TitleSuffixSchema = z.union([LabelSchema, z.literal(false)]);

/** Rutas (dentro del valor) de lo que `JSON.stringify` perdería o rompería: funciones, símbolos, bigint, NaN/Infinity. */
function nonJsonPaths(value: unknown, path: (string | number)[] = []): (string | number)[][] {
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    return [path];
  }
  if (typeof value === 'number') return Number.isFinite(value) ? [] : [path];
  if (Array.isArray(value))
    return value.flatMap((item, index) => nonJsonPaths(item, [...path, index]));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => nonJsonPaths(item, [...path, key]));
  }
  return [];
}

/* Nodo JSON-LD: `@type` más propiedades abiertas, y el error de `@type` lleva su ruta en vez de un «Invalid input». */
const JsonLdSchema = z
  .looseObject({
    '@type': z.union([z.string().min(1), z.array(z.string().min(1)).min(1)], {
      error: 'Debe ser un string o una lista no vacía de strings (por ejemplo "Person").',
    }),
  })
  .superRefine((node, context) => {
    for (const path of nonJsonPaths(node)) {
      context.addIssue({
        code: 'custom',
        path,
        message:
          'Debe ser un valor JSON (texto, número, booleano, null, lista u objeto): la config viaja al sitio como JSON.',
      });
    }
  });
export type JsonLd = z.infer<typeof JsonLdSchema>;

/* `lista | false` sin `z.union`: con una unión zod colapsa los fallos de cada rama en un «Invalid
   input» sin ruta, y justo ahí (`seo.schema[1]['@type']`) está lo que el usuario necesita leer. */
const PageSchemasSchema = z.any().superRefine((value, context) => {
  if (value === false) return;
  if (!Array.isArray(value)) {
    context.addIssue({ code: 'custom', message: 'Debe ser una lista de schemas o `false`.' });
    return;
  }
  const parsed = z.array(JsonLdSchema).safeParse(value);
  if (parsed.success) return;
  for (const { path, message } of parsed.error.issues) {
    context.addIssue({ code: 'custom', path, message });
  }
}) as unknown as z.ZodType<JsonLd[] | false, JsonLd[] | false>;

/** Override de SEO de una página: frontmatter `seo` (nativas) o `external[].seo` (externas). */
export const PageSeoOverrideSchema = z.strictObject({
  title: LabelSchema.optional(),
  titleSuffix: TitleSuffixSchema.optional(),
  description: LabelSchema.optional(),
  image: z.strictObject({ src: ImageSrcSchema, alt: LabelSchema.optional() }).optional(),
  noindex: z.boolean().optional(),
  /** Lista que se SUMA a la del sitio, o `false` para que la página no lleve ninguno. */
  schema: PageSchemasSchema.optional(),
});
export type PageSeoOverride = z.infer<typeof PageSeoOverrideSchema>;

/** Entrada del sidebar: slug o sección `{ label, slug?, items }`; la portada es `'index'` y un slug sin página falla. */
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

/* Componentes del sitio que sustituyen a los de la librería (como los `components` de Starlight): la
   ruta de un `.astro` desde la raíz del proyecto. Estricto: un nombre que no se puede sustituir falla. */
const ComponentsSchema = z.strictObject({
  Footer: z
    .string()
    .refine(
      (file) => file.endsWith('.astro') && !/^[a-z][a-z0-9+.-]*:\/\//i.test(file),
      'Debe ser la ruta local de un componente .astro (./src/components/Footer.astro).',
    )
    .optional(),
});
export type ComponentsConfig = z.infer<typeof ComponentsSchema>;

/** Esquema de la config pública y fuente de `DocsUserConfig`; los valores por defecto los pone `resolveConfig`. */
export const DocsConfigSchema = z
  .strictObject({
    /** Nombre del sitio: cabecera, `<title>` y datos estructurados. */
    name: z.string().min(1),
    /** SEO de todo el sitio: sufijo del `<title>`, descripción e imagen por defecto y JSON-LD común. */
    seo: z
      .strictObject({
        titleSuffix: TitleSuffixSchema.optional(),
        description: LabelSchema.optional(),
        image: z.strictObject({ src: ImageSrcSchema, alt: LabelSchema }).optional(),
        schema: z.array(JsonLdSchema).optional(),
      })
      .optional(),
    /** Icono del sitio: ruta de `public/` o URL https. */
    favicon: FaviconSchema.optional(),
    /** `og:locale` de cada idioma con territorio (`es_ES`); sin él, el propio idioma (`es`). */
    ogLocales: z
      .record(
        z.string(),
        z.string().regex(/^[a-z]{2,3}_[A-Z]{2}$/, 'Debe ser idioma_TERRITORIO: es_ES, en_GB.'),
      )
      .optional(),
    /** Carpeta del contenido desde la raíz del proyecto (por defecto `src/content/docs`). */
    content: z
      .string()
      .superRefine((directory, context) => {
        const problem = contentDirProblem(directory);
        if (problem) context.addIssue({ code: 'custom', message: problem });
      })
      .optional(),
    /** CSS del proyecto (ruta desde su raíz) con `@theme` y estilos propios: se compila junto a `theme.css`. */
    theme: z
      .string()
      .refine(
        (file) => file.endsWith('.css') && !/^[a-z][a-z0-9+.-]*:\/\//i.test(file),
        'Debe ser la ruta local de un archivo CSS (src/styles/site.css).',
      )
      .optional(),
    /** Carpetas que se publican tal cual (un informe de cobertura HTML): `from` desde la raíz del proyecto, `to` bajo el sitio, `exclude` lo que no. */
    static: z
      .array(
        z.strictObject({
          from: z.string().min(1),
          to: z.string().min(1),
          exclude: z.array(z.string().min(1)).optional(),
        }),
      )
      .optional(),
    /** Patrones (estilo `.gitignore`) de los `.md` de `content` que no se publican; equivale a `exclude_docs` de MkDocs. */
    exclude: z.array(z.string().min(1)).optional(),
    /** Idiomas del sitio; el primero es el de por defecto si no se declara `defaultLocale`. */
    locales: z.array(z.string().min(1)).min(1).optional(),
    /** Idioma sin prefijo en la URL; debe estar en `locales`. */
    defaultLocale: z.string().optional(),
    /** Qué hacer con una página sin traducción (`MissingTranslation`). */
    translations: z.strictObject({ missing: MissingTranslationSchema.optional() }).optional(),
    /** Textos de interfaz propios por idioma; sustituyen a los del paquete. */
    ui: z.record(z.string(), UiLocaleSchema).optional(),
    /** Archivos Markdown de fuera de `content` que se publican con un slug propio. */
    external: z.array(ExternalDocSchema).optional(),
    /** Barra lateral general escrita a mano; sin ella, el árbol automático de carpetas. */
    sidebar: z.array(SidebarItemSchema).optional(),
    /** Cabecera: secciones, páginas sueltas y enlaces externos (`NavIcon`). */
    nav: z.array(NavItemSchema).optional(),
    /** Pie: licencia, autor y enlaces. */
    footer: FooterSchema.optional(),
    /** Ajustes por carpeta (listado, árbol) heredados de padre a hijo; `'*'` lleva los de todo el sitio. */
    folders: FoldersSchema.optional(),
    /** Componentes propios que sustituyen a los de la librería: `{ Footer: './src/…/Footer.astro' }`. */
    components: ComponentsSchema.optional(),
    /** URL base del enlace «Editar esta página». */
    editUrl: z.string().optional(),
    /** Raíz del repositorio relativa al proyecto (por defecto, el ancestro con `.git`): de ella cuelgan las rutas de `editUrl`. */
    repoRoot: z.string().optional(),
    /** Página de privacidad que enlazan el pie y el aviso de consentimiento. */
    privacyUrl: z.union([PrivacyUrlSchema, z.record(z.string(), PrivacyUrlSchema)]).optional(),
    /** Contenedor de Google Tag Manager; sin él no hay analítica. */
    gtmId: z.string().min(1).optional(),
    /** Perfiles del sitio (GitHub). */
    social: z.strictObject({ github: z.string().optional() }).optional(),
    /** Otros sitemaps del dominio que el índice `sitemap.xml` declara (rutas o URLs del mismo origen). */
    sitemap: z.strictObject({ include: z.array(z.string().min(1)).optional() }).optional(),
    /** Disposición de la página: columnas laterales (`PanelState`), ancho (`LayoutWidth`) e índice. */
    layout: z
      .strictObject({
        sidebar: PanelStateSchema.optional(),
        toc: PanelStateSchema.optional(),
        width: LayoutWidthSchema.optional(),
        toggles: z.boolean().optional(),
        tocDepth: z.number().int().min(2).max(6).optional(),
        tocMaxHeight: z
          .string()
          .regex(/^\d+(\.\d+)?(px|rem|em|vh|dvh|svh)$/, 'Debe ser una longitud CSS: 60vh, 24rem.')
          .optional(),
      })
      .optional(),
  })
  .superRefine((config, context) => {
    const locales = config.locales ?? ['en'];
    function issue(path: (string | number)[], message: string) {
      return context.addIssue({ code: 'custom', path, message });
    }

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
    for (const locale of Object.keys(config.ogLocales ?? {})) {
      if (!locales.includes(locale)) {
        issue(['ogLocales', locale], `«${locale}» no está en \`locales\` (${locales.join(', ')}).`);
      }
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
    validateStaticFolders(config.static ?? [], locales, issue);
    validateNavShape(config.nav ?? [], issue);
    validateFooterShape(config.footer, issue);
    if (typeof config.privacyUrl === 'object') {
      for (const locale of Object.keys(config.privacyUrl)) {
        if (!locales.includes(locale)) {
          issue(
            ['privacyUrl', locale],
            `«${locale}» no está en \`locales\` (${locales.join(', ')}).`,
          );
        }
      }
    }
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
      issue(['static', index], problem);
      return;
    }
    const clash = folders
      .slice(0, index)
      .findIndex((other) => staticDestinationsOverlap(other.to, folder.to));
    if (clash !== -1) {
      issue(
        ['static', index, 'to'],
        `«${folder.to}» se solapa con «${folders[clash]!.to}» (static[${clash}].to): dos carpetas no pueden publicarse en el mismo sitio.`,
      );
    }
  });
}

/** Lo que se puede juzgar de `nav` sin conocer las páginas: forma de cada item, https y solape de dirs. */
function validateNavShape(
  nav: readonly NavItem[],
  issue: (path: (string | number)[], message: string) => void,
): void {
  const directories: { directory: string; index: number }[] = [];
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
    // Una sección puede ser solo `sidebar`: sus páginas no tienen por qué compartir carpeta.
    if (kinds.length === 0 && item.sidebar !== undefined) return;
    if (kinds.length !== 1) {
      issue(
        ['nav', index],
        'Debe ser una sección (`dir` o `sidebar`), una página (`slug`) o un enlace (`href`), solo una de las tres.',
      );
      return;
    }
    if (item.sidebar !== undefined && item.dir === undefined) {
      issue(['nav', index, 'sidebar'], 'Solo una sección tiene `sidebar`.');
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
      const clash = directories.find((other) => overlaps(other.directory, item.dir!));
      if (clash) {
        issue(
          ['nav', index, 'dir'],
          `«${item.dir}» se solapa con «${clash.directory}» (nav[${clash.index}].dir): una página no puede ser de dos secciones.`,
        );
      }
      directories.push({ directory: item.dir, index });
    }
  });
}

/** Dos carpetas se solapan si son la misma o una cuelga de la otra (`users` y `users/guide`). */
function overlaps(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

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
