import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { initAutoSubmit } from './auto-submit';

function page(body: string) {
  const { document } = parseHTML(`<!doctype html><html><body>${body}</body></html>`);
  return document;
}

describe('initAutoSubmit', () => {
  it('un campo con data-auto-submit envía su formulario al cambiar', () => {
    const doc = page(
      '<form><select name="per" data-auto-submit><option>10</option><option>25</option></select></form>',
    );
    const form = doc.querySelector('form')!;
    const requestSubmit = vi.fn();
    Object.assign(form, { requestSubmit });
    initAutoSubmit(doc);
    doc
      .querySelector('select')!
      .dispatchEvent(new doc.defaultView!.Event('change', { bubbles: true }));
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it('un campo sin la marca no envía nada', () => {
    const doc = page('<form><select name="per"><option>10</option></select></form>');
    const requestSubmit = vi.fn();
    Object.assign(doc.querySelector('form')!, { requestSubmit });
    initAutoSubmit(doc);
    doc
      .querySelector('select')!
      .dispatchEvent(new doc.defaultView!.Event('change', { bubbles: true }));
    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it('sin requestSubmit en el navegador recurre a submit', () => {
    const doc = page('<form><select data-auto-submit><option>10</option></select></form>');
    const form = doc.querySelector('form')!;
    const submit = vi.fn();
    Object.assign(form, { requestSubmit: undefined, submit });
    initAutoSubmit(doc);
    doc
      .querySelector('select')!
      .dispatchEvent(new doc.defaultView!.Event('change', { bubbles: true }));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('un campo marcado fuera de un formulario no rompe nada', () => {
    const doc = page('<select data-auto-submit><option>10</option></select>');
    initAutoSubmit(doc);
    expect(() =>
      doc
        .querySelector('select')!
        .dispatchEvent(new doc.defaultView!.Event('change', { bubbles: true })),
    ).not.toThrow();
  });
});
