import { isSatteriProcessor } from '@astrojs/markdown-satteri';
import { AstroError } from 'astro/errors';
import type { MarkdownEnv } from './env';
import { markdownPlugins } from './register';

/** Extiende EN SITIO el processor (como Starlight) con directivas y nuestros plugins; si no es Sätteri falla, porque las admoniciones no se pueden degradar en silencio. */
export function extendMarkdownProcessor(
  processor: { name: string },
  env: MarkdownEnv,
  langAlias?: Readonly<Record<string, string>>,
): void {
  if (!isSatteriProcessor(processor)) {
    throw new AstroError(
      `@velezanthony/design solo soporta el processor de Markdown Sätteri (recibido: "${processor.name}").`,
      'Quita `markdown.processor` de tu config de Astro o usa `satteri()` de `@astrojs/markdown-satteri`.',
    );
  }
  processor.options.features.directive = true;
  processor.options.mdastPlugins.push(...markdownPlugins(env, langAlias));
}
