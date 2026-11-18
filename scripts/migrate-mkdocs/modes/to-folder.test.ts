import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isExcluded, parseMkdocs, planCopies, runToFolder, type ToFolderIo } from './to-folder.ts';

const MKDOCS = [
  'site_name: Demo',
  'markdown_extensions:',
  '  - pymdownx.emoji:',
  '      emoji_index: !!python/name:material.extensions.emoji.twemoji',
  'exclude_docs: |',
  '  drafts/',
  '  ',
  '  skip.md',
  'nav:',
  '  - Home: index.md',
  '',
].join('\n');

describe('parseMkdocs', () => {
  it('ignora las etiquetas !!python/name, que yaml no conoce', () => {
    const parsed = parseMkdocs(MKDOCS);
    expect(parsed.nav).toEqual([{ Home: 'index.md' }]);
  });

  it('parte exclude_docs en patrones sin líneas vacías ni espacios', () => {
    expect(parseMkdocs(MKDOCS).excludePatterns).toEqual(['drafts/', 'skip.md']);
  });

  it('sin exclude_docs no hay patrones', () => {
    expect(parseMkdocs('nav: []\n').excludePatterns).toEqual([]);
  });
});

describe('isExcluded', () => {
  const patterns = ['drafts/', 'skip.md'];

  it('un patrón con barra final excluye la carpeta entera', () => {
    expect(isExcluded(patterns, 'drafts/a.md')).toBe(true);
    expect(isExcluded(patterns, 'drafts/deep/b.md')).toBe(true);
  });

  it('un patrón sin barra solo excluye ese fichero, no otro con el mismo nombre en otra carpeta', () => {
    expect(isExcluded(patterns, 'skip.md')).toBe(true);
    expect(isExcluded(patterns, 'other/skip.md')).toBe(false);
  });

  it('lo demás no se excluye', () => {
    expect(isExcluded(patterns, 'index.md')).toBe(false);
    expect(isExcluded([], 'index.md')).toBe(false);
  });
});

describe('planCopies', () => {
  it('separa markdown, imágenes, saltados y excluidos', () => {
    const plan = planCopies(
      ['index.md', 'drafts/a.md', 'img/logo.PNG', 'notes.txt', 'skip.md'],
      ['drafts/', 'skip.md'],
    );
    expect(plan.markdown).toEqual(['index.md']);
    expect(plan.images).toEqual(['img/logo.PNG']);
    expect(plan.excluded).toEqual(['drafts/a.md', 'skip.md']);
    expect(plan.skipped).toEqual(['drafts/a.md', 'notes.txt', 'skip.md']);
  });

  it('una imagen excluida no se copia', () => {
    expect(planCopies(['drafts/x.png'], ['drafts/']).images).toEqual([]);
  });
});

const repo = path.resolve('/work/repo');
const out = path.resolve('/work/out');

function fakeIo(files: Record<string, string>) {
  const fileSystem = new Map(
    Object.entries(files).map(([file, text]) => [path.join(repo, file), text]),
  );
  const writes = new Map<string, string>();
  const copies: [string, string][] = [];
  const removed: string[] = [];
  const printed: string[] = [];
  const errors: string[] = [];
  const io: ToFolderIo = {
    readText: (file) => {
      const text = fileSystem.get(file);
      if (text === undefined) throw new Error(`no existe ${file}`);
      return text;
    },
    writeText: (file, text) => writes.set(file, text),
    copyFile: (from, to) => copies.push([from, to]),
    listFiles: (directory) =>
      [...fileSystem.keys()]
        .filter((file) => file.startsWith(directory + path.sep))
        .map((file) => path.relative(directory, file)),
    removeDirectory: (directory) => removed.push(directory),
    print: (line) => printed.push(line),
    printError: (line) => errors.push(line),
  };
  return { io, writes, copies, removed, printed, errors };
}

const options = {
  repo,
  out,
  repoUrl: 'https://example.test/repo',
  branch: 'main',
  external: [],
};

describe('runToFolder', () => {
  const files = {
    'mkdocs.yml': MKDOCS,
    'docs/index.md': '# Inicio\n',
    'docs/img/logo.png': 'binario',
    'docs/drafts/a.md': '# Borrador\n',
    'docs/notes.txt': 'nota',
  };

  it('convierte a la carpeta de salida y no toca nunca el origen', () => {
    const { io, writes, copies, removed } = fakeIo(files);
    expect(runToFolder(io, options)).toBe(0);
    expect([...writes.keys()]).toEqual([path.join(out, 'index.md')]);
    expect(copies).toEqual([
      [path.join(repo, 'docs/img/logo.png'), path.join(out, 'img/logo.png')],
    ]);
    expect(removed).toEqual([out]);
    const touched = [...writes.keys(), ...copies.map(([, to]) => to), ...removed];
    expect(touched.every((target) => !target.startsWith(repo))).toBe(true);
  });

  it('imprime el resumen con lo publicado y lo excluido', () => {
    const { io, printed } = fakeIo(files);
    runToFolder(io, options);
    const summary = JSON.parse(printed[0]!);
    expect(summary).toMatchObject({
      markdown: 1,
      images: 1,
      skipped: 2,
      excluded: ['drafts/a.md'],
      leftovers: 0,
    });
  });

  it('devuelve 1 y lista los restos si quedan sintaxis de MkDocs sin convertir', () => {
    const { io, errors } = fakeIo({ ...files, 'docs/index.md': '===+ "A"\n    x\n' });
    expect(runToFolder(io, options)).toBe(1);
    expect(errors.join('\n')).toContain('index.md:1  tab  ===+ "A"');
  });

  it('escribe la barra lateral generada cuando se pide', () => {
    const { io, writes } = fakeIo(files);
    runToFolder(io, { ...options, sidebarOut: '/work/sidebar.mjs' });
    expect(writes.get(path.resolve('/work/sidebar.mjs'))).toContain('export default');
  });
});
