/**
 * Enlaces a una página stub. Al publicar el fichero incluido con `external[]` y borrar el stub,
 * esos enlaces apuntarían a una página que ya no existe: la librería los enlaza al archivo real
 * por su ruta relativa (`../../CONTRIBUTING.md`), que además sigue funcionando en GitHub. Esta
 * función solo AVISA (con la sustitución exacta): reescribirlos ahora, con el stub aún en pie,
 * rompería la build hasta que se declare el `external`.
 */
import path from 'node:path/posix';
import { maskInlineCode, proseLines, type SnippetStub } from './leftovers.ts';

export interface StubLink {
  file: string;
  line: number;
  href: string;
  suggestion: string;
}

const LINK = /\]\(([^)\s#]+\.md)(#[^)\s]*)?(?:\s+"[^"]*")?\)/g;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function findStubLinks(
  files: ReadonlyMap<string, string>,
  stubs: SnippetStub[],
): StubLink[] {
  const byPath = new Map(stubs.map((stub) => [stub.file, stub]));
  if (byPath.size === 0) return [];
  const found: StubLink[] = [];
  for (const [file, markdown] of files) {
    if (byPath.has(file)) continue;
    for (const [line, text] of proseLines(markdown)) {
      for (const match of maskInlineCode(text).matchAll(LINK)) {
        const [, target, anchor = ''] = match;
        if (SCHEME.test(target) || target.startsWith('/')) continue;
        const stub = byPath.get(path.normalize(path.join(path.dirname(file), target)));
        if (!stub) continue;
        /* `include` es relativo a la raíz del repo; `docs/` cuelga de ella. */
        const suggestion = path.relative(path.dirname(path.join('docs', file)), stub.include);
        found.push({
          file,
          line,
          href: `${target}${anchor}`,
          suggestion: `${suggestion}${anchor}`,
        });
      }
    }
  }
  return found;
}
