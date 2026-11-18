/**
 * Sustituye la 404 del idioma por defecto por la de `locale`, en sitio y sin redirección: copia el
 * contenido de `<template data-locale>` al `<body>`, fija `<html lang>` y `<title>` (`data-title`)
 * y retira `nf-pending`, que mantiene oculto el `<main>` hasta entonces. Sin plantilla para ese
 * idioma se queda lo que hay. Devuelve si sustituyó.
 */
export function swapNotFound(htmlDocument: Document, locale: string): boolean {
  const root = htmlDocument.documentElement;
  const template = [
    ...htmlDocument.querySelectorAll<HTMLTemplateElement>('template[data-locale]'),
  ].find((candidate) => candidate.getAttribute('data-locale') === locale);
  if (template) {
    const content = template.content.cloneNode(true) as DocumentFragment;
    htmlDocument.body.replaceChildren(content);
    root.setAttribute('lang', locale);
    const title = template.getAttribute('data-title');
    if (title !== null) htmlDocument.title = title;
  }
  root.classList.remove('nf-pending');
  return template !== undefined;
}
