import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import { initAutoNavigate } from './auto-navigate';

function page(html: string) {
  const { document, window } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  const location = { assign: vi.fn() };
  initAutoNavigate(document, location);
  return { document, location, window };
}

/** Elige la opción con ese valor (linkedom solo lee `value`, así que se marca la opción). */
function choose(select: HTMLSelectElement, value: string) {
  const { Event } = select.ownerDocument.defaultView as unknown as typeof globalThis;
  for (const option of select.querySelectorAll('option')) {
    option.toggleAttribute('selected', option.getAttribute('value') === value);
  }
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('initAutoNavigate', () => {
  it('al cambiar un select con data-auto-navigate va a la URL de la opción elegida', () => {
    const { document, location } = page(
      `<select data-auto-navigate><option value="/a/">12</option><option value="/a/per-page/24/">24</option></select>`,
    );
    choose(document.querySelector('select')!, '/a/per-page/24/');
    expect(location.assign).toHaveBeenCalledWith('/a/per-page/24/');
  });

  it('un select sin el atributo no navega', () => {
    const { document, location } = page(
      `<select><option value="/a/">12</option><option value="/b/">24</option></select>`,
    );
    choose(document.querySelector('select')!, '/b/');
    expect(location.assign).not.toHaveBeenCalled();
  });

  it('un select añadido después también navega (delegación en el documento)', () => {
    const { document, location } = page('');
    document.body.innerHTML = `<select data-auto-navigate><option value="/x/">1</option><option value="/y/">2</option></select>`;
    choose(document.querySelector('select')!, '/y/');
    expect(location.assign).toHaveBeenCalledWith('/y/');
  });
});
