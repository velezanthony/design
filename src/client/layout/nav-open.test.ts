import { describe, expect, it } from 'vitest';
import { navOpenScript } from './nav-open';
import { RAIL_QUERY } from './rail';

/** Ejecuta el script en línea con un `matchMedia` falso que se puede cambiar de ancho. */
function run(initiallyWide: boolean) {
  const nav = { open: !initiallyWide };
  const listeners: (() => void)[] = [];
  const query = {
    matches: initiallyWide,
    addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
  };
  const asked: string[] = [];
  const matchMedia = (media: string) => {
    asked.push(media);
    return query;
  };
  const document = { currentScript: { previousElementSibling: nav } };
  new Function('document', 'matchMedia', navOpenScript())(document, matchMedia);
  const resize = (wide: boolean) => {
    query.matches = wide;
    for (const listener of listeners) listener();
  };
  return { nav, asked, resize };
}

describe('navOpenScript', () => {
  it('por debajo del raíl cierra el menú antes de pintar', () => {
    expect(run(false).nav.open).toBe(false);
  });

  it('desde el raíl lo deja abierto', () => {
    expect(run(true).nav.open).toBe(true);
  });

  it('lo abre y lo cierra al cruzar el ancho del raíl', () => {
    const { nav, resize } = run(false);
    resize(true);
    expect(nav.open).toBe(true);
    resize(false);
    expect(nav.open).toBe(false);
  });

  it('pregunta por la consulta del raíl', () => {
    expect(run(true).asked).toEqual([RAIL_QUERY]);
  });
});
