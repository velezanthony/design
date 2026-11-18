import { describe, expect, it, vi } from 'vitest';
import { copyWithFeedback } from './clipboard';

function setup(writeText: (text: string) => Promise<void>) {
  const done = vi.fn();
  const failed = vi.fn();
  const reset = vi.fn();
  const schedule = vi.fn();
  function copy() {
    return copyWithFeedback({ writeText }, 'hola', {
      done,
      failed,
      reset,
      schedule,
      resetAfterMs: 1800,
    });
  }
  return { done, failed, reset, schedule, copy };
}

describe('copyWithFeedback', () => {
  it('copia el texto, avisa del éxito y programa la vuelta', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const { done, failed, reset, schedule, copy } = setup(writeText);
    await copy();
    expect(writeText).toHaveBeenCalledWith('hola');
    expect(done).toHaveBeenCalledOnce();
    expect(failed).not.toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledWith(reset, 1800);
  });

  it('si falla, avisa del fallo y también programa la vuelta', async () => {
    const { done, failed, reset, schedule, copy } = setup(() => Promise.reject(new Error('no')));
    await copy();
    expect(failed).toHaveBeenCalledOnce();
    expect(done).not.toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledWith(reset, 1800);
  });
});
