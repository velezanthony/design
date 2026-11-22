import { access } from 'node:fs/promises';
import path from 'node:path';
import type { ResolvedConfig } from '../../core/config/resolve';
import { DocsError } from '../../core/errors';

function exists(file: string) {
  return access(file).then(
    () => true,
    () => false,
  );
}

/** Primer ancestro (incluido `start`) que contiene alguno de los `markers`. */
export async function findRepoRoot(
  start: string,
  markers: readonly string[] = ['.git'],
): Promise<string | undefined> {
  for (let directory = path.resolve(start); ; directory = path.dirname(directory)) {
    for (const marker of markers) if (await exists(path.join(directory, marker))) return directory;
    if (path.dirname(directory) === directory) return undefined;
  }
}

/** Raíz del repo para los enlaces «editar»: `repoRoot` o el ancestro con `.git`; solo con `editUrl`, y sin raíz lanza `DocsError`. */
export async function resolveRepoRoot(
  config: Pick<ResolvedConfig, 'editUrl' | 'repoRoot'>,
  projectRoot: string,
  markers?: readonly string[],
): Promise<string | undefined> {
  if (config.editUrl === undefined) return undefined;
  if (config.repoRoot !== undefined) return path.resolve(projectRoot, config.repoRoot);
  const found = await findRepoRoot(projectRoot, markers);
  if (!found) {
    throw new DocsError(
      '`content.editUrl` está definida pero no se encuentra la raíz del repositorio.',
      {
        hint: 'Inicializa git en el proyecto o indica `content.repoRoot` en la config de docs.',
      },
    );
  }
  return found;
}
