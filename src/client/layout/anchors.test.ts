import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';

import { initHeadingAnchors } from './anchors';

const page = (html: string) =>
  parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;

describe('initHeadingAnchors', () => {
  it('añade un ancla permanente a cada h2-h4 con id, con texto accesible', () => {
    const doc = page('<main><h2 id="a">Uno</h2><h3 id="b">Dos</h3><h4 id="c">Tres</h4></main>');
    initHeadingAnchors(doc, 'Enlace a «{title}»');
    const anchors = [...doc.querySelectorAll('a.heading-anchor')];
    expect(anchors.map((a) => a.getAttribute('href'))).toEqual(['#a', '#b', '#c']);
    expect(anchors[0]!.getAttribute('aria-label')).toBe('Enlace a «Uno»');
  });

  it('las anclas quedan fuera del índice de búsqueda', () => {
    const doc = page('<main><h2 id="a">Uno</h2></main>');
    initHeadingAnchors(doc, '{title}');
    expect(doc.querySelector('a.heading-anchor')!.hasAttribute('data-pagefind-ignore')).toBe(true);
  });

  it('ignora encabezados sin id y los h1', () => {
    const doc = page('<main><h1 id="t">T</h1><h2>sin id</h2></main>');
    initHeadingAnchors(doc, '{title}');
    expect(doc.querySelectorAll('a.heading-anchor')).toHaveLength(0);
  });

  it('solo toca el contenido de <main>', () => {
    const doc = page('<h2 id="x">Fuera</h2><main><h2 id="a">Dentro</h2></main>');
    initHeadingAnchors(doc, '{title}');
    expect(doc.querySelectorAll('a.heading-anchor')).toHaveLength(1);
  });

  it('es idempotente', () => {
    const doc = page('<main><h2 id="a">Uno</h2></main>');
    initHeadingAnchors(doc, '{title}');
    initHeadingAnchors(doc, '{title}');
    expect(doc.querySelectorAll('a.heading-anchor')).toHaveLength(1);
  });
});
