/** Reparto de los ficheros mutables en trozos de peso parecido, para correr Stryker en paralelo. */
import path from 'node:path';

export interface WeightedFile {
  file: string;
  weight: number;
}

export interface Shard {
  index: number;
  files: string[];
  weight: number;
}

export const MAX_SHARDS = 20;

const COMMENT_START = /^(\/\/|\/\*|\*)/;

/** Líneas con código: el número de mutantes de un fichero crece con ellas. */
export function weightOf(source: string): number {
  const lines = source.split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed !== '' && !COMMENT_START.test(trimmed);
  });
  return Math.max(1, lines.length);
}

/** Aplica solo los patrones `!…` de `mutate`; los positivos los expande quien lista los ficheros. */
export function excludeNegated(files: string[], patterns: string[]): string[] {
  const negated = patterns
    .filter((pattern) => pattern.startsWith('!'))
    .map((pattern) => pattern.slice(1));
  return files.filter((file) => !negated.some((pattern) => path.matchesGlob(file, pattern)));
}

function compareHeaviestFirst(left: WeightedFile, right: WeightedFile): number {
  return (
    right.weight - left.weight || (left.file < right.file ? -1 : left.file > right.file ? 1 : 0)
  );
}

/** Voraz de mayor a menor: cada fichero va al trozo más ligero (a igualdad, el de menor índice). */
export function planShards(files: WeightedFile[], count: number): Shard[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_SHARDS) {
    throw new Error(
      `El número de trozos debe ser un entero entre 1 y ${MAX_SHARDS} (recibido ${count}).`,
    );
  }
  if (files.length === 0) throw new Error('No hay ningún fichero que mutar.');

  const shards: Shard[] = [...Array(count).keys()].map((index) => ({
    index,
    files: [],
    weight: 0,
  }));
  for (const entry of files.toSorted(compareHeaviestFirst)) {
    const lightest = shards.reduce((best, shard) => (shard.weight < best.weight ? shard : best));
    lightest.files.push(entry.file);
    lightest.weight += entry.weight;
  }
  return shards
    .filter((shard) => shard.files.length > 0)
    .map((shard) => ({ ...shard, files: shard.files.toSorted() }));
}
