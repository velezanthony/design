import type { Locale } from '../../../i18n/locale';
import { outline, type OutlineItem } from '../../queries/outline';
import { THRESHOLDS } from '../../thresholds';
import type { DescriptionSource, Issue, MetaNode, SeoTree } from '../../tree/types';
import type { PanelLinks } from '../links';

export interface InspectorTranslation {
  locale: Locale;
  /** Es el idioma de la página que se está inspeccionando. */
  current: boolean;
}

export type TranslationCard = InspectorTranslation &
  (
    | { state: 'missing'; policy: string; declared: boolean }
    | {
        state: 'present';
        url: string;
        /** El resumen de esa traducción, si está en el árbol; si no, la tarjeta solo enseña la URL. */
        summary: { title: string; description: string | undefined; problems: number } | undefined;
        /** Enlace a su inspector; la propia página no se enlaza a sí misma. */
        inspectHref: string | undefined;
      }
  );

export interface InspectorModel {
  /** La página inspeccionada (slug vacío = portada) y su idioma. */
  slug: string;
  locale: Locale;
  links: { pages: string; live: string };
  /** Los hechos del `<head>`: lo que se publica. */
  published: {
    title: string;
    titleLength: number;
    titleMax: number;
    description: string | undefined;
    descriptionSource: DescriptionSource;
    descriptionLength: number | undefined;
    descriptionMax: number;
    canonical: string;
    noindex: boolean;
    sourcePath: string;
  };
  previews: {
    serp: {
      title: string;
      /** URL absoluta (`site` + ruta): la que enseña el buscador. */
      url: string;
      description: string | undefined;
      titleMax: number;
      descriptionMax: number;
    };
    og: {
      title: string;
      description: string | undefined;
      host: string;
      image: NonNullable<MetaNode['ogImage']> | undefined;
    };
  };
  issues: { issue: Issue; related: { slug: string; href: string }[] }[];
  schemas: { types: string[]; source: 'site' | 'page'; json: string }[];
  outline: OutlineItem[];
  translations: TranslationCard[];
}

interface InspectorInput {
  tree: SeoTree;
  /** La página que se pide (slug vacío = portada) y su idioma. */
  slug: string;
  locale: Locale;
  links: PanelLinks;
  /** URL del sitio (`site` de Astro): el `canonical` del árbol no la lleva. */
  site: string;
  /** `src` de una imagen resoluble por el navegador (la local cuelga de `base`). */
  asset: (src: string) => string;
}

/**
 * Lo que enseña el inspector de una página, una sección por clave. `undefined` si no existe esa
 * página en ese idioma: es la pantalla quien decide qué decir (un 404). Los textos y las etiquetas
 * son de la UI; aquí solo hay datos y enlaces ya formados.
 */
export function inspectorModel({
  tree,
  slug,
  locale,
  links,
  site,
  asset,
}: InspectorInput): InspectorModel | undefined {
  const page = tree.pages.find((item) => item.slug === slug && item.locale === locale);
  if (!page) return undefined;
  const group = tree.pages.filter((item) => item.slug === slug);
  const { meta } = page;
  const displayUrl = new URL(meta.canonical, site).href;
  return {
    slug,
    locale,
    links: { pages: links.pages(), live: meta.canonical },
    published: {
      title: meta.title,
      titleLength: meta.titleLength,
      titleMax: THRESHOLDS.titleMax,
      description: meta.description,
      descriptionSource: meta.descriptionSource,
      descriptionLength: meta.descriptionLength,
      descriptionMax: THRESHOLDS.descriptionMax,
      canonical: meta.canonical,
      noindex: meta.noindex,
      sourcePath: page.sourcePath,
    },
    previews: {
      serp: {
        title: meta.title,
        url: displayUrl,
        description: meta.description,
        titleMax: THRESHOLDS.titleMax,
        descriptionMax: THRESHOLDS.descriptionMax,
      },
      og: {
        title: meta.ogTitle,
        description: meta.ogDescription,
        host: new URL(displayUrl).host,
        image: meta.ogImage ? { ...meta.ogImage, src: asset(meta.ogImage.src) } : undefined,
      },
    },
    issues: page.issues.map((issue) => ({
      issue,
      related: (issue.related ?? []).map((other) => ({
        slug: other.slug,
        href: links.inspector(other),
      })),
    })),
    schemas: page.schemas.map(({ schema, source }) => ({
      types: [schema['@type']].flat(),
      source,
      json: JSON.stringify(schema, null, 2),
    })),
    outline: outline(page.headings),
    translations: page.locales.map((entry): TranslationCard => {
      const current = entry.locale === page.locale;
      if (entry.status === 'missing') {
        return {
          state: 'missing',
          locale: entry.locale,
          current,
          policy: entry.policy,
          declared: entry.declared,
        };
      }
      const sibling = group.find((item) => item.locale === entry.locale);
      return {
        state: 'present',
        locale: entry.locale,
        current,
        url: entry.url,
        summary: sibling && {
          title: sibling.meta.title,
          description: sibling.meta.description,
          problems: sibling.issues.length,
        },
        inspectHref: current ? undefined : links.inspector({ slug, locale: entry.locale }),
      };
    }),
  };
}
