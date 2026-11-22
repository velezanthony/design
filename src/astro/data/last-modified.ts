import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { COMMIT_MARK, parseCommitDates } from '../../core/seo/lastmod';

const execute = promisify(execFile);

/** Lo único que toca el sistema: `git` y la fecha de un archivo; inyectable para probar sin repositorio. */
export interface LastModifiedSources {
  /** La salida de `git <gitArguments>` en `cwd`; lanza si falla (también fuera de un repositorio). */
  run: (gitArguments: string[], cwd: string) => Promise<string>;
  /** Cuándo se modificó el archivo, o `undefined` si no existe. */
  modified: (file: string) => Promise<Date | undefined>;
}

const realSources: LastModifiedSources = {
  /* El log de un repositorio grande pasa de 1 MB, el tope por defecto. */
  run: async (gitArguments, cwd) =>
    (await execute('git', gitArguments, { cwd, maxBuffer: 512 * 1024 * 1024 })).stdout,
  modified: async (file) => (await stat(file).catch(() => undefined))?.mtime,
};

/** Las fechas de commit de todo un repositorio (por ruta desde su raíz), o `undefined` sin historial fiable. */
interface History {
  top: string;
  dates: Map<string, string>;
}

type HistoryState = History | 'none' | 'unreliable';

async function readHistory(sources: LastModifiedSources, root: string): Promise<HistoryState> {
  let top: string;
  try {
    top = (await sources.run(['rev-parse', '--show-toplevel'], root)).trim();
    // Un clon superficial fecha todo con su único commit: se prefiere no dar fecha.
    if ((await sources.run(['rev-parse', '--is-shallow-repository'], root)).trim() === 'true') {
      return 'unreliable';
    }
  } catch {
    return 'none';
  }
  try {
    const log = await sources.run(
      [
        '-c',
        'core.quotepath=off',
        'log',
        '--name-only',
        '--no-renames',
        `--format=${COMMIT_MARK}%cI`,
      ],
      top,
    );
    return { top, dates: parseCommitDates(log) };
  } catch {
    return 'none';
  }
}

/**
 * Fecha de la última modificación de cada archivo (rutas relativas a `root`): la de su último
 * commit y, si no la tiene o no hay git, la del archivo. Un git log para todos, no uno por archivo.
 */
export function createLastModified(sources: LastModifiedSources = realSources) {
  const histories = new Map<string, Promise<HistoryState>>();

  return async function lastModified(
    root: string,
    files: Iterable<string>,
    /** `committedOnly`: sin commit no hay fecha (un índice muestra sin fecha lo que no está publicado). */
    options: { committedOnly?: boolean } = {},
  ): Promise<Map<string, string>> {
    let pending = histories.get(root);
    if (!pending) {
      pending = readHistory(sources, root);
      histories.set(root, pending);
    }
    const history = await pending;
    const dates = new Map<string, string>();
    if (history === 'unreliable') return dates;
    for (const file of new Set(files)) {
      const absolute = path.resolve(root, file);
      const committed =
        history === 'none'
          ? undefined
          : history.dates.get(path.relative(history.top, absolute).split(path.sep).join('/'));
      const date =
        committed ??
        (options.committedOnly ? undefined : (await sources.modified(absolute))?.toISOString());
      if (date) dates.set(file, date);
    }
    return dates;
  };
}

/** Con git y el sistema de archivos de verdad; el historial se lee una vez por proceso. */
export const lastModifiedDates = createLastModified();
