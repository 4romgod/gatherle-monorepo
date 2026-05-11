import 'dotenv/config';
import type { CodegenConfig } from '@graphql-codegen/cli';
import * as fs from 'fs';
import * as path from 'path';

const schemaFilePath = path.resolve(__dirname, '../../packages/commons/schema.graphql');
const schemaFileExists = fs.existsSync(schemaFilePath);

const schemaSource = schemaFileExists ? schemaFilePath : process.env.EXPO_PUBLIC_GRAPHQL_URL;

if (!schemaSource) {
  throw new Error(
    'No schema source available. Either run `npm run emit-schema -w @gatherle/api` to generate the schema file, ' +
      'or set EXPO_PUBLIC_GRAPHQL_URL to a running GraphQL server.',
  );
}

const config: CodegenConfig = {
  schema: schemaSource,
  documents: ['./**/*.{ts,tsx}', '!./data/graphql/types/**/*'],
  generates: {
    './data/graphql/types/': {
      preset: 'client',
      plugins: [],
    },
  },
  ignoreNoDocuments: true,
};

export default config;
