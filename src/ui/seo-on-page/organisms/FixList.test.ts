import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import FixList from './FixList.astro';

const block = (overrides = {}) => ({
  issue: {
    kind: 'duplicate-title',
    severity: 'warning',
    slug: 'guide',
    locale: 'en',
    message: 'Otra página publica el mismo título.',
    fix: 'Cambia `seo.title` en `guide.md`.',
  },
  certainty: 'rule',
  limit: undefined,
  verify: 'Este aviso desaparece aquí.',
  related: [],
  ...overrides,
});

describe('FixList', () => {
  it('un problema lleva su gravedad, su certeza, el enunciado, el arreglo con el código resaltado y cómo verificarlo', async () => {
    const doc = await render(FixList, { fixes: [block()] });
    const item = doc.querySelector('[data-fix-block="duplicate-title"]')!;
    expect(item.querySelector('[data-severity="warning"]')).not.toBeNull();
    expect(item.querySelector('[data-certainty="rule"]')).not.toBeNull();
    expect(text(item)).toContain('Otra página publica el mismo título.');
    expect(item.querySelector('[data-fix] code')!.textContent).toBe('seo.title');
    expect(text(item.querySelector('[data-verify]'))).toContain('Este aviso desaparece aquí.');
  });

  it('el límite solo sale en los problemas de longitud, con su rango y la palabra «recomendación»', async () => {
    const doc = await render(FixList, {
      fixes: [
        block({ limit: { min: 70, max: 160, maxPx: 920 }, certainty: 'heuristic' }),
        block({ issue: { ...block().issue, kind: 'no-h1' } }),
      ],
    });
    const limits = doc.querySelectorAll('[data-limit]');
    expect(limits).toHaveLength(1);
    expect(text(limits[0]!)).toContain('70–160 caracteres, ≈920 px');
    expect(text(limits[0]!)).toContain('recomendación');
  });

  it('un duplicado enlaza a la página con la que choca, con su título', async () => {
    const doc = await render(FixList, {
      fixes: [
        block({
          related: [
            { slug: 'ref/guide', href: '/i/?slug=ref/guide&locale=en', title: 'Ref | Site' },
          ],
        }),
      ],
    });
    const link = doc.querySelector<HTMLAnchorElement>('a[data-related]')!;
    expect(link.getAttribute('href')).toBe('/i/?slug=ref/guide&locale=en');
    expect(text(doc.querySelector('[data-fix-block]'))).toContain('ref/guide — «Ref | Site»');
  });

  it('sin problemas lo dice claro', async () => {
    const doc = await render(FixList, { fixes: [] });
    expect(text(doc.querySelector('[data-empty]'))).toBe('Nada que arreglar en este idioma.');
    expect(doc.querySelector('[data-fix-block]')).toBeNull();
  });
});
