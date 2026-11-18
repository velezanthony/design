import { describe, expect, it } from 'vitest';
import { planMatrix, type PlanIo } from './plan.ts';

function fakeIo(sources: Record<string, string>): PlanIo {
  return {
    readConfigPatterns: () => ['src/**/*.ts', '!**/*.test.ts'],
    expand: () => Object.keys(sources),
    readText: (file) => sources[file] ?? '',
  };
}

const sources = {
  'src/big.ts': 'a;\nb;\nc;\nd;\n',
  'src/big.test.ts': 'x;\n',
  'src/small.ts': 'a;\n',
  'src/other.ts': 'a;\nb;\n',
};

describe('planMatrix', () => {
  it('lista los ficheros mutables y los reparte en entradas de matriz', () => {
    const matrix = planMatrix(fakeIo(sources), { shards: 2 });
    expect(matrix.include).toEqual([
      { index: 0, files: 'src/big.ts', weight: 4 },
      { index: 1, files: 'src/other.ts,src/small.ts', weight: 3 },
    ]);
  });

  it('`only` acota los ficheros candidatos', () => {
    const matrix = planMatrix(fakeIo(sources), { shards: 3, only: ['src/s*.ts'] });
    expect(matrix.include).toEqual([{ index: 0, files: 'src/small.ts', weight: 1 }]);
  });

  it('falla si el filtro deja la lista vacía', () => {
    expect(() => planMatrix(fakeIo(sources), { shards: 2, only: ['nada/**'] })).toThrow(
      /ningún fichero/,
    );
  });
});
