import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
vi.mock('./bound-animation-loops', () => ({
  boundAnimationLoops: vi.fn(async () => void calls.push('loops')),
}));
vi.mock('./prune-orphan-assets', () => ({
  pruneOrphanAssets: vi.fn(async () => void calls.push('prune')),
}));
vi.mock('./pagefind', () => ({ buildPagefindIndex: vi.fn(async () => void calls.push('index')) }));
vi.mock('./client-sitemap', () => ({
  addClientPagesToSitemap: vi.fn(async () => {
    calls.push('sitemap');
    return 0;
  }),
}));

const { runBuildDone } = await import('./build-done');

const built = {
  dir: new URL('file:///tmp/dist/'),
  pages: [],
  logger: { info: vi.fn() } as never,
  site: 'https://x.dev',
  base: '/',
  root: '/tmp',
  pagesFile: 'sitemap-pages.xml',
};

beforeEach(() => {
  calls.length = 0;
});

describe('runBuildDone', () => {
  it('acota las animaciones y poda los huérfanos antes de indexar, y el sitemap va el último', async () => {
    await runBuildDone({ ...built, ownSitemap: true });
    expect(calls).toEqual(['loops', 'prune', 'index', 'sitemap']);
  });

  it('con sitemap sustituido, los recursos y el índice siguen y el sitemap no se toca', async () => {
    await runBuildDone({ ...built, ownSitemap: false });
    expect(calls).toEqual(['loops', 'prune', 'index']);
  });
});
