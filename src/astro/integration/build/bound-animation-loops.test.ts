import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { boundAnimationLoops, boundLoop } from './bound-animation-loops';

/** La cabecera de un WebP animado: el chunk `ANIM` lleva el número de vueltas en el offset 12. */
function webp(loops: number | null): Buffer {
  const head = Buffer.from('RIFF\0\0\0\0WEBPVP8X\x0a\0\0\0\x02\0\0\0\0\0\0\0\0\0', 'latin1');
  if (loops === null) return head;
  const anim = Buffer.alloc(14);
  anim.write('ANIM', 0, 'latin1');
  anim.writeUInt32LE(6, 4);
  anim.writeUInt16LE(loops, 12);
  return Buffer.concat([head, anim]);
}

function loopsOf(buffer: Buffer): number {
  return buffer.readUInt16LE(buffer.indexOf('ANIM') + 12);
}

describe('boundLoop', () => {
  it('convierte una animación infinita en una sola pasada', () => {
    const buffer = webp(0);
    expect(boundLoop(buffer)).toBe(true);
    expect(loopsOf(buffer)).toBe(1);
  });

  it('deja en paz una animación que ya se detiene', () => {
    const buffer = webp(3);
    expect(boundLoop(buffer)).toBe(false);
    expect(loopsOf(buffer)).toBe(3);
  });

  it('deja en paz una imagen fija', () => {
    const buffer = webp(null);
    const before = Buffer.from(buffer);
    expect(boundLoop(buffer)).toBe(false);
    expect(buffer.equals(before)).toBe(true);
  });
});

describe('boundAnimationLoops', () => {
  const directories: string[] = [];
  afterEach(async () => {
    for (const directory of directories.splice(0)) {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('reescribe en disco los WebP infinitos, avisa de cuántos y no toca el resto', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'loops-'));
    directories.push(directory);
    await writeFile(path.join(directory, 'forever.webp'), webp(0));
    await writeFile(path.join(directory, 'stops.webp'), webp(3));
    const info = vi.fn();

    await boundAnimationLoops(pathToFileURL(`${directory}/`), { info } as never);

    expect(loopsOf(await readFile(path.join(directory, 'forever.webp')))).toBe(1);
    expect(loopsOf(await readFile(path.join(directory, 'stops.webp')))).toBe(3);
    expect(info).toHaveBeenCalledWith('1 animaciones en bucle limitadas a una pasada');
  });

  it('sin animaciones infinitas no dice nada', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'loops-'));
    directories.push(directory);
    await writeFile(path.join(directory, 'still.webp'), webp(null));
    const info = vi.fn();
    await boundAnimationLoops(pathToFileURL(`${directory}/`), { info } as never);
    expect(info).not.toHaveBeenCalled();
  });
});
