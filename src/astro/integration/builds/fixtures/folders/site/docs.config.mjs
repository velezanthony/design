import { defineDocsConfig, ListingView, MissingTranslation, TreeShow } from '../../../../index.ts';

/* Índices generados por carpeta (`folders`), como el sitio del autor, español por defecto e inglés con
   reserva:
   - `articulos` enciende `generate` con tarjetas y `tree.show: 'all'` (la barra de todas sus páginas
     es su árbol completo, con Desarrollo y Sistemas como grupos); lo heredan todas sus carpetas, también las
     intermedias sin página propia (`articulos/sistemas`, `articulos/sistemas/cloud`…), que toman el
     título de su sección o grupo declarado o el nombre de la carpeta;
   - `articulos/borradores` lo apaga para su rama;
   - `articulos/privado` tiene `_index.md` con `seo.noindex` y una tabla de uno en uno (paginada);
   - `guia` enciende `generate`, pero su `index.md` gana (aviso informativo en el build);
   - `articulos/notas` tiene `index.md`: su grupo enlaza esa página. */
export default defineDocsConfig({
  site: { name: 'Folders' },
  i18n: { locales: ['es', 'en'], defaultLocale: 'es', missing: MissingTranslation.FALLBACK },
  content: {
    nav: [
      {
        label: { es: 'Desarrollo', en: 'Development' },
        sidebar: [
          {
            label: 'Python',
            items: ['articulos/desarrollo/python/x', 'articulos/desarrollo/python/y'],
          },
        ],
      },
      {
        label: { es: 'Sistemas', en: 'Systems' },
        sidebar: [
          { label: 'CI/CD', items: ['articulos/sistemas/ci-cd/github'] },
          {
            label: 'Cloud',
            items: [{ label: 'AWS', items: ['articulos/sistemas/cloud/aws/basica'] }],
          },
          {
            label: { es: 'Contenedores', en: 'Containers' },
            items: [
              'articulos/sistemas/contenedores/docker',
              'articulos/sistemas/contenedores/nginx',
            ],
          },
        ],
      },
      { label: { es: 'Guía', en: 'Guide' }, dir: 'guia' },
    ],
    sidebar: ['index', 'articulos'],
    folders: {
      articulos: {
        listing: { generate: true, view: ListingView.CARDS },
        tree: { show: TreeShow.ALL },
      },
      'articulos/borradores': { listing: { generate: false } },
      'articulos/privado': { listing: { view: ListingView.TABLE, pageSize: 1 } },
      guia: { listing: { generate: true } },
    },
  },
});
