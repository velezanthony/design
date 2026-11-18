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
  /** Los encabezados (H1–H6) en orden: nivel, `id` (vacío si no tiene) y texto. */
  headings: { depth: number; slug: string; text: string }[];
  /** Lo que se enseña al compartir el enlace (Open Graph); la imagen, absoluta. */
  og: {
    title?: string;
    description?: string;
    image?: { src: string; alt: string; width?: number; height?: number };
  };
  /** Cada bloque JSON-LD del `<head>`, interpretado; los que no son JSON válido se ignoran. */
  jsonLd: unknown[];
}

/** Los robots que deciden la indexación: el genérico y el de Google, que es el que importa aquí. */
const ROBOTS = ['robots', 'googlebot'];
const EXCLUDES = ['noindex', 'none'];

function clean(text: string | null | undefined) {
  return text?.replace(/\s+/g, ' ').trim() || undefined;
}
function tokens(value: string | null) {
  return (value ?? '')
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
}

/**
 * Lee del HTML de una página lo que decide su SEO: título, descripción, indexación, canonical,
 * idiomas, encabezados, Open Graph y JSON-LD. Las metas y los enlaces solo cuentan en el `<head>`, como hacen los buscadores. Los
 * enlaces salen absolutos, resueltos contra `url`. Pura: no pide nada a la red.
 */
export function readHead(html: string, url: URL): HeadFacts {
  const { document } = parseHTML(html);
  const head = document.head;
  const metas = [...head.querySelectorAll('meta[name]')];
  function meta(names: string[]) {
    return metas.filter((element) => names.includes(element.getAttribute('name')!.toLowerCase()));
  }
  function links(rel: string) {
    return [...head.querySelectorAll('link[rel][href]')].filter((element) =>
      tokens(element.getAttribute('rel')).includes(rel),
    );
  }
  function absolute(href: string) {
    return new URL(href, url).href;
  }
  function property(name: string) {
    return clean(head.querySelector(`meta[property="${name}"]`)?.getAttribute('content'));
  }
  function size(name: string) {
    const value = Number(property(name));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

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
    headings: [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((element) => ({
      depth: Number(element.tagName[1]),
      slug: element.getAttribute('id') ?? '',
      text: clean(element.textContent) ?? '',
    })),
    og: openGraph(property, size, absolute),
    jsonLd: [...head.querySelectorAll('script[type="application/ld+json"]')].flatMap((element) => {
      try {
        return [JSON.parse(element.textContent ?? '')];
      } catch {
        return [];
      }
    }),
  };
}

function openGraph(
  property: (name: string) => string | undefined,
  size: (name: string) => number | undefined,
  absolute: (href: string) => string,
): HeadFacts['og'] {
  const title = property('og:title');
  const description = property('og:description');
  const src = property('og:image');
  const width = size('og:image:width');
  const height = size('og:image:height');
  return {
    ...(title && { title }),
    ...(description && { description }),
    ...(src && {
      image: {
        src: absolute(src),
        alt: property('og:image:alt') ?? '',
        ...(width && { width }),
        ...(height && { height }),
      },
    }),
  };
}
