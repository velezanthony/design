import type { BundledTheme } from 'shiki';

/**
 * Temas de Shiki para todo bloque resaltado: los fences de Markdown y cualquier visual de código.
 * Un único sitio, para que nunca se desincronicen.
 */
export const codeThemes = {
  light: 'github-light-default',
  dark: 'github-dark-default',
} as const satisfies Record<'light' | 'dark', BundledTheme>;
