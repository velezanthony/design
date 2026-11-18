import { DocsError } from '../errors';
import { fenceMask } from '../links/fences';

const H1 = /^#[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;

/** Quita el marcado inline que no forma parte del texto visible del título. */
function stripInline(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/\*(.+?)\*/g, '$1')
    .trim();
}

/** Texto del primer H1 fuera de bloques de código, sin marcado inline; `undefined` si no hay. */
function firstHeading(body: string): string | undefined {
  const inCode = fenceMask(body);
  const lines = body.split('\n');
  for (const [index, line] of lines.entries()) {
    if (inCode[index]) continue;
    const heading = H1.exec(line);
    if (heading) return stripInline(heading[1]);
  }
  return undefined;
}

/**
 * Título de la página: el `title` del frontmatter si existe y, si no, el primer H1. Una página sin
 * ninguno de los dos es un error (el título alimenta la barra lateral, el `<title>` y el SEO).
 */
export function resolveTitle(body: string, frontmatterTitle?: string, file?: string): string {
  const declared = frontmatterTitle?.trim();
  if (declared) return declared;
  const heading = firstHeading(body);
  if (heading) return heading;
  throw new DocsError('La página no tiene título.', {
    file,
    hint: 'Empieza el archivo con un `# Título` o añade `title` al frontmatter.',
  });
}
