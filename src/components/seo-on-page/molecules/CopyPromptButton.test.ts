import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import CopyPromptButton from './CopyPromptButton.astro';

describe('CopyPromptButton', () => {
  it('lleva el prompt entero (con sus saltos de línea) en `data-copy-prompt`', async () => {
    const prompt = 'Línea 1 con `código`\nLínea 2 «con comillas» y "dobles"';
    const button = (await render(CopyPromptButton, { prompt })).querySelector('button')!;
    expect(button.getAttribute('data-copy-prompt')).toBe(prompt);
  });

  it('dice «Copiar prompt» y trae los textos de confirmación para el cliente', async () => {
    const button = (await render(CopyPromptButton, { prompt: 'x' })).querySelector('button')!;
    expect(text(button.querySelector('[data-label]'))).toBe('Copiar prompt');
    expect(button.getAttribute('data-copied')).toBe('Copiado');
    expect(button.getAttribute('data-failed')).toBe('No se pudo copiar');
  });

  it('nace oculto y con puntero', async () => {
    const button = (await render(CopyPromptButton, { prompt: 'x' })).querySelector('button')!;
    expect(button.hasAttribute('hidden')).toBe(true);
    expect(button.className).toContain('cursor-pointer');
  });
});
