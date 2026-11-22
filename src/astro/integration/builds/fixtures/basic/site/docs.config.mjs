import { defineDocsConfig } from '../../../../index.ts';

/* Única fuente de la config: la leen `astro.config.mjs` (docs) y `content.config.ts` (loader). */
export default defineDocsConfig({
  site: {
    name: 'Fixture',
    theme: 'site.css',
    seo: {
      titleSuffix: 'Fixture docs',
      description: { en: 'Fixture description', es: 'Descripción de la fixture' },
      image: { src: '/og.png', alt: { en: 'Fixture card', es: 'Tarjeta de la fixture' } },
      schema: [
        {
          '@type': 'Organization',
          name: 'Fixture </script><script>alert(1)</script>',
          url: 'https://example.dev/',
        },
      ],
    },
    analytics: { privacyUrl: 'https://example.dev/privacy', gtmId: 'GTM-TEST' },
  },
  i18n: { locales: ['en', 'es'], ui: { es: { 'search.placeholder': 'Buscar en la fixture' } } },
  content: {
    external: [
      { slug: 'changelog', file: '../CHANGELOG.md', seo: { description: 'Changelog override' } },
      { slug: 'notes', file: '../NOTES.md', translations: 'link' },
    ],
    editUrl: 'https://github.com/o/r/edit/main',
  },
});
