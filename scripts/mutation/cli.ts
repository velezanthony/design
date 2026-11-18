/** CLI de mutación en trozos: `plan` imprime la matriz de Actions, `merge` une los informes incrementales y `summary` resume uno. */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { mergeReports, summarize, summaryMarkdown, type IncrementalReport } from './merge.ts';
import { planMatrix, type PlanIo } from './plan.ts';

const nodePlanIo: PlanIo = {
  readConfigPatterns: () => JSON.parse(fs.readFileSync('stryker.config.json', 'utf8')).mutate,
  expand: (patterns) => fs.globSync(patterns).map((file) => file.split(path.sep).join('/')),
  readText: (file) => fs.readFileSync(file, 'utf8'),
};

function readReport(file: string): IncrementalReport {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const {
  values,
  positionals: [command, ...positionals],
} = parseArgs({
  allowPositionals: true,
  options: {
    shards: { type: 'string', default: '12' },
    only: { type: 'string', multiple: true },
    out: { type: 'string' },
  },
});

try {
  if (command === 'plan') {
    const matrix = planMatrix(nodePlanIo, { shards: Number(values.shards), only: values.only });
    console.log(JSON.stringify(matrix));
  } else if (command === 'merge' && values.out && positionals.length > 0) {
    const merged = mergeReports(positionals.map(readReport));
    fs.mkdirSync(path.dirname(values.out), { recursive: true });
    fs.writeFileSync(values.out, JSON.stringify(merged));
  } else if (command === 'summary' && positionals.length === 1) {
    console.log(summaryMarkdown(summarize(readReport(positionals[0]!))));
  } else {
    console.error(
      'Uso:\n  plan [--shards <1-20>] [--only <glob>…]\n  merge --out <fichero> <informe…>\n  summary <informe>',
    );
    process.exit(2);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
