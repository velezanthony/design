import { describe, expect, it } from 'vitest';
import type { PageLink, SeoPageFacts } from '../tree/types';
import { analyzeLinks } from './links';

const facts = (
  slug: string,
  options: { links?: PageLink[]; noindex?: boolean; locale?: string } = {},
): SeoPageFacts => ({
  slug,
  locale: options.locale ?? 'en',
  title: slug,
  kind: 'native',
  sourcePath: `${slug || 'index'}.md`,
  meta: {
    title: slug,
    titleLength: 30,
    descriptionSource: 'page',
    ogTitle: slug,
    ogImageSource: 'none',
    canonical: `/${slug}/`,
    noindex: options.noindex ?? false,
  },
  headings: [],
  schemas: [],
  locales: [],
  ...('links' in options ? { links: options.links } : { links: [] }),
});
const to = (slug: string, locale = 'en'): PageLink => ({ slug, locale });
const kinds = (issues: { kind: string }[]) => issues.map((issue) => issue.kind);
const forPage = (issues: ReturnType<typeof analyzeLinks>, slug: string) =>
  issues.filter((issue) => issue.slug === slug);

describe('analyzeLinks: enlaces a páginas noindex', () => {
  it('una página indexable que enlaza a una noindex: aviso con la noindex como relacionada', () => {
    const issues = analyzeLinks(
      [facts('a', { links: [to('secret')] }), facts('secret', { noindex: true })],
      new Map(),
    );
    const [issue] = forPage(issues, 'a').filter((i) => i.kind === 'link-to-noindex');
    expect(issue).toMatchObject({
      severity: 'info',
      value: 1,
      related: [{ slug: 'secret', locale: 'en' }],
    });
    expect(issue!.fix).toContain('a.md');
  });

  it('varias noindex enlazadas: una incidencia con el recuento', () => {
    const issues = analyzeLinks(
      [
        facts('a', { links: [to('s1'), to('s2')] }),
        facts('s1', { noindex: true }),
        facts('s2', { noindex: true }),
      ],
      new Map(),
    );
    const [issue] = forPage(issues, 'a').filter((i) => i.kind === 'link-to-noindex');
    expect(issue).toMatchObject({ value: 2 });
    expect(issue!.message).toBe('El cuerpo enlaza a 2 páginas noindex.');
  });

  it('una sola noindex enlazada se dice en singular', () => {
    const issues = analyzeLinks(
      [facts('a', { links: [to('secret')] }), facts('secret', { noindex: true })],
      new Map(),
    );
    expect(forPage(issues, 'a')[0]!.message).toBe('El cuerpo enlaza a una página noindex.');
  });

  it('una página noindex que enlaza a otra noindex no dice nada: no compite en los resultados', () => {
    const issues = analyzeLinks(
      [facts('a', { noindex: true, links: [to('secret')] }), facts('secret', { noindex: true })],
      new Map(),
    );
    expect(kinds(issues)).not.toContain('link-to-noindex');
  });

  it('enlazar a una página indexable no es un problema', () => {
    const issues = analyzeLinks(
      [facts('a', { links: [to('b')] }), facts('b', { links: [to('a')] })],
      new Map(),
    );
    expect(kinds(issues)).toEqual([]);
  });

  it('cuenta el idioma: la noindex en otro idioma no es el destino', () => {
    const issues = analyzeLinks(
      [
        facts('a', { links: [to('b', 'en')] }),
        facts('b', { links: [to('a')] }),
        facts('b', { locale: 'es', noindex: true }),
      ],
      new Map(),
    );
    expect(kinds(issues)).not.toContain('link-to-noindex');
  });

  it('sin dato de enlaces no se juzga', () => {
    const page = facts('a');
    delete page.links;
    expect(analyzeLinks([page, facts('secret', { noindex: true })], new Map())).toEqual([]);
  });
});

describe('analyzeLinks: páginas huérfanas', () => {
  it('una página que nadie enlaza es huérfana (info)', () => {
    const issues = analyzeLinks(
      [facts('home'), facts('a', { links: [to('b')] }), facts('b'), facts('lonely')],
      new Map(),
    );
    const orphans = issues.filter((issue) => issue.kind === 'orphan-page').map((i) => i.slug);
    expect(orphans.sort()).toEqual(['a', 'home', 'lonely']);
    expect(forPage(issues, 'lonely')[0]).toMatchObject({ severity: 'info' });
  });

  it('la portada nunca es huérfana', () => {
    const issues = analyzeLinks([facts(''), facts('a')], new Map());
    expect(forPage(issues, '')).toEqual([]);
  });

  it('enlazarse a sí misma no la saca de huérfana', () => {
    const issues = analyzeLinks([facts('a', { links: [to('a')] }), facts('b')], new Map());
    expect(forPage(issues, 'a').map((i) => i.kind)).toEqual(['orphan-page']);
  });

  it('un enlace de la navegación cuenta como entrante', () => {
    const navigation = new Map([['x\u0000en', [to('lonely')]]]);
    const issues = analyzeLinks([facts('x'), facts('lonely'), facts('')], navigation);
    expect(forPage(issues, 'lonely')).toEqual([]);
  });

  it('un enlace desde una página noindex también cuenta: el rastreador lo sigue', () => {
    const issues = analyzeLinks(
      [facts('hidden', { noindex: true, links: [to('b')] }), facts('b')],
      new Map(),
    );
    expect(forPage(issues, 'b')).toEqual([]);
  });

  it('el enlace es por idioma: que exista el gemelo en otro idioma no la salva', () => {
    const issues = analyzeLinks(
      [facts('a', { links: [to('b', 'en')] }), facts('b'), facts('b', { locale: 'es' })],
      new Map(),
    );
    expect(
      forPage(issues, 'b')
        .filter((i) => i.locale === 'es')
        .map((i) => i.kind),
    ).toEqual(['orphan-page']);
  });

  it('una página noindex no se juzga: no compite en los resultados', () => {
    expect(forPage(analyzeLinks([facts('x', { noindex: true })], new Map()), 'x')).toEqual([]);
  });

  it('si alguna página no trae sus enlaces, no se juzga a nadie: faltaría el dato', () => {
    const incomplete = facts('a');
    delete incomplete.links;
    expect(kinds(analyzeLinks([incomplete, facts('b')], new Map()))).toEqual([]);
  });

  it('el arreglo dice cómo enlazarla y dónde declararla en la navegación', () => {
    const issues = analyzeLinks([facts('a'), facts('lonely')], new Map());
    const fix = forPage(issues, 'lonely')[0]!.fix!;
    expect(fix).toContain('docs.config.mjs');
    expect(fix).toContain('lonely.md');
  });

  it('el enlace que propone usa solo el nombre del archivo, no su carpeta', () => {
    const lonely = { ...facts('lonely'), sourcePath: 'guides/lonely.md' };
    const fix = forPage(analyzeLinks([facts('a'), lonely], new Map()), 'lonely')[0]!.fix!;
    expect(fix).toContain('(./lonely.md)');
    expect(fix).not.toContain('guides/');
  });
});
