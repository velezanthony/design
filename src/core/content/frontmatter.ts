import { z } from 'astro/zod';
import {
  IndexLayoutSchema,
  IndexPageSizeSchema,
  IndexPerPageOptionsSchema,
  MissingTranslationSchema,
  PageSeoOverrideSchema,
} from '../config/schema';
import { DocsError, formatPath } from '../errors';
import type { Frontmatter } from './discovery';

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

/* `index`: cómo sale la página en un índice generado (resumen, portada) y, en un `_index.md`, el
   listado de su carpeta (`layout`, `pageSize` y la política de portadas `image`). La forma se valida
   aquí; lo que depende del archivo (si es un `_index.md`), en `indexProblems`. */
const PageIndexSchema = z.strictObject({
  summary: z.string().min(1).optional(),
  image: z.union([z.string(), z.boolean()]).optional(),
  imageAlt: z.string().optional(),
  layout: IndexLayoutSchema.optional(),
  pageSize: IndexPageSizeSchema.optional(),
  perPageOptions: IndexPerPageOptionsSchema.optional(),
});

/* Las claves ajenas se ignoran (otras herramientas escriben las suyas); las nuestras son estrictas. */
const FrontmatterSchema = z.object({
  title: z.string().optional(),
  /** URL propia de la página; la forma la valida el descubrimiento, que conoce los idiomas. */
  slug: z.string().optional(),
  order: z.number().optional(),
  seo: PageSeoOverrideSchema.optional(),
  translations: MissingTranslationSchema.optional(),
  index: PageIndexSchema.optional(),
});

/** `_index.md`, `_index.en.md`…: la fuente del índice generado de su carpeta (convención de Hugo). */
const LISTING_FILE = /(^|\/)_index(\.[^/.]+)?\.md$/;

/** ¿Es `file` el `_index.md` de una carpeta (en cualquier idioma)? */
export function isListingFile(file: string): boolean {
  return LISTING_FILE.test(file);
}

/** Una ruta de imagen local: relativa al `.md` o absoluta de `public/`; nada de URLs ni esquemas. */
function isLocalImage(image: string): boolean {
  return image !== '' && !image.startsWith('//') && !/^[a-z][a-z0-9+.-]*:/i.test(image);
}

/** Lo que `index` no puede decir según el archivo: el listado solo en un índice y la imagen según qué sea. */
function indexProblems(index: z.infer<typeof PageIndexSchema>, file: string): DocsError[] {
  const problems: { field: string; message: string }[] = [];
  const listing = isListingFile(file);
  for (const field of ['layout', 'pageSize', 'perPageOptions'] as const) {
    if (!listing && index[field] !== undefined) {
      problems.push({
        field: `index.${field}`,
        message:
          'solo en un `_index.md`, la fuente del índice generado de su carpeta (un `index.md` es una página normal).',
      });
    }
  }
  if (listing && typeof index.image === 'string') {
    problems.push({
      field: 'index.image',
      message: 'en un `_index.md` es la política de portadas del listado: `true` o `false`.',
    });
  }
  if (!listing && index.image === true) {
    problems.push({
      field: 'index.image',
      message: 'debe ser la ruta de una imagen (./portada.png o /portadas/x.png) o `false`.',
    });
  }
  if (typeof index.image === 'string' && !isLocalImage(index.image)) {
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
    const problems = result.data.index ? indexProblems(result.data.index, file) : [];
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

function stripUndefined(data: z.infer<typeof FrontmatterSchema>): Frontmatter {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Frontmatter;
}
