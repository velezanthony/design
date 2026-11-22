import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';

import type { SizeChoice } from '../../../core/listing/view';
import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import PerPageSelector from './PerPageSelector.astro';

const sizes: SizeChoice[] = [
  { size: 12, href: '/repo/tutoriales/', current: false },
  { size: 24, href: '/repo/tutoriales/per-page/24/', current: true },
  { size: 48, href: '/repo/tutoriales/per-page/48/', current: false },
];

async function selector(props: Record<string, unknown> = {}) {
  return render(PerPageSelector, { sizes, strings: stringsFor('es'), ...props });
}

/** Lo que pinta `<noscript>`: según el analizador puede llegar como texto, así que se vuelve a leer. */
function noscriptLinks(document: Document) {
  const noscript = document.querySelector('noscript')!;
  return [...parseHTML(`<div>${noscript.innerHTML}</div>`).document.querySelectorAll('a')];
}

describe('PerPageSelector', () => {
  it('pinta el átomo Select con data-auto-navigate y la etiqueta «Por página»', async () => {
    const document = await selector();
    const select = document.querySelector('select')!;
    expect(select.hasAttribute('data-auto-navigate')).toBe(true);
    expect(text(document.querySelector('label'))).toBe('Por página');
    expect(document.querySelector('[data-select]')).not.toBeNull();
  });

  it('una opción por tamaño con la URL de su página 1 como valor; la actual, seleccionada', async () => {
    const options = [...(await selector()).querySelectorAll('option')];
    expect(options.map((option) => [option.getAttribute('value'), text(option)])).toEqual([
      ['/repo/tutoriales/', '12'],
      ['/repo/tutoriales/per-page/24/', '24'],
      ['/repo/tutoriales/per-page/48/', '48'],
    ]);
    expect(options.map((option) => option.hasAttribute('selected'))).toEqual([false, true, false]);
  });

  it('sin JavaScript: el campo se oculta y <noscript> da un enlace por tamaño, el actual con aria-current', async () => {
    const document = await selector();
    expect(document.querySelector('[data-select]')!.className).toContain(
      '[@media(scripting:none)]:hidden',
    );
    const links = noscriptLinks(document);
    expect(links.map((link) => [link.getAttribute('href'), text(link)])).toEqual([
      ['/repo/tutoriales/', '12'],
      ['/repo/tutoriales/per-page/24/', '24'],
      ['/repo/tutoriales/per-page/48/', '48'],
    ]);
    expect(links.map((link) => link.getAttribute('aria-current'))).toEqual([null, 'page', null]);
  });

  it('sin tamaños no pinta nada', async () => {
    expect((await selector({ sizes: undefined })).body.innerHTML.trim()).toBe('');
    expect((await selector({ sizes: [] })).body.innerHTML.trim()).toBe('');
  });
});
