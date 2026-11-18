import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { initAutoSubmit } from './auto-submit';

function page(body: string) {
  const { document } = parseHTML(`<!doctype html><html><body>${body}</body></html>`);
  return document;
}

describe('initAutoSubmit', () => {
  it('un campo con data-auto-submit envía su formulario al cambiar', () => {
    const htmlDocument = page(
      '<form><select name="per" data-auto-submit><option>10</option><option>25</option></select></form>',
    );
    const form = htmlDocument.querySelector('form')!;
    const requestSubmit = vi.fn();
    Object.assign(form, { requestSubmit });
    initAutoSubmit(htmlDocument);
    htmlDocument
      .querySelector('select')!
      .dispatchEvent(new htmlDocument.defaultView!.Event('change', { bubbles: true }));
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it('un campo sin la marca no envía nada', () => {
    const htmlDocument = page('<form><select name="per"><option>10</option></select></form>');
    const requestSubmit = vi.fn();
    Object.assign(htmlDocument.querySelector('form')!, { requestSubmit });
    initAutoSubmit(htmlDocument);
    htmlDocument
      .querySelector('select')!
      .dispatchEvent(new htmlDocument.defaultView!.Event('change', { bubbles: true }));
    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it('sin requestSubmit en el navegador recurre a submit', () => {
    const htmlDocument = page('<form><select data-auto-submit><option>10</option></select></form>');
    const form = htmlDocument.querySelector('form')!;
    const submit = vi.fn();
    Object.assign(form, { requestSubmit: undefined, submit });
    initAutoSubmit(htmlDocument);
    htmlDocument
      .querySelector('select')!
      .dispatchEvent(new htmlDocument.defaultView!.Event('change', { bubbles: true }));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('un campo marcado fuera de un formulario no rompe nada', () => {
    const htmlDocument = page('<select data-auto-submit><option>10</option></select>');
    initAutoSubmit(htmlDocument);
    expect(() =>
      htmlDocument
        .querySelector('select')!
        .dispatchEvent(new htmlDocument.defaultView!.Event('change', { bubbles: true })),
    ).not.toThrow();
  });
});
