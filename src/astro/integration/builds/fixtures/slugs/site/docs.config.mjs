import { defineDocsConfig, MissingTranslation } from '../../../../index.ts';

/* URLs traducidas con `slug` en el frontmatter, español por defecto e inglés con reserva:
   - `articulos/consultas-n-mas-1-django.en.md` y `articulos/dns.en.md` fijan su URL en inglés;
   - `articulos/_index.en.md` mueve el listado de la carpeta a /en/articles/ (tarjetas de una en una);
   - `articulos/nginx.md` no tiene traducción: su reserva sigue en /en/articulos/nginx/;
   - `guia/a.md` y `guia/a.en.md`, sin `slug`, se publican como siempre.
   La config nombra las páginas por su archivo (`articulos/dns`), nunca por su URL traducida. */
export default defineDocsConfig({
  name: 'Slugs',
  locales: ['es', 'en'],
  defaultLocale: 'es',
  translations: { missing: MissingTranslation.FALLBACK },
  sidebar: [
    'index',
    {
      label: { es: 'Artículos', en: 'Articles' },
      slug: 'articulos',
      items: ['articulos/consultas-n-mas-1-django', 'articulos/dns', 'articulos/nginx'],
    },
    'guia/a',
  ],
});
