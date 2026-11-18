/** Adaptadores a Node (sistema de ficheros y git) de la E/S que `in-place.ts` recibe inyectada. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { InPlaceIo } from '../modes/in-place.ts';

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
