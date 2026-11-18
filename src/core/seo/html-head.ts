import { parseHTML } from 'linkedom';

/** Lo que una página publicada dice de sí misma en su HTML. */
export interface HeadFacts {
  title?: string;
  description?: string;
  /** `<html lang>`. */
  lang?: string;
  /** Una meta `robots` o `googlebot` con `noindex` o `none`. */
  noindex: boolean;
  /** Absoluta, resuelta contra la URL de la página. */
  canonical?: string;
  /** Las versiones por idioma (`<link rel="alternate" hreflang>`), absolutas y en orden. */
  alternates: { hreflang: string; href: string }[];
  /** El texto de cada H1 del cuerpo, en orden. */
  h1: string[];
}

/** Los robots que deciden la indexación: el genérico y el de Google, que es el que importa aquí. */
const ROBOTS = ['robots', 'googlebot'];
const EXCLUDES = ['noindex', 'none'];

const clean = (text: string | null | undefined) => text?.replace(/\s+/g, ' ').trim() || undefined;
const tokens = (value: string | null) =>
  (value ?? '')
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);

/**
 * Lee del HTML de una página lo que decide su SEO: título, descripción, indexación, canonical e
 * idiomas. Las metas y los enlaces solo cuentan en el `<head>`, como hacen los buscadores. Los
 * enlaces salen absolutos, resueltos contra `url`. Pura: no pide nada a la red.
 */
export function readHead(html: string, url: URL): HeadFacts {
  const { document } = parseHTML(html);
  const head = document.head;
  const metas = [...head.querySelectorAll('meta[name]')];
  const meta = (names: string[]) =>
    metas.filter((element) => names.includes(element.getAttribute('name')!.toLowerCase()));
  const links = (rel: string) =>
    [...head.querySelectorAll('link[rel][href]')].filter((element) =>
      tokens(element.getAttribute('rel')).includes(rel),
    );
  const absolute = (href: string) => new URL(href, url).href;

  const description = clean(meta(['description'])[0]?.getAttribute('content'));
  const canonical = links('canonical')[0]?.getAttribute('href');
  const title = clean(head.querySelector('title')?.textContent);
  const lang = clean(document.documentElement.getAttribute('lang'));
  return {
    ...(title && { title }),
    ...(description && { description }),
    ...(lang && { lang }),
    noindex: meta(ROBOTS).some((element) =>
      tokens(element.getAttribute('content')).some((token) => EXCLUDES.includes(token)),
    ),
    ...(canonical && { canonical: absolute(canonical) }),
    alternates: links('alternate')
      .filter((element) => element.getAttribute('hreflang'))
      .map((element) => ({
        hreflang: element.getAttribute('hreflang')!,
        href: absolute(element.getAttribute('href')!),
      })),
    h1: [...document.querySelectorAll('h1')].map((element) => clean(element.textContent) ?? ''),
  };
}
