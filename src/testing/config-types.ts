/* Test de tipos de `defineDocsConfig`: no se ejecuta, lo comprueba `npm run check` (`astro check`).
   Cada `@ts-expect-error` exige que esa línea sea un error de tipos; si el tipo público deja de
   rechazarla, el comentario sobra y `check` falla. Así se atrapa una regresión del autocompletado que
   recibe quien escribe `docs.config.mjs`. */
import {
  ALL_FOLDERS,
  defineDocsConfig,
  LayoutWidth,
  ListingView,
  MissingTranslation,
  NavIcon,
  PanelState,
  TreeShow,
} from '../astro/integration';

/** Una config válida escrita con las constantes. */
export const valid = defineDocsConfig({
  name: 'Tipos',
  translations: { missing: MissingTranslation.FALLBACK },
  layout: { sidebar: PanelState.OPEN, toc: PanelState.COLLAPSED, width: LayoutWidth.READING },
  nav: [{ label: 'Código', href: 'https://github.com/x/y', icon: NavIcon.GITHUB }],
  folders: {
    [ALL_FOLDERS]: { listing: { view: ListingView.LIST }, tree: { show: TreeShow.SECTION } },
    articulos: { listing: { generate: true, view: ListingView.CARDS }, tree: { depth: 2 } },
  },
});

/** Las cadenas literales siguen valiendo: el tipo de entrada es la unión de literales. */
export const literals = defineDocsConfig({
  name: 'Tipos',
  folders: { guia: { listing: { view: 'table' } } },
});

/** Un valor fuera de la unión. */
export const outOfUnion = defineDocsConfig({
  name: 'Tipos',
  // @ts-expect-error: 'grid' no es una ListingView.
  folders: { guia: { listing: { view: 'grid' } } },
});

/** Una clave antigua que ya no existe. */
export const retired = defineDocsConfig({
  name: 'Tipos',
  // @ts-expect-error: `indexes` desapareció; los listados se configuran en `folders`.
  indexes: { layout: 'cards' },
});

/** Una clave desconocida dentro de `folders['*']`. */
export const unknownFolderKey = defineDocsConfig({
  name: 'Tipos',
  // @ts-expect-error: `title` no es un ajuste de carpeta (los textos van en el `_index.md`).
  folders: { [ALL_FOLDERS]: { title: 'Todo' } },
});

/** Una clave desconocida. */
export const unknownKey = defineDocsConfig({
  name: 'Tipos',
  // @ts-expect-error: `colour` no es una clave de la config.
  colour: 'red',
});
