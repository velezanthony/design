import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import ReportDialog from './ReportDialog.astro';

const props = {
  options: [
    { value: 'page', title: 'Esta página', sub: 'guide · en y es' },
    { value: 'locale', title: 'Un idioma', sub: 'Todo el sitio en' },
  ],
  initial: 'page',
  locales: ['en', 'es'],
  texts: {
    page: {
      markdown: '# Informe <b>&</b>',
      json: '```json\n{}\n```',
      size: { plain: '2 líneas', withJson: '5 líneas' },
    },
    'locale:en': { markdown: 'solo en', json: '{}', size: { plain: 'a', withJson: 'b' } },
  },
};
const dialog = async () => (await render(ReportDialog, props)).querySelector('dialog')!;

describe('ReportDialog', () => {
  it('es un diálogo con título accesible', async () => {
    const d = await dialog();
    expect(d.hasAttribute('data-report-dialog')).toBe(true);
    expect(d.getAttribute('aria-label')).toBe('Copiar para la IA');
    // Sin encabezado propio: el JS de la página añadiría un ancla «#» a cada h2 de <main>.
    expect(d.querySelector('h1, h2, h3')).toBeNull();
  });

  it('un radio por alcance, con el inicial marcado', async () => {
    const radios = [...(await dialog()).querySelectorAll<HTMLInputElement>('[data-report-scope]')];
    expect(radios.map((radio) => radio.value)).toEqual(['page', 'locale']);
    expect(radios.map((radio) => radio.hasAttribute('checked'))).toEqual([true, false]);
  });

  it('el alcance «Un idioma» trae el selector con los idiomas', async () => {
    const select = (await dialog()).querySelector('[data-report-locale]')!;
    expect([...select.querySelectorAll('option')].map((option) => option.value)).toEqual([
      'en',
      'es',
    ]);
    expect(select.getAttribute('aria-label')).toBe('Idioma del informe');
  });

  it('los alcances sin idioma no llevan selector', async () => {
    const only = await render(ReportDialog, { ...props, options: [props.options[0]!] });
    expect(only.querySelector('[data-report-locale]')).toBeNull();
  });

  it('un texto oculto por alcance, con su tamaño, y el JSON aparte', async () => {
    const d = await dialog();
    const md = d.querySelector('[data-report-text="page"]')!;
    expect(md.hasAttribute('hidden')).toBe(true);
    expect(md.getAttribute('data-size-plain')).toBe('2 líneas');
    expect(md.getAttribute('data-size-json')).toBe('5 líneas');
    expect(d.querySelector('[data-report-json-text="page"]')!.textContent).toBe('```json\n{}\n```');
    expect(d.querySelector('[data-report-text="locale:en"]')).not.toBeNull();
  });

  it('el HTML del informe va escapado: un `<` del Markdown no abre una etiqueta ni cierra el textarea', async () => {
    const md = (await dialog()).querySelector('[data-report-text="page"]')!;
    expect(md.innerHTML).toBe('# Informe &lt;b&gt;&amp;&lt;/b&gt;');
    expect(md.querySelector('b')).toBeNull();
  });

  it('trae la casilla del JSON, la vista previa, el tamaño y el botón de copiar', async () => {
    const d = await dialog();
    expect(d.querySelector('input[type="checkbox"][data-report-json]')).not.toBeNull();
    expect(d.querySelector('pre[data-report-preview]')!.getAttribute('aria-label')).toBe(
      'Vista previa del informe',
    );
    expect(d.querySelector('[data-report-meta]')).not.toBeNull();
    expect(text(d.querySelector('[data-report-copy]'))).toBe('Copiar');
    expect(d.querySelector('[data-report-status]')!.getAttribute('role')).toBe('status');
  });

  it('los textos de confirmación viajan en el diálogo, y lo clicable lleva puntero', async () => {
    const d = await dialog();
    expect(d.getAttribute('data-copied')).toBe('Copiado');
    expect(d.getAttribute('data-failed')).toBe('No se pudo copiar: selecciona el texto');
    expect(d.querySelector('[data-report-copy]')!.className).toContain('cursor-pointer');
    expect(d.querySelector('[data-report-close]')!.getAttribute('aria-label')).toBe('Cerrar');
    expect(d.querySelector('label')!.className).toContain('cursor-pointer');
  });

  it('solo el cuerpo se desplaza: la cabecera y el pie no', async () => {
    const d = await dialog();
    const grid = d.firstElementChild!;
    expect(grid.className).toContain('grid-rows-[auto_minmax(0,1fr)_auto]');
    const [head, body, foot] = [...grid.children];
    expect(body!.className).toContain('overflow-auto');
    expect(head!.className).not.toContain('overflow');
    expect(foot!.className).not.toContain('overflow');
    expect(d.querySelector('pre')!.className).not.toContain('overflow');
  });
});
