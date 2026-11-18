import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';

import { swapNotFound } from './not-found';

function htmlDocument(extra = '') {
  return parseHTML(`<!doctype html><html lang="en" class="nf-pending"><head><title>Not found</title></head>
<body><main>English</main>
<template data-locale="es" data-title="No encontrada"><header>Cabecera</header><main>Español</main></template>
<template data-locale="fr" data-title="Introuvable"><main>Français</main></template>${extra}</body></html>`)
    .document;
}

describe('swapNotFound', () => {
  it('sustituye el cuerpo, lang y título por los de la plantilla del idioma', () => {
    const page = htmlDocument();
    expect(swapNotFound(page, 'es')).toBe(true);
    expect(page.documentElement.getAttribute('lang')).toBe('es');
    expect(page.title).toBe('No encontrada');
    expect(page.body.querySelector('main')!.textContent).toBe('Español');
    expect(page.body.querySelector('header')).not.toBeNull();
  });

  it('retira nf-pending para que se vea la página', () => {
    const page = htmlDocument();
    swapNotFound(page, 'fr');
    expect(page.documentElement.classList.contains('nf-pending')).toBe(false);
  });

  it('las plantillas no quedan en el cuerpo sustituido', () => {
    const page = htmlDocument();
    swapNotFound(page, 'es');
    expect(page.querySelectorAll('template')).toHaveLength(0);
  });

  it('sin plantilla para ese idioma deja el idioma por defecto y también retira nf-pending', () => {
    const page = htmlDocument();
    expect(swapNotFound(page, 'de')).toBe(false);
    expect(page.documentElement.getAttribute('lang')).toBe('en');
    expect(page.body.querySelector('main')!.textContent).toBe('English');
    expect(page.documentElement.classList.contains('nf-pending')).toBe(false);
  });
});
