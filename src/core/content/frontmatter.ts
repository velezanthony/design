import { z } from 'astro/zod';
import { MissingTranslationSchema, PageSeoOverrideSchema } from '../config/schema';
import { DocsError, formatPath } from '../errors';
import type { Frontmatter } from './discovery';

const FRONTMATTER_OPEN = /^---[ \t]*\r?\n/;
const FRONTMATTER_CLOSE = /^(---|\.\.\.)[ \t]*$/;

/**
 * Separa el bloque YAML inicial (`---` … `---`) del cuerpo. El bloque se sustituye por líneas en
 * blanco: así las líneas del cuerpo siguen siendo las del archivo y un enlace roto se señala donde
 * de verdad está. Sin cierre, o si `---` no es la primera línea, no hay frontmatter.
 */
export function splitFrontmatter(raw: string): { yaml: string | undefined; body: string } {
  if (!FRONTMATTER_OPEN.test(raw)) return { yaml: undefined, body: raw };
  const lines = raw.split('\n');
  const close = lines.findIndex(
    (line, index) => index > 0 && FRONTMATTER_CLOSE.test(line.replace(/\r$/, '')),
  );
  if (close === -1) return { yaml: undefined, body: raw };
  const yaml = lines
    .slice(1, close)
    .map((line) => line.replace(/\r$/, ''))
    .join('\n');
  return {
    yaml,
    body: [...Array<string>(close + 1).fill(''), ...lines.slice(close + 1)].join('\n'),
  };
}

/* Las claves ajenas se ignoran (otras herramientas escriben las suyas); las nuestras son estrictas. */
const FrontmatterSchema = z.object({
  title: z.string().optional(),
  order: z.number().optional(),
  seo: PageSeoOverrideSchema.optional(),
  translations: MissingTranslationSchema.optional(),
});

/** Valida el YAML ya parseado: devuelve el frontmatter y TODOS los fallos con archivo y campo. */
export function parseFrontmatter(
  data: unknown,
  file: string,
): { frontmatter: Frontmatter; errors: DocsError[] } {
  if (data === undefined || data === null) return { frontmatter: {}, errors: [] };
  const result = FrontmatterSchema.safeParse(data);
  if (result.success) {
    return { frontmatter: stripUndefined(result.data), errors: [] };
  }
  const errors = result.error.issues.flatMap((issue) => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map(
        (key) =>
          new DocsError(`${formatPath([...issue.path, key])}: opción desconocida.`, {
            file,
            hint: 'Revisa el nombre del campo del frontmatter.',
          }),
      );
    }
    const field = formatPath(issue.path);
    return [
      new DocsError(`${field ? `${field}: ` : 'El frontmatter: '}${issue.message}`, {
        file,
        hint: 'Corrige el frontmatter de la página.',
      }),
    ];
  });
  return { frontmatter: {}, errors };
}

function stripUndefined(data: z.infer<typeof FrontmatterSchema>): Frontmatter {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Frontmatter;
}
