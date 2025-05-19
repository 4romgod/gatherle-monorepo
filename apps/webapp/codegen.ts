import 'dotenv/config';
import { CodegenConfig } from '@graphql-codegen/cli';

// Inspired by https://the-guild.dev/graphql/codegen/docs/config-reference/schema-field

const config: CodegenConfig = {
  schema: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  documents: ['./data/**/*.{js,ts,jsx,tsx,mdx}'],
  generates: {
    './data/graphql/types/': {
      preset: 'client',
      plugins: [],
    },
  },
  ignoreNoDocuments: true,
};
console.log('codegen config', config);

export default config;
