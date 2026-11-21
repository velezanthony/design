import { describe, expect, it } from 'vitest';

import { render } from '../../../testing/render';
import Link from './Link.astro';
import { linkVariants } from './variants';

async function link(props: Record<string, unknown>) {
  return (await render(Link, { href: '/x/', ...props })).querySelector('a')!;
}

describe('Link', () => {
  it.each(['inline', 'quiet', 'action', 'value'] as const)(
    'la variante %s lleva las clases de `variants.ts`',
    async (variant) => {
      const classes = (await link({ variant })).classList;
      for (const name of linkVariants[variant].split(' ')) {
        expect(classes.contains(name)).toBe(true);
      }
    },
  );

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
    const anchor = await link({ href: 'https://example.com' });
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.querySelector('svg')).not.toBeNull();
  });

  it('no marca como externo un enlace interno', async () => {
    const anchor = await link({});
    expect(anchor.hasAttribute('rel')).toBe(false);
    expect(anchor.hasAttribute('target')).toBe(false);
    expect(anchor.querySelector('svg')).toBeNull();
  });

  it('permite forzar el tratamiento externo y propaga aria-label y class', async () => {
    const anchor = await link({
      href: 'mailto:a@b.c',
      external: true,
      'aria-label': 'Correo',
      class: 'x',
    });
    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.getAttribute('aria-label')).toBe('Correo');
    expect(anchor.classList.contains('x')).toBe(true);
  });

  it('la variante action lleva flecha y no el icono externo', async () => {
    const anchor = await link({ href: 'https://example.com', variant: 'action' });
    expect(anchor.querySelectorAll('svg')).toHaveLength(1);
  });

  it('propaga rel, aria-current y data-* sin perder el rel de un enlace externo', async () => {
    const anchor = await link({ rel: 'next', 'aria-current': 'page', 'data-page': '' });
    expect(anchor.getAttribute('rel')).toBe('next');
    expect(anchor.getAttribute('aria-current')).toBe('page');
    expect(anchor.hasAttribute('data-page')).toBe(true);
    const external = await link({ href: 'https://example.com', rel: 'author' });
    expect(external.getAttribute('rel')).toBe('author noopener noreferrer');
  });
});
