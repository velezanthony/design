import type { Page } from '../../content/discovery';
import { buildAvailability } from '../../i18n/availability';
import {
  resolvePolicies,
  undeclaredMissing,
  type MissingTranslation,
} from '../../i18n/translation-policy';
import { resolveSchemas } from '../../seo/json-ld';
import { analyzeCanonical } from '../analyzers/canonical';
import { analyzeHeadings } from '../analyzers/headings';
import { analyzeAltText, analyzeOgImage } from '../analyzers/images';
import { analyzeLinks } from '../analyzers/links';
import { analyzeDuplicates, analyzeMetadata } from '../analyzers/metadata';
import { analyzeMultilingual } from '../analyzers/multilingual';
import { buildHeadingNodes } from '../nodes/headings';
import { buildLocaleEntries } from '../nodes/locales';
import { clientFacts } from '../nodes/client-page';
import { buildMetaNode } from '../nodes/meta';
import { navigationLinks } from '../nodes/navigation';
import type { SeoInput, SeoPageInput } from './input';
import type { Issue, SeoPage, SeoPageFacts, SeoTree } from './types';
import { pageKey } from './keys';

/** Comparación por unidades de código: no depende del idioma del sistema, así que es determinista. */
function compare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortPages(pages: SeoPageInput[]) {
  return [...pages].sort(
    (left, right) => compare(left.slug, right.slug) || compare(left.locale, right.locale),
  );
}

/**
 * Los helpers de i18n trabajan con `Page`, y de ella solo leen slug, idioma, política y rutas; el
 * cuerpo no interviene, así que se rellena vacío en vez de duplicar esos helpers.
 */
function asPage(page: SeoPageInput): Page {
  return { ...page, body: '' };
}

/**
 * Árbol de datos del análisis SEO on-page. Primero se componen los HECHOS de cada página con las
 * mismas funciones que genera el sitio (`resolveMeta`, `composeTitle`, `buildAvailability`,
 * políticas de traducción) y después los analizadores los juzgan. Pura y determinista: sin
 * rastreo ni lectura de HTML, el panel enseña por construcción lo que se publica.
 */
export function buildSeoTree(input: SeoInput): SeoTree {
  const { config, url, imageSizes } = input;
  const sorted = sortPages(input.pages);
  const pages = sorted.map(asPage);
  const availability = buildAvailability(pages, url);
  // Los conflictos de política los reporta `buildSeoTree` como incidencia (policy sin definir).
  const { policies } = resolvePolicies(pages, config.translations.missing);
  const undeclared = new Map(
    undeclaredMissing(pages, config.locales).map(({ slug, missing }) => [slug, new Set(missing)]),
  );

  const facts: SeoPageFacts[] = sorted.map((page) => {
    const policy: MissingTranslation | undefined = policies.get(page.slug);
    const entries = buildLocaleEntries(
      availability.get(page.slug) ?? {},
      config.locales,
      policy ?? config.translations.missing,
      (locale) => !undeclared.get(page.slug)?.has(locale),
    );
    return {
      slug: page.slug,
      locale: page.locale,
      title: page.title,
      kind: page.kind,
      sourcePath: page.sourcePath,
      meta: buildMetaNode(page, config, url, imageSizes),
      headings: buildHeadingNodes(page.headings),
      ...(page.links && { links: page.links }),
      ...(page.images && { images: page.images }),
      schemas: resolveSchemas(config.seo.schema, page.seo?.schema),
      locales: entries,
      ...(policy !== undefined && { policy }),
    };
  });

  const client = clientFacts(input.client ?? [], {
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    missing: config.translations.missing,
    base: url.base,
  });
  // Una página del cliente en la URL de una de la librería la sustituye: Astro publica la suya, así
  // que se analiza la suya y la de la librería sale del árbol. `clientFacts` conserva el orden.
  const libraryUrls = new Set(facts.map(({ meta }) => meta.canonical));
  const paths = (input.client ?? []).map(({ path }) => path);
  const library = facts.filter(({ meta }) => !paths.includes(meta.canonical));
  const own = client.map((page, index) =>
    libraryUrls.has(paths[index]!) ? { ...page, replaces: true as const } : page,
  );
  const all = [...library, ...own].sort(
    (left, right) => compare(left.slug, right.slug) || compare(left.locale, right.locale),
  );

  // Los duplicados se buscan entre TODAS: un título repetido entre una página del cliente y una
  // de la documentación compite igual en los resultados.
  const duplicates = new Map<string, Issue[]>();
  for (const issue of analyzeDuplicates(all)) {
    duplicates.set(pageKey(issue), [...(duplicates.get(pageKey(issue)) ?? []), issue]);
  }

  // El grafo de enlaces es solo de la documentación: de las páginas del cliente no se recogen sus
  // enlaces, y meterlas saldría en falsos «huérfana» (o impediría juzgar a las demás).
  const crossPage = new Map<string, Issue[]>();
  for (const issue of analyzeLinks(
    library,
    navigationLinks(pages, config, { url, availability, policies }),
  )) {
    crossPage.set(pageKey(issue), [...(crossPage.get(pageKey(issue)) ?? []), issue]);
  }

  return {
    pages: all.map((page): SeoPage => ({
      ...page,
      issues: [
        ...analyzeMetadata(page),
        ...(duplicates.get(pageKey(page)) ?? []),
        ...analyzeHeadings(page, page.headings),
        ...analyzeMultilingual(page, page.locales, page.policy, config.defaultLocale),
        ...analyzeCanonical({ ...page, canonical: page.meta.canonical }, page.locales),
        ...analyzeAltText(page, page.images),
        ...analyzeOgImage(page, page.meta),
        ...(crossPage.get(pageKey(page)) ?? []),
      ],
    })),
  };
}
