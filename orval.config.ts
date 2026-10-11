import { defineConfig } from 'orval';

export default defineConfig({
  publicApi: {
    input: { target: './openapi/openapi.json' },
    output: {
      target: './src/shared/api/generated/index.ts',
      schemas: './src/shared/api/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      mode: 'tags-split',
      clean: true,
      urlEncodeParameters: true,
      override: {
        useTypeOverInterfaces: true,
        enumGenerationType: 'const',
        mutator: {
          path: './src/shared/api/client/api-fetch.ts',
          name: 'apiFetch',
        },
        fetch: { includeHttpResponseReturnType: false },
        query: { version: 5, signal: true },
      },
    },
  },
});
