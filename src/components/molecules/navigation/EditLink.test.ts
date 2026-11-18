import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import EditLink from './EditLink.astro';

const BASE = 'https://github.com/o/r/edit/main';
async function link(props: Record<string, unknown>) {
  return (await render(EditLink, { strings: stringsFor('es'), ...props })).querySelector('a');
}

describe('EditLink', () => {
  it('apunta al enlace que le dan y lo dice con el texto de strings', async () => {
    const anchor = (await link({ href: `${BASE}/docs/install.es.md` }))!;
    expect(anchor.getAttribute('href')).toBe(`${BASE}/docs/install.es.md`);
    expect(text(anchor)).toBe('Editar esta página');
  });

  it('sin enlace no se renderiza', async () => {
    expect(await link({ href: undefined })).toBeNull();
  });

  it('el texto sale de strings', async () => {
    const anchor = (await link({ href: BASE, strings: stringsFor('en') }))!;
    expect(text(anchor)).toBe('Edit this page');
    const custom = (await link({
      href: BASE,
      strings: stringsFor('en', { 'edit.page': 'Improve' }),
    }))!;
    expect(text(custom)).toBe('Improve');
  });
});
