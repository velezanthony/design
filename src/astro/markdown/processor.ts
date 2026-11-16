import { isSatteriProcessor } from '@astrojs/markdown-satteri';
import { AstroError } from 'astro/errors';
import { restoreDirectives } from './restore-directives';

/**
 * Extiende EN SITIO el processor de Markdown de la config (como Starlight): respeta lo que el
 * consumidor ya configuró y solo añade directivas y nuestros plugins. `restoreDirectives` va el
 * último para devolver a texto lo que nadie reclamó. Si el processor no es Sätteri, falla: las
 * admoniciones forman parte del contenido y no se pueden degradar en silencio.
 */
export function extendMarkdownProcessor(processor: { name: string }): void {
  if (!isSatteriProcessor(processor)) {
    throw new AstroError(
      `@velezanthony/design solo soporta el processor de Markdown Sätteri (recibido: "${processor.name}").`,
      'Quita `markdown.processor` de tu config de Astro o usa `satteri()` de `@astrojs/markdown-satteri`.',
    );
  }
  processor.options.features.directive = true;
  processor.options.mdastPlugins.push(restoreDirectives);
}
