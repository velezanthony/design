import { parseDocument } from 'yaml';
import { parseFrontmatter, splitFrontmatter } from '../../core/content/frontmatter';
import type { Frontmatter } from '../../core/content/frontmatter';
import { DocsError } from '../../core/errors';

/** Separa y parsea con `yaml` el frontmatter de un archivo nativo y devuelve todos los fallos, con línea si el YAML no parsea. */
export function readFrontmatter(
  raw: string,
  file: string,
): { frontmatter: Frontmatter; body: string; errors: DocsError[] } {
  const { yaml, body, unclosed } = splitFrontmatter(raw);
  if (unclosed) {
    const error = new DocsError('El frontmatter está sin cerrar.', {
      file,
      line: 1,
      hint: 'Añade un `---` de cierre tras el último campo, o quita el `---` inicial.',
    });
    return { frontmatter: {}, body, errors: [error] };
  }
  if (yaml === undefined) return { frontmatter: {}, body, errors: [] };
  const document = parseDocument(yaml);
  if (document.errors.length > 0) {
    const errors = document.errors.map(
      (error) =>
        new DocsError(`El frontmatter no es YAML válido: ${error.message.split('\n')[0]}`, {
          file,
          // El bloque empieza en la línea 2 del archivo (la 1 es el `---`).
          line: (error.linePos?.[0].line ?? 1) + 1,
          hint: 'Corrige la sintaxis del bloque entre `---`.',
        }),
    );
    return { frontmatter: {}, body, errors };
  }
  const { frontmatter, errors } = parseFrontmatter(document.toJS(), file);
  return { frontmatter, body, errors };
}
