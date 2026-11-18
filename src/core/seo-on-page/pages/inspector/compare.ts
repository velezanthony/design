/**
 * Cómo está una longitud frente a su recomendación, para COMPARAR idiomas: en el mínimo o por
 * debajo es `low` (a diferencia del medidor, que da por buena la que llega justo al mínimo: aquí
 * importa que un idioma quede al borde mientras otro va sobrado), por encima del máximo `long`, y
 * sin texto `none`.
 */
export type LengthClass = 'low' | 'ok' | 'long' | 'none';

export function lengthClass(length: number | undefined, min: number, max: number): LengthClass {
  if (length === undefined) return 'none';
  if (length <= min) return 'low';
  return length > max ? 'long' : 'ok';
}

/**
 * Qué celdas de una fila difieren de forma sospechosa entre idiomas. Si todas coinciden, ninguna;
 * si no, se marcan las que se apartan del valor `preferred` (el bueno) y, sin ninguna que lo tenga,
 * las que se apartan de la del primer idioma.
 */
export function differing<T>(values: readonly T[], preferred: T): boolean[] {
  if (values.every((value) => value === values[0])) return values.map(() => false);
  const reference = values.includes(preferred) ? preferred : values[0];
  return values.map((value) => value !== reference);
}
