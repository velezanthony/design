import type { Locale } from './locale';

/* Catálogo base en inglés: sus claves son la fuente de `UiKey`, de `uiKeys` y del esquema `.strict()`
   de `ui` en la config. Las claves son estables (no la frase), así que reescribir un texto no rompe
   a quien lo sobrescribe. */
const en = {
  'theme.toggle': 'Toggle color theme',
  'locale.switch': 'Language',
  'toc.title': 'On this page',
  backToTop: 'Back to top',
  skipToContent: 'Skip to content',
  'consent.message': 'This site uses analytics cookies only if you accept them.',
  'consent.accept': 'Accept',
  'consent.reject': 'Reject',
  'consent.privacy': 'Privacy policy',
  'consent.label': 'Cookie notice',
  'consent.preferences': 'Cookie preferences',
  'sidebar.label': 'Documentation',
  'sidebar.toggle': 'Menu',
  'nav.label': 'Sections',
  'nav.external': 'External link',
  'layout.collapseNav': 'Collapse navigation',
  'layout.expandNav': 'Expand navigation',
  'layout.collapseToc': 'Collapse the index',
  'layout.expandToc': 'Expand the index',
  'layout.navRail': 'Docs',
  'layout.tocRail': 'On this page',
  'layout.width': 'Page width',
  'layout.reading': 'Reading',
  'layout.full': 'Full',
  'search.label': 'Search',
  'search.placeholder': 'Search the docs',
  'search.noResults': 'No results for “{query}”',
  'search.requiresBuild': 'Search needs a production build',
  'edit.page': 'Edit this page',
  'copy.label': 'Copy',
  'copy.copied': 'Copied',
  'copy.failed': 'Could not copy',
  'zoom.open': 'Enlarge image: {alt}',
  'zoom.close': 'Close',
  'heading.anchor': 'Link to “{title}”',
  'pagination.label': 'Page navigation',
  'pagination.prev': 'Previous',
  'pagination.next': 'Next',
  'admonition.note': 'Note',
  'admonition.info': 'Info',
  'admonition.tip': 'Tip',
  'admonition.warning': 'Warning',
  'admonition.danger': 'Danger',
  'admonition.question': 'Question',
  'admonition.important': 'Important',
  'admonition.caution': 'Caution',
  'translation.badgeLabel': 'Available in {locale}',
  'translation.fallbackNotice': 'This page is not translated yet. You are reading the original.',
  'notFound.title': 'Page not found',
  'notFound.body': 'The page you are looking for does not exist or has moved.',
  'notFound.home': 'Go to the home page',
  'notFound.description': 'The page you are looking for does not exist.',
} as const;

export type UiKey = keyof typeof en;
export type UiStrings = Record<UiKey, string>;
export type UiOverrides = Partial<Record<Locale, Partial<UiStrings>>>;

const es: UiStrings = {
  'theme.toggle': 'Cambiar el tema de color',
  'locale.switch': 'Idioma',
  'toc.title': 'En esta página',
  backToTop: 'Volver arriba',
  skipToContent: 'Saltar al contenido',
  'consent.message': 'Este sitio usa cookies de analítica solo si las aceptas.',
  'consent.accept': 'Aceptar',
  'consent.reject': 'Rechazar',
  'consent.privacy': 'Política de privacidad',
  'consent.label': 'Aviso de cookies',
  'consent.preferences': 'Preferencias de cookies',
  'sidebar.label': 'Documentación',
  'sidebar.toggle': 'Menú',
  'nav.label': 'Secciones',
  'nav.external': 'Enlace externo',
  'layout.collapseNav': 'Plegar la navegación',
  'layout.expandNav': 'Desplegar la navegación',
  'layout.collapseToc': 'Plegar el índice',
  'layout.expandToc': 'Desplegar el índice',
  'layout.navRail': 'Docs',
  'layout.tocRail': 'Índice',
  'layout.width': 'Ancho de la página',
  'layout.reading': 'Lectura',
  'layout.full': 'Ancho',
  'search.label': 'Buscar',
  'search.placeholder': 'Buscar en la documentación',
  'search.noResults': 'Sin resultados para «{query}»',
  'search.requiresBuild': 'La búsqueda necesita una build de producción',
  'edit.page': 'Editar esta página',
  'copy.label': 'Copiar',
  'copy.copied': 'Copiado',
  'copy.failed': 'No se pudo copiar',
  'zoom.open': 'Ampliar imagen: {alt}',
  'zoom.close': 'Cerrar',
  'heading.anchor': 'Enlace a «{title}»',
  'pagination.label': 'Navegación entre páginas',
  'pagination.prev': 'Anterior',
  'pagination.next': 'Siguiente',
  'admonition.note': 'Nota',
  'admonition.info': 'Información',
  'admonition.tip': 'Consejo',
  'admonition.warning': 'Advertencia',
  'admonition.danger': 'Peligro',
  'admonition.question': 'Pregunta',
  'admonition.important': 'Importante',
  'admonition.caution': 'Precaución',
  'translation.badgeLabel': 'Disponible en {locale}',
  'translation.fallbackNotice': 'Esta página aún no está traducida. Estás leyendo el original.',
  'notFound.title': 'Página no encontrada',
  'notFound.body': 'La página que buscas no existe o se ha movido.',
  'notFound.home': 'Ir a la portada',
  'notFound.description': 'La página que buscas no existe.',
};

/** Todas las claves de UI: de aquí sale el esquema estricto de `ui`. */
export const uiKeys = Object.keys(en) as UiKey[];

/** Catálogo del paquete por idioma. */
export const defaultStrings: Record<Locale, UiStrings> = { en, es };

/** Nombre de cada idioma en su propio idioma, para el selector. */
export const localeNames: Record<Locale, string> = { en: 'English', es: 'Español' };

/** Descarta las claves con valor `undefined`, que de otro modo borrarían el texto del paquete. */
function definedOnly(overrides: Partial<UiStrings> | undefined): Partial<UiStrings> {
  return Object.fromEntries(
    Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined),
  );
}

/**
 * Fusiona los textos del consumidor sobre el catálogo, clave a clave y por idioma: lo no declarado
 * conserva el valor del paquete y un idioma sin override queda intacto. No muta la entrada.
 */
export function mergeUiStrings(
  defaults: Record<Locale, UiStrings>,
  overrides: UiOverrides | undefined,
): Record<Locale, UiStrings> {
  return Object.fromEntries(
    Object.entries(defaults).map(([locale, strings]) => [
      locale,
      { ...strings, ...definedOnly(overrides?.[locale]) },
    ]),
  );
}

/** Texto de una clave con `{variable}` interpoladas; una variable no pasada se deja tal cual. */
export function t(strings: UiStrings, key: UiKey, vars: Record<string, string> = {}): string {
  return strings[key].replace(
    /\{(\w+)\}/g,
    (placeholder, name: string) => vars[name] ?? placeholder,
  );
}
