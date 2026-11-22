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
  site: {
    name: 'Tipos',
    layout: { sidebar: PanelState.OPEN, toc: PanelState.COLLAPSED, width: LayoutWidth.READING },
  },
  i18n: { missing: MissingTranslation.FALLBACK },
  content: {
    nav: [{ label: 'Código', href: 'https://github.com/x/y', icon: NavIcon.GITHUB }],
    folders: {
      [ALL_FOLDERS]: { listing: { view: ListingView.LIST }, tree: { show: TreeShow.SECTION } },
      articulos: { listing: { generate: true, view: ListingView.CARDS }, tree: { depth: 2 } },
    },
  },
});

/** Las cadenas literales siguen valiendo: el tipo de entrada es la unión de literales. */
export const literals = defineDocsConfig({
  site: { name: 'Tipos' },
  content: { folders: { guia: { listing: { view: 'table' } } } },
});

/** Un valor fuera de la unión. */
export const outOfUnion = defineDocsConfig({
  site: { name: 'Tipos' },
  // @ts-expect-error: 'grid' no es una ListingView.
  content: { folders: { guia: { listing: { view: 'grid' } } } },
});

/** Claves antiguas que ya no existen: `indexes` y las de primer nivel de antes de los grupos. */
export const retired = defineDocsConfig({
  site: { name: 'Tipos' },
  // @ts-expect-error: `indexes` desapareció; los listados se configuran en `content.folders`.
  indexes: { layout: 'cards' },
});

export const flatName = defineDocsConfig({
  // @ts-expect-error: `name` va en `site.name`.
  name: 'Tipos',
});

/** Una clave desconocida dentro de `folders['*']`. */
export const unknownFolderKey = defineDocsConfig({
  site: { name: 'Tipos' },
  // @ts-expect-error: `title` no es un ajuste de carpeta (los textos van en el `_index.md`).
  content: { folders: { [ALL_FOLDERS]: { title: 'Todo' } } },
});

/** Una clave desconocida. */
export const unknownKey = defineDocsConfig({
  site: { name: 'Tipos' },
  // @ts-expect-error: `colour` no es una clave de la config.
  colour: 'red',
});
