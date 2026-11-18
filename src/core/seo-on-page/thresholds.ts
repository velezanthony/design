/**
 * Todos los límites del análisis, en un solo sitio. Se miden en caracteres del texto FINAL (el
 * `<title>` ya con sufijo), que es lo que enseña el resultado de búsqueda. Son orientativos: los
 * buscadores recortan por píxeles, no por caracteres, y cambian de criterio sin avisar.
 */
export const THRESHOLDS = {
  /**
   * Un `<title>` de más de ~60 caracteres (≈ 600 px en el resultado de escritorio) se recorta con
   * «…», y lo que queda fuera no cuenta para el usuario.
   */
  titleMax: 60,
  /**
   * Con menos de ~15 caracteres el título casi no dice nada de la página y Google suele
   * reescribirlo por su cuenta. Ya incluye el sufijo: un título solo con el nombre del sitio cae aquí.
   */
  titleMin: 15,
  /**
   * La descripción se enseña en ~155–160 caracteres en escritorio (menos en móvil); lo que pasa de
   * ahí se corta.
   */
  descriptionMax: 160,
  /**
   * Por debajo de ~70 caracteres el fragmento queda corto y el buscador tiende a sustituirlo por
   * texto del cuerpo de la página.
   */
  descriptionMin: 70,
  /** Más de un H1 diluye de qué trata la página: debe haber exactamente uno. */
  /**
   * Los mismos límites en píxeles, que es como recortan los buscadores: ≈580 px el título y ≈920 px
   * la descripción en el resultado de escritorio. Se enseñan como estimación.
   */
  titleMaxPx: 580,
  descriptionMaxPx: 920,
  maxH1: 1,
} as const;
