import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMMIT_MARK } from '../../core/seo/lastmod';
import { createLastModified, type LastModifiedSources } from './last-modified';

const ROOT = '/repo/site';

/** Un git falso que responde por subcomando; cualquier otro falla como fuera de un repositorio. */
function fakeSources(
  git: { toplevel?: string; shallow?: boolean; log?: string },
  mtimes: Record<string, string> = {},
): LastModifiedSources & { run: ReturnType<typeof vi.fn> } {
  const run = vi.fn(async (gitArguments: string[]): Promise<string> => {
    const command = gitArguments.join(' ');
    if (command === 'rev-parse --show-toplevel' && git.toplevel) return `${git.toplevel}\n`;
    if (command === 'rev-parse --is-shallow-repository') return git.shallow ? 'true\n' : 'false\n';
    if (gitArguments.includes('log') && git.log !== undefined) return git.log;
    throw new Error('fatal: not a git repository');
  });
  return {
    run,
    modified: async (file) => (mtimes[file] ? new Date(mtimes[file]) : undefined),
  };
}

const log = [
  `${COMMIT_MARK}2026-09-07T00:06:43+02:00`,
  '',
  'site/docs/a.md',
  'site/src/pages/cv.astro',
  '',
  `${COMMIT_MARK}2026-08-08T14:01:37+02:00`,
  '',
  'site/docs/b.md',
  'LICENSE',
  '',
].join('\n');

describe('createLastModified', () => {
  it('toma la fecha del último commit de cada archivo, con las rutas relativas a la raíz del proyecto', async () => {
    const sources = fakeSources({ toplevel: '/repo', log });
    const dates = await createLastModified(sources)(ROOT, ['docs/a.md', 'docs/b.md']);
    expect(dates).toEqual(
      new Map([
        ['docs/a.md', '2026-09-07T00:06:43+02:00'],
        ['docs/b.md', '2026-08-08T14:01:37+02:00'],
      ]),
    );
  });

  it('una sola llamada a git log para todos los archivos, también entre consultas', async () => {
    const sources = fakeSources({ toplevel: '/repo', log });
    const lastModified = createLastModified(sources);
    await lastModified(ROOT, ['docs/a.md']);
    await lastModified(ROOT, ['docs/b.md', 'src/pages/cv.astro']);
    const logs = sources.run.mock.calls.filter(([gitArguments]) =>
      (gitArguments as string[]).includes('log'),
    );
    expect(logs).toHaveLength(1);
  });

  it('un archivo de fuera de la raíz del proyecto (`../docs`) también tiene fecha', async () => {
    const sources = fakeSources({ toplevel: '/repo', log });
    const dates = await createLastModified(sources)(ROOT, ['../LICENSE']);
    expect(dates.get('../LICENSE')).toBe('2026-08-08T14:01:37+02:00');
  });

  it('un archivo sin commits (nuevo, sin añadir) recurre a su fecha de modificación', async () => {
    const sources = fakeSources(
      { toplevel: '/repo', log },
      { '/repo/site/docs/nuevo.md': '2026-10-01T10:00:00.000Z' },
    );
    const dates = await createLastModified(sources)(ROOT, ['docs/nuevo.md']);
    expect(dates.get('docs/nuevo.md')).toBe('2026-10-01T10:00:00.000Z');
  });

  it('sin repositorio git, todo recurre a la fecha de modificación', async () => {
    const sources = fakeSources({}, { '/repo/site/docs/a.md': '2026-10-01T10:00:00.000Z' });
    const dates = await createLastModified(sources)(ROOT, ['docs/a.md']);
    expect(dates).toEqual(new Map([['docs/a.md', '2026-10-01T10:00:00.000Z']]));
  });

  it('sin historial ni archivo, no hay fecha', async () => {
    const dates = await createLastModified(fakeSources({}))(ROOT, ['docs/a.md']);
    expect(dates).toEqual(new Map());
  });

  /* Un clon superficial fecha todo con su único commit (hoy): equivocarse es peor que no decirlo. */
  it('en un clon superficial no da ninguna fecha, ni la del archivo (que sería la del checkout)', async () => {
    const sources = fakeSources(
      { toplevel: '/repo', shallow: true, log },
      { '/repo/site/docs/a.md': '2026-10-01T10:00:00.000Z' },
    );
    expect(await createLastModified(sources)(ROOT, ['docs/a.md'])).toEqual(new Map());
    expect(sources.run).not.toHaveBeenCalledWith(
      expect.arrayContaining(['log']),
      expect.anything(),
    );
  });

  it('si git log falla, recurre a la fecha de modificación', async () => {
    const sources = fakeSources(
      { toplevel: '/repo' },
      { '/repo/site/docs/a.md': '2026-10-01T10:00:00.000Z' },
    );
    const dates = await createLastModified(sources)(ROOT, ['docs/a.md']);
    expect(dates.get('docs/a.md')).toBe('2026-10-01T10:00:00.000Z');
  });
});

describe('con git de verdad', () => {
  const directories: string[] = [];
  afterEach(() => {
    for (const directory of directories.splice(0))
      rmSync(directory, { recursive: true, force: true });
  });

  function git(directory: string, gitArguments: string[], date?: string) {
    execFileSync('git', gitArguments, {
      cwd: directory,
      stdio: 'ignore',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'T',
        GIT_AUTHOR_EMAIL: 't@t.dev',
        GIT_COMMITTER_NAME: 'T',
        GIT_COMMITTER_EMAIL: 't@t.dev',
        ...(date && { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }),
      },
    });
  }

  it('fecha por commit un archivo con tildes y deja el no versionado a su mtime', async () => {
    const top = mkdtempSync(path.join(tmpdir(), 'lastmod-'));
    directories.push(top);
    const root = path.join(top, 'site');
    mkdirSync(path.join(root, 'docs'), { recursive: true });
    git(top, ['init', '-q']);
    writeFileSync(path.join(root, 'docs', 'guía.md'), 'a');
    git(top, ['add', '.']);
    git(top, ['commit', '-qm', 'uno'], '2026-01-01T10:00:00+00:00');
    writeFileSync(path.join(root, 'docs', 'guía.md'), 'b');
    git(top, ['commit', '-qam', 'dos'], '2026-02-02T10:00:00+00:00');
    writeFileSync(path.join(root, 'docs', 'nuevo.md'), 'c');

    const dates = await createLastModified()(root, [
      'docs/guía.md',
      'docs/nuevo.md',
      'docs/falta.md',
    ]);
    expect(dates.get('docs/guía.md')).toBe('2026-02-02T10:00:00+00:00');
    expect(dates.get('docs/nuevo.md')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(dates.has('docs/falta.md')).toBe(false);
  });
});
