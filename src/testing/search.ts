import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Busca en el índice de Pagefind de un `dist/` como lo haría el navegador: `fetch` de
 * `http://x/<base>/**` se lee de disco y `<html lang>` fija el idioma del índice. Devuelve las URLs
 * de los resultados. Sustituye `globalThis.fetch`: el llamador lo restaura (`restoreFetch`).
 */
export async function searchBuilt(
  dist: string,
  lang: string,
  term: string,
  base = '/repo/',
): Promise<string[]> {
  const origin = 'http://x';
  globalThis.fetch = async (input) => {
    const url = new URL(String(input), `${origin}${base}`);
    try {
      return new Response(await readFile(resolve(dist, url.pathname.slice(base.length))));
    } catch {
      return new Response('no encontrado', { status: 404 });
    }
  };
  Object.assign(globalThis, {
    location: { origin, href: `${origin}${base}` },
    window: globalThis,
    document: { querySelector: () => ({ getAttribute: () => lang }), documentElement: { lang } },
  });
  const pagefind = await import(
    /* @vite-ignore */ `${pathToFileURL(resolve(dist, 'pagefind/pagefind.js')).href}?${lang}`
  );
  await pagefind.options({ basePath: `${origin}${base}pagefind/` });
  await pagefind.init();
  const { results } = await pagefind.search(term);
  return (
    await Promise.all(results.map((r: { data(): Promise<{ url: string }> }) => r.data()))
  ).map((d) => d.url);
}
