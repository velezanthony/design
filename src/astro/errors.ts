import { AstroError } from 'astro/errors';
import { DocsError, DocsErrors } from '../core/errors';

/** Errores del núcleo → `AstroError` (título + pista); uno ajeno se devuelve intacto, no se disfraza. */
export function toAstroError(error: DocsError | DocsErrors, title: string): AstroError;
export function toAstroError(error: unknown, title: string): unknown;
export function toAstroError(error: unknown, title: string): unknown {
  if (error instanceof DocsErrors) {
    return new AstroError(title, error.errors.map((item) => item.describe()).join('\n'));
  }
  if (error instanceof DocsError) return new AstroError(title, error.describe());
  return error;
}

/** Ejecuta `run` y traduce sus errores del núcleo a `AstroError` con `title`. */
export function orAstroError<T>(title: string, run: () => T): T {
  try {
    return run();
  } catch (error) {
    throw toAstroError(error, title);
  }
}
