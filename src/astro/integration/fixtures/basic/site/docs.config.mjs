import { defineDocsConfig } from '../../../index.ts';

/* Única fuente de la config: la leen `astro.config.mjs` (docs) y `content.config.ts` (loader). */
export default defineDocsConfig({
  name: 'Fixture',
  external: [{ slug: 'changelog', file: '../CHANGELOG.md' }],
});
