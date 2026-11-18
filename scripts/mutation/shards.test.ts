import { describe, expect, it } from 'vitest';
import { excludeNegated, planShards, weightOf, type WeightedFile } from './shards.ts';

describe('weightOf', () => {
  it('no cuenta líneas en blanco ni comentarios', () => {
    const source = ['// uno', '', '  ', '/** doc', ' * más', ' */', 'const a = 1;', 'a++;'].join(
      '\n',
    );
    expect(weightOf(source)).toBe(2);
  });

  it('pesa al menos 1 para que ningún fichero cuente como nada', () => {
    expect(weightOf('// solo un comentario\n')).toBe(1);
  });
});

describe('excludeNegated', () => {
  const patterns = ['src/**/*.ts', '!**/*.test.ts', '!src/testing/**'];

  it('quita lo que casa con un patrón negado', () => {
    const files = ['src/a.ts', 'src/a.test.ts', 'src/testing/x.ts', 'src/core/b.ts'];
    expect(excludeNegated(files, patterns)).toEqual(['src/a.ts', 'src/core/b.ts']);
  });

  it('ignora los patrones positivos', () => {
    expect(excludeNegated(['x/y.ts'], ['src/**/*.ts'])).toEqual(['x/y.ts']);
  });
});

describe('planShards', () => {
  function weighted(...entries: [string, number][]): WeightedFile[] {
    return entries.map(([file, weight]) => ({ file, weight }));
  }

  it('reparte de mayor a menor peso sobre el trozo más ligero', () => {
    const shards = planShards(weighted(['a', 10], ['b', 7], ['c', 5], ['d', 4], ['e', 1]), 2);
    expect(shards).toEqual([
      { index: 0, files: ['a', 'd'], weight: 14 },
      { index: 1, files: ['b', 'c', 'e'], weight: 13 },
    ]);
  });

  it('es determinista aunque la entrada llegue en otro orden y con empates', () => {
    const input = weighted(['b', 3], ['a', 3], ['c', 3], ['d', 3]);
    expect(planShards(input, 2)).toEqual(planShards([...input].reverse(), 2));
    expect(planShards(input, 2).map((shard) => shard.files)).toEqual([
      ['a', 'c'],
      ['b', 'd'],
    ]);
  });

  it('cada fichero cae en un solo trozo', () => {
    const input = [...Array(30).keys()].map((position) => ({
      file: `f${position}`,
      weight: position + 1,
    }));
    const all = planShards(input, 7).flatMap((shard) => shard.files);
    expect(all.toSorted()).toEqual(input.map((entry) => entry.file).toSorted());
  });

  it('descarta los trozos vacíos si hay menos ficheros que trozos', () => {
    const shards = planShards(weighted(['a', 2], ['b', 1]), 5);
    expect(shards.map((shard) => shard.index)).toEqual([0, 1]);
  });

  it('exige entre 1 y 20 trozos enteros', () => {
    for (const count of [0, 21, 1.5, Number.NaN]) {
      expect(() => planShards(weighted(['a', 1]), count)).toThrow(/entre 1 y 20/);
    }
  });

  it('falla si no hay ficheros que mutar', () => {
    expect(() => planShards([], 3)).toThrow(/ningún fichero/);
  });
});
