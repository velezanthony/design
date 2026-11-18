/** Textos del informe final de la CLI. Puros: devuelven líneas, no imprimen. */
import type { Leftover, SnippetStub } from '../checks/leftovers.ts';
import type { StubLink } from '../checks/stub-links.ts';
import type { LogEntry, LogKind } from '../pipeline/types.ts';

/** `fichero:línea  tipo  vista previa`, una línea por resto. */
export function formatLeftovers(leftovers: Leftover[]): string[] {
  return leftovers.map((item) => `${item.file}:${item.line}  ${item.kind}  ${item.preview}`);
}

/** Slug para `external[]`: la ruta de la página sin `.md` ni sufijo de idioma. */
export function stubSlug(file: string): string {
  return file
    .replace(/\.md$/, '')
    .replace(/\.[a-z]{2}(?:-[A-Za-z]{2,})?$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

/** Enlaces a un stub: `docs/fichero:línea  destino  ->  sustitución`. */
export function formatStubLinks(links: StubLink[]): string[] {
  return links.map(
    (link) => `docs/${link.file}:${link.line}  ${link.href}  ->  ${link.suggestion}`,
  );
}

export function formatStubs(stubs: SnippetStub[], docsDir: string): string[] {
  if (stubs.length === 0) return [];
  const lines = ['Páginas que solo incluyen otro fichero (`--8<--`); no se han tocado:'];
  const entries = new Set<string>();
  for (const stub of stubs) {
    lines.push(`  ${docsDir}/${stub.file}  incluye  ${stub.include}`);
    /* `changelog.es.md` es la gemela de `changelog.md`: la misma entrada `external` las cubre. */
    const include = /\.[a-z]{2}(?:-[A-Za-z]{2,})?\.md$/.test(stub.file)
      ? stub.include.replace(/\.[a-z]{2}(?:-[A-Za-z]{2,})?\.md$/, '.md')
      : stub.include;
    entries.add(`{ slug: '${stubSlug(stub.file)}', file: '../${include}' }`);
  }
  lines.push(
    'Publica ese fichero con `external[]` en site/docs.config.mjs y borra el stub:',
    '  external: [',
    ...[...entries].map((entry) => `    ${entry},`),
    '  ],',
  );
  return lines;
}

const LABELS: Record<LogKind, string> = {
  admonition: 'admoniciones a directiva',
  alert: 'admoniciones a alerta de GitHub',
  collapsed: 'admoniciones plegables',
  'admonition-alias': 'alias de admonición reducidos a un tipo de la librería',
  'admonition-unknown': 'admoniciones de tipo desconocido (a note)',
  tabs: 'grupos de pestañas',
  icon: 'iconos quitados',
  'attr-list': 'listas de atributos quitadas',
  'heading-id': 'ids de encabezado quitados',
  'html-wrapper': 'envoltorios HTML de tarjetas quitados',
  frontmatter: 'claves de frontmatter quitadas',
  api: 'referencias de API generadas',
  'api-unresolved': 'referencias de API sin resolver (quedan como nota)',
  autoref: 'autorreferencias a enlaces',
  'autoref-unresolved': 'autorreferencias sin resolver (a texto)',
  link: 'enlaces reescritos',
  anchor: 'anclas con acento corregidas',
  'code-language': 'bloques de código etiquetados',
};

export interface SummaryInput {
  scanned: number;
  changed: string[];
  log: Record<string, LogEntry[]>;
  stubs: SnippetStub[];
  leftovers: Leftover[];
}

export function formatSummary(input: SummaryInput): string[] {
  const counts = new Map<LogKind, number>();
  for (const entries of Object.values(input.log)) {
    for (const entry of entries) counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
  }
  const lines = [`Ficheros cambiados: ${input.changed.length} de ${input.scanned}`];
  for (const kind of Object.keys(LABELS) as LogKind[]) {
    const count = counts.get(kind);
    if (count) lines.push(`  ${LABELS[kind]}: ${count}`);
  }
  lines.push(
    `Stubs de snippet: ${input.stubs.length}`,
    `Restos de sintaxis MkDocs: ${input.leftovers.length}`,
    '',
    'Siguiente paso: git diff docs/   (revisa; luego commit, o git checkout docs/ para descartar)',
  );
  return lines;
}
