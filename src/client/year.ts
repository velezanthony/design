/**
 * Pone el año del reloj del visitante en cada `[data-current-year]`. El HTML ya trae el año del
 * build, que es lo que se ve sin JS; una página servida meses después del build lo corrige aquí.
 */
export function initCurrentYear(doc: Document, now: Date = new Date()): void {
  const year = String(now.getFullYear());
  for (const node of doc.querySelectorAll('[data-current-year]')) node.textContent = year;
}
