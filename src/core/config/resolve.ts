import { DEFAULT_CONTENT_DIR, normalizePath } from '../content/content-dir';
import { DocsError, DocsErrors, formatPath } from '../errors';
import type { Locale } from '../i18n/locale';
import type { MissingTranslation } from '../i18n/translation-policy';
import type { UiOverrides } from '../i18n/ui-strings';
import type { FooterConfig } from './footer';
import { DEFAULT_CONTROLLER, type Controller } from '../privacy/copy';
import { DEFAULT_TITLE_SUFFIX } from '../seo/title';
import { resolveLayout, type ResolvedLayout } from './layout';
import type { NavItem } from './nav';
import {
  DocsConfigSchema,
  type ExternalDoc,
  type JsonLd,
  type Label,
  type SidebarItem,
  type DocsUserConfig,
} from './schema';

/** Config con todos los valores por defecto aplicados: es la que consume el resto del paquete. */
export interface ResolvedConfig {
  name: string;
  seo: {
    /** Sufijo del `<title>` del sitio, ya con el de la librería si la config no dice nada. */
    titleSuffix: Label | false;
    description?: Label;
    image?: { src: string; alt: Label };
    /** JSON-LD que lleva TODA página (salvo `schema: false`); la librería no pone ninguno por su cuenta. */
    schema?: JsonLd[];
  };
  /** Favicon de `public/` o URL https; sin definir, el del paquete. */
  favicon?: string;
  /** Carpeta de las páginas nativas, relativa a la raíz del proyecto y ya normalizada (`../docs`). */
  content: string;
  locales: Locale[];
  defaultLocale: Locale;
  translations: { missing: MissingTranslation };
  ui: UiOverrides;
  external: ExternalDoc[];
  sidebar?: SidebarItem[];
  /** Items de la cabecera; sin definir, el sitio usa solo `sidebar`. */
  nav?: NavItem[];
  /** Footer del sitio; sin definir, solo el autor por defecto. */
  footer?: FooterConfig;
  editUrl?: string;
  repoRoot?: string;
  /** Enlace de privacidad: una URL o una por idioma. La integración lo completa según la analítica. */
  privacyUrl?: Label;
  /** ID del contenedor de GTM de la config (anula al del entorno); la integración fija el efectivo. */
  gtmId?: string;
  /** Página de privacidad propia: desactivada por defecto; el responsable sale en el texto. */
  privacy: { page: boolean; controller: Controller };
  social?: { github?: string };
  /** Con `include`, `sitemap.xml` es un índice: las páginas propias y estos sitemaps del dominio. */
  sitemap: { include: string[] };
  layout: ResolvedLayout;
}

const DEFAULT_LOCALES = ['en'];
const DEFAULT_MISSING_TRANSLATION: MissingTranslation = 'link';

/**
 * Valida la config del consumidor y le aplica los valores por defecto. Pura y determinista: el
 * loader (plan B) y la integración la llaman con la misma entrada y obtienen lo mismo. Si es
 * inválida lanza un `DocsErrors` con la ruta de cada campo (`external[0].seo.image.src`).
 */
export function resolveConfig(user: DocsUserConfig): ResolvedConfig {
  const result = DocsConfigSchema.safeParse(user);
  if (!result.success) {
    throw new DocsErrors(
      result.error.issues.flatMap((issue) => {
        // Una opción desconocida se nombra con su ruta completa (`ui.es.search.placeholdr`).
        if (issue.code === 'unrecognized_keys') {
          return issue.keys.map(
            (key) => new DocsError(`${formatPath([...issue.path, key])}: opción desconocida.`),
          );
        }
        return [new DocsError(`${formatPath(issue.path)}: ${issue.message}`)];
      }),
    );
  }
  const config = result.data;
  const locales = config.locales ?? DEFAULT_LOCALES;
  return {
    ...config,
    seo: { ...config.seo, titleSuffix: config.seo?.titleSuffix ?? DEFAULT_TITLE_SUFFIX },
    content: normalizePath(config.content ?? DEFAULT_CONTENT_DIR),
    locales,
    defaultLocale: config.defaultLocale ?? locales[0],
    translations: { missing: config.translations?.missing ?? DEFAULT_MISSING_TRANSLATION },
    ui: config.ui ?? {},
    external: config.external ?? [],
    layout: resolveLayout(config.layout),
    sitemap: { include: config.sitemap?.include ?? [] },
    privacy: {
      page: config.privacy?.page ?? false,
      controller: config.privacy?.controller ?? { ...DEFAULT_CONTROLLER },
    },
  };
}
