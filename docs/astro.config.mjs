import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { docs } from '@velezanthony/design/integration';
import docsConfig from './docs.config.mjs';

/* La documentación de la propia librería, montada con la propia librería: es su primer consumidor.
   Se publica como página de proyecto de GitHub Pages, bajo `/design`. */
export default defineConfig({
  site: 'https://velezanthony.github.io',
  base: '/design',
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
  integrations: [docs(docsConfig)],
});
