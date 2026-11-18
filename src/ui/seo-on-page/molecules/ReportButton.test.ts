import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import ReportButton from './ReportButton.astro';

describe('ReportButton', () => {
  it('es un botón que dice «Copiar para la IA» y pide el alcance que se le da', async () => {
    const button = (await render(ReportButton, { scope: 'filter' })).querySelector('button')!;
    expect(text(button)).toBe('Copiar para la IA');
    expect(button.getAttribute('data-report-open')).toBe('filter');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('nace oculto: sin JavaScript no puede abrir nada', async () => {
    const button = (await render(ReportButton, { scope: 'site' })).querySelector('button')!;
    expect(button.hasAttribute('hidden')).toBe(true);
  });

  it('lleva el puntero de lo clicable', async () => {
    const button = (await render(ReportButton, { scope: 'site' })).querySelector('button')!;
    expect(button.className).toContain('cursor-pointer');
  });

  it('admite otro texto, para el enlace del recuento de «Qué tiene»', async () => {
    const button = (
      await render(ReportButton, { scope: 'filter', variant: 'quiet', label: 'copiarlas' })
    ).querySelector('button')!;
    expect(text(button)).toBe('copiarlas');
  });
});
