import { describe, expect, it, vi } from 'vitest';

import { readToken } from './token';

/** Un documento mínimo: la propiedad del `<html>` vale `value` y el `color` de la sonda lo resuelve `paint`. */
function fakeDocument(value: string, paint: (written: string) => string) {
  const probe = { style: { color: '' }, remove: vi.fn() };
  const root = { append: vi.fn() };
  const htmlDocument = {
    documentElement: root,
    createElement: () => probe,
    defaultView: {
      getComputedStyle: (element: unknown) =>
        element === probe ? { color: paint(probe.style.color) } : { getPropertyValue: () => value },
    },
  };
  return { htmlDocument: htmlDocument as unknown as Document, probe, root };
}

describe('readToken', () => {
  it('devuelve tal cual lo que no es un color de dos tonos (fuentes, medidas)', () => {
    const { htmlDocument, root } = fakeDocument('IBM Plex Sans, sans-serif', () => 'nunca');
    expect(readToken(htmlDocument, '--font-sans')).toBe('IBM Plex Sans, sans-serif');
    expect(root.append).not.toHaveBeenCalled();
  });

  it('resuelve `light-dark()` al color del tema activo: Mermaid no entiende la función', () => {
    const { htmlDocument, probe } = fakeDocument(' light-dark(#fff, #000)', (written) =>
      written === 'light-dark(#fff, #000)' ? 'rgb(0, 0, 0)' : '',
    );
    expect(readToken(htmlDocument, '--color-canvas')).toBe('rgb(0, 0, 0)');
    expect(probe.remove).toHaveBeenCalled();
  });
});
