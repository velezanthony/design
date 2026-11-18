export interface CopyFeedback {
  /** Pinta la confirmación o el fallo. */
  done: () => void;
  failed: () => void;
  /** Deja la interfaz como estaba. */
  reset: () => void;
  schedule: (callback: () => void, ms: number) => void;
  resetAfterMs: number;
}

/** Copia `text`, avisa del resultado y, pase lo que pase, programa la vuelta al estado inicial. */
export function copyWithFeedback(
  clipboard: Pick<Clipboard, 'writeText'>,
  text: string,
  { done, failed, reset, schedule, resetAfterMs }: CopyFeedback,
): Promise<void> {
  return clipboard
    .writeText(text)
    .then(done, failed)
    .finally(() => schedule(reset, resetAfterMs));
}
