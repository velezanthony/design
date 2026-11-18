import { describe, expect, it } from 'vitest';
import type { FooterConfig } from '../config/footer';
import type { Page } from '../content/discovery';
import { buildAvailability, type UrlPolicy } from '../i18n/availability';
import { MissingTranslation, resolvePolicies } from '../i18n/translation-policy';
import { defaultStrings, type UiStrings } from '../i18n/ui-strings';
import { buildFooter, validateFooter, DEFAULT_AUTHOR } from './footer';
import type { NavContext } from './nav-entries';

const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' };

const page = (slug: string, locale = 'en'): Page => ({
  slug,
  locale,
  title: slug || 'Home',
  kind: 'native',
  body: '',
  sourcePath: `${slug}.md`,
});

const pages = [page(''), page('changelog'), page('changelog', 'es'), page('only-en')];

const ctx = (locale = 'en'): NavContext => ({
  pages,
  av: buildAvailability(pages, url),
  locale,
  cfg: { locales: ['en', 'es'], defaultLocale: 'en' },
  policies: resolvePolicies(pages, MissingTranslation.LINK).policies,
  url,
  slug: '',
});

const strings = (locale: string) => defaultStrings[locale] as UiStrings;
const view = (cfg: { footer?: FooterConfig; social?: { github?: string } } = {}, locale = 'en') =>
  buildFooter(cfg, ctx(locale), strings(locale));

describe('buildFooter: derivaciones', () => {
  it('sin config: solo el autor por defecto, sin licencia ni enlaces', () => {
    expect(view()).toEqual({ author: DEFAULT_AUTHOR, links: [] });
    expect(DEFAULT_AUTHOR).toEqual({
      name: 'Anthony Velez',
      href: 'https://velezanthony.github.io/',
    });
  });

  it('repositorio y «informar de un error» salen de `social.github`', () => {
    const { links } = view({ social: { github: 'https://github.com/x/y' } });
    expect(links).toEqual([
      { label: 'Repository', href: 'https://github.com/x/y', external: true },
      { label: 'Report a bug', href: 'https://github.com/x/y/issues/new', external: true },
    ]);
  });

  it('una barra final en `social.github` no duplica la barra', () => {
    const { links } = view({ social: { github: 'https://github.com/x/y/' } });
    expect(links[1]?.href).toBe('https://github.com/x/y/issues/new');
  });

  it('sin `social.github` no hay ninguno de los dos', () => {
    expect(view().links).toEqual([]);
  });

  it('los textos derivados siguen el idioma', () => {
    const { links } = view({ social: { github: 'https://github.com/x/y' } }, 'es');
    expect(links.map((link) => link.label)).toEqual(['Repositorio', 'Informar de un error']);
  });

  it('`author: false` lo oculta; un autor propio sustituye al de por defecto', () => {
    expect(view({ footer: { author: false } }).author).toBeUndefined();
    const own = { name: 'Ana', href: 'https://ana.dev' };
    expect(view({ footer: { author: own } }).author).toEqual(own);
  });

  it('la licencia en texto no lleva enlace; con objeto sí, y su etiqueta se localiza', () => {
    expect(view({ footer: { license: 'MIT' } }).license).toEqual({ label: 'MIT' });
    const license = { label: { en: 'MIT', es: 'MIT (es)' }, href: 'https://x.dev/LICENSE' };
    expect(view({ footer: { license } }, 'es').license).toEqual({
      label: 'MIT (es)',
      href: 'https://x.dev/LICENSE',
    });
  });
});

describe('buildFooter: enlaces propios', () => {
  const links: FooterConfig['links'] = [
    { label: { en: 'Changes', es: 'Cambios' }, slug: 'changelog' },
    { label: 'Blog', href: 'https://blog.dev' },
  ];

  it('van antes de los derivados, con la etiqueta del idioma', () => {
    const out = view(
      { footer: { links }, social: { github: 'https://github.com/x/y' } },
      'es',
    ).links;
    expect(out.map((link) => link.label)).toEqual([
      'Cambios',
      'Blog',
      'Repositorio',
      'Informar de un error',
    ]);
    expect(out[0]).toEqual({ label: 'Cambios', href: '/repo/es/changelog/', external: false });
    expect(out[1]).toEqual({ label: 'Blog', href: 'https://blog.dev', external: true });
  });

  it('una página sin destino en este idioma se quita en vez de dejar un enlace roto', () => {
    const omitted = buildFooter(
      { footer: { links: [{ label: 'Solo', slug: 'only-en' }] } },
      {
        ...ctx('es'),
        policies: resolvePolicies(pages, MissingTranslation.OMIT).policies,
      },
      strings('es'),
    );
    expect(omitted.links).toEqual([]);
  });
});

describe('validateFooter', () => {
  const slugs = new Set(['', 'changelog']);

  it('un slug sin página falla con su ruta `footer.links[i].slug`', () => {
    const errors = validateFooter(
      [
        { label: 'A', slug: 'changelog' },
        { label: 'B', slug: 'nada' },
      ],
      slugs,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]?.describe()).toContain('footer.links[1].slug');
    expect(errors[0]?.describe()).toContain('nada');
  });

  it('acumula todos los fallos y deja pasar los enlaces https', () => {
    expect(validateFooter([{ label: 'B', href: 'https://b.dev' }], slugs)).toEqual([]);
    expect(
      validateFooter(
        [
          { label: 'A', slug: 'x' },
          { label: 'B', slug: 'y' },
        ],
        slugs,
      ),
    ).toHaveLength(2);
  });

  it('la portada se escribe `index`', () => {
    expect(validateFooter([{ label: 'H', slug: 'index' }], slugs)).toEqual([]);
  });
});
