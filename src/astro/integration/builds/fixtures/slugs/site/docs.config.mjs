import { defineDocsConfig, ListingView, MissingTranslation } from '../../../../index.ts';

/* URLs traducidas con `slug` en el frontmatter, español por defecto e inglés con reserva:
   - `tutoriales/instalacion.en.md` y `tutoriales/despliegue.en.md` fijan su URL en inglés;
   - `tutoriales/_index.en.md` mueve el listado de la carpeta a /en/tutorials/ (tarjetas de una en una);
   - `tutoriales/errores-comunes.md` no tiene traducción: su reserva sigue en
     /en/tutoriales/errores-comunes/;
   - `guia/a.md` y `guia/a.en.md`, sin `slug`, se publican como siempre.
   La config nombra las páginas por su archivo (`tutoriales/despliegue`), nunca por su URL traducida. */
export default defineDocsConfig({
  site: { name: 'Slugs' },
  i18n: { locales: ['es', 'en'], defaultLocale: 'es', missing: MissingTranslation.FALLBACK },
  content: {
    sidebar: [
      'index',
      {
        label: { es: 'Tutoriales', en: 'Tutorials' },
        slug: 'tutoriales',
        items: ['tutoriales/instalacion', 'tutoriales/despliegue', 'tutoriales/errores-comunes'],
      },
      'guia/a',
    ],
    folders: { tutoriales: { listing: { generate: true, view: ListingView.CARDS, pageSize: 1 } } },
  },
});
