/** Una línea de `exclude` ya leída: su regla y si vuelve a incluir (`!`). */
interface Rule {
  matches: RegExp;
  negated: boolean;
}

/** Cada carácter de un patrón como expresión regular: `**` cruza carpetas, `*` y `?` no. */
function translate(pattern: string): string {
  let source = '';
  for (let position = 0; position < pattern.length; position++) {
    const character = pattern[position]!;
    if (character === '*' && pattern[position + 1] === '*') {
      // `**/` también vale para «ninguna carpeta»: `a/**/b` casa con `a/b`.
      const slash = pattern[position + 2] === '/';
      source += slash ? '(?:.*/)?' : '.*';
      position += slash ? 2 : 1;
    } else if (character === '*') source += '[^/]*';
    else if (character === '?') source += '[^/]';
    else source += character.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return source;
}

function compile(raw: string): Rule {
  const negated = raw.startsWith('!');
  let pattern = negated ? raw.slice(1) : raw;
  const directory = pattern.endsWith('/');
  if (directory) pattern = pattern.slice(0, -1);
  // Con barra al principio o en medio el patrón cuelga de la raíz; sin ella vale a cualquier profundidad.
  const anchored = pattern.includes('/');
  pattern = pattern.replace(/^\//, '');
  const start = anchored ? '^' : '^(?:.*/)?';
  const end = directory ? '/.*$' : '(?:/.*)?$';
  return { matches: new RegExp(`${start}${translate(pattern)}${end}`), negated };
}

/** Qué rutas (relativas a la carpeta de contenido) deja fuera `exclude`: patrones al estilo `.gitignore`, como `exclude_docs` de MkDocs. */
export function excluder(patterns: readonly string[]): (path: string) => boolean {
  const rules = patterns.map(compile);
  return (path) =>
    rules.reduce((excluded, rule) => (rule.matches.test(path) ? !rule.negated : excluded), false);
}
