import { defineDocsConfig } from '../../../../index.ts';

/* Sitio monolingüe: un solo idioma, sin `locales`, y con su propio pie. */
export default defineDocsConfig({
  name: 'Mono',
  components: { Footer: './src/components/SiteFooter.astro' },
});
