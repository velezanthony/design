import { describe, expect, it } from 'vitest';
import { render } from '../../../testing/render';
import CodeSpans from './CodeSpans.astro';

describe('CodeSpans', () => {
  it('lo que va entre comillas inversas sale como código y el resto como texto', async () => {
    const htmlDocument = await render(CodeSpans, { text: 'Cambia `seo.title` en el archivo' });
    expect(htmlDocument.body.innerHTML).toContain('<code');
    expect(htmlDocument.querySelector('code')!.textContent).toBe('seo.title');
    expect(htmlDocument.body.textContent).toBe('Cambia seo.title en el archivo');
  });
});
