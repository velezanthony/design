import { lastModifiedDates } from './last-modified';

type DatesOf = typeof lastModifiedDates;

/** La fecha de un solo archivo, para el sitio (`@velezanthony/design/last-modified`); comparte el único git log de `lastModifiedDates`. */
export function createFileLastModified(datesOf: DatesOf = lastModifiedDates) {
  return async function fileLastModified(
    file: string,
    root: string = process.cwd(),
  ): Promise<string | undefined> {
    return (await datesOf(root, [file])).get(file);
  };
}

/**
 * Fecha ISO de la última modificación de `file` (relativo a `root`, por defecto el directorio de
 * trabajo): la de su último commit y, si no la tiene, la del archivo. `undefined` en un clon
 * superficial, donde cualquier fecha sería la del checkout.
 */
export const fileLastModified = createFileLastModified();
