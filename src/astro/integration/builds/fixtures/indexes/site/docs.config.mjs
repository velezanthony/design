import { defineDocsConfig, MissingTranslation } from '../../../../index.ts';

/* Índices generados en un sitio real, español por defecto e inglés con reserva:
   - `tutoriales/_index.md` (con `_index.en.md`): tarjetas de dos en dos y portadas de cada tipo;
   - `guia/`: sin `_index.md`, la genera `indexes` (tabla de dos en dos, título de su sección);
   - `recetas/_index.md`: lista;
   - `notas/`: su `index.md` gana a su `_index.md`, que se ignora con un aviso;
   - `sueltos/`: nada la activa, así que no tiene página. */
export default defineDocsConfig({
  name: 'Indexes',
  locales: ['es', 'en'],
  defaultLocale: 'es',
  translations: { missing: MissingTranslation.FALLBACK },
  nav: [
    {
      label: { es: 'Esenciales', en: 'Essentials' },
      sidebar: [
        {
          label: { es: 'Primeros pasos', en: 'Getting started' },
          items: ['tutoriales/instalacion', 'tutoriales/primer-proyecto'],
        },
        { label: 'Astro', items: [{ label: 'Vite', items: ['tutoriales/configuracion'] }] },
      ],
    },
    {
      label: { es: 'Avanzado', en: 'Advanced' },
      sidebar: [
        {
          label: { es: 'Despliegue', en: 'Deployment' },
          items: ['tutoriales/despliegue', 'tutoriales/errores-comunes'],
        },
      ],
    },
    { label: { es: 'Guía', en: 'Guide' }, dir: 'guia' },
  ],
  sidebar: ['index', 'tutoriales', 'recetas', 'notas'],
  indexes: {
    include: ['guia'],
    overrides: {
      guia: {
        layout: 'table',
        pageSize: 2,
        description: { es: 'Todo lo de la guía.', en: 'Everything in the guide.' },
      },
    },
  },
});
