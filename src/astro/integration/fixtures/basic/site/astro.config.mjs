import { writeFileSync } from 'node:fs';
import { satteri } from '@astrojs/markdown-satteri';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import { docs } from '../../../index.ts';
import docsConfig from './docs.config.mjs';
import { probeLocale } from './probe-plugin.mjs';

/* Proyecto consumidor mínimo para las pruebas de integración: `base` de subruta, barra final
   siempre, un processor Sätteri propio (con un plugin que comprueba `fileURL`) y una fuente propia. */
export default defineConfig({
  site: 'https://example.dev',
  base: '/repo',
  trailingSlash: 'always',
  vite: { plugins: [{ name: 'consumer-vite-plugin' }, tailwindcss()] },
  markdown: { processor: satteri({ mdastPlugins: [probeLocale] }) },
  fonts: [
    { provider: fontProviders.fontsource(), name: 'Consumer Font', cssVariable: '--font-consumer' },
  ],
  integrations: [
    docs(docsConfig),
    {
      /* Sonda: vuelca lo que ve Astro tras fusionar las configs, para que el test lo lea. */
      name: 'probe',
      hooks: {
        'astro:config:done': ({ config }) => {
          const processor = /** @type {any} */ (config.markdown.processor);
          writeFileSync(
            new URL('./probe.json', import.meta.url),
            JSON.stringify({
              integrations: config.integrations.map((i) => i.name),
              ownKeys: Object.keys(
                config.integrations.find((i) => i.name === '@velezanthony/design') ?? {},
              ),
              base: config.base,
              trailingSlash: config.trailingSlash,
              vitePlugins: (config.vite.plugins ?? []).flat().map((p) => p?.name),
              fonts: (config.fonts ?? []).map((f) => f.name),
              directive: processor.options.features.directive,
              plugins: processor.options.mdastPlugins.map((p) => p.name ?? '(factoría)'),
            }),
          );
        },
      },
    },
  ],
});
