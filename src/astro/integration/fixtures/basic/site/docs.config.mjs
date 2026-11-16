import { defineDocsConfig } from '../../../index.ts';

/* Única fuente de la config: la leen `astro.config.mjs` (docs) y `content.config.ts` (loader). */
export default defineDocsConfig({
  name: 'Fixture',
  locales: ['en', 'es'],
  seo: {
    titleTemplate: '%s | Fixture docs',
    description: { en: 'Fixture description', es: 'Descripción de la fixture' },
    image: { src: '/og.png', alt: { en: 'Fixture card', es: 'Tarjeta de la fixture' } },
  },
  /* La externa `notes` solo existe en inglés y declara `link`; `changelog` sobrescribe la descripción. */
  external: [
    { slug: 'changelog', file: '../CHANGELOG.md', seo: { description: 'Changelog override' } },
    { slug: 'notes', file: '../NOTES.md', translations: 'link' },
  ],
  ui: { es: { 'search.placeholder': 'Buscar en la fixture' } },
  editUrl: 'https://github.com/o/r/edit/main',
  privacyUrl: 'https://example.dev/privacy',
  gtmId: 'GTM-TEST',
});
