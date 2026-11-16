import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { docs } from '../../../index.ts';
import docsConfig from './docs.config.mjs';

export default defineConfig({
  site: 'https://example.dev',
  base: '/mono',
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
  integrations: [docs(docsConfig)],
});
