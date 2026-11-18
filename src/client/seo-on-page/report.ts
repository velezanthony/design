/**
 * «Copiar para la IA». El servidor deja en la página el informe de cada alcance ya generado
 * (`<textarea hidden data-report-text="<alcance>">`, con su bloque JSON en `data-report-json-text`) y el
 * diálogo (`[data-report-dialog]`) solo elige entre ellos: nada se recalcula aquí. El alcance «Un
 * idioma» guarda un texto por idioma bajo `locale:<idioma>`. Los botones que abren el diálogo
 * (`data-report-open="<alcance>"`) y el «Copiar prompt» de cada problema (`data-copy-prompt="<texto>"`)
 * nacen con `hidden`: sin JavaScript o sin portapapeles no se ofrece lo que no puede funcionar.
 *
 * Los textos vienen del marcado: `data-copied` y `data-failed` en el diálogo y en cada botón de prompt.
 */

/** Lo que separa el Markdown del bloque JSON; el servidor calcula el tamaño con el mismo. */
const JSON_SEPARATOR = '\n\n';

export interface ReportOptions {
  clipboard: Pick<Clipboard, 'writeText'> | undefined;
  /** Cuánto dura una confirmación («Copiado») antes de desaparecer. */
  resetAfterMs?: number;
  /** Programa la retirada de la confirmación; por defecto `setTimeout`. Inyectable en los tests. */
  schedule?: (callback: () => void, ms: number) => void;
}

const find = (root: ParentNode, name: string, key: string): HTMLElement | undefined =>
  [...root.querySelectorAll<HTMLElement>(`[${name}]`)].find((el) => el.getAttribute(name) === key);

export function initReport(
  doc: Document,
  { clipboard, resetAfterMs = 1800, schedule = (cb, ms) => void setTimeout(cb, ms) }: ReportOptions,
): void {
  if (!clipboard) return;
  for (const button of doc.querySelectorAll('[data-report-open], [data-copy-prompt]')) {
    button.removeAttribute('hidden');
  }

  const dialog = doc.querySelector<HTMLDialogElement>('[data-report-dialog]');
  const part = <T extends HTMLElement>(name: string) => dialog?.querySelector<T>(`[${name}]`);
  const radios = () => [
    ...(dialog?.querySelectorAll<HTMLInputElement>('[data-report-scope]') ?? []),
  ];

  const setStatus = (text: string) => {
    const status = part('data-report-status');
    if (status) status.textContent = text;
  };

  const render = () => {
    if (!dialog) return;
    const scope = radios().find((radio) => radio.checked)?.value;
    const locale = part<HTMLSelectElement>('data-report-locale')?.value;
    const key = scope === 'locale' ? `locale:${locale}` : (scope ?? '');
    const markdown = find(dialog, 'data-report-text', key);
    const json = find(dialog, 'data-report-json-text', key);
    const withJson = part<HTMLInputElement>('data-report-json')?.checked === true && json;
    const preview = part('data-report-preview');
    if (preview) {
      preview.textContent =
        (markdown?.textContent ?? '') + (withJson ? JSON_SEPARATOR + json.textContent : '');
    }
    const meta = part('data-report-meta');
    if (meta) meta.textContent = markdown?.dataset[withJson ? 'sizeJson' : 'sizePlain'] ?? '';
    setStatus('');
  };

  const open = (scope: string) => {
    if (!dialog) return;
    const choices = radios().filter((radio) => !radio.disabled);
    const choice = choices.find((radio) => radio.value === scope) ?? choices[0];
    for (const radio of radios()) radio.checked = radio === choice;
    render();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };

  const close = () => {
    if (typeof dialog?.close === 'function') dialog.close();
    else dialog?.removeAttribute('open');
  };

  /** Confirma una copia en `target` y, pasado un rato, deja lo que había. */
  const confirm = (target: HTMLElement, text: string, original: string) => {
    target.textContent = text;
    schedule(() => {
      target.textContent = original;
    }, resetAfterMs);
  };

  doc.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (!target?.closest) return;

    const opener = target.closest<HTMLElement>('[data-report-open]');
    if (opener) return open(opener.getAttribute('data-report-open') ?? '');

    const prompt = target.closest<HTMLElement>('[data-copy-prompt]');
    if (prompt) {
      const label = prompt.querySelector<HTMLElement>('[data-label]') ?? prompt;
      // La etiqueta de siempre se guarda la primera vez: pulsar dos veces no fija «Copiado».
      const original = (label.dataset.original ??= label.textContent ?? '');
      void clipboard.writeText(prompt.getAttribute('data-copy-prompt') ?? '').then(
        () => confirm(label, prompt.dataset.copied ?? '', original),
        () => confirm(label, prompt.dataset.failed ?? '', original),
      );
      return;
    }

    if (!dialog) return;
    if (target === dialog || target.closest('[data-report-close]')) return close();
    if (target.closest('[data-report-copy]')) {
      const text = part('data-report-preview')?.textContent ?? '';
      const done = (message: string | undefined) => {
        setStatus(message ?? '');
        schedule(() => setStatus(''), resetAfterMs);
      };
      void clipboard.writeText(text).then(
        () => done(dialog.dataset.copied),
        () => done(dialog.dataset.failed),
      );
    }
  });

  doc.addEventListener('change', (event) => {
    const field = event.target as Element | null;
    if (!dialog || !field?.closest || !field.closest('[data-report-dialog]')) return;
    if (field.matches('[data-report-locale]')) {
      const locale = radios().find((radio) => radio.value === 'locale');
      if (locale && !locale.disabled) {
        for (const radio of radios()) radio.checked = radio === locale;
      }
      render();
    } else if (field.matches('[data-report-scope], [data-report-json]')) render();
  });
}
