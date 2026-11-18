import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import IssueBadge from './IssueBadge.astro';

const issue = (extra: Record<string, unknown> = {}) => ({
  kind: 'title-too-long',
  severity: 'warning',
  slug: 'guide',
  locale: 'en',
  message: 'm',
  ...extra,
});

describe('IssueBadge', () => {
  it('dice el problema y lo medido contra su límite («72 / 60»)', async () => {
    const doc = await render(IssueBadge, { issue: issue({ value: 72, limit: 60 }) });
    expect(text(doc)).toContain('Título demasiado largo');
    expect(text(doc)).toContain('72 / 60');
  });

  it('sin medida no pinta la razón', async () => {
    const doc = await render(IssueBadge, { issue: issue({ kind: 'duplicate-title' }) });
    expect(text(doc)).not.toContain('/');
  });

  it('la gravedad viaja en un atributo y en texto, no solo en el color', async () => {
    const doc = await render(IssueBadge, { issue: issue({ severity: 'error' }) });
    expect(doc.querySelector('[data-severity="error"]')).not.toBeNull();
    expect(text(doc)).toContain('Error');
  });

  it('el mensaje del análisis queda como ayuda al pasar el ratón', async () => {
    const doc = await render(IssueBadge, { issue: issue({ message: 'Salto de H2 a H4' }) });
    expect(doc.querySelector('[title="Salto de H2 a H4"]')).not.toBeNull();
  });

  it('con arreglo, la ayuda al pasar el ratón añade cómo arreglarlo', async () => {
    const doc = await render(IssueBadge, {
      issue: issue({ message: 'Título largo.', fix: 'Acorta `seo.title` en a.md.' }),
    });
    const title = doc.querySelector('[data-severity]')!.getAttribute('title');
    expect(title).toContain('Título largo.');
    // Un title no admite HTML: las comillas de código se quitan en lugar de enseñarse.
    expect(title).toContain('Cómo arreglarlo: Acorta seo.title en a.md.');
    expect(title).not.toContain('`');
  });
});
