import type { ResolvedConfig } from '../config/resolve';
import type { SidebarItem } from '../config/schema';
import type { SidebarDepth } from '../config/sidebar-depth';
import type { Page } from '../content/discovery';
import { listsFolder } from '../content/generated-listings';
import { urlSlugOf } from '../content/slug';
import { pageUrl, type Availability, type UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import {
  MissingTranslation,
  sourceLocale,
  type TranslationPolicies,
} from '../i18n/translation-policy';
import { folderLabel } from '../shared/text';
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
  /** Solo en los grupos del árbol automático: la carpeta que agrupan (`guia/avanzado`). */
  dir?: string;
  slug?: string;
  href?: string;
  badge?: Locale;
  items: SidebarNode[];
}

export type SidebarNode = SidebarLeaf | SidebarGroup;
export type { SidebarDepth };

export function isSidebarGroup(node: SidebarNode): node is SidebarGroup {
  return 'items' in node;
}

/** Lo que el árbol necesita de la config: idiomas, el orden declarado y el límite del árbol automático. */
type SidebarConfig = Pick<ResolvedConfig, 'locales' | 'defaultLocale' | 'sidebar' | 'sidebarDepth'>;

/** Entrada de un slug en el idioma del árbol (`leaf` es `null` si la política la omite). */
interface Entry {
  slug: string;
  leaf: SidebarLeaf;
  order?: number;
  /** Lista su carpeta (generada o de un `_index.md`): solo da título y destino al grupo de su carpeta. */
  listing?: true;
}

function toEntries(
  pages: Page[],
  availability: Availability,
  locale: Locale,
  config: SidebarConfig,
  policies: TranslationPolicies,
  url: UrlPolicy,
): Entry[] {
  const entries: Entry[] = [];
  for (const [slug, available] of availability) {
    const own = pages.find((page) => page.slug === slug && page.locale === locale);
    if (own) {
      const href = available[locale] ?? '';
      entries.push({
        slug,
        leaf: { label: own.title, slug, href },
        ...(own.order !== undefined && { order: own.order }),
        ...(listsFolder(own) && { listing: true }),
      });
      continue;
    }
    const source = sourceLocale(available, config.locales, config.defaultLocale);
    const original = pages.find((page) => page.slug === slug && page.locale === source);
    if (!original) continue;
    const policy = policies.get(slug) ?? MissingTranslation.LINK;
    const leaf = missingEntry(
      slug,
      original.title,
      available,
      locale,
      policy,
      config,
      url,
      urlSlugOf(original),
    );
    if (leaf) {
      entries.push({
        slug,
        leaf,
        ...(original.order !== undefined && { order: original.order }),
        ...(listsFolder(original) && { listing: true }),
      });
    }
  }
  return entries;
}

/** Hoja de un idioma sin traducción: `link` al original con insignia, `fallback` a la reserva, `omit` nada. */
export function missingEntry(
  slug: string,
  title: string,
  available: Partial<Record<Locale, string>>,
  locale: Locale,
  policy: MissingTranslation,
  config: Pick<ResolvedConfig, 'locales' | 'defaultLocale'>,
  url: UrlPolicy,
  /** URL del original sin idioma ni base (su `slug` propio): la reserva la reutiliza con el prefijo del idioma. */
  sourceUrlSlug = slug,
): SidebarLeaf | null {
  switch (policy) {
    case MissingTranslation.LINK: {
      const source = sourceLocale(available, config.locales, config.defaultLocale);
      return {
        label: title,
        slug,
        href: available[source] ?? pageUrl(sourceUrlSlug, source, url),
        badge: source,
      };
    }
    case MissingTranslation.FALLBACK:
      return { label: title, slug, href: pageUrl(sourceUrlSlug, locale, url) };
    case MissingTranslation.OMIT:
      return null;
  }
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

/** `base` es la carpeta raíz de una sección: no cuenta como nivel y sus páginas cuelgan de la raíz del árbol. */
function autoTree(
  entries: Entry[],
  collator: Intl.Collator,
  base = '',
  depth?: SidebarDepth,
): SidebarNode[] {
  const rootDepth = base === '' ? 0 : base.split('/').length;
  /* ¿Cabe la carpeta `folder` como grupo? La limita la carpeta de `overrides` más cercana por
     encima, contando desde ella, o si no hay ninguna `default`, contando desde la raíz del árbol. */
  function allowed(folder: string[]) {
    for (let anchor = folder.length - 1; anchor > 0; anchor--) {
      const limit = depth?.overrides[folder.slice(0, anchor).join('/')];
      if (limit !== undefined) return folder.length - anchor <= limit;
    }
    return depth?.default === undefined || folder.length - rootDepth <= depth.default;
  }
  // La sección de una página es su carpeta, a cualquier profundidad: un grupo por nivel, hasta la
  // primera carpeta que no cabe; lo de debajo cuelga, plano, del último grupo permitido.
  function sectionPath(slug: string) {
    const path = slug.split('/').slice(0, -1);
    let length = rootDepth;
    while (length < path.length && allowed(path.slice(0, length + 1))) length++;
    return length > rootDepth ? path.slice(0, length) : [];
  }
  function parentOf(path: string) {
    const parent = path.split('/').slice(0, -1);
    return parent.length > rootDepth ? parent.join('/') : '';
  }
  // Un slug es una sección si algún otro cuelga de él como carpeta.
  const sections = new Set<string>();
  for (const { slug } of entries) {
    const path = sectionPath(slug);
    for (let depth = rootDepth + 1; depth <= path.length; depth++) {
      sections.add(path.slice(0, depth).join('/'));
    }
  }

  const groups = new Map<
    string,
    { group: SidebarGroup; sort: Sortable[]; order?: number; listing?: true }
  >();
  function groupFor(path: string) {
    let found = groups.get(path);
    if (!found) {
      found = { group: { label: folderLabel(path), dir: path, items: [] }, sort: [] };
      groups.set(path, found);
    }
    return found;
  }
  const root: Sortable[] = [];

  for (const entry of entries) {
    const { slug, leaf } = entry;
    if (sections.has(slug)) {
      // Página índice: da nombre y destino a su sección.
      const found = groupFor(slug);
      Object.assign(found.group, { label: leaf.label, slug, href: leaf.href });
      if (leaf.badge) found.group.badge = leaf.badge;
      if (entry.order !== undefined) found.order = entry.order;
      if (entry.listing) found.listing = true;
      continue;
    }
    // Una página que lista su carpeta nunca sale como hoja suelta: sin grupo, no sale. Salvo la de la
    // raíz del árbol (el `dir` de una sección), que no tiene grupo propio y es el destino de la sección.
    if (entry.listing && slug !== base) continue;
    const parent = sectionPath(slug).join('/');
    const target = parent ? groupFor(parent).sort : root;
    target.push({
      node: leaf,
      key: slug,
      ...(entry.order !== undefined && { order: entry.order }),
    });
  }

  function compare(left: Sortable, right: Sortable) {
    if (left.order !== undefined && right.order !== undefined && left.order !== right.order)
      return left.order - right.order;
    if ((left.order === undefined) !== (right.order === undefined))
      return left.order === undefined ? 1 : -1;
    return collator.compare(left.key, right.key);
  }

  // Las secciones más profundas primero para colgarlas de su padre ya completo.
  const paths = [...sections].sort(
    (left, right) => right.split('/').length - left.split('/').length,
  );
  for (const path of paths) {
    const found = groupFor(path);
    found.group.items = found.sort.sort(compare).map(({ node }) => node);
    // Un grupo vacío cuya página lista su carpeta no se vuelve hoja: no queda nada que listar en él.
    const closed =
      found.listing && found.group.items.length === 0 ? undefined : closeGroup(found.group);
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

/** Slugs que reclama el `sidebar` declarado (`used`) y, de ellos, los escritos como hoja (`leaves`). */
function claimedSlugs(
  items: SidebarItem[],
  bySlug: Map<string, Entry>,
  claimed = { used: new Set<string>(), leaves: new Set<string>() },
): { used: Set<string>; leaves: Set<string> } {
  for (const item of items) {
    if (typeof item === 'string') {
      const slug = toSidebarSlug(item);
      if (!bySlug.has(slug)) continue;
      claimed.used.add(slug);
      claimed.leaves.add(slug);
      continue;
    }
    const own = item.slug === undefined ? undefined : toSidebarSlug(item.slug);
    if (own !== undefined && bySlug.has(own)) claimed.used.add(own);
    claimedSlugs(item.items ?? [], bySlug, claimed);
  }
  return claimed;
}

/** Saca del árbol el nodo de `slug` (grupo o hoja); el grupo que lo contenía se cierra si queda vacío. */
function detach(nodes: SidebarNode[], slug: string): { node?: SidebarNode; nodes: SidebarNode[] } {
  for (const [index, node] of nodes.entries()) {
    function without(replacement?: SidebarNode) {
      return [
        ...nodes.slice(0, index),
        ...(replacement ? [replacement] : []),
        ...nodes.slice(index + 1),
      ];
    }
    if (node.slug === slug) return { node, nodes: without() };
    if (!isSidebarGroup(node)) continue;
    const inner = detach(node.items, slug);
    if (!inner.node) continue;
    return { node: inner.node, nodes: without(closeGroup({ ...node, items: inner.nodes })) };
  }
  return { nodes };
}

/** `merged`: el grupo automático que ocupa el sitio de un slug declarado que es la página de una carpeta. */
function declaredTree(
  items: SidebarItem[],
  bySlug: Map<string, Entry>,
  merged: Map<string, SidebarNode>,
  locale: Locale,
  defaultLocale: Locale,
): SidebarNode[] {
  const nodes: SidebarNode[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      const slug = toSidebarSlug(item);
      const entry = bySlug.get(slug);
      if (!entry) continue;
      nodes.push(merged.get(slug) ?? entry.leaf);
      continue;
    }
    const own = item.slug === undefined ? undefined : bySlug.get(toSidebarSlug(item.slug));
    const group: SidebarGroup = {
      label: resolveLabel(item.label, locale, defaultLocale),
      items: declaredTree(item.items ?? [], bySlug, merged, locale, defaultLocale),
      ...(own && { slug: own.slug, href: own.leaf.href }),
      ...(own?.leaf.badge && { badge: own.leaf.badge }),
    };
    const closed = closeGroup(group);
    if (closed) nodes.push(closed);
  }
  return nodes;
}

/** Árbol del sidebar de un idioma (un grupo por carpeta, a cualquier profundidad): orden declarado, luego `order` y `Intl.Collator`; sin traducción aplica su política. */
export function buildSidebar(
  pages: Page[],
  availability: Availability,
  locale: Locale,
  config: SidebarConfig,
  policies: TranslationPolicies,
  url: UrlPolicy,
  base = '',
): SidebarNode[] {
  const collator = new Intl.Collator(locale, { numeric: true });
  const entries = toEntries(pages, availability, locale, config, policies, url);
  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const items = config.sidebar ?? [];
  const { used, leaves } = claimedSlugs(items, bySlug);
  /* Un slug declarado como hoja que es la página de una carpeta con páginas sin declarar se fusiona
     con el grupo automático de esa carpeta: el árbol automático lo monta con ella dentro y el grupo
     pasa a la posición declarada. */
  const folderPages = [...leaves].filter(
    (slug) =>
      slug !== '' &&
      entries.some((entry) => !used.has(entry.slug) && entry.slug.startsWith(`${slug}/`)),
  );
  let rest = autoTree(
    entries.filter((entry) => !used.has(entry.slug) || folderPages.includes(entry.slug)),
    collator,
    base,
    config.sidebarDepth,
  );
  const merged = new Map<string, SidebarNode>();
  for (const slug of folderPages) {
    const detached = detach(rest, slug);
    rest = detached.nodes;
    if (detached.node) merged.set(slug, detached.node);
  }
  const declared = declaredTree(items, bySlug, merged, locale, config.defaultLocale);
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
