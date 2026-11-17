/**
 * Seguridad de `--in-place`: solo se reescribe `docs/` si el repo es git y `docs/` está limpio,
 * para que `git diff docs/` muestre DESPUÉS únicamente la conversión. La E/S (ejecutar git) llega
 * inyectada: `git(args)` devuelve la salida o lanza si git falla.
 */

export type Git = (args: string[]) => string;

export function docsProblem(git: Git, docsDir = 'docs'): string | undefined {
  let inside: string;
  try {
    inside = git(['rev-parse', '--is-inside-work-tree']).trim();
  } catch {
    inside = 'false';
  }
  if (inside !== 'true') {
    return 'El repo no es un repositorio git: sin git no podrías revisar ni deshacer la conversión.';
  }

  const dirty = git(['status', '--porcelain', '--', docsDir])
    .split('\n')
    .filter((line) => line.trim() !== '');
  if (dirty.length > 0) {
    return [
      `Hay cambios sin confirmar en ${docsDir}/ (confírmalos o descártalos antes):`,
      ...dirty,
    ].join('\n');
  }
  return undefined;
}
