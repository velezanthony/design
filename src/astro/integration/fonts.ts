import { AstroError } from 'astro/errors';
import { fontProviders } from 'astro/config';

/**
 * Fuentes del diseño (IBM Plex), declaradas con la API de fuentes de Astro. Los `cssVariable` son
 * los mismos que usa `theme.css`.
 */
export function designFonts() {
  return [
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
}

/**
 * Falla si el consumidor ya declara una fuente con el mismo `cssVariable` que las del diseño: dos
 * fuentes no pueden compartir variable y Astro no sabría cuál usar. Se avisa con la salida.
 */
export function assertNoFontConflict(
  existing: readonly { cssVariable: string }[] | undefined,
  ours: readonly { cssVariable: string }[],
): void {
  const taken = new Set(ours.map((font) => font.cssVariable));
  const clash = existing?.find((font) => taken.has(font.cssVariable));
  if (clash) {
    throw new AstroError(
      `La fuente del sitio usa la variable ${clash.cssVariable}, que ya es de \`@velezanthony/design\`.`,
      `Cambia el \`cssVariable\` de esa fuente en \`fonts\` (el diseño reserva ${[...taken].join(' y ')}).`,
    );
  }
}
