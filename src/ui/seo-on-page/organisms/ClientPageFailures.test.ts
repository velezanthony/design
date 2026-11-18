import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import ClientPageFailures from './ClientPageFailures.astro';

describe('ClientPageFailures', () => {
  it('sin fallos no pinta nada', async () => {
    const htmlDocument = await render(ClientPageFailures, { failures: [] });
    expect(htmlDocument.querySelector('aside')).toBeNull();
  });

  it('avisa de cuántas no se pudieron leer y lista el fichero y el motivo de cada una', async () => {
    const htmlDocument = await render(ClientPageFailures, {
      failures: [
        { entrypoint: 'src/pages/cv.astro', message: '/cv/ responde 500.' },
        { entrypoint: 'src/pages/[slug].astro', message: 'sin datos' },
      ],
    });
    const aside = htmlDocument.querySelector('aside')!;
    expect(text(aside)).toContain('2 páginas de src/pages/ no se pudieron leer. No salen');
    const items = [...aside.querySelectorAll('li')].map(text);
    expect(items).toEqual([
      'src/pages/cv.astro — /cv/ responde 500.',
      'src/pages/[slug].astro — sin datos',
    ]);
  });

  it('concuerda en singular con una sola', async () => {
    const htmlDocument = await render(ClientPageFailures, {
      failures: [{ entrypoint: 'src/pages/cv.astro', message: 'x' }],
    });
    expect(text(htmlDocument.querySelector('aside')!)).toContain(
      '1 página de src/pages/ no se pudo leer',
    );
  });
});
