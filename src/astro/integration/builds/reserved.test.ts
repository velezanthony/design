import { describe, expect, it } from 'vitest';
import { buildFailingCase } from '../../../testing/case';

/* Nombres reservados de un listado: `page` y `per-page` cuelgan de su carpeta para la paginación, así
   que una página con esa URL rompe el build nombrando su archivo y cómo arreglarlo. */

describe('nombres reservados de un listado', { timeout: 120_000 }, () => {
  it('`tutoriales/page.md` junto a `tutoriales/_index.md` no construye', async () => {
    const { code, output } = await buildFailingCase({
      name: 'reserved-page',
      config: {
        site: { name: 'Reserved' },
        i18n: { locales: ['es'] },
        content: { folders: { tutoriales: { listing: { generate: true, view: 'cards' } } } },
      },
      docs: {
        'index.md': '# Inicio\n',
        'tutoriales/_index.md': '# Tutoriales\n',
        'tutoriales/a.md': '# A\n',
        'tutoriales/page.md': '# Página\n',
      },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('tutoriales/page.md');
    expect(output).toContain('Renombra el archivo o cambia su `slug`');
    expect(output).not.toContain('opción desconocida');
  });
});
