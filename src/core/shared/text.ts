/** El número con la forma que le toca: `1 página`, `3 páginas`. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Una lista en español: «a», «a y b», «a, b y c». */
export function listOf(items: readonly string[]): string {
  return new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(items);
}

/** Nombre legible de un segmento de carpeta: `getting-started` → `Getting started`. */
export function humanize(segment: string): string {
  const text = segment.replace(/[-_]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Etiqueta de una carpeta por su último segmento: `guia/primeros-pasos` → `Primeros pasos`. */
export function folderLabel(path: string): string {
  return humanize(path.split('/').pop() ?? path);
}
