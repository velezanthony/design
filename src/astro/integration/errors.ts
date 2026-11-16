import { AstroError } from 'astro/errors';
import { DocsError, DocsErrors } from '../../core/errors';

/**
 * Traduce los errores puros del núcleo a `AstroError` (título + pista), que es lo que Astro
 * muestra bien. Cualquier otro error se devuelve intacto: no es nuestro y no hay que disfrazarlo.
 */
export function toAstroError(error: DocsError | DocsErrors, title: string): AstroError;
export function toAstroError(error: unknown, title: string): unknown;
export function toAstroError(error: unknown, title: string): unknown {
  if (error instanceof DocsErrors) {
    return new AstroError(title, error.errors.map((item) => item.describe()).join('\n'));
  }
  if (error instanceof DocsError) return new AstroError(title, error.describe());
  return error;
}
