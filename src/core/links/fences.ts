const OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/** Marca por línea si está dentro de un fence (``` o ~~~); el cierre usa el mismo carácter y un fence sin cerrar llega al final. */
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
