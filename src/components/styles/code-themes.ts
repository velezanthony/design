import type { BundledTheme } from 'shiki';

/** Temas de Shiki para todo bloque resaltado, en un único sitio para que no se desincronicen. */
export const codeThemes = {
  light: 'github-light-default',
  dark: 'github-dark-default',
} as const satisfies Record<'light' | 'dark', BundledTheme>;
