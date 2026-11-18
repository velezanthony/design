import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';

import { currentHeading, trackSections } from './toc';

/* Posiciones de las secciones mientras se lee, relativas al viewport. */
function at(...tops: number[]) {
  return tops.map((top, index) => ({ id: `s${index + 1}`, top }));
}

describe('currentHeading', () => {
  it('es la última sección cuyo encabezado ya pasó la línea de lectura', () => {
    expect(currentHeading(at(-900, -200, 60, 700), 120)).toBe('s3');
  });

  it('es la primera antes de llegar a ella, para que la lista nunca quede en blanco', () => {
    expect(currentHeading(at(400, 1200), 120)).toBe('s1');
  });

  it('es la última cuando todo quedó atrás', () => {
    expect(currentHeading(at(-2000, -1200, -300), 120)).toBe('s3');
  });

  it('es undefined sin secciones', () => {
    expect(currentHeading([], 120)).toBeUndefined();
  });

  /* Una última sección corta acaba la página antes de que su encabezado llegue a la línea: al
     final de la página, la última es la que se lee. */
  it('es la última cuando la página ya no puede bajar más', () => {
    expect(currentHeading(at(-900, -320, 357), 120, { atBottom: true })).toBe('s3');
  });

  it('sigue la línea de lectura mientras quede página', () => {
    expect(currentHeading(at(-900, -320, 357), 120, { atBottom: false })).toBe('s2');
  });
});

/* El índice se alimenta de h2 y h3; el seguimiento marca la sección en curso con aria-current. */
describe('trackSections', () => {
  const html = `<!doctype html><html><body>
    <nav>
      <a href="#uno">Uno</a>
      <a href="#sub-uno">Sub uno</a>
      <a href="#dos">Dos</a>
      <a href="#sin-encabezado">Fantasma</a>
      <a href="#caf%C3%A9">Café</a>
    </nav>
    <h2 id="uno">Uno</h2><h3 id="sub-uno">Sub uno</h3><h2 id="dos">Dos</h2><h2 id="café">Café</h2>
  </body></html>`;

  function setup(tops: Record<string, number>, atBottom = false) {
    const { document } = parseHTML(html);
    for (const [id, top] of Object.entries(tops)) {
      document.getElementById(id)!.getBoundingClientRect = () => ({ top }) as DOMRect;
    }
    const scrolls: (() => void)[] = [];
    const frames: (() => void)[] = [];
    const host = {
      scrollY: atBottom ? 1000 : 0,
      innerHeight: 500,
      addEventListener: (_type: 'scroll', cb: () => void) => void scrolls.push(cb),
      requestAnimationFrame: (cb: () => void) => void frames.push(cb),
    };
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1500 });
    trackSections(document.querySelector('nav')!, { doc: document, host });
    function current() {
      return [...document.querySelectorAll('nav a')]
        .filter((anchor) => anchor.getAttribute('aria-current') === 'location')
        .map((anchor) => anchor.getAttribute('href'));
    }
    function scroll() {
      for (const cb of scrolls) cb();
      for (const cb of frames.splice(0)) cb();
    }
    return { current, scroll, scrolls, frames, document };
  }

  it('marca al arrancar la sección en curso, h2 o h3', () => {
    expect(setup({ uno: -500, 'sub-uno': 60, dos: 700, café: 900 }).current()).toEqual([
      '#sub-uno',
    ]);
  });

  it('marca la primera antes de llegar al primer encabezado', () => {
    expect(setup({ uno: 400, 'sub-uno': 800, dos: 1200, café: 1600 }).current()).toEqual(['#uno']);
  });

  it('ignora enlaces sin encabezado y descodifica los ids', () => {
    expect(setup({ uno: -900, 'sub-uno': -800, dos: -700, café: -10 }).current()).toEqual([
      '#caf%C3%A9',
    ]);
  });

  it('al final de la página marca la última aunque no llegue a la línea', () => {
    expect(setup({ uno: -900, 'sub-uno': -800, dos: -700, café: 300 }, true).current()).toEqual([
      '#caf%C3%A9',
    ]);
  });

  it('se actualiza como mucho una vez por fotograma al hacer scroll', () => {
    const tops = { uno: -500, 'sub-uno': 60, dos: 700, café: 900 };
    const { scroll, scrolls, frames, current, document } = setup(tops);
    document.getElementById('sub-uno')!.getBoundingClientRect = () => ({ top: -400 }) as DOMRect;
    document.getElementById('dos')!.getBoundingClientRect = () => ({ top: 50 }) as DOMRect;
    scrolls[0]!();
    scrolls[0]!();
    expect(frames).toHaveLength(1);
    scroll();
    expect(current()).toEqual(['#dos']);
  });

  it('no engancha nada si ningún enlace tiene encabezado', () => {
    const { document } = parseHTML('<nav><a href="#x">x</a></nav>');
    let added = 0;
    trackSections(document.querySelector('nav')!, {
      doc: document,
      host: {
        scrollY: 0,
        innerHeight: 1,
        addEventListener: () => void added++,
        requestAnimationFrame: () => undefined,
      },
    });
    expect(added).toBe(0);
  });
});
