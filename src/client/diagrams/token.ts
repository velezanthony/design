/** El valor de un token del `<html>`; los colores `light-dark()` se resuelven al del tema activo, porque la propiedad personalizada guarda el texto y Mermaid solo lee colores. */
export function readToken(htmlDocument: Document, name: string): string {
  const root = htmlDocument.documentElement;
  const raw = htmlDocument.defaultView?.getComputedStyle(root).getPropertyValue(name) ?? '';
  if (!raw.includes('light-dark(')) return raw;
  // Solo al pintar se sabe qué lado elige `light-dark()`: se le pregunta a un elemento.
  const probe = htmlDocument.createElement('span');
  probe.style.color = raw.trim();
  root.append(probe);
  const color = htmlDocument.defaultView?.getComputedStyle(probe).color ?? '';
  probe.remove();
  return color;
}
