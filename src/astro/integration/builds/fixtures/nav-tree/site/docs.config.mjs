import { defineDocsConfig, MissingTranslation } from '../../../../index.ts';

/* Un blog como el del portfolio: los artículos viven planos en `articulos/` y el árbol lo forman solo
   los `sidebar` de las secciones. El índice (`articulos/index.md`) solo existe en español, así que
   `/en/articulos/` es una ruta de reserva. */
export default defineDocsConfig({
  name: 'Tree',
  locales: ['es', 'en'],
  defaultLocale: 'es',
  translations: { missing: MissingTranslation.FALLBACK },
  nav: [
    {
      label: { es: 'Desarrollo', en: 'Development' },
      sidebar: [
        { label: { es: 'Herramientas', en: 'Tools' }, items: ['articulos/git'] },
        { label: 'Python', items: [{ label: 'Django', items: ['articulos/django'] }] },
      ],
    },
    {
      label: { es: 'Sistemas', en: 'Systems' },
      sidebar: [{ label: { es: 'Contenedores', en: 'Containers' }, items: ['articulos/docker'] }],
    },
  ],
  sidebar: ['index', 'articulos'],
});
