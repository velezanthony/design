import { describe, expect, it } from 'vitest';

import { markScreenshots } from './screenshots';

const img = '<img src="/_astro/a.webp" alt="Captura" width="1600" height="900">';

describe('markScreenshots', () => {
  it('marca el párrafo cuyo único contenido es una imagen (con width y height, como las de astro:assets)', () => {
    expect(markScreenshots(`<p>${img}</p>`)).toBe(`<p class="docs-screenshot">${img}</p>`);
  });

  it('admite espacios y saltos de línea alrededor de la imagen', () => {
    expect(markScreenshots(`<p>\n  ${img}\n</p>`)).toBe(
      `<p class="docs-screenshot">\n  ${img}\n</p>`,
    );
  });

  it('añade la clase a las que ya lleve el párrafo', () => {
    expect(markScreenshots(`<p class="lead" id="x">${img}</p>`)).toBe(
      `<p class="lead docs-screenshot" id="x">${img}</p>`,
    );
  });

  it('es idempotente: un párrafo ya marcado no se marca dos veces', () => {
    const once = markScreenshots(`<p>${img}</p>`);
    expect(markScreenshots(once)).toBe(once);
  });

  it('un párrafo con texto e imagen no es una captura', () => {
    const html = `<p>Pulsa ${img} para abrirlo.</p>`;
    expect(markScreenshots(html)).toBe(html);
  });

  it('dos imágenes (insignias seguidas) no son una captura', () => {
    const html = `<p>${img}\n${img}</p>`;
    expect(markScreenshots(html)).toBe(html);
  });

  it('una imagen enlazada no es una captura', () => {
    const html = `<p><a href="https://x.test/">${img}</a></p>`;
    expect(markScreenshots(html)).toBe(html);
  });

  it('una imagen fuera de un párrafo (un <img width> escrito en HTML) no se toca', () => {
    const html = '<img src="/a.png" width="300" alt="">';
    expect(markScreenshots(html)).toBe(html);
  });

  it('marca cada captura del documento y deja el resto', () => {
    expect(markScreenshots(`<p>a</p><p>${img}</p><p>b ${img}</p><p>${img}</p>`)).toBe(
      `<p>a</p><p class="docs-screenshot">${img}</p><p>b ${img}</p><p class="docs-screenshot">${img}</p>`,
    );
  });

  it('no confunde un elemento cuyo nombre empieza por p (<pre>, <picture>)', () => {
    const html = `<pre>${img}</pre><picture>${img}</picture>`;
    expect(markScreenshots(html)).toBe(html);
  });
});
