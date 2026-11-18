import { describe, expect, it } from 'vitest';
import { privacyCopy } from '../../core/privacy/copy';
import { render, text } from '../../testing/render';
import PrivacyPolicy from './PrivacyPolicy.astro';

const controller = { name: 'Ada Test', email: 'ada@test.dev' };
function props(lang: 'es' | 'en') {
  return {
    title: 'Política',
    eyebrow: 'Privacidad',
    updatedLabel: 'Última actualización',
    updated: { iso: '2026-11-17', text: '17 de noviembre de 2026' },
    sections: privacyCopy(lang, controller),
  };
}

describe('PrivacyPolicy', () => {
  it('un h1 y un h2 con ancla por sección', async () => {
    const htmlDocument = await render(PrivacyPolicy, props('es'));
    expect(htmlDocument.querySelectorAll('h1')).toHaveLength(1);
    expect([...htmlDocument.querySelectorAll('h2')].map((heading) => heading.id)).toEqual(
      privacyCopy('es', controller).map((section) => section.id),
    );
  });

  it('nombra al responsable y enlaza su correo', async () => {
    const htmlDocument = await render(PrivacyPolicy, props('en'));
    expect(text(htmlDocument)).toContain('Ada Test');
    expect(htmlDocument.querySelector('a[href="mailto:ada@test.dev"]')).not.toBeNull();
  });

  it('declara que cubre las webs de documentación de los proyectos', async () => {
    for (const lang of ['es', 'en'] as const) {
      const htmlDocument = await render(PrivacyPolicy, props(lang));
      expect(text(htmlDocument.querySelector('#scope + p'))).toContain(
        'velezanthony.github.io/<repo>/',
      );
    }
  });

  it('fecha la política con un <time> legible por máquinas', async () => {
    const htmlDocument = await render(PrivacyPolicy, props('es'));
    const time = htmlDocument.querySelector('time')!;
    expect(time.getAttribute('datetime')).toBe('2026-11-17');
    expect(text(time)).toBe('17 de noviembre de 2026');
  });

  it('las tablas llevan caption, cabeceras de columna y de fila, en un scroller', async () => {
    const htmlDocument = await render(PrivacyPolicy, props('es'));
    expect(htmlDocument.querySelector('.table-scroll table caption')).not.toBeNull();
    expect(htmlDocument.querySelector('thead th[scope="col"]')).not.toBeNull();
    expect(htmlDocument.querySelector('tbody th[scope="row"]')).not.toBeNull();
  });
});
