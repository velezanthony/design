import type { ResolvedConfig } from '../config/resolve';
import type { SidebarItem } from '../config/schema';
import type { Page } from '../content/discovery';
import type { Availability, UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import {
  MissingTranslation,
  missingEntry,
  sourceLocale,
  type TranslationPolicies,
} from '../i18n/translation-policy';
import { resolveLabel } from './label';
import { toSidebarSlug } from './sidebar-slugs';

/** Página de la barra lateral. `badge` solo aparece en las `link`: es el idioma del original. */
export interface SidebarLeaf {
  label: string;
  href: string;
  slug: string;
  badge?: Locale;
}

/** Sección: enlaza su página índice si la hay y contiene hojas y otras secciones. */
export interface SidebarGroup {
  label: string;
  slug?: string;
  href?: string;
  badge?: Locale;
  items: SidebarNode[];
}

export type SidebarNode = SidebarLeaf | SidebarGroup;

export const isSidebarGroup = (node: SidebarNode): node is SidebarGroup => 'items' in node;

/** Lo que el árbol necesita de la config: idiomas y el orden declarado. */
type SidebarConfig = Pick<ResolvedConfig, 'locales' | 'defaultLocale' | 'sidebar'>;

/** Entrada de un slug en el idioma del árbol (`leaf` es `null` si la política la omite). */
interface Entry {
  slug: string;
  leaf: SidebarLeaf;
  order?: number;
}

/** Secciones anidadas como máximo hasta aquí: sección → sección → hoja son tres niveles. */
const MAX_SECTION_DEPTH = 2;

/** `getting-started` → `Getting started`. */
function humanize(segment: string): string {
  const text = segment.replace(/[-_]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toEntries(
  pages: Page[],
  av: Availability,
  locale: Locale,
  cfg: SidebarConfig,
  policies: TranslationPolicies,
  url: UrlPolicy,
): Entry[] {
  const entries: Entry[] = [];
  for (const [slug, available] of av) {
    const own = pages.find((page) => page.slug === slug && page.locale === locale);
    if (own) {
      const href = available[locale] ?? '';
      entries.push({
        slug,
        leaf: { label: own.title, slug, href },
        ...(own.order !== undefined && { order: own.order }),
      });
      continue;
    }
    const source = sourceLocale(available, cfg.locales, cfg.defaultLocale);
    const original = pages.find((page) => page.slug === slug && page.locale === source);
    if (!original) continue;
    const policy = policies.get(slug) ?? MissingTranslation.LINK;
    const leaf = missingEntry(slug, original.title, available, locale, policy, cfg, url);
    if (leaf) {
      entries.push({ slug, leaf, ...(original.order !== undefined && { order: original.order }) });
    }
  }
  return entries;
}

/** Nodo con la clave de orden de sus hermanos. */
interface Sortable {
  node: SidebarNode;
  key: string;
  order?: number;
}

/** Sección → hoja si no tiene hijas, nada si no tiene ni hijas ni página. */
function closeGroup(group: SidebarGroup): SidebarNode | undefined {
  if (group.items.length > 0) return group;
  if (!group.href || group.slug === undefined) return undefined;
  const { label, slug, href, badge } = group;
  return { label, slug, href, ...(badge && { badge }) };
}

/**
 * `base` es la carpeta que hace de raíz (la de una sección de la cabecera): no cuenta como nivel
 * y sus páginas cuelgan directamente de la raíz del árbol.
 */
function autoTree(entries: Entry[], collator: Intl.Collator, base = ''): SidebarNode[] {
  const rootDepth = base === '' ? 0 : base.split('/').length;
  const sectionPath = (slug: string) => {
    const segments = slug.split('/');
    const path = segments.slice(0, Math.min(segments.length - 1, rootDepth + MAX_SECTION_DEPTH));
    return path.length > rootDepth ? path : [];
  };
  const parentOf = (path: string) => {
    const parent = path.split('/').slice(0, -1);
    return parent.length > rootDepth ? parent.join('/') : '';
  };
  // Un slug es una sección si algún otro cuelga de él como carpeta.
  const sections = new Set<string>();
  for (const { slug } of entries) {
    const path = sectionPath(slug);
    for (let depth = rootDepth + 1; depth <= path.length; depth++) {
      sections.add(path.slice(0, depth).join('/'));
    }
  }

  const groups = new Map<string, { group: SidebarGroup; sort: Sortable[]; order?: number }>();
  const groupFor = (path: string) => {
    let found = groups.get(path);
    if (!found) {
      const label = humanize(path.split('/').pop() ?? path);
      found = { group: { label, items: [] }, sort: [] };
      groups.set(path, found);
    }
    return found;
  };
  const root: Sortable[] = [];

  for (const entry of entries) {
    const { slug, leaf } = entry;
    if (sections.has(slug)) {
      // Página índice: da nombre y destino a su sección.
      const found = groupFor(slug);
      Object.assign(found.group, { label: leaf.label, slug, href: leaf.href });
      if (leaf.badge) found.group.badge = leaf.badge;
      if (entry.order !== undefined) found.order = entry.order;
      continue;
    }
    const parent = sectionPath(slug).join('/');
    const target = parent ? groupFor(parent).sort : root;
    target.push({
      node: leaf,
      key: slug,
      ...(entry.order !== undefined && { order: entry.order }),
    });
  }

  const compare = (a: Sortable, b: Sortable) => {
    if (a.order !== undefined && b.order !== undefined && a.order !== b.order)
      return a.order - b.order;
    if ((a.order === undefined) !== (b.order === undefined)) return a.order === undefined ? 1 : -1;
    return collator.compare(a.key, b.key);
  };

  // Las secciones más profundas primero para colgarlas de su padre ya completo.
  const paths = [...sections].sort((a, b) => b.split('/').length - a.split('/').length);
  for (const path of paths) {
    const found = groupFor(path);
    found.group.items = found.sort.sort(compare).map(({ node }) => node);
    const closed = closeGroup(found.group);
    if (!closed) continue;
    const parent = parentOf(path);
    const sortable: Sortable = {
      node: closed,
      key: path,
      ...(found.order !== undefined && { order: found.order }),
    };
    (parent ? groupFor(parent).sort : root).push(sortable);
  }
  return root.sort(compare).map(({ node }) => node);
}

function declaredTree(
  items: SidebarItem[],
  bySlug: Map<string, Entry>,
  used: Set<string>,
  locale: Locale,
  defaultLocale: Locale,
): SidebarNode[] {
  const nodes: SidebarNode[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      const slug = toSidebarSlug(item);
      const entry = bySlug.get(slug);
      if (!entry) continue;
      used.add(slug);
      nodes.push(entry.leaf);
      continue;
    }
    const own = item.slug === undefined ? undefined : bySlug.get(toSidebarSlug(item.slug));
    if (own) used.add(own.slug);
    const group: SidebarGroup = {
      label: resolveLabel(item.label, locale, defaultLocale),
      items: declaredTree(item.items ?? [], bySlug, used, locale, defaultLocale),
      ...(own && { slug: own.slug, href: own.leaf.href }),
      ...(own?.leaf.badge && { badge: own.leaf.badge }),
    };
    const closed = closeGroup(group);
    if (closed) nodes.push(closed);
  }
  return nodes;
}

/**
 * Árbol de la barra lateral de un idioma, de hasta tres niveles. Sigue el orden declarado en la
 * config; lo no listado va detrás, por `order` del frontmatter y luego por `Intl.Collator` del
 * slug. Los slugs sin traducción en el idioma aplican su política (`link`, `fallback` u `omit`).
 * `base` es la carpeta raíz de una sección de la cabecera: lo no declarado se agrupa por debajo.
 */
export function buildSidebar(
  pages: Page[],
  av: Availability,
  locale: Locale,
  cfg: SidebarConfig,
  policies: TranslationPolicies,
  url: UrlPolicy,
  base = '',
): SidebarNode[] {
  const collator = new Intl.Collator(locale, { numeric: true });
  const entries = toEntries(pages, av, locale, cfg, policies, url);
  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const used = new Set<string>();
  const declared = declaredTree(cfg.sidebar ?? [], bySlug, used, locale, cfg.defaultLocale);
  const rest = autoTree(
    entries.filter((entry) => !used.has(entry.slug)),
    collator,
    base,
  );
  return [...declared, ...rest];
}

/** Hojas en orden de lectura; la página de cada sección va antes que sus hijas. */
export function flatten(tree: SidebarNode[]): SidebarLeaf[] {
  return tree.flatMap((node): SidebarLeaf[] => {
    if (!isSidebarGroup(node)) return [node];
    const own: SidebarLeaf[] =
      node.href && node.slug !== undefined
        ? [
            {
              label: node.label,
              slug: node.slug,
              href: node.href,
              ...(node.badge && { badge: node.badge }),
            },
          ]
        : [];
    return [...own, ...flatten(node.items)];
  });
}
