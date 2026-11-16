import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import Admonition from './Admonition.astro';

const admonition = (props: Record<string, unknown>, body = '<p>Cuerpo</p>') =>
  render(Admonition, { strings: stringsFor('es'), ...props }, { default: body });

describe('Admonition', () => {
  it('es un aside note con data-kind y nombre accesible (salida común)', async () => {
    const aside = (await admonition({ kind: 'warning', title: 'Cuidado' })).querySelector('aside')!;
    expect(aside.classList.contains('admonition')).toBe(true);
    expect(aside.getAttribute('data-kind')).toBe('warning');
    expect(aside.getAttribute('role')).toBe('note');
    expect(aside.getAttribute('aria-label')).toBe('Cuidado');
    expect(text(aside.querySelector('.admonition-title'))).toBe('Cuidado');
    expect(text(aside)).toContain('Cuerpo');
  });

  it('sin título usa el nombre del tipo localizado', async () => {
    const aside = (await admonition({ kind: 'note' })).querySelector('aside')!;
    expect(aside.getAttribute('aria-label')).toBe('Nota');
    const en = (await admonition({ kind: 'tip', strings: stringsFor('en') })).querySelector(
      'aside',
    )!;
    expect(en.getAttribute('aria-label')).toBe('Tip');
  });

  it('el título por defecto respeta un override de strings', async () => {
    const doc = await admonition({
      kind: 'note',
      strings: stringsFor('es', { 'admonition.note': 'Ojo' }),
    });
    expect(text(doc.querySelector('.admonition-title'))).toBe('Ojo');
  });

  it.each(['note', 'info', 'tip', 'warning', 'danger', 'question'])(
    'admite el tipo %s',
    async (kind) => {
      expect((await admonition({ kind })).querySelector('aside')!.getAttribute('data-kind')).toBe(
        kind,
      );
    },
  );

  it('con collapsed es un details cerrado cuyo summary es el título', async () => {
    const doc = await admonition({ kind: 'tip', title: 'Más detalles', collapsed: true });
    const details = doc.querySelector('details')!;
    expect(doc.querySelector('aside')).toBeNull();
    expect(details.classList.contains('admonition')).toBe(true);
    expect(details.getAttribute('data-kind')).toBe('tip');
    expect(details.hasAttribute('open')).toBe(false);
    const summary = details.querySelector(':scope > summary')!;
    expect(summary.classList.contains('admonition-title')).toBe(true);
    expect(text(summary)).toBe('Más detalles');
    expect(text(details)).toContain('Cuerpo');
  });

  it('el desplegable sin título usa el del tipo', async () => {
    const doc = await admonition({ kind: 'warning', collapsed: true });
    expect(text(doc.querySelector('summary'))).toBe('Advertencia');
  });

  it('un cuerpo con bloques anidados se conserva', async () => {
    const doc = await admonition({ kind: 'note' }, '<ul><li>a</li></ul><pre><code>x</code></pre>');
    expect(doc.querySelector('aside ul li')).not.toBeNull();
    expect(doc.querySelector('aside pre code')).not.toBeNull();
  });
});
