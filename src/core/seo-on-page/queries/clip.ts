/** Recorta con «…» como el buscador; nunca pasa de `max` (la elipsis cuenta) ni deja un espacio antes de ella. */
export function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
