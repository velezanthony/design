import { defineDocsConfig, NavIcon } from '@velezanthony/design/integration';

/* La documentación de la librería: para quien la usa en su sitio y, en «Por dentro», para quien la
   mantiene o mantiene un fork. Va en un único idioma, español, y en dos secciones: Guía y Por dentro. */
export default defineDocsConfig({
  site: {
    name: 'Design',
    social: { github: 'https://github.com/velezanthony/design' },
    seo: {
      description:
        'Cómo montar un sitio de documentación con @velezanthony/design, un sistema de diseño y un motor de documentación sobre Astro, y cómo está hecha la librería por dentro.',
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
          {
            label: 'Usar la librería',
            items: [
              'guia/primer-sitio',
              'guia/escribir-paginas',
              'guia/navegacion',
              'guia/idiomas-seo-y-analitica',
              'guia/personalizar',
            ],
          },
          { label: 'Consulta', items: ['guia/opciones', 'guia/migrar-desde-mkdocs'] },
        ],
      },
      {
        label: 'Por dentro',
        dir: 'por-dentro',
        sidebar: [
          'por-dentro',
          'por-dentro/hacer-un-fork',
          'por-dentro/estructura',
          'por-dentro/build',
          'por-dentro/mantenimiento',
          'por-dentro/paleta',
          'por-dentro/versiones',
        ],
      },
      { label: 'GitHub', href: 'https://github.com/velezanthony/design', icon: NavIcon.GITHUB },
    ],
    editUrl: 'https://github.com/velezanthony/design/edit/main',
    repoRoot: '..',
  },
});
