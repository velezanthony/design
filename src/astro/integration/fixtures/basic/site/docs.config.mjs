import { defineDocsConfig } from '../../../index.ts';

/* Única fuente de la config: la leen `astro.config.mjs` (docs) y `content.config.ts` (loader). */
export default defineDocsConfig({
  name: 'Fixture',
  locales: ['en', 'es'],
  external: [{ slug: 'changelog', file: '../CHANGELOG.md' }],
  editUrl: 'https://github.com/o/r/edit/main',
  privacyUrl: 'https://example.dev/privacy',
  gtmId: 'GTM-TEST',
});
