import { LayoutWidth, type ResolvedLayout } from '../../../core/config/layout';
import { pageUrl } from '../../../core/i18n/availability';
import type { Locale } from '../../../core/i18n/locale';
import { defaultStrings, type UiStrings } from '../../../core/i18n/ui-strings';
import { buildFooter, type FooterView } from '../../../core/navigation/footer';
import { buildNav, type NavEntry } from '../../../core/navigation/nav-entries';
import type { SidebarNode } from '../../../core/navigation/sidebar';
import type { HeadConfig } from '../../../core/seo/head';
import {
  INSPECTOR_SECTIONS,
  PANEL_NAME,
  SCREEN_LABELS,
  inspectorTocText,
  type InspectorSection,
} from '../../../components/seo-on-page/labels';
import type { DocData } from '../../loader/schema';
import { navContextOf, siteContext } from '../chrome';
import type { VirtualConfig } from '../../virtual/data';
import { SEO_ON_PAGE_DIR } from '../../pages/routes';
import type { DevHrefs } from './hrefs';
import { baseUrl } from '../../../core/shared/urls';

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
  config: VirtualConfig;
  /** La colección, para que cabecera y pie se resuelvan como en el resto del sitio. */
  data: DocData[];
  hrefs: DevHrefs;
  screen: Screen;
  /** Nombre de la pantalla; el `<title>` le añade el del panel. */
  title: string;
  headings?: PanelHeading[];
}

/** Encabezados del inspector para «En esta página»: «Qué arreglar» solo si hay problemas, «Traducciones» solo con varios idiomas. */
export function inspectorHeadings(page: { fixes: number; translations: boolean }): PanelHeading[] {
  const sections = (Object.keys(INSPECTOR_SECTIONS) as InspectorSection[]).filter(
    (section) => section !== 'translations' || page.translations,
  );
  return sections.map((slug) => ({
    depth: 2,
    slug,
    text: inspectorTocText(slug, slug === 'issues' && page.fixes > 0 ? page.fixes : undefined),
  }));
}

/** El idioma del panel: es una herramienta de desarrollo y solo existe en español. */
const PANEL_LOCALE = 'es';

/** Lo que `DocsLayout` necesita para una pantalla del panel: noindex, sin analítica ni edición. */
export function panelView({
  config,
  data,
  hrefs,
  screen,
  title,
  headings = [],
}: PanelViewInput): PanelView {
  const site = siteContext(config, data);
  const { url } = site;
  /* El panel va SIEMPRE en español: catálogo del sitio si lo tiene (respeta `ui`) o el de la librería; los enlaces de cabecera y pie van a su versión española si existe. */
  const siteLang = config.locales.includes(PANEL_LOCALE) ? PANEL_LOCALE : config.defaultLocale;
  const strings = (config.strings[PANEL_LOCALE] ?? defaultStrings[PANEL_LOCALE]) as UiStrings;
  /* El panel no es una página de la colección: con su carpeta como slug no coincide con ninguna
     sección de `nav`, así que la cabecera no marca nada como actual. */
  const context = navContextOf(site, siteLang, SEO_ON_PAGE_DIR);
  const screens = {
    overview: { slug: SEO_ON_PAGE_DIR, href: hrefs.overview() },
    pages: { slug: `${SEO_ON_PAGE_DIR}/pages`, href: hrefs.pages() },
  } satisfies Record<Screen, { slug: string; href: string }>;

  return {
    lang: PANEL_LOCALE,
    head: [
      { tag: 'title', attrs: {}, content: `${title} · ${PANEL_NAME}` },
      { tag: 'meta', attrs: { name: 'robots', content: 'noindex' } },
    ],
    siteName: config.name,
    homeHref: pageUrl('', siteLang, url),
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
    nav: buildNav(config.nav, context),
    footer: buildFooter(config, context, strings),
    current: screens[screen].href,
    headings,
    indexable: false,
    baseUrl: baseUrl(config.base),
    /* A ancho completo: la tabla y las vistas previas no caben en la columna de lectura. El resto
       de la disposición es la del sitio, y el conmutador sigue permitiendo cambiarla. */
    layout: { ...config.layout, width: LayoutWidth.FULL },
    prose: false,
  };
}
