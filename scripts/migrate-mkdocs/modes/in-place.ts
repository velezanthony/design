/** Orquesta `--in-place`: reescribe solo los ficheros que cambian, con la E/S inyectada para probarlo sin disco ni git. */
import { docsProblem, type Git } from '../io/git-guard.ts';
import { runPipeline } from '../pipeline/pipeline.ts';
import { formatLeftovers, formatStubLinks, formatStubs, formatSummary } from '../io/report.ts';

export interface InPlaceIo {
  /** Los `.md` de `docs/`, con rutas relativas a esa carpeta. */
  listMarkdown: () => string[];
  read: (file: string) => string;
  write: (file: string, text: string) => void;
  git: Git;
}

export interface InPlaceResult {
  exitCode: number;
  /** Líneas para imprimir, en orden. */
  output: string[];
}

export function runInPlace(io: InPlaceIo, options: { force: boolean }): InPlaceResult {
  const output: string[] = [];
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

  const originals = new Map(io.listMarkdown().map((file) => [file, io.read(file)]));
  const result = runPipeline(originals);
  const changed: string[] = [];
  for (const [file, text] of result.files) {
    if (text === originals.get(file)) continue;
    io.write(file, text);
    changed.push(file);
  }

  output.push(
    ...formatSummary({
      scanned: originals.size,
      changed,
      log: result.log,
      stubs: result.stubs,
      leftovers: result.leftovers,
    }),
  );
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
  return { exitCode: result.leftovers.length > 0 ? 1 : 0, output };
}
