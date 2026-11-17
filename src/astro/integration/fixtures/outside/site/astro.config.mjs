import { defineDocsSite } from '../../../index.ts';
import docsConfig from './docs.config.mjs';

/* Proyecto de Astro en `site/` con las páginas en `../docs/` (como un repo que ya tenía `docs/`
   de MkDocs) y el CHANGELOG en la raíz del repo, fuera de ambos. */
export default defineDocsSite(docsConfig, { base: '/repo', site: 'https://example.dev' });
