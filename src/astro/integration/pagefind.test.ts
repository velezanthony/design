import { beforeEach, describe, expect, it, vi } from 'vitest';

const index = {
  addDirectory: vi.fn(),
  writeFiles: vi.fn(),
};
const pagefind = {
  createIndex: vi.fn(),
  close: vi.fn(),
};
vi.mock('pagefind', () => pagefind);

const { buildPagefindIndex } = await import('./pagefind');

const info = vi.fn();
const fork = vi.fn(() => ({ info }));
const logger = { fork } as never;
const dir = new URL('file:///tmp/dist/');

beforeEach(() => {
  vi.clearAllMocks();
  pagefind.createIndex.mockResolvedValue({ index, errors: [] });
  index.addDirectory.mockResolvedValue({ errors: [], page_count: 3 });
  index.writeFiles.mockResolvedValue({ errors: [] });
});

describe('buildPagefindIndex', () => {
  it('crea, indexa, escribe en dist/pagefind/ y cierra', async () => {
    await buildPagefindIndex(dir, logger);
    expect(index.addDirectory).toHaveBeenCalledWith({ path: '/tmp/dist/' });
    expect(index.writeFiles).toHaveBeenCalledWith({ outputPath: '/tmp/dist/pagefind/' });
    expect(pagefind.close).toHaveBeenCalledOnce();
    expect(info).toHaveBeenCalledWith('3 páginas indexadas.');
  });

  it('registra con un logger propio', async () => {
    await buildPagefindIndex(dir, logger);
    expect(fork).toHaveBeenCalledWith('design:pagefind');
  });

  it.each([
    ['crear', () => pagefind.createIndex.mockResolvedValue({ index: undefined, errors: ['e1'] })],
    ['indexar', () => index.addDirectory.mockResolvedValue({ errors: ['e2'], page_count: 0 })],
    ['escribir', () => index.writeFiles.mockResolvedValue({ errors: ['e3'] })],
  ])('un error al %s se convierte en excepción y aun así cierra', async (_name, arrange) => {
    arrange();
    await expect(buildPagefindIndex(dir, logger)).rejects.toThrow(/Pagefind/);
    expect(pagefind.close).toHaveBeenCalledOnce();
  });
});
