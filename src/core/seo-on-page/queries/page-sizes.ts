/** 25 son unas dos pantallas con insignias; rige si la URL no dice nada (el resto, en `PAGE_SIZES`). */
export const PAGE_SIZE = 25;

/** Tamaños elegibles. Cerrados a propósito: una URL con un número cualquiera no pide una página gigante. */
export const PAGE_SIZES = [10, 25, 50, 100] as const;
