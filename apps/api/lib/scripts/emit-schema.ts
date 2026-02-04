/**
 * Script to emit the GraphQL schema to a file.
 * This is used by the webapp's codegen to generate types without
 * needing a running server.
 *
 * Usage: npm run emit-schema -w @ntlango/api
 */
import 'reflect-metadata';
import { printSchema } from 'graphql';
import * as fs from 'fs';
import * as path from 'path';
import createSchema from '@/graphql/schema';

const emitSchema = () => {
  console.log('Building GraphQL schema...');

  const schema = createSchema();
  const schemaString = printSchema(schema);

  // Output to packages/commons so it can be shared
  const outputPath = path.resolve(__dirname, '../../../../packages/commons/schema.graphql');

  fs.writeFileSync(outputPath, schemaString, 'utf-8');
  console.log(`✅ Schema written to: ${outputPath}`);

  return schemaString;
};

emitSchema();
