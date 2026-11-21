import { defineDocsConfig, MissingTranslation } from '../../../../index.ts';

/* Índices generados en un sitio real, español por defecto e inglés con reserva:
   - `articulos/_index.md` (con `_index.en.md`): tarjetas de dos en dos y portadas de cada tipo;
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
      label: { es: 'Desarrollo', en: 'Development' },
      sidebar: [
        { label: { es: 'Herramientas', en: 'Tools' }, items: ['articulos/git', 'articulos/make'] },
        { label: 'Python', items: [{ label: 'Django', items: ['articulos/django'] }] },
      ],
    },
    {
      label: { es: 'Sistemas', en: 'Systems' },
      sidebar: [
        { label: { es: 'Redes', en: 'Networking' }, items: ['articulos/dns', 'articulos/nginx'] },
      ],
    },
    { label: { es: 'Guía', en: 'Guide' }, dir: 'guia' },
  ],
  sidebar: ['index', 'articulos', 'recetas', 'notas'],
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
