import { describe, expect, it } from 'vitest';
import { render } from '../../../testing/render';
import CodeSpans from './CodeSpans.astro';

describe('CodeSpans', () => {
  it('lo que va entre comillas inversas sale como código y el resto como texto', async () => {
    const doc = await render(CodeSpans, { text: 'Cambia `seo.title` en el archivo' });
    expect(doc.body.innerHTML).toContain('<code');
    expect(doc.querySelector('code')!.textContent).toBe('seo.title');
    expect(doc.body.textContent).toBe('Cambia seo.title en el archivo');
  });
});
