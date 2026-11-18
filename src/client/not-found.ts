/** Sustituye la 404 por la de `locale` en sitio (copia `<template data-locale>`, fija `lang` y `title`); devuelve si sustituyó. */
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
