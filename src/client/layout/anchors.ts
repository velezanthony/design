import { fill } from '../text';

/**
 * Añade un ancla permanente al final de cada encabezado h2-h4 con `id` del contenido (`<main>`).
 * El enlace lleva `aria-label` (el `#` visible no es un nombre) y `data-pagefind-ignore` para que
 * nunca entre en un índice que se construya sobre el DOM. `label` lleva `{title}`.
 */
export function initHeadingAnchors(doc: Document, label: string): void {
  for (const heading of doc.querySelectorAll('main h2[id], main h3[id], main h4[id]')) {
    if (heading.querySelector(':scope > a.heading-anchor')) continue;
    const anchor = doc.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.setAttribute('href', `#${heading.id}`);
    anchor.setAttribute('aria-label', fill(label, { title: heading.textContent ?? '' }));
    anchor.setAttribute('data-pagefind-ignore', '');
    anchor.textContent = '#';
    heading.append(anchor);
  }
}
