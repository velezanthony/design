import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { seoSchema } from './seo-schema';

describe('seoSchema', () => {
  it('acepta el bloque entero, por idioma o no', () => {
    const seo = {
      title: { es: 'Título', en: 'Title' },
      titleSuffix: false,
      description: 'Descripción',
      image: { src: '/og.png', alt: 'Alt' },
      noindex: true,
      schema: [{ '@type': 'Thing' }],
    };
    expect(seoSchema.parse(seo)).toEqual(seo);
  });

  it('es un fragmento: cabe como campo opcional de la colección de cualquier sitio', () => {
    const collection = z.object({ name: z.string(), seo: seoSchema.optional() });
    expect(collection.parse({ name: 'x' })).toEqual({ name: 'x' });
    expect(collection.safeParse({ name: 'x', seo: { descripcion: 'mal escrito' } }).success).toBe(
      false,
    );
  });

  it('una imagen que no es de public/ ni https falla', () => {
    expect(seoSchema.safeParse({ image: { src: 'og.png' } }).success).toBe(false);
  });
});
