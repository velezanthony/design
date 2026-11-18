import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTROLLER,
  PRIVACY_LOCALES,
  PRIVACY_SECTION_IDS,
  hasPrivacyCopy,
  privacyCopy,
  type PrivacyBlock,
} from './copy';

function shape(blocks: PrivacyBlock[]) {
  return blocks.map((block) =>
    block.kind === 'table'
      ? [block.kind, block.head.length, block.rows.length]
      : block.kind === 'list'
        ? [block.kind, block.items.length]
        : [block.kind],
  );
}

describe('DEFAULT_CONTROLLER', () => {
  it('es el del portfolio', () => {
    expect(DEFAULT_CONTROLLER).toEqual({
      name: 'Anthony Velez Tapia',
      email: 'velezanthony2000@gmail.com',
    });
  });
});

describe('hasPrivacyCopy', () => {
  it('solo es y en tienen texto', () => {
    expect(PRIVACY_LOCALES).toEqual(['es', 'en']);
    expect(hasPrivacyCopy('es')).toBe(true);
    expect(hasPrivacyCopy('en')).toBe(true);
    expect(hasPrivacyCopy('fr')).toBe(false);
  });
});

describe('privacyCopy: completitud', () => {
  it.each(PRIVACY_LOCALES)('%s trae todas las secciones, en orden', (locale) => {
    const ids = privacyCopy(locale, DEFAULT_CONTROLLER).map((section) => section.id);
    expect(ids).toEqual([...PRIVACY_SECTION_IDS]);
  });

  it('es y en tienen la misma forma: bloques, columnas y filas', () => {
    const es = privacyCopy('es', DEFAULT_CONTROLLER);
    const en = privacyCopy('en', DEFAULT_CONTROLLER);
    expect(es.map((s) => shape(s.blocks))).toEqual(en.map((s) => shape(s.blocks)));
  });

  it.each(PRIVACY_LOCALES)('%s: cada fila de tabla tiene una celda por columna', (locale) => {
    for (const section of privacyCopy(locale, DEFAULT_CONTROLLER)) {
      for (const block of section.blocks) {
        if (block.kind !== 'table') continue;
        for (const row of block.rows) expect(row).toHaveLength(block.head.length);
      }
    }
  });

  it.each(PRIVACY_LOCALES)('%s: sin textos vacíos y enlaces solo https o mailto', (locale) => {
    const sections = privacyCopy(locale, DEFAULT_CONTROLLER);
    expect(JSON.stringify(sections)).not.toContain('""');
    for (const block of sections.flatMap((s) => s.blocks)) {
      if (block.kind !== 'links') continue;
      for (const { href } of block.items) expect(href).toMatch(/^(https:\/\/|mailto:)/);
    }
  });

  it('lista las cookies que borra el código de consentimiento', () => {
    const cookies = privacyCopy('es', DEFAULT_CONTROLLER).find((s) => s.id === 'cookies');
    const table = cookies?.blocks.find((block) => block.kind === 'table');
    expect(table?.kind === 'table' && table.rows.map((row) => row[0])).toEqual(['_ga', '_ga_<ID>']);
  });
});

describe('privacyCopy: contenido', () => {
  it.each(PRIVACY_LOCALES)('%s: usa el responsable que se le da, no uno fijo', (locale) => {
    const json = JSON.stringify(privacyCopy(locale, { name: 'Ada Test', email: 'ada@test.dev' }));
    expect(json).toContain('Ada Test');
    expect(json).toContain('mailto:ada@test.dev');
    expect(json).not.toContain(DEFAULT_CONTROLLER.name);
    expect(json).not.toContain(DEFAULT_CONTROLLER.email);
  });

  it.each(PRIVACY_LOCALES)('%s: declara que cubre las webs de documentación', (locale) => {
    const scope = privacyCopy(locale, DEFAULT_CONTROLLER).find((s) => s.id === 'scope');
    const prose = JSON.stringify(scope);
    expect(prose).toContain('velezanthony.github.io/<repo>/');
  });

  it.each(PRIVACY_LOCALES)(
    '%s: cubre almacenamiento, retención y retirada del consentimiento',
    (locale) => {
      const json = JSON.stringify(privacyCopy(locale, DEFAULT_CONTROLLER));
      expect(json).toContain('localStorage');
      expect(json).toContain('GitHub Pages');
      expect(json).toMatch(/art\. 6\.1\.a/);
      expect(json).toMatch(locale === 'es' ? /Preferencias de cookies/ : /Cookie preferences/);
      const retention = privacyCopy(locale, DEFAULT_CONTROLLER).find((s) => s.id === 'retention');
      expect(retention?.blocks.length).toBeGreaterThan(0);
    },
  );
});
