/** Del `mutate` de stryker.config.json a la matriz de GitHub Actions: un trozo por entrada. */
import path from 'node:path';
import { excludeNegated, planShards, weightOf } from './shards.ts';

export interface PlanIo {
  /** Los patrones `mutate` de la config de Stryker: así hay una sola fuente de verdad. */
  readConfigPatterns(): string[];
  /** Expande los patrones positivos a ficheros reales. */
  expand(patterns: string[]): string[];
  readText(file: string): string;
}

export interface PlanOptions {
  shards: number;
  /** Globs que acotan los candidatos; sirve para probar el flujo con pocos ficheros. */
  only?: string[];
}

export interface MatrixEntry {
  index: number;
  /** Ficheros del trozo, separados por comas: el formato de `--mutate`. */
  files: string;
  weight: number;
}

export function planMatrix(io: PlanIo, options: PlanOptions): { include: MatrixEntry[] } {
  const patterns = io.readConfigPatterns();
  const positive = patterns.filter((pattern) => !pattern.startsWith('!'));
  const only = options.only ?? [];
  const files = excludeNegated(io.expand(positive), patterns).filter(
    (file) => only.length === 0 || only.some((pattern) => path.matchesGlob(file, pattern)),
  );
  const weighted = files.map((file) => ({ file, weight: weightOf(io.readText(file)) }));
  const shards = planShards(weighted, options.shards);
  return {
    include: shards.map((shard) => ({
      index: shard.index,
      files: shard.files.join(','),
      weight: shard.weight,
    })),
  };
}
