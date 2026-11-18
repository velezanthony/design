import { copyWithFeedback } from '../clipboard';

export interface CopyLabels {
  copy: string;
  copied: string;
  failed: string;
}

export interface CopyCodeOptions {
  clipboard: Pick<Clipboard, 'writeText'> | undefined;
  labels: CopyLabels;
  /** Cuánto dura la confirmación antes de volver a la etiqueta inicial. */
  resetAfterMs?: number;
  /** Programa la vuelta a la etiqueta; por defecto `setTimeout`. Inyectable en los tests. */
  schedule?: (callback: () => void, ms: number) => void;
}

/** El texto de un bloque de código, sin el salto final que deja el resaltado. */
export function codeText(pre: Element): string {
  return (pre.textContent ?? '').replace(/\n$/, '');
}

/** Añade un botón «copiar» a cada `pre.astro-code`, como hermano (no dentro) del `pre` para no colarse en lo copiado; sin portapapeles no añade nada. */
export function initCopyCode(
  htmlDocument: Document,
  {
    clipboard,
    labels,
    resetAfterMs = 2000,
    schedule = (callback, ms) => void setTimeout(callback, ms),
  }: CopyCodeOptions,
): void {
  if (!clipboard) return;

  for (const pre of htmlDocument.querySelectorAll('pre.astro-code')) {
    if (pre.parentElement?.classList.contains('docs-code')) continue;

    const wrapper = htmlDocument.createElement('div');
    wrapper.className = 'docs-code';
    pre.replaceWith(wrapper);
    wrapper.append(pre);

    const button = htmlDocument.createElement('button');
    button.type = 'button';
    button.className = 'docs-copy';
    button.setAttribute('aria-label', labels.copy);
    button.textContent = labels.copy;
    wrapper.append(button);

    function show(label: string, state?: 'copied' | 'error') {
      button.textContent = label;
      if (state) button.setAttribute('data-state', state);
      else button.removeAttribute('data-state');
    }

    button.addEventListener('click', () => {
      void copyWithFeedback(clipboard, codeText(pre), {
        done: () => show(labels.copied, 'copied'),
        failed: () => show(labels.failed, 'error'),
        reset: () => show(labels.copy),
        schedule,
        resetAfterMs,
      });
    });
  }
}
