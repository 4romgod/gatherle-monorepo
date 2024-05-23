import { CodegenConfig } from '@graphql-codegen/cli';
import { GRAPHQL_URL } from './lib/constants';

const config: CodegenConfig = {
  schema: [
    {
      [GRAPHQL_URL!]: {
        headers: {
          key: 'value',
        },
      },
    },
  ],
  documents: ['./data/**/*.{js,ts,jsx,tsx,mdx}'],
  generates: {
    './data/graphql/types/': {
      preset: 'client',
      plugins: [],
    },
  },
  ignoreNoDocuments: true,
};

export default config;
