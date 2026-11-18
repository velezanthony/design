import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import InspectorHeader from './InspectorHeader.astro';

const header = {
  title: 'Guide | Site',
  locales: [
    { locale: 'en', tone: 'warning', current: true, href: undefined },
    { locale: 'es', tone: 'ok', current: false, href: '/i/?slug=guide&locale=es' },
  ],
  counts: [
    { severity: 'warning', count: 1 },
    { severity: 'info', count: 2 },
  ],
  noindex: false,
  presentIn: ['en', 'es'],
  total: 2,
};
const links = { pages: '/p/', live: '/repo/guide/', edit: 'https://gh/edit/main/guide.md' };

describe('InspectorHeader', () => {
  it('el conmutador enlaza a los otros idiomas y marca el actual', async () => {
    const doc = await render(InspectorHeader, { header, links });
    const nav = doc.querySelector('[data-locale-switch]')!;
    expect(nav.querySelectorAll('a')).toHaveLength(1);
    expect(nav.querySelector('a')!.getAttribute('href')).toBe('/i/?slug=guide&locale=es');
    expect(nav.querySelector('[aria-current="true"] [data-locale="en"]')).not.toBeNull();
  });

  it('con un solo idioma no hay conmutador', async () => {
    const doc = await render(InspectorHeader, {
      header: { ...header, locales: [header.locales[0]], total: 1, presentIn: ['en'] },
      links,
    });
    expect(doc.querySelector('[data-locale-switch]')).toBeNull();
    expect(doc.querySelector('[data-tag="coverage"]')).toBeNull();
  });

  it('los recuentos van en palabras, con singular y plural', async () => {
    const doc = await render(InspectorHeader, { header, links });
    expect(
      [...doc.querySelectorAll('[data-counts] [data-severity]')].map((tag) => text(tag)),
    ).toEqual(['1 aviso', '2 info']);
  });

  it('las etiquetas dicen si es indexable y en cuántos idiomas existe, o en cuáles solo', async () => {
    const all = await render(InspectorHeader, { header, links });
    expect(text(all.querySelector('[data-tag="indexing"]'))).toBe('Indexable');
    expect(text(all.querySelector('[data-tag="coverage"]'))).toBe('En los 2 idiomas');
    const some = await render(InspectorHeader, {
      header: { ...header, noindex: true, presentIn: ['en'] },
      links,
    });
    expect(text(some.querySelector('[data-tag="indexing"]'))).toBe('noindex');
    expect(text(some.querySelector('[data-tag="coverage"]'))).toBe('Solo EN');
  });

  it('el enlace de edición solo sale si se puede derivar', async () => {
    const withEdit = await render(InspectorHeader, { header, links });
    expect(withEdit.querySelector<HTMLAnchorElement>('[data-edit]')!.getAttribute('href')).toBe(
      links.edit,
    );
    const without = await render(InspectorHeader, { header, links: { ...links, edit: undefined } });
    expect(without.querySelector('[data-edit]')).toBeNull();
  });

  it('la ranura «actions» va junto a los enlaces de la página real y del fichero', async () => {
    const doc = await render(
      InspectorHeader,
      { header, links },
      { actions: '<button data-x>IA</button>' },
    );
    const action = doc.querySelector('[data-x]')!;
    expect(
      action.closest('[data-inspector-actions]')!.querySelector('a[data-edit]'),
    ).not.toBeNull();
  });
});
