/** Orquesta `--in-place`: reescribe solo los ficheros que cambian, con la E/S inyectada para probarlo sin disco ni git. */
import { docsProblem, type Git } from '../io/git-guard.ts';
import { runPipeline } from '../pipeline/pipeline.ts';
import {
  formatLeftovers,
  formatPlan,
  formatStubLinks,
  formatStubs,
  formatSummary,
} from '../io/report.ts';
import { createApiResolver } from './api-resolver.ts';
import { formatConfigModule, suggestConfig } from './config-suggestion.ts';
import { ignoredByMigrator } from './ignored.ts';
import { parseMkdocs, type Mkdocs } from './mkdocs.ts';

export interface InPlaceIo {
  /** Los `.md` de `docs/`, con rutas relativas a esa carpeta. */
  listMarkdown: () => string[];
  read: (file: string) => string;
  write: (file: string, text: string) => void;
  /** El `mkdocs.yml` de la raíz del repo, o `undefined` si no hay. */
  readMkdocs: () => string | undefined;
  /** Un fichero cualquiera (el JSON de `--api`). */
  readText: (file: string) => string;
  /** Un fichero fuera de `docs/` (`--config-out`); crea las carpetas que falten. */
  writeText: (file: string, text: string) => void;
  git: Git;
}

export interface InPlaceOptions {
  force: boolean;
  /** No escribe nada: enseña lo que haría. */
  dryRun: boolean;
  /** JSON de `generate-api.py` para resolver las directivas `::: x`. */
  api?: string;
  /** Dónde escribir la config sugerida desde `mkdocs.yml`. */
  configOut?: string;
}

export interface InPlaceResult {
  exitCode: number;
  /** Líneas para imprimir, en orden. */
  output: string[];
}

function readMkdocsOrNote(io: InPlaceIo, output: string[]): Mkdocs | undefined {
  const text = io.readMkdocs();
  if (text === undefined) {
    output.push('No hay mkdocs.yml en la raíz: se convierte docs/ sin nav, idiomas ni avisos.', '');
    return undefined;
  }
  try {
    return parseMkdocs(text);
  } catch (error) {
    output.push(
      `No se ha podido leer mkdocs.yml (${(error as Error).message}): se sigue sin él.`,
      '',
    );
    return undefined;
  }
}

export function runInPlace(io: InPlaceIo, options: InPlaceOptions): InPlaceResult {
  const output: string[] = [];
  if (options.dryRun) {
    output.push('DRY-RUN: no se escribe nada (ni docs/, ni la config, ni el informe).', '');
  } else {
    const problem = docsProblem(io.git);
    if (problem) {
      if (!options.force) {
        return {
          exitCode: 1,
          output: [
            problem,
            '',
            'No se ha tocado nada. (--force lo salta, pero se desaconseja: el `git diff` ya no',
            'mostraría solo la conversión.)',
          ],
        };
      }
      output.push(`AVISO (--force): se sigue pese a esto:\n${problem}`, '');
    }
  }

  const mkdocs = readMkdocsOrNote(io, output);
  const api = createApiResolver(options.api ? io.readText(options.api) : undefined);
  const originals = new Map(io.listMarkdown().map((file) => [file, io.read(file)]));
  const result = runPipeline(originals, {
    resolveApi: api.resolveApi,
    slugStyle: mkdocs?.slugStyle,
  });
  const changed: string[] = [];
  for (const [file, text] of result.files) {
    if (text === originals.get(file)) continue;
    if (!options.dryRun) io.write(file, text);
    changed.push(file);
  }

  output.push(
    ...formatSummary({
      scanned: originals.size,
      changed,
      log: result.log,
      stubs: result.stubs,
      leftovers: result.leftovers,
      dryRun: options.dryRun,
    }),
  );
  if (options.dryRun && changed.length > 0) output.push('', ...formatPlan(changed, result.log));
  const stubs = formatStubs(result.stubs, 'docs');
  if (stubs.length > 0) output.push('', ...stubs);
  if (result.stubLinks.length > 0) {
    output.push(
      '',
      'Enlaces a esos stubs; al borrarlos, sustitúyelos por la ruta real del fichero:',
      ...formatStubLinks(result.stubLinks).map((line) => `  ${line}`),
    );
  }
  if (result.leftovers.length > 0) {
    output.push(
      '',
      'Restos que la conversión no ha entendido (arréglalos a mano):',
      ...formatLeftovers(result.leftovers).map((line) => `  docs/${line}`),
    );
  }
  if (mkdocs) {
    const suggestion = formatConfigModule(suggestConfig(mkdocs));
    if (options.configOut && !options.dryRun) io.writeText(options.configOut, suggestion);
    output.push(
      '',
      options.configOut && !options.dryRun
        ? `Config sugerida desde mkdocs.yml, escrita en ${options.configOut}:`
        : 'Config sugerida desde mkdocs.yml (--config-out <fichero> la escribe):',
      ...suggestion.split('\n').map((line) => `  ${line}`),
    );
    const ignored = ignoredByMigrator(mkdocs);
    if (ignored.length > 0) {
      output.push(
        '',
        'Lo que mkdocs.yml declara y el migrador no traduce:',
        ...ignored.map((line) => `  - ${line}`),
      );
    }
  }
  return { exitCode: result.leftovers.length > 0 ? 1 : 0, output };
}
