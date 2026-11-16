import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import TableOfContents from './TableOfContents.astro';

const headings = [
  { depth: 1, slug: 'titulo', text: 'Título' },
  { depth: 2, slug: 'el-problema', text: 'El problema' },
  { depth: 3, slug: 'detalle', text: 'Un detalle' },
  { depth: 4, slug: 'fino', text: 'Muy fino' },
  { depth: 2, slug: 'qué-es', text: 'Qué es' },
  { depth: 2, slug: 'restricciones', text: 'Restricciones' },
];
const toc = (props: Record<string, unknown>) =>
  render(TableOfContents, { headings, strings: stringsFor('es'), ...props });

describe('TableOfContents', () => {
  it('lista los encabezados h2 y h3, no h1 ni h4', async () => {
    const doc = await toc({});
    const links = [...doc.querySelectorAll('nav a')].map((a) => [text(a), a.getAttribute('href')]);
    expect(links).toEqual([
      ['El problema', '#el-problema'],
      ['Un detalle', '#detalle'],
      ['Qué es', '#qué-es'],
      ['Restricciones', '#restricciones'],
    ]);
  });

  it('marca la profundidad del h3 para sangrarlo', async () => {
    const doc = await toc({});
    expect(doc.querySelector('a[href="#detalle"]')?.getAttribute('data-depth')).toBe('3');
    expect(doc.querySelector('a[href="#el-problema"]')?.getAttribute('data-depth')).toBe('2');
  });

  it('es un landmark nav con nombre y título sacados de strings', async () => {
    const es = await toc({});
    expect(es.querySelector('nav')!.getAttribute('aria-label')).toBe('En esta página');
    const en = await toc({ strings: stringsFor('en', { 'toc.title': 'Contents' }) });
    expect(en.querySelector('nav')!.getAttribute('aria-label')).toBe('Contents');
    expect(text(en.querySelector('nav p'))).toBe('Contents');
  });

  /* Contrato con `trackSections`: el cliente engancha `nav.toc` y sus `a[href^="#"]`. */
  it('lleva la clase toc y solo enlaces de ancla', async () => {
    const doc = await toc({});
    expect(doc.querySelector('nav')!.classList.contains('toc')).toBe(true);
    for (const a of doc.querySelectorAll('nav a')) expect(a.getAttribute('href')).toMatch(/^#/);
  });

  it('se pega junto al contenido solo donde hay columna lateral', async () => {
    const nav = (await toc({})).querySelector('nav')!;
    expect([...nav.classList]).toEqual(expect.arrayContaining(['hidden', 'md:block', 'md:sticky']));
  });

  it('no pinta nada con menos de tres entradas', async () => {
    expect((await toc({ headings: headings.slice(1, 3) })).querySelector('nav')).toBeNull();
    expect((await toc({ headings: [] })).querySelector('nav')).toBeNull();
  });
});
