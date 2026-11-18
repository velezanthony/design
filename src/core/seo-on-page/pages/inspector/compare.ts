/** Una longitud frente a su recomendación al comparar idiomas; `edge` cumple pero va justa en el mínimo. */
export type LengthClass = 'low' | 'edge' | 'ok' | 'long' | 'none';

export function lengthClass(length: number | undefined, min: number, max: number): LengthClass {
  if (length === undefined) return 'none';
  if (length < min) return 'low';
  if (length === min) return 'edge';
  return length > max ? 'long' : 'ok';
}

/** Marca las celdas que se apartan de `preferred` o, sin ninguna, de la del primer idioma. */
export function differing<T>(values: readonly T[], preferred: T): boolean[] {
  if (values.every((value) => value === values[0])) return values.map(() => false);
  const reference = values.includes(preferred) ? preferred : values[0];
  return values.map((value) => value !== reference);
}
