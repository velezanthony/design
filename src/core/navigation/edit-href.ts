/** El enlace para editar un archivo: la base de edición del repositorio y la ruta, sin barras duplicadas. */
export function editHref(editUrl: string, file: string): string {
  return `${editUrl.replace(/\/+$/, '')}/${file.replace(/^\/+/, '')}`;
}
