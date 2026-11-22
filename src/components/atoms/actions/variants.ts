/* Las clases de cada variante de `Link`, en un solo sitio: las reutiliza quien tiene que verse como un
   enlace sin serlo (el botón de cookies) o sin pintar el átomo entero (los enlaces de los índices). */

export type LinkVariant = 'inline' | 'quiet' | 'action' | 'value';

/* `min-h-6` salvo inline: WCAG 2.5.8 pide objetivos de 24px; los enlaces dentro de una frase están exentos. */
export const linkVariants: Record<LinkVariant, string> = {
  inline:
    'text-accent underline decoration-accent-line underline-offset-[0.2em] decoration-1 hover:decoration-2 transition-[text-decoration-thickness]',
  quiet: 'min-h-6 text-muted hover:text-ink transition-colors',
  /* El contenido de un campo con etiqueta: tinta, como los valores de texto que lo acompañan. */
  value: 'min-h-6 text-ink hover:text-accent transition-colors',
  action:
    'label min-h-6 inline-flex items-center gap-2 text-accent hover:gap-3 transition-[gap] duration-200',
};
