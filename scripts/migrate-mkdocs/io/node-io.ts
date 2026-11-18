/** Adaptadores a Node (sistema de ficheros y git) de la E/S que `in-place.ts` y `to-folder.ts` reciben inyectada. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { InPlaceIo } from '../modes/in-place.ts';
import type { ToFolderIo } from '../modes/to-folder.ts';

function walk(directory: string, root: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full, root) : [path.relative(root, full)];
  });
}

export function nodeInPlaceIo(repo: string): InPlaceIo {
  const docs = path.join(repo, 'docs');
  return {
    listMarkdown: () =>
      walk(docs, docs)
        .filter((file) => file.endsWith('.md'))
        .map((file) => file.split(path.sep).join('/'))
        .sort(),
    read: (file) => fs.readFileSync(path.join(docs, file), 'utf8'),
    write: (file, text) => fs.writeFileSync(path.join(docs, file), text),
    git: (gitArguments) =>
      execFileSync('git', gitArguments, { cwd: repo, encoding: 'utf8', stdio: 'pipe' }),
  };
}

export function nodeToFolderIo(): ToFolderIo {
  return {
    readText: (file) => fs.readFileSync(file, 'utf8'),
    writeText: (file, text) => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text);
    },
    copyFile: (from, to) => {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    },
    listFiles: (directory) => walk(directory, directory),
    removeDirectory: (directory) => fs.rmSync(directory, { recursive: true, force: true }),
    print: (line) => console.log(line),
    printError: (line) => console.error(line),
  };
}
