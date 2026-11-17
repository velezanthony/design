import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { modeOf, readAnalyticsEnv } from './analytics-env';

afterEach(() => vi.unstubAllEnvs());

describe('modeOf', () => {
  it('`dev` es development y todo lo demás production', () => {
    expect(modeOf('dev')).toBe('development');
    expect(modeOf('build')).toBe('production');
    expect(modeOf('preview')).toBe('production');
    expect(modeOf('sync')).toBe('production');
  });
});

describe('readAnalyticsEnv con una fuente inyectada', () => {
  it('pide solo las PUBLIC_ del modo y la raíz del proyecto', () => {
    const load = vi.fn(() => ({ PUBLIC_GTM_ID: 'GTM-ABC123' }));
    expect(readAnalyticsEnv('dev', new URL('file:///site/'), load)).toBe('GTM-ABC123');
    expect(load).toHaveBeenCalledWith('development', '/site/', 'PUBLIC_');
  });

  it('sin la variable devuelve undefined', () => {
    expect(readAnalyticsEnv('build', new URL('file:///site/'), () => ({}))).toBeUndefined();
  });
});

describe('readAnalyticsEnv con Vite de verdad', () => {
  const project = (files: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), 'design-env-'));
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    return { dir, root: pathToFileURL(`${dir}/`), clean: () => rmSync(dir, { recursive: true }) };
  };

  it('lee .env.production al construir y .env.development en dev', () => {
    const site = project({
      '.env.production': 'PUBLIC_GTM_ID=GTM-PROD001\n',
      '.env.development': 'PUBLIC_GTM_ID=GTM-DEV0001\n',
    });
    try {
      expect(readAnalyticsEnv('build', site.root)).toBe('GTM-PROD001');
      expect(readAnalyticsEnv('dev', site.root)).toBe('GTM-DEV0001');
    } finally {
      site.clean();
    }
  });

  it('el entorno del proceso (CI) gana al archivo', () => {
    const site = project({ '.env': 'PUBLIC_GTM_ID=GTM-FILE001\n' });
    try {
      vi.stubEnv('PUBLIC_GTM_ID', 'GTM-CI00001');
      expect(readAnalyticsEnv('build', site.root)).toBe('GTM-CI00001');
    } finally {
      site.clean();
    }
  });

  it('sin archivo ni variable no hay valor', () => {
    const site = project({});
    try {
      vi.stubEnv('PUBLIC_GTM_ID', '');
      expect(readAnalyticsEnv('build', site.root)).toBeFalsy();
    } finally {
      site.clean();
    }
  });
});
