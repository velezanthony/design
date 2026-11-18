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
import { buildMetaNode } from '../nodes/meta';
import { navigationLinks } from '../nodes/navigation';
import type { SeoInput, SeoPageInput } from './input';
import type { Issue, SeoPage, SeoPageFacts, SeoTree } from './types';

/** Comparación por unidades de código: no depende del idioma del sistema, así que es determinista. */
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const sortPages = (pages: SeoPageInput[]) =>
  [...pages].sort((a, b) => compare(a.slug, b.slug) || compare(a.locale, b.locale));

const keyOf = (page: { slug: string; locale: string }) => `${page.slug}\u0000${page.locale}`;

/**
 * Los helpers de i18n trabajan con `Page`, y de ella solo leen slug, idioma, política y rutas; el
 * cuerpo no interviene, así que se rellena vacío en vez de duplicar esos helpers.
 */
const asPage = (page: SeoPageInput): Page => ({ ...page, body: '' });

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
      false,
    ).map((entry) =>
      entry.status === 'missing'
        ? { ...entry, declared: !undeclared.get(page.slug)?.has(entry.locale) }
        : entry,
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

  const duplicates = new Map<string, Issue[]>();
  for (const issue of analyzeDuplicates(facts)) {
    duplicates.set(keyOf(issue), [...(duplicates.get(keyOf(issue)) ?? []), issue]);
  }

  const crossPage = new Map<string, Issue[]>();
  for (const issue of analyzeLinks(facts, navigationLinks(pages, config, url))) {
    crossPage.set(keyOf(issue), [...(crossPage.get(keyOf(issue)) ?? []), issue]);
  }

  return {
    pages: facts.map((page): SeoPage => ({
      ...page,
      issues: [
        ...analyzeMetadata(page),
        ...(duplicates.get(keyOf(page)) ?? []),
        ...analyzeHeadings(page, page.headings),
        ...analyzeMultilingual(page, page.locales, page.policy, config.defaultLocale),
        ...analyzeCanonical({ ...page, canonical: page.meta.canonical }, page.locales),
        ...analyzeAltText(page, page.images),
        ...analyzeOgImage(page, page.meta),
        ...(crossPage.get(keyOf(page)) ?? []),
      ],
    })),
  };
}
