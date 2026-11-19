import { describe, expect, it } from 'vitest';
import { runInPlace, type InPlaceIo } from './in-place.ts';

function reportMarkdown(...lines: string[]) {
  return lines.join('\n') + '\n';
}

function fakeIo(
  files: Record<string, string>,
  git: InPlaceIo['git'] = cleanGit,
  extra: { mkdocs?: string; texts?: Record<string, string> } = {},
) {
  const written = new Map<string, string>();
  const outside = new Map<string, string>();
  const io: InPlaceIo = {
    listMarkdown: () => Object.keys(files).sort(),
    read: (file) => files[file] ?? '',
    write: (file, text) => written.set(file, text),
    readMkdocs: () => extra.mkdocs,
    readText: (file) => extra.texts?.[file] ?? '',
    writeText: (file, text) => outside.set(file, text),
    git,
  };
  return { io, written, outside };
}

const options = { force: false, dryRun: false };

function cleanGit(gitArguments: string[]) {
  return gitArguments[0] === 'rev-parse' ? 'true\n' : '';
}

describe('runInPlace', () => {
  const converted = reportMarkdown('!!! note "N"', '', '    x');

  it('reescribe solo los ficheros que cambian', () => {
    const { io, written } = fakeIo({ 'a.md': converted, 'b.md': reportMarkdown('# B') });
    const out = runInPlace(io, options);
    expect([...written.keys()]).toEqual(['a.md']);
    expect(written.get('a.md')).toBe(reportMarkdown(':::note[N]', 'x', ':::'));
    expect(out.exitCode).toBe(0);
  });

  it('el resumen cuenta lo cambiado y dice cómo revisarlo', () => {
    const { io } = fakeIo({ 'a.md': converted });
    const text = runInPlace(io, options).output.join('\n');
    expect(text).toContain('1 de 1');
    expect(text).toContain('git diff docs/');
  });

  it('con docs/ sucio se niega, no escribe nada y sale con error', () => {
    function dirty(gitArguments: string[]) {
      return gitArguments[0] === 'rev-parse' ? 'true\n' : ' M docs/a.md\n';
    }
    const { io, written } = fakeIo({ 'a.md': converted }, dirty);
    const out = runInPlace(io, options);
    expect(out.exitCode).not.toBe(0);
    expect(written.size).toBe(0);
    expect(out.output.join('\n')).toMatch(/--force/);
  });

  it('fuera de un repo git se niega', () => {
    function noGit(): string {
      throw new Error('not a git repository');
    }
    const { io, written } = fakeIo({ 'a.md': converted }, noGit);
    expect(runInPlace(io, options).exitCode).not.toBe(0);
    expect(written.size).toBe(0);
  });

  it('con --force sigue adelante pero avisa', () => {
    function dirty(gitArguments: string[]) {
      return gitArguments[0] === 'rev-parse' ? 'true\n' : ' M docs/a.md\n';
    }
    const { io, written } = fakeIo({ 'a.md': converted }, dirty);
    const out = runInPlace(io, { ...options, force: true });
    expect(written.size).toBe(1);
    expect(out.output.join('\n')).toMatch(/--force/);
  });

  it('con restos los lista y sale con error', () => {
    const { io, written } = fakeIo({ 'a.md': reportMarkdown('===+ "A"', '    x') });
    const out = runInPlace(io, options);
    expect(written.size).toBe(0);
    expect(out.exitCode).not.toBe(0);
    expect(out.output.join('\n')).toContain('a.md:1  tab  ===+ "A"');
  });

  it('los stubs no se escriben, se listan aparte y no hacen fallar', () => {
    const { io, written } = fakeIo({ 'changelog.md': reportMarkdown('--8<-- "CHANGELOG.md"') });
    const out = runInPlace(io, options);
    expect(written.size).toBe(0);
    expect(out.exitCode).toBe(0);
    expect(out.output.join('\n')).toContain("{ slug: 'changelog', file: '../CHANGELOG.md' }");
  });

  it('los ficheros que `listMarkdown` devuelve con carpetas se respetan', () => {
    const { io, written } = fakeIo({ 'users/a.md': converted });
    runInPlace(io, options);
    expect([...written.keys()]).toEqual(['users/a.md']);
  });

  it('segunda ejecución: nada que cambiar', () => {
    const first = fakeIo({ 'a.md': converted });
    runInPlace(first.io, options);
    const second = fakeIo({ 'a.md': first.written.get('a.md')! });
    runInPlace(second.io, options);
    expect(second.written.size).toBe(0);
  });

  it('lista aparte los enlaces a un stub con su sustitución, sin hacer fallar', () => {
    const { io } = fakeIo({
      'contributing.md': reportMarkdown('--8<-- "CONTRIBUTING.md"'),
      'a.md': reportMarkdown('[c](contributing.md)'),
    });
    const out = runInPlace(io, options);
    expect(out.exitCode).toBe(0);
    expect(out.output.join('\n')).toContain('docs/a.md:1  contributing.md  ->  ../CONTRIBUTING.md');
  });

  describe('mkdocs.yml', () => {
    const mkdocs = [
      'site_name: Demo',
      'plugins:',
      '  - i18n:',
      '      fallback_to_default: true',
      '      languages:',
      '        - locale: en',
      '          default: true',
      '        - locale: es',
      '  - macros',
      'nav:',
      '  - Home: index.md',
      '  - Guide:',
      '      - A: g/a.md',
      '',
    ].join('\n');

    it('lee idiomas y nav y propone la config', () => {
      const { io } = fakeIo({ 'a.md': reportMarkdown('# A') }, cleanGit, { mkdocs });
      const text = runInPlace(io, options).output.join('\n');
      expect(text).toContain('"locales"');
      expect(text).toContain('"fallback"');
      expect(text).toContain('"g/a"');
    });

    it('avisa de lo que ignora', () => {
      const { io } = fakeIo({ 'a.md': reportMarkdown('# A') }, cleanGit, { mkdocs });
      const text = runInPlace(io, options).output.join('\n');
      expect(text).toContain('plugin «macros»');
      expect(text).toContain('site_name');
    });

    it('sin mkdocs.yml convierte igual y no propone nada', () => {
      const { io, written } = fakeIo({ 'a.md': converted });
      const out = runInPlace(io, options);
      expect(written.size).toBe(1);
      expect(out.output.join('\n')).not.toContain('export default');
    });

    it('--config-out escribe la sugerencia', () => {
      const { io, outside } = fakeIo({ 'a.md': reportMarkdown('# A') }, cleanGit, { mkdocs });
      runInPlace(io, { ...options, configOut: 'docs-site/docs.suggested.mjs' });
      expect(outside.get('docs-site/docs.suggested.mjs')).toContain('export default');
    });

    it('usa el slugify propio del mkdocs.yml para reescribir las anclas', () => {
      const files = { 'a.md': reportMarkdown('# A', '## Uno', '## Uno', '[x](#uno_1)') };
      const { io, written } = fakeIo(files, cleanGit, { mkdocs: 'nav: []\n' });
      runInPlace(io, options);
      expect(written.get('a.md')).toContain('(#uno-1)');
    });
  });

  describe('--api', () => {
    it('sustituye `::: id` por la referencia generada', () => {
      const files = { 'api.md': reportMarkdown('# API', '', '::: pkg.Model') };
      const texts = { 'api.json': JSON.stringify({ 'pkg.Model': '## Model\n\nGenerado' }) };
      const { io, written } = fakeIo(files, cleanGit, { texts });
      runInPlace(io, { ...options, api: 'api.json' });
      expect(written.get('api.md')).toContain('Generado');
      expect(written.get('api.md')).not.toContain(':::');
    });

    it('sin --api queda la nota de siempre', () => {
      const files = { 'api.md': reportMarkdown('# API', '', '::: pkg.Model') };
      const { io, written } = fakeIo(files);
      runInPlace(io, options);
      expect(written.get('api.md')).toContain('API reference');
    });
  });

  describe('--dry-run', () => {
    function dirty(gitArguments: string[]) {
      return gitArguments[0] === 'rev-parse' ? 'true\n' : ' M docs/a.md\n';
    }

    it('no escribe nada, ni siquiera con docs/ sucio, y dice qué cambiaría', () => {
      const { io, written, outside } = fakeIo({ 'a.md': converted }, dirty, {
        mkdocs: 'nav:\n  - A: a.md\n',
      });
      const out = runInPlace(io, { ...options, dryRun: true, configOut: 'c.mjs' });
      expect(written.size).toBe(0);
      expect(outside.size).toBe(0);
      expect(out.exitCode).toBe(0);
      const text = out.output.join('\n');
      expect(text).toContain('DRY-RUN');
      expect(text).toContain('a.md');
      expect(text).toContain('export default');
    });

    it('con restos sigue saliendo con error: el plan lo avisa igual', () => {
      const { io } = fakeIo({ 'a.md': reportMarkdown('===+ "A"', '    x') });
      expect(runInPlace(io, { ...options, dryRun: true }).exitCode).not.toBe(0);
    });
  });
});
