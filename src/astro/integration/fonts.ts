import { fontProviders } from 'astro/config';

/**
 * Fuentes del diseño (IBM Plex), declaradas con la API de fuentes de Astro. Los `cssVariable` son
 * los mismos que usa `theme.css`.
 */
export const designFonts = () => [
  {
    provider: fontProviders.fontsource(),
    name: 'IBM Plex Sans',
    cssVariable: '--font-plex-sans',
    weights: [400, 500, 600],
    styles: ['normal' as const],
    subsets: ['latin' as const],
    fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
  },
  {
    provider: fontProviders.fontsource(),
    name: 'IBM Plex Mono',
    cssVariable: '--font-plex-mono',
    weights: [400, 500],
    styles: ['normal' as const],
    subsets: ['latin' as const],
    fallbacks: ['ui-monospace', 'monospace'],
  },
];
