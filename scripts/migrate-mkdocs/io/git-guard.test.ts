import { describe, expect, it } from 'vitest';
import { docsProblem } from './git-guard';

function fakeGit(answers: Record<string, string | Error>) {
  return (args: string[]): string => {
    const answer = answers[args.join(' ')];
    if (answer === undefined) throw new Error(`git inesperado: ${args.join(' ')}`);
    if (answer instanceof Error) throw answer;
    return answer;
  };
}

const inRepo = 'rev-parse --is-inside-work-tree';
const status = 'status --porcelain -- docs';

describe('docsProblem', () => {
  it('un repo con docs/ limpio no tiene problema', () => {
    expect(docsProblem(fakeGit({ [inRepo]: 'true\n', [status]: '' }))).toBeUndefined();
  });

  it('fuera de un repositorio git es un problema', () => {
    const problem = docsProblem(fakeGit({ [inRepo]: new Error('not a git repository') }));
    expect(problem).toMatch(/repositorio git/);
  });

  it('cambios sin confirmar en docs/ son un problema y se listan', () => {
    const problem = docsProblem(
      fakeGit({ [inRepo]: 'true\n', [status]: ' M docs/a.md\n?? docs/nuevo.md\n' }),
    );
    expect(problem).toMatch(/cambios sin confirmar/);
    expect(problem).toContain(' M docs/a.md');
    expect(problem).toContain('?? docs/nuevo.md');
  });

  it('si git dice que no está dentro de un árbol de trabajo, también es un problema', () => {
    expect(docsProblem(fakeGit({ [inRepo]: 'false\n' }))).toMatch(/repositorio git/);
  });
});
