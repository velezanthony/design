import { glob, readFile, writeFile } from 'node:fs/promises';
import type { AstroIntegrationLogger } from 'astro';

/** Offset de las vueltas dentro del chunk `ANIM` de RIFF: etiqueta, tamaño y color de fondo. */
const LOOP_COUNT = 12;

/**
 * Reescribe en el sitio una animación WebP infinita para que se reproduzca una vez; true si cambió algo.
 * Cero es «para siempre»; cualquier otra cuenta ya se detiene y una imagen fija no tiene chunk `ANIM`.
 */
export function boundLoop(buffer: Buffer): boolean {
  const at = buffer.indexOf('ANIM');
  if (at === -1 || buffer.readUInt16LE(at + LOOP_COUNT) !== 0) return false;
  buffer.writeUInt16LE(1, at + LOOP_COUNT);
  return true;
}

/* Sharp pierde las vueltas del GIF de origen y recodifica todo WebP animado como infinito. Una demo
   que no para es movimiento del que el visitante no puede escapar (WCAG 2.2.2): se reescribe el campo
   a una pasada con los recursos ya en disco. No hay checksum que invalidar. */
export async function boundAnimationLoops(
  directory: URL,
  logger: AstroIntegrationLogger,
): Promise<void> {
  let patched = 0;
  for await (const file of glob('**/*.webp', { cwd: directory })) {
    const path = new URL(file, directory);
    const buffer = await readFile(path);
    if (!boundLoop(buffer)) continue;
    await writeFile(path, buffer);
    patched++;
  }
  if (patched) logger.info(`${patched} animaciones en bucle limitadas a una pasada`);
}
