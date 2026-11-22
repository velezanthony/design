/* Test de tipos de `defineDocsConfig`: no se ejecuta, lo comprueba `npm run check` (`astro check`).
   Cada `@ts-expect-error` exige que esa línea sea un error de tipos; si el tipo público deja de
   rechazarla, el comentario sobra y `check` falla. Así se atrapa una regresión del autocompletado que
   recibe quien escribe `docs.config.mjs`. */
import {
  defineDocsConfig,
  LayoutWidth,
  ListingView,
  MissingTranslation,
  NavIcon,
  PanelState,
} from '../astro/integration';

/** Una config válida escrita con las constantes. */
export const valid = defineDocsConfig({
  name: 'Tipos',
  translations: { missing: MissingTranslation.FALLBACK },
  layout: { sidebar: PanelState.OPEN, toc: PanelState.COLLAPSED, width: LayoutWidth.READING },
  nav: [{ label: 'Código', href: 'https://github.com/x/y', icon: NavIcon.GITHUB }],
  indexes: { layout: ListingView.CARDS },
});

/** Las cadenas literales siguen valiendo: el tipo de entrada es la unión de literales. */
export const literals = defineDocsConfig({ name: 'Tipos', indexes: { layout: 'table' } });

/** Un valor fuera de la unión. */
export const outOfUnion = defineDocsConfig({
  name: 'Tipos',
  // @ts-expect-error: 'grid' no es una ListingView.
  indexes: { layout: 'grid' },
});

/** Una clave desconocida. */
export const unknownKey = defineDocsConfig({
  name: 'Tipos',
  // @ts-expect-error: `colour` no es una clave de la config.
  colour: 'red',
});
