import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import EditLink from './EditLink.astro';

const BASE = 'https://github.com/o/r/edit/main';
const link = async (props: Record<string, unknown>) =>
  (await render(EditLink, { strings: stringsFor('es'), editUrl: BASE, ...props })).querySelector(
    'a',
  );

describe('EditLink', () => {
  it('archivo de idioma: apunta a install.es.md', async () => {
    const a = (await link({ file: 'docs/install.es.md' }))!;
    expect(a.getAttribute('href')).toBe(`${BASE}/docs/install.es.md`);
    expect(text(a)).toBe('Editar esta página');
  });

  it('página externa: ruta del archivo relativa a la raíz del repo', async () => {
    const a = (await link({ file: 'CHANGELOG.md' }))!;
    expect(a.getAttribute('href')).toBe(`${BASE}/CHANGELOG.md`);
  });

  /* En una ruta de reserva el contenedor pasa el archivo ORIGINAL: no existe archivo `es`. */
  it('ruta de reserva: el enlace va al archivo original', async () => {
    const a = (await link({ file: 'CHANGELOG.md', strings: stringsFor('es') }))!;
    expect(a.getAttribute('href')).toBe(`${BASE}/CHANGELOG.md`);
    expect(a.getAttribute('href')).not.toContain('.es.');
  });

  it('une base y archivo sin barras duplicadas', async () => {
    const a = (await link({ editUrl: `${BASE}/`, file: '/docs/a.md' }))!;
    expect(a.getAttribute('href')).toBe(`${BASE}/docs/a.md`);
  });

  it('sin editUrl no se renderiza', async () => {
    expect(await link({ editUrl: undefined, file: 'a.md' })).toBeNull();
  });

  it('el texto sale de strings', async () => {
    const a = (await link({ file: 'a.md', strings: stringsFor('en') }))!;
    expect(text(a)).toBe('Edit this page');
    const custom = (await link({
      file: 'a.md',
      strings: stringsFor('en', { 'edit.page': 'Improve' }),
    }))!;
    expect(text(custom)).toBe('Improve');
  });
});
