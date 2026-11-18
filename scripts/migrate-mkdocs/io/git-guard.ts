/** `--in-place` solo reescribe si el repo es git y `docs/` está limpio, para que `git diff docs/` muestre solo la conversión. */

export type Git = (gitArguments: string[]) => string;

export function docsProblem(git: Git, docsDirectory = 'docs'): string | undefined {
  let inside: string;
  try {
    inside = git(['rev-parse', '--is-inside-work-tree']).trim();
  } catch {
    inside = 'false';
  }
  if (inside !== 'true') {
    return 'El repo no es un repositorio git: sin git no podrías revisar ni deshacer la conversión.';
  }

  const dirty = git(['status', '--porcelain', '--', docsDirectory])
    .split('\n')
    .filter((line) => line.trim() !== '');
  if (dirty.length > 0) {
    return [
      `Hay cambios sin confirmar en ${docsDirectory}/ (confírmalos o descártalos antes):`,
      ...dirty,
    ].join('\n');
  }
  return undefined;
}
