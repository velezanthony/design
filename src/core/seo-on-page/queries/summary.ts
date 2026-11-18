import { IssueKind, IssueSeverity, type SeoPage, type SeoTree } from '../tree/types';

export interface SeoSummary {
  total: number;
  /** Con algún error o aviso: lo que hay que arreglar. */
  withProblems: number;
  /** Solo con incidencias informativas (p. ej. descripción heredada): nada que arreglar con urgencia. */
  informativeOnly: number;
  /** Sin ninguna incidencia. */
  clean: number;
  /**
   * Salud: páginas (no idiomas) sin errores NI avisos sobre el total; las informativas no restan.
   * Se publican las dos cifras además del porcentaje para que la UI pueda explicar la cuenta.
   */
  health: { healthy: number; total: number; percent: number };
  /** Incidencias (no páginas) por tipo; todas las claves presentes aunque valgan 0. */
  byKind: Record<IssueKind, number>;
  bySeverity: Record<IssueSeverity, number>;
  /** JSON-LD: solo visibilidad, no hay incidencias (el sitio decide qué declara). */
  schemas: {
    withSchemas: number;
    withoutSchemas: number;
    /** Cada `@type` usado y en cuántas páginas aparece (una vez por página), de más a menos. */
    types: { type: string; pages: number }[];
  };
}

/** Los `@type` de una página, sin repetir (un `@type` puede ser una lista). */
const typesOf = (page: SeoPage) => [
  ...new Set(page.schemas.flatMap(({ schema }) => [schema['@type']].flat())),
];

function summarizeSchemas(tree: SeoTree): SeoSummary['schemas'] {
  const counts = new Map<string, number>();
  for (const page of tree.pages) {
    for (const type of typesOf(page)) counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  const withSchemas = tree.pages.filter((page) => page.schemas.length > 0).length;
  return {
    withSchemas,
    withoutSchemas: tree.pages.length - withSchemas,
    types: [...counts]
      .map(([type, pages]) => ({ type, pages }))
      .sort((a, b) => b.pages - a.pages || (a.type < b.type ? -1 : 1)),
  };
}

/**
 * Salud por página, no por idioma: una página está sana si ninguno de sus idiomas tiene un error o un
 * aviso. Contar entradas daba otra cifra que «Páginas» y no se podía explicar con el total a la vista.
 */
function healthOf(tree: SeoTree): SeoSummary['health'] {
  const slugs = new Set(tree.pages.map((page) => page.slug));
  const unhealthy = new Set(
    tree.pages
      .filter((page) => page.issues.some((issue) => issue.severity !== IssueSeverity.INFO))
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
  const bySeverity = Object.fromEntries(
    Object.values(IssueSeverity).map((severity) => [severity, 0]),
  ) as Record<IssueSeverity, number>;
  for (const issue of tree.pages.flatMap((page) => page.issues)) {
    byKind[issue.kind]++;
    bySeverity[issue.severity]++;
  }
  // Una página «con problemas» lo es por un error o un aviso; las informativas son datos, no tareas,
  // y contarlas como problema ahogaba los avisos reales entre decenas de «descripción heredada».
  const withProblems = tree.pages.filter((page) =>
    page.issues.some((issue) => issue.severity !== IssueSeverity.INFO),
  ).length;
  const withAny = tree.pages.filter((page) => page.issues.length > 0).length;
  return {
    total: tree.pages.length,
    withProblems,
    informativeOnly: withAny - withProblems,
    clean: tree.pages.length - withAny,
    health: healthOf(tree),
    byKind,
    bySeverity,
    schemas: summarizeSchemas(tree),
  };
}
