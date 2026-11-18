/** Corrige `[data-current-year]` con el año del visitante: el HTML trae el del build. */
export function initCurrentYear(htmlDocument: Document, now: Date = new Date()): void {
  const year = String(now.getFullYear());
  for (const node of htmlDocument.querySelectorAll('[data-current-year]')) node.textContent = year;
}
