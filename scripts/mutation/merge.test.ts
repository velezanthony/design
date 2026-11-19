import { describe, expect, it } from 'vitest';
import {
  mergeReports,
  sliceReport,
  summarize,
  summaryMarkdown,
  type IncrementalReport,
} from './merge.ts';

function location(line: number) {
  return { start: { line, column: 3 }, end: { line: line + 1, column: 3 } };
}

function report(options: {
  files: Record<string, { status?: string; coveredBy?: string[]; killedBy?: string[] }[]>;
  tests?: Record<string, { id: string; name: string; line: number }[]>;
  schemaVersion?: string;
}): IncrementalReport {
  return {
    schemaVersion: options.schemaVersion ?? '2',
    config: { marker: options.schemaVersion ?? 'first' },
    thresholds: { high: 80, low: 60 },
    files: Object.fromEntries(
      Object.entries(options.files).map(([file, mutants]) => [
        file,
        { language: 'typescript', source: '', mutants },
      ]),
    ),
    testFiles: Object.fromEntries(
      Object.entries(options.tests ?? {}).map(([file, tests]) => [
        file,
        {
          tests: tests.map((test) => ({
            id: test.id,
            name: test.name,
            location: location(test.line),
          })),
        },
      ]),
    ),
  };
}

describe('mergeReports', () => {
  it('renumera los ids de test de cada trozo para que no choquen', () => {
    const first = report({
      files: { 'src/a.ts': [{ coveredBy: ['0'], killedBy: ['0'] }] },
      tests: { 'src/a.test.ts': [{ id: '0', name: 'a', line: 1 }] },
    });
    const second = report({
      files: { 'src/b.ts': [{ coveredBy: ['0', '1'], killedBy: ['1'] }] },
      tests: {
        'src/b.test.ts': [
          { id: '0', name: 'b0', line: 1 },
          { id: '1', name: 'b1', line: 5 },
        ],
      },
    });
    const merged = mergeReports([first, second]);
    const ids = Object.values(merged.testFiles ?? {}).flatMap((file) =>
      file.tests.map((test) => test.id),
    );
    expect(new Set(ids).size).toBe(3);
    const mutantB = merged.files['src/b.ts']?.mutants[0];
    const secondTests = merged.testFiles?.['src/b.test.ts']?.tests ?? [];
    function idOf(name: string) {
      return secondTests.find((test) => test.name === name)?.id;
    }
    expect(mutantB?.coveredBy).toEqual([idOf('b0'), idOf('b1')]);
    expect(mutantB?.killedBy).toEqual([idOf('b1')]);
  });

  it('unifica el mismo test que aparece en dos trozos y reapunta las referencias', () => {
    const shared = { name: 'compartido', line: 10 };
    const first = report({
      files: { 'src/a.ts': [{ killedBy: ['0'] }] },
      tests: { 'src/shared.test.ts': [{ id: '0', ...shared }] },
    });
    const second = report({
      files: { 'src/b.ts': [{ killedBy: ['3'] }] },
      tests: {
        'src/shared.test.ts': [
          { id: '3', ...shared },
          { id: '4', name: 'solo del segundo', line: 20 },
        ],
      },
    });
    const merged = mergeReports([first, second]);
    const tests = merged.testFiles?.['src/shared.test.ts']?.tests ?? [];
    expect(tests.map((test) => test.name)).toEqual(['compartido', 'solo del segundo']);
    const canonical = tests[0]?.id;
    expect(merged.files['src/a.ts']?.mutants[0]?.killedBy).toEqual([canonical]);
    expect(merged.files['src/b.ts']?.mutants[0]?.killedBy).toEqual([canonical]);
  });

  it('no funde tests distintos que comparten nombre y posición dentro de un mismo trozo', () => {
    const twins = report({
      files: { 'src/a.ts': [{ killedBy: ['1'] }] },
      tests: {
        'src/t.test.ts': [
          { id: '0', name: 'igual', line: 2 },
          { id: '1', name: 'igual', line: 2 },
        ],
      },
    });
    const merged = mergeReports([twins]);
    const tests = merged.testFiles?.['src/t.test.ts']?.tests ?? [];
    expect(tests).toHaveLength(2);
    expect(merged.files['src/a.ts']?.mutants[0]?.killedBy).toEqual([tests[1]?.id]);
  });

  it('conserva el resto de campos del primer informe', () => {
    const merged = mergeReports([
      report({ files: { 'src/a.ts': [] }, schemaVersion: '2' }),
      report({ files: { 'src/b.ts': [] }, schemaVersion: '9' }),
    ]);
    expect(merged.schemaVersion).toBe('2');
    expect(merged.config).toEqual({ marker: '2' });
    expect(Object.keys(merged.files)).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('falla con claridad si dos trozos traen el mismo fichero', () => {
    const one = report({ files: { 'src/a.ts': [] } });
    expect(() => mergeReports([one, one])).toThrow(/src\/a\.ts.*disjuntos/);
  });

  it('falla si un mutante apunta a un test que su informe no tiene (formato de Stryker cambiado)', () => {
    const broken = report({
      files: { 'src/a.ts': [{ coveredBy: ['0', '7'], killedBy: ['7'] }] },
      tests: { 'src/a.test.ts': [{ id: '0', name: 'a', line: 1 }] },
    });
    expect(() => mergeReports([broken])).toThrow(/src\/a\.ts.*7.*formato/s);
  });

  it('falla sin informes', () => {
    expect(() => mergeReports([])).toThrow(/ningún informe/);
  });
});

describe('sliceReport', () => {
  const full = report({
    files: { 'src/a.ts': [{ status: 'Killed' }], 'src/b.ts': [], 'src/c.ts': [] },
    tests: { 'src/a.test.ts': [{ id: '0', name: 'a', line: 1 }] },
  });

  it('se queda solo con los ficheros pedidos, para que los trozos sigan siendo disjuntos', () => {
    const sliced = sliceReport(full, ['src/a.ts', 'src/c.ts']);
    expect(Object.keys(sliced.files)).toEqual(['src/a.ts', 'src/c.ts']);
    expect(sliced.files['src/a.ts']?.mutants).toEqual([{ status: 'Killed' }]);
  });

  it('conserva los tests y el resto de campos, que los mutantes necesitan', () => {
    const sliced = sliceReport(full, ['src/a.ts']);
    expect(sliced.testFiles).toEqual(full.testFiles);
    expect(sliced.config).toEqual(full.config);
  });

  it('ignora un fichero pedido que el informe no trae (aún sin medir)', () => {
    expect(Object.keys(sliceReport(full, ['src/new.ts', 'src/b.ts']).files)).toEqual(['src/b.ts']);
  });

  it('los trozos de un mismo informe se unen sin chocar y reconstruyen los ficheros', () => {
    const merged = mergeReports([
      sliceReport(full, ['src/a.ts']),
      sliceReport(full, ['src/b.ts', 'src/c.ts']),
    ]);
    expect(Object.keys(merged.files)).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
  });
});

describe('summarize', () => {
  it('cuenta por estado y calcula la puntuación sobre los mutantes válidos', () => {
    const merged = report({
      files: {
        'src/a.ts': [
          { status: 'Killed' },
          { status: 'Killed' },
          { status: 'Timeout' },
          { status: 'Survived' },
        ],
        'src/b.ts': [{ status: 'NoCoverage' }, { status: 'CompileError' }, { status: 'Ignored' }],
      },
    });
    const summary = summarize(merged);
    expect(summary.total).toBe(7);
    expect(summary.byStatus).toMatchObject({ Killed: 2, Timeout: 1, Survived: 1, NoCoverage: 1 });
    expect(summary.score).toBeCloseTo(60);
  });

  it('sin mutantes válidos la puntuación es null', () => {
    expect(summarize(report({ files: { 'src/a.ts': [{ status: 'Ignored' }] } })).score).toBeNull();
  });
});

describe('summaryMarkdown', () => {
  it('muestra la puntuación y una fila por estado', () => {
    const text = summaryMarkdown({ total: 3, byStatus: { Survived: 1, Killed: 2 }, score: 66.666 });
    expect(text).toContain('**66.67 %** sobre 3 mutantes');
    expect(text.indexOf('| Killed | 2 |')).toBeLessThan(text.indexOf('| Survived | 1 |'));
  });
});
