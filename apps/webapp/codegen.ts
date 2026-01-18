import 'dotenv/config';
import { CodegenConfig } from '@graphql-codegen/cli';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './lib/utils/logger';

// Inspired by https://the-guild.dev/graphql/codegen/docs/config-reference/schema-field

// Use the committed schema file if available, otherwise fall back to the GraphQL URL
// This allows CI to run codegen without a running server
const schemaFilePath = path.resolve(__dirname, '../../packages/commons/schema.graphql');
const schemaFileExists = fs.existsSync(schemaFilePath);

const schemaSource = schemaFileExists
  ? schemaFilePath
  : process.env.NEXT_PUBLIC_GRAPHQL_URL;

if (!schemaSource) {
  throw new Error(
    'No schema source available. Either run `npm run emit-schema -w @ntlango/api` to generate the schema file, ' +
    'or set NEXT_PUBLIC_GRAPHQL_URL to a running GraphQL server.'
  );
}

logger.debug(`Using schema from: ${schemaSource}`);

const config: CodegenConfig = {
  schema: schemaSource,
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
