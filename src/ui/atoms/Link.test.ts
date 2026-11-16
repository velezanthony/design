import { describe, expect, it } from 'vitest';

import { render } from '../../testing/render';
import Link from './Link.astro';

const link = async (props: Record<string, unknown>) =>
  (await render(Link, { href: '/x/', ...props })).querySelector('a')!;

describe('Link', () => {
  /* WCAG 2.5.8: objetivo de al menos 24px. Una etiqueta de 12px sola mide 14px. */
  it.each(['quiet', 'action', 'value'])(
    'da a un enlace %s un objetivo de 24px',
    async (variant) => {
      expect((await link({ variant })).classList.contains('min-h-6')).toBe(true);
    },
  );

  it('deja el enlace en línea con la altura de su línea', async () => {
    expect((await link({ variant: 'inline' })).classList.contains('min-h-6')).toBe(false);
  });

  it('trata http(s) como externo: rel, target e icono', async () => {
    const a = await link({ href: 'https://example.com' });
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.querySelector('svg')).not.toBeNull();
  });

  it('no marca como externo un enlace interno', async () => {
    const a = await link({});
    expect(a.hasAttribute('rel')).toBe(false);
    expect(a.hasAttribute('target')).toBe(false);
    expect(a.querySelector('svg')).toBeNull();
  });

  it('permite forzar el tratamiento externo y propaga aria-label y class', async () => {
    const a = await link({
      href: 'mailto:a@b.c',
      external: true,
      'aria-label': 'Correo',
      class: 'x',
    });
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('aria-label')).toBe('Correo');
    expect(a.classList.contains('x')).toBe(true);
  });

  it('la variante action lleva flecha y no el icono externo', async () => {
    const a = await link({ href: 'https://example.com', variant: 'action' });
    expect(a.querySelectorAll('svg')).toHaveLength(1);
  });
});
