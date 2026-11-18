import { describe, expect, it } from 'vitest';
import { runInPlace, type InPlaceIo } from './in-place';

function md(...lines: string[]) {
  return lines.join('\n') + '\n';
}

function fakeIo(files: Record<string, string>, git: InPlaceIo['git'] = cleanGit) {
  const written = new Map<string, string>();
  const io: InPlaceIo = {
    listMarkdown: () => Object.keys(files).sort(),
    read: (file) => files[file],
    write: (file, text) => written.set(file, text),
    git,
  };
  return { io, written };
}

function cleanGit(args: string[]) {
  return args[0] === 'rev-parse' ? 'true\n' : '';
}

describe('runInPlace', () => {
  const converted = md('!!! note "N"', '', '    x');

  it('reescribe solo los ficheros que cambian', () => {
    const { io, written } = fakeIo({ 'a.md': converted, 'b.md': md('# B') });
    const out = runInPlace(io, { force: false });
    expect([...written.keys()]).toEqual(['a.md']);
    expect(written.get('a.md')).toBe(md(':::note[N]', 'x', ':::'));
    expect(out.exitCode).toBe(0);
  });

  it('el resumen cuenta lo cambiado y dice cómo revisarlo', () => {
    const { io } = fakeIo({ 'a.md': converted });
    const text = runInPlace(io, { force: false }).output.join('\n');
    expect(text).toContain('1 de 1');
    expect(text).toContain('git diff docs/');
  });

  it('con docs/ sucio se niega, no escribe nada y sale con error', () => {
    function dirty(args: string[]) {
      return args[0] === 'rev-parse' ? 'true\n' : ' M docs/a.md\n';
    }
    const { io, written } = fakeIo({ 'a.md': converted }, dirty);
    const out = runInPlace(io, { force: false });
    expect(out.exitCode).not.toBe(0);
    expect(written.size).toBe(0);
    expect(out.output.join('\n')).toMatch(/--force/);
  });

  it('fuera de un repo git se niega', () => {
    function noGit(): string {
      throw new Error('not a git repository');
    }
    const { io, written } = fakeIo({ 'a.md': converted }, noGit);
    expect(runInPlace(io, { force: false }).exitCode).not.toBe(0);
    expect(written.size).toBe(0);
  });

  it('con --force sigue adelante pero avisa', () => {
    function dirty(args: string[]) {
      return args[0] === 'rev-parse' ? 'true\n' : ' M docs/a.md\n';
    }
    const { io, written } = fakeIo({ 'a.md': converted }, dirty);
    const out = runInPlace(io, { force: true });
    expect(written.size).toBe(1);
    expect(out.output.join('\n')).toMatch(/--force/);
  });

  it('con restos los lista y sale con error', () => {
    const { io, written } = fakeIo({ 'a.md': md('===+ "A"', '    x') });
    const out = runInPlace(io, { force: false });
    expect(written.size).toBe(0);
    expect(out.exitCode).not.toBe(0);
    expect(out.output.join('\n')).toContain('a.md:1  tab  ===+ "A"');
  });

  it('los stubs no se escriben, se listan aparte y no hacen fallar', () => {
    const { io, written } = fakeIo({ 'changelog.md': md('--8<-- "CHANGELOG.md"') });
    const out = runInPlace(io, { force: false });
    expect(written.size).toBe(0);
    expect(out.exitCode).toBe(0);
    expect(out.output.join('\n')).toContain("{ slug: 'changelog', file: '../CHANGELOG.md' }");
  });

  it('los ficheros que `listMarkdown` devuelve con carpetas se respetan', () => {
    const { io, written } = fakeIo({ 'users/a.md': converted });
    runInPlace(io, { force: false });
    expect([...written.keys()]).toEqual(['users/a.md']);
  });

  it('segunda ejecución: nada que cambiar', () => {
    const first = fakeIo({ 'a.md': converted });
    runInPlace(first.io, { force: false });
    const second = fakeIo({ 'a.md': first.written.get('a.md')! });
    runInPlace(second.io, { force: false });
    expect(second.written.size).toBe(0);
  });

  it('lista aparte los enlaces a un stub con su sustitución, sin hacer fallar', () => {
    const { io } = fakeIo({
      'contributing.md': md('--8<-- "CONTRIBUTING.md"'),
      'a.md': md('[c](contributing.md)'),
    });
    const out = runInPlace(io, { force: false });
    expect(out.exitCode).toBe(0);
    expect(out.output.join('\n')).toContain('docs/a.md:1  contributing.md  ->  ../CONTRIBUTING.md');
  });
});
