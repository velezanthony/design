import { z } from 'astro/zod';
import { ListingSchema, MissingTranslationSchema, PageSeoOverrideSchema } from '../config/schema';
import { DocsError, formatPath } from '../errors';
import { isListingFile } from './slug';

const FRONTMATTER_OPEN = /^---[ \t]*\r?\n/;
const FRONTMATTER_CLOSE = /^(---|\.\.\.)[ \t]*$/;

/** Separa el YAML inicial del cuerpo, dejándolo en líneas en blanco para conservar los números de línea; sin cierre marca `unclosed`. */
export function splitFrontmatter(raw: string): {
  yaml: string | undefined;
  body: string;
  unclosed?: true;
} {
  if (!FRONTMATTER_OPEN.test(raw)) return { yaml: undefined, body: raw };
  const lines = raw.split('\n');
  const close = lines.findIndex(
    (line, index) => index > 0 && FRONTMATTER_CLOSE.test(line.replace(/\r$/, '')),
  );
  if (close === -1) return { yaml: undefined, body: raw, unclosed: true };
  const yaml = lines
    .slice(1, close)
    .map((line) => line.replace(/\r$/, ''))
    .join('\n');
  return {
    yaml,
    body: [...Array<string>(close + 1).fill(''), ...lines.slice(close + 1)].join('\n'),
  };
}

/* `index`: cómo sale la página en el listado de su carpeta (resumen, portada y su texto
   alternativo). Lo admite cualquier página, también un `_index.md`: su ficha en el listado padre. */
const EntryIndexSchema = z.strictObject({
  summary: z.string().min(1).optional(),
  image: z.union([z.string(), z.literal(false)]).optional(),
  imageAlt: z.string().optional(),
});
export type EntryIndex = z.infer<typeof EntryIndexSchema>;

/* Las claves ajenas se ignoran (otras herramientas escriben las suyas); las nuestras son estrictas.
   `listing` solo vale en un `_index.md`: lo comprueba `fileProblems`, que conoce el archivo. */
const FrontmatterSchema = z.object({
  title: z.string().optional(),
  /** URL propia de la página; la forma la valida el descubrimiento, que conoce los idiomas. */
  slug: z.string().optional(),
  order: z.number().optional(),
  seo: PageSeoOverrideSchema.optional(),
  translations: MissingTranslationSchema.optional(),
  index: EntryIndexSchema.optional(),
  listing: ListingSchema.optional(),
});

/** Frontmatter de una página nativa que el núcleo entiende, ya validado. */
export type Frontmatter = z.infer<typeof FrontmatterSchema>;

/** Una ruta de imagen local: relativa al `.md` o absoluta de `public/`; nada de URLs ni esquemas. */
function isLocalImage(image: string): boolean {
  return image !== '' && !image.startsWith('//') && !/^[a-z][a-z0-9+.-]*:/i.test(image);
}

/** Lo que la forma no ve: `listing` fuera de un `_index.md` y una portada que no es una ruta local. */
function fileProblems(frontmatter: Frontmatter, file: string): DocsError[] {
  const problems: { field: string; message: string }[] = [];
  if (frontmatter.listing !== undefined && !isListingFile(file)) {
    problems.push({
      field: 'listing',
      message:
        'solo en un `_index.md`, el que pide el listado de su carpeta (un `index.md` es una página normal).',
    });
  }
  const image = frontmatter.index?.image;
  if (typeof image === 'string' && !isLocalImage(image)) {
    problems.push({
      field: 'index.image',
      message: 'debe ser una ruta relativa al `.md` (./portada.png) o de `public/` (/portada.png).',
    });
  }
  return problems.map(
    ({ field, message }) =>
      new DocsError(`${field}: ${message}`, { file, hint: 'Corrige el frontmatter de la página.' }),
  );
}

/** Valida el YAML ya parseado: devuelve el frontmatter y TODOS los fallos con archivo y campo. */
export function parseFrontmatter(
  data: unknown,
  file: string,
): { frontmatter: Frontmatter; errors: DocsError[] } {
  if (data === undefined || data === null) return { frontmatter: {}, errors: [] };
  const result = FrontmatterSchema.safeParse(data);
  if (result.success) {
    const problems = fileProblems(result.data, file);
    if (problems.length > 0) return { frontmatter: {}, errors: problems };
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

function stripUndefined(data: Frontmatter): Frontmatter {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Frontmatter;
}
