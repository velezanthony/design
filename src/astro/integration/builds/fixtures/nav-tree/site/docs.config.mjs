import { defineDocsConfig, MissingTranslation } from '../../../../index.ts';

/* Un sitio de tutoriales: las páginas viven planas en `tutoriales/` y el árbol lo forman solo los
   `sidebar` de las secciones. El índice (`tutoriales/index.md`) solo existe en español, así que
   `/en/tutoriales/` es una ruta de reserva. */
export default defineDocsConfig({
  name: 'Tree',
  locales: ['es', 'en'],
  defaultLocale: 'es',
  translations: { missing: MissingTranslation.FALLBACK },
  nav: [
    {
      label: { es: 'Esenciales', en: 'Essentials' },
      sidebar: [
        {
          label: { es: 'Primeros pasos', en: 'Getting started' },
          items: ['tutoriales/instalacion'],
        },
        { label: 'Astro', items: [{ label: 'Vite', items: ['tutoriales/configuracion'] }] },
      ],
    },
    {
      label: { es: 'Avanzado', en: 'Advanced' },
      sidebar: [
        { label: { es: 'Despliegue', en: 'Deployment' }, items: ['tutoriales/despliegue'] },
      ],
    },
  ],
  sidebar: ['index', 'tutoriales'],
});
