/** El `--api`: un JSON `identificador -> Markdown` generado por `api/generate-api.py`, limpio y con la cuenta de enlaces quitados. */
import { cleanGeneratedApi } from '../api/api-postprocess.ts';

export interface ApiResolver {
  resolveApi: (identifier: string) => string | undefined;
  /** Enlaces de la API generada que se han quitado hasta ahora. */
  strippedLinks: () => number;
}

export function createApiResolver(json: string | undefined): ApiResolver {
  const api: Record<string, string> = json === undefined ? {} : JSON.parse(json);
  let stripped = 0;
  return {
    resolveApi(identifier) {
      const generated = api[identifier];
      if (generated === undefined) return undefined;
      const cleaned = cleanGeneratedApi(generated);
      stripped += cleaned.stripped;
      return cleaned.markdown;
    },
    strippedLinks: () => stripped,
  };
}
