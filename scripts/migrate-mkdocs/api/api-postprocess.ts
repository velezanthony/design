/** Limpia el Markdown de griffe2md: las anclas `#a.b.Clase` sin `id` que las respalde rompen la build estricta, y `<code>` pasa a código en línea. */

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
