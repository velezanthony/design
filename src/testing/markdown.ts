import { markdownToHtml, type Features, type MdastPluginList } from 'satteri';

/* Raíz ficticia de un proyecto consumidor: solo importa la forma de las rutas, nunca se lee. */
const project = new URL('file:///site/');

/** URL de un archivo dentro de `src/content/docs/`, como los que ve el loader. */
export const docFileURL = (relativePath: string): URL =>
  new URL(`src/content/docs/${relativePath}`, project);

/** URL de un archivo `external` (fuera de `src/content/docs/`, p. ej. el CHANGELOG del repo). */
export const externalFileURL = (relativePath: string): URL => new URL(relativePath, project);

/** URL de un archivo dentro del proyecto que no es documentación ni `external`. */
export const nonDocFileURL = (relativePath: string): URL =>
  new URL(`src/pages/${relativePath}`, project);

interface RenderOptions {
  fileURL: URL;
  plugins?: MdastPluginList;
  features?: Features;
}

/**
 * Ejecuta Sätteri directamente sobre una cadena, sin Astro ni Vite. Es el modelo de
 * `createPluginTestOptions` de Starlight: los plugins reciben `fileURL` igual que dentro del loader.
 */
export async function renderMarkdown(
  source: string,
  { fileURL, plugins = [], features }: RenderOptions,
): Promise<string> {
  const { html } = await markdownToHtml(source, { fileURL, mdastPlugins: plugins, features });
  return html;
}
