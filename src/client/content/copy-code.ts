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

/**
 * Añade un botón «copiar» a cada bloque resaltado (`pre.astro-code`). El botón no va dentro del
 * `pre`, para no colarse en el texto copiado: se envuelve el bloque en `.docs-code` y el botón
 * es su hermano. Sin API de portapapeles (contexto inseguro) no se añade nada: un botón que
 * no puede funcionar es peor que ninguno.
 */
export function initCopyCode(
  doc: Document,
  {
    clipboard,
    labels,
    resetAfterMs = 2000,
    schedule = (cb, ms) => void setTimeout(cb, ms),
  }: CopyCodeOptions,
): void {
  if (!clipboard) return;

  for (const pre of doc.querySelectorAll('pre.astro-code')) {
    if (pre.parentElement?.classList.contains('docs-code')) continue;

    const wrapper = doc.createElement('div');
    wrapper.className = 'docs-code';
    pre.replaceWith(wrapper);
    wrapper.append(pre);

    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'docs-copy';
    button.setAttribute('aria-label', labels.copy);
    button.textContent = labels.copy;
    wrapper.append(button);

    const show = (label: string, state?: 'copied' | 'error') => {
      button.textContent = label;
      if (state) button.setAttribute('data-state', state);
      else button.removeAttribute('data-state');
    };

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
