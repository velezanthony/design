/* Una captura es un párrafo cuyo único contenido es una imagen (con espacios alrededor, como mucho).
   El CSS no distingue un párrafo con texto de uno sin él, así que la captura se marca en positivo con
   `docs-screenshot`. Lo hace `Article` al pintar el HTML, junto al `.table-scroll` de las tablas: así
   lo reciben los docs y cualquier página propia que lo use. El botón de zoom (`.docs-zoom`) lo pone
   el cliente después, así que aquí la imagen aún va suelta. */
const SCREENSHOT = /<p(\s[^>]*)?>(\s*<img\b[^>]*>\s*)<\/p>/g;
const CLASS_ATTRIBUTE = /\bclass="([^"]*)"/;
const NAME = 'docs-screenshot';

/** Añade `docs-screenshot` a los atributos de un `<p>`, sin repetirla si ya está. */
function withScreenshotClass(attributes: string): string {
  const found = CLASS_ATTRIBUTE.exec(attributes);
  if (!found) return `${attributes} class="${NAME}"`;
  const classes = found[1]!.split(/\s+/).filter(Boolean);
  if (classes.includes(NAME)) return attributes;
  return attributes.replace(CLASS_ATTRIBUTE, `class="${[...classes, NAME].join(' ')}"`);
}

/** Marca con `docs-screenshot` cada párrafo del HTML que solo contiene una imagen; idempotente. */
export function markScreenshots(html: string): string {
  return html.replace(
    SCREENSHOT,
    (_match, attributes: string | undefined, image: string) =>
      `<p${withScreenshotClass(attributes ?? '')}>${image}</p>`,
  );
}
