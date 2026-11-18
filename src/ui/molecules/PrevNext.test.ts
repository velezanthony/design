import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import PrevNext from './PrevNext.astro';

const prev = { label: 'Instalación', href: '/install/' };
const next = { label: 'Uso', href: '/usage/' };
function nav(props: Record<string, unknown>) {
  return render(PrevNext, { strings: stringsFor('es'), ...props });
}

describe('PrevNext', () => {
  it('página intermedia: anterior y siguiente con rel y texto del catálogo', async () => {
    const doc = await nav({ prev, next });
    const previousLink = doc.querySelector('a[rel="prev"]')!;
    const nextLink = doc.querySelector('a[rel="next"]')!;
    expect(previousLink.getAttribute('href')).toBe('/install/');
    expect(text(previousLink)).toContain('Anterior');
    expect(text(previousLink)).toContain('Instalación');
    expect(nextLink.getAttribute('href')).toBe('/usage/');
    expect(text(nextLink)).toContain('Siguiente');
  });

  it('primera página: solo siguiente', async () => {
    const doc = await nav({ next });
    expect(doc.querySelector('a[rel="prev"]')).toBeNull();
    expect(doc.querySelectorAll('a')).toHaveLength(1);
  });

  it('última página: solo anterior', async () => {
    const doc = await nav({ prev });
    expect(doc.querySelector('a[rel="next"]')).toBeNull();
  });

  it('sin vecinas no pinta nada', async () => {
    expect((await nav({})).querySelector('nav')).toBeNull();
  });

  it('es un landmark nav con nombre y los textos salen de strings', async () => {
    const doc = await nav({
      prev,
      next,
      strings: stringsFor('en', { 'pagination.prev': 'Back', 'pagination.label': 'Pager' }),
    });
    expect(doc.querySelector('nav')!.getAttribute('aria-label')).toBe('Pager');
    expect(text(doc.querySelector('a[rel="prev"]'))).toContain('Back');
  });
});
