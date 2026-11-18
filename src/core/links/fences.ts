const OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/**
 * Una entrada por línea del cuerpo: `true` si la línea está dentro de un bloque de código con
 * fence (incluidas las líneas del propio fence). Reconoce ``` y ~~~; el cierre ha de usar el mismo
 * carácter y al menos tantos como la apertura, y un fence sin cerrar llega hasta el final.
 */
export function fenceMask(body: string): boolean[] {
  const mask: boolean[] = [];
  let open: { char: string; size: number } | undefined;
  for (const line of body.split('\n')) {
    if (open) {
      mask.push(true);
      const closing = new RegExp(`^ {0,3}\\${open.char}{${open.size},}\\s*$`);
      if (closing.test(line)) open = undefined;
      continue;
    }
    const [, marker, info] = OPEN.exec(line) ?? [];
    // Una info string con ` no abre un fence de acentos graves (es código en línea).
    if (marker && info !== undefined && !(marker.startsWith('`') && info.includes('`'))) {
      open = { char: marker.charAt(0), size: marker.length };
      mask.push(true);
      continue;
    }
    mask.push(false);
  }
  return mask;
}
