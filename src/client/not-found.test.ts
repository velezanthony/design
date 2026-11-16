import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';

import { swapNotFound } from './not-found';

const doc = (extra = '') =>
  parseHTML(`<!doctype html><html lang="en" class="nf-pending"><head><title>Not found</title></head>
<body><main>English</main>
<template data-locale="es" data-title="No encontrada"><header>Cabecera</header><main>Español</main></template>
<template data-locale="fr" data-title="Introuvable"><main>Français</main></template>${extra}</body></html>`)
    .document;

describe('swapNotFound', () => {
  it('sustituye el cuerpo, lang y título por los de la plantilla del idioma', () => {
    const d = doc();
    expect(swapNotFound(d, 'es')).toBe(true);
    expect(d.documentElement.getAttribute('lang')).toBe('es');
    expect(d.title).toBe('No encontrada');
    expect(d.body.querySelector('main')!.textContent).toBe('Español');
    expect(d.body.querySelector('header')).not.toBeNull();
  });

  it('retira nf-pending para que se vea la página', () => {
    const d = doc();
    swapNotFound(d, 'fr');
    expect(d.documentElement.classList.contains('nf-pending')).toBe(false);
  });

  it('las plantillas no quedan en el cuerpo sustituido', () => {
    const d = doc();
    swapNotFound(d, 'es');
    expect(d.querySelectorAll('template')).toHaveLength(0);
  });

  it('sin plantilla para ese idioma deja el idioma por defecto y también retira nf-pending', () => {
    const d = doc();
    expect(swapNotFound(d, 'de')).toBe(false);
    expect(d.documentElement.getAttribute('lang')).toBe('en');
    expect(d.body.querySelector('main')!.textContent).toBe('English');
    expect(d.documentElement.classList.contains('nf-pending')).toBe(false);
  });
});
