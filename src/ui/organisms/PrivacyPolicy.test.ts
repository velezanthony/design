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
    const doc = await render(PrivacyPolicy, props('es'));
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect([...doc.querySelectorAll('h2')].map((h) => h.id)).toEqual(
      privacyCopy('es', controller).map((s) => s.id),
    );
  });

  it('nombra al responsable y enlaza su correo', async () => {
    const doc = await render(PrivacyPolicy, props('en'));
    expect(text(doc)).toContain('Ada Test');
    expect(doc.querySelector('a[href="mailto:ada@test.dev"]')).not.toBeNull();
  });

  it('declara que cubre las webs de documentación de los proyectos', async () => {
    for (const lang of ['es', 'en'] as const) {
      const doc = await render(PrivacyPolicy, props(lang));
      expect(text(doc.querySelector('#scope + p'))).toContain('velezanthony.github.io/<repo>/');
    }
  });

  it('fecha la política con un <time> legible por máquinas', async () => {
    const doc = await render(PrivacyPolicy, props('es'));
    const time = doc.querySelector('time')!;
    expect(time.getAttribute('datetime')).toBe('2026-11-17');
    expect(text(time)).toBe('17 de noviembre de 2026');
  });

  it('las tablas llevan caption, cabeceras de columna y de fila, en un scroller', async () => {
    const doc = await render(PrivacyPolicy, props('es'));
    expect(doc.querySelector('.table-scroll table caption')).not.toBeNull();
    expect(doc.querySelector('thead th[scope="col"]')).not.toBeNull();
    expect(doc.querySelector('tbody th[scope="row"]')).not.toBeNull();
  });
});
