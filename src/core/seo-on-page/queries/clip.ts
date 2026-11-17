/**
 * Recorta con «…» como lo hace el buscador: lo que queda fuera no lo ve el usuario. El resultado
 * nunca pasa de `max` caracteres (la elipsis cuenta) y no deja un espacio colgando antes de ella.
 */
export function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
