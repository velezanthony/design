/** Une los informes incrementales de Stryker (uno por trozo) en uno solo que Stryker reutilice entero. */

interface TestLocation {
  start: { line: number; column: number };
}

export interface IncrementalTest {
  id: string;
  name: string;
  location?: TestLocation;
  [key: string]: unknown;
}

export interface IncrementalMutant {
  status?: string;
  coveredBy?: string[];
  killedBy?: string[];
  [key: string]: unknown;
}

export interface IncrementalReport {
  files: Record<string, { mutants: IncrementalMutant[]; [key: string]: unknown }>;
  testFiles?: Record<string, { tests: IncrementalTest[]; [key: string]: unknown }>;
  [key: string]: unknown;
}

type TestFiles = NonNullable<IncrementalReport['testFiles']>;

/** Un mismo test (fichero, nombre, posición) llega con ids distintos desde cada trozo. */
function testKey(file: string, test: IncrementalTest, occurrence: number): string {
  const { line, column } = test.location?.start ?? { line: 0, column: 0 };
  return [file, test.name, line, column, occurrence].join('\0');
}

function mapIds(
  ids: string[] | undefined,
  translate: Map<string, string>,
  prefix: string,
): string[] | undefined {
  return ids?.map((id) => translate.get(id) ?? `${prefix}-${id}`);
}

/** Los ids de cada trozo arrancan en "0": se prefijan y los tests repetidos se funden en el primero. */
function mergeTests(
  reports: IncrementalReport[],
  canonical: Map<string, string>,
): { testFiles: TestFiles; translations: Map<string, string>[] } {
  const testFiles: TestFiles = {};
  const translations = reports.map((report, position) => {
    const translate = new Map<string, string>();
    for (const [file, entry] of Object.entries(report.testFiles ?? {})) {
      const merged = (testFiles[file] ??= { ...entry, tests: [] });
      const seen = new Map<string, number>();
      for (const test of entry.tests) {
        const base = testKey(file, test, 0);
        const occurrence = seen.get(base) ?? 0;
        seen.set(base, occurrence + 1);
        const key = testKey(file, test, occurrence);
        let id = canonical.get(key);
        if (id === undefined) {
          id = `${position}-${test.id}`;
          canonical.set(key, id);
          merged.tests.push({ ...test, id });
        }
        translate.set(test.id, id);
      }
    }
    return translate;
  });
  return { testFiles, translations };
}

export function mergeReports(reports: IncrementalReport[]): IncrementalReport {
  const [first] = reports;
  if (!first) throw new Error('No hay ningún informe que unir.');

  const { testFiles, translations } = mergeTests(reports, new Map());
  const files: IncrementalReport['files'] = {};
  const owners = new Map<string, number>();

  reports.forEach((report, position) => {
    const translate = translations[position] ?? new Map<string, string>();
    for (const [file, entry] of Object.entries(report.files)) {
      const owner = owners.get(file);
      if (owner !== undefined) {
        throw new Error(
          `El fichero ${file} está en los informes ${owner + 1} y ${position + 1}: los trozos deben ser disjuntos.`,
        );
      }
      owners.set(file, position);
      files[file] = {
        ...entry,
        mutants: entry.mutants.map((mutant) => {
          const copy = { ...mutant };
          const coveredBy = mapIds(mutant.coveredBy, translate, String(position));
          const killedBy = mapIds(mutant.killedBy, translate, String(position));
          if (coveredBy) copy.coveredBy = coveredBy;
          if (killedBy) copy.killedBy = killedBy;
          return copy;
        }),
      };
    }
  });

  return { ...first, files, testFiles };
}

export interface MutationSummary {
  total: number;
  byStatus: Record<string, number>;
  /** Porcentaje de detectados sobre los válidos; `null` si no hay ninguno. */
  score: number | null;
}

export function summarize(report: IncrementalReport): MutationSummary {
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const entry of Object.values(report.files)) {
    for (const mutant of entry.mutants) {
      const status = mutant.status ?? 'Unknown';
      byStatus[status] = (byStatus[status] ?? 0) + 1;
      total += 1;
    }
  }
  const detected = (byStatus['Killed'] ?? 0) + (byStatus['Timeout'] ?? 0);
  const valid = detected + (byStatus['Survived'] ?? 0) + (byStatus['NoCoverage'] ?? 0);
  return { total, byStatus, score: valid === 0 ? null : (detected / valid) * 100 };
}

export function summaryMarkdown(summary: MutationSummary): string {
  const rows = Object.entries(summary.byStatus)
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `| ${status} | ${count} |`);
  const score = summary.score === null ? 'sin mutantes válidos' : `${summary.score.toFixed(2)} %`;
  return [
    '## Mutación',
    '',
    `Puntuación: **${score}** sobre ${summary.total} mutantes.`,
    '',
    '| Estado | Mutantes |',
    '| --- | ---: |',
    ...rows,
    '',
  ].join('\n');
}
