import { defineDocsConfig, NavIcon } from '@velezanthony/design/integration';

/* La documentación de mantenimiento de la librería. La lee una sola persona (quien la mantiene),
   así que va en un único idioma: español. */
export default defineDocsConfig({
  site: {
    name: 'Design',
    social: { github: 'https://github.com/velezanthony/design' },
    seo: {
      description:
        'Cómo funciona y cómo se mantiene @velezanthony/design: el sistema de diseño y el motor de documentación de los repositorios de velezanthony.',
    },
    analytics: { privacyUrl: 'https://velezanthony.github.io/privacidad/' },
  },
  i18n: { locales: ['es'], defaultLocale: 'es' },
  content: {
    nav: [
      {
        label: 'Guía',
        dir: 'guia',
        sidebar: [
          { label: 'Concepto', slug: 'guia', items: ['guia/fuera-del-paquete'] },
          {
            label: 'Primeros pasos',
            slug: 'guia/primeros-pasos',
            items: [
              'guia/disposicion',
              'guia/markdown',
              'guia/navegacion-y-busqueda',
              'guia/rutas-seo-idiomas',
              'guia/analitica-y-privacidad',
            ],
          },
          { label: 'Páginas propias', items: ['guia/layout-propio', 'guia/piezas-sueltas'] },
          'guia/seo-on-page',
        ],
      },
      {
        label: 'Desarrollo',
        dir: 'desarrollo',
        sidebar: [
          {
            label: 'Arquitectura',
            slug: 'desarrollo',
            items: ['desarrollo/una-pagina', 'desarrollo/herramientas', 'desarrollo/mapa-de-src'],
          },
          'desarrollo/por-dentro',
          {
            label: 'Mantenimiento',
            slug: 'desarrollo/mantenimiento',
            items: [
              'desarrollo/tests',
              'desarrollo/recetas',
              'desarrollo/versiones',
              'desarrollo/paleta',
            ],
          },
        ],
      },
      { label: 'GitHub', href: 'https://github.com/velezanthony/design', icon: NavIcon.GITHUB },
    ],
    editUrl: 'https://github.com/velezanthony/design/edit/main',
    repoRoot: '..',
  },
});
