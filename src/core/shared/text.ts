/** El número con la forma que le toca: `1 página`, `3 páginas`. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Una lista en español: «a», «a y b», «a, b y c». */
export function listOf(items: readonly string[]): string {
  return new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(items);
}
