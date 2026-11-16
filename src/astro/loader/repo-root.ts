import { access } from 'node:fs/promises';
import path from 'node:path';
import type { ResolvedConfig } from '../../core/config/resolve';
import { DocsError } from '../../core/errors';

const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );

/** Primer ancestro (incluido `start`) que contiene alguno de los `markers`. */
export async function findRepoRoot(
  start: string,
  markers: readonly string[] = ['.git'],
): Promise<string | undefined> {
  for (let dir = path.resolve(start); ; dir = path.dirname(dir)) {
    for (const marker of markers) if (await exists(path.join(dir, marker))) return dir;
    if (path.dirname(dir) === dir) return undefined;
  }
}

/**
 * Raíz del repositorio para los enlaces «editar»: `repoRoot` (relativa a la raíz del proyecto) o,
 * por defecto, el ancestro con `.git`. Solo hace falta con `editUrl`; sin raíz lanza un `DocsError`.
 */
export async function resolveRepoRoot(
  cfg: Pick<ResolvedConfig, 'editUrl' | 'repoRoot'>,
  projectRoot: string,
  markers?: readonly string[],
): Promise<string | undefined> {
  if (cfg.editUrl === undefined) return undefined;
  if (cfg.repoRoot !== undefined) return path.resolve(projectRoot, cfg.repoRoot);
  const found = await findRepoRoot(projectRoot, markers);
  if (!found) {
    throw new DocsError('`editUrl` está definida pero no se encuentra la raíz del repositorio.', {
      hint: 'Inicializa git en el proyecto o indica `repoRoot` en la config de docs.',
    });
  }
  return found;
}
