import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { docs } from '../../../index.ts';
import docsConfig from './docs.config.mjs';

/* Forma corta: `docs(docsConfig)` y, en content.config.ts, una línea que toma la config del módulo
   virtual de la integración (aquí apuntando al código fuente en vez de a `@velezanthony/design/content`). */
export default defineConfig({
  site: 'https://example.dev',
  base: '/mono',
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
  integrations: [docs(docsConfig)],
});
