/** La preferencia de movimiento (`matchMedia('(prefers-reduced-motion: reduce)')`). */
export type MotionPreference = Pick<MediaQueryList, 'matches'>;

export interface TransitionOptions {
  htmlDocument: Document;
  /** `matches` es verdadero si quien visita pidió reducir el movimiento; se lee en cada llamada. */
  motion: MotionPreference;
  /** Nombre de la transición: queda en `<html data-transition>` para que el CSS elija su efecto. */
  kind?: string;
  /** Variables CSS que el efecto necesita (p. ej. el origen del círculo); se quitan al acabar. */
  vars?: Record<string, string>;
}

type StartViewTransition = (update: () => void | Promise<void>) => { finished: Promise<unknown> };

/* Cada llamada toma un número: si llega otra antes de que acabe la primera, el navegador salta la
   vieja y su limpieza no debe borrar las marcas de la nueva. */
let latest = 0;

/** Ejecuta `update` en una View Transition si hay API y no se pidió reducir movimiento (si no, al instante); `kind`/`vars` marcan `<html>` y la promesa nunca rechaza. */
export async function withTransition(
  update: () => void | Promise<void>,
  { htmlDocument, motion, kind, vars = {} }: TransitionOptions,
): Promise<void> {
  const start = (htmlDocument as Document & { startViewTransition?: StartViewTransition })
    .startViewTransition;
  if (typeof start !== 'function' || motion.matches) {
    void update();
    return;
  }

  const root = htmlDocument.documentElement;
  const id = ++latest;
  if (kind) root.dataset.transition = kind;
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);

  try {
    await start.call(htmlDocument, update).finished;
  } catch {
    /* Saltada o interrumpida: el cambio de estado ya ocurrió, solo falta limpiar. */
  } finally {
    if (id === latest) {
      delete root.dataset.transition;
      for (const name of Object.keys(vars)) root.style.removeProperty(name);
    }
  }
}
