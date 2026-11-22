import { defineDocsConfig, NavIcon } from '@velezanthony/design/integration';

/* La documentación de la librería: para quien la usa en su sitio y, en «Por dentro», para quien la
   mantiene o mantiene un fork. Va en español (idioma por defecto) y en inglés, con cada página
   traducida (`x.en.md`, con su URL en inglés por `slug`), y en dos secciones: Guía y Por dentro. */
export default defineDocsConfig({
  site: {
    name: 'Design',
    social: { github: 'https://github.com/velezanthony/design' },
    seo: {
      description: {
        es: 'Librería para crear sitios de documentación con Astro y Markdown: sistema de diseño, búsqueda, idiomas, SEO y aviso de cookies a partir de un archivo de configuración.',
        en: 'A library to build documentation sites with Astro and Markdown: design system, search, multiple languages, SEO and a cookie notice from one configuration file.',
      },
      image: {
        src: '/og.png',
        alt: {
          es: 'Design: de Markdown a un sitio de documentación sobre Astro',
          en: 'Design: from Markdown to a documentation site on Astro',
        },
      },
      ogLocales: { es: 'es_ES', en: 'en_GB' },
      schema: [
        {
          '@type': 'SoftwareSourceCode',
          name: '@velezanthony/design',
          description:
            'Design system and documentation engine for Astro: turns Markdown and one configuration file into a documentation site.',
          codeRepository: 'https://github.com/velezanthony/design',
          programmingLanguage: ['TypeScript', 'Astro'],
          runtimePlatform: 'Node.js',
          url: 'https://velezanthony.github.io/design/',
        },
      ],
    },
    analytics: {
      privacyUrl: {
        es: 'https://velezanthony.github.io/privacidad/',
        en: 'https://velezanthony.github.io/en/privacy/',
      },
    },
  },
  i18n: { locales: ['es', 'en'], defaultLocale: 'es' },
  content: {
    nav: [
      {
        label: { es: 'Guía', en: 'Guide' },
        dir: 'guia',
        sidebar: [
          {
            label: { es: 'Usar la librería', en: 'Using the library' },
            items: [
              'guia/primer-sitio',
              'guia/escribir-paginas',
              'guia/navegacion',
              'guia/idiomas-seo-y-analitica',
              'guia/personalizar',
            ],
          },
          {
            label: { es: 'Consulta', en: 'Reference' },
            items: ['guia/opciones', 'guia/migrar-desde-mkdocs'],
          },
        ],
      },
      {
        label: { es: 'Por dentro', en: 'Internals' },
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
