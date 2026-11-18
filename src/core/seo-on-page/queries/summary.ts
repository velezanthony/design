import { IssueKind, type SeoTree } from '../tree/types';
import { isActionable } from '../severity';
import { schemaTypes, slugsOf } from '../tree/keys';

/** Hasta dónde llega un `@type`: a todas las páginas, solo a la portada o a algunas. */
export type SchemaScope = 'site' | 'home' | 'pages';

export interface SeoSummary {
  total: number;
  /**
   * Salud: páginas (no idiomas) sin errores NI avisos sobre el total; las informativas no restan.
   * Se publican las dos cifras además del porcentaje para que la UI pueda explicar la cuenta.
   */
  health: { healthy: number; total: number; percent: number };
  /** Incidencias (no páginas) por tipo; todas las claves presentes aunque valgan 0. */
  byKind: Record<IssueKind, number>;
  /** JSON-LD: solo visibilidad, no hay incidencias (el sitio decide qué declara). Se cuenta por PÁGINA, no por idioma. */
  schemas: {
    withSchemas: number;
    withoutSchemas: number;
    /** Cada `@type` usado y en cuántas páginas aparece (una vez por página), de más a menos. */
    types: { type: string; pages: number; scope: SchemaScope }[];
  };
}

function summarizeSchemas(tree: SeoTree): SeoSummary['schemas'] {
  // Por página (slug): la misma página en dos idiomas declara lo mismo y no es otro trabajo.
  const slugs = slugsOf(tree.pages);
  const byType = new Map<string, Set<string>>();
  const withSchemas = new Set<string>();
  for (const page of tree.pages) {
    if (page.schemas.length > 0) withSchemas.add(page.slug);
    for (const type of schemaTypes(page.schemas)) {
      byType.set(type, (byType.get(type) ?? new Set()).add(page.slug));
    }
  }
  function scopeOf(pages: Set<string>): SchemaScope {
    return pages.size === slugs.size
      ? 'site'
      : pages.size === 1 && pages.has('')
        ? 'home'
        : 'pages';
  }
  return {
    withSchemas: withSchemas.size,
    withoutSchemas: slugs.size - withSchemas.size,
    types: [...byType]
      .map(([type, pages]) => ({ type, pages: pages.size, scope: scopeOf(pages) }))
      .sort((left, right) => right.pages - left.pages || (left.type < right.type ? -1 : 1)),
  };
}

/**
 * Salud por página, no por idioma: una página está sana si ninguno de sus idiomas tiene un error o un
 * aviso. Contar entradas daba otra cifra que «Páginas» y no se podía explicar con el total a la vista.
 */
function healthOf(tree: SeoTree): SeoSummary['health'] {
  const slugs = slugsOf(tree.pages);
  const unhealthy = new Set(
    tree.pages
      .filter((page) => page.issues.some((issue) => isActionable(issue.severity)))
      .map((page) => page.slug),
  );
  const healthy = slugs.size - unhealthy.size;
  // Sin páginas no hay nada roto: 100, no una división entre cero.
  const percent = slugs.size === 0 ? 100 : Math.round((healthy / slugs.size) * 100);
  return { healthy, total: slugs.size, percent };
}

/** Contadores de la vista general. Con todas las claves siempre, la UI no tiene que comprobar nada. */
export function summarize(tree: SeoTree): SeoSummary {
  const byKind = Object.fromEntries(Object.values(IssueKind).map((kind) => [kind, 0])) as Record<
    IssueKind,
    number
  >;
  for (const issue of tree.pages.flatMap((page) => page.issues)) byKind[issue.kind]++;
  return {
    total: tree.pages.length,
    health: healthOf(tree),
    byKind,
    schemas: summarizeSchemas(tree),
  };
}
