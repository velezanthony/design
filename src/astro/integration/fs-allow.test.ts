import path from 'node:path';
import { searchForWorkspaceRoot } from 'vite';
import { describe, expect, it } from 'vitest';
import { contentFsAllow } from './fs-allow';

const root = path.resolve('playground');

describe('contentFsAllow', () => {
  it('con la carpeta dentro del proyecto no toca nada: Vite ya la sirve', () => {
    expect(contentFsAllow(root, 'src/content/docs')).toEqual([]);
    expect(contentFsAllow(root, 'documentacion')).toEqual([]);
  });

  it('con la carpeta fuera, la permite y conserva la raíz de workspace que Vite daría por defecto', () => {
    expect(contentFsAllow(root, '../docs')).toEqual([
      searchForWorkspaceRoot(root),
      path.resolve(root, '../docs'),
    ]);
  });
});
