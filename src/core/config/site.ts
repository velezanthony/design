import { z } from 'astro/zod';
import type { FooterConfig, FooterLink } from './footer';
import { LayoutWidth, PanelState } from './layout';
import { ImageSrcSchema, JsonLdSchema, LabelSchema, TitleSuffixSchema } from './shared-schemas';

/* `site`: cómo se ve y se presenta el sitio (nombre, tema, pie, disposición, SEO y analítica). */

/** URL absoluta o ruta del sitio: lo que puede enlazar el aviso de consentimiento. */
export const PrivacyUrlSchema = z
  .string()
  .regex(
    /^(https?:\/\/|\/)/,
    'Debe ser una URL absoluta (https://…) o una ruta del sitio (/privacidad).',
  );

/* Un favicon vive en `public/` (con o sin barra inicial) o es una URL https; nada de http ni otros esquemas. */
export const FaviconSchema = z
  .string()
  .min(1)
  .refine(
    (favicon) =>
      favicon.startsWith('https://') ||
      !(favicon.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(favicon)),
    'Debe ser una ruta de `public/` (favicon.svg) o una URL https.',
  );

/** Valores permitidos de las columnas laterales y del ancho: zod los lista en el mensaje de error. */
export const PanelStateSchema = z.enum(Object.values(PanelState));
export const LayoutWidthSchema = z.enum(Object.values(LayoutWidth));

/* Igual que `nav`: forma plana y validación en `superRefine` para que cada fallo lleve su ruta
   (`footer.links[1].href`). */
export const FooterLinkSchema = z.strictObject({
  label: LabelSchema,
  slug: z.string().min(1).optional(),
  href: z.string().optional(),
}) as unknown as z.ZodType<FooterLink, FooterLink>;

export const FooterSchema = z.strictObject({
  license: z
    .union([z.string().min(1), z.strictObject({ label: LabelSchema, href: z.string() })])
    .optional(),
  author: z
    .union([z.literal(false), z.strictObject({ name: z.string().min(1), href: z.string() })])
    .optional(),
  links: z.array(FooterLinkSchema).optional(),
}) as unknown as z.ZodType<FooterConfig, FooterConfig>;

/* Componentes del sitio que sustituyen a los de la librería (como los `components` de Starlight): la
   ruta de un `.astro` desde la raíz del proyecto. Estricto: un nombre que no se puede sustituir falla. */
export const ComponentsSchema = z.strictObject({
  Footer: z
    .string()
    .refine(
      (file) => file.endsWith('.astro') && !/^[a-z][a-z0-9+.-]*:\/\//i.test(file),
      'Debe ser la ruta local de un componente .astro (./src/components/Footer.astro).',
    )
    .optional(),
});
export type ComponentsConfig = z.infer<typeof ComponentsSchema>;

/** `site.seo`: lo común a todas las páginas, los `og:locale` y los sitemaps del dominio. */
const SiteSeoSchema = z.strictObject({
  /** Sufijo del `<title>`; por defecto, el nombre del sitio. `false`: ninguno. */
  titleSuffix: TitleSuffixSchema.optional(),
  /** Descripción por defecto de las páginas que no traen la suya. */
  description: LabelSchema.optional(),
  /** Imagen por defecto al compartir, con su texto alternativo. */
  image: z.strictObject({ src: ImageSrcSchema, alt: LabelSchema }).optional(),
  /** JSON-LD que lleva toda página. */
  schema: z.array(JsonLdSchema).optional(),
  /** `og:locale` de cada idioma con territorio (`es_ES`); sin él, el propio idioma (`es`). */
  ogLocales: z
    .record(
      z.string(),
      z.string().regex(/^[a-z]{2,3}_[A-Z]{2}$/, 'Debe ser idioma_TERRITORIO: es_ES, en_GB.'),
    )
    .optional(),
  /** Otros sitemaps del dominio que el índice `sitemap.xml` declara (rutas o URLs del mismo origen). */
  sitemap: z.strictObject({ include: z.array(z.string().min(1)).optional() }).optional(),
});

/** `site.analytics`: Google Tag Manager y la página de privacidad. */
const AnalyticsSchema = z.strictObject({
  /** Contenedor de Google Tag Manager; sin él no hay analítica. */
  gtmId: z.string().min(1).optional(),
  /** Página de privacidad que enlazan el pie y el aviso de consentimiento (también sin analítica). */
  privacyUrl: z.union([PrivacyUrlSchema, z.record(z.string(), PrivacyUrlSchema)]).optional(),
});

/** `site`: obligatorio, porque lleva el nombre. */
export const SiteSchema = z
  .strictObject({
    /** Nombre del sitio: cabecera, `<title>` y datos estructurados. */
    name: z.string().min(1),
    /** Icono del sitio: ruta de `public/` o URL https. */
    favicon: FaviconSchema.optional(),
    /** CSS del proyecto (ruta desde su raíz) con `@theme` y estilos propios: se compila junto a `theme.css`. */
    theme: z
      .string()
      .refine(
        (file) => file.endsWith('.css') && !/^[a-z][a-z0-9+.-]*:\/\//i.test(file),
        'Debe ser la ruta local de un archivo CSS (src/styles/site.css).',
      )
      .optional(),
    /** Perfiles del sitio (GitHub). */
    social: z.strictObject({ github: z.string().optional() }).optional(),
    /** Componentes propios que sustituyen a los de la librería: `{ Footer: './src/…/Footer.astro' }`. */
    components: ComponentsSchema.optional(),
    /** Pie: licencia, autor y enlaces. */
    footer: FooterSchema.optional(),
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
    /** SEO de todo el sitio. */
    seo: SiteSeoSchema.optional(),
    /** Analítica y privacidad. */
    analytics: AnalyticsSchema.optional(),
  })
  .superRefine((site, context) => {
    validateFooterShape(site.footer, (path, message) =>
      context.addIssue({ code: 'custom', path, message }),
    );
  });

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
