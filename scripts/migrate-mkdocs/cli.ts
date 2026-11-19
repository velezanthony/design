/** CLI de migración de MkDocs Material: solo parsea argumentos y cablea los módulos (ver `transform.ts` y `pipeline.ts`); `--in-place` exige git limpio en `docs/`. */
import path from 'node:path';
import { parseArgs } from 'node:util';
import { runInPlace } from './modes/in-place.ts';
import { nodeInPlaceIo, nodeToFolderIo } from './io/node-io.ts';
import { checkOptions } from './io/options.ts';
import { runToFolder } from './modes/to-folder.ts';

const { values } = parseArgs({
  options: {
    repo: { type: 'string' },
    out: { type: 'string' },
    'repo-url': { type: 'string' },
    branch: { type: 'string' },
    api: { type: 'string' },
    external: { type: 'string', multiple: true },
    'external-out': { type: 'string' },
    'sidebar-out': { type: 'string' },
    report: { type: 'string' },
    'in-place': { type: 'boolean' },
    force: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    'config-out': { type: 'string' },
  },
});

const problem = checkOptions(values);
if (problem) {
  console.error(problem);
  process.exit(2);
}

const repo = path.resolve(values.repo!);

if (values['in-place']) {
  const result = runInPlace(nodeInPlaceIo(repo), {
    force: values.force ?? false,
    dryRun: values['dry-run'] ?? false,
    api: values.api,
    configOut: values['config-out'],
  });
  for (const line of result.output) console.log(line);
  process.exit(result.exitCode);
}

process.exit(
  runToFolder(nodeToFolderIo(), {
    repo,
    out: values.out!,
    repoUrl: values['repo-url']!,
    branch: values.branch ?? 'main',
    api: values.api,
    external: values.external ?? [],
    externalOut: values['external-out'],
    sidebarOut: values['sidebar-out'],
    report: values.report,
    configOut: values['config-out'],
    dryRun: values['dry-run'] ?? false,
  }),
);
