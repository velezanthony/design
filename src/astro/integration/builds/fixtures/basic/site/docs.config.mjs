import { defineDocsConfig } from '../../../../index.ts';

/* Única fuente de la config: la leen `astro.config.mjs` (docs) y `content.config.ts` (loader). */
export default defineDocsConfig({
  name: 'Fixture',
  locales: ['en', 'es'],
  seo: {
    titleSuffix: 'Fixture docs',
    description: { en: 'Fixture description', es: 'Descripción de la fixture' },
    image: { src: '/og.png', alt: { en: 'Fixture card', es: 'Tarjeta de la fixture' } },
    /* Con un valor hostil a propósito: el build debe dejarlo inofensivo dentro del <script>. */
    schema: [
      {
        '@type': 'Organization',
        name: 'Fixture </script><script>alert(1)</script>',
        url: 'https://example.dev/',
      },
    ],
  },
  /* La externa `notes` solo existe en inglés y declara `link`; `changelog` sobrescribe la descripción. */
  external: [
    { slug: 'changelog', file: '../CHANGELOG.md', seo: { description: 'Changelog override' } },
    { slug: 'notes', file: '../NOTES.md', translations: 'link' },
  ],
  ui: { es: { 'search.placeholder': 'Buscar en la fixture' } },
  theme: 'site.css',
  editUrl: 'https://github.com/o/r/edit/main',
  privacyUrl: 'https://example.dev/privacy',
  gtmId: 'GTM-TEST',
});
