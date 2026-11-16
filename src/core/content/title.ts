import { DocsError } from '../errors';

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
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
  let fence: string | undefined;
  for (const line of body.split('\n')) {
    const opening = FENCE.exec(line);
    if (opening) {
      const marker = opening[1];
      if (fence === undefined) fence = marker[0];
      else if (marker[0] === fence) fence = undefined;
      continue;
    }
    if (fence !== undefined) continue;
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
