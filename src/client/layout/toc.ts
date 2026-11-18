/**
 * La sección que se lee: la última cuyo encabezado ya pasó la línea de lectura, algo por debajo
 * del borde superior del viewport. Antes del primer encabezado es la primera, así que el índice
 * siempre marca una. Al final de la página es la última: una sección final corta acaba la
 * página antes de que su encabezado llegue a la línea y, si no, nunca se marcaría.
 */
export function currentHeading(
  sections: { id: string; top: number }[],
  readingLine: number,
  { atBottom = false }: { atBottom?: boolean } = {},
): string | undefined {
  if (atBottom) return sections.at(-1)?.id;
  let current = sections[0]?.id;
  for (const section of sections) {
    if (section.top <= readingLine) current = section.id;
  }
  return current;
}

/** Lo que `trackSections` necesita de la ventana; por defecto, la global. */
export interface ScrollHost {
  scrollY: number;
  innerHeight: number;
  addEventListener(type: 'scroll', listener: () => void, options?: AddEventListenerOptions): void;
  requestAnimationFrame(callback: () => void): unknown;
}

export interface TrackOptions {
  readingLine?: number;
  htmlDocument?: Document;
  host?: ScrollHost;
}

/**
 * Mantiene el `aria-current` del índice en la sección que se lee. El índice enlaza a los h2 y h3
 * de la página; los enlaces sin encabezado se ignoran. Una lectura de las posiciones por
 * fotograma, solo al hacer scroll.
 */
export function trackSections(
  nav: Element,
  {
    readingLine = 120,
    htmlDocument = document,
    host = globalThis as unknown as ScrollHost,
  }: TrackOptions = {},
): void {
  function idOf(link: HTMLAnchorElement) {
    return decodeURIComponent((link.getAttribute('href') ?? '').slice(1));
  }
  const links = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const targets = links
    .map((link) => htmlDocument.getElementById(idOf(link)))
    .filter((element): element is HTMLElement => element !== null);
  if (!targets.length) return;

  let queued = false;
  function update() {
    queued = false;
    const id = currentHeading(
      targets.map((element) => ({ id: element.id, top: element.getBoundingClientRect().top })),
      readingLine,
      /* Un píxel de holgura: el zoom y las posiciones fraccionarias rara vez caen justo al final. */
      {
        atBottom: host.scrollY + host.innerHeight >= htmlDocument.documentElement.scrollHeight - 1,
      },
    );
    for (const link of links) {
      if (idOf(link) === id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  host.addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        host.requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}
