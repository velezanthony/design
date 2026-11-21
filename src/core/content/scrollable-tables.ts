/* Una tabla que ya va en su `.table-scroll` (el plugin de Markdown lo hace en los docs) se deja
   como está; cualquier otra se envuelve. No contempla tablas anidadas: el contenido en prosa no
   las trae. */
const TABLE =
  /(<div\b[^>]*\bclass="[^"]*\btable-scroll\b[^"]*"[^>]*>\s*)?(<table\b[\s\S]*?<\/table>)/g;

/** Envuelve cada `<table>` del HTML en un `div.table-scroll` enfocable, sin repetir el envoltorio. */
export function wrapScrollableTables(html: string): string {
  return html.replace(TABLE, (match, wrapper: string | undefined, table: string) =>
    wrapper ? match : `<div class="table-scroll" tabindex="0">${table}</div>`,
  );
}
