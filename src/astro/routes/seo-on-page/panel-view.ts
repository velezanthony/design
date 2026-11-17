import type { ResolvedLayout } from '../../../core/config/layout';
import { buildAvailability, pageUrl } from '../../../core/i18n/availability';
import type { Locale } from '../../../core/i18n/locale';
import { resolvePolicies } from '../../../core/i18n/translation-policy';
import type { UiStrings } from '../../../core/i18n/ui-strings';
import { buildFooter, type FooterView } from '../../../core/navigation/footer';
import { buildNav, type NavEntry } from '../../../core/navigation/nav-entries';
import type { SidebarNode } from '../../../core/navigation/sidebar';
import type { HeadConfig } from '../../../core/seo/head';
import { INSPECTOR_SECTIONS, PANEL_NAME, SCREEN_LABELS } from '../../../ui/seo-on-page/labels';
import { pagesOf, urlPolicyOf, type DocData } from '../pages';
import type { VirtualConfig } from '../../virtual/data';
import { SEO_ON_PAGE_DIR, type DevHrefs } from './hrefs';

type Screen = keyof typeof SCREEN_LABELS;

/** Un encabezado para «En esta página» (el mismo formato que los de una página de docs). */
export interface PanelHeading {
  depth: number;
  slug: string;
  text: string;
}

/** Lo que `DocsLayout` recibe en una pantalla del panel; el contenedor solo añade el año. */
export interface PanelView {
  lang: Locale;
  head: HeadConfig[];
  siteName: string;
  homeHref: string;
  hrefs: Partial<Record<Locale, string>>;
  strings: UiStrings;
  sidebar: SidebarNode[];
  nav: NavEntry[];
  footer: FooterView;
  current: string;
  headings: PanelHeading[];
  indexable: false;
  baseUrl: string;
  layout: ResolvedLayout;
  prose: false;
}

interface PanelViewInput {
  cfg: VirtualConfig;
  /** La colección, para que cabecera y pie se resuelvan como en el resto del sitio. */
  data: DocData[];
  hrefs: DevHrefs;
  screen: Screen;
  /** Nombre de la pantalla; el `<title>` le añade el del panel. */
  title: string;
  headings?: PanelHeading[];
}

/** Los encabezados de las secciones del inspector, para «En esta página». */
export const inspectorHeadings = (): PanelHeading[] =>
  Object.entries(INSPECTOR_SECTIONS).map(([slug, text]) => ({ depth: 2, slug, text }));

/**
 * Todo lo que `DocsLayout` necesita para una pantalla del panel, con el mismo molde que `docView`:
 * el idioma por defecto, la cabecera y el pie del sitio y su tema. La barra lateral es la navegación
 * del panel, y la página NUNCA se indexa y no lleva analítica ni aviso de consentimiento (ni
 * `gtmId` ni `privacyUrl`) ni enlace de edición: es una herramienta de desarrollo.
 */
export function panelView({
  cfg,
  data,
  hrefs,
  screen,
  title,
  headings = [],
}: PanelViewInput): PanelView {
  const url = urlPolicyOf(cfg);
  const pages = pagesOf(data);
  const { policies } = resolvePolicies(pages, cfg.translations.missing);
  const lang = cfg.defaultLocale;
  const strings = cfg.strings[lang] as UiStrings;
  /* El panel no es una página de la colección: con su carpeta como slug no coincide con ninguna
     sección de `nav`, así que la cabecera no marca nada como actual. */
  const context = {
    pages,
    av: buildAvailability(pages, url),
    locale: lang,
    cfg,
    policies,
    url,
    slug: SEO_ON_PAGE_DIR,
  };
  const screens = {
    overview: { slug: SEO_ON_PAGE_DIR, href: hrefs.overview() },
    pages: { slug: `${SEO_ON_PAGE_DIR}/pages`, href: hrefs.pages() },
  } satisfies Record<Screen, { slug: string; href: string }>;

  return {
    lang,
    head: [
      { tag: 'title', attrs: {}, content: `${title} · ${PANEL_NAME}` },
      { tag: 'meta', attrs: { name: 'robots', content: 'noindex' } },
    ],
    siteName: cfg.name,
    homeHref: pageUrl('', lang, url),
    hrefs: {},
    strings,
    sidebar: [
      {
        label: PANEL_NAME,
        items: (Object.keys(screens) as Screen[]).map((key) => ({
          label: SCREEN_LABELS[key],
          ...screens[key],
        })),
      },
    ],
    nav: buildNav(cfg.nav, context),
    footer: buildFooter(cfg, context, strings),
    current: screens[screen].href,
    headings,
    indexable: false,
    baseUrl: `${cfg.base.replace(/\/+$/, '')}/`,
    layout: cfg.layout,
    prose: false,
  };
}
