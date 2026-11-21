import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import PageLink from './PageLink.astro';

async function link(props: Record<string, unknown> = {}) {
  const document = await render(PageLink, {
    href: '/repo/guia/',
    title: 'Guía',
    strings: stringsFor('es'),
    ...props,
  });
  return document.querySelector('a')!;
}

describe('PageLink', () => {
  it('sin insignia: solo el enlace con su título', async () => {
    const anchor = await link();
    expect(anchor.getAttribute('href')).toBe('/repo/guia/');
    expect(text(anchor)).toBe('Guía');
    expect(anchor.hasAttribute('hreflang')).toBe(false);
    expect(anchor.querySelector('[role="img"]')).toBeNull();
  });

  it('con insignia: el átomo Tag con role="img", su nombre traducido y hreflang/lang en el enlace', async () => {
    const anchor = await link({ badge: 'en' });
    expect(anchor.getAttribute('hreflang')).toBe('en');
    expect(anchor.getAttribute('lang')).toBe('en');
    const badge = anchor.querySelector('[role="img"]')!;
    expect(badge.getAttribute('aria-label')).toBe('Disponible en English');
    expect(text(badge)).toBe('en');
    // Las clases del átomo Tag con tono `faint` y enmarcado.
    for (const name of ['label', 'text-faint', 'border', 'border-current']) {
      expect(badge.classList.contains(name)).toBe(true);
    }
  });

  it('añade la clase que recibe al enlace', async () => {
    expect((await link({ class: 'font-medium' })).classList.contains('font-medium')).toBe(true);
  });
});
