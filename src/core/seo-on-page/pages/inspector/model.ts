import type { Locale } from '../../../i18n/locale';
import { CATALOG, type Certainty, type Limit } from '../../catalog';
import { estimateWidth } from '../../pixels';
import { headingCounts, type HeadingCounts } from '../../queries/heading-counts';
import { outline, type OutlineItem } from '../../queries/outline';
import { THRESHOLDS } from '../../thresholds';
import type {
  DescriptionSource,
  Issue,
  IssueKind,
  IssueSeverity,
  MetaNode,
  SeoPage,
  SeoTree,
} from '../../tree/types';
import type { PanelLinks } from '../links';
import { localeTone, type LocaleTone } from '../listing/rows';
import { editHref } from '../../../navigation/edit-href';
import { ALL_SEVERITIES, SEVERITY_RANK } from '../../severity';
import { differing, lengthClass, type LengthClass } from './compare';
import { schemaTypes } from '../../tree/keys';

/** Una de las páginas con las que choca un problema (un título duplicado, por ejemplo). */
export interface RelatedPage {
  slug: string;
  href: string;
  /** El `<title>` de esa página en este idioma, si está en el árbol. */
  title: string | undefined;
}

/** Un problema de este idioma con todo lo que hace falta para arreglarlo y comprobarlo. */
export interface FixBlock {
  issue: Issue;
  certainty: Certainty;
  /** El rango recomendado, solo en los problemas de longitud. */
  limit: Limit | undefined;
  /** Cómo comprobar que ya está arreglado. */
  verify: string;
  related: RelatedPage[];
}

export interface LocaleSwitchItem {
  locale: Locale;
  /** Su peor gravedad («ok» sin problemas, «missing» si la página no existe en ese idioma). */
  tone: LocaleTone;
  current: boolean;
  /** Enlace a su inspector; la propia y la que no existe no enlazan. */
  href: string | undefined;
}

/** Cómo está un idioma de la página en la comparación de traducciones. */
export type ComparisonColumn =
  | {
      state: 'missing';
      locale: Locale;
      current: false;
      policy: string;
      declared: boolean;
      tone: 'missing';
    }
  /** Existe pero no está en el árbol: solo se sabe su URL. */
  | { state: 'unknown'; locale: Locale; current: false; url: string; tone: 'ok' }
  | {
      state: 'present';
      locale: Locale;
      /** Su peor gravedad: el color de su insignia. */
      tone: Exclude<LocaleTone, 'missing'>;
      current: boolean;
      href: string | undefined;
      title: string;
      titleLength: number;
      titleClass: LengthClass;
      description: string | undefined;
      descriptionLength: number | undefined;
      descriptionClass: LengthClass;
      descriptionSource: DescriptionSource;
      issues: { kind: IssueKind; severity: IssueSeverity }[];
      /** Las celdas que difieren de forma sospechosa del resto de idiomas. */
      differs: { titleLength: boolean; descriptionLength: boolean; descriptionSource: boolean };
    };

export interface InspectorModel {
  /** La página inspeccionada (slug vacío = portada) y su idioma. */
  slug: string;
  locale: Locale;
  header: {
    /** El `<title>` publicado. */
    title: string;
    locales: LocaleSwitchItem[];
    /** Los problemas de este idioma por gravedad: solo las que tienen alguno, la peor primero. */
    counts: { severity: IssueSeverity; count: number }[];
    noindex: boolean;
    /** Idiomas en los que existe la página y cuántos hay configurados. */
    presentIn: Locale[];
    total: number;
  };
  links: {
    pages: string;
    live: string;
    /** Dónde editar el archivo, si la config tiene `editUrl`. */
    edit: string | undefined;
  };
  fixes: FixBlock[];
  /** Los hechos del `<head>`: lo que se publica. */
  published: {
    title: string;
    titleLength: number;
    titleMin: number;
    titleMax: number;
    /** Ancho estimado en píxeles (una estimación, no una medida) y su límite aproximado. */
    titlePx: number;
    titleMaxPx: number;
    description: string | undefined;
    descriptionSource: DescriptionSource;
    descriptionLength: number | undefined;
    descriptionMin: number;
    descriptionMax: number;
    descriptionPx: number | undefined;
    descriptionMaxPx: number;
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
  schemas: {
    types: string[];
    source: 'site' | 'page';
    json: string;
    /** En cuántas páginas está, solo en los del sitio. */
    pages: number | undefined;
  }[];
  headings: { counts: HeadingCounts; outline: OutlineItem[] };
  /** La comparación entre idiomas; `undefined` si el sitio tiene uno solo. */
  translations: { columns: ComparisonColumn[] } | undefined;
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
  /** Base de edición del repositorio y ruta del archivo de esta página en él, si se conocen. */
  edit?: { url: string; path: string } | undefined;
}

/** Cuántas páginas (slugs, no idiomas) publican exactamente este schema del sitio. */
function pagesWith(tree: SeoTree, json: string): number {
  const slugs = new Set<string>();
  for (const page of tree.pages) {
    if (
      page.schemas.some(
        (item) => item.source === 'site' && JSON.stringify(item.schema, null, 2) === json,
      )
    ) {
      slugs.add(page.slug);
    }
  }
  return slugs.size;
}

function columnOf(
  entry: SeoPage['locales'][number],
  page: SeoPage,
  group: SeoPage[],
  links: PanelLinks,
): ComparisonColumn {
  if (entry.status === 'missing') {
    return {
      state: 'missing',
      locale: entry.locale,
      current: false,
      policy: entry.policy,
      declared: entry.declared,
      tone: 'missing',
    };
  }
  const sibling = group.find((item) => item.locale === entry.locale);
  if (!sibling)
    return {
      state: 'unknown',
      locale: entry.locale,
      current: false,
      url: entry.url,
      tone: 'ok',
    };
  const current = entry.locale === page.locale;
  const { meta } = sibling;
  return {
    state: 'present',
    locale: entry.locale,
    tone: localeTone(sibling),
    current,
    href: current ? undefined : links.inspector({ slug: page.slug, locale: entry.locale }),
    title: meta.title,
    titleLength: meta.titleLength,
    titleClass: lengthClass(meta.titleLength, THRESHOLDS.titleMin, THRESHOLDS.titleMax),
    description: meta.description,
    descriptionLength: meta.descriptionLength,
    descriptionClass: lengthClass(
      meta.descriptionLength,
      THRESHOLDS.descriptionMin,
      THRESHOLDS.descriptionMax,
    ),
    descriptionSource: meta.descriptionSource,
    issues: sibling.issues.map(({ kind, severity }) => ({ kind, severity })),
    differs: { titleLength: false, descriptionLength: false, descriptionSource: false },
  };
}

/** Marca en las columnas presentes las celdas que difieren de forma sospechosa entre idiomas. */
function markDifferences(columns: ComparisonColumn[]): ComparisonColumn[] {
  const present = columns.filter((column) => column.state === 'present');
  const title = differing(
    present.map((column) => column.titleClass),
    'ok',
  );
  const description = differing(
    present.map((column) => column.descriptionClass),
    'ok',
  );
  const source = differing(
    present.map((column) => column.descriptionSource),
    'page',
  );
  return columns.map((column) => {
    if (column.state !== 'present') return column;
    const index = present.indexOf(column);
    return {
      ...column,
      differs: {
        titleLength: title[index]!,
        descriptionLength: description[index]!,
        descriptionSource: source[index]!,
      },
    };
  });
}

/** `undefined` si no existe la página en ese idioma: la pantalla decide (404); aquí solo datos y enlaces ya formados. */
export function inspectorModel({
  tree,
  slug,
  locale,
  links,
  site,
  asset,
  edit,
}: InspectorInput): InspectorModel | undefined {
  const page = tree.pages.find((item) => item.slug === slug && item.locale === locale);
  if (!page) return undefined;
  const group = tree.pages.filter((item) => item.slug === slug);
  const { meta } = page;
  const displayUrl = new URL(meta.canonical, site).href;
  function titleOf(target: string) {
    return tree.pages.find((item) => item.slug === target && item.locale === locale)?.meta.title;
  }
  return {
    slug,
    locale,
    header: {
      title: meta.title,
      locales: page.locales.map((entry): LocaleSwitchItem => {
        const current = entry.locale === locale;
        const sibling =
          entry.status === 'present'
            ? group.find((item) => item.locale === entry.locale)
            : undefined;
        return {
          locale: entry.locale,
          tone: localeTone(sibling),
          current,
          href: sibling && !current ? links.inspector({ slug, locale: entry.locale }) : undefined,
        };
      }),
      counts: ALL_SEVERITIES.map((severity) => ({
        severity,
        count: page.issues.filter((issue) => issue.severity === severity).length,
      })).filter(({ count }) => count > 0),
      noindex: meta.noindex,
      presentIn: page.locales
        .filter((entry) => entry.status === 'present')
        .map((entry) => entry.locale),
      total: page.locales.length,
    },
    links: {
      pages: links.pages(),
      live: meta.canonical,
      edit: edit?.url && edit.path ? editHref(edit.url, edit.path) : undefined,
    },
    // `sort` es estable: a igual gravedad, se conserva el orden del análisis.
    fixes: [...page.issues]
      .sort((left, right) => SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity])
      .map((issue): FixBlock => {
        const related = issue.related ?? [];
        return {
          issue,
          certainty: CATALOG[issue.kind].certainty,
          limit: CATALOG[issue.kind].limit,
          verify: CATALOG[issue.kind].verify(related.map((other) => other.slug)),
          related: related.map((other) => ({
            slug: other.slug,
            href: links.inspector(other),
            title: titleOf(other.slug),
          })),
        };
      }),
    published: {
      title: meta.title,
      titleLength: meta.titleLength,
      titleMin: THRESHOLDS.titleMin,
      titleMax: THRESHOLDS.titleMax,
      titlePx: estimateWidth(meta.title, 'title'),
      titleMaxPx: THRESHOLDS.titleMaxPx,
      description: meta.description,
      descriptionSource: meta.descriptionSource,
      descriptionLength: meta.descriptionLength,
      descriptionMin: THRESHOLDS.descriptionMin,
      descriptionMax: THRESHOLDS.descriptionMax,
      descriptionPx:
        meta.description === undefined ? undefined : estimateWidth(meta.description, 'description'),
      descriptionMaxPx: THRESHOLDS.descriptionMaxPx,
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
    schemas: page.schemas.map(({ schema, source }) => {
      const json = JSON.stringify(schema, null, 2);
      return {
        types: schemaTypes([{ schema, source }]),
        source,
        json,
        pages: source === 'site' ? pagesWith(tree, json) : undefined,
      };
    }),
    headings: { counts: headingCounts(page.headings), outline: outline(page.headings) },
    translations:
      page.locales.length > 1
        ? {
            columns: markDifferences(
              page.locales.map((entry) => columnOf(entry, page, group, links)),
            ),
          }
        : undefined,
  };
}
