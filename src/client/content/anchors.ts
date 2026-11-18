import { fill } from '../text';

/** Añade un ancla al final de cada h2-h4 con `id` de `<main>`, con `aria-label` (`label` lleva `{title}`) y `data-pagefind-ignore`. */
export function initHeadingAnchors(htmlDocument: Document, label: string): void {
  for (const heading of htmlDocument.querySelectorAll('main h2[id], main h3[id], main h4[id]')) {
    if (heading.querySelector(':scope > a.heading-anchor')) continue;
    const anchor = htmlDocument.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.setAttribute('href', `#${heading.id}`);
    anchor.setAttribute('aria-label', fill(label, { title: heading.textContent ?? '' }));
    anchor.setAttribute('data-pagefind-ignore', '');
    anchor.textContent = '#';
    heading.append(anchor);
  }
}
