/**
 * Limpieza del Markdown que genera griffe2md para que pase la build estricta.
 *
 * griffe2md enlaza cada símbolo a un `#ancla` con el nombre completo (`#a.b.Clase`), pero no
 * emite ningún `id` que la respalde: el build estricto las vería rotas. Se dejan como texto. Y
 * los tipos vienen envueltos en HTML `<code>`, que aquí se convierte a código en línea.
 */

export interface CleanedApi {
  markdown: string;
  /** Cuántos enlaces internos se han convertido en texto. */
  stripped: number;
}

export function cleanGeneratedApi(source: string): CleanedApi {
  let stripped = 0;
  let fenced = false;
  const lines = source.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return line;
    }
    if (fenced) return line;
    return line
      .replace(/\[([^\]]+)\]\(#[^)]*\)/g, (_match, text: string) => {
        stripped++;
        return text;
      })
      .replace(/<code>(.*?)<\/code>/g, (_match, text: string) => `\`${text.replace(/`/g, '')}\``);
  });
  return { markdown: lines.join('\n'), stripped };
}
