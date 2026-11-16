import { DocsError, DocsErrors, formatPath } from '../errors';
import type { Locale } from '../i18n/locale';
import type { MissingTranslation } from '../i18n/translation-policy';
import type { UiOverrides } from '../i18n/ui-strings';
import type { FooterConfig } from './footer';
import { resolveLayout, type ResolvedLayout } from './layout';
import type { NavItem } from './nav';
import {
  DocsConfigSchema,
  type ExternalDoc,
  type Label,
  type SidebarItem,
  type DocsUserConfig,
} from './schema';

/** Config con todos los valores por defecto aplicados: es la que consume el resto del paquete. */
export interface ResolvedConfig {
  name: string;
  seo: {
    titleTemplate: string;
    description?: Label;
    image?: { src: string; alt: Label };
  };
  /** Favicon de `public/` o URL https; sin definir, el del paquete. */
  favicon?: string;
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
  privacyUrl?: string;
  gtmId?: string;
  social?: { github?: string };
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
    seo: { ...config.seo, titleTemplate: config.seo?.titleTemplate ?? `%s · ${config.name}` },
    locales,
    defaultLocale: config.defaultLocale ?? locales[0],
    translations: { missing: config.translations?.missing ?? DEFAULT_MISSING_TRANSLATION },
    ui: config.ui ?? {},
    external: config.external ?? [],
    layout: resolveLayout(config.layout),
  };
}
