import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { initPopovers } from './popover';

function setup() {
  const { document, window } = parseHTML(`<!doctype html><html><body>
    <details data-popover open><summary>Tipo</summary><label><input type="checkbox"> a</label></details>
    <details data-popover><summary>Otro</summary></details>
    <details open><summary>Sin data-popover</summary></details>
    <p>fuera</p>
  </body></html>`);
  initPopovers(document);
  const [open, closed, plain] = [...document.querySelectorAll('details')] as HTMLDetailsElement[];
  const press = (target: Element) =>
    target.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
  const key = (name: string) => {
    const event = new window.Event('keydown', { bubbles: true }) as KeyboardEvent;
    Object.defineProperty(event, 'key', { value: name });
    document.dispatchEvent(event);
  };
  return { document, open: open!, closed: closed!, plain: plain!, press, key };
}

describe('initPopovers', () => {
  it('pulsar fuera cierra el desplegable abierto', () => {
    const { document, open, press } = setup();
    press(document.querySelector('p')!);
    expect(open.hasAttribute('open')).toBe(false);
  });

  it('pulsar dentro (marcar una casilla) lo deja abierto', () => {
    const { open, press } = setup();
    press(open.querySelector('input')!);
    expect(open.hasAttribute('open')).toBe(true);
  });

  it('solo toca los marcados con data-popover', () => {
    const { document, plain, press } = setup();
    press(document.querySelector('p')!);
    expect(plain.hasAttribute('open')).toBe(true);
  });

  it('Escape lo cierra y devuelve el foco a su título', () => {
    const { open, key } = setup();
    // linkedom no lleva el foco: se comprueba que se le pide al título.
    const summary = open.querySelector('summary')!;
    summary.focus = vi.fn();
    key('Escape');
    expect(open.hasAttribute('open')).toBe(false);
    expect(summary.focus).toHaveBeenCalled();
  });

  it('otra tecla no lo cierra', () => {
    const { open, key } = setup();
    key('Enter');
    expect(open.hasAttribute('open')).toBe(true);
  });
});
