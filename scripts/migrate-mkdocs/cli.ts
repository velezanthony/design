/**
 * CLI: convierte la sintaxis de MkDocs Material de un repo al Markdown de `@velezanthony/design`.
 * Solo parsea argumentos y cablea los módulos de esta carpeta (cada conversión es una función
 * pura con su test; ver `transform.ts` y `pipeline.ts` para el orden).
 *
 * MODO EN SITIO (el habitual: la librería lee `docs/` donde ya está, con `content: '../docs'`):
 *
 *   node scripts/migrate-mkdocs/cli.ts --repo <raíz del repo> --in-place [--force] [--report r.json]
 *
 * Reescribe `<repo>/docs/**\/*.md` (solo los que cambian, respetando saltos de línea) convirtiendo
 * admoniciones, pestañas, iconos, `attr_list`, ids de encabezado y anclas sin acentos. Los enlaces
 * `.md` relativos se quedan: la librería los resuelve. Se niega a correr si el repo no es git o si
 * `git status --porcelain -- docs` no está vacío, para que `git diff docs/` muestre SOLO la
 * conversión. `--force` se salta esa comprobación y se desaconseja.
 *
 * Flujo: ejecutar -> `git diff docs/` -> commit, o `git checkout docs/` para descartarlo.
 *
 * MODO CARPETA (migraciones que mueven los ficheros; no escribe nunca en el origen):
 *
 *   node scripts/migrate-mkdocs/cli.ts \
 *     --repo <raíz del repo origen> --out <carpeta de contenido> \
 *     --repo-url https://github.com/o/r [--branch main] [--api api.json] \
 *     [--external CHANGELOG.md --external-out <carpeta>] [--sidebar-out sidebar.mjs] \
 *     [--report report.json]
 *
 * Lee `<repo>/mkdocs.yml` (nav, `exclude_docs`, traducciones del nav) y `<repo>/docs`. `--api` es
 * el JSON de `generate-api.py` con el Markdown de cada símbolo.
 *
 * En ambos modos, tras convertir se comprueba el RESULTADO: si queda sintaxis de MkDocs sin
 * convertir (`!!!`, `???`, `=== "x"`, iconos, `--8<--`) se lista como `fichero:línea  tipo  texto`
 * y el código de salida es 1. Las páginas que solo incluyen otro fichero (`--8<-- "X"`) se
 * apartan: se sugiere publicarlo con `external[]`.
 */
import path from 'node:path';
import { parseArgs } from 'node:util';
import { runInPlace } from './modes/in-place.ts';
import { nodeInPlaceIo } from './io/node-io.ts';
import { checkOptions } from './io/options.ts';
import { runToFolder } from './modes/to-folder.ts';

const { values } = parseArgs({
  options: {
    repo: { type: 'string' },
    out: { type: 'string' },
    'repo-url': { type: 'string' },
    branch: { type: 'string' },
    api: { type: 'string' },
    external: { type: 'string', multiple: true },
    'external-out': { type: 'string' },
    'sidebar-out': { type: 'string' },
    report: { type: 'string' },
    'in-place': { type: 'boolean' },
    force: { type: 'boolean' },
  },
});

const problem = checkOptions(values);
if (problem) {
  console.error(problem);
  process.exit(2);
}

const repo = path.resolve(values.repo!);

if (values['in-place']) {
  const result = runInPlace(nodeInPlaceIo(repo), { force: values.force ?? false });
  for (const line of result.output) console.log(line);
  process.exit(result.exitCode);
}

process.exit(
  runToFolder({
    repo,
    out: values.out!,
    repoUrl: values['repo-url']!,
    branch: values.branch ?? 'main',
    api: values.api,
    external: values.external ?? [],
    externalOut: values['external-out'],
    sidebarOut: values['sidebar-out'],
    report: values.report,
  }),
);
