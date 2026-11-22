import { DEFAULT_CONTENT_DIR, normalizePath } from '../content/content-dir';
import type { StaticFolder } from '../content/static-folders';
import { DocsError, DocsErrors, formatPath } from '../errors';
import type { Locale } from '../i18n/locale';
import type { MissingTranslation } from '../i18n/translation-policy';
import type { UiOverrides } from '../i18n/ui-strings';
import type { FooterConfig } from './footer';
import { resolveFolders, type ResolvedFolders } from './folders';
import { resolveLayout, type ResolvedLayout } from './layout';
import type { NavItem } from './nav';
import {
  DocsConfigSchema,
  type ComponentsConfig,
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
    /** Sufijo del `<title>` del sitio, ya con el `name` del sitio si la config no dice nada. */
    titleSuffix: Label | false;
    description?: Label;
    image?: { src: string; alt: Label };
    /** JSON-LD que lleva TODA página (salvo `schema: false`); la librería no pone ninguno por su cuenta. */
    schema?: JsonLd[];
  };
  /** Favicon de `public/` o URL https; sin definir, el del paquete. */
  favicon?: string;
  /** `og:locale` de cada idioma con territorio (`es_ES`); sin él, el propio idioma. */
  ogLocales?: Record<Locale, string>;
  /** CSS propio del proyecto, relativo a su raíz; la integración lo compila con el tema de la librería. */
  theme?: string;
  /** Carpeta de las páginas nativas, relativa a la raíz del proyecto y ya normalizada (`../docs`). */
  content: string;
  /** Carpetas que se publican tal cual (informe de cobertura): `from` desde la raíz del proyecto, `to` bajo el sitio. */
  static?: StaticFolder[];
  /** Patrones de `.md` de `content` que no se publican (relativos a esa carpeta). */
  exclude: string[];
  locales: Locale[];
  defaultLocale: Locale;
  /** `declared`: el sitio eligió la política; entonces una traducción ausente no es un olvido. */
  translations: { missing: MissingTranslation; declared: boolean };
  ui: UiOverrides;
  external: ExternalDoc[];
  sidebar?: SidebarItem[];
  /** Items de la cabecera; sin definir, el sitio usa solo `sidebar`. */
  nav?: NavItem[];
  /** Footer del sitio; sin definir, solo el autor por defecto. */
  footer?: FooterConfig;
  /** Componentes propios del sitio (rutas desde su raíz); sin definir, los de la librería. */
  components?: ComponentsConfig;
  editUrl?: string;
  repoRoot?: string;
  /** Enlace de privacidad del pie: una URL o una por idioma. Con `gtmId` es obligatoria (el aviso de cookies enlaza a ella). */
  privacyUrl?: Label;
  /** ID del contenedor de GTM de la config (anula al del entorno); la integración fija el efectivo. */
  gtmId?: string;
  social?: { github?: string };
  /** Con `include`, `sitemap.xml` es un índice: las páginas propias y estos sitemaps del dominio. */
  sitemap: { include: string[] };
  layout: ResolvedLayout;
  /** Ajustes por carpeta tal como se declararon; `folderSettings` (`./folders`) resuelve la herencia. */
  folders: ResolvedFolders;
}

const DEFAULT_LOCALES = ['en'];
const DEFAULT_MISSING_TRANSLATION: MissingTranslation = 'link';

/** Valida la config y aplica los valores por defecto; si es inválida lanza `DocsErrors` con la ruta de cada campo. */
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
  const { folders, ...config } = result.data;
  const locales = config.locales ?? DEFAULT_LOCALES;
  return {
    ...config,
    seo: { ...config.seo, titleSuffix: config.seo?.titleSuffix ?? config.name },
    content: normalizePath(config.content ?? DEFAULT_CONTENT_DIR),
    exclude: config.exclude ?? [],
    locales,
    defaultLocale: config.defaultLocale ?? locales[0]!, // el esquema exige al menos un idioma
    translations: {
      missing: config.translations?.missing ?? DEFAULT_MISSING_TRANSLATION,
      declared: config.translations?.missing !== undefined,
    },
    ui: config.ui ?? {},
    external: config.external ?? [],
    layout: resolveLayout(config.layout),
    folders: resolveFolders(folders),
    sitemap: { include: config.sitemap?.include ?? [] },
  };
}
