import type { Label } from './schema';

/** Enlace del footer a una página del sitio: se resuelve a la URL de cada idioma. */
export interface FooterPage {
  label: Label;
  slug: string;
}

/** Enlace externo del footer, solo https. */
export interface FooterHref {
  label: Label;
  href: string;
}

export type FooterLink = FooterPage | FooterHref;

export function isFooterPage(link: FooterLink): link is FooterPage {
  return 'slug' in link;
}

/** Licencia: un texto suelto o una etiqueta con enlace al archivo de la licencia (https). */
export type FooterLicense = string | { label: Label; href: string };

/** Autor: nombre y enlace (https). `false` lo oculta. */
export type FooterAuthor = { name: string; href: string } | false;

/**
 * Footer del sitio, todo opcional. El repositorio, «informar de un error», la privacidad y las
 * preferencias de cookies no se declaran aquí: salen de `social.github`, `privacyUrl` y `gtmId`.
 */
export interface FooterConfig {
  license?: FooterLicense;
  author?: FooterAuthor;
  /** Enlaces propios; van a la derecha, antes de los derivados. */
  links?: FooterLink[];
}
